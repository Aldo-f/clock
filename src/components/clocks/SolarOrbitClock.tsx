import React, { useEffect, useState } from 'react';
import { ClockConfig } from '../../types';
import { playClockSound } from '../../utils/audioSynth';
import { getZonedDate } from '../../utils/timeUtils';
import { Sun, Moon, Sparkles, Compass, Sunrise, Sunset } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface Props {
  config: ClockConfig;
  soundEnabled?: boolean;
  soundVolume?: number;
  timeZone?: string;
  timeOverride?: Date | null;
  isFullSize?: boolean;
}

export const SolarOrbitClock: React.FC<Props> = ({
  config,
  soundEnabled = false,
  soundVolume = 0.15,
  timeZone,
  timeOverride,
  isFullSize = false
}) => {
  const { t } = useLanguage();
  const [date, setDate] = useState<Date>(new Date());

  useEffect(() => {
    if (timeOverride) {
      setDate(timeOverride);
      return;
    }
    const timer = setInterval(() => {
      const now = new Date();
      setDate(now);
      if (soundEnabled && config.soundType) {
        playClockSound(config.soundType, soundVolume);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [soundEnabled, config.soundType, soundVolume, timeOverride]);

  const activeDate = timeOverride || date;
  const zonedDate = getZonedDate(activeDate, timeZone || config.timeZone);

  const hours = zonedDate.getHours();
  const minutes = zonedDate.getMinutes();
  const seconds = zonedDate.getSeconds();
  const milliseconds = zonedDate.getMilliseconds();

  // Fractional 24-hour day progress (0 to 1)
  const dayProgress = (hours * 3600 + minutes * 60 + seconds) / 86400;

  // Sun orbit angle (0 deg = midnight bottom, 90 deg = sunrise east, 180 deg = solar noon top, 270 deg = sunset west)
  // Shift by -90 deg so noon is at top (-90 + 180 = 90 deg up)
  const sunAngleDeg = (dayProgress * 360 - 90 + 360) % 360;
  const sunAngleRad = (sunAngleDeg * Math.PI) / 180;

  // Moon orbit (opposite side, ~180 deg offset with lunar phase variation)
  const moonAngleDeg = (sunAngleDeg + 180) % 360;
  const moonAngleRad = (moonAngleDeg * Math.PI) / 180;

  // Orbit radius on 400x400 canvas
  const center = 200;
  const orbitRadius = 135;

  const sunX = center + orbitRadius * Math.cos(sunAngleRad);
  const sunY = center + orbitRadius * Math.sin(sunAngleRad);

  const moonX = center + orbitRadius * Math.cos(moonAngleRad);
  const moonY = center + orbitRadius * Math.sin(moonAngleRad);

  // Day / Night state
  const isDay = hours >= 6 && hours < 18;
  const isGoldenHour = (hours === 6 || hours === 17) && minutes >= 30;
  const isTwilight = (hours === 5 || hours === 18) && minutes >= 30;

  // Digital strings
  const pad = (n: number) => n.toString().padStart(2, '0');
  const timeString = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  // Solar phase name
  let phaseName = t('solarPhaseNight');
  if (hours >= 5 && hours < 7) phaseName = t('solarPhaseDawn');
  else if (hours >= 7 && hours < 11) phaseName = t('solarPhaseMorning');
  else if (hours >= 11 && hours < 13) phaseName = t('solarPhaseNoon');
  else if (hours >= 13 && hours < 17) phaseName = t('solarPhaseAfternoon');
  else if (hours >= 17 && hours < 19) phaseName = t('solarPhaseGolden');
  else if (hours >= 19 && hours < 22) phaseName = t('solarPhaseTwilight');

  const accentColor = config.accentColor || '#fbbf24';
  const secondaryColor = config.secondaryColor || '#38bdf8';

  return (
    <div
      id="solar-orbit-clock"
      className="relative w-full h-full flex flex-col items-center justify-center p-4 select-none overflow-hidden"
      style={{
        backgroundColor: config.bgColor || '#050814',
        color: config.textColor || '#f8fafc',
        fontFamily: config.fontFamily || 'monospace'
      }}
    >
      {/* Astrolabe / Celestial Orbit SVG */}
      <div className={`relative ${isFullSize ? 'w-80 sm:w-[460px] h-80 sm:h-[460px]' : 'w-64 h-64 sm:w-72 sm:h-72'}`}>
        <svg
          viewBox="0 0 400 400"
          className="w-full h-full drop-shadow-2xl overflow-visible"
        >
          <defs>
            {/* Sun Glow Gradient */}
            <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="1" />
              <stop offset="40%" stopColor={accentColor} stopOpacity="0.9" />
              <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
            </radialGradient>

            {/* Moon Glow Gradient */}
            <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#e0f2fe" stopOpacity="1" />
              <stop offset="50%" stopColor={secondaryColor} stopOpacity="0.8" />
              <stop offset="100%" stopColor={secondaryColor} stopOpacity="0" />
            </radialGradient>

            {/* Day / Night Ring Gradient */}
            <linearGradient id="dayNightGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={accentColor} stopOpacity="0.3" />
              <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0.6" />
            </linearGradient>

            {/* Ecliptic grid pattern */}
            <radialGradient id="bgRing" cx="50%" cy="50%" r="50%">
              <stop offset="60%" stopColor="#090d1f" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#030712" stopOpacity="0.95" />
            </radialGradient>
          </defs>

          {/* Background Astro Disc */}
          <circle cx="200" cy="200" r="185" fill="url(#bgRing)" stroke="#1e293b" strokeWidth="2" />
          <circle cx="200" cy="200" r="185" fill="none" stroke={secondaryColor} strokeWidth="1" strokeOpacity="0.3" strokeDasharray="4,6" />

          {/* Horizon Line (Sunrise / Sunset plane) */}
          <line
            x1="15"
            y1="200"
            x2="385"
            y2="200"
            stroke="#475569"
            strokeWidth="1.5"
            strokeDasharray="3,3"
          />
          <text x="30" y="194" fill="#64748b" fontSize="9" fontWeight="bold" letterSpacing="1">
            {t('solarEast')}
          </text>
          <text x="270" y="194" fill="#64748b" fontSize="9" fontWeight="bold" letterSpacing="1">
            {t('solarWest')}
          </text>

          {/* Zenith Line (Noon / Midnight) */}
          <line
            x1="200"
            y1="15"
            x2="200"
            y2="385"
            stroke="#334155"
            strokeWidth="1"
            strokeDasharray="2,4"
          />
          <text x="200" y="32" fill={accentColor} fontSize="10" fontWeight="bold" textAnchor="middle">
            ZENITH (12:00 NOON)
          </text>
          <text x="200" y="378" fill="#64748b" fontSize="10" fontWeight="bold" textAnchor="middle">
            NADIR (00:00 MIDNIGHT)
          </text>

          {/* 24-Hour Orbital Ring */}
          <circle
            cx="200"
            cy="200"
            r={orbitRadius}
            fill="none"
            stroke="url(#dayNightGradient)"
            strokeWidth="8"
            className="transition-all"
          />
          <circle
            cx="200"
            cy="200"
            r={orbitRadius}
            fill="none"
            stroke="#334155"
            strokeWidth="1"
          />

          {/* 24 Hour Tick Marks */}
          {Array.from({ length: 24 }).map((_, i) => {
            const angle = ((i * 15 - 90) * Math.PI) / 180;
            const r1 = orbitRadius - 10;
            const r2 = orbitRadius + 10;
            const tx = 200 + (orbitRadius + 22) * Math.cos(angle);
            const ty = 200 + (orbitRadius + 22) * Math.sin(angle);
            const isMajor = i % 3 === 0;

            return (
              <g key={i}>
                <line
                  x1={200 + r1 * Math.cos(angle)}
                  y1={200 + r1 * Math.sin(angle)}
                  x2={200 + r2 * Math.cos(angle)}
                  y2={200 + r2 * Math.sin(angle)}
                  stroke={isMajor ? accentColor : '#475569'}
                  strokeWidth={isMajor ? 2 : 1}
                  strokeOpacity={isMajor ? 0.8 : 0.4}
                />
                {isMajor && (
                  <text
                    x={tx}
                    y={ty + 3}
                    fill={i === 12 ? accentColor : '#94a3b8'}
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {i}:00
                  </text>
                )}
              </g>
            );
          })}

          {/* Seconds Orbit Trail */}
          {config.showSeconds && (
            <circle
              cx="200"
              cy="200"
              r="75"
              fill="none"
              stroke={secondaryColor}
              strokeWidth="2"
              strokeDasharray="4,6"
              strokeOpacity="0.5"
            />
          )}

          {/* Sun Orbital Body */}
          <g transform={`translate(${sunX}, ${sunY})`} className="cursor-pointer">
            <circle cx="0" cy="0" r="28" fill="url(#sunGlow)" />
            <circle cx="0" cy="0" r="14" fill={accentColor} className="animate-pulse" />
            <circle cx="0" cy="0" r="8" fill="#fffbeb" />
            {/* Solar Corona Rays */}
            <circle cx="0" cy="0" r="18" fill="none" stroke="#fde047" strokeWidth="1.5" strokeDasharray="3,3" />
          </g>

          {/* Moon Orbital Body */}
          <g transform={`translate(${moonX}, ${moonY})`}>
            <circle cx="0" cy="0" r="22" fill="url(#moonGlow)" />
            <circle cx="0" cy="0" r="10" fill="#e2e8f0" />
            <circle cx="0" cy="0" r="8" fill="#0f172a" opacity="0.6" transform="translate(3, -1)" />
          </g>

          {/* Earth / Center Chrono Core */}
          <circle cx="200" cy="200" r="48" fill="#0b1329" stroke="#38bdf8" strokeWidth="1.5" />
          <circle cx="200" cy="200" r="42" fill="#030712" />

          {/* Live Orbit Pointer Line */}
          <line
            x1="200"
            y1="200"
            x2={sunX}
            y2={sunY}
            stroke={accentColor}
            strokeWidth="1.5"
            strokeOpacity="0.7"
            strokeDasharray="2,2"
          />
        </svg>

        {/* Center Digital Core Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="flex items-center space-x-1">
            {isDay ? (
              <Sun className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '20s' }} />
            ) : (
              <Moon className="w-3.5 h-3.5 text-sky-300" />
            )}
            <span className="text-[10px] font-bold tracking-widest text-sky-400 uppercase">
              {isDay ? 'DIURNAL' : 'NOCTURNAL'}
            </span>
          </div>

          <div className="text-sm sm:text-base font-black tracking-wider text-white font-mono drop-shadow-md">
            {timeString}
          </div>

          <div className="text-[8px] text-slate-400 font-mono tracking-wider">
            SOLAR ORBIT
          </div>
        </div>
      </div>

      {/* Ephemeris & Solar Phase Info Bar */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 max-w-sm text-center">
        <div className="px-3 py-1 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center space-x-2 text-xs">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-slate-300 font-medium text-[11px]">{phaseName}</span>
        </div>

        <div className="px-2.5 py-1 bg-slate-900/80 border border-slate-800 rounded-xl text-[10px] font-mono text-slate-400">
          ALT: {((Math.sin(sunAngleRad) * 90) * -1).toFixed(1)}°
        </div>
      </div>
    </div>
  );
};
