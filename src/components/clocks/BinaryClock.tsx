import React, { useState } from 'react';
import { ClockConfig } from '../../types';
import { playClockSound } from '../../utils/audioSynth';
import { useZonedClock } from '../../utils/useZonedClock';
import { useLanguage } from '../../i18n/LanguageContext';

interface Props {
  config: ClockConfig;
  soundEnabled?: boolean;
  soundVolume?: number;
  timeZone?: string;
  timeOverride?: Date | null;
  isFullSize?: boolean;
}

export const BinaryClock: React.FC<Props> = ({
  config,
  soundEnabled = false,
  soundVolume = 0.15,
  timeZone,
  timeOverride,
  isFullSize = false
}) => {
  const { t } = useLanguage();
  const [mode, setMode] = useState<'bcd' | 'pure'>('bcd');

  const activeTime = useZonedClock(timeZone || config.timeZone, timeOverride, (now) => {
    if (soundEnabled && config.soundType) {
      playClockSound(config.soundType, soundVolume);
    }
  });
  const hours = activeTime.getHours();
  const minutes = activeTime.getMinutes();
  const seconds = activeTime.getSeconds();

  // BCD Digits
  const h1 = Math.floor(hours / 10);
  const h2 = hours % 10;
  const m1 = Math.floor(minutes / 10);
  const m2 = minutes % 10;
  const s1 = Math.floor(seconds / 10);
  const s2 = seconds % 10;

  // Helper to convert number to 4-bit array [8, 4, 2, 1]
  const toBits = (num: number, count: number = 4) => {
    const arr = [];
    for (let i = count - 1; i >= 0; i--) {
      arr.push(((num >> i) & 1) === 1);
    }
    return arr;
  };

  const renderColumn = (val: number, maxBits: number, label: string) => {
    const bits = toBits(val, maxBits);
    const bitValues = maxBits === 4 ? [8, 4, 2, 1] : maxBits === 3 ? [4, 2, 1] : [2, 1];

    return (
      <div className="flex flex-col items-center space-y-2">
        <div className="text-[10px] uppercase font-bold opacity-60 mb-1" style={{ color: config.textColor }}>
          {label}
        </div>
        <div className="flex flex-col space-y-2">
          {bits.map((isOn, idx) => (
            <div
              key={idx}
              className="relative flex items-center justify-center w-7 h-7 sm:w-9 sm:h-9 rounded-full transition-all duration-300"
              style={{
                backgroundColor: isOn ? config.accentColor : `${config.secondaryColor}25`,
                boxShadow: isOn && config.glowEffect ? `0 0 16px ${config.accentColor}` : 'none',
                border: `1.5px solid ${isOn ? config.accentColor : `${config.secondaryColor}50`}`
              }}
            >
              <span
                className="text-[10px] font-mono font-bold"
                style={{ color: isOn ? '#000000' : `${config.textColor}50` }}
              >
                {bitValues[idx]}
              </span>
            </div>
          ))}
        </div>
        <div className="text-xs font-mono font-bold mt-1" style={{ color: config.accentColor }}>
          {val}
        </div>
      </div>
    );
  };

  return (
    <div
      className="relative w-full h-full min-h-[300px] flex flex-col items-center justify-center p-6 rounded-2xl select-none"
      style={{
        backgroundColor: config.bgColor,
        color: config.textColor,
        fontFamily: config.fontFamily || 'monospace'
      }}
    >
      {/* Mode Switcher */}
      <div className="absolute top-3 right-4 flex items-center space-x-1 bg-black/30 p-1 rounded-lg border border-white/10">
        <button
          onClick={() => setMode('bcd')}
          className={`px-2 py-0.5 text-xs rounded transition-all ${
            mode === 'bcd' ? 'bg-sky-500 text-white font-bold' : 'text-gray-400 hover:text-white'
          }`}
        >
          BCD
        </button>
        <button
          onClick={() => setMode('pure')}
          className={`px-2 py-0.5 text-xs rounded transition-all ${
            mode === 'pure' ? 'bg-sky-500 text-white font-bold' : 'text-gray-400 hover:text-white'
          }`}
        >
          24H Pure
        </button>
      </div>

      {/* Binary Grid */}
      <div className="flex items-center justify-center space-x-3 sm:space-x-6 my-auto">
        {mode === 'bcd' ? (
          <>
            {/* Hours */}
            <div className="flex space-x-2 bg-white/5 p-3 rounded-xl border border-white/10">
              {renderColumn(h1, 2, 'H1')}
              {renderColumn(h2, 4, 'H2')}
            </div>
            <div className="text-xl font-bold opacity-40 self-center">:</div>
            {/* Minutes */}
            <div className="flex space-x-2 bg-white/5 p-3 rounded-xl border border-white/10">
              {renderColumn(m1, 3, 'M1')}
              {renderColumn(m2, 4, 'M2')}
            </div>
            {config.showSeconds && (
              <>
                <div className="text-xl font-bold opacity-40 self-center">:</div>
                {/* Seconds */}
                <div className="flex space-x-2 bg-white/5 p-3 rounded-xl border border-white/10">
                  {renderColumn(s1, 3, 'S1')}
                  {renderColumn(s2, 4, 'S2')}
                </div>
              </>
            )}
          </>
        ) : (
          /* Pure 24h binary columns */
          <div className="flex space-x-6 bg-white/5 p-4 rounded-xl border border-white/10">
            {renderColumn(hours, 6, t('binaryHoursPure'))}
            {renderColumn(minutes, 6, t('binaryMinutes'))}
            {config.showSeconds && renderColumn(seconds, 6, t('binarySeconds'))}
          </div>
        )}
      </div>

      {/* Digital Footer */}
      <div className="mt-4 text-center">
        <div className="text-2xl font-mono font-bold tracking-widest" style={{ color: config.accentColor }}>
          {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}
          {config.showSeconds && <span>:{seconds.toString().padStart(2, '0')}</span>}
        </div>
        {config.customText && (
          <div className="text-xs uppercase opacity-70 mt-1" style={{ color: config.textColor }}>
            {config.customText}
          </div>
        )}
      </div>
    </div>
  );
};
