import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

const { AIProviderStore } = await import('../../server/aiProviderStore');

let tmpDir: string;
let configPath: string;
let logsPath: string;

function newStore(): InstanceType<typeof AIProviderStore> {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clocky-ai-'));
  configPath = path.join(tmpDir, 'ai-config.json');
  logsPath = path.join(tmpDir, 'generation-logs.json');
  return new AIProviderStore(configPath, logsPath);
}

const providerInput = {
  name: 'Test LLM',
  type: 'openai_compatible' as const,
  baseUrl: 'http://localhost:1234/v1',
  apiKey: 'sk-live-key-123456',
  isEnabled: true,
  availableModels: ['model-a', 'model-b']
};

describe('AIProviderStore', () => {
  let store: InstanceType<typeof AIProviderStore>;

  beforeEach(() => {
    store = newStore();
  });

  afterAll(async () => {
    store.flushSync();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('seeds default providers and waterfall on first boot', () => {
    const config = store.getConfig(true);
    expect(config.providers.length).toBeGreaterThanOrEqual(4);
    expect(config.waterfall.length).toBeGreaterThan(0);
    expect(config.fallbackToLocalOnFailure).toBe(true);
  });

  describe('saveProvider', () => {
    it('creates a provider with id and timestamps', () => {
      const p = store.saveProvider(providerInput);
      expect(p.id).toMatch(/^provider-/);
      expect(p.createdAt).toBeTruthy();
      expect(store.getProvider(p.id)?.name).toBe('Test LLM');
    });

    it('updates an existing provider without duplicating', () => {
      const created = store.saveProvider(providerInput);
      const updated = store.saveProvider({ ...providerInput, id: created.id, name: 'Renamed' });
      expect(updated.name).toBe('Renamed');
      expect(store.getRawConfig().providers.filter((x) => x.name === 'Renamed')).toHaveLength(1);
    });

    it('preserves the stored apiKey when incoming value is masked', () => {
      const created = store.saveProvider(providerInput);
      const masked = `${created.apiKey!.slice(0, 4)}...${created.apiKey!.slice(-4)}`;
      const updated = store.saveProvider({ ...providerInput, id: created.id, apiKey: masked });
      expect(updated.apiKey).toBe('sk-live-key-123456');
    });

    it('keeps an empty apiKey when none provided (local Ollama case)', () => {
      const p = store.saveProvider({ ...providerInput, name: 'Local', apiKey: '' });
      expect(p.apiKey).toBe('');
    });
  });

  describe('getConfig masking', () => {
    it('masks apiKeys for API consumers but not via getRawConfig', () => {
      store.saveProvider(providerInput);
      const masked = store.getConfig(true).providers.find((p) => p.apiKey)!;
      expect(masked.apiKey).not.toBe('sk-live-key-123456');
      expect(masked.apiKey).toContain('...');
      const raw = store.getRawConfig().providers.find((p) => p.apiKey)!;
      expect(raw.apiKey).toBe('sk-live-key-123456');
    });
  });

  it('deleteProvider removes the provider and its waterfall references', () => {
    const p = store.saveProvider(providerInput);
    store.updateWaterfall(
      [
        {
          id: 's1',
          providerId: p.id,
          modelName: 'model-a',
          isEnabled: true,
          timeoutMs: 1000,
          temperature: 0.5
        }
      ],
      false
    );
    expect(store.deleteProvider(p.id)).toBe(true);
    expect(store.getProvider(p.id)).toBeUndefined();
    expect(store.getRawConfig().waterfall).toHaveLength(0);
    expect(store.deleteProvider('nope')).toBe(false);
  });

  describe('updateWaterfall', () => {
    it('normalizes steps and toggles local fallback', () => {
      const p = store.saveProvider(providerInput);
      const config = store.updateWaterfall(
        [
          { id: '', providerId: p.id, modelName: 'model-a', isEnabled: undefined as never, timeoutMs: 0, temperature: undefined as never },
          { id: 's2', providerId: p.id, modelName: 'model-b', isEnabled: true, timeoutMs: 2000, temperature: 0.9, fallbackProviderIds: [p.id] }
        ],
        false
      );
      expect(config.fallbackToLocalOnFailure).toBe(false);
      expect(config.waterfall[0].id).not.toBe('');
      expect(config.waterfall[0].timeoutMs).toBe(9000);
      expect(config.waterfall[0].temperature).toBe(0.7);
      expect(config.waterfall[1].fallbackProviderIds).toEqual([p.id]);
    });
  });

  describe('generation logs', () => {
    it('addLog prepends newest first and getLogs returns them', () => {
      store.addLog({ prompt: 'first', success: true, durationMs: 5, isFallback: false });
      store.addLog({ prompt: 'second', success: false, durationMs: 7, isFallback: true });
      const logs = store.getLogs();
      expect(logs.map((l) => l.prompt)).toEqual(['second', 'first']);
      expect(logs[0]).toHaveProperty('timestamp');
    });

    it('caps logs at 200 entries', () => {
      for (let i = 0; i < 205; i++) {
        store.addLog({ prompt: `p${i}`, success: true, durationMs: 1, isFallback: false });
      }
      expect(store.getLogs()).toHaveLength(200);
      expect(store.getLogs()[0].prompt).toBe('p204');
    });

    it('persists logs to disk and reloads them', async () => {
      store.addLog({ prompt: 'persist-me', success: true, durationMs: 3, isFallback: false });
      store.flushSync();
      expect(fs.existsSync(logsPath)).toBe(true);
      const reloaded = new AIProviderStore(configPath, logsPath);
      expect(reloaded.getLogs()[0].prompt).toBe('persist-me');
    });
  });

  it('reseeds defaults when the config file is corrupt', () => {
    fs.writeFileSync(configPath, '{not json at all');
    const s = new AIProviderStore(configPath, logsPath);
    expect(s.getConfig(true).providers.length).toBeGreaterThanOrEqual(4);
  });
});
