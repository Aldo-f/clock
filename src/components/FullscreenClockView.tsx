import React, { useState, useEffect, useRef } from 'react';
import { ClockItem } from '../types';
import { ClockRenderer } from './ClockRenderer';
import { TIME_ZONES, getZonedDate, formatTimeDisplay, formatDateDutch } from '../utils/timeUtils';
import {
  Maximize2,
  Minimize2,
  X,
  Volume2,
  VolumeX,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Clock,
  Globe,
  Sliders,
  Camera,
  RotateCcw,
  Eye,
  EyeOff,
  HelpCircle,
  Play,
  Pause
} from 'lucide-react';

interface Props {
  clock: ClockItem;
  allClocks: ClockItem[];
  isOpen: boolean;
  onClose: () => void;
  onSelectClock: (clock: ClockItem) => void;
  onOpenCustomizer: (clock: ClockItem) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const FullscreenClockView: React.FC<Props> = ({
  clock,
  allClocks,
  isOpen,
  onClose,
  onSelectClock,
  onOpenCustomizer,
  soundEnabled,
  onToggleSound
}) => {
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState<boolean>(false);
  const [selectedTimeZone, setSelectedTimeZone] = useState<string>('local');
  const [format24h, setFormat24h] = useState<boolean>(true);
  const [soundVolume, setSoundVolume] = useState<number>(0.3);
  const [brightness, setBrightness] = useState<number>(100); // 10% to 100%
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const [scrubMinutes, setScrubMinutes] = useState<number>(720); // 0 to 1439 (12:00)
  const [showControls, setShowControls] = useState<boolean>(true);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState<boolean>(false);
  const [showTzPicker, setShowTzPicker] = useState<boolean>(false);
  const [showSoundMenu, setShowSoundMenu] = useState<boolean>(false);
  const [customSoundType, setCustomSoundType] = useState<string>(clock.config.soundType || 'soft_tick');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  
  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Sync customSoundType when clock changes
  useEffect(() => {
    if (clock.config.soundType) {
      setCustomSoundType(clock.config.soundType);
    }
  }, [clock]);

  // Keep live time updated
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen to browser fullscreen changes
  useEffect(() => {
    const handleFsChange = () => {
      setIsBrowserFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Auto-hide controls after 3.5 seconds of inactivity
  const resetHideTimer = () => {
    setShowControls(true);
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    hideControlsTimerRef.current = setTimeout(() => {
      if (!showTzPicker && !showSoundMenu && !showShortcutsHelp && !isScrubbing) {
        setShowControls(false);
      }
    }, 3500);
  };

  useEffect(() => {
    if (!isOpen) return;
    resetHideTimer();
    return () => {
      if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
    };
  }, [isOpen, showTzPicker, showSoundMenu, showShortcutsHelp, isScrubbing]);

  // Keyboard navigation & controls
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
        return;
      }

      resetHideTimer();

      if (e.key === 'Escape') {
        if (showShortcutsHelp) {
          setShowShortcutsHelp(false);
        } else if (showTzPicker) {
          setShowTzPicker(false);
        } else if (showSoundMenu) {
          setShowSoundMenu(false);
        } else if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else {
          onClose();
        }
      } else if (e.key === 'f' || e.key === 'F') {
        toggleBrowserFullscreen();
      } else if (e.key === ' ') {
        e.preventDefault();
        onToggleSound();
      } else if (e.key === 'ArrowRight') {
        goToNextClock();
      } else if (e.key === 'ArrowLeft') {
        goToPrevClock();
      } else if (e.key === 'd' || e.key === 'D') {
        // Toggle night dimmer
        setBrightness((prev) => (prev <= 30 ? 100 : 25));
      } else if (e.key === 'h' || e.key === 'H') {
        setShowControls((prev) => !prev);
      } else if (e.key === '?') {
        setShowShortcutsHelp((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showShortcutsHelp, showTzPicker, showSoundMenu, allClocks, clock]);

  if (!isOpen) return null;

  const toggleBrowserFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (containerRef.current) {
          await containerRef.current.requestFullscreen();
        } else {
          await document.documentElement.requestFullscreen();
        }
        setIsBrowserFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsBrowserFullscreen(false);
      }
    } catch (e) {
      // Fallback
    }
  };

  const currentIndex = allClocks.findIndex((c) => c.id === clock.id);
  const goToNextClock = () => {
    const nextIdx = (currentIndex + 1) % allClocks.length;
    onSelectClock(allClocks[nextIdx]);
  };
  const goToPrevClock = () => {
    const prevIdx = (currentIndex - 1 + allClocks.length) % allClocks.length;
    onSelectClock(allClocks[prevIdx]);
  };

  // Compute active overridden date if scrubbing
  let timeOverride: Date | null = null;
  if (isScrubbing) {
    const base = new Date();
    const h = Math.floor(scrubMinutes / 60);
    const m = scrubMinutes % 60;
    base.setHours(h, m, 0, 0);
    timeOverride = base;
  }

  // Active time calculations for info bar
  const activeDate = timeOverride || currentDate;
  const zonedDate = getZonedDate(activeDate, selectedTimeZone);
  const formattedTime = formatTimeDisplay(zonedDate, format24h, true);
  const formattedDate = formatDateDutch(zonedDate, selectedTimeZone);

  const selectedTzObj = TIME_ZONES.find((t) => t.id === selectedTimeZone) || TIME_ZONES[0];

  // Enhanced clock copy with sound config override if modified
  const currentClockWithOverrides: ClockItem = {
    ...clock,
    config: {
      ...clock.config,
      soundType: customSoundType
    }
  };

  const handleCaptureSnapshot = () => {
    // Quick screenshot notification / simulated canvas snapshot
    const canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = clock.config.bgColor || '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = clock.config.accentColor || '#38bdf8';
      ctx.font = 'bold 48px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(clock.name, canvas.width / 2, canvas.height / 2 - 40);
      ctx.font = 'bold 36px monospace';
      ctx.fillText(formattedTime, canvas.width / 2, canvas.height / 2 + 30);
      ctx.font = '18px sans-serif';
      ctx.fillStyle = clock.config.textColor || '#94a3b8';
      ctx.fillText(formattedDate, canvas.width / 2, canvas.height / 2 + 80);

      const link = document.createElement('a');
      link.download = `${clock.name.toLowerCase().replace(/\s+/g, '_')}_poster.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={resetHideTimer}
      onTouchStart={resetHideTimer}
      onClick={() => resetHideTimer()}
      className="fixed inset-0 z-50 bg-slate-950 flex flex-col justify-between overflow-hidden select-none"
      style={{
        filter: `brightness(${brightness}%)`,
        transition: 'filter 0.3s ease'
      }}
    >
      {/* Top Floating Control Bar */}
      <header
        className={`absolute top-0 left-0 right-0 z-30 p-4 sm:p-6 transition-all duration-500 ease-in-out ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-6 pointer-events-none'
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between bg-slate-900/80 backdrop-blur-xl border border-white/10 p-3 sm:p-4 rounded-3xl shadow-2xl">
          {/* Left: Clock Title & Category */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="p-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 transition-all active:scale-95"
              title="Sluiten (Esc)"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">{clock.name}</h2>
                <span className="hidden sm:inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  {clock.category}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono hidden md:block">
                {formattedDate} • <span className="text-sky-300 font-bold">{selectedTzObj.city}</span>
              </p>
            </div>
          </div>

          {/* Center: Live Timezone & Format Badges */}
          <div className="hidden lg:flex items-center space-x-2 bg-slate-950/60 p-1.5 rounded-2xl border border-white/10">
            {/* Timezone Selector Trigger */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTzPicker(!showTzPicker);
                  setShowSoundMenu(false);
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-200 hover:bg-slate-800/80 transition-all border border-transparent hover:border-white/10"
              >
                <span>{selectedTzObj.flag}</span>
                <span>{selectedTzObj.city}</span>
                <Globe className="w-3.5 h-3.5 text-sky-400 ml-1" />
              </button>

              {/* Timezone Dropdown */}
              {showTzPicker && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-full left-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-2xl p-2 shadow-2xl z-40 space-y-1 backdrop-blur-xl"
                >
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Kies Tijdzone
                  </div>
                  {TIME_ZONES.map((tz) => (
                    <button
                      key={tz.id}
                      onClick={() => {
                        setSelectedTimeZone(tz.id);
                        setShowTzPicker(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition-all ${
                        selectedTimeZone === tz.id
                          ? 'bg-sky-500 text-white font-bold'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className="flex items-center space-x-2">
                        <span>{tz.flag}</span>
                        <span>{tz.label}</span>
                      </span>
                      <span className="text-[10px] opacity-70 font-mono">{tz.city}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 12h / 24h Toggle */}
            <button
              onClick={() => setFormat24h(!format24h)}
              className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-slate-300 hover:bg-slate-800/80 transition-all border border-transparent hover:border-white/10"
              title="Schakel tussen 24-uurs en 12-uurs AM/PM indeling"
            >
              {format24h ? '24U' : '12U AM/PM'}
            </button>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center space-x-2">
            {/* Ambient Sound Trigger */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSoundMenu(!showSoundMenu);
                  setShowTzPicker(false);
                }}
                className={`p-2.5 rounded-2xl border transition-all text-xs flex items-center space-x-1.5 ${
                  soundEnabled
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-lg shadow-amber-500/20'
                    : 'bg-slate-800/80 text-slate-400 border-white/10 hover:text-white'
                }`}
                title="Geluid & Soundscape mixer"
              >
                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>

              {/* Sound Settings Dropdown */}
              {showSoundMenu && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-full right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-2xl p-4 shadow-2xl z-40 space-y-4 backdrop-blur-xl"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                      <Volume2 className="w-4 h-4 text-amber-400" />
                      <span>Audio & Mechaniek</span>
                    </span>
                    <button
                      onClick={onToggleSound}
                      className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all ${
                        soundEnabled ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {soundEnabled ? 'Aan' : 'Uit'}
                    </button>
                  </div>

                  {/* Volume Slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>Volume:</span>
                      <span className="font-mono font-bold text-amber-300">{Math.round(soundVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="1"
                      step="0.05"
                      value={soundVolume}
                      onChange={(e) => setSoundVolume(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                    />
                  </div>

                  {/* Sound Type Selection */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Geluidseffect</span>
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      {[
                        { id: 'soft_tick', label: 'Zachte Tik' },
                        { id: 'gear_click', label: 'Tandwiel Klik' },
                        { id: 'digital_beep', label: 'Digi Blip' },
                        { id: 'water_drop', label: 'Waterdruppel' },
                        { id: 'space_hum', label: 'Space Hum' },
                        { id: 'none', label: 'Stil' }
                      ].map((snd) => (
                        <button
                          key={snd.id}
                          onClick={() => setCustomSoundType(snd.id)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold text-left transition-all ${
                            customSoundType === snd.id
                              ? 'bg-amber-500 text-slate-950 font-bold'
                              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          {snd.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bedside Dimmer Quick Preset */}
            <button
              onClick={() => setBrightness((prev) => (prev <= 30 ? 100 : 25))}
              className={`p-2.5 rounded-2xl border transition-all ${
                brightness < 50
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                  : 'bg-slate-800/80 text-slate-300 border-white/10 hover:text-white'
              }`}
              title="Nacht / Bedside Dimmer (D)"
            >
              {brightness < 50 ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>

            {/* Snapshot Poster / Wallpaper */}
            <button
              onClick={handleCaptureSnapshot}
              className="p-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 transition-all active:scale-95"
              title="Download Poster Snapshot"
            >
              <Camera className="w-5 h-5" />
            </button>

            {/* AI Customizer launch */}
            <button
              onClick={() => onOpenCustomizer(clock)}
              className="hidden sm:flex items-center space-x-1.5 px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-600 hover:opacity-90 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>Aanpassen</span>
            </button>

            {/* Browser Fullscreen F11 */}
            <button
              onClick={toggleBrowserFullscreen}
              className="p-2.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-bold shadow-lg shadow-sky-500/30 transition-all active:scale-95"
              title={isBrowserFullscreen ? 'Verlaat Volledig Scherm' : 'Volledig Scherm (F11 / F)'}
            >
              {isBrowserFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>

            {/* Shortcuts Help */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowShortcutsHelp(!showShortcutsHelp);
              }}
              className="p-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-white/10 transition-all"
              title="Sneltoetsen (?)"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Full-Scale Clock Canvas */}
      <main className="relative flex-1 w-full h-full flex items-center justify-center p-4 sm:p-12 overflow-hidden">
        {/* Navigation Arrows for Previous / Next Clock */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            goToPrevClock();
          }}
          className={`absolute left-4 sm:left-8 z-20 p-3 sm:p-4 rounded-3xl bg-slate-900/60 hover:bg-slate-900 text-white/70 hover:text-white border border-white/10 backdrop-blur-md transition-all duration-300 hover:scale-110 active:scale-95 ${
            showControls ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-6 pointer-events-none'
          }`}
          title="Vorige klok (←)"
        >
          <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            goToNextClock();
          }}
          className={`absolute right-4 sm:right-8 z-20 p-3 sm:p-4 rounded-3xl bg-slate-900/60 hover:bg-slate-900 text-white/70 hover:text-white border border-white/10 backdrop-blur-md transition-all duration-300 hover:scale-110 active:scale-95 ${
            showControls ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-6 pointer-events-none'
          }`}
          title="Volgende klok (→)"
        >
          <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
        </button>

        {/* Scaled Clock Render Container */}
        <div className="w-full h-full max-w-5xl max-h-[85vh] flex items-center justify-center">
          <ClockRenderer
            clock={currentClockWithOverrides}
            soundEnabled={soundEnabled}
            soundVolume={soundVolume}
            timeZone={selectedTimeZone}
            timeOverride={timeOverride}
            isFullSize={true}
          />
        </div>
      </main>

      {/* Bottom Floating Control Bar & Clock Strip */}
      <footer
        className={`absolute bottom-0 left-0 right-0 z-30 p-4 sm:p-6 transition-all duration-500 ease-in-out ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'
        }`}
      >
        <div className="max-w-7xl mx-auto space-y-3">
          {/* Time Machine & Dimmer Bar */}
          <div className="bg-slate-900/85 backdrop-blur-xl border border-white/10 p-3 sm:p-4 rounded-3xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Time Machine Scrubber */}
            <div className="w-full md:w-2/3 flex items-center space-x-3">
              <div className="flex items-center space-x-2 min-w-fit">
                <Clock className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold text-slate-300 hidden sm:inline">Tijdmachine:</span>
              </div>

              <input
                type="range"
                min="0"
                max="1439"
                step="1"
                value={isScrubbing ? scrubMinutes : activeDate.getHours() * 60 + activeDate.getMinutes()}
                onChange={(e) => {
                  setIsScrubbing(true);
                  setScrubMinutes(parseInt(e.target.value, 10));
                }}
                className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-sky-400"
              />

              <div className="flex items-center space-x-2 min-w-fit">
                <span className="font-mono text-xs font-bold text-sky-300 bg-slate-950 px-2.5 py-1 rounded-xl border border-white/10">
                  {formattedTime}
                </span>

                {isScrubbing ? (
                  <button
                    onClick={() => setIsScrubbing(false)}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold hover:bg-amber-500/30 transition-all active:scale-95"
                    title="Herstel naar realtime klok"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Live</span>
                  </button>
                ) : (
                  <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>LIVE</span>
                  </span>
                )}
              </div>
            </div>

            {/* Dimmer / Brightness Slider */}
            <div className="w-full md:w-1/3 flex items-center justify-end space-x-3">
              <Sun className="w-4 h-4 text-amber-400 min-w-fit" />
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={brightness}
                onChange={(e) => setBrightness(parseInt(e.target.value, 10))}
                className="w-full max-w-[160px] h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
              <span className="text-xs font-mono font-bold text-slate-400 min-w-fit">{brightness}%</span>
            </div>
          </div>

          {/* Quick Clock Carousel Strip */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-700">
            {allClocks.map((c) => {
              const isSelected = c.id === clock.id;
              return (
                <button
                  key={c.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectClock(c);
                  }}
                  className={`flex-shrink-0 flex items-center space-x-2 px-3.5 py-2 rounded-2xl border transition-all text-xs font-bold ${
                    isSelected
                      ? 'bg-sky-500 text-white border-sky-400 shadow-lg shadow-sky-500/30 scale-105'
                      : 'bg-slate-900/80 text-slate-400 hover:text-white border-white/10 hover:bg-slate-800'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: c.config.accentColor || '#38bdf8' }}
                  />
                  <span className="whitespace-nowrap">{c.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </footer>

      {/* Keyboard Shortcuts Modal */}
      {showShortcutsHelp && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setShowShortcutsHelp(false);
          }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <HelpCircle className="w-5 h-5 text-sky-400" />
                <span>Sneltoetsen Overzicht</span>
              </h3>
              <button
                onClick={() => setShowShortcutsHelp(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span>Volledig scherm (F11) in/uitschakelen</span>
                <kbd className="px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg font-mono font-bold text-sky-400">
                  F / F11
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span>Geluid aan / uit</span>
                <kbd className="px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg font-mono font-bold text-sky-400">
                  Spatiebalk
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span>Volgende / Vorige klok</span>
                <kbd className="px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg font-mono font-bold text-sky-400">
                  ← / →
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span>Nachtdimmer / Bedside modus</span>
                <kbd className="px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg font-mono font-bold text-sky-400">
                  D
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span>Bedieningsknoppen verbergen / tonen</span>
                <kbd className="px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg font-mono font-bold text-sky-400">
                  H
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1">
                <span>Sluiten & terugkeren naar overzicht</span>
                <kbd className="px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg font-mono font-bold text-sky-400">
                  Esc
                </kbd>
              </div>
            </div>

            <button
              onClick={() => setShowShortcutsHelp(false)}
              className="w-full py-2.5 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-xl text-xs shadow-lg transition-all"
            >
              Begrepen
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
