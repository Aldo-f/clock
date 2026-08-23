import React, { useEffect, useState, useCallback } from 'react';
import { ClockItem } from './types';
import { PRESET_CLOCKS } from './data/presetClocks';
import { ClockRenderer } from './components/ClockRenderer';
import { ClockCustomizerModal } from './components/ClockCustomizerModal';
import { DashboardView } from './components/DashboardView';
import { LibraryView } from './components/LibraryView';
import { FullscreenClockView } from './components/FullscreenClockView';
import { LanguageSelector } from './components/LanguageSelector';
import { LanguageAutoDetectBanner } from './components/LanguageAutoDetectBanner';
import { useLanguage } from './i18n/LanguageContext';
import {
  parseCurrentRoute,
  updateBrowserUrl,
  composeDocumentTitle
} from './utils/urlRouter';
import {
  Clock,
  LayoutGrid,
  BookOpen,
  Sparkles,
  Volume2,
  VolumeX,
  Zap,
  Maximize2,
  Share2,
  Check,
  Copy
} from 'lucide-react';

export default function App() {
  const { t, language, translateClock, translateCategory } = useLanguage();
  const [activeTab, setActiveTab] = useState<'gallery' | 'dashboard' | 'library'>('gallery');
  const [personalClocks, setPersonalClocks] = useState<ClockItem[]>(() => {
    try {
      const saved = localStorage.getItem('klokken_personal_clocks');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [communityClocks, setCommunityClocks] = useState<ClockItem[]>(PRESET_CLOCKS);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState<boolean>(false);
  const [selectedClockForEdit, setSelectedClockForEdit] = useState<ClockItem | null>(null);
  const [fullscreenClock, setFullscreenClock] = useState<ClockItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const allClocksList = [...personalClocks, ...communityClocks];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Sync initial URL on mount and on popstate
  useEffect(() => {
    const handleLocationChange = () => {
      const route = parseCurrentRoute(allClocksList);
      setActiveTab(route.tab);
      if (route.fullscreenClockId) {
        const found = allClocksList.find((c) => c.id === route.fullscreenClockId);
        if (found) {
          setFullscreenClock(found);
        }
      } else {
        setFullscreenClock(null);
      }
    };

    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, [communityClocks.length, personalClocks.length]);

  // Fetch server community clocks on mount
  useEffect(() => {
    fetch('/api/community-clocks')
      .then((res) => res.json())
      .then((data) => {
        if (data.clocks && Array.isArray(data.clocks)) {
          const existingIds = new Set(PRESET_CLOCKS.map((c) => c.id));
          const customCommunity = data.clocks.filter((c: any) => !existingIds.has(c.id));
          setCommunityClocks([...customCommunity, ...PRESET_CLOCKS]);
        }
      })
      .catch(() => {});
  }, []);

  // Sync personal clocks to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('klokken_personal_clocks', JSON.stringify(personalClocks));
    } catch (e) {}
  }, [personalClocks]);

  // Keep the browser tab <title> in the active language (i18n-driven).
  // Runs on language change and whenever the active view/clock changes.
  useEffect(() => {
    document.title = composeDocumentTitle(activeTab, fullscreenClock?.name ?? null, {
      appName: t('appTitle'),
      base: t('pageTitle'),
      dashboard: t('pageTitleDashboard'),
      library: t('pageTitleLibrary')
    });
  }, [language, activeTab, fullscreenClock, t]);

  const handleTabChange = (newTab: 'gallery' | 'dashboard' | 'library') => {
    setActiveTab(newTab);
    setFullscreenClock(null);
    updateBrowserUrl(newTab, null, language);
  };

  const handleOpenFullSize = (clockToView: ClockItem) => {
    setFullscreenClock(clockToView);
    updateBrowserUrl(activeTab, clockToView, language);
  };

  const handleCloseFullSize = () => {
    setFullscreenClock(null);
    updateBrowserUrl(activeTab, null, language);
  };

  const handleSavePersonalClock = (newClock: ClockItem) => {
    setPersonalClocks((prev) => [newClock, ...prev]);
    showToast(`${newClock.name} saved!`);
  };

  const handleShareCommunityClock = async (newClock: ClockItem) => {
    setCommunityClocks((prev) => [newClock, ...prev]);
    showToast(`${newClock.name} published to community!`);

    try {
      await fetch('/api/community-clocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClock.name,
          description: newClock.description,
          author: newClock.author || 'Anoniem',
          category: newClock.category,
          config: newClock.config
        })
      });
    } catch (err) {}
  };

  const handleDeletePersonalClock = (id: string) => {
    setPersonalClocks((prev) => prev.filter((c) => c.id !== id));
  };

  const handleLikeCommunityClock = async (id: string) => {
    setCommunityClocks((prev) =>
      prev.map((c) => (c.id === id ? { ...c, likes: (c.likes || 0) + 1 } : c))
    );

    try {
      await fetch(`/api/community-clocks/${id}/like`, { method: 'POST' });
    } catch (e) {}
  };

  const handleOpenCustomizer = (clockToEdit?: ClockItem) => {
    setSelectedClockForEdit(clockToEdit || null);
    setIsCustomizerOpen(true);
  };

  const handleCopyClockLink = (e: React.MouseEvent, clockItem: ClockItem) => {
    e.stopPropagation();
    const url = `${window.location.origin}/clock/${clockItem.id}?lang=${language}`;
    navigator.clipboard.writeText(url);
    showToast(t('linkCopied'));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased flex flex-col selection:bg-sky-500 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-sky-500/50 text-white px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center space-x-2.5 animate-in fade-in slide-in-from-bottom-5">
          <Check className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          {/* Logo Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => handleTabChange('gallery')}>
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/20">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-white flex items-center space-x-1.5">
                <span>{t('appTitle')}</span>
                <span className="text-[10px] bg-sky-500/20 border border-sky-500/40 text-sky-400 font-bold px-2 py-0.5 rounded-full uppercase">
                  Studio & AI
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                {t('appSubtitle')}
              </p>
            </div>
          </div>

          {/* Navigation Tabs with deep links */}
          <nav className="flex items-center space-x-1 bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs font-bold">
            <button
              onClick={() => handleTabChange('gallery')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl transition-all ${
                activeTab === 'gallery'
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">{t('navGallery')}</span>
            </button>

            <button
              onClick={() => handleTabChange('dashboard')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">{t('navDashboard')}</span>
            </button>

            <button
              onClick={() => handleTabChange('library')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl transition-all ${
                activeTab === 'library'
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">{t('navLibrary')}</span>
            </button>
          </nav>

          {/* Right Action Buttons: Language Selector, Fullscreen, Sound, Customizer */}
          <div className="flex items-center space-x-2">
            {/* Language Selector Dropdown */}
            <LanguageSelector variant="compact" />

            {/* Quick Fullscreen Ambient trigger */}
            <button
              onClick={() => handleOpenFullSize(allClocksList[0])}
              className="p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-sky-400 hover:bg-slate-800 hover:text-white transition-all text-xs flex items-center space-x-1.5"
              title={t('viewFullscreen')}
            >
              <Maximize2 className="w-4 h-4" />
              <span className="hidden lg:inline font-bold">{t('navFullscreen')}</span>
            </button>

            {/* Sound Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2.5 rounded-xl border transition-all text-xs ${
                soundEnabled
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
              title={soundEnabled ? t('soundOff') : t('soundOn')}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* AI Customizer Launch Button */}
            <button
              onClick={() => handleOpenCustomizer()}
              className="py-2 px-3.5 bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-600 hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center space-x-1.5 active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden md:inline">{t('btnCustomizeAi')}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-8">
        {/* Gallery View */}
        {activeTab === 'gallery' && (
          <div className="space-y-8">
            {/* Intro Hero Banner */}
            <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-900 to-sky-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
              <div className="relative z-10 max-w-2xl space-y-3">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-bold uppercase tracking-wider">
                  <Zap className="w-3.5 h-3.5" />
                  <span>{t('appSubtitle')}</span>
                </div>
                <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                  {t('featuredSubtitle')}
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {t('gallerySubtitle')}
                </p>

                <div className="pt-2 flex flex-wrap gap-3">
                  <button
                    onClick={() => handleOpenCustomizer()}
                    className="py-2.5 px-5 bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center space-x-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{t('btnCustomizeAi')}</span>
                  </button>

                  <button
                    onClick={() => handleOpenFullSize(allClocksList[0])}
                    className="py-2.5 px-5 bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center space-x-2"
                  >
                    <Maximize2 className="w-4 h-4" />
                    <span>{t('viewFullscreen')}</span>
                  </button>

                  <button
                    onClick={() => handleTabChange('dashboard')}
                    className="py-2.5 px-5 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs rounded-xl border border-slate-800 transition-all flex items-center space-x-2"
                  >
                    <LayoutGrid className="w-4 h-4" />
                    <span>{t('navDashboard')}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Featured Clocks Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">{t('galleryTitle')}</h3>
                  <p className="text-xs text-slate-400">{t('gallerySubtitle')}</p>
                </div>
              </div>

              {/* Grid of Preset & Custom Clocks */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allClocksList.map((rawClock) => {
                  const clock = translateClock(rawClock);
                  return (
                    <div
                      key={clock.id}
                      className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between hover:border-slate-700 transition-all group"
                    >
                      {/* Live Clock Stage */}
                      <div className="relative w-full aspect-square bg-slate-950 border-b border-slate-800 overflow-hidden">
                        <ClockRenderer clock={clock} soundEnabled={soundEnabled} />

                        {/* Quick Action Overlay (Link & Fullscreen) */}
                        <div className="absolute top-3 right-3 flex items-center space-x-1.5 z-20">
                          <button
                            onClick={(e) => handleCopyClockLink(e, clock)}
                            className="p-2 bg-slate-900/80 hover:bg-sky-500 text-white rounded-xl backdrop-blur-md border border-white/10 shadow-lg opacity-80 hover:opacity-100 transition-all hover:scale-105 active:scale-95"
                            title={t('shareLink')}
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenFullSize(clock)}
                            className="p-2 bg-slate-900/80 hover:bg-sky-500 text-white rounded-xl backdrop-blur-md border border-white/10 shadow-lg opacity-80 hover:opacity-100 transition-all hover:scale-105 active:scale-95"
                            title={t('viewFullscreen')}
                          >
                            <Maximize2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Meta & Actions */}
                      <div className="p-5 space-y-3">
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="inline-block px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] font-bold uppercase tracking-wider">
                              {translateCategory(clock.category)}
                            </span>
                          </div>
                          <h4 className="text-base font-bold text-white group-hover:text-sky-400 transition-colors">
                            {clock.name}
                          </h4>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{clock.description}</p>
                        </div>

                        {/* Action Buttons: Full Size & AI Customizer */}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
                          <button
                            onClick={() => handleOpenFullSize(clock)}
                            className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold rounded-xl border border-slate-700 transition-all flex items-center justify-center space-x-1.5"
                          >
                            <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
                            <span>{t('navFullscreen')}</span>
                          </button>

                          <button
                            onClick={() => handleOpenCustomizer(clock)}
                            className="py-2.5 bg-sky-500/10 hover:bg-sky-500 text-sky-400 hover:text-white text-xs font-bold rounded-xl border border-sky-500/30 transition-all flex items-center justify-center space-x-1.5"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{t('edit')}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Dashboard View */}
        {activeTab === 'dashboard' && (
          <DashboardView
            allClocks={allClocksList}
            soundEnabled={soundEnabled}
            onToggleSound={() => setSoundEnabled(!soundEnabled)}
            onOpenCustomizer={handleOpenCustomizer}
            onOpenFullSize={handleOpenFullSize}
          />
        )}

        {/* Library View */}
        {activeTab === 'library' && (
          <LibraryView
            personalClocks={personalClocks}
            communityClocks={communityClocks}
            onOpenCustomizer={handleOpenCustomizer}
            onOpenFullSize={handleOpenFullSize}
            onDeletePersonal={handleDeletePersonalClock}
            onLikeCommunity={handleLikeCommunityClock}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>{t('footerRights')}</span>
          <div className="flex items-center space-x-4">
            <LanguageSelector variant="compact" />
            <span className="text-slate-600">{t('poweredBy')}</span>
          </div>
        </div>
      </footer>

      {/* Auto-detect Language Notice Banner */}
      <LanguageAutoDetectBanner />

      {/* AI Clock Customizer Modal */}
      <ClockCustomizerModal
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        initialClock={selectedClockForEdit}
        onSavePersonal={handleSavePersonalClock}
        onShareCommunity={handleShareCommunityClock}
      />

      {/* Fullscreen Full-Size Clock Viewer (F11 / Zen / Bedside Mode) */}
      {fullscreenClock && (
        <FullscreenClockView
          clock={fullscreenClock}
          allClocks={allClocksList}
          isOpen={!!fullscreenClock}
          onClose={handleCloseFullSize}
          onSelectClock={(clk) => {
            setFullscreenClock(clk);
            updateBrowserUrl(activeTab, clk);
          }}
          onOpenCustomizer={(clk) => {
            handleCloseFullSize();
            handleOpenCustomizer(clk);
          }}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled(!soundEnabled)}
        />
      )}
    </div>
  );
}
