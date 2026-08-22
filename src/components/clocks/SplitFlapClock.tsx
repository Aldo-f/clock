import React, { useEffect, useState, useRef } from 'react';
import { ClockConfig } from '../../types';
import { playClockSound } from '../../utils/audioSynth';
import { getZonedDate } from '../../utils/timeUtils';
import { useLanguage } from '../../i18n/LanguageContext';

interface Props {
  config: ClockConfig;
  soundEnabled?: boolean;
  soundVolume?: number;
  timeZone?: string;
  timeOverride?: Date | null;
  isFullSize?: boolean;
}

interface FlapDigitProps {
  currentVal: string;
  prevVal: string;
  label?: string;
  accentColor?: string;
  isSeconds?: boolean;
  isFullSize?: boolean;
}

const FlapCard: React.FC<FlapDigitProps> = ({ currentVal, prevVal, label, accentColor = '#f59e0b', isSeconds = false, isFullSize = false }) => {
  const isFlipping = currentVal !== prevVal;

  return (
    <div className="flex flex-col items-center">
      {/* 3D Split Flap Module */}
      <div
        className={`relative ${
          isFullSize
            ? isSeconds
              ? 'w-14 sm:w-20 h-24 sm:h-32 text-4xl sm:text-6xl'
              : 'w-20 sm:w-32 h-28 sm:h-44 text-5xl sm:text-8xl'
            : isSeconds
            ? 'w-10 sm:w-12 h-16 sm:h-20 text-2xl sm:text-3xl'
            : 'w-14 sm:w-20 h-20 sm:h-28 text-3xl sm:text-5xl'
        } bg-gradient-to-b from-neutral-900 via-neutral-950 to-black rounded-xl sm:rounded-2xl border border-neutral-800 shadow-2xl flex items-center justify-center font-mono font-black select-none perspective-1000 overflow-hidden`}
        style={{
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 10px 25px -5px rgba(0,0,0,0.8), 0 0 15px rgba(0,0,0,0.5)'
        }}
      >
        {/* Top Half of current card */}
        <div className="absolute top-0 left-0 right-0 h-1/2 bg-neutral-900 border-b border-black overflow-hidden flex items-end justify-center rounded-t-xl sm:rounded-t-2xl">
          <span className="translate-y-1/2 leading-none" style={{ color: isSeconds ? '#94a3b8' : '#f8fafc' }}>
            {currentVal}
          </span>
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
        </div>

        {/* Bottom Half of current card */}
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-neutral-950 overflow-hidden flex items-start justify-center rounded-b-xl sm:rounded-b-2xl">
          <span className="-translate-y-1/2 leading-none" style={{ color: isSeconds ? '#94a3b8' : '#f8fafc' }}>
            {currentVal}
          </span>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
        </div>

        {/* Center Hinge & Split Line */}
        <div className="absolute top-1/2 left-0 right-0 h-[2px] -translate-y-1/2 bg-black z-20 shadow-md">
          <div className="absolute left-1 -top-1 w-1.5 h-2.5 bg-neutral-700 rounded-sm" />
          <div className="absolute right-1 -top-1 w-1.5 h-2.5 bg-neutral-700 rounded-sm" />
        </div>

        {/* Corner Rivets */}
        <div className="absolute top-1.5 left-1.5 w-1 h-1 rounded-full bg-neutral-700 opacity-60" />
        <div className="absolute top-1.5 right-1.5 w-1 h-1 rounded-full bg-neutral-700 opacity-60" />
        <div className="absolute bottom-1.5 left-1.5 w-1 h-1 rounded-full bg-neutral-700 opacity-60" />
        <div className="absolute bottom-1.5 right-1.5 w-1 h-1 rounded-full bg-neutral-700 opacity-60" />
      </div>

      {label && (
        <span className="mt-2 text-[10px] sm:text-xs uppercase font-bold tracking-widest text-slate-500 font-mono">
          {label}
        </span>
      )}
    </div>
  );
};

export const SplitFlapClock: React.FC<Props> = ({
  config,
  soundEnabled = false,
  soundVolume = 0.15,
  timeZone,
  timeOverride,
  isFullSize = false
}) => {
  const { t } = useLanguage();
  const [date, setDate] = useState<Date>(new Date());
  const prevDateRef = useRef<Date>(new Date());

  useEffect(() => {
    if (timeOverride) {
      setDate(timeOverride);
      return;
    }
    const timer = setInterval(() => {
      const now = new Date();
      prevDateRef.current = date;
      setDate(now);
      if (soundEnabled) {
        playClockSound('split_flap', soundVolume);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [date, soundEnabled, soundVolume, timeOverride]);

  const activeDate = timeOverride || date;
  const prevDate = prevDateRef.current;

  const currentZoned = getZonedDate(activeDate, timeZone || config.timeZone);
  const prevZoned = getZonedDate(prevDate, timeZone || config.timeZone);

  const pad = (n: number) => n.toString().padStart(2, '0');

  const curH = pad(currentZoned.getHours());
  const prevH = pad(prevZoned.getHours());

  const curM = pad(currentZoned.getMinutes());
  const prevM = pad(prevZoned.getMinutes());

  const curS = pad(currentZoned.getSeconds());
  const prevS = pad(prevZoned.getSeconds());

  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const dayStr = days[currentZoned.getDay()];
  const ampm = currentZoned.getHours() >= 12 ? 'PM' : 'AM';

  return (
    <div
      id="split-flap-clock"
      className="relative w-full h-full flex flex-col items-center justify-center p-4 select-none"
      style={{
        backgroundColor: config.bgColor || '#090a0f',
        color: config.textColor || '#f8fafc',
        fontFamily: config.fontFamily || 'monospace'
      }}
    >
      {/* Destination Board Header Frame */}
      <div className="mb-4 sm:mb-6 px-4 py-1.5 rounded-full bg-neutral-900/90 border border-neutral-800 flex items-center space-x-3 text-xs font-mono">
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
        <span className="font-black text-amber-400 tracking-wider">
          {config.customText || t('splitFlapTitle')}
        </span>
        <span className="text-slate-500">|</span>
        <span className="text-slate-400 font-bold">{dayStr}</span>
        <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-amber-300 font-bold text-[10px]">
          {ampm}
        </span>
      </div>

      {/* Split Flap Modules Row */}
      <div className="flex items-center space-x-2 sm:space-x-4 bg-neutral-950/80 p-3 sm:p-6 rounded-2xl sm:rounded-3xl border border-neutral-800 shadow-2xl backdrop-blur-xl">
        {/* Hours */}
        <div className="flex space-x-1 sm:space-x-2">
          <FlapCard
            currentVal={curH[0]}
            prevVal={prevH[0]}
            isFullSize={isFullSize}
            accentColor={config.accentColor}
          />
          <FlapCard
            currentVal={curH[1]}
            prevVal={prevH[1]}
            label={t('splitFlapHours')}
            isFullSize={isFullSize}
            accentColor={config.accentColor}
          />
        </div>

        {/* Separator Colon */}
        <div className="flex flex-col space-y-3 sm:space-y-4 px-0.5 sm:px-1">
          <div className="w-2 sm:w-3.5 h-2 sm:h-3.5 rounded-full bg-amber-400 shadow-md shadow-amber-500/50" />
          <div className="w-2 sm:w-3.5 h-2 sm:h-3.5 rounded-full bg-amber-400 shadow-md shadow-amber-500/50" />
        </div>

        {/* Minutes */}
        <div className="flex space-x-1 sm:space-x-2">
          <FlapCard
            currentVal={curM[0]}
            prevVal={prevM[0]}
            isFullSize={isFullSize}
            accentColor={config.accentColor}
          />
          <FlapCard
            currentVal={curM[1]}
            prevVal={prevM[1]}
            label={t('splitFlapMinutes')}
            isFullSize={isFullSize}
            accentColor={config.accentColor}
          />
        </div>

        {/* Seconds */}
        {config.showSeconds && (
          <>
            <div className="flex flex-col space-y-3 sm:space-y-4 px-0.5 sm:px-1">
              <div className="w-1.5 sm:w-2.5 h-1.5 sm:h-2.5 rounded-full bg-slate-600" />
              <div className="w-1.5 sm:w-2.5 h-1.5 sm:h-2.5 rounded-full bg-slate-600" />
            </div>

            <div className="flex space-x-1 sm:space-x-1.5">
              <FlapCard
                currentVal={curS[0]}
                prevVal={prevS[0]}
                isSeconds
                isFullSize={isFullSize}
                accentColor={config.accentColor}
              />
              <FlapCard
                currentVal={curS[1]}
                prevVal={prevS[1]}
                label={t('splitFlapSeconds')}
                isSeconds
                isFullSize={isFullSize}
                accentColor={config.accentColor}
              />
            </div>
          </>
        )}
      </div>

      {/* Station / Board Subtext */}
      <div className="mt-4 flex items-center space-x-2 text-[11px] text-slate-500 font-mono">
        <span>BOARD NO. CLK-77B</span>
        <span>•</span>
        <span className="text-slate-400 uppercase font-semibold">{t('splitFlapMechanical')}</span>
      </div>
    </div>
  );
};
