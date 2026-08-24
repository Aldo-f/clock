import fs from 'fs';
import path from 'path';

export type AIProviderType = 'gemini' | 'openai_compatible';

export interface AIProviderConfig {
  id: string;
  name: string;
  type: AIProviderType;
  baseUrl?: string;
  apiKey?: string;
  customHeaders?: Record<string, string>;
  isEnabled: boolean;
  availableModels: string[];
  createdAt: string;
  updatedAt: string;
}

export interface WaterfallStep {
  id: string;
  providerId: string;
  fallbackProviderIds?: string[];
  modelName: string;
  isEnabled: boolean;
  timeoutMs: number;
  temperature: number;
}

export interface AIConfigData {
  providers: AIProviderConfig[];
  waterfall: WaterfallStep[];
  fallbackToLocalOnFailure: boolean;
}

export interface GenerationLog {
  id: string;
  timestamp: string;
  prompt: string;
  success: boolean;
  providerIdUsed?: string;
  providerNameUsed?: string;
  modelUsed?: string;
  waterfallStepIndex?: number;
  durationMs: number;
  error?: string;
  isFallback: boolean;
}

const AI_CONFIG_PATH =
  process.env.AI_CONFIG_PATH || path.join(process.cwd(), 'data', 'ai-config.json');

function seedDefaultAIConfig(): AIConfigData {
  const now = new Date().toISOString();
  return {
    providers: [
      {
        id: 'provider-gemini-builtin',
        name: 'Google Gemini (Built-in)',
        type: 'gemini',
        isEnabled: true,
        availableModels: [
          'gemini-2.5-flash',
          'gemini-2.5-pro',
          'gemini-1.5-flash',
          'gemini-1.5-pro'
        ],
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'provider-openai-custom',
        name: 'OpenAI (Official API)',
        type: 'openai_compatible',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: '',
        isEnabled: false,
        availableModels: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'provider-ollama-local',
        name: 'Ollama (Localhost / Homelab)',
        type: 'openai_compatible',
        baseUrl: 'http://localhost:11434/v1',
        apiKey: '', // No key required for local Ollama
        isEnabled: false,
        availableModels: ['llama3.2', 'mistral', 'qwen2.5-coder', 'phi3'],
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'provider-groq-cloud',
        name: 'Groq Cloud (Ultra-Fast)',
        type: 'openai_compatible',
        baseUrl: 'https://api.groq.com/openai/v1',
        apiKey: '',
        isEnabled: false,
        availableModels: [
          'llama-3.3-70b-versatile',
          'llama-3.1-8b-instant',
          'mixtral-8x7b-32768'
        ],
        createdAt: now,
        updatedAt: now
      }
    ],
    waterfall: [
      {
        id: 'step-1',
        providerId: 'provider-gemini-builtin',
        modelName: 'gemini-2.5-flash',
        isEnabled: true,
        timeoutMs: 9000,
        temperature: 0.7
      },
      {
        id: 'step-2',
        providerId: 'provider-openai-custom',
        modelName: 'gpt-4o-mini',
        isEnabled: false,
        timeoutMs: 9000,
        temperature: 0.7
      },
      {
        id: 'step-3',
        providerId: 'provider-groq-cloud',
        modelName: 'llama-3.3-70b-versatile',
        isEnabled: false,
        timeoutMs: 8000,
        temperature: 0.7
      },
      {
        id: 'step-4',
        providerId: 'provider-ollama-local',
        modelName: 'llama3.2',
        isEnabled: false,
        timeoutMs: 15000,
        temperature: 0.7
      }
    ],
    fallbackToLocalOnFailure: true
  };
}

export class AIProviderStore {
  private config: AIConfigData;
  private logs: GenerationLog[] = [];
  private saveTimer: NodeJS.Timeout | null = null;

  constructor(private filePath: string = AI_CONFIG_PATH) {
    this.config = this.load();
  }

  private load(): AIConfigData {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.providers) && Array.isArray(parsed.waterfall)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('AI config store unreadable, reseeding defaults:', e instanceof Error ? e.message : e);
    }
    return seedDefaultAIConfig();
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
      fs.writeFileSync(tmp, JSON.stringify(this.config, null, 2));
      fs.renameSync(tmp, this.filePath);
    } catch (e) {
      console.error('AI config store save failed:', e instanceof Error ? e.message : e);
    }
  }

  public getConfig(maskKeys: boolean = true): AIConfigData {
    if (!maskKeys) return this.config;
    return {
      ...this.config,
      providers: this.config.providers.map(p => ({
        ...p,
        apiKey: p.apiKey ? (p.apiKey.length > 8 ? `${p.apiKey.slice(0, 4)}...${p.apiKey.slice(-4)}` : '••••••••') : ''
      }))
    };
  }

  public getRawConfig(): AIConfigData {
    return this.config;
  }

  public getProvider(id: string): AIProviderConfig | undefined {
    return this.config.providers.find(p => p.id === id);
  }

  public saveProvider(provider: Omit<AIProviderConfig, 'createdAt' | 'updatedAt' | 'id'> & { id?: string }): AIProviderConfig {
    const now = new Date().toISOString();
    const existingIndex = provider.id ? this.config.providers.findIndex(p => p.id === provider.id) : -1;

    let updated: AIProviderConfig;
    if (existingIndex >= 0) {
      const current = this.config.providers[existingIndex];
      // Preserve existing apiKey if incoming is empty/masked
      const apiKeyToUse =
        provider.apiKey && !provider.apiKey.includes('•••') && !provider.apiKey.includes('...')
          ? provider.apiKey
          : current.apiKey;

      updated = {
        ...current,
        name: provider.name.trim() || current.name,
        type: provider.type,
        baseUrl: provider.baseUrl?.trim(),
        apiKey: apiKeyToUse,
        customHeaders: provider.customHeaders,
        isEnabled: provider.isEnabled,
        availableModels: Array.isArray(provider.availableModels) && provider.availableModels.length > 0
          ? provider.availableModels
          : current.availableModels,
        updatedAt: now
      };
      this.config.providers[existingIndex] = updated;
    } else {
      const id = provider.id || `provider-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      updated = {
        id,
        name: provider.name.trim() || 'Custom AI Provider',
        type: provider.type,
        baseUrl: provider.baseUrl?.trim() || 'https://api.openai.com/v1',
        apiKey: provider.apiKey || '',
        customHeaders: provider.customHeaders || {},
        isEnabled: provider.isEnabled ?? true,
        availableModels: provider.availableModels || ['default-model'],
        createdAt: now,
        updatedAt: now
      };
      this.config.providers.push(updated);
    }

    this.scheduleSave();
    return updated;
  }

  public deleteProvider(id: string): boolean {
    const index = this.config.providers.findIndex(p => p.id === id);
    if (index === -1) return false;
    this.config.providers.splice(index, 1);
    // Remove references from waterfall
    this.config.waterfall = this.config.waterfall.filter(w => w.providerId !== id);
    this.scheduleSave();
    return true;
  }

  public updateWaterfall(waterfall: WaterfallStep[], fallbackToLocal?: boolean): AIConfigData {
    this.config.waterfall = waterfall.map((step, idx) => ({
      id: step.id || `step-${idx + 1}-${Date.now()}`,
      providerId: step.providerId,
      fallbackProviderIds: Array.isArray(step.fallbackProviderIds) ? step.fallbackProviderIds : [],
      modelName: step.modelName,
      isEnabled: step.isEnabled ?? true,
      timeoutMs: step.timeoutMs || 9000,
      temperature: typeof step.temperature === 'number' ? step.temperature : 0.7
    }));

    if (typeof fallbackToLocal === 'boolean') {
      this.config.fallbackToLocalOnFailure = fallbackToLocal;
    }

    this.scheduleSave();
    return this.getConfig(true);
  }

  public addLog(log: Omit<GenerationLog, 'id' | 'timestamp'>): GenerationLog {
    const fullLog: GenerationLog = {
      ...log,
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      timestamp: new Date().toISOString()
    };
    this.logs.unshift(fullLog);
    if (this.logs.length > 200) {
      this.logs.length = 200;
    }
    return fullLog;
  }

  public getLogs(): GenerationLog[] {
    return this.logs;
  }
}
