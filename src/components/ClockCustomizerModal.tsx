import React, { useState } from 'react';
import { ClockConfig, ClockItem } from '../types';
import { ClockRenderer } from './ClockRenderer';
import { Wand2, Sparkles, Save, Share2, X, RefreshCw, Sliders, Palette, Music, Type } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialClock?: ClockItem | null;
  onSavePersonal: (clock: ClockItem) => void;
  onShareCommunity: (clock: ClockItem) => void;
}

export const ClockCustomizerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  initialClock,
  onSavePersonal,
  onShareCommunity
}) => {
  if (!isOpen) return null;

  const defaultConfig: ClockConfig = initialClock?.config || {
    style: 'cyberpunk',
    bgColor: '#0f172a',
    accentColor: '#38bdf8',
    secondaryColor: '#f43f5e',
    textColor: '#f8fafc',
    fontFamily: 'monospace',
    showSeconds: true,
    glowEffect: true,
    particleEffect: 'stars',
    discStyle: 'neon_rings',
    handStyle: 'laser_beam',
    soundType: 'soft_tick',
    customText: 'MIJN UNIEKE KLOK'
  };

  const [clockName, setClockName] = useState<string>(initialClock?.name || 'Mijn Aangepaste Klok');
  const [clockDesc, setClockDesc] = useState<string>(
    initialClock?.description || 'Een uniek digitaal klokontwerp op maat gemaakt.'
  );
  const [config, setConfig] = useState<ClockConfig>(defaultConfig);
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'ai' | 'colors' | 'style' | 'sound'>('ai');
  const [notification, setNotification] = useState<string | null>(null);

  const presetPrompts = [
    '🌌 Een diepe kosmische ruimteklok met vallende sterren en neonblauwe accenten',
    '🪵 Een warme houten klok met gouden roterende tandwielen en koperen leeswijzers',
    '🌊 Een rustgevende oceaanklok met stijgende bubbels en turquoise cijfers',
    '⚡ Een futuristische cyberpunk neon klok in paars, geel en magenta'
  ];

  const handleGenerateAi = async (promptToUse?: string) => {
    const finalPrompt = promptToUse || aiPrompt;
    if (!finalPrompt.trim()) return;

    setIsGenerating(true);
    setNotification('AI ontwerpt jouw unieke klok met Gemini...');

    try {
      const res = await fetch('/api/generate-clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: finalPrompt, currentConfig: config })
      });

      const data = await res.json();
      if (data.success && data.clockConfig) {
        setConfig(data.clockConfig);
        if (data.clockConfig.name) setClockName(data.clockConfig.name);
        if (data.clockConfig.description) setClockDesc(data.clockConfig.description);
        
        if (data.fallbackNotice) {
          setNotification('✨ Uniek klokontwerp gegenereerd op basis van jouw trefwoorden!');
        } else {
          setNotification('✨ Nieuw klokontwerp succesvol gegenereerd met Gemini AI!');
        }
      } else {
        setNotification('⚠️ Fout bij het genereren: ' + (data.error || 'Probeer opnieuw.'));
      }
    } catch (err: any) {
      setNotification('⚠️ Netwerkfout bij communicatie met AI.');
    } finally {
      setIsGenerating(false);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleSaveToPersonal = () => {
    const newClockItem: ClockItem = {
      id: 'pers-' + Date.now(),
      name: clockName,
      description: clockDesc,
      category: 'Persoonlijk',
      type: 'custom_ai',
      createdAt: new Date().toISOString(),
      config
    };
    onSavePersonal(newClockItem);
    setNotification('✅ Opslagen in jouw persoonlijke bibliotheek!');
    setTimeout(() => {
      setNotification(null);
      onClose();
    }, 1500);
  };

  const handleShareToCommunity = () => {
    const newClockItem: ClockItem = {
      id: 'comm-' + Date.now(),
      name: clockName,
      description: clockDesc,
      category: 'Community Custom',
      type: 'custom_ai',
      author: 'Mijn Account',
      likes: 1,
      createdAt: new Date().toISOString(),
      config
    };
    onShareCommunity(newClockItem);
    setNotification('🌐 Gedeeld in de algemene bibliotheek!');
    setTimeout(() => {
      setNotification(null);
      onClose();
    }, 1500);
  };

  // Temporary Preview Clock Item
  const previewClockItem: ClockItem = {
    id: 'preview',
    name: clockName,
    description: clockDesc,
    category: 'Preview',
    type: 'custom_ai',
    config
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-sky-500/20 border border-sky-500/40 text-sky-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">AI Klok Customizer & Generator</h2>
              <p className="text-xs text-slate-400">Vraag je eigen klok aan of pas een bestaand ontwerp aan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notification Banner */}
        {notification && (
          <div className="bg-sky-500/20 border-b border-sky-500/40 px-4 py-2 text-xs font-semibold text-sky-300 flex items-center justify-between">
            <span>{notification}</span>
          </div>
        )}

        {/* Modal Body: Grid Preview + Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
          {/* Left / Top: Live Preview Area (5 cols) */}
          <div className="lg:col-span-5 p-6 bg-slate-950/80 border-r border-slate-800 flex flex-col justify-between items-center">
            <div className="w-full text-center mb-2">
              <span className="text-[10px] uppercase font-mono tracking-widest text-sky-400 font-bold">
                ● LIVE VOORVERTOON
              </span>
            </div>

            {/* Live Clock Frame */}
            <div className="w-full aspect-square max-w-xs rounded-2xl overflow-hidden shadow-2xl border border-slate-700/50 my-auto">
              <ClockRenderer clock={previewClockItem} soundEnabled={true} />
            </div>

            {/* Clock Name & Details Inputs */}
            <div className="w-full mt-4 space-y-2">
              <input
                type="text"
                value={clockName}
                onChange={(e) => setClockName(e.target.value)}
                placeholder="Naam van jouw klok..."
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white font-semibold focus:outline-none focus:border-sky-500"
              />
              <input
                type="text"
                value={clockDesc}
                onChange={(e) => setClockDesc(e.target.value)}
                placeholder="Korte beschrijving..."
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Right / Bottom: Control Tabs & Options (7 cols) */}
          <div className="lg:col-span-7 p-6 flex flex-col justify-between bg-slate-900/90 overflow-y-auto">
            {/* Control Navigation Tabs */}
            <div className="flex border-b border-slate-800 pb-3 space-x-2 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('ai')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl transition-all ${
                  activeTab === 'ai'
                    ? 'bg-sky-500 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white bg-slate-800/60'
                }`}
              >
                <Wand2 className="w-4 h-4" />
                <span>AI Generator</span>
              </button>

              <button
                onClick={() => setActiveTab('colors')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl transition-all ${
                  activeTab === 'colors'
                    ? 'bg-sky-500 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white bg-slate-800/60'
                }`}
              >
                <Palette className="w-4 h-4" />
                <span>Kleuren</span>
              </button>

              <button
                onClick={() => setActiveTab('style')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl transition-all ${
                  activeTab === 'style'
                    ? 'bg-sky-500 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white bg-slate-800/60'
                }`}
              >
                <Sliders className="w-4 h-4" />
                <span>Stijl & Effecten</span>
              </button>

              <button
                onClick={() => setActiveTab('sound')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl transition-all ${
                  activeTab === 'sound'
                    ? 'bg-sky-500 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white bg-slate-800/60'
                }`}
              >
                <Music className="w-4 h-4" />
                <span>Geluid & Inscriptie</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="my-4 flex-1">
              {activeTab === 'ai' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-300">
                    Beschrijf jouw gewenste klok in het Nederlands. Gemini AI genereert automatisch de stijl, kleuren, wijzers en deeltjes-effecten!
                  </p>

                  <div className="space-y-2">
                    <textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="Bijvoorbeeld: 'Maak een magische oceaanklok in diepblauw met stijgende bubbels en lichtgevende turquoise cijfers...'"
                      rows={3}
                      className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 resize-none"
                    />

                    <button
                      onClick={() => handleGenerateAi()}
                      disabled={isGenerating || !aiPrompt.trim()}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-600 hover:from-sky-400 hover:to-purple-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 text-sm"
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>AI Genereert Klok...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Genereer met Gemini AI</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Preset Prompt Suggestions */}
                  <div className="space-y-1.5 pt-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      💡 Inspiratie voorbeelden:
                    </label>
                    <div className="space-y-1.5">
                      {presetPrompts.map((p, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setAiPrompt(p);
                            handleGenerateAi(p);
                          }}
                          className="w-full text-left p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-xs text-slate-200 hover:text-sky-300 transition-all"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'colors' && (
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Achtergrondkleur</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={config.bgColor}
                        onChange={(e) => setConfig({ ...config, bgColor: e.target.value })}
                        className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
                      />
                      <input
                        type="text"
                        value={config.bgColor}
                        onChange={(e) => setConfig({ ...config, bgColor: e.target.value })}
                        className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl font-mono text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Accentkleur (Primaire Wijzer)</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={config.accentColor}
                        onChange={(e) => setConfig({ ...config, accentColor: e.target.value })}
                        className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
                      />
                      <input
                        type="text"
                        value={config.accentColor}
                        onChange={(e) => setConfig({ ...config, accentColor: e.target.value })}
                        className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl font-mono text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Secundaire Kleur</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={config.secondaryColor}
                        onChange={(e) => setConfig({ ...config, secondaryColor: e.target.value })}
                        className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
                      />
                      <input
                        type="text"
                        value={config.secondaryColor}
                        onChange={(e) => setConfig({ ...config, secondaryColor: e.target.value })}
                        className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl font-mono text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Tekst / Cijfers Kleur</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={config.textColor}
                        onChange={(e) => setConfig({ ...config, textColor: e.target.value })}
                        className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
                      />
                      <input
                        type="text"
                        value={config.textColor}
                        onChange={(e) => setConfig({ ...config, textColor: e.target.value })}
                        className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl font-mono text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'style' && (
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Deeltjes- & Achtergrond Effect</label>
                    <select
                      value={config.particleEffect}
                      onChange={(e) => setConfig({ ...config, particleEffect: e.target.value })}
                      className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none"
                    >
                      <option value="none">Geen Deeltjes</option>
                      <option value="matrix">Matrix Digital Code Stream</option>
                      <option value="stars">Kosmische Zwevende Sterren</option>
                      <option value="bubbles">Oceaan Bubbels</option>
                      <option value="steam">Steampunk Stoom</option>
                      <option value="fireflies">Vuurvliegjes</option>
                      <option value="sparks">Elektrische Vonken</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">Schijf / Wijzerplaat Stijl</label>
                      <select
                        value={config.discStyle}
                        onChange={(e) => setConfig({ ...config, discStyle: e.target.value })}
                        className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none"
                      >
                        <option value="clean">Strak & Minimalistisch</option>
                        <option value="neon_rings">Neon Ringen</option>
                        <option value="brass_gears">Koperen Tandwielen</option>
                        <option value="radar">Futuristische Radar</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">Lettertype</label>
                      <select
                        value={config.fontFamily}
                        onChange={(e) => setConfig({ ...config, fontFamily: e.target.value })}
                        className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none"
                      >
                        <option value="monospace">Monospace (Digitaal / Tech)</option>
                        <option value="sans-serif">Sans-Serif (Modern / Clean)</option>
                        <option value="serif">Serif (Klassiek / Elegant)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <label className="flex items-center space-x-2 text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.glowEffect}
                        onChange={(e) => setConfig({ ...config, glowEffect: e.target.checked })}
                        className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-sky-500 focus:ring-0"
                      />
                      <span>Lichtgevend Neon Gloei-effect (Glow)</span>
                    </label>

                    <label className="flex items-center space-x-2 text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.showSeconds}
                        onChange={(e) => setConfig({ ...config, showSeconds: e.target.checked })}
                        className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-sky-500 focus:ring-0"
                      />
                      <span>Toon Seconden</span>
                    </label>
                  </div>
                </div>
              )}

              {activeTab === 'sound' && (
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Klok Geluidstype (Web Audio)</label>
                    <select
                      value={config.soundType}
                      onChange={(e) => setConfig({ ...config, soundType: e.target.value })}
                      className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none"
                    >
                      <option value="none">Stil (Geen geluid)</option>
                      <option value="soft_tick">Zachte Mechanische Tik</option>
                      <option value="digital_beep">Digitale Beep</option>
                      <option value="gear_click">Koperen Tandwiel Klik</option>
                      <option value="water_drop">Waterdruppel</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Aangepaste Inscriptie / Tekst op Klok</label>
                    <input
                      type="text"
                      value={config.customText || ''}
                      onChange={(e) => setConfig({ ...config, customText: e.target.value })}
                      placeholder="Bijv. 'CHRONOS 2026' of jouw naam..."
                      className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons: Save to Personal & Share to Community */}
            <div className="flex flex-col sm:flex-row items-center gap-2 border-t border-slate-800 pt-4">
              <button
                onClick={handleSaveToPersonal}
                className="w-full sm:w-1/2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 text-xs"
              >
                <Save className="w-4 h-4" />
                <span>Opslaan in Mijn Bibliotheek</span>
              </button>

              <button
                onClick={handleShareToCommunity}
                className="w-full sm:w-1/2 py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 text-xs"
              >
                <Share2 className="w-4 h-4" />
                <span>Delen in Algemene Bibliotheek</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
