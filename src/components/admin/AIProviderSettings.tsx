import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AIConfigData, AIProviderConfig, WaterfallStep } from '../../types';
import {
  Cpu,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Play,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  AlertTriangle,
  Server,
  Layers,
  Sparkles,
  Key,
  Globe,
  Sliders,
  Check,
  X,
  Clock
} from 'lucide-react';

export const AIProviderSettings: React.FC = () => {
  const { authFetch } = useAuth();
  const [config, setConfig] = useState<AIConfigData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Provider Modal state
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Partial<AIProviderConfig> | null>(null);
  const [fetchingModelsForId, setFetchingModelsForId] = useState<string | null>(null);

  // Test Provider state
  const [testProviderId, setTestProviderId] = useState<string>('');
  const [testModelName, setTestModelName] = useState<string>('');
  const [testPrompt, setTestPrompt] = useState<string>('Maak een gouden steampunk klok met koperen tandwielen');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  // Load configuration
  const loadConfig = async () => {
    try {
      setIsLoading(true);
      const res = await authFetch('/api/admin/ai-config');
      if (!res.ok) throw new Error('Kon AI configuratie niet laden.');
      const data = await res.json();
      setConfig(data);
      if (data.providers.length > 0) {
        setTestProviderId(data.providers[0].id);
        if (data.providers[0].availableModels.length > 0) {
          setTestModelName(data.providers[0].availableModels[0]);
        }
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Fout bij laden AI configuratie.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  // Save / Update Provider
  const handleSaveProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProvider || !editingProvider.name || !editingProvider.type) return;

    try {
      const isEdit = Boolean(editingProvider.id);
      const url = isEdit
        ? `/api/admin/ai-providers/${editingProvider.id}`
        : '/api/admin/ai-providers';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingProvider)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Kon provider niet opslaan.');
      }

      showNotification('success', `Provider "${editingProvider.name}" succesvol opgeslagen.`);
      setIsProviderModalOpen(false);
      setEditingProvider(null);
      loadConfig();
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  // Delete Provider
  const handleDeleteProvider = async (id: string, name: string) => {
    if (!window.confirm(`Weet je zeker dat je provider "${name}" wilt verwijderen?`)) return;

    try {
      const res = await authFetch(`/api/admin/ai-providers/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Kon provider niet verwijderen.');
      showNotification('success', `Provider "${name}" verwijderd.`);
      loadConfig();
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  // Fetch models dynamically from provider endpoint
  const handleFetchModels = async (providerId: string) => {
    try {
      setFetchingModelsForId(providerId);
      const res = await authFetch(`/api/admin/ai-providers/${providerId}/fetch-models`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Kon modellen niet ophalen.');
      }

      showNotification('success', `${data.models.length} modellen succesvol opgehaald!`);
      loadConfig();
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setFetchingModelsForId(null);
    }
  };

  // Test provider and model live
  const handleRunTest = async () => {
    if (!testProviderId || !testModelName) {
      showNotification('error', 'Selecteer een provider en model om te testen.');
      return;
    }

    try {
      setIsTesting(true);
      setTestResult(null);
      const res = await authFetch('/api/admin/ai-providers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: testProviderId,
          modelName: testModelName,
          prompt: testPrompt
        })
      });
      const data = await res.json();
      setTestResult(data);
      if (data.success) {
        showNotification('success', `Test geslaagd in ${data.durationMs}ms!`);
      } else {
        showNotification('error', data.error || 'Test mislukt.');
      }
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setIsTesting(false);
    }
  };

  // Waterfall manipulation
  const handleMoveWaterfallStep = (index: number, direction: 'up' | 'down') => {
    if (!config) return;
    const newSteps = [...config.waterfall];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSteps.length) return;

    const temp = newSteps[index];
    newSteps[index] = newSteps[targetIndex];
    newSteps[targetIndex] = temp;

    setConfig({ ...config, waterfall: newSteps });
  };

  const handleToggleWaterfallStep = (index: number) => {
    if (!config) return;
    const newSteps = [...config.waterfall];
    newSteps[index].isEnabled = !newSteps[index].isEnabled;
    setConfig({ ...config, waterfall: newSteps });
  };

  const handleUpdateStepModel = (index: number, modelName: string) => {
    if (!config) return;
    const newSteps = [...config.waterfall];
    newSteps[index].modelName = modelName;
    setConfig({ ...config, waterfall: newSteps });
  };

  const handleAddWaterfallStep = () => {
    if (!config || config.providers.length === 0) return;
    const firstProvider = config.providers[0];
    const newStep: WaterfallStep = {
      id: 'step-' + Date.now(),
      providerId: firstProvider.id,
      modelName: firstProvider.availableModels[0] || 'default-model',
      isEnabled: true,
      timeoutMs: 12000,
      temperature: 0.7
    };
    setConfig({ ...config, waterfall: [...config.waterfall, newStep] });
  };

  const handleRemoveWaterfallStep = (index: number) => {
    if (!config) return;
    const newSteps = config.waterfall.filter((_, i) => i !== index);
    setConfig({ ...config, waterfall: newSteps });
  };

  const handleSaveWaterfallConfig = async () => {
    if (!config) return;
    try {
      setIsSaving(true);
      const res = await authFetch('/api/admin/ai-waterfall', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          waterfall: config.waterfall,
          fallbackToLocalOnFailure: config.fallbackToLocalOnFailure
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Kon waterfall niet opslaan.');
      }
      showNotification('success', 'Waterfall configuratie succesvol bijgewerkt!');
      loadConfig();
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>AI configuratie inladen...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Alert banner */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between border ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          <div className="flex items-center space-x-2 text-sm font-medium">
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="p-1 hover:bg-white/10 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SECTION 1: WATERFALL CASCADE PIPELINE */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              <h3 className="text-lg font-bold text-white tracking-tight">
                AI Provider & Model Waterfall Pipeline
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Wanneer een gebruiker een klok genereert, probeert het systeem achtereenvolgens deze stappen.
              Als een provider faalt of time-out heeft, schakelt het direct door naar de volgende stap.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleAddWaterfallStep}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-xl text-xs font-medium transition-colors flex items-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Stap toevoegen</span>
            </button>
            <button
              onClick={handleSaveWaterfallConfig}
              disabled={isSaving}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-indigo-500/20 flex items-center space-x-1.5 disabled:opacity-50"
            >
              {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>Waterfall opslaan</span>
            </button>
          </div>
        </div>

        {/* Waterfall Steps Visual List */}
        <div className="space-y-3">
          {config?.waterfall.map((step, idx) => {
            const provider = config.providers.find((p) => p.id === step.providerId);
            return (
              <div
                key={step.id}
                className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  step.isEnabled
                    ? 'bg-slate-950/70 border-slate-700/80 shadow-md'
                    : 'bg-slate-950/30 border-slate-800/40 opacity-60'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-mono text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-white">
                        {provider?.name || 'Onbekende Provider'}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-slate-800 text-slate-300 border border-slate-700">
                        {provider?.type === 'gemini' ? 'Google Gemini' : 'OpenAI-compatibel'}
                      </span>
                      {step.isEnabled ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Actief
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                          Uitgeschakeld
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Time-out: {step.timeoutMs / 1000}s &bull; Temp: {step.temperature}
                    </p>
                  </div>
                </div>

                {/* Model Selector and Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Provider Selector */}
                  <select
                    value={step.providerId}
                    onChange={(e) => {
                      const newPId = e.target.value;
                      const p = config.providers.find((item) => item.id === newPId);
                      const newSteps = [...config.waterfall];
                      newSteps[idx].providerId = newPId;
                      newSteps[idx].modelName = p?.availableModels[0] || 'default-model';
                      setConfig({ ...config, waterfall: newSteps });
                    }}
                    className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  >
                    {config.providers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>

                  {/* Model Selector */}
                  <select
                    value={step.modelName}
                    onChange={(e) => handleUpdateStepModel(idx, e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-indigo-300 font-mono text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  >
                    {(provider?.availableModels || [step.modelName]).map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>

                  {/* Move Up/Down */}
                  <button
                    disabled={idx === 0}
                    onClick={() => handleMoveWaterfallStep(idx, 'up')}
                    className="p-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 border border-slate-700 text-slate-300 rounded-lg transition-colors"
                    title="Omhoog verplaatsen"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    disabled={idx === config.waterfall.length - 1}
                    onClick={() => handleMoveWaterfallStep(idx, 'down')}
                    className="p-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 border border-slate-700 text-slate-300 rounded-lg transition-colors"
                    title="Omlaag verplaatsen"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>

                  {/* Enable/Disable Toggle */}
                  <button
                    onClick={() => handleToggleWaterfallStep(idx)}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      step.isEnabled
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                    }`}
                  >
                    {step.isEnabled ? 'Deactiveren' : 'Activeren'}
                  </button>

                  {/* Delete Step */}
                  <button
                    onClick={() => handleRemoveWaterfallStep(idx)}
                    className="p-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg transition-colors"
                    title="Verwijder stap"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Final Local Fallback Node */}
          <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-950/20 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="w-7 h-7 rounded-lg bg-indigo-500/30 border border-indigo-400/50 text-indigo-200 font-mono text-xs font-bold flex items-center justify-center">
                ★
              </span>
              <div>
                <span className="text-sm font-semibold text-white">
                  Lokale Slimme Fallback Engine (Ingebouwd)
                </span>
                <p className="text-xs text-slate-400 mt-0.5">
                  Als alle bovenstaande AI stappen falen of time-out bereiken, genereert de lokale engine direct een kloppend ontwerp.
                </p>
              </div>
            </div>
            <span className="text-xs px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 rounded-full font-medium">
              Altijd actief als vangnet
            </span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 2: AI PROVIDERS CATALOG & CUSTOM PROVIDER ADDITION */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-2">
              <Server className="w-5 h-5 text-indigo-400" />
              <h3 className="text-lg font-bold text-white tracking-tight">
                Geconfigureerde AI Providers
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Voeg custom OpenAI-compatibele endpoints toe (zoals lokale Ollama, LM Studio, vLLM, Groq of OpenAI).
              API-sleutel is optioneel voor lokale servers!
            </p>
          </div>
          <button
            onClick={() => {
              setEditingProvider({
                name: '',
                type: 'openai_compatible',
                baseUrl: 'http://localhost:11434/v1',
                apiKey: '',
                isEnabled: true,
                availableModels: ['llama3.2', 'mistral', 'qwen2.5']
              });
              setIsProviderModalOpen(true);
            }}
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-indigo-500/20 flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Custom OpenAI Provider Toevoegen</span>
          </button>
        </div>

        {/* Provider Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {config?.providers.map((provider) => (
            <div
              key={provider.id}
              className="p-5 bg-slate-950/80 border border-slate-800 rounded-xl hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                      <span>{provider.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-slate-800 text-indigo-300 border border-indigo-500/30">
                        {provider.type === 'gemini' ? 'Google Gemini' : 'OpenAI Compatibel'}
                      </span>
                    </h4>
                    {provider.baseUrl && (
                      <p className="text-xs text-slate-400 font-mono mt-1 flex items-center space-x-1 truncate">
                        <Globe className="w-3 h-3 text-slate-500 flex-shrink-0" />
                        <span className="truncate">{provider.baseUrl}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => {
                        setEditingProvider(provider);
                        setIsProviderModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                      title="Bewerken"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {provider.id !== 'gemini-default' && (
                      <button
                        onClick={() => handleDeleteProvider(provider.id, provider.name)}
                        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Verwijderen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Models List */}
                <div className="mt-4 pt-3 border-t border-slate-900">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400">
                      Beschikbare Modellen ({provider.availableModels.length})
                    </span>
                    <button
                      onClick={() => handleFetchModels(provider.id)}
                      disabled={fetchingModelsForId === provider.id}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 hover:underline disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`w-3 h-3 ${fetchingModelsForId === provider.id ? 'animate-spin' : ''}`}
                      />
                      <span>Modellen ophalen van provider</span>
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {provider.availableModels.map((m) => (
                      <span
                        key={m}
                        className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-300 text-[11px] font-mono rounded-md"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Status and quick test footer */}
              <div className="mt-4 pt-3 border-t border-slate-900 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center space-x-1">
                  <Key className="w-3 h-3" />
                  <span>{provider.apiKey ? 'API-Key ingesteld' : 'Geen API-Key vereist'}</span>
                </span>
                <button
                  onClick={() => {
                    setTestProviderId(provider.id);
                    if (provider.availableModels.length > 0) {
                      setTestModelName(provider.availableModels[0]);
                    }
                  }}
                  className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                >
                  <Play className="w-3 h-3" />
                  <span>Test in console</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 3: LIVE PROVIDER & MODEL TESTER */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center space-x-2 mb-4">
          <Play className="w-5 h-5 text-emerald-400" />
          <h3 className="text-lg font-bold text-white tracking-tight">
            Live Provider & Model Tester
          </h3>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Test een specifieke provider en model met een echte prompt om latency, JSON schema naleving en connectiviteit te valideren.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Provider</label>
            <select
              value={testProviderId}
              onChange={(e) => {
                const pId = e.target.value;
                setTestProviderId(pId);
                const p = config?.providers.find((item) => item.id === pId);
                if (p && p.availableModels.length > 0) {
                  setTestModelName(p.availableModels[0]);
                }
              }}
              className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl p-2.5 focus:outline-none focus:border-indigo-500"
            >
              {config?.providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Model</label>
            <select
              value={testModelName}
              onChange={(e) => setTestModelName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-indigo-300 font-mono text-xs rounded-xl p-2.5 focus:outline-none focus:border-indigo-500"
            >
              {config?.providers
                .find((p) => p.id === testProviderId)
                ?.availableModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Actie</label>
            <button
              onClick={handleRunTest}
              disabled={isTesting}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-1.5 disabled:opacity-50"
            >
              {isTesting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Testen uitvoeren...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Prompt Generatie Testen</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-400 mb-1">Test Prompt</label>
          <input
            type="text"
            value={testPrompt}
            onChange={(e) => setTestPrompt(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl p-2.5 focus:outline-none focus:border-indigo-500"
            placeholder="Voer een klokontwerp-prompt in..."
          />
        </div>

        {/* Test Result Display */}
        {testResult && (
          <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-300 flex items-center space-x-2">
                {testResult.success ? (
                  <span className="text-emerald-400 flex items-center space-x-1">
                    <CheckCircle className="w-4 h-4" /> <span>Test Geslaagd</span>
                  </span>
                ) : (
                  <span className="text-red-400 flex items-center space-x-1">
                    <AlertTriangle className="w-4 h-4" /> <span>Test Mislukt</span>
                  </span>
                )}
              </span>
              <span className="text-slate-500">Latency: {testResult.durationMs}ms</span>
            </div>
            {testResult.error && <p className="text-red-400 font-sans">{testResult.error}</p>}
            {testResult.result && (
              <pre className="text-slate-300 max-h-48 overflow-y-auto whitespace-pre-wrap p-2 bg-slate-900 rounded-lg">
                {JSON.stringify(testResult.result, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADD / EDIT AI PROVIDER */}
      {/* ------------------------------------------------------------- */}
      {isProviderModalOpen && editingProvider && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
          onClick={() => setIsProviderModalOpen(false)}
        >
          <div
            className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsProviderModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">
              {editingProvider.id ? 'AI Provider Bewerken' : 'Custom AI Provider Toevoegen'}
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Configureer een OpenAI-compatibele API server (zoals Ollama, Groq, LM Studio, vLLM of OpenAI).
            </p>

            <form onSubmit={handleSaveProvider} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Provider Naam
                </label>
                <input
                  type="text"
                  required
                  placeholder="bijv. Local Ollama Server of Groq Cloud"
                  value={editingProvider.name || ''}
                  onChange={(e) => setEditingProvider({ ...editingProvider, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Provider Type
                </label>
                <select
                  value={editingProvider.type || 'openai_compatible'}
                  onChange={(e) =>
                    setEditingProvider({ ...editingProvider, type: e.target.value as any })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="openai_compatible">OpenAI-compatibel (Ollama, Groq, vLLM, OpenAI)</option>
                  <option value="gemini">Google Gemini</option>
                </select>
              </div>

              {editingProvider.type === 'openai_compatible' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Base URL
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="http://localhost:11434/v1 of https://api.openai.com/v1"
                    value={editingProvider.baseUrl || ''}
                    onChange={(e) =>
                      setEditingProvider({ ...editingProvider, baseUrl: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono text-sm focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Tip: Voor Ollama lokaal is dit standaard <code>http://localhost:11434/v1</code>
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  API Key <span className="text-slate-500 font-normal">(Optioneel voor lokale LLM's)</span>
                </label>
                <input
                  type="password"
                  placeholder="sk-... (laat leeg voor lokale Ollama of LM Studio)"
                  value={editingProvider.apiKey || ''}
                  onChange={(e) =>
                    setEditingProvider({ ...editingProvider, apiKey: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Beschikbare Modellen (komma-gescheiden)
                </label>
                <input
                  type="text"
                  placeholder="llama3.2, mistral, qwen2.5, gpt-4o-mini"
                  value={editingProvider.availableModels?.join(', ') || ''}
                  onChange={(e) => {
                    const models = e.target.value
                      .split(',')
                      .map((m) => m.trim())
                      .filter(Boolean);
                    setEditingProvider({ ...editingProvider, availableModels: models });
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="provider-enabled-toggle"
                  checked={editingProvider.isEnabled ?? true}
                  onChange={(e) =>
                    setEditingProvider({ ...editingProvider, isEnabled: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-700"
                />
                <label htmlFor="provider-enabled-toggle" className="text-xs font-medium text-slate-300">
                  Provider actief inschakelen
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsProviderModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-indigo-500/20"
                >
                  Opslaan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
