import React, { useState } from 'react';
import { getLocalizedTimeZones, TimeZoneOption, getZonedDate } from '../utils/timeUtils';
import { Globe, Check, Clock } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface Props {
  selectedZones?: string[];
}

export const TimezoneOverlapMatrix: React.FC<Props> = ({
  selectedZones = ['local', 'Europe/Amsterdam', 'America/New_York', 'Asia/Tokyo']
}) => {
  const { t } = useLanguage();
  const localizedZones = getLocalizedTimeZones(t);
  const [activeHour, setActiveHour] = useState<number>(new Date().getHours());
  const [activeZones, setActiveZones] = useState<string[]>(selectedZones);

  // 24 hours of the day (0 to 23)
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getZoneInfo = (id: string): TimeZoneOption => {
    return (
      localizedZones.find((z) => z.id === id) || {
        id,
        label: id,
        city: id.split('/').pop()?.replace('_', ' ') || id,
        flag: '📍'
      }
    );
  };

  const getHourForZone = (baseUtcHour: number, zoneId: string): number => {
    // Construct a date with UTC hour base
    const now = new Date();
    const utcDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), baseUtcHour, 0, 0));
    const localZoned = getZonedDate(utcDate, zoneId);
    return localZoned.getHours();
  };

  // Is this working hours (9 AM to 6 PM) in the given time zone?
  const isWorkingHour = (localH: number): boolean => {
    return localH >= 9 && localH <= 17;
  };

  // Is this core overlap (everyone in working hours)?
  const isOptimalSlot = (h: number): boolean => {
    return activeZones.every((zid) => {
      const zh = getHourForZone(h, zid);
      return isWorkingHour(zh);
    });
  };

  const toggleZone = (id: string) => {
    if (activeZones.includes(id)) {
      if (activeZones.length > 2) {
        setActiveZones(activeZones.filter((z) => z !== id));
      }
    } else {
      setActiveZones([...activeZones, id]);
    }
  };

  return (
    <div
      id="timezone-overlap-matrix"
      className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-6 backdrop-blur-xl shadow-2xl"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <Globe className="w-5 h-5 text-sky-400" />
            <h3 className="text-lg font-bold text-white tracking-tight">
              {t('tzOverlapTitle')}
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('tzOverlapSubtitle')}
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center space-x-1.5">
            <div className="w-3 h-3 rounded bg-emerald-500/80 shadow-sm shadow-emerald-500/30" />
            <span className="text-slate-300 text-[11px] font-medium">{t('tzWorkHours')}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-3 h-3 rounded bg-amber-500/80 shadow-sm shadow-amber-500/30" />
            <span className="text-slate-300 text-[11px] font-medium">Optimal Overlap</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-3 h-3 rounded bg-slate-800 border border-slate-700" />
            <span className="text-slate-400 text-[11px]">Off-Hours / Night</span>
          </div>
        </div>
      </div>

      {/* Zone Selector Pills */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {localizedZones.map((z) => {
          const isSelected = activeZones.includes(z.id);
          return (
            <button
              key={z.id}
              onClick={() => toggleZone(z.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center space-x-1.5 ${
                isSelected
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                  : 'bg-slate-800/60 text-slate-400 border border-slate-700/50 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <span>{z.flag}</span>
              <span>{z.city}</span>
              {isSelected && <Check className="w-3 h-3 ml-1" />}
            </button>
          );
        })}
      </div>

      {/* 24-Hour Timeline Matrix */}
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[700px] space-y-2">
          {/* Header Hour Numbers */}
          <div className="grid grid-cols-[140px_repeat(24,1fr)] gap-1 text-[10px] font-mono text-slate-400 px-1">
            <div className="font-bold uppercase tracking-wider text-slate-500">UTC / TIMELINE</div>
            {hours.map((h) => {
              const isSelected = activeHour === h;
              return (
                <div
                  key={h}
                  onClick={() => setActiveHour(h)}
                  className={`text-center py-1 rounded cursor-pointer transition-all ${
                    isSelected ? 'bg-sky-500 text-white font-black' : 'hover:bg-slate-800'
                  }`}
                >
                  {h.toString().padStart(2, '0')}
                </div>
              );
            })}
          </div>

          {/* Rows for each active time zone */}
          {activeZones.map((zoneId) => {
            const zInfo = getZoneInfo(zoneId);
            return (
              <div
                key={zoneId}
                className="grid grid-cols-[140px_repeat(24,1fr)] gap-1 items-center bg-slate-950/60 p-1.5 rounded-xl border border-slate-800/80"
              >
                {/* Zone Label */}
                <div className="flex items-center space-x-1.5 pr-2 overflow-hidden">
                  <span className="text-sm">{zInfo.flag}</span>
                  <span className="text-xs font-bold text-slate-200 truncate">{zInfo.city}</span>
                </div>

                {/* 24 Hour Slots */}
                {hours.map((h) => {
                  const localH = getHourForZone(h, zoneId);
                  const isWork = isWorkingHour(localH);
                  const isOptimal = isOptimalSlot(h);
                  const isHighlighted = activeHour === h;

                  let bgClass = 'bg-slate-900/60 text-slate-600';
                  if (isWork) {
                    bgClass = isOptimal
                      ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium';
                  }

                  return (
                    <div
                      key={h}
                      onClick={() => setActiveHour(h)}
                      className={`h-8 rounded flex items-center justify-center text-[10px] font-mono cursor-pointer transition-all ${bgClass} ${
                        isHighlighted ? 'ring-2 ring-sky-400 z-10 scale-105' : 'hover:opacity-80'
                      }`}
                      title={`${zInfo.city}: ${localH.toString().padStart(2, '0')}:00`}
                    >
                      {localH}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Slot Summary Card */}
      <div className="mt-4 p-3 bg-slate-950/80 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-sky-400" />
          <span className="text-slate-300 font-medium">
            UTC {activeHour.toString().padStart(2, '0')}:00 Slot Times:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
          {activeZones.map((zid) => {
            const zInfo = getZoneInfo(zid);
            const lh = getHourForZone(activeHour, zid);
            const isWork = isWorkingHour(lh);
            return (
              <div
                key={zid}
                className={`px-2.5 py-1 rounded-lg border flex items-center space-x-1.5 ${
                  isWork
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <span>{zInfo.flag}</span>
                <span className="font-semibold">{zInfo.city}:</span>
                <span>{lh.toString().padStart(2, '0')}:00</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
