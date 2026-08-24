import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  username: string;
  email?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

interface StoredUser extends User {
  passwordHash: string;
  salt: string;
}

const AUTH_STORE_PATH =
  process.env.AUTH_STORE_PATH || path.join(process.cwd(), 'data', 'users.json');

const DEV_JWT_FALLBACK = 'clocky-dev-insecure-jwt-fallback';

function getJwtSecret(): string {
  const fromEnv = process.env.JWT_SECRET;
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production.');
  }
  console.warn('[authStore] JWT_SECRET not set — using insecure dev fallback. Never run production like this.');
  return DEV_JWT_FALLBACK;
}

const DEFAULT_ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

export class AuthStore {
  private users: StoredUser[] = [];
  private saveTimer: NodeJS.Timeout | null = null;

  constructor(private filePath: string = AUTH_STORE_PATH) {
    this.users = this.load();
    this.ensureDefaultAdmin();
  }

  private load(): StoredUser[] {
    try {
      if (fs.existsSync(this.filePath)) {
        const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Auth store unreadable, reseeding default admin:', e instanceof Error ? e.message : e);
    }
    return [];
  }

  private ensureDefaultAdmin(): void {
    // Ensure Aldo is admin if existing or configure admin status
    for (const u of this.users) {
      if (u.email?.toLowerCase() === 'aldo.fieuw@gmail.com' || u.username.toLowerCase() === 'aldo') {
        u.role = 'admin';
        u.isActive = true;
      }
    }

    if (!this.users.some(u => u.role === 'admin')) {
      const salt = crypto.randomBytes(16).toString('hex');
      const defaultAdmin: StoredUser = {
        id: 'user-admin-01',
        username: DEFAULT_ADMIN_USERNAME,
        email: 'admin@clocky.studio',
        role: 'admin',
        isActive: true,
        createdAt: new Date().toISOString(),
        salt,
        passwordHash: hashPassword(DEFAULT_ADMIN_PASSWORD || 'admin123', salt)
      };
      if (!DEFAULT_ADMIN_PASSWORD) {
        console.warn(
          `[authStore] Seeded default admin "${DEFAULT_ADMIN_USERNAME}" with password "admin123" — ` +
          'set ADMIN_PASSWORD (and ADMIN_USERNAME) in .env to override, then log in and change it.'
        );
      }
      this.users.push(defaultAdmin);
      this.save();
    }
  }

  private scheduleSave(): void {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.save();
    }, 300);
    this.saveTimer.unref?.();
  }

  private save(): void {
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      const tmp = this.filePath + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(this.users, null, 2));
      fs.renameSync(tmp, this.filePath);
    } catch (e) {
      console.error('Auth store save failed:', e instanceof Error ? e.message : e);
    }
  }

  /** Writes pending changes immediately; used on shutdown and by tests. */
  flushSync(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.save();
  }

  public sanitizeUser(user: StoredUser): User {
    const { passwordHash, salt, ...safe } = user;
    return safe;
  }

  public listUsers(): User[] {
    return this.users.map(u => this.sanitizeUser(u));
  }

  public findById(id: string): StoredUser | undefined {
    return this.users.find(u => u.id === id);
  }

  public findByUsername(identifier: string): StoredUser | undefined {
    const norm = identifier.trim().toLowerCase();
    return this.users.find(
      u => u.username.toLowerCase() === norm || (u.email && u.email.toLowerCase() === norm)
    );
  }

  public register(username: string, password: string, email?: string, role: UserRole = 'user'): { user?: User; error?: string } {
    const cleanUsername = username.trim();
    if (!cleanUsername || cleanUsername.length < 3) {
      return { error: 'Gebruikersnaam moet minimaal 3 tekens lang zijn.' };
    }
    if (!password || password.length < 6) {
      return { error: 'Wachtwoord moet minimaal 6 tekens lang zijn.' };
    }
    if (this.findByUsername(cleanUsername)) {
      return { error: 'Gebruikersnaam is al in gebruik.' };
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const newUser: StoredUser = {
      id: 'usr-' + Date.now() + '-' + crypto.randomBytes(3).toString('hex'),
      username: cleanUsername,
      email: email?.trim(),
      role,
      isActive: true,
      createdAt: new Date().toISOString(),
      salt,
      passwordHash: hashPassword(password, salt)
    };

    this.users.push(newUser);
    this.scheduleSave();
    return { user: this.sanitizeUser(newUser) };
  }

  public login(username: string, password: string): { user?: User; token?: string; error?: string } {
    const user = this.findByUsername(username);
    if (!user) {
      return { error: 'Ongeldige gebruikersnaam of wachtwoord.' };
    }
    if (!user.isActive) {
      return { error: 'Dit account is gedeactiveerd.' };
    }

    const calcHash = hashPassword(password, user.salt);
    if (!crypto.timingSafeEqual(Buffer.from(calcHash), Buffer.from(user.passwordHash))) {
      return { error: 'Ongeldige gebruikersnaam of wachtwoord.' };
    }

    user.lastLoginAt = new Date().toISOString();
    this.scheduleSave();

    const token = this.generateToken(user);
    return { user: this.sanitizeUser(user), token };
  }

  public generateToken(user: User | StoredUser): string {
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
    };
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', getJwtSecret())
      .update(`${header}.${body}`)
      .digest('base64url');
    return `${header}.${body}.${signature}`;
  }

  public verifyToken(token: string): User | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const [header, body, signature] = parts;
      const expectedSignature = crypto
        .createHmac('sha256', getJwtSecret())
        .update(`${header}.${body}`)
        .digest('base64url');

      if (
        signature.length !== expectedSignature.length ||
        !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
      ) {
        return null;
      }

      const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }

      const user = this.findById(payload.sub);
      if (!user || !user.isActive) return null;
      return this.sanitizeUser(user);
    } catch {
      return null;
    }
  }

  public updateUser(
    id: string,
    updates: { role?: UserRole; isActive?: boolean; email?: string; password?: string }
  ): User | null {
    const user = this.findById(id);
    if (!user) return null;

    if (updates.role) user.role = updates.role;
    if (typeof updates.isActive === 'boolean') user.isActive = updates.isActive;
    if (updates.email !== undefined) user.email = updates.email.trim();
    if (updates.password && updates.password.length >= 6) {
      user.salt = crypto.randomBytes(16).toString('hex');
      user.passwordHash = hashPassword(updates.password, user.salt);
    }

    this.scheduleSave();
    return this.sanitizeUser(user);
  }

  public deleteUser(id: string): boolean {
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) return false;
    // Don't delete the last admin
    if (this.users[index].role === 'admin') {
      const adminCount = this.users.filter(u => u.role === 'admin').length;
      if (adminCount <= 1) return false;
    }
    this.users.splice(index, 1);
    this.scheduleSave();
    return true;
  }
}
