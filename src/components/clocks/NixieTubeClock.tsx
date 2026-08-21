import React, { useEffect, useState } from 'react';
import { ClockConfig } from '../../types';
import { playClockSound } from '../../utils/audioSynth';
import { getZonedDate } from '../../utils/timeUtils';

interface Props {
  config: ClockConfig;
  soundEnabled?: boolean;
  soundVolume?: number;
  timeZone?: string;
  timeOverride?: Date | null;
  isFullSize?: boolean;
}

export const NixieTubeClock: React.FC<Props> = ({
  config,
  soundEnabled = false,
  soundVolume = 0.1,
  timeZone,
  timeOverride,
  isFullSize = false
}) => {
  const [internalTime, setInternalTime] = useState(() => getZonedDate(new Date(), timeZone || config.timeZone));

  useEffect(() => {
    if (timeOverride) return;
    const timer = setInterval(() => {
      const now = getZonedDate(new Date(), timeZone || config.timeZone);
      setInternalTime(now);
      if (soundEnabled && config.soundType) {
        playClockSound(config.soundType, soundVolume);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [soundEnabled, soundVolume, config.soundType, timeZone, config.timeZone, timeOverride]);

  const activeTime = timeOverride ? getZonedDate(timeOverride, timeZone || config.timeZone) : internalTime;
  const hours = activeTime.getHours();
  const minutes = activeTime.getMinutes();
  const seconds = activeTime.getSeconds();

  const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}${
    config.showSeconds ? `:${seconds.toString().padStart(2, '0')}` : ''
  }`;

  return (
    <div
      className="relative w-full h-full min-h-[300px] flex flex-col items-center justify-center p-6 rounded-2xl select-none overflow-hidden"
      style={{
        backgroundColor: config.bgColor,
        color: config.textColor,
        fontFamily: 'monospace'
      }}
    >
      {/* Wood / Bakelite Base Box */}
      <div className="relative bg-gradient-to-b from-stone-900 to-amber-950 p-6 rounded-2xl border-2 border-amber-900/60 shadow-2xl flex flex-col items-center">
        {/* Brass Screws at Corners */}
        <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-amber-600/80 border border-amber-800" />
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-600/80 border border-amber-800" />
        <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-amber-600/80 border border-amber-800" />
        <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-amber-600/80 border border-amber-800" />

        <div className="text-[10px] font-mono tracking-widest text-amber-500/80 mb-3 uppercase">
          IN-14 GLAS VACUUM NIXIE CHRONO
        </div>

        {/* Tube Glass Cylinders */}
        <div className="flex items-center space-x-2 sm:space-x-3 my-2">
          {timeStr.split('').map((char, idx) => {
            if (char === ':') {
              return (
                <div key={`colon-${idx}`} className="flex flex-col space-y-2 py-4">
                  <div
                    className="w-2.5 h-2.5 rounded-full animate-pulse shadow-md"
                    style={{ backgroundColor: config.accentColor, boxShadow: `0 0 10px ${config.accentColor}` }}
                  />
                  <div
                    className="w-2.5 h-2.5 rounded-full animate-pulse shadow-md"
                    style={{ backgroundColor: config.accentColor, boxShadow: `0 0 10px ${config.accentColor}` }}
                  />
                </div>
              );
            }

            return (
              <div
                key={`nixie-${idx}`}
                className="relative w-10 h-20 sm:w-14 sm:h-28 rounded-t-full rounded-b-lg bg-gradient-to-b from-amber-500/10 via-orange-950/40 to-black border border-amber-500/30 flex flex-col items-center justify-center shadow-2xl overflow-hidden backdrop-blur-sm"
              >
                {/* Internal Wire Mesh Pattern */}
                <div className="absolute inset-0 bg-[radial-gradient(#ffaa00_1px,transparent_1px)] [background-size:4px_4px] opacity-15 pointer-events-none" />

                {/* Glowing Filament Digit */}
                <span
                  className="text-3xl sm:text-5xl font-mono font-bold tracking-tighter transition-all duration-300 z-10"
                  style={{
                    color: config.accentColor,
                    textShadow: `0 0 12px ${config.accentColor}, 0 0 24px ${config.accentColor}, 0 0 36px #ff5500`
                  }}
                >
                  {char}
                </span>

                {/* Bottom Base Anode Ring */}
                <div className="absolute bottom-1 w-8 sm:w-11 h-2 rounded-full bg-gradient-to-r from-amber-700 via-amber-500 to-amber-800 opacity-60" />
              </div>
            );
          })}
        </div>

        {config.customText && (
          <div className="mt-3 text-xs font-mono text-amber-400/80 tracking-widest uppercase">
            {config.customText}
          </div>
        )}
      </div>
    </div>
  );
};
