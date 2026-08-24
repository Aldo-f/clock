import React, { useEffect, useState, useCallback } from 'react';
import { ClockItem } from './types';
import { PRESET_CLOCKS } from './data/presetClocks';
import { ClockRenderer } from './components/ClockRenderer';
import { ClockCustomizerModal } from './components/ClockCustomizerModal';
import { DashboardView } from './components/DashboardView';
import { LibraryView } from './components/LibraryView';
import { AdminDashboard } from './components/AdminDashboard';
import { AuthModal } from './components/AuthModal';
import { FullscreenClockView } from './components/FullscreenClockView';
import { LanguageSelector } from './components/LanguageSelector';
import { LanguageAutoDetectBanner } from './components/LanguageAutoDetectBanner';
import { useLanguage } from './i18n/LanguageContext';
import { useAuth } from './context/AuthContext';
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
  Shield,
  User as UserIcon,
  LogIn,
  LogOut,
  Menu,
  X,
  Sliders
} from 'lucide-react';

export default function App() {
  const { t, language, translateClock, translateCategory } = useLanguage();
  const { user, isAdmin, openAuthModal, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'gallery' | 'dashboard' | 'library' | 'admin'>('gallery');
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

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
  const fetchClocks = useCallback(() => {
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

  useEffect(() => {
    fetchClocks();
  }, [fetchClocks]);

  // Sync personal clocks to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('klokken_personal_clocks', JSON.stringify(personalClocks));
    } catch (e) {}
  }, [personalClocks]);

  // Keep the browser tab <title> in the active language (i18n-driven).
  useEffect(() => {
    document.title = composeDocumentTitle(activeTab, fullscreenClock?.name ?? null, {
      appName: t('appTitle'),
      base: t('pageTitle'),
      dashboard: t('pageTitleDashboard'),
      library: t('pageTitleLibrary'),
      admin: `Admin Dashboard — ${t('appTitle')}`
    });
  }, [language, activeTab, fullscreenClock, t]);

  const handleTabChange = (newTab: 'gallery' | 'dashboard' | 'library' | 'admin') => {
    setActiveTab(newTab);
    setFullscreenClock(null);
    setIsMobileMenuOpen(false);
    updateBrowserUrl(newTab, null, language);
  };

  const handleOpenFullSize = (clockToView: ClockItem) => {
    setFullscreenClock(clockToView);
    setIsMobileMenuOpen(false);
    updateBrowserUrl(activeTab, clockToView, language);
  };

  const handleCloseFullSize = () => {
    setFullscreenClock(null);
    updateBrowserUrl(activeTab, null, language);
  };

  const handleSavePersonalClock = (newClock: ClockItem) => {
    setPersonalClocks((prev) => [newClock, ...prev]);
    showToast(`${newClock.name} opgeslagen!`);
  };

  const handleShareCommunityClock = async (newClock: ClockItem) => {
    setCommunityClocks((prev) => [newClock, ...prev]);
    showToast(`${newClock.name} gedeeld in de community!`);

    try {
      await fetch('/api/community-clocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClock.name,
          description: newClock.description,
          author: newClock.author || (user?.username ?? 'Anoniem'),
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
    setIsMobileMenuOpen(false);
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
        <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 bg-slate-900/95 border border-sky-500/50 text-white px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center space-x-2.5 animate-in fade-in slide-in-from-bottom-5 max-w-[90vw]">
          <Check className="w-4 h-4 text-sky-400 shrink-0" />
          <span className="text-xs font-bold truncate">{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 px-3 sm:px-6 lg:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Logo Brand */}
          <div
            className="flex items-center space-x-2.5 cursor-pointer select-none group"
            onClick={() => handleTabChange('gallery')}
          >
            <div className="p-2 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base sm:text-lg font-black tracking-tight text-white group-hover:text-sky-400 transition-colors">
                  {t('appTitle')}
                </span>
                <span className="text-[9px] bg-sky-500/15 border border-sky-500/30 text-sky-400 font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider hidden sm:inline-block">
                  Studio
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Center Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-900/90 p-1 rounded-2xl border border-slate-800/90 text-xs font-semibold shadow-inner">
            <button
              id="nav-tab-gallery"
              onClick={() => handleTabChange('gallery')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl transition-all ${
                activeTab === 'gallery'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>{t('navGallery')}</span>
            </button>

            <button
              id="nav-tab-dashboard"
              onClick={() => handleTabChange('dashboard')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>{t('navDashboard')}</span>
            </button>

            <button
              id="nav-tab-library"
              onClick={() => handleTabChange('library')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl transition-all ${
                activeTab === 'library'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>{t('navLibrary')}</span>
            </button>

            {/* Admin Tab */}
            {(isAdmin || user?.role === 'admin') && (
              <button
                id="nav-tab-admin"
                onClick={() => handleTabChange('admin')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl transition-all ${
                  activeTab === 'admin'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30 font-bold'
                    : 'text-indigo-400 hover:text-indigo-200 hover:bg-indigo-950/30'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin</span>
              </button>
            )}
          </nav>

          {/* Right Action Cluster */}
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            {/* Sound Toggle (Compact) */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl border transition-all text-xs flex items-center justify-center ${
                soundEnabled
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                  : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
              }`}
              title={soundEnabled ? t('soundOff') : t('soundOn')}
              aria-label={soundEnabled ? t('soundOff') : t('soundOn')}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Language Selector */}
            <LanguageSelector variant="compact" />

            {/* AI Customizer Launch Button (Desktop & Tablet) */}
            <button
              onClick={() => handleOpenCustomizer()}
              className="hidden sm:flex items-center space-x-1.5 py-1.5 px-3 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-500/20 transition-all active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t('btnCustomizeAi')}</span>
            </button>

            {/* User Profile / Login (Desktop) */}
            <div className="hidden lg:flex items-center">
              {user ? (
                <div className="flex items-center space-x-2 bg-slate-900/90 border border-slate-800 rounded-xl px-2.5 py-1 text-xs">
                  <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold">
                    {user.role === 'admin' ? (
                      <Shield className="w-3 h-3 text-indigo-400" />
                    ) : (
                      <UserIcon className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                  <span className="font-semibold text-slate-200 max-w-[100px] truncate">
                    {user.username}
                  </span>
                  <button
                    id="btn-logout"
                    onClick={logout}
                    className="p-1 text-slate-400 hover:text-red-400 transition-colors ml-0.5"
                    title="Uitloggen"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  id="btn-open-login"
                  onClick={() => openAuthModal('login')}
                  className="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-semibold rounded-xl border border-slate-800 transition-colors flex items-center space-x-1.5"
                >
                  <LogIn className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Inloggen</span>
                </button>
              )}
            </div>

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
              aria-label="Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5 text-sky-400" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Slide-Over Menu */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div
            className="absolute top-0 right-0 w-4/5 max-w-xs h-full bg-slate-900 border-l border-slate-800 p-6 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-250"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-6">
              {/* Header inside drawer */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400">
                    <Clock className="w-5 h-5" />
                  </div>
                  <span className="font-extrabold text-base text-white">{t('appTitle')}</span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User Account Section */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5">
                {user ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold shrink-0">
                        {user.role === 'admin' ? <Shield className="w-4 h-4 text-indigo-400" /> : <UserIcon className="w-4 h-4 text-slate-400" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{user.username}</p>
                        <p className="text-[10px] text-indigo-400 uppercase font-mono">{user.role}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        logout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-900 transition-colors"
                      title="Uitloggen"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      openAuthModal('login');
                    }}
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-lg shadow-indigo-500/20"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Inloggen / Registreren</span>
                  </button>
                )}
              </div>

              {/* Navigation Links */}
              <div className="space-y-1.5">
                <button
                  onClick={() => handleTabChange('gallery')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                    activeTab === 'gallery'
                      ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>{t('navGallery')}</span>
                </button>

                <button
                  onClick={() => handleTabChange('dashboard')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                    activeTab === 'dashboard'
                      ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span>{t('navDashboard')}</span>
                </button>

                <button
                  onClick={() => handleTabChange('library')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                    activeTab === 'library'
                      ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>{t('navLibrary')}</span>
                </button>

                <button
                  onClick={() => handleTabChange('admin')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                    activeTab === 'admin'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                      : 'text-indigo-300 hover:bg-slate-800'
                  }`}
                >
                  <Shield className="w-4 h-4 text-indigo-400" />
                  <span>Admin Controlepaneel</span>
                </button>
              </div>

              {/* Quick Actions in Menu */}
              <div className="pt-2 space-y-2">
                <button
                  onClick={() => handleOpenFullSize(allClocksList[0])}
                  className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 border border-slate-700"
                >
                  <Maximize2 className="w-4 h-4" />
                  <span>{t('viewFullscreen')} (Zen Mode)</span>
                </button>

                <button
                  onClick={() => handleOpenCustomizer()}
                  className="w-full py-3 px-4 bg-gradient-to-r from-sky-500 to-indigo-600 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-lg shadow-indigo-500/30"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{t('btnCustomizeAi')}</span>
                </button>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
              <span>Clocky Studio</span>
              <LanguageSelector variant="compact" />
            </div>
          </div>
        </div>
      )}

      {/* Main View Container (Safe bottom padding for mobile bottom bar) */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3.5 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 pb-24 md:pb-8">
        {/* Gallery View */}
        {activeTab === 'gallery' && (
          <div className="space-y-6 sm:space-y-8">
            {/* Intro Hero Banner */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950 border border-slate-800/90 rounded-3xl p-5 sm:p-8 shadow-2xl">
              <div className="relative z-10 max-w-2xl space-y-3 sm:space-y-4">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-[11px] sm:text-xs font-bold uppercase tracking-wider">
                  <Zap className="w-3.5 h-3.5" />
                  <span>{t('appSubtitle')}</span>
                </div>
                <h2 className="text-xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
                  {t('featuredSubtitle')}
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {t('gallerySubtitle')}
                </p>

                <div className="pt-2 flex flex-wrap gap-2.5 sm:gap-3">
                  <button
                    onClick={() => handleOpenCustomizer()}
                    className="py-2.5 px-4 sm:px-5 bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-sky-500/25 transition-all flex items-center space-x-2 active:scale-95"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{t('btnCustomizeAi')}</span>
                  </button>

                  <button
                    onClick={() => handleOpenFullSize(allClocksList[0])}
                    className="py-2.5 px-4 sm:px-5 bg-slate-800/90 hover:bg-slate-700 text-sky-300 font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center space-x-2 active:scale-95"
                  >
                    <Maximize2 className="w-4 h-4" />
                    <span>{t('viewFullscreen')}</span>
                  </button>

                  <button
                    onClick={() => handleTabChange('dashboard')}
                    className="py-2.5 px-4 sm:px-5 bg-slate-900/90 hover:bg-slate-800 text-slate-300 font-bold text-xs rounded-xl border border-slate-800 transition-all flex items-center space-x-2 active:scale-95"
                  >
                    <LayoutGrid className="w-4 h-4" />
                    <span>{t('navDashboard')}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Featured Clocks Section */}
            <div id="featured-clocks-section" className="space-y-4 sm:space-y-6">
              <div id="featured-clocks-header" className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800/60">
                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                    <span>{t('galleryTitle')}</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold border border-slate-700/60">
                      {allClocksList.length}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">{t('gallerySubtitle')}</p>
                </div>
              </div>

              {/* Grid of Preset & Custom Clocks */}
              <div id="clocks-gallery-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {allClocksList.map((rawClock) => {
                  const clock = translateClock(rawClock);
                  return (
                    <div
                      key={clock.id}
                      id={`clock-card-${clock.id}`}
                      className="bg-slate-900/90 border border-slate-800/90 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-sky-500/5 hover:border-sky-500/40 flex flex-col justify-between transition-all duration-300 group"
                    >
                      {/* Live Clock Stage */}
                      <div className="relative w-full aspect-square bg-slate-950/80 border-b border-slate-800/80 overflow-hidden">
                        <ClockRenderer clock={clock} soundEnabled={soundEnabled} />

                        {/* Quick Action Overlay (Link & Fullscreen) */}
                        <div className="absolute top-3 right-3 flex items-center space-x-1.5 z-20">
                          <button
                            id={`btn-share-${clock.id}`}
                            onClick={(e) => handleCopyClockLink(e, clock)}
                            className="p-2 bg-slate-900/80 hover:bg-sky-500 text-slate-300 hover:text-white rounded-xl backdrop-blur-md border border-slate-700/60 shadow-lg transition-all hover:scale-105 active:scale-95"
                            title={t('shareLink')}
                            aria-label={t('shareLink')}
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                          <button
                            id={`btn-fullscreen-${clock.id}`}
                            onClick={() => handleOpenFullSize(clock)}
                            className="p-2 bg-slate-900/80 hover:bg-sky-500 text-slate-300 hover:text-white rounded-xl backdrop-blur-md border border-slate-700/60 shadow-lg transition-all hover:scale-105 active:scale-95"
                            title={t('viewFullscreen')}
                            aria-label={t('viewFullscreen')}
                          >
                            <Maximize2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Meta & Actions */}
                      <div className="p-4 sm:p-5 space-y-3 sm:space-y-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-block px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] font-bold uppercase tracking-wider">
                              {translateCategory(clock.category)}
                            </span>
                            {clock.author && (
                              <span className="text-[11px] text-slate-400 truncate max-w-[120px]">
                                {clock.author}
                              </span>
                            )}
                          </div>
                          <h4 className="text-base font-bold text-white group-hover:text-sky-400 transition-colors">
                            {clock.name}
                          </h4>
                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{clock.description}</p>
                        </div>

                        {/* Action Buttons: Full Size & AI Customizer */}
                        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800/80">
                          <button
                            id={`btn-view-${clock.id}`}
                            onClick={() => handleOpenFullSize(clock)}
                            className="py-2.5 px-3 bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold rounded-xl border border-slate-700/80 transition-all flex items-center justify-center space-x-1.5 active:scale-98"
                          >
                            <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
                            <span>{t('navFullscreen')}</span>
                          </button>

                          <button
                            id={`btn-edit-${clock.id}`}
                            onClick={() => handleOpenCustomizer(clock)}
                            className="py-2.5 px-3 bg-sky-500/10 hover:bg-sky-500 text-sky-400 hover:text-white text-xs font-bold rounded-xl border border-sky-500/30 transition-all flex items-center justify-center space-x-1.5 active:scale-98"
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

        {/* Admin Dashboard View */}
        {activeTab === 'admin' && (
          <AdminDashboard
            presetClocks={PRESET_CLOCKS}
            onClocksUpdated={fetchClocks}
            onNavigateHome={() => handleTabChange('gallery')}
          />
        )}
      </main>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/90 px-2 py-1.5 flex items-center justify-around shadow-2xl safe-area-bottom">
        <button
          onClick={() => handleTabChange('gallery')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
            activeTab === 'gallery'
              ? 'text-sky-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">{t('navGallery')}</span>
        </button>

        <button
          onClick={() => handleTabChange('dashboard')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
            activeTab === 'dashboard'
              ? 'text-sky-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutGrid className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">{t('navDashboard')}</span>
        </button>

        {/* Highlighted Center Create Button */}
        <button
          onClick={() => handleOpenCustomizer()}
          className="flex flex-col items-center justify-center -mt-4 bg-gradient-to-tr from-sky-500 to-indigo-600 text-white p-2.5 rounded-full shadow-lg shadow-sky-500/30 active:scale-95 transition-transform border-2 border-slate-950"
          title={t('btnCustomizeAi')}
        >
          <Sparkles className="w-5 h-5" />
          <span className="sr-only">Maken</span>
        </button>

        <button
          onClick={() => handleTabChange('library')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
            activeTab === 'library'
              ? 'text-sky-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">{t('navLibrary')}</span>
        </button>

        {(isAdmin || user?.role === 'admin') ? (
          <button
            onClick={() => handleTabChange('admin')}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
              activeTab === 'admin'
                ? 'text-indigo-400 font-bold'
                : 'text-slate-400 hover:text-indigo-300'
            }`}
          >
            <Shield className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Admin</span>
          </button>
        ) : (
          <button
            onClick={() => openAuthModal('login')}
            className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-slate-400 hover:text-slate-200"
          >
            <UserIcon className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">{user ? 'Account' : 'Inloggen'}</span>
          </button>
        )}
      </nav>

      {/* Footer */}
      <footer className="hidden md:block border-t border-slate-800/80 bg-slate-950 py-6 px-4 text-center text-xs text-slate-500">
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

      {/* Auth Modal (Login / Register) */}
      <AuthModal />
    </div>
  );
}

