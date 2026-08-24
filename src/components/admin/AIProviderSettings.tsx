import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  AIConfigData,
  AIProviderConfig,
  WaterfallStep,
  WaterfallSimulationResult
} from '../../types';
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
  Clock,
  GripVertical,
  Zap,
  ShieldAlert,
  ShieldCheck,
  Code,
  Eye,
  CornerDownRight,
  HelpCircle
} from 'lucide-react';
import { ClockRenderer } from '../ClockRenderer';
import { PRESET_CLOCKS } from '../../data/presetClocks';

const SAMPLE_PROMPTS = [
  'Futuristische neon cyberpunk klok met pulserende cyaan wijzers',
  'Gouden steampunk klok met koperen tandwielen en stoomdeeltjes',
  'Zen minimalistische bamboe klok met rustgevende natuurkleuren',
  'Vintage nixie-buizen klok met warme gloeidraad-cijfers in vacuüm',
  'Kosmische astronomische klok met sterrenstelsel en gouden zonnenevel'
];

export const AIProviderSettings: React.FC = () => {
  const { authFetch } = useAuth();
  const [config, setConfig] = useState<AIConfigData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingAll, setIsFetchingAll] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Drag-and-drop state for model waterfall reordering
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Provider Modal state
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Partial<AIProviderConfig> | null>(null);
  const [fetchingModelsForId, setFetchingModelsForId] = useState<string | null>(null);
  const [isFetchingInModal, setIsFetchingInModal] = useState(false);

  // Add Model Modal state
  const [isAddModelModalOpen, setIsAddModelModalOpen] = useState(false);
  const [newModelName, setNewModelName] = useState('');
  const [newModelProviderId, setNewModelProviderId] = useState('');

  // Waterfall Playground state
  const [playgroundPrompt, setPlaygroundPrompt] = useState<string>(SAMPLE_PROMPTS[0]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<WaterfallSimulationResult | null>(null);
  const [playgroundTab, setPlaygroundTab] = useState<'visual' | 'traces' | 'json'>('visual');

  // Load configuration
  const loadConfig = async () => {
    try {
      setIsLoading(true);
      const res = await authFetch('/api/admin/ai-config');
      if (!res.ok) throw new Error('Kon AI-configuratie niet laden.');
      const data = await res.json();
      setConfig(data);
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Fout bij laden van AI-configuratie.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4500);
  };

  // Aggregated list of all available models across all providers
  const allAvailableModelsWithProviders = useMemo(() => {
    if (!config) return [];
    const map = new Map<string, { model: string; providers: { id: string; name: string }[] }>();

    for (const provider of config.providers) {
      for (const m of provider.availableModels || []) {
        if (!map.has(m)) {
          map.set(m, { model: m, providers: [] });
        }
        map.get(m)!.providers.push({ id: provider.id, name: provider.name });
      }
    }

    return Array.from(map.values()).sort((a, b) => a.model.localeCompare(b.model));
  }, [config]);

  // Fetch models for ALL providers via v1/models
  const handleFetchAllModels = async () => {
    try {
      setIsFetchingAll(true);
      const res = await authFetch('/api/admin/ai-providers/fetch-all-models', {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Kon modellen niet ophalen.');
      }

      if (data.config) {
        setConfig(data.config);
      } else {
        await loadConfig();
      }

      let totalCount = 0;
      if (data.results) {
        totalCount = (Object.values(data.results) as any[]).reduce(
          (acc: number, cur: any) => acc + (Number(cur.modelsCount) || 0),
          0
        );
      }
      showNotification(
        'success',
        `Modellen succesvol opgehaald via v1/models (${totalCount} modellen bijgewerkt)!`
      );
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setIsFetchingAll(false);
    }
  };

  // Fetch models for a single provider
  const handleFetchModelsForProvider = async (providerId: string) => {
    try {
      setFetchingModelsForId(providerId);
      const res = await authFetch(`/api/admin/ai-providers/${providerId}/fetch-models`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Kon modellen niet ophalen.');
      }

      showNotification('success', `${data.models.length} modellen succesvol opgehaald via v1/models!`);
      loadConfig();
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setFetchingModelsForId(null);
    }
  };

  // Fetch models in the Modal
  const handleFetchModelsInModal = async () => {
    if (!editingProvider?.baseUrl) {
      showNotification('error', 'Vul eerst een geldige basis-URL in.');
      return;
    }

    try {
      setIsFetchingInModal(true);
      const cleanBase = editingProvider.baseUrl.replace(/\/+$/, '');
      const modelsUrl = cleanBase.endsWith('/models')
        ? cleanBase
        : cleanBase.endsWith('/v1')
        ? `${cleanBase}/models`
        : `${cleanBase}/v1/models`;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (editingProvider.apiKey && editingProvider.apiKey.trim()) {
        headers['Authorization'] = `Bearer ${editingProvider.apiKey.trim()}`;
      }

      const res = await fetch(modelsUrl, { headers });
      if (!res.ok) {
        throw new Error(`Endpoint gaf status ${res.status}: ${res.statusText}`);
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
        .filter((n: any): n is string => typeof n === 'string' && Boolean(n));

      if (modelNames.length === 0) {
        throw new Error('Geen modellen gevonden in de respons.');
      }

      modelNames.sort();
      setEditingProvider({ ...editingProvider, availableModels: modelNames });
      showNotification('success', `${modelNames.length} modellen automatisch geladen van endpoint!`);
    } catch (err: any) {
      showNotification('error', `Kon modellen niet direct ophalen: ${err.message}`);
    } finally {
      setIsFetchingInModal(false);
    }
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

  // -------------------------------------------------------------
  // DRAG & DROP FOR MODEL WATERFALL REORDERING
  // -------------------------------------------------------------
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex || !config) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newWaterfall = [...config.waterfall];
    const [movedItem] = newWaterfall.splice(draggedIndex, 1);
    newWaterfall.splice(targetIndex, 0, movedItem);

    setConfig({ ...config, waterfall: newWaterfall });
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Move step up/down manually
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

  const handleToggleFallbackProvider = (stepIndex: number, providerId: string) => {
    if (!config) return;
    const newSteps = [...config.waterfall];
    const step = newSteps[stepIndex];
    const currentFallbacks = Array.isArray(step.fallbackProviderIds) ? step.fallbackProviderIds : [];

    if (currentFallbacks.includes(providerId)) {
      step.fallbackProviderIds = currentFallbacks.filter((id) => id !== providerId);
    } else {
      step.fallbackProviderIds = [...currentFallbacks, providerId];
    }

    setConfig({ ...config, waterfall: newSteps });
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
      showNotification('success', 'Waterfall-configuratie succesvol opgeslagen!');
      loadConfig();
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Add a new model to waterfall
  const handleConfirmAddModel = () => {
    if (!config || !newModelName || !newModelProviderId) return;

    const newStep: WaterfallStep = {
      id: 'step-' + Date.now(),
      modelName: newModelName,
      providerId: newModelProviderId,
      fallbackProviderIds: [],
      isEnabled: true,
      timeoutMs: 9000,
      temperature: 0.7
    };

    setConfig({ ...config, waterfall: [...config.waterfall, newStep] });
    setIsAddModelModalOpen(false);
    setNewModelName('');
    setNewModelProviderId('');
  };

  // Run Waterfall Playground Simulation
  const handleRunSimulation = async () => {
    if (!playgroundPrompt.trim()) {
      showNotification('error', 'Voer een testprompt in om de waterfall te simuleren.');
      return;
    }

    try {
      setIsSimulating(true);
      setSimulationResult(null);
      const res = await authFetch('/api/admin/ai-waterfall/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: playgroundPrompt })
      });
      const data = await res.json();
      setSimulationResult(data);
      if (data.success) {
        showNotification('success', `Waterfall-simulatie voltooid in ${data.totalDurationMs}ms!`);
      } else {
        showNotification('error', data.error || 'Waterfall-simulatie mislukt.');
      }
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setIsSimulating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-16 text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin mr-2 text-indigo-400" />
        <span>AI-configuratie laden...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
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
      {/* SECTION 1: AI MODEL WATERFALL PIPELINE (DRAGGABLE MODELS) */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              <h3 className="text-lg font-bold text-white tracking-tight">
                AI-modellen waterfall-pipeline
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Hieronder staan de AI-modellen in volgorde van prioriteit. Sleep modellen om de volgorde te wijzigen.
              Als een model faalt of time-out heeft, schakelt het systeem automatisch door naar het volgende model.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleFetchAllModels}
              disabled={isFetchingAll}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-xl text-xs font-medium transition-colors flex items-center space-x-1.5 disabled:opacity-50"
              title="Haalt de lijst met beschikbare modellen automatisch op via v1/models voor alle providers"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetchingAll ? 'animate-spin' : ''}`} />
              <span>{isFetchingAll ? 'Ophalen...' : 'Alle modellen ophalen via v1/models'}</span>
            </button>
            <button
              onClick={() => {
                if (allAvailableModelsWithProviders.length > 0) {
                  const first = allAvailableModelsWithProviders[0];
                  setNewModelName(first.model);
                  setNewModelProviderId(first.providers[0]?.id || '');
                } else if (config && config.providers.length > 0) {
                  setNewModelProviderId(config.providers[0].id);
                  setNewModelName(config.providers[0].availableModels[0] || 'default-model');
                }
                setIsAddModelModalOpen(true);
              }}
              className="px-3.5 py-2 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 rounded-xl text-xs font-medium transition-colors flex items-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Model toevoegen aan waterfall</span>
            </button>
            <button
              onClick={handleSaveWaterfallConfig}
              disabled={isSaving}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-indigo-500/20 flex items-center space-x-1.5 disabled:opacity-50"
            >
              {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>Waterfall-configuratie opslaan</span>
            </button>
          </div>
        </div>

        {/* Model Waterfall Draggable List */}
        <div className="space-y-3">
          {config?.waterfall.map((step, idx) => {
            const primaryProvider = config.providers.find((p) => p.id === step.providerId);
            const isDraggingThis = draggedIndex === idx;
            const isDragOverThis = dragOverIndex === idx;

            // Find all providers that support this model name
            const providersForThisModel = config.providers.filter(
              (p) => p.availableModels && p.availableModels.includes(step.modelName)
            );

            return (
              <div
                key={step.id}
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={(e) => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
                className={`p-4 rounded-xl border transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-grab active:cursor-grabbing ${
                  isDraggingThis
                    ? 'opacity-40 scale-[0.99] border-dashed border-indigo-400 bg-indigo-950/40'
                    : isDragOverThis
                    ? 'border-indigo-400 bg-indigo-950/30 scale-[1.01]'
                    : step.isEnabled
                    ? 'bg-slate-950/80 border-slate-800 hover:border-slate-700 shadow-md'
                    : 'bg-slate-950/30 border-slate-800/40 opacity-60'
                }`}
              >
                {/* Left: Drag handle + Priority + Model Name */}
                <div className="flex items-center space-x-3.5 min-w-0">
                  <div className="text-slate-500 hover:text-slate-300 p-1">
                    <GripVertical className="w-4 h-4" />
                  </div>
                  <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-mono text-xs font-bold flex items-center justify-center">
                    #{idx + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-white font-mono tracking-wide">
                        {step.modelName}
                      </span>
                      {step.isEnabled ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium">
                          Actief
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium">
                          Uitgeschakeld
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1">
                      <span className="flex items-center space-x-1">
                        <Server className="w-3 h-3 text-slate-500" />
                        <span>Primaire provider: </span>
                        <strong className="text-slate-200 font-semibold">{primaryProvider?.name || 'Onbekend'}</strong>
                      </span>
                      <span>&bull;</span>
                      <span>Time-out: {(step.timeoutMs || 9000) / 1000}s</span>
                      <span>&bull;</span>
                      <span>Temp: {step.temperature ?? 0.7}</span>
                    </div>

                    {/* Secondary Fallback Providers for this model (One model used by multiple providers) */}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-slate-400 mr-1 flex items-center space-x-1">
                        <CornerDownRight className="w-3 h-3 text-indigo-400" />
                        <span>Fallback-providers voor dit model:</span>
                      </span>
                      {config.providers.map((p) => {
                        const isPrimary = p.id === step.providerId;
                        const isFallback = Array.isArray(step.fallbackProviderIds) && step.fallbackProviderIds.includes(p.id);

                        if (isPrimary) {
                          return (
                            <span
                              key={p.id}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-medium"
                              title="Primaire provider voor dit model"
                            >
                              ★ {p.name} (Primair)
                            </span>
                          );
                        }

                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleToggleFallbackProvider(idx, p.id)}
                            className={`text-[10px] px-2 py-0.5 rounded-md border transition-all ${
                              isFallback
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-medium shadow-sm'
                                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                            }`}
                            title={isFallback ? 'Klik om als fallback te verwijderen' : `Klik om ${p.name} toe te voegen als extra fallback`}
                          >
                            {isFallback ? '✓ ' : '+ '}
                            {p.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right: Controls (Model selector, Up/Down, Enable/Disable, Delete) */}
                <div className="flex flex-wrap items-center gap-2 self-end lg:self-center">
                  {/* Change Primary Provider */}
                  <select
                    value={step.providerId}
                    onChange={(e) => {
                      const newPId = e.target.value;
                      const newSteps = [...config.waterfall];
                      newSteps[idx].providerId = newPId;
                      // Remove from fallback list if selected as primary
                      if (Array.isArray(newSteps[idx].fallbackProviderIds)) {
                        newSteps[idx].fallbackProviderIds = newSteps[idx].fallbackProviderIds?.filter((id) => id !== newPId);
                      }
                      setConfig({ ...config, waterfall: newSteps });
                    }}
                    className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                    title="Wijzig primaire provider"
                  >
                    {config.providers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>

                  {/* Move Up/Down buttons */}
                  <div className="flex items-center space-x-1">
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
                  </div>

                  {/* Enable/Disable Toggle */}
                  <button
                    onClick={() => handleToggleWaterfallStep(idx)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      step.isEnabled
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                    }`}
                  >
                    {step.isEnabled ? 'Uitschakelen' : 'Inschakelen'}
                  </button>

                  {/* Delete Step */}
                  <button
                    onClick={() => handleRemoveWaterfallStep(idx)}
                    className="p-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg transition-colors"
                    title="Verwijder model uit waterfall"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* ------------------------------------------------------------- */}
          {/* FINAL NODE: LOKALE SLIMME FALLBACK-ENGINE (TOGGLEABLE) */}
          {/* ------------------------------------------------------------- */}
          <div
            className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              config?.fallbackToLocalOnFailure !== false
                ? 'border-indigo-500/40 bg-indigo-950/30 shadow-md'
                : 'border-slate-800 bg-slate-950/40 opacity-70'
            }`}
          >
            <div className="flex items-start space-x-3.5">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono text-xs font-bold flex-shrink-0 ${
                  config?.fallbackToLocalOnFailure !== false
                    ? 'bg-indigo-500/30 border border-indigo-400/50 text-indigo-200'
                    : 'bg-slate-800 border border-slate-700 text-slate-400'
                }`}
              >
                ★
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-bold text-white">
                    Lokale slimme fallback-engine (ingebouwd)
                  </span>
                  {config?.fallbackToLocalOnFailure !== false ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium">
                      Actief als vangnet
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 font-medium">
                      Gedeactiveerd
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {config?.fallbackToLocalOnFailure !== false
                    ? 'Als alle bovenstaande AI-modellen falen of een time-out bereiken, genereert de lokale deterministische engine direct een passend klokontwerp.'
                    : 'De lokale fallback is uitgeschakeld. Generatieverzoeken geven een foutmelding als alle AI-modellen in de waterfall falen.'}
                </p>
              </div>
            </div>

            {/* Toggle Fallback Switch */}
            <div className="flex items-center space-x-3 self-end sm:self-center flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (!config) return;
                  const nextState = config.fallbackToLocalOnFailure === false;
                  setConfig({ ...config, fallbackToLocalOnFailure: nextState });
                }}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl border transition-all flex items-center space-x-1.5 ${
                  config?.fallbackToLocalOnFailure !== false
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                }`}
              >
                {config?.fallbackToLocalOnFailure !== false ? (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Deactiveren</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Activeren</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 2: WATERFALL PLAYGROUND & SIMULATOR */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-amber-400" />
              <h3 className="text-lg font-bold text-white tracking-tight">
                Waterfall playground & simulator
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Test de actuele waterfall-instellingen met een echte prompt. Bekijk exact welke stappen zijn uitgevoerd,
              de latentie per model, eventuele fouten en de uiteindelijke klokweergave.
            </p>
          </div>
          <button
            onClick={handleRunSimulation}
            disabled={isSimulating}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-500/20 flex items-center space-x-2 disabled:opacity-50"
          >
            {isSimulating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Simulatie uitvoeren...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Simulatie starten</span>
              </>
            )}
          </button>
        </div>

        {/* Preset Prompt Pills */}
        <div className="mb-3">
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">
            Testprompt of kies een voorbeeld:
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {SAMPLE_PROMPTS.map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPlaygroundPrompt(p)}
                className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors truncate max-w-xs ${
                  playgroundPrompt === p
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={playgroundPrompt}
            onChange={(e) => setPlaygroundPrompt(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl p-3 focus:outline-none focus:border-indigo-500"
            placeholder="Voer een klokontwerp-prompt in..."
          />
        </div>

        {/* Simulation Execution Trace Display */}
        {simulationResult && (
          <div className="mt-6 pt-4 border-t border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center space-x-2">
                {simulationResult.success ? (
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center space-x-1.5">
                    <CheckCircle className="w-4 h-4" />
                    <span>Simulatie geslaagd ({simulationResult.totalDurationMs}ms)</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-300 border border-red-500/40 text-xs font-bold flex items-center space-x-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Generatie mislukt ({simulationResult.totalDurationMs}ms)</span>
                  </span>
                )}
                {simulationResult.usedFallback && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                    Vangnet gebruikt (Lokale fallback)
                  </span>
                )}
              </div>

              {/* View Switcher Tabs */}
              <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => setPlaygroundTab('visual')}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors flex items-center space-x-1.5 ${
                    playgroundTab === 'visual' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Klokweergave</span>
                </button>
                <button
                  onClick={() => setPlaygroundTab('traces')}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors flex items-center space-x-1.5 ${
                    playgroundTab === 'traces' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Waterfall-trace ({simulationResult.traces.length})</span>
                </button>
                <button
                  onClick={() => setPlaygroundTab('json')}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors flex items-center space-x-1.5 ${
                    playgroundTab === 'json' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>JSON-configuratie</span>
                </button>
              </div>
            </div>

            {/* Tab 1: Visual Clock Preview */}
            {playgroundTab === 'visual' && simulationResult.clockConfig && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="h-64 sm:h-72 rounded-xl overflow-hidden relative border border-slate-800 shadow-inner flex items-center justify-center">
                  <ClockRenderer
                    type="custom_ai"
                    config={simulationResult.clockConfig}
                    className="w-full h-full"
                  />
                </div>
                <div className="flex flex-col justify-between space-y-3 p-2">
                  <div>
                    <h4 className="text-base font-bold text-white">{simulationResult.clockConfig.name}</h4>
                    <p className="text-xs text-slate-400 mt-1">{simulationResult.clockConfig.description}</p>

                    <div className="grid grid-cols-2 gap-2 mt-4 text-xs font-mono">
                      <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                        <span className="text-slate-500 text-[10px] block font-sans">Model gebruikt</span>
                        <span className="text-indigo-300 font-bold">{simulationResult.modelUsed || 'Geen'}</span>
                      </div>
                      <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                        <span className="text-slate-500 text-[10px] block font-sans">Provider gebruikt</span>
                        <span className="text-slate-200">{simulationResult.providerUsed || 'Geen'}</span>
                      </div>
                      <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                        <span className="text-slate-500 text-[10px] block font-sans">Stijl / Thema</span>
                        <span className="text-slate-200">{simulationResult.clockConfig.style}</span>
                      </div>
                      <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 flex items-center space-x-2">
                        <span
                          className="w-4 h-4 rounded-full border border-white/20"
                          style={{ backgroundColor: simulationResult.clockConfig.accentColor }}
                        />
                        <div>
                          <span className="text-slate-500 text-[10px] block font-sans">Accentkleur</span>
                          <span className="text-slate-200">{simulationResult.clockConfig.accentColor}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500">
                    Klok gegenereerd volgens de actuele cascade-instellingen van jouw studio.
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Execution Traces Timeline */}
            {playgroundTab === 'traces' && (
              <div className="space-y-2.5 bg-slate-950 p-4 rounded-xl border border-slate-800">
                {simulationResult.traces.map((trace, tIdx) => (
                  <div
                    key={tIdx}
                    className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono ${
                      trace.status === 'success'
                        ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                        : trace.status === 'failed'
                        ? 'bg-red-950/30 border-red-500/40 text-red-300'
                        : trace.status === 'timeout'
                        ? 'bg-amber-950/30 border-amber-500/40 text-amber-300'
                        : 'bg-slate-900/40 border-slate-800 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="font-bold">
                        Stap {trace.stepIndex}: {trace.modelName}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded font-sans bg-slate-900 text-slate-300 border border-slate-700">
                        {trace.providerName}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3">
                      {trace.status === 'success' && (
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-sans font-bold flex items-center space-x-1">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Succes ({trace.durationMs}ms)</span>
                        </span>
                      )}
                      {trace.status === 'failed' && (
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 bg-red-500/20 text-red-300 rounded font-sans font-bold flex items-center space-x-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Mislukt ({trace.durationMs}ms)</span>
                          </span>
                          {trace.error && (
                            <span className="text-red-400 text-[11px] font-sans truncate max-w-xs" title={trace.error}>
                              {trace.error}
                            </span>
                          )}
                        </div>
                      )}
                      {trace.status === 'timeout' && (
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded font-sans font-bold flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Time-out ({trace.durationMs}ms)</span>
                        </span>
                      )}
                      {trace.status === 'skipped' && (
                        <span className="text-slate-500 font-sans italic">Overgeslagen (uitgeschakeld)</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 3: JSON Config Inspector */}
            {playgroundTab === 'json' && simulationResult.clockConfig && (
              <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs text-indigo-200 font-mono overflow-x-auto max-h-72">
                {JSON.stringify(simulationResult.clockConfig, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 3: AI PROVIDERS CATALOG & CUSTOM PROVIDER ADDITION */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-2">
              <Server className="w-5 h-5 text-indigo-400" />
              <h3 className="text-lg font-bold text-white tracking-tight">
                Geconfigureerde AI-providers
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Beheer verbindingen naar OpenAI-compatibele servers (zoals lokale Ollama, LM Studio, vLLM, Groq of OpenAI).
              Modellen worden automatisch opgehaald via het <code>/v1/models</code> endpoint.
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
                availableModels: []
              });
              setIsProviderModalOpen(true);
            }}
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-indigo-500/20 flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Custom OpenAI-provider toevoegen</span>
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
                        {provider.type === 'gemini' ? 'Google Gemini' : 'OpenAI-compatibel'}
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
                    {provider.type !== 'gemini' && (
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
                      Beschikbare modellen ({provider.availableModels?.length || 0})
                    </span>
                    <button
                      onClick={() => handleFetchModelsForProvider(provider.id)}
                      disabled={fetchingModelsForId === provider.id}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 hover:underline disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`w-3 h-3 ${fetchingModelsForId === provider.id ? 'animate-spin' : ''}`}
                      />
                      <span>Modellen ophalen via v1/models</span>
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {(provider.availableModels || []).map((m) => (
                      <span
                        key={m}
                        className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-300 text-[11px] font-mono rounded-md"
                      >
                        {m}
                      </span>
                    ))}
                    {(!provider.availableModels || provider.availableModels.length === 0) && (
                      <span className="text-xs text-slate-500 italic">
                        Geen modellen geladen. Klik op &apos;Modellen ophalen via v1/models&apos;.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status and quick info footer */}
              <div className="mt-4 pt-3 border-t border-slate-900 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center space-x-1">
                  <Key className="w-3 h-3" />
                  <span>{provider.apiKey ? 'API-sleutel ingesteld' : 'Geen API-sleutel vereist'}</span>
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${provider.isEnabled ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 bg-slate-800'}`}>
                  {provider.isEnabled ? 'Ingeschakeld' : 'Gedeactiveerd'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: ADD / EDIT AI PROVIDER */}
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
              {editingProvider.id ? 'AI-provider bewerken' : 'Custom OpenAI-provider toevoegen'}
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Configureer een OpenAI-compatibele API-server (zoals Ollama, Groq, LM Studio, vLLM of OpenAI).
            </p>

            <form onSubmit={handleSaveProvider} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Provider-naam
                </label>
                <input
                  type="text"
                  required
                  placeholder="bijv. Lokale Ollama Server of Groq Cloud"
                  value={editingProvider.name || ''}
                  onChange={(e) => setEditingProvider({ ...editingProvider, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Provider-type
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-300">
                      Basis-URL
                    </label>
                    <button
                      type="button"
                      onClick={handleFetchModelsInModal}
                      disabled={isFetchingInModal || !editingProvider.baseUrl}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 hover:underline disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${isFetchingInModal ? 'animate-spin' : ''}`} />
                      <span>Modellen automatisch ophalen via v1/models</span>
                    </button>
                  </div>
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
                    Tip: Voor lokale Ollama is dit standaard <code>http://localhost:11434/v1</code>
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  API-sleutel <span className="text-slate-500 font-normal">(Optioneel voor lokale LLM&apos;s)</span>
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
                  Beschikbare modellen ({editingProvider.availableModels?.length || 0})
                </label>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl max-h-32 overflow-y-auto">
                  {editingProvider.availableModels && editingProvider.availableModels.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {editingProvider.availableModels.map((m) => (
                        <span
                          key={m}
                          className="px-2 py-0.5 bg-slate-900 border border-slate-700 text-indigo-300 text-[11px] font-mono rounded"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">
                      Klik hierboven op &apos;Modellen automatisch ophalen via v1/models&apos; om alle modellen in te laden.
                    </p>
                  )}
                </div>
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

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: ADD MODEL TO WATERFALL */}
      {/* ------------------------------------------------------------- */}
      {isAddModelModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
          onClick={() => setIsAddModelModalOpen(false)}
        >
          <div
            className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsAddModelModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">
              Model toevoegen aan waterfall
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Kies een model uit de beschikbare modellen en wijs de primaire provider toe.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Kies een model
                </label>
                {allAvailableModelsWithProviders.length > 0 ? (
                  <select
                    value={newModelName}
                    onChange={(e) => {
                      const selectedM = e.target.value;
                      setNewModelName(selectedM);
                      const entry = allAvailableModelsWithProviders.find((x) => x.model === selectedM);
                      if (entry && entry.providers[0]) {
                        setNewModelProviderId(entry.providers[0].id);
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-indigo-300 font-mono text-sm focus:outline-none focus:border-indigo-500"
                  >
                    {allAvailableModelsWithProviders.map((item) => (
                      <option key={item.model} value={item.model}>
                        {item.model} ({item.providers.map((p) => p.name).join(', ')})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="bijv. gpt-4o-mini of llama-3.3-70b-versatile"
                    value={newModelName}
                    onChange={(e) => setNewModelName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono text-sm focus:outline-none focus:border-indigo-500"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Primaire provider voor dit model
                </label>
                <select
                  value={newModelProviderId}
                  onChange={(e) => setNewModelProviderId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                >
                  {config?.providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.type === 'gemini' ? 'Google Gemini' : 'OpenAI-compatibel'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModelModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                >
                  Annuleren
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAddModel}
                  disabled={!newModelName || !newModelProviderId}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50"
                >
                  Toevoegen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
