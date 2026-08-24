import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

const { CommunityClockStore } = await import('../../server/communityStore');

let tmpDir: string;
let storePath: string;

function newStore(): InstanceType<typeof CommunityClockStore> {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clocky-comm-'));
  storePath = path.join(tmpDir, 'community-clocks.json');
  return new CommunityClockStore(storePath);
}

const clockInput = {
  name: 'Test Clock',
  description: 'A test',
  author: 'tester',
  category: 'Custom AI',
  config: {
    style: 'cyberpunk',
    bgColor: '#0d0221',
    accentColor: '#00f6ff',
    secondaryColor: '#ff0055',
    textColor: '#ffffff',
    fontFamily: 'monospace' as const,
    showSeconds: true,
    glowEffect: true,
    particleEffect: 'matrix',
    discStyle: 'neon_rings',
    handStyle: 'laser_beam',
    soundType: 'digital_beep'
  }
};

describe('CommunityClockStore', () => {
  let store: InstanceType<typeof CommunityClockStore>;

  beforeEach(() => {
    store = newStore();
  });

  afterAll(async () => {
    store.flushSync();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('seeds preset clocks on first boot', () => {
    expect(store.list().length).toBeGreaterThanOrEqual(3);
  });

  describe('add', () => {
    it('stamps id/likes/createdAt/type and prepends', () => {
      const first = store.add(clockInput);
      const second = store.add({ ...clockInput, name: 'Second' });
      expect(first.id).toMatch(/^comm-/);
      expect(second.id).toMatch(/^comm-/);
      expect(first.likes).toBe(1);
      expect(first.type).toBe('custom_ai');
      expect(store.list()[0].name).toBe('Second');
    });

    it('honors provided id/type/likes (admin import path)', () => {
      const stored = store.add({
        ...clockInput,
        id: 'clock-binary',
        type: 'binary' as never,
        likes: 42,
        isBuiltIn: true
      });
      expect(stored.id).toBe('clock-binary');
      expect(stored.type).toBe('binary');
      expect(stored.likes).toBe(42);
    });
  });

  it('get finds by id', () => {
    const added = store.add(clockInput);
    expect(store.get(added.id)?.name).toBe('Test Clock');
    expect(store.get('missing')).toBeUndefined();
  });

  describe('update', () => {
    it('merges scalar fields and preserves the id', () => {
      const added = store.add(clockInput);
      const updated = store.update(added.id, { name: 'Renamed', likes: 99 });
      expect(updated?.id).toBe(added.id);
      expect(updated?.name).toBe('Renamed');
      expect(updated?.likes).toBe(99);
      expect(updated?.description).toBe('A test');
    });

    it('shallow-merges config with the previous config', () => {
      const added = store.add(clockInput);
      const updated = store.update(added.id, { config: { style: 'minimal', glowEffect: false } as never });
      expect(updated?.config.style).toBe('minimal');
      expect(updated?.config.glowEffect).toBe(false);
      expect(updated?.config.bgColor).toBe('#0d0221');
    });

    it('creates a new entry when id is unknown and payload is complete', () => {
      const created = store.update('preset-custom', { name: 'Imported', config: clockInput.config });
      expect(created?.id).toBe('preset-custom');
      expect(store.get('preset-custom')?.name).toBe('Imported');
    });

    it('returns null for unknown ids without a full payload', () => {
      expect(store.update('missing', { likes: 5 })).toBeNull();
    });
  });

  describe('like / delete', () => {
    it('increments likes and reports null for unknown ids', () => {
      const added = store.add(clockInput);
      expect(store.like(added.id)).toBe(2);
      expect(store.like(added.id)).toBe(3);
      expect(store.like('missing')).toBeNull();
    });

    it('deletes by id', async () => {
      const added = store.add(clockInput);
      expect(store.delete(added.id)).toBe(true);
      store.flushSync();
      expect(store.get(added.id)).toBeUndefined();
    });
  });

  it('persists to disk and reloads across instances', async () => {
    const added = store.add({ ...clockInput, name: 'Survivor' });
    store.flushSync();
    expect(fs.existsSync(storePath)).toBe(true);
    const reloaded = new CommunityClockStore(storePath);
    expect(reloaded.get(added.id)?.name).toBe('Survivor');
  });

  it('reseeds when the store file is corrupt', () => {
    fs.writeFileSync(storePath, 'not-json{{{');
    const s = new CommunityClockStore(storePath);
    expect(s.list().length).toBeGreaterThanOrEqual(3);
  });
});
