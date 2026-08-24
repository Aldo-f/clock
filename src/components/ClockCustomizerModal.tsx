import React, { useState } from 'react';
import { ClockConfig, ClockItem } from '../types';
import { ClockRenderer } from './ClockRenderer';
import { useLanguage } from '../i18n/LanguageContext';
import { Wand2, Sparkles, Save, Share2, X, RefreshCw, Sliders, Palette, Music } from 'lucide-react';

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
  const { t, language } = useLanguage();
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
    customText: 'MY CLOCK'
  };

  const [clockName, setClockName] = useState<string>(initialClock?.name || 'My custom clock');
  const [clockDesc, setClockDesc] = useState<string>(
    initialClock?.description || 'A unique custom digital clock visualizer.'
  );
  const [config, setConfig] = useState<ClockConfig>(defaultConfig);
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'ai' | 'colors' | 'style' | 'sound'>('ai');
  const [notification, setNotification] = useState<string | null>(null);

  const getLocalizedPresetPrompts = () => {
    switch (language) {
      case 'nl':
        return [
          '🌌 Een diepe kosmische ruimteklok met vallende sterren en neonblauwe accenten',
          '🪵 Een warme houten klok met gouden roterende tandwielen en koperen leeswijzers',
          '🌊 Een rustgevende oceaanklok met stijgende bubbels en turquoise cijfers',
          '⚡ Een futuristische cyberpunk neon klok in paars, geel en magenta'
        ];
      case 'de':
        return [
          '🌌 Eine tiefe kosmische Raumzeituhr mit Sternschnuppen und neonblauen Akzenten',
          '🪵 Eine warme Holzuhr mit goldenen rotierenden Zahnrädern und Kupferzeigern',
          '🌊 Eine beruhigende Ozeanuhr mit aufsteigenden Blasen und türkisen Ziffern',
          '⚡ Eine futuristische Cyberpunk-Neon-Uhr in Violett, Gelb und Magenta'
        ];
      case 'fr':
        return [
          '🌌 Une horloge spatiale cosmique avec étoiles filantes et accents bleu néon',
          '🪵 Une horloge chaleureuse en bois avec engrenages dorés et aiguilles en cuivre',
          '🌊 Une horloge océanique apaisante avec bulles montantes et chiffres turquoise',
          '⚡ Une horloge cyberpunk futuriste au néon en violet, jaune et magenta'
        ];
      case 'es':
        return [
          '🌌 Un reloj espacial cósmico con estrellas fugaces y acentos azul neón',
          '🪵 Un cálido reloj de madera con engranajes dorados giratorios y manecillas de cobre',
          '🌊 Un relajante reloj oceánico con burbujas ascendentes y números turquesa',
          '⚡ Un reloj cyberpunk futurista en púrpura, amarillo y magenta'
        ];
      case 'en':
      default:
        return [
          '🌌 A deep cosmic space clock with shooting stars and neon blue accents',
          '🪵 A warm wooden clock with golden rotating gears and brass hands',
          '🌊 A soothing ocean clock with rising bubbles and turquoise numerals',
          '⚡ A futuristic cyberpunk neon clock in purple, yellow and magenta'
        ];
    }
  };

  const [generationInfo, setGenerationInfo] = useState<{ provider: string; model?: string; duration?: number; isFallback?: boolean } | null>(null);

  const presetPrompts = getLocalizedPresetPrompts();

  const handleGenerateAi = async (promptToUse?: string) => {
    const finalPrompt = promptToUse || aiPrompt;
    if (!finalPrompt.trim()) return;

    setIsGenerating(true);
    setNotification(t('aiGeneratingStatus'));
    setGenerationInfo(null);

    try {
      const res = await fetch('/api/generate-clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: finalPrompt, currentConfig: config, language })
      });

      const data = await res.json();
      if (data.success && data.clockConfig) {
        setConfig(data.clockConfig);
        if (data.clockConfig.name) setClockName(data.clockConfig.name);
        if (data.clockConfig.description) setClockDesc(data.clockConfig.description);

        if (data.providerUsed) {
          setGenerationInfo({
            provider: data.providerUsed,
            model: data.modelUsed,
            duration: data.durationMs,
            isFallback: data.isFallback
          });
        }

        setNotification(t('aiSuccessNotice'));
      } else {
        setNotification('⚠️ ' + (data.error || 'Error'));
      }
    } catch (err: any) {
      setNotification('⚠️ Error connecting with AI API.');
    } finally {
      setIsGenerating(false);
      setTimeout(() => setNotification(null), 5000);
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
    setNotification('✅ ' + t('modalSavedPersonal'));
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
      category: 'Community custom',
      type: 'custom_ai',
      author: 'User',
      likes: 1,
      createdAt: new Date().toISOString(),
      config
    };
    onShareCommunity(newClockItem);
    setNotification('🌐 ' + t('modalSharedCommunity'));
    setTimeout(() => {
      setNotification(null);
      onClose();
    }, 1500);
  };

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
              <h2 className="text-lg font-bold text-white">{t('modalTitle')}</h2>
              <p className="text-xs text-slate-400">{t('modalSubtitle')}</p>
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
                ● {t('modalLivePreview')}
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
                placeholder={t('modalClockNamePlaceholder')}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white font-semibold focus:outline-none focus:border-sky-500"
              />
              <input
                type="text"
                value={clockDesc}
                onChange={(e) => setClockDesc(e.target.value)}
                placeholder={t('modalClockDescPlaceholder')}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Right / Bottom: Control Tabs & Options (7 cols) */}
          <div className="lg:col-span-7 p-6 flex flex-col justify-between bg-slate-900/90 overflow-y-auto">
            {/* Control Navigation Tabs */}
            <div className="flex border-b border-slate-800 pb-3 space-x-2 text-xs font-semibold overflow-x-auto no-scrollbar shrink-0">
              <button
                onClick={() => setActiveTab('ai')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl transition-all whitespace-nowrap shrink-0 ${
                  activeTab === 'ai'
                    ? 'bg-sky-500 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white bg-slate-800/60'
                }`}
              >
                <Wand2 className="w-4 h-4" />
                <span>{t('tabAi')}</span>
              </button>

              <button
                onClick={() => setActiveTab('colors')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl transition-all whitespace-nowrap shrink-0 ${
                  activeTab === 'colors'
                    ? 'bg-sky-500 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white bg-slate-800/60'
                }`}
              >
                <Palette className="w-4 h-4" />
                <span>{t('tabColors')}</span>
              </button>

              <button
                onClick={() => setActiveTab('style')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl transition-all whitespace-nowrap shrink-0 ${
                  activeTab === 'style'
                    ? 'bg-sky-500 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white bg-slate-800/60'
                }`}
              >
                <Sliders className="w-4 h-4" />
                <span>{t('tabStyle')}</span>
              </button>

              <button
                onClick={() => setActiveTab('sound')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl transition-all whitespace-nowrap shrink-0 ${
                  activeTab === 'sound'
                    ? 'bg-sky-500 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white bg-slate-800/60'
                }`}
              >
                <Music className="w-4 h-4" />
                <span>{t('tabSound')}</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="my-4 flex-1">
              {activeTab === 'ai' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-300">
                    {t('modalAiDesc')}
                  </p>

                  <div className="space-y-2">
                    <textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder={t('modalAiPromptPlaceholder')}
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
                          <span>{t('btnGenerating')}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>{t('btnGenerateAi')}</span>
                        </>
                      )}
                    </button>

                    {generationInfo && (
                      <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-300 animate-fade-in font-mono">
                        <span className="flex items-center space-x-1">
                          <span>⚡ {generationInfo.provider}</span>
                          {generationInfo.model && <span className="text-slate-400">({generationInfo.model})</span>}
                          {generationInfo.isFallback && <span className="text-amber-400 ml-1">[Fallback]</span>}
                        </span>
                        {generationInfo.duration && (
                          <span className="text-slate-400">{generationInfo.duration}ms</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Preset Prompt Suggestions */}
                  <div className="space-y-1.5 pt-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      💡 {t('modalInspiration')}:
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
                    <label className="block font-semibold text-slate-300 mb-1">{t('colorBg')}</label>
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
                    <label className="block font-semibold text-slate-300 mb-1">{t('colorAccent')}</label>
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
                    <label className="block font-semibold text-slate-300 mb-1">{t('colorSecondary')}</label>
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
                    <label className="block font-semibold text-slate-300 mb-1">{t('colorText')}</label>
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
                    <label className="block font-semibold text-slate-300 mb-1">{t('styleParticleEffect')}</label>
                    <select
                      value={config.particleEffect}
                      onChange={(e) => setConfig({ ...config, particleEffect: e.target.value })}
                      className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none"
                    >
                      <option value="none">Geen / None</option>
                      <option value="matrix">Matrix code stream</option>
                      <option value="stars">Cosmic floating stars</option>
                      <option value="bubbles">Ocean bubbles</option>
                      <option value="steam">Steampunk steam</option>
                      <option value="fireflies">Fireflies</option>
                      <option value="sparks">Electric sparks</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">{t('styleDial')}</label>
                      <select
                        value={config.discStyle}
                        onChange={(e) => setConfig({ ...config, discStyle: e.target.value })}
                        className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none"
                      >
                        <option value="clean">Minimalist</option>
                        <option value="neon_rings">Neon rings</option>
                        <option value="brass_gears">Brass gears</option>
                        <option value="radar">Futuristic radar</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">{t('styleFont')}</label>
                      <select
                        value={config.fontFamily}
                        onChange={(e) => setConfig({ ...config, fontFamily: e.target.value })}
                        className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none"
                      >
                        <option value="monospace">Monospace (digital / tech)</option>
                        <option value="sans-serif">Sans-serif (modern / clean)</option>
                        <option value="serif">Serif (classic / elegant)</option>
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
                      <span>{t('styleGlow')}</span>
                    </label>

                    <label className="flex items-center space-x-2 text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.showSeconds}
                        onChange={(e) => setConfig({ ...config, showSeconds: e.target.checked })}
                        className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-sky-500 focus:ring-0"
                      />
                      <span>{t('styleShowSeconds')}</span>
                    </label>
                  </div>
                </div>
              )}

              {activeTab === 'sound' && (
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">{t('soundEffectType')}</label>
                    <select
                      value={config.soundType}
                      onChange={(e) => setConfig({ ...config, soundType: e.target.value })}
                      className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none"
                    >
                      <option value="none">{t('soundNone')}</option>
                      <option value="soft_tick">{t('soundSoftTick')}</option>
                      <option value="digital_beep">{t('soundDigitalBeep')}</option>
                      <option value="gear_click">{t('soundGearClick')}</option>
                      <option value="water_drop">{t('soundWaterDrop')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">{t('soundCustomInscription')}</label>
                    <input
                      type="text"
                      value={config.customText || ''}
                      onChange={(e) => setConfig({ ...config, customText: e.target.value })}
                      placeholder="e.g. 'CHRONOS 2026' or name..."
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
                <span>{t('btnSavePersonal')}</span>
              </button>

              <button
                onClick={handleShareToCommunity}
                className="w-full sm:w-1/2 py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 text-xs"
              >
                <Share2 className="w-4 h-4" />
                <span>{t('btnShareCommunity')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
