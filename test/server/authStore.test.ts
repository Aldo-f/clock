import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

process.env.JWT_SECRET = 'test-jwt-secret-for-vitest';

const { AuthStore } = await import('../../server/authStore');

let tmpDir: string;

function newStore(): InstanceType<typeof AuthStore> {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clocky-auth-'));
  return new AuthStore(path.join(tmpDir, 'users.json'));
}

function craftToken(payload: Record<string, unknown>, secret = 'test-jwt-secret-for-vitest'): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

describe('AuthStore', () => {
  let store: InstanceType<typeof AuthStore>;

  beforeEach(() => {
    store = newStore();
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('seeds a default admin on first boot', () => {
    const admins = store.listUsers().filter((u) => u.role === 'admin');
    expect(admins).toHaveLength(1);
    expect(admins[0].username).toBe('admin');
    expect(admins[0]).not.toHaveProperty('passwordHash');
  });

  it('promotes an existing aldo user to admin on boot', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'clocky-auth2-'));
    const storePath = path.join(dir, 'users.json');
    const salt = crypto.randomBytes(16).toString('hex');
    fs.writeFileSync(
      storePath,
      JSON.stringify([
        {
          id: 'usr-aldo',
          username: 'aldo',
          email: 'aldo.fieuw@gmail.com',
          role: 'user',
          isActive: false,
          createdAt: new Date().toISOString(),
          salt,
          passwordHash: crypto.scryptSync('pw', salt, 64).toString('hex')
        }
      ])
    );
    const s = new AuthStore(storePath);
    const aldo = s.findByUsername('aldo');
    expect(aldo?.role).toBe('admin');
    expect(aldo?.isActive).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  describe('register', () => {
    it('creates a user and hashes the password', () => {
      const { user, error } = store.register('alice', 'secret123');
      expect(error).toBeUndefined();
      expect(user?.username).toBe('alice');
      expect(user).not.toHaveProperty('passwordHash');
      store.flushSync();
      const raw = JSON.parse(fs.readFileSync(path.join(tmpDir, 'users.json'), 'utf8'));
      expect(raw.find((u: any) => u.username === 'alice').passwordHash).not.toBe('secret123');
    });

    it('rejects short usernames, short passwords, duplicates', () => {
      expect(store.register('ab', 'secret123').error).toBeDefined();
      expect(store.register('bob', '12345').error).toBeDefined();
      store.register('carol', 'secret123');
      expect(store.register('CAROL', 'other123').error).toBeDefined();
    });
  });

  describe('login', () => {
    it('returns user + token on correct credentials', () => {
      store.register('dave', 'secret123');
      const { user, token, error } = store.login('dave', 'secret123');
      expect(error).toBeUndefined();
      expect(user?.username).toBe('dave');
      expect(token).toMatch(/^[^.]+\.[^.]+\.[^.]+$/);
    });

    it('matches usernames case-insensitively', () => {
      store.register('erin', 'secret123');
      expect(store.login('ERIN', 'secret123').user?.username).toBe('erin');
    });

    it('rejects wrong password, unknown users, inactive accounts', () => {
      store.register('frank', 'secret123');
      expect(store.login('frank', 'wrong').error).toBeDefined();
      expect(store.login('ghost', 'whatever').error).toBeDefined();
      const created = store.findByUsername('frank')!;
      store.updateUser(created.id, { isActive: false });
      expect(store.login('frank', 'secret123').error).toContain('gedeactiveerd');
    });
  });

  describe('tokens', () => {
    it('round-trips verifyToken(generateToken(user))', () => {
      store.register('gina', 'secret123');
      const user = store.findByUsername('gina')!;
      const verified = store.verifyToken(store.generateToken(user));
      expect(verified?.username).toBe('gina');
    });

    it('rejects tampered payloads and bad signatures', () => {
      store.register('hank', 'secret123');
      const token = store.generateToken(store.findByUsername('hank')!);
      const [, body] = token.split('.');
      const forged = craftToken({ sub: 'usr-admin-01', role: 'admin' }, 'wrong-secret');
      const tamperedBodyToken = `${token.split('.')[0]}.${Buffer.from(
        JSON.stringify({ sub: 'usr-admin-01', role: 'admin', exp: Math.floor(Date.now() / 1000) + 9999 })
      ).toString('base64url')}.${token.split('.')[2]}`;
      expect(store.verifyToken(forged)).toBeNull();
      expect(store.verifyToken(tamperedBodyToken)).toBeNull();
      expect(store.verifyToken(`x.${body}.x`)).toBeNull();
    });

    it('rejects expired tokens', () => {
      store.register('iris', 'secret123');
      const expired = craftToken({
        sub: store.findByUsername('iris')!.id,
        exp: Math.floor(Date.now() / 1000) - 10
      });
      expect(store.verifyToken(expired)).toBeNull();
    });

    it('rejects tokens for deleted/inactive users', () => {
      store.register('jack', 'secret123');
      const jack = store.findByUsername('jack')!;
      const token = store.generateToken(jack);
      store.updateUser(jack.id, { isActive: false });
      expect(store.verifyToken(token)).toBeNull();
    });
  });

  describe('updateUser / deleteUser', () => {
    it('changes passwords (old login breaks, new works)', () => {
      store.register('kate', 'secret123');
      const kate = store.findByUsername('kate')!;
      store.updateUser(kate.id, { password: 'newpass99' });
      expect(store.login('kate', 'secret123').error).toBeDefined();
      expect(store.login('kate', 'newpass99').token).toBeTruthy();
    });

    it('refuses to delete the last admin', () => {
      const admin = store.listUsers().find((u) => u.role === 'admin')!;
      expect(store.deleteUser(admin.id)).toBe(false);
      expect(store.findById(admin.id)).toBeDefined();
    });

    it('allows deleting an admin when another admin exists', () => {
      const admin = store.listUsers().find((u) => u.role === 'admin')!;
      store.register('second-admin', 'secret123', undefined, 'admin');
      expect(store.deleteUser(admin.id)).toBe(true);
      expect(store.findById(admin.id)).toBeUndefined();
    });

    it('deletes ordinary users', () => {
      store.register('lars', 'secret123');
      const lars = store.findByUsername('lars')!;
      expect(store.deleteUser(lars.id)).toBe(true);
    });
  });
});
