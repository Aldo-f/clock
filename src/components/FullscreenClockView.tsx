import React, { useState, useEffect, useRef } from 'react';
import { ClockItem, AmbientSoundType, ChimeSoundType } from '../types';
import { ClockRenderer } from './ClockRenderer';
import { getLocalizedTimeZones, getZonedDate, formatTimeDisplay, formatDateLocale } from '../utils/timeUtils';
import { useLanguage } from '../i18n/LanguageContext';
import { LanguageSelector } from './LanguageSelector';
import {
  playClockSound,
  playChimeSound,
  startAmbientSound,
  stopAmbientSound,
  speakCurrentTime
} from '../utils/audioSynth';
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
  Camera,
  RotateCcw,
  HelpCircle,
  Mic,
  Share2,
  Shield,
  Timer,
  Play,
  Pause,
  Copy,
  Check,
  Music,
  Bell
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
  clock: rawClock,
  allClocks,
  isOpen,
  onClose,
  onSelectClock,
  onOpenCustomizer,
  soundEnabled,
  onToggleSound
}) => {
  const { t, language, translateClock, translateCategory } = useLanguage();
  const clock = translateClock(rawClock);

  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState<boolean>(false);
  const [selectedTimeZone, setSelectedTimeZone] = useState<string>('local');
  const [format24h, setFormat24h] = useState<boolean>(true);
  const [soundVolume, setSoundVolume] = useState<number>(0.3);
  const [brightness, setBrightness] = useState<number>(100);
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const [scrubMinutes, setScrubMinutes] = useState<number>(720);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState<boolean>(false);
  const [showTzPicker, setShowTzPicker] = useState<boolean>(false);
  const [showSoundMenu, setShowSoundMenu] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [showPomodoroModal, setShowPomodoroModal] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedEmbed, setCopiedEmbed] = useState<boolean>(false);

  // New audio & protection state
  const [ambientSound, setAmbientSound] = useState<AmbientSoundType>(rawClock.config.ambientSound || 'none');
  const [hourlyChime, setHourlyChime] = useState<ChimeSoundType>(rawClock.config.hourlyChime || 'none');
  const [burnInProtection, setBurnInProtection] = useState<boolean>(!!rawClock.config.burnInProtection);
  const [burnInOffset, setBurnInOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [customSoundType, setCustomSoundType] = useState<string>(rawClock.config.soundType || 'soft_tick');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Pomodoro Focus Timer State
  const [pomodoroSeconds, setPomodoroSeconds] = useState<number>(25 * 60);
  const [pomodoroRunning, setPomodoroRunning] = useState<boolean>(false);
  const [pomodoroMode, setPomodoroMode] = useState<'work' | 'shortBreak' | 'longBreak'>('work');

  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastChimedHourRef = useRef<number>(-1);

  useEffect(() => {
    if (rawClock.config.soundType) setCustomSoundType(rawClock.config.soundType);
    if (rawClock.config.ambientSound) setAmbientSound(rawClock.config.ambientSound);
    if (rawClock.config.hourlyChime) setHourlyChime(rawClock.config.hourlyChime);
  }, [rawClock]);

  // Ambient sound management
  useEffect(() => {
    if (soundEnabled && ambientSound !== 'none') {
      startAmbientSound(ambientSound, soundVolume);
    } else {
      stopAmbientSound();
    }
    return () => {
      stopAmbientSound();
    };
  }, [soundEnabled, ambientSound, soundVolume]);

  // Clock tick & Hourly chime check
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentDate(now);

      // Hourly Chime check at minute 00
      if (soundEnabled && hourlyChime !== 'none') {
        const curHour = now.getHours();
        const curMin = now.getMinutes();
        if (curMin === 0 && lastChimedHourRef.current !== curHour) {
          lastChimedHourRef.current = curHour;
          playChimeSound(hourlyChime, soundVolume);
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [soundEnabled, hourlyChime, soundVolume]);

  // OLED Burn-in micro-pixel shift every 60s
  useEffect(() => {
    if (!burnInProtection) {
      setBurnInOffset({ x: 0, y: 0 });
      return;
    }
    const interval = setInterval(() => {
      const ox = Math.floor(Math.random() * 16) - 8;
      const oy = Math.floor(Math.random() * 16) - 8;
      setBurnInOffset({ x: ox, y: oy });
    }, 60000);
    return () => clearInterval(interval);
  }, [burnInProtection]);

  // Pomodoro countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (pomodoroRunning && pomodoroSeconds > 0) {
      interval = setInterval(() => {
        setPomodoroSeconds((prev) => {
          if (prev <= 1) {
            setPomodoroRunning(false);
            if (soundEnabled) playChimeSound('singing_bowl', 0.6);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [pomodoroRunning, pomodoroSeconds, soundEnabled]);

  useEffect(() => {
    const handleFsChange = () => {
      setIsBrowserFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const resetHideTimer = () => {
    setShowControls(true);
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    hideControlsTimerRef.current = setTimeout(() => {
      if (!showTzPicker && !showSoundMenu && !showShortcutsHelp && !showShareModal && !showPomodoroModal && !isScrubbing) {
        setShowControls(false);
      }
    }, 4000);
  };

  useEffect(() => {
    if (!isOpen) return;
    resetHideTimer();
    return () => {
      if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
    };
  }, [isOpen, showTzPicker, showSoundMenu, showShortcutsHelp, showShareModal, showPomodoroModal, isScrubbing]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
        return;
      }

      resetHideTimer();

      if (e.key === 'Escape') {
        if (showShortcutsHelp) setShowShortcutsHelp(false);
        else if (showShareModal) setShowShareModal(false);
        else if (showPomodoroModal) setShowPomodoroModal(false);
        else if (showTzPicker) setShowTzPicker(false);
        else if (showSoundMenu) setShowSoundMenu(false);
        else if (document.fullscreenElement) {
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
        setBrightness((prev) => (prev <= 30 ? 100 : 25));
      } else if (e.key === 'h' || e.key === 'H') {
        setShowControls((prev) => !prev);
      } else if (e.key === '?') {
        setShowShortcutsHelp((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showShortcutsHelp, showShareModal, showPomodoroModal, showTzPicker, showSoundMenu, allClocks, rawClock]);

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
    } catch (e) {}
  };

  const currentIndex = allClocks.findIndex((c) => c.id === rawClock.id);
  const goToNextClock = () => {
    const nextIdx = (currentIndex + 1) % allClocks.length;
    onSelectClock(allClocks[nextIdx]);
  };
  const goToPrevClock = () => {
    const prevIdx = (currentIndex - 1 + allClocks.length) % allClocks.length;
    onSelectClock(allClocks[prevIdx]);
  };

  let timeOverride: Date | null = null;
  if (isScrubbing) {
    const base = new Date();
    const h = Math.floor(scrubMinutes / 60);
    const m = scrubMinutes % 60;
    base.setHours(h, m, 0, 0);
    timeOverride = base;
  }

  const activeDate = timeOverride || currentDate;
  const zonedDate = getZonedDate(activeDate, selectedTimeZone);
  const formattedTime = formatTimeDisplay(zonedDate, format24h, true);
  const formattedDate = formatDateLocale(zonedDate, language, selectedTimeZone);

  const localizedTimeZones = getLocalizedTimeZones(t);
  const selectedTzObj = localizedTimeZones.find((t) => t.id === selectedTimeZone) || localizedTimeZones[0];

  const currentClockWithOverrides: ClockItem = {
    ...clock,
    config: {
      ...clock.config,
      soundType: customSoundType,
      ambientSound,
      hourlyChime,
      burnInProtection
    }
  };

  const handleCaptureSnapshot = () => {
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

  const handleCopyLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('clock', rawClock.id);
    url.searchParams.set('tab', 'fullscreen');
    if (selectedTimeZone !== 'local') url.searchParams.set('tz', selectedTimeZone);
    navigator.clipboard.writeText(url.toString());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyEmbed = () => {
    const embedUrl = `${window.location.origin}/?clock=${rawClock.id}&tab=fullscreen&embed=true`;
    const iframeCode = `<iframe src="${embedUrl}" width="600" height="400" frameborder="0" allowfullscreen style="border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,0.5);"></iframe>`;
    navigator.clipboard.writeText(iframeCode);
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2500);
  };

  const handleSpeak = () => {
    speakCurrentTime(activeDate, language, selectedTimeZone);
  };

  const formatPomoTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
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
              title={`${t('close')} (Esc)`}
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">{clock.name}</h2>
                <span className="hidden sm:inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  {translateCategory(clock.category)}
                </span>
                {burnInProtection && (
                  <span className="hidden md:inline-flex items-center space-x-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <Shield className="w-3 h-3" />
                    <span>OLED SAFE</span>
                  </span>
                )}
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
                  className="absolute top-full left-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-2xl p-2 shadow-2xl z-40 space-y-1 backdrop-blur-xl max-h-80 overflow-y-auto"
                >
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {t('dashChooseTz')}
                  </div>
                  {localizedTimeZones.map((tz) => (
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
              title="24h / 12h"
            >
              {format24h ? '24H' : '12H AM/PM'}
            </button>
          </div>

          {/* Right Action Tools: Language, Speak, Audio, Dimmer, Pomodoro, Share, Fullscreen */}
          <div className="flex items-center space-x-2">
            {/* Multilingual Selector */}
            <LanguageSelector variant="compact" />

            {/* Speak Time Button */}
            <button
              onClick={handleSpeak}
              className="p-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-sky-400 hover:text-sky-300 border border-white/10 transition-all active:scale-95"
              title={t('speakTime')}
            >
              <Mic className="w-5 h-5" />
            </button>

            {/* Pomodoro Timer Trigger */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowPomodoroModal(!showPomodoroModal);
                setShowSoundMenu(false);
                setShowShareModal(false);
              }}
              className={`p-2.5 rounded-2xl border transition-all ${
                pomodoroRunning
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-lg shadow-rose-500/20 animate-pulse'
                  : 'bg-slate-800/80 text-slate-300 border-white/10 hover:text-white'
              }`}
              title={t('pomodoro')}
            >
              <Timer className="w-5 h-5" />
            </button>

            {/* Ambient & Sound Menu */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSoundMenu(!showSoundMenu);
                  setShowTzPicker(false);
                  setShowShareModal(false);
                  setShowPomodoroModal(false);
                }}
                className={`p-2.5 rounded-2xl border transition-all text-xs flex items-center space-x-1.5 ${
                  soundEnabled
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-lg shadow-amber-500/20'
                    : 'bg-slate-800/80 text-slate-400 border-white/10 hover:text-white'
                }`}
                title={t('fsAudioSettings')}
              >
                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>

              {/* Comprehensive Audio Settings Dropdown */}
              {showSoundMenu && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-full right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl z-40 space-y-4 backdrop-blur-xl max-h-[80vh] overflow-y-auto"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="text-sm font-bold text-white flex items-center space-x-2">
                      <Volume2 className="w-4 h-4 text-amber-400" />
                      <span>{t('fsAudioSettings')}</span>
                    </span>
                    <button
                      onClick={onToggleSound}
                      className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all ${
                        soundEnabled ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {soundEnabled ? t('active') : t('off')}
                    </button>
                  </div>

                  {/* Volume Slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>{t('fsSoundVolume')}:</span>
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

                  {/* Generative Ambient Soundscapes */}
                  <div className="space-y-2 border-t border-slate-800 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-sky-400 flex items-center space-x-1.5">
                        <Music className="w-3.5 h-3.5" />
                        <span>{t('ambientSound')}</span>
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { id: 'none', label: t('soundNone') },
                        { id: 'rain', label: t('ambientRain') },
                        { id: 'synth432', label: t('ambientSynth') },
                        { id: 'brown_noise', label: t('ambientBrownNoise') },
                        { id: 'forest', label: t('ambientForest') },
                        { id: 'cosmic_hum', label: t('ambientCosmic') }
                      ].map((amb) => (
                        <button
                          key={amb.id}
                          onClick={() => setAmbientSound(amb.id as AmbientSoundType)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs text-left transition-all ${
                            ambientSound === amb.id
                              ? 'bg-sky-500 text-white font-bold shadow-md shadow-sky-500/20'
                              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          {amb.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Hourly Chimes */}
                  <div className="space-y-2 border-t border-slate-800 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-400 flex items-center space-x-1.5">
                        <Bell className="w-3.5 h-3.5" />
                        <span>{t('hourlyChime')}</span>
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { id: 'none', label: t('soundNone') },
                        { id: 'westminster', label: t('chimeWestminster') },
                        { id: 'singing_bowl', label: t('chimeBowl') },
                        { id: 'grandfather', label: t('chimeGrandfather') },
                        { id: 'cuckoo', label: t('chimeCuckoo') }
                      ].map((ch) => (
                        <button
                          key={ch.id}
                          onClick={() => {
                            setHourlyChime(ch.id as ChimeSoundType);
                            if (ch.id !== 'none') playChimeSound(ch.id, soundVolume);
                          }}
                          className={`px-2.5 py-1.5 rounded-xl text-xs text-left transition-all ${
                            hourlyChime === ch.id
                              ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          {ch.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* OLED Burn-in Protection Toggle */}
                  <div className="border-t border-slate-800 pt-3 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-emerald-400 flex items-center space-x-1.5">
                        <Shield className="w-3.5 h-3.5" />
                        <span>{t('burnInProtection')}</span>
                      </span>
                      <span className="text-[10px] text-slate-500">Pixel shift micro-offset</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={burnInProtection}
                      onChange={(e) => setBurnInProtection(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-500 bg-slate-800 border-slate-700 accent-emerald-500 cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Share / Embed Trigger */}
            <button
              onClick={() => {
                setShowShareModal(true);
                setShowSoundMenu(false);
              }}
              className="p-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 transition-all active:scale-95"
              title={t('shareLink')}
            >
              <Share2 className="w-5 h-5" />
            </button>

            {/* Bedside Dimmer Quick Preset */}
            <button
              onClick={() => setBrightness((prev) => (prev <= 30 ? 100 : 25))}
              className={`p-2.5 rounded-2xl border transition-all ${
                brightness < 50
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                  : 'bg-slate-800/80 text-slate-300 border-white/10 hover:text-white'
              }`}
              title={t('fsDimmer')}
            >
              {brightness < 50 ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>

            {/* Snapshot Poster */}
            <button
              onClick={handleCaptureSnapshot}
              className="p-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 transition-all active:scale-95"
              title={t('fsSnapshot')}
            >
              <Camera className="w-5 h-5" />
            </button>

            {/* AI Customizer launch */}
            <button
              onClick={() => onOpenCustomizer(rawClock)}
              className="hidden sm:flex items-center space-x-1.5 px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-600 hover:opacity-90 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>{t('edit')}</span>
            </button>

            {/* Browser Fullscreen F11 */}
            <button
              onClick={toggleBrowserFullscreen}
              className="p-2.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-bold shadow-lg shadow-sky-500/30 transition-all active:scale-95"
              title={isBrowserFullscreen ? t('fsExitFs') : t('fsEnterFs')}
            >
              {isBrowserFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Full-Scale Clock Canvas with OLED Micro-shift */}
      <main
        className="relative flex-1 w-full h-full flex items-center justify-center p-4 sm:p-12 overflow-hidden transition-transform duration-1000"
        style={{
          transform: `translate(${burnInOffset.x}px, ${burnInOffset.y}px)`
        }}
      >
        {/* Navigation Arrows for Previous / Next Clock */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            goToPrevClock();
          }}
          className={`absolute left-4 sm:left-8 z-20 p-3 sm:p-4 rounded-3xl bg-slate-900/60 hover:bg-slate-900 text-white/70 hover:text-white border border-white/10 backdrop-blur-md transition-all duration-300 hover:scale-110 active:scale-95 ${
            showControls ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-6 pointer-events-none'
          }`}
          title={`${t('fsPrevClock')} (←)`}
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
          title={`${t('fsNextClock')} (→)`}
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
                <span className="text-xs font-bold text-slate-300 hidden sm:inline">{t('fsTimeMachine')}:</span>
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
                    title={t('fsResetLive')}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{t('fsLive')}</span>
                  </button>
                ) : (
                  <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>{t('fsLive')}</span>
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
              const tc = translateClock(c);
              const isSelected = c.id === rawClock.id;
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
                  <span className="whitespace-nowrap">{tc.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </footer>

      {/* Share / Embed Modal */}
      {showShareModal && (
        <div
          onClick={() => setShowShareModal(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Share2 className="w-5 h-5 text-sky-400" />
                <span>{t('shareLink')}</span>
              </h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Direct Link */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">{t('directUrlBadge')}</label>
              <div className="flex items-center space-x-2">
                <input
                  readOnly
                  value={`${window.location.origin}/clock/${rawClock.id}?lang=${language}`}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-300"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all"
                >
                  {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* iFrame Embed Code */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">{t('embedCode')}</label>
              <div className="flex items-center space-x-2">
                <textarea
                  readOnly
                  rows={2}
                  value={`<iframe src="${window.location.origin}/clock/${rawClock.id}?embed=true&lang=${language}" width="600" height="400" frameborder="0" allowfullscreen></iframe>`}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-300 resize-none"
                />
                <button
                  onClick={handleCopyEmbed}
                  className="px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all"
                >
                  {copiedEmbed ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedEmbed ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pomodoro Focus Timer Modal */}
      {showPomodoroModal && (
        <div
          onClick={() => setShowPomodoroModal(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-5 text-center"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Timer className="w-5 h-5 text-rose-400" />
                <span>{t('pomodoro')}</span>
              </h3>
              <button
                onClick={() => setShowPomodoroModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Presets Toggle */}
            <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
              <button
                onClick={() => {
                  setPomodoroMode('work');
                  setPomodoroSeconds(25 * 60);
                  setPomodoroRunning(false);
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  pomodoroMode === 'work' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('focusWorkSession')} (25m)
              </button>
              <button
                onClick={() => {
                  setPomodoroMode('shortBreak');
                  setPomodoroSeconds(5 * 60);
                  setPomodoroRunning(false);
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  pomodoroMode === 'shortBreak' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('focusShortBreak')} (5m)
              </button>
            </div>

            {/* Big Countdown Display */}
            <div className="py-6">
              <div className="text-6xl font-black font-mono tracking-wider text-white drop-shadow-lg">
                {formatPomoTime(pomodoroSeconds)}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center space-x-3">
              <button
                onClick={() => setPomodoroRunning(!pomodoroRunning)}
                className={`px-6 py-3 rounded-2xl font-bold text-sm flex items-center space-x-2 shadow-lg transition-all ${
                  pomodoroRunning ? 'bg-amber-500 text-slate-950' : 'bg-rose-500 text-white'
                }`}
              >
                {pomodoroRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{pomodoroRunning ? t('fsTimerPause') : t('fsTimerStart')}</span>
              </button>

              <button
                onClick={() => {
                  setPomodoroRunning(false);
                  setPomodoroSeconds(pomodoroMode === 'work' ? 25 * 60 : 5 * 60);
                }}
                className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
                title={t('fsTimerReset')}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      {showShortcutsHelp && (
        <div
          onClick={() => setShowShortcutsHelp(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <HelpCircle className="w-5 h-5 text-sky-400" />
                <span>{t('fsShortcutsTitle')}</span>
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
                <span>{t('fsShortcutsFs')}</span>
                <kbd className="px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg font-mono font-bold text-sky-400">
                  F / F11
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span>{t('fsShortcutsSound')}</span>
                <kbd className="px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg font-mono font-bold text-sky-400">
                  Space
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span>{t('fsShortcutsNextPrev')}</span>
                <kbd className="px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg font-mono font-bold text-sky-400">
                  ← / →
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span>{t('fsShortcutsDimmer')}</span>
                <kbd className="px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg font-mono font-bold text-sky-400">
                  D
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span>{t('fsShortcutsControls')}</span>
                <kbd className="px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg font-mono font-bold text-sky-400">
                  H
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1">
                <span>{t('fsShortcutsClose')}</span>
                <kbd className="px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg font-mono font-bold text-sky-400">
                  Esc
                </kbd>
              </div>
            </div>

            <button
              onClick={() => setShowShortcutsHelp(false)}
              className="w-full py-2.5 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-xl text-xs shadow-lg transition-all"
            >
              {t('fsShortcutsGotIt')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
