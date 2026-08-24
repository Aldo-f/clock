import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ClockItem, ClockConfig, ALLOWED_STYLES, ALLOWED_FONT_FAMILIES, ALLOWED_PARTICLE_EFFECTS, ALLOWED_DISC_STYLES, ALLOWED_HAND_STYLES, ALLOWED_SOUND_TYPES } from '../../types';
import { ClockRenderer } from '../ClockRenderer';
import {
  Clock,
  Search,
  Plus,
  Edit3,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Heart,
  Palette,
  Eye,
  Code,
  X,
  RefreshCw,
  Sparkles,
  Sliders
} from 'lucide-react';

interface ClockManagementProps {
  presetClocks: ClockItem[];
  onClocksUpdated?: () => void;
}

export const ClockManagement: React.FC<ClockManagementProps> = ({
  presetClocks,
  onClocksUpdated
}) => {
  const { authFetch } = useAuth();
  const [clocks, setClocks] = useState<ClockItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingClock, setEditingClock] = useState<Partial<ClockItem> | null>(null);
  const [editorTab, setEditorTab] = useState<'visual' | 'json' | 'preview'>('visual');
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadClocks = async () => {
    try {
      setIsLoading(true);
      const res = await authFetch('/api/admin/clocks');
      if (!res.ok) throw new Error('Kon klokken niet laden.');
      const data = await res.json();
      
      // Combine built-in presets with community/custom clocks, deduplicated by ID
      const communityList: ClockItem[] = data.clocks || [];
      const commMap = new Map(communityList.map(c => [c.id, c]));
      
      const merged: ClockItem[] = [
        ...presetClocks.map(p => commMap.get(p.id) || p),
        ...communityList.filter(c => !presetClocks.some(p => p.id === c.id))
      ];

      setClocks(merged);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Fout bij laden van klokken.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClocks();
  }, []);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  // Filter clocks
  const filteredClocks = clocks.filter((clock) => {
    const matchesSearch =
      clock.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clock.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clock.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || clock.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...Array.from(new Set(clocks.map((c) => c.category)))];

  const handleOpenEdit = (clock: ClockItem) => {
    setEditingClock({ ...clock, config: { ...clock.config } });
    setJsonText(JSON.stringify(clock, null, 2));
    setJsonError(null);
    setEditorTab('visual');
    setIsEditModalOpen(true);
  };

  const handleOpenCreate = () => {
    const newClock: ClockItem = {
      id: 'custom-' + Date.now(),
      name: 'Nieuwe Aangepaste Klok',
      description: 'Een uniek ontworpen klok met custom instellingen.',
      category: 'Custom AI',
      type: 'custom_ai',
      author: 'Admin',
      likes: 1,
      config: {
        style: 'neon',
        bgColor: '#0d0221',
        accentColor: '#00f6ff',
        secondaryColor: '#ff0055',
        textColor: '#ffffff',
        fontFamily: 'monospace',
        showSeconds: true,
        glowEffect: true,
        particleEffect: 'matrix',
        discStyle: 'neon_rings',
        handStyle: 'laser_beam',
        soundType: 'digital_beep',
        customText: 'ADMIN CHRONOS'
      }
    };
    setEditingClock(newClock);
    setJsonText(JSON.stringify(newClock, null, 2));
    setJsonError(null);
    setEditorTab('visual');
    setIsEditModalOpen(true);
  };

  const handleSaveClock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClock || !editingClock.name || !editingClock.config) return;

    let finalClock = editingClock;
    if (editorTab === 'json') {
      try {
        const parsed = JSON.parse(jsonText);
        finalClock = parsed;
      } catch (err: any) {
        setJsonError('Ongeldige JSON syntax.');
        return;
      }
    }

    try {
      setIsSaving(true);
      const isExisting = clocks.some((c) => c.id === finalClock.id);
      const url = isExisting
        ? `/api/admin/clocks/${finalClock.id}`
        : '/api/admin/clocks';
      const method = isExisting ? 'PUT' : 'POST';

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalClock)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Kon klok niet opslaan.');
      }

      showNotification('success', `Klok "${finalClock.name}" succesvol bijgewerkt!`);
      setIsEditModalOpen(false);
      setEditingClock(null);
      loadClocks();
      onClocksUpdated?.();
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClock = async (id: string, name: string) => {
    if (!window.confirm(`Weet je zeker dat je klok "${name}" wilt verwijderen?`)) return;

    try {
      const res = await authFetch(`/api/admin/clocks/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Kon klok niet verwijderen.');
      showNotification('success', `Klok "${name}" verwijderd.`);
      loadClocks();
      onClocksUpdated?.();
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
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

      {/* Header with Search and Create */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-white tracking-tight">
              Klokken Beheer (Alle Klokken Wijzigen)
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Beheer, bewerk visualisaties, wijzig kleurenpaletten en configureer alle klokken in de studio.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Zoek op naam of ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl focus:outline-none focus:border-indigo-500 w-48 sm:w-64"
            />
          </div>

          {/* Create Button */}
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-indigo-500/20 flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Nieuwe Klok Toevoegen</span>
          </button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              selectedCategory === cat
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {cat === 'all' ? 'Alle categorieën' : cat}
          </button>
        ))}
      </div>

      {/* Clocks Table / Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12 text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mr-2" />
          <span>Klokken inladen...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClocks.map((clock) => (
            <div
              key={clock.id}
              className="p-5 bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl shadow-lg transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center space-x-1.5">
                      <span>{clock.name}</span>
                    </h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-slate-800 text-indigo-300 border border-indigo-500/20 mt-1 inline-block">
                      {clock.category}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleOpenEdit(clock)}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                      title="Klok bewerken"
                    >
                      <Edit3 className="w-4 h-4 text-indigo-400" />
                    </button>
                    <button
                      onClick={() => handleDeleteClock(clock.id, clock.name)}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Klok verwijderen"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-400 mt-2 line-clamp-2">{clock.description}</p>

                {/* Visual Palette Preview Bar */}
                <div className="mt-3 flex items-center space-x-2">
                  <div
                    className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                    style={{ backgroundColor: clock.config.bgColor }}
                    title={`Achtergrond: ${clock.config.bgColor}`}
                  />
                  <div
                    className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                    style={{ backgroundColor: clock.config.accentColor }}
                    title={`Accent: ${clock.config.accentColor}`}
                  />
                  <div
                    className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                    style={{ backgroundColor: clock.config.secondaryColor }}
                    title={`Secundair: ${clock.config.secondaryColor}`}
                  />
                  <span className="text-[11px] font-mono text-slate-500">
                    {clock.config.style} &bull; {clock.config.particleEffect}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                <span className="font-mono text-[11px]">ID: {clock.id}</span>
                <span className="flex items-center space-x-1 text-slate-400">
                  <Heart className="w-3.5 h-3.5 text-rose-500" />
                  <span>{clock.likes || 0}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: EDIT / CREATE CLOCK */}
      {/* ------------------------------------------------------------- */}
      {isEditModalOpen && editingClock && editingClock.config && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in"
          onClick={() => setIsEditModalOpen(false)}
        >
          <div
            className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-8 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="mb-4">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <Sliders className="w-5 h-5 text-indigo-400" />
                <span>Klok Aanpassen: {editingClock.name}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Pas visuele variabelen, kleurenschema's en effecten aan voor deze klok.
              </p>
            </div>

            {/* Tabs */}
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-3 mb-4">
              <button
                type="button"
                onClick={() => setEditorTab('visual')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1.5 ${
                  editorTab === 'visual'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Visuele Editor</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setJsonText(JSON.stringify(editingClock, null, 2));
                  setEditorTab('json');
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1.5 ${
                  editorTab === 'json'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>JSON Editor</span>
              </button>
              <button
                type="button"
                onClick={() => setEditorTab('preview')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1.5 ${
                  editorTab === 'preview'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Live Preview</span>
              </button>
            </div>

            {/* Content Body */}
            <form onSubmit={handleSaveClock} className="flex-1 overflow-y-auto pr-1 space-y-4">
              {editorTab === 'visual' && (
                <div className="space-y-4">
                  {/* General Metadata */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Kloknaam
                      </label>
                      <input
                        type="text"
                        required
                        value={editingClock.name || ''}
                        onChange={(e) => setEditingClock({ ...editingClock, name: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Categorie
                      </label>
                      <input
                        type="text"
                        value={editingClock.category || ''}
                        onChange={(e) =>
                          setEditingClock({ ...editingClock, category: e.target.value })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Beschrijving
                    </label>
                    <textarea
                      rows={2}
                      value={editingClock.description || ''}
                      onChange={(e) =>
                        setEditingClock({ ...editingClock, description: e.target.value })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Colors Section */}
                  <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                      Kleurenpalet
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          Achtergrondkleur
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="color"
                            value={editingClock.config.bgColor || '#0d0221'}
                            onChange={(e) =>
                              setEditingClock({
                                ...editingClock,
                                config: { ...editingClock.config!, bgColor: e.target.value }
                              })
                            }
                            className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                          />
                          <input
                            type="text"
                            value={editingClock.config.bgColor || ''}
                            onChange={(e) =>
                              setEditingClock({
                                ...editingClock,
                                config: { ...editingClock.config!, bgColor: e.target.value }
                              })
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1 text-white font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Accentkleur</label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="color"
                            value={editingClock.config.accentColor || '#00f6ff'}
                            onChange={(e) =>
                              setEditingClock({
                                ...editingClock,
                                config: { ...editingClock.config!, accentColor: e.target.value }
                              })
                            }
                            className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                          />
                          <input
                            type="text"
                            value={editingClock.config.accentColor || ''}
                            onChange={(e) =>
                              setEditingClock({
                                ...editingClock,
                                config: { ...editingClock.config!, accentColor: e.target.value }
                              })
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1 text-white font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Secundair</label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="color"
                            value={editingClock.config.secondaryColor || '#ff0055'}
                            onChange={(e) =>
                              setEditingClock({
                                ...editingClock,
                                config: { ...editingClock.config!, secondaryColor: e.target.value }
                              })
                            }
                            className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                          />
                          <input
                            type="text"
                            value={editingClock.config.secondaryColor || ''}
                            onChange={(e) =>
                              setEditingClock({
                                ...editingClock,
                                config: { ...editingClock.config!, secondaryColor: e.target.value }
                              })
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1 text-white font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Tekstkleur</label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="color"
                            value={editingClock.config.textColor || '#ffffff'}
                            onChange={(e) =>
                              setEditingClock({
                                ...editingClock,
                                config: { ...editingClock.config!, textColor: e.target.value }
                              })
                            }
                            className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                          />
                          <input
                            type="text"
                            value={editingClock.config.textColor || ''}
                            onChange={(e) =>
                              setEditingClock({
                                ...editingClock,
                                config: { ...editingClock.config!, textColor: e.target.value }
                              })
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1 text-white font-mono text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Effects & Selectors */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Visuele Stijl
                      </label>
                      <select
                        value={editingClock.config.style || 'neon'}
                        onChange={(e) =>
                          setEditingClock({
                            ...editingClock,
                            config: { ...editingClock.config!, style: e.target.value }
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                      >
                        {ALLOWED_STYLES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Deeltjeseffect (Particles)
                      </label>
                      <select
                        value={editingClock.config.particleEffect || 'none'}
                        onChange={(e) =>
                          setEditingClock({
                            ...editingClock,
                            config: { ...editingClock.config!, particleEffect: e.target.value }
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                      >
                        {ALLOWED_PARTICLE_EFFECTS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Geluidstype
                      </label>
                      <select
                        value={editingClock.config.soundType || 'none'}
                        onChange={(e) =>
                          setEditingClock({
                            ...editingClock,
                            config: { ...editingClock.config!, soundType: e.target.value }
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                      >
                        {ALLOWED_SOUND_TYPES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Inscriptie Tekst op Klokplaat
                    </label>
                    <input
                      type="text"
                      placeholder="bijv. CHRONOS of TEMPORE"
                      value={editingClock.config.customText || ''}
                      onChange={(e) =>
                        setEditingClock({
                          ...editingClock,
                          config: { ...editingClock.config!, customText: e.target.value }
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex items-center space-x-6 pt-2">
                    <label className="flex items-center space-x-2 text-xs font-medium text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingClock.config.showSeconds ?? true}
                        onChange={(e) =>
                          setEditingClock({
                            ...editingClock,
                            config: { ...editingClock.config!, showSeconds: e.target.checked }
                          })
                        }
                        className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-700"
                      />
                      <span>Seconden tonen</span>
                    </label>

                    <label className="flex items-center space-x-2 text-xs font-medium text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingClock.config.glowEffect ?? true}
                        onChange={(e) =>
                          setEditingClock({
                            ...editingClock,
                            config: { ...editingClock.config!, glowEffect: e.target.checked }
                          })
                        }
                        className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-700"
                      />
                      <span>Gloeieffect (Glow) inschakelen</span>
                    </label>
                  </div>
                </div>
              )}

              {editorTab === 'json' && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-400">
                    Pas het volledige configuratie-object direct aan in JSON:
                  </p>
                  <textarea
                    rows={14}
                    value={jsonText}
                    onChange={(e) => {
                      setJsonText(e.target.value);
                      setJsonError(null);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-emerald-300 font-mono text-xs focus:outline-none focus:border-indigo-500"
                  />
                  {jsonError && <p className="text-xs text-red-400">{jsonError}</p>}
                </div>
              )}

              {editorTab === 'preview' && (
                <div className="flex flex-col items-center justify-center p-6 bg-slate-950 rounded-2xl border border-slate-800 min-h-[300px]">
                  <div className="w-full max-w-sm aspect-square flex items-center justify-center">
                    <ClockRenderer clock={editingClock as ClockItem} />
                  </div>
                </div>
              )}

              {/* Submit / Cancel Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Klok Opslaan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
