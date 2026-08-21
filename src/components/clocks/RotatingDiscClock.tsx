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

export const RotatingDiscClock: React.FC<Props> = ({
  config,
  soundEnabled = false,
  soundVolume = 0.15,
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

  // Rotation angles so the current number aligns at top (0 deg / 12 o'clock position)
  // To align number X at top, disc rotates -X * step
  const hoursRotation = -((hours % 12) + minutes / 60) * (360 / 12);
  const minutesRotation = -(minutes + seconds / 60) * (360 / 60);
  const secondsRotation = -seconds * (360 / 60);

  // Generate hour marks 1 to 12
  const hourMarks = Array.from({ length: 12 }, (_, i) => i === 0 ? 12 : i);
  // Generate minute marks 0 to 59
  const minuteMarks = Array.from({ length: 12 }, (_, i) => i * 5);
  // Generate second marks
  const secondMarks = Array.from({ length: 12 }, (_, i) => i * 5);

  return (
    <div
      className="relative w-full h-full min-h-[300px] flex flex-col items-center justify-center overflow-hidden p-4 rounded-2xl select-none"
      style={{
        backgroundColor: config.bgColor,
        color: config.textColor,
        fontFamily: config.fontFamily || 'monospace'
      }}
    >
      {/* Indicator Marker at Top */}
      <div className="absolute top-4 z-30 flex flex-col items-center">
        <div
          className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[14px]"
          style={{ borderTopColor: config.accentColor }}
        />
        <div
          className="w-1 h-8 rounded-full shadow-lg"
          style={{ backgroundColor: config.accentColor, boxShadow: config.glowEffect ? `0 0 12px ${config.accentColor}` : 'none' }}
        />
      </div>

      {/* Main Dial Container */}
      <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center my-auto">
        {/* Outer Ring: Seconds Disc */}
        {config.showSeconds && (
          <div
            className="absolute inset-0 rounded-full border-2 border-dashed transition-transform duration-700 ease-out flex items-center justify-center"
            style={{
              borderColor: `${config.accentColor}40`,
              transform: `rotate(${secondsRotation}deg)`
            }}
          >
            {secondMarks.map((val, idx) => {
              const angle = idx * 30; // 12 segments
              return (
                <div
                  key={`sec-${val}`}
                  className="absolute text-xs font-bold transition-all"
                  style={{
                    transform: `rotate(${angle}deg) translateY(-120px) rotate(-${angle}deg)`,
                    color: val === Math.floor(seconds / 5) * 5 ? config.accentColor : `${config.textColor}90`
                  }}
                >
                  {val.toString().padStart(2, '0')}s
                </div>
              );
            })}
          </div>
        )}

        {/* Middle Ring: Minutes Disc */}
        <div
          className="absolute w-48 h-48 sm:w-60 sm:h-60 rounded-full border-2 transition-transform duration-700 ease-out flex items-center justify-center"
          style={{
            borderColor: `${config.secondaryColor}60`,
            transform: `rotate(${minutesRotation}deg)`
          }}
        >
          {minuteMarks.map((val, idx) => {
            const angle = idx * 30;
            return (
              <div
                key={`min-${val}`}
                className="absolute text-sm font-semibold"
                style={{
                  transform: `rotate(${angle}deg) translateY(-88px) rotate(-${angle}deg)`,
                  color: val === Math.floor(minutes / 5) * 5 ? config.secondaryColor : `${config.textColor}dd`
                }}
              >
                {val.toString().padStart(2, '0')}m
              </div>
            );
          })}
        </div>

        {/* Inner Ring: Hours Disc */}
        <div
          className="absolute w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 transition-transform duration-700 ease-out flex items-center justify-center"
          style={{
            borderColor: config.accentColor,
            boxShadow: config.glowEffect ? `0 0 20px ${config.accentColor}50` : 'none',
            transform: `rotate(${hoursRotation}deg)`
          }}
        >
          {hourMarks.map((val, idx) => {
            const angle = idx * 30;
            return (
              <div
                key={`hr-${val}`}
                className="absolute text-base font-extrabold"
                style={{
                  transform: `rotate(${angle}deg) translateY(-54px) rotate(-${angle}deg)`,
                  color: (hours % 12 || 12) === val ? config.accentColor : config.textColor
                }}
              >
                {val}
              </div>
            );
          })}
        </div>

        {/* Center Cap */}
        <div
          className="absolute w-12 h-12 rounded-full z-20 flex items-center justify-center text-xs font-bold shadow-2xl"
          style={{
            backgroundColor: config.bgColor,
            border: `2px solid ${config.accentColor}`,
            color: config.accentColor
          }}
        >
          DISC
        </div>
      </div>

      {/* Digital Readout Subtitle */}
      <div className="mt-2 text-center z-10">
        <div className="text-xl sm:text-2xl font-bold tracking-widest" style={{ color: config.accentColor }}>
          {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}
          {config.showSeconds && <span className="text-sm opacity-80">:{seconds.toString().padStart(2, '0')}</span>}
        </div>
        {config.customText && (
          <div className="text-xs tracking-wider opacity-70 mt-1 uppercase" style={{ color: config.textColor }}>
            {config.customText}
          </div>
        )}
      </div>
    </div>
  );
};
