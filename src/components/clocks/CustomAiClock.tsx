import React, { useEffect, useState } from 'react';
import { ClockConfig } from '../../types';
import { playClockSound } from '../../utils/audioSynth';
import { ParticleBackground } from '../ParticleBackground';
import { getZonedDate } from '../../utils/timeUtils';

interface Props {
  config: ClockConfig;
  soundEnabled?: boolean;
  soundVolume?: number;
  timeZone?: string;
  timeOverride?: Date | null;
  isFullSize?: boolean;
}

export const CustomAiClock: React.FC<Props> = ({
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

  // Analog Hand Angles
  const hourDeg = ((hours % 12) + minutes / 60) * 30;
  const minuteDeg = (minutes + seconds / 60) * 6;
  const secondDeg = seconds * 6;

  return (
    <div
      className="relative w-full h-full min-h-[320px] flex flex-col items-center justify-between p-6 rounded-2xl select-none overflow-hidden transition-all duration-500"
      style={{
        backgroundColor: config.bgColor,
        color: config.textColor,
        fontFamily: config.fontFamily || 'sans-serif'
      }}
    >
      {/* Dynamic Particle Overlay */}
      <ParticleBackground type={config.particleEffect || 'none'} accentColor={config.accentColor} />

      {/* Header Tag */}
      <div className="z-10 flex items-center justify-between w-full border-b border-white/10 pb-2">
        <span
          className="text-xs font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full backdrop-blur-md"
          style={{
            backgroundColor: `${config.accentColor}20`,
            color: config.accentColor,
            border: `1px solid ${config.accentColor}40`
          }}
        >
          {config.style || 'Custom Design'}
        </span>
        <span className="text-[10px] opacity-60 font-mono">AI GENERATED</span>
      </div>

      {/* Main Clock Face Display */}
      <div className="relative z-10 my-auto flex flex-col items-center justify-center">
        {/* Analog Face / Disc hybrid */}
        <div
          className="relative w-52 h-52 sm:w-64 sm:h-64 rounded-full border-4 flex items-center justify-center shadow-2xl transition-all duration-500"
          style={{
            borderColor: config.accentColor,
            backgroundColor: `${config.bgColor}dd`,
            boxShadow: config.glowEffect ? `0 0 30px ${config.accentColor}40` : 'none'
          }}
        >
          {/* Dial Hour Markers */}
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={`mark-${i}`}
              className="absolute w-1 h-3.5 rounded-full"
              style={{
                backgroundColor: i % 3 === 0 ? config.accentColor : `${config.secondaryColor}80`,
                transform: `rotate(${i * 30}deg) translateY(-88px)`
              }}
            />
          ))}

          {/* Hour Hand */}
          <div
            className="absolute bottom-1/2 left-1/2 w-1.5 h-16 origin-bottom rounded-full transition-transform duration-500"
            style={{
              backgroundColor: config.accentColor,
              transform: `translateX(-50%) rotate(${hourDeg}deg)`,
              boxShadow: config.glowEffect ? `0 0 8px ${config.accentColor}` : 'none'
            }}
          />

          {/* Minute Hand */}
          <div
            className="absolute bottom-1/2 left-1/2 w-1 h-24 origin-bottom rounded-full transition-transform duration-500"
            style={{
              backgroundColor: config.secondaryColor,
              transform: `translateX(-50%) rotate(${minuteDeg}deg)`
            }}
          />

          {/* Second Hand */}
          {config.showSeconds && (
            <div
              className="absolute bottom-1/2 left-1/2 w-0.5 h-26 origin-bottom rounded-full transition-transform duration-300"
              style={{
                backgroundColor: '#ef4444',
                transform: `translateX(-50%) rotate(${secondDeg}deg)`
              }}
            />
          )}

          {/* Center Pin */}
          <div
            className="absolute w-4 h-4 rounded-full border-2 z-20"
            style={{
              backgroundColor: config.bgColor,
              borderColor: config.accentColor
            }}
          />
        </div>

        {/* Digital Readout */}
        <div className="mt-4 text-center">
          <div
            className="text-2xl sm:text-3xl font-extrabold tracking-widest"
            style={{
              color: config.accentColor,
              textShadow: config.glowEffect ? `0 0 12px ${config.accentColor}80` : 'none'
            }}
          >
            {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}
            {config.showSeconds && <span className="text-sm font-normal opacity-80">:{seconds.toString().padStart(2, '0')}</span>}
          </div>

          {config.customText && (
            <div className="text-xs uppercase opacity-80 mt-1 tracking-wider" style={{ color: config.textColor }}>
              {config.customText}
            </div>
          )}
        </div>
      </div>

      {/* Footer Details */}
      <div className="z-10 text-[10px] font-mono opacity-60 text-center uppercase tracking-widest">
        KlokkenStudio Custom Engine
      </div>
    </div>
  );
};
