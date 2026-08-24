import { GoogleGenAI, Type } from '@google/genai';
import { AIProviderConfig, AIProviderStore, WaterfallStep } from './aiProviderStore';
import { sanitizeClockConfig } from './clockValidation';
import { generateFallbackClockConfig } from './fallbackGenerator';
import { ClockConfig, WaterfallTraceStep, WaterfallSimulationResult } from '../src/types';

function getGeminiClient(customApiKey?: string) {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is niet ingesteld.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

function trimmed(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

const SYSTEM_PROMPT = `You are a master clockmaker and UI designer for "Clocky - Digital Clock Studio".
The user requests a custom or brand-new clock design (e.g. "Create a golden steampunk clock", "A purple neon cyberpunk clock", "A soothing aquarium clock with bubbles", "Change background to deep ocean blue and hands to luminous gold").

Analyze the request and generate a single JSON object with the visual and functional settings for the clock.

The JSON object MUST strictly adhere to this schema:
- name: Short catchy name for the clock design (Dutch or user language, max 60 chars)
- description: Clear description of the clock aesthetic (1-2 sentences)
- style: One of ["cyberpunk", "steampunk", "minimal", "neon", "nature", "space", "retro_nixie", "art_deco", "fluid", "celestial", "retro_terminal", "mechanical_amber"]
- bgColor: Hex color code for background (e.g. "#0d0221")
- accentColor: Hex color code for primary hands / numbers (e.g. "#00f6ff")
- secondaryColor: Hex color code for secondary accents (e.g. "#ff0055")
- textColor: Hex color code for texts / numerals (e.g. "#ffffff")
- fontFamily: One of ["sans-serif", "serif", "monospace", "cursive"]
- showSeconds: boolean (true/false)
- glowEffect: boolean (true/false)
- particleEffect: One of ["none", "matrix", "stars", "steam", "sakura", "bubbles", "fireflies", "sparks", "aurora", "rain_drops"]
- discStyle: One of ["clean", "neon_rings", "brass_gears", "radar", "concentric", "minimal_dots"]
- handStyle: One of ["needle", "laser_beam", "ornate_brass", "thick_modern", "glowing_arrow", "dot_markers"]
- soundType: One of ["none", "soft_tick", "digital_beep", "gear_click", "water_drop", "space_hum", "split_flap", "oscilloscope_blip"]
- customText: Short optional inscription or title on the dial (e.g. "CHRONOS", "01001", or empty string)
- clockTypeCategory: One of ["Roterende Schijven", "Binaire Klok", "Knikkerbaan", "Kleurenpalet", "Woordklok", "Custom AI Design"]`;

export class AIWaterfallEngine {
  constructor(private store: AIProviderStore) {}

  /**
   * Fetches models dynamically from a provider endpoint (v1/models).
   */
  public async fetchProviderModels(provider: AIProviderConfig): Promise<string[]> {
    if (provider.type === 'gemini') {
      return [
        'gemini-2.5-flash',
        'gemini-2.5-pro',
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemini-1.5-pro'
      ];
    }

    if (!provider.baseUrl) {
      throw new Error('Basis-URL ontbreekt voor deze OpenAI-compatibele provider.');
    }

    const cleanBase = provider.baseUrl.replace(/\/+$/, '');
    const candidateUrls: string[] = [];

    if (cleanBase.endsWith('/models')) {
      candidateUrls.push(cleanBase);
    } else if (cleanBase.endsWith('/v1')) {
      candidateUrls.push(`${cleanBase}/models`);
    } else {
      candidateUrls.push(`${cleanBase}/v1/models`, `${cleanBase}/models`);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(provider.customHeaders || {})
    };

    if (provider.apiKey && provider.apiKey.trim()) {
      headers['Authorization'] = `Bearer ${provider.apiKey.trim()}`;
    }

    let lastError: Error | null = null;

    for (const modelsUrl of candidateUrls) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      try {
        const res = await fetch(modelsUrl, {
          method: 'GET',
          headers,
          signal: controller.signal
        });

        if (!res.ok) {
          lastError = new Error(`Provider HTTP ${res.status}: ${res.statusText} (${modelsUrl})`);
          continue;
        }

        const data = await res.json();
        const rawList = Array.isArray(data)
          ? data
          : Array.isArray(data.data)
          ? data.data
          : Array.isArray(data.models)
          ? data.models
          : [];

        const modelNames: string[] = rawList
          .map((m: any) => (typeof m === 'string' ? m : m.id || m.name))
          .filter((name: any): name is string => typeof name === 'string' && Boolean(name));

        if (modelNames.length > 0) {
          // Sort alphabetically
          modelNames.sort((a, b) => a.localeCompare(b));
          return modelNames;
        }
      } catch (err: any) {
        lastError = err instanceof Error ? err : new Error(String(err));
      } finally {
        clearTimeout(timeout);
      }
    }

    throw lastError || new Error('Geen modellen gevonden op het provider-endpoint.');
  }

  /**
   * Executes a single provider/model generation attempt.
   */
  public async executeStep(
    provider: AIProviderConfig,
    step: WaterfallStep,
    prompt: string,
    currentConfig?: unknown
  ): Promise<ClockConfig & { name: string; description: string }> {
    const userMessage = currentConfig
      ? `Current clock settings: ${JSON.stringify(currentConfig)}.\nUser customization request: "${prompt}"`
      : `Request for a new clock design: "${prompt}"`;

    if (provider.type === 'gemini') {
      const ai = getGeminiClient(provider.apiKey);
      const response = await ai.models.generateContent({
        model: step.modelName || 'gemini-2.5-flash',
        contents: userMessage,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          temperature: step.temperature ?? 0.7,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              style: { type: Type.STRING },
              bgColor: { type: Type.STRING },
              accentColor: { type: Type.STRING },
              secondaryColor: { type: Type.STRING },
              textColor: { type: Type.STRING },
              fontFamily: { type: Type.STRING },
              showSeconds: { type: Type.BOOLEAN },
              glowEffect: { type: Type.BOOLEAN },
              particleEffect: { type: Type.STRING },
              discStyle: { type: Type.STRING },
              handStyle: { type: Type.STRING },
              soundType: { type: Type.STRING },
              customText: { type: Type.STRING },
              clockTypeCategory: { type: Type.STRING }
            },
            required: [
              'name',
              'description',
              'style',
              'bgColor',
              'accentColor',
              'secondaryColor',
              'textColor',
              'fontFamily',
              'showSeconds',
              'glowEffect',
              'particleEffect',
              'discStyle',
              'handStyle',
              'soundType'
            ]
          }
        }
      });

      const resultText = response.text || '{}';
      const raw = JSON.parse(resultText);
      return {
        ...sanitizeClockConfig(raw),
        name: trimmed(raw?.name, 80) || 'Aangepaste AI-klok',
        description: trimmed(raw?.description, 200) || 'Aangepast klokontwerp gegenereerd door AI.'
      };
    }

    // OpenAI Compatible Provider:
    if (!provider.baseUrl) {
      throw new Error(`Geen basis-URL geconfigureerd voor provider ${provider.name}.`);
    }

    const cleanBase = provider.baseUrl.replace(/\/+$/, '');
    const chatUrl = cleanBase.endsWith('/chat/completions')
      ? cleanBase
      : cleanBase.endsWith('/v1')
      ? `${cleanBase}/chat/completions`
      : `${cleanBase}/v1/chat/completions`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(provider.customHeaders || {})
    };

    if (provider.apiKey && provider.apiKey.trim()) {
      headers['Authorization'] = `Bearer ${provider.apiKey.trim()}`;
    }

    const payload = {
      model: step.modelName,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage }
      ],
      temperature: step.temperature ?? 0.7,
      response_format: { type: 'json_object' }
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), step.timeoutMs || 10000);

    try {
      const res = await fetch(chatUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Provider HTTP ${res.status}: ${errorText.slice(0, 300)}`);
      }

      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Geen responsinhoud ontvangen van AI-model.');
      }

      // Parse JSON from content (strip any accidental code blocks if model added them)
      let cleaned = content.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '').trim();
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```/, '').replace(/```$/, '').trim();
      }

      const raw = JSON.parse(cleaned);
      return {
        ...sanitizeClockConfig(raw),
        name: trimmed(raw?.name, 80) || 'Aangepaste AI-klok',
        description: trimmed(raw?.description, 200) || 'Aangepast klokontwerp gegenereerd door AI.'
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Tests a specific provider and model without triggering the waterfall.
   */
  public async testProvider(
    providerId: string,
    modelName: string,
    testPrompt: string = 'Maak een futuristische neon klok'
  ): Promise<{ success: boolean; result?: any; error?: string; durationMs: number }> {
    const provider = this.store.getProvider(providerId);
    if (!provider) {
      return { success: false, error: 'Provider niet gevonden.', durationMs: 0 };
    }

    const step: WaterfallStep = {
      id: 'test-step',
      providerId,
      modelName,
      isEnabled: true,
      timeoutMs: 12000,
      temperature: 0.7
    };

    const startTime = Date.now();
    try {
      const result = await this.executeStep(provider, step, testPrompt);
      const durationMs = Date.now() - startTime;
      return { success: true, result, durationMs };
    } catch (e) {
      const durationMs = Date.now() - startTime;
      return {
        success: false,
        error: e instanceof Error ? e.message : String(e),
        durationMs
      };
    }
  }

  /**
   * Simulates the waterfall pipeline execution and records detailed step-by-step traces for the playground.
   */
  public async simulateWaterfall(
    prompt: string,
    currentConfig?: unknown
  ): Promise<WaterfallSimulationResult> {
    const rawConfig = this.store.getRawConfig();
    const activeSteps = rawConfig.waterfall.filter(w => w.isEnabled);
    const traces: WaterfallTraceStep[] = [];
    const overallStart = Date.now();

    for (let i = 0; i < rawConfig.waterfall.length; i++) {
      const step = rawConfig.waterfall[i];
      if (!step.isEnabled) {
        const primaryProvider = this.store.getProvider(step.providerId);
        traces.push({
          stepIndex: i + 1,
          stepId: step.id,
          modelName: step.modelName,
          providerId: step.providerId,
          providerName: primaryProvider?.name || 'Onbekend',
          status: 'skipped',
          durationMs: 0
        });
        continue;
      }

      // Collect all providers for this model step
      const providerIdsToTry = [
        step.providerId,
        ...(Array.isArray(step.fallbackProviderIds) ? step.fallbackProviderIds : [])
      ];

      let stepSuccess = false;

      for (let pIdx = 0; pIdx < providerIdsToTry.length; pIdx++) {
        const pId = providerIdsToTry[pIdx];
        const provider = this.store.getProvider(pId);
        if (!provider || !provider.isEnabled) {
          continue;
        }

        const stepStart = Date.now();
        try {
          const result = await this.executeStep(provider, step, prompt, currentConfig);
          const durationMs = Date.now() - stepStart;

          traces.push({
            stepIndex: i + 1,
            stepId: step.id,
            modelName: step.modelName,
            providerId: provider.id,
            providerName: provider.name,
            status: 'success',
            durationMs,
            attemptIndex: pIdx + 1
          });

          return {
            success: true,
            totalDurationMs: Date.now() - overallStart,
            traces,
            usedFallback: false,
            clockConfig: result,
            providerUsed: provider.name,
            modelUsed: step.modelName
          };
        } catch (err: any) {
          const durationMs = Date.now() - stepStart;
          const isTimeout =
            err.name === 'AbortError' || (err.message && err.message.toLowerCase().includes('timeout'));

          traces.push({
            stepIndex: i + 1,
            stepId: step.id,
            modelName: step.modelName,
            providerId: provider.id,
            providerName: provider.name,
            status: isTimeout ? 'timeout' : 'failed',
            durationMs,
            error: err instanceof Error ? err.message : String(err),
            attemptIndex: pIdx + 1
          });
        }
      }
    }

    // All active AI steps failed
    if (rawConfig.fallbackToLocalOnFailure === false) {
      return {
        success: false,
        totalDurationMs: Date.now() - overallStart,
        traces,
        usedFallback: false,
        fallbackDeactivated: true,
        error: 'Alle geconfigureerde AI-modellen en providers zijn mislukt en de lokale fallback-engine is uitgeschakeld.'
      };
    }

    // Run fallback
    const fallbackStart = Date.now();
    const fallbackConfig = generateFallbackClockConfig(prompt, currentConfig);
    const fallbackDuration = Date.now() - fallbackStart;

    traces.push({
      stepIndex: rawConfig.waterfall.length + 1,
      stepId: 'step-local-fallback',
      modelName: 'deterministic-rules',
      providerId: 'local-fallback',
      providerName: 'Lokale slimme fallback-engine',
      status: 'success',
      durationMs: fallbackDuration
    });

    return {
      success: true,
      totalDurationMs: Date.now() - overallStart,
      traces,
      usedFallback: true,
      clockConfig: fallbackConfig,
      providerUsed: 'Lokale slimme fallback-engine',
      modelUsed: 'deterministic-rules'
    };
  }

  /**
   * Runs the full waterfall generation pipeline.
   */
  public async generateClock(
    prompt: string,
    currentConfig?: unknown
  ): Promise<{
    clockConfig: ClockConfig & { name: string; description: string };
    providerUsed?: string;
    modelUsed?: string;
    isFallback: boolean;
    waterfallStep?: number;
  }> {
    const rawConfig = this.store.getRawConfig();
    const activeSteps = rawConfig.waterfall.filter(w => w.isEnabled);
    const startTime = Date.now();

    for (let i = 0; i < activeSteps.length; i++) {
      const step = activeSteps[i];
      // Collect providers for this model step (primary + fallbacks)
      const providerIdsToTry = [
        step.providerId,
        ...(Array.isArray(step.fallbackProviderIds) ? step.fallbackProviderIds : [])
      ];

      for (let pIdx = 0; pIdx < providerIdsToTry.length; pIdx++) {
        const pId = providerIdsToTry[pIdx];
        const provider = this.store.getProvider(pId);
        if (!provider || !provider.isEnabled) {
          continue;
        }

        const stepStart = Date.now();
        try {
          const result = await this.executeStep(provider, step, prompt, currentConfig);
          const durationMs = Date.now() - stepStart;

          this.store.addLog({
            prompt,
            success: true,
            providerIdUsed: provider.id,
            providerNameUsed: provider.name,
            modelUsed: step.modelName,
            waterfallStepIndex: i + 1,
            durationMs,
            isFallback: false
          });

          return {
            clockConfig: result,
            providerUsed: provider.name,
            modelUsed: step.modelName,
            isFallback: false,
            waterfallStep: i + 1
          };
        } catch (err: any) {
          const durationMs = Date.now() - stepStart;
          console.warn(
            `[Waterfall Step ${i + 1} / Provider "${provider.name}"] (${step.modelName}) failed:`,
            err instanceof Error ? err.message : err
          );

          this.store.addLog({
            prompt,
            success: false,
            providerIdUsed: provider.id,
            providerNameUsed: provider.name,
            modelUsed: step.modelName,
            waterfallStepIndex: i + 1,
            durationMs,
            error: err instanceof Error ? err.message : String(err),
            isFallback: false
          });
        }
      }
    }

    // Check if local fallback engine is allowed
    if (rawConfig.fallbackToLocalOnFailure === false) {
      const totalDuration = Date.now() - startTime;
      this.store.addLog({
        prompt,
        success: false,
        providerNameUsed: 'Geen (Fallback uitgeschakeld)',
        modelUsed: 'none',
        durationMs: totalDuration,
        error: 'Alle AI-providers zijn mislukt en de lokale fallback-engine is uitgeschakeld.',
        isFallback: false
      });
      throw new Error(
        'Alle geconfigureerde AI-modellen en providers zijn mislukt en de lokale fallback-engine is uitgeschakeld.'
      );
    }

    // All waterfall steps failed or none enabled -> Local Deterministic Engine
    const fallbackConfig = generateFallbackClockConfig(prompt, currentConfig);
    const totalDuration = Date.now() - startTime;

    this.store.addLog({
      prompt,
      success: true,
      providerNameUsed: 'Lokale slimme fallback-engine',
      modelUsed: 'deterministic-generator',
      durationMs: totalDuration,
      isFallback: true
    });

    return {
      clockConfig: fallbackConfig,
      providerUsed: 'Lokale slimme fallback-engine',
      modelUsed: 'deterministic-rules',
      isFallback: true
    };
  }
}
