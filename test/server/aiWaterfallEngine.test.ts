import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

const { AIWaterfallEngine } = await import('../../server/aiWaterfallEngine');
const { AIProviderStore } = await import('../../server/aiProviderStore');

let tmpDir: string;
let store: InstanceType<typeof AIProviderStore>;
let engine: InstanceType<typeof AIWaterfallEngine>;
let fetchCalls: { url: string; init?: RequestInit }[] = [];

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status < 400,
    status,
    statusText: status === 200 ? 'OK' : 'Internal Server Error',
    json: async () => body,
    text: async () => JSON.stringify(body)
  } as unknown as Response;
}

function validAiJson(name = 'AI Klok'): string {
  return JSON.stringify({
    name,
    description: 'Een testklok',
    style: 'cyberpunk',
    bgColor: '#0d0221',
    accentColor: '#00f6ff',
    secondaryColor: '#ff0055',
    textColor: '#ffffff',
    fontFamily: 'monospace',
    showSeconds: true,
    glowEffect: true,
    particleEffect: 'stars',
    discStyle: 'neon_rings',
    handStyle: 'laser_beam',
    soundType: 'soft_tick'
  });
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clocky-engine-'));
  store = new AIProviderStore(
    path.join(tmpDir, 'ai-config.json'),
    path.join(tmpDir, 'logs.json')
  );
  engine = new AIWaterfallEngine(store);
  delete process.env.GEMINI_API_KEY;
  fetchCalls = [];
});

afterEach(() => {
  vi.unstubAllGlobals();
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

async function enableSingleOpenAIProvider(baseUrl = 'http://unit.test/v1') {
  const p = store.saveProvider({
    name: 'Unit Provider',
    type: 'openai_compatible',
    baseUrl,
    apiKey: 'sk-test',
    isEnabled: true,
    availableModels: ['test-model']
  });
  store.updateWaterfall(
    [
      { id: 'step-off', providerId: p.id, modelName: 'test-model', isEnabled: false, timeoutMs: 1000, temperature: 0.5 },
      { id: 'step-on', providerId: p.id, modelName: 'test-model', isEnabled: true, timeoutMs: 1000, temperature: 0.5 }
    ],
    true
  );
  return p;
}

describe('fetchProviderModels', () => {
  it('tries /v1/models for a base ending in /v1 and parses {data:[{id}]}', async () => {
    const p = await enableSingleOpenAIProvider('http://unit.test/v1');
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        fetchCalls.push({ url });
        return jsonResponse({ data: [{ id: 'z-model' }, { id: 'a-model' }] });
      })
    );
    const models = await engine.fetchProviderModels(store.getProvider(p.id)!);
    expect(fetchCalls[0].url).toBe('http://unit.test/v1/models');
    expect(models).toEqual(['a-model', 'z-model']);
  });

  it('falls back to /models when /v1/models fails for a bare base', async () => {
    const p = await enableSingleOpenAIProvider('http://unit.test');
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        fetchCalls.push({ url });
        if (String(url).endsWith('/v1/models')) {
          return jsonResponse({ error: 'nope' }, 404);
        }
        return jsonResponse([{ name: 'bare-model' }]);
      })
    );
    const provider = store.getProvider(p.id)!;
    const models = await engine.fetchProviderModels(provider);
    expect(fetchCalls.map((c) => c.url)).toEqual([
      'http://unit.test/v1/models',
      'http://unit.test/models'
    ]);
    expect(models).toEqual(['bare-model']);
  });

  it('uses a real Google API call for gemini when a key exists, mapping model names', async () => {
    const gemini = store.saveProvider({
      name: 'G',
      type: 'gemini',
      apiKey: 'g-key',
      isEnabled: true,
      availableModels: []
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        fetchCalls.push({ url });
        return jsonResponse({
          models: [{ name: 'models/gemini-zeta' }, { name: 'models/gemini-alpha' }, { name: 'models/embed-1' }]
        });
      })
    );
    const models = await engine.fetchProviderModels(store.getProvider(gemini.id)!);
    expect(String(fetchCalls[0].url)).toContain('generativelanguage.googleapis.com');
    expect(String(fetchCalls[0].url)).toContain('key=g-key');
    expect(models).toEqual(['gemini-alpha', 'gemini-zeta']);
  });

  it('returns the curated list for gemini without any key', async () => {
    const models = await engine.fetchProviderModels({
      id: 'x',
      name: 'G',
      type: 'gemini',
      isEnabled: true,
      availableModels: [],
      createdAt: '',
      updatedAt: ''
    });
    expect(models.length).toBeGreaterThan(3);
    expect(models.every((m) => m.includes('gemini'))).toBe(true);
  });

  it('throws after all candidate URLs fail', async () => {
    const p = await enableSingleOpenAIProvider('http://unit.test');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({}, 500))
    );
    const provider = store.getProvider(p.id)!;
    await expect(engine.fetchProviderModels(provider)).rejects.toThrow(/HTTP 500/);
  });
});

describe('executeStep (openai-compatible)', () => {
  it('posts chat/completions, strips markdown fences, sanitizes output', async () => {
    const p = await enableSingleOpenAIProvider();
    const provider = store.getProvider(p.id)!;
    const step = store.getRawConfig().waterfall.find((w) => w.id === 'step-on')!;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        fetchCalls.push({ url, init });
        return jsonResponse({
          choices: [{ message: { content: '```json\n' + validAiJson() + '\n```' } }]
        });
      })
    );

    const result = await engine.executeStep(provider, step, 'maak een klok');
    const call = JSON.parse(String(fetchCalls[0].init!.body));
    expect(fetchCalls[0].url).toBe('http://unit.test/v1/chat/completions');
    expect(call.model).toBe('test-model');
    expect(call.messages[0].role).toBe('system');
    expect(result.name).toBe('AI Klok');
    expect(result.bgColor).toBe('#0d0221');
  });

  it('coerces invalid enum values from the model into defaults', async () => {
    const p = await enableSingleOpenAIProvider();
    const provider = store.getProvider(p.id)!;
    const step = store.getRawConfig().waterfall.find((w) => w.id === 'step-on')!;
    const badJson = validAiJson().replace('"cyberpunk"', '"<script>"').replace('"#0d0221"', '"red"');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({ choices: [{ message: { content: badJson } }] })
      )
    );
    const result = await engine.executeStep(provider, step, 'prompt');
    expect(result.style).toBe('cyberpunk');
    expect(result.bgColor).toBe('#0f172a');
  });

  it('surfaces non-ok provider responses as errors', async () => {
    const p = await enableSingleOpenAIProvider();
    const provider = store.getProvider(p.id)!;
    const step = store.getRawConfig().waterfall.find((w) => w.id === 'step-on')!;
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: 'boom' }, 500)));
    await expect(engine.executeStep(provider, step, 'p')).rejects.toThrow(/HTTP 500/);
  });
});

describe('generateClock waterfall behavior', () => {
  it('walks steps in order, skips disabled ones, logs success', async () => {
    await enableSingleOpenAIProvider();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        fetchCalls.push({ url, init });
        return jsonResponse({ choices: [{ message: { content: validAiJson() } }] });
      })
    );

    const result = await engine.generateClock('neon klok');
    expect(result.isFallback).toBe(false);
    expect(result.waterfallStep).toBe(2);
    expect(result.clockConfig.soundType).toBe('soft_tick');
    const logs = store.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].success).toBe(true);
    expect(logs[0].waterfallStepIndex).toBe(2);
  });

  it('falls back to the local engine when every provider fails', async () => {
    await enableSingleOpenAIProvider();
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({}, 500)));

    const result = await engine.generateClock('een klok met bubbels en water');
    expect(result.isFallback).toBe(true);
    expect(result.providerUsed).toContain('fallback');
    expect(result.clockConfig.particleEffect).toBe('bubbles');
    const failLogs = store.getLogs().filter((l) => !l.success);
    expect(failLogs.length).toBe(1);
  });

  it('throws instead of falling back when fallbackToLocalOnFailure is false', async () => {
    await enableSingleOpenAIProvider();
    store.updateWaterfall(
      [
        { id: 's1', providerId: store.getRawConfig().providers[0].id, modelName: 'test-model', isEnabled: true, timeoutMs: 1000, temperature: 0.5 }
      ],
      false
    );
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({}, 500)));

    await expect(engine.generateClock('p')).rejects.toThrow(/uitgeschakeld/);
  });
});

describe('simulateWaterfall trace', () => {
  it('records skipped steps and a successful step with timing', async () => {
    await enableSingleOpenAIProvider();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({ choices: [{ message: { content: validAiJson('Trace Klok') } }] })
      )
    );

    const sim = await engine.simulateWaterfall('willekeurig');
    expect(sim.success).toBe(true);
    expect(sim.usedFallback).toBe(false);
    expect(sim.traces[0]).toMatchObject({ status: 'skipped', stepId: 'step-off' });
    const success = sim.traces.find((t) => t.status === 'success');
    expect(success?.modelName).toBe('test-model');
    expect(success?.durationMs).toBeGreaterThanOrEqual(0);
    expect(sim.clockConfig?.name).toBe('Trace Klok');
  });

  it('reports fallbackDeactivated when everything fails and local fallback is off', async () => {
    await enableSingleOpenAIProvider();
    store.updateWaterfall(
      [
        { id: 's1', providerId: store.getRawConfig().providers[0].id, modelName: 'test-model', isEnabled: true, timeoutMs: 1000, temperature: 0.5 }
      ],
      false
    );
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({}, 500)));

    const sim = await engine.simulateWaterfall('p');
    expect(sim.success).toBe(false);
    expect(sim.fallbackDeactivated).toBe(true);
    expect(sim.traces[0].status).toBe('failed');
  });
});
