import React, { useState } from 'react';
import { ClockItem, DashboardSlot } from '../types';
import { ClockRenderer } from './ClockRenderer';
import { TimezoneOverlapMatrix } from './TimezoneOverlapMatrix';
import { getLocalizedTimeZones } from '../utils/timeUtils';
import { useLanguage } from '../i18n/LanguageContext';
import {
  Maximize2,
  Plus,
  Trash2,
  Volume2,
  VolumeX,
  LayoutGrid,
  Sparkles
} from 'lucide-react';

interface Props {
  allClocks: ClockItem[];
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenCustomizer: (clock?: ClockItem) => void;
  onOpenFullSize: (clock: ClockItem) => void;
}

export const DashboardView: React.FC<Props> = ({
  allClocks,
  soundEnabled,
  onToggleSound,
  onOpenCustomizer,
  onOpenFullSize
}) => {
  const { t, translateClock } = useLanguage();
  const localizedTimeZones = getLocalizedTimeZones(t);
  const [slots, setSlots] = useState<DashboardSlot[]>([
    { id: 'slot-1', clockId: 'clock-rotating-disc', timeZone: 'Europe/Amsterdam' },
    { id: 'slot-2', clockId: 'clock-binary', timeZone: 'America/New_York' },
    { id: 'slot-3', clockId: 'clock-marble-run', timeZone: 'Asia/Tokyo' },
    { id: 'slot-4', clockId: 'clock-nixie', timeZone: 'Europe/London' }
  ]);

  const [layoutMode, setLayoutMode] = useState<'spotlight' | 'grid2' | 'grid3' | 'col1'>('spotlight');
  const [soundVolume, setSoundVolume] = useState<number>(0.2);

  const handleAddSlot = () => {
    if (slots.length >= 9) return;
    const randomClock = allClocks[slots.length % allClocks.length] || allClocks[0];
    setSlots([...slots, { id: 'slot-' + Date.now(), clockId: randomClock.id, timeZone: 'local' }]);
  };

  const handleRemoveSlot = (slotId: string) => {
    if (slots.length <= 1) return;
    setSlots(slots.filter((s) => s.id !== slotId));
  };

  const handleClockSelect = (slotId: string, clockId: string) => {
    setSlots(slots.map((s) => (s.id === slotId ? { ...s, clockId } : s)));
  };

  const handleTimezoneSelect = (slotId: string, timeZone: string) => {
    setSlots(slots.map((s) => (s.id === slotId ? { ...s, timeZone } : s)));
  };

  const applyPreset = (presetKey: string) => {
    if (presetKey === 'world_hub') {
      setSlots([
        { id: 'slot-1', clockId: 'clock-rotating-disc', timeZone: 'Europe/Amsterdam' },
        { id: 'slot-2', clockId: 'clock-binary', timeZone: 'America/New_York' },
        { id: 'slot-3', clockId: 'clock-nixie', timeZone: 'Asia/Tokyo' },
        { id: 'slot-4', clockId: 'clock-word-dutch', timeZone: 'Europe/London' }
      ]);
      setLayoutMode('spotlight');
    } else if (presetKey === 'horology') {
      setSlots([
        { id: 'slot-1', clockId: 'clock-marble-run', timeZone: 'local' },
        { id: 'slot-2', clockId: 'clock-rotating-disc', timeZone: 'local' },
        { id: 'slot-3', clockId: 'clock-fibonacci', timeZone: 'local' },
        { id: 'slot-4', clockId: 'clock-nixie', timeZone: 'local' }
      ]);
      setLayoutMode('grid2');
    } else if (presetKey === 'cyberpunk') {
      setSlots([
        { id: 'slot-1', clockId: 'clock-binary', timeZone: 'local' },
        { id: 'slot-2', clockId: 'clock-nixie', timeZone: 'local' },
        { id: 'slot-3', clockId: 'clock-color-palette', timeZone: 'local' }
      ]);
      setLayoutMode('grid3');
    }
  };

  const primarySlot = slots[0];
  const companionSlots = slots.slice(1);

  return (
    <div className="w-full flex flex-col space-y-4 sm:space-y-6">
      {/* Dashboard Control Bar */}
      <div className="flex flex-col gap-3.5 bg-slate-900/90 border border-slate-800 p-4 sm:p-6 rounded-3xl shadow-2xl backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/20">
              <LayoutGrid className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">{t('dashTitle')}</h2>
              <p className="text-xs text-slate-400">
                {t('dashSubtitle')}
              </p>
            </div>
          </div>

          {/* Master Sound & Add Slot */}
          <div className="flex items-center space-x-2">
            {/* Sound Master Controls */}
            <div className="flex items-center space-x-1.5 bg-slate-950 px-2.5 py-1.5 rounded-2xl border border-slate-800">
              <button
                onClick={onToggleSound}
                className={`p-1 rounded-lg text-xs ${soundEnabled ? 'text-amber-400' : 'text-slate-500'}`}
                title={soundEnabled ? t('soundOff') : t('soundOn')}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              {soundEnabled && (
                <input
                  type="range"
                  min="0.05"
                  max="0.5"
                  step="0.05"
                  value={soundVolume}
                  onChange={(e) => setSoundVolume(parseFloat(e.target.value))}
                  className="w-14 sm:w-20 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                  title={t('fsSoundVolume')}
                />
              )}
            </div>

            {/* Add Slot Button */}
            {slots.length < 9 && (
              <button
                onClick={handleAddSlot}
                className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 rounded-2xl transition-all text-xs font-bold flex items-center space-x-1.5 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">{t('dashAddClock')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Action Controls Toolbar: Presets & Layouts */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
          {/* Quick Presets (Horizontally scrollable on small mobile screens) */}
          <div className="flex items-center space-x-1 overflow-x-auto pb-1 max-w-full no-scrollbar">
            <span className="px-1 text-slate-500 font-bold uppercase text-[10px] shrink-0">{t('presets')}:</span>
            <button
              onClick={() => applyPreset('world_hub')}
              className="px-2.5 py-1 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-all font-semibold text-xs shrink-0 whitespace-nowrap bg-slate-950/60 border border-slate-800/80"
            >
              🌐 {t('dashPresetWorld')}
            </button>
            <button
              onClick={() => applyPreset('horology')}
              className="px-2.5 py-1 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-all font-semibold text-xs shrink-0 whitespace-nowrap bg-slate-950/60 border border-slate-800/80"
            >
              ⚙️ {t('dashPresetHorology')}
            </button>
            <button
              onClick={() => applyPreset('cyberpunk')}
              className="px-2.5 py-1 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-all font-semibold text-xs shrink-0 whitespace-nowrap bg-slate-950/60 border border-slate-800/80"
            >
              ⚡ {t('dashPresetCyberpunk')}
            </button>
          </div>

          {/* Layout Mode Switcher */}
          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs text-slate-300 shrink-0">
            <button
              onClick={() => setLayoutMode('spotlight')}
              className={`px-2.5 py-1 rounded-xl font-bold transition-all ${
                layoutMode === 'spotlight' ? 'bg-sky-500 text-white shadow-md' : 'hover:bg-slate-800'
              }`}
              title={t('dashSpotlight')}
            >
              {t('dashSpotlight')}
            </button>
            <button
              onClick={() => setLayoutMode('grid2')}
              className={`px-2.5 py-1 rounded-xl font-bold transition-all ${
                layoutMode === 'grid2' ? 'bg-sky-500 text-white shadow-md' : 'hover:bg-slate-800'
              }`}
              title={t('dashGrid2')}
            >
              2x2
            </button>
            <button
              onClick={() => setLayoutMode('grid3')}
              className={`px-2.5 py-1 rounded-xl font-bold transition-all ${
                layoutMode === 'grid3' ? 'bg-sky-500 text-white shadow-md' : 'hover:bg-slate-800'
              }`}
              title={t('dashGrid3')}
            >
              3x3
            </button>
          </div>
        </div>
      </div>

      {/* Spotlight Layout Rendering */}
      {layoutMode === 'spotlight' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Primary Featured Clock */}
          {primarySlot && (() => {
            const rawClock = allClocks.find((c) => c.id === primarySlot.clockId) || allClocks[0];
            const selectedClock = translateClock(rawClock);
            return (
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col min-h-[480px]">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between p-4 bg-slate-950/80 border-b border-slate-800/80 z-20 backdrop-blur-md gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 font-bold text-[10px] uppercase tracking-wider">
                      {t('dashPrimaryDisplay')}
                    </span>
                    <select
                      value={primarySlot.clockId}
                      onChange={(e) => handleClockSelect(primarySlot.id, e.target.value)}
                      className="bg-slate-900 text-xs font-bold text-sky-300 border border-slate-700 rounded-xl px-3 py-1.5 focus:outline-none focus:border-sky-500"
                    >
                      {allClocks.map((c) => {
                        const tc = translateClock(c);
                        return (
                          <option key={tc.id} value={tc.id}>
                            {tc.name}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Timezone Selector */}
                    <select
                      value={primarySlot.timeZone || 'local'}
                      onChange={(e) => handleTimezoneSelect(primarySlot.id, e.target.value)}
                      className="bg-slate-900 text-xs font-bold text-slate-300 border border-slate-700 rounded-xl px-2.5 py-1.5 focus:outline-none"
                    >
                      {localizedTimeZones.map((tz) => (
                        <option key={tz.id} value={tz.id}>
                          {tz.flag} {tz.city}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => onOpenFullSize(selectedClock)}
                      className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-sky-600 rounded-xl border border-slate-700 transition-all text-xs font-bold flex items-center space-x-1"
                      title={t('viewFullscreen')}
                    >
                      <Maximize2 className="w-4 h-4" />
                      <span className="hidden sm:inline">{t('navFullscreen')}</span>
                    </button>
                  </div>
                </div>

                <div className="flex-1 w-full h-full relative p-4 flex items-center justify-center">
                  <ClockRenderer
                    clock={selectedClock}
                    soundEnabled={soundEnabled}
                    soundVolume={soundVolume}
                    timeZone={primarySlot.timeZone}
                    isFullSize={true}
                  />
                </div>
              </div>
            );
          })()}

          {/* Companion Dials */}
          <div className="flex flex-col space-y-6">
            {companionSlots.map((slot) => {
              const rawClock = allClocks.find((c) => c.id === slot.clockId) || allClocks[0];
              const selectedClock = translateClock(rawClock);
              return (
                <div
                  key={slot.id}
                  className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col min-h-[220px]"
                >
                  <div className="flex items-center justify-between p-3 bg-slate-950/80 border-b border-slate-800/80 z-20 backdrop-blur-md">
                    <select
                      value={slot.clockId}
                      onChange={(e) => handleClockSelect(slot.id, e.target.value)}
                      className="bg-slate-900 text-xs font-bold text-sky-300 border border-slate-700 rounded-lg px-2 py-1 max-w-[140px] truncate"
                    >
                      {allClocks.map((c) => {
                        const tc = translateClock(c);
                        return (
                          <option key={tc.id} value={tc.id}>
                            {tc.name}
                          </option>
                        );
                      })}
                    </select>

                    <div className="flex items-center space-x-1">
                      <select
                        value={slot.timeZone || 'local'}
                        onChange={(e) => handleTimezoneSelect(slot.id, e.target.value)}
                        className="bg-slate-900 text-[11px] font-bold text-slate-300 border border-slate-700 rounded-lg px-1.5 py-1"
                      >
                        {localizedTimeZones.map((tz) => (
                          <option key={tz.id} value={tz.id}>
                            {tz.flag} {tz.city}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => onOpenFullSize(selectedClock)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                        title={t('viewFullscreen')}
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>

                      {slots.length > 1 && (
                        <button
                          onClick={() => handleRemoveSlot(slot.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg"
                          title={t('delete')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 w-full h-full relative p-2">
                    <ClockRenderer
                      clock={selectedClock}
                      soundEnabled={soundEnabled}
                      soundVolume={soundVolume * 0.75}
                      timeZone={slot.timeZone}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Standard Grid Layouts (2x2, 3x3, Col1) */}
      {layoutMode !== 'spotlight' && (
        <div
          className={`grid gap-6 ${
            layoutMode === 'col1'
              ? 'grid-cols-1'
              : layoutMode === 'grid2'
              ? 'grid-cols-1 md:grid-cols-2'
              : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
          }`}
        >
          {slots.map((slot) => {
            const rawClock = allClocks.find((c) => c.id === slot.clockId) || allClocks[0];
            const selectedClock = translateClock(rawClock);
            return (
              <div
                key={slot.id}
                className="group relative bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col min-h-[360px]"
              >
                {/* Slot Header Control Overlay */}
                <div className="flex items-center justify-between p-3.5 bg-slate-950/80 border-b border-slate-800/80 z-20 backdrop-blur-md">
                  <select
                    value={slot.clockId}
                    onChange={(e) => handleClockSelect(slot.id, e.target.value)}
                    className="bg-slate-900 text-xs font-bold text-sky-300 border border-slate-700 rounded-xl px-2.5 py-1 focus:outline-none focus:border-sky-500 max-w-[180px] truncate"
                  >
                    {allClocks.map((c) => {
                      const tc = translateClock(c);
                      return (
                        <option key={tc.id} value={tc.id}>
                          {tc.name}
                        </option>
                      );
                    })}
                  </select>

                  <div className="flex items-center space-x-1.5">
                    {/* Timezone */}
                    <select
                      value={slot.timeZone || 'local'}
                      onChange={(e) => handleTimezoneSelect(slot.id, e.target.value)}
                      className="bg-slate-900 text-xs font-bold text-slate-300 border border-slate-700 rounded-xl px-2 py-1 focus:outline-none"
                    >
                      {localizedTimeZones.map((tz) => (
                        <option key={tz.id} value={tz.id}>
                          {tz.flag} {tz.city}
                        </option>
                      ))}
                    </select>

                    {/* Full Size Trigger */}
                    <button
                      onClick={() => onOpenFullSize(selectedClock)}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                      title={t('viewFullscreen')}
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Customize Button */}
                    <button
                      onClick={() => onOpenCustomizer(selectedClock)}
                      className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-lg transition-all"
                      title={t('edit')}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>

                    {/* Remove Slot Button */}
                    {slots.length > 1 && (
                      <button
                        onClick={() => handleRemoveSlot(slot.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-all"
                        title={t('delete')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Slot Live Clock Component */}
                <div className="flex-1 w-full h-full relative">
                  <ClockRenderer
                    clock={selectedClock}
                    soundEnabled={soundEnabled}
                    soundVolume={soundVolume}
                    timeZone={slot.timeZone}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Global Team Timezone & Meeting Overlap Matrix */}
      <TimezoneOverlapMatrix selectedZones={slots.map((s) => s.timeZone || 'local')} />
    </div>
  );
};
