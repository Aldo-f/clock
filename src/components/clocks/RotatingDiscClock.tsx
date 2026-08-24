import React, { useEffect, useState, useMemo, useRef } from 'react';
import { ClockConfig } from '../../types';
import { playClockSound } from '../../utils/audioSynth';
import { formatDateLocale } from '../../utils/timeUtils';
import { useZonedClock } from '../../utils/useZonedClock';
import { useLanguage } from '../../i18n/LanguageContext';
import { Eye, Disc, Volume2, VolumeX, Sparkles, RefreshCw } from 'lucide-react';

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
  const { t, language } = useLanguage();
  const [smoothMotion, setSmoothMotion] = useState<boolean>(true);
  const [showReticle, setShowReticle] = useState<boolean>(true);
  const [use24Hour, setUse24Hour] = useState<boolean>(false);
  const [activeAccent, setActiveAccent] = useState<string>(config.accentColor || '#38bdf8');
  const [activeSecondary, setActiveSecondary] = useState<string>(config.secondaryColor || '#f43f5e');
  const [isMuted, setIsMuted] = useState<boolean>(!soundEnabled);

  // Sync state with config changes
  useEffect(() => {
    if (config.accentColor) setActiveAccent(config.accentColor);
    if (config.secondaryColor) setActiveSecondary(config.secondaryColor);
  }, [config.accentColor, config.secondaryColor]);

  useEffect(() => {
    setIsMuted(!soundEnabled);
  }, [soundEnabled]);

  const activeTime = useZonedClock(timeZone || config.timeZone, timeOverride, (now) => {
    if (!isMuted && config.soundType) {
      playClockSound(config.soundType || 'gear_click', soundVolume * 0.8);
    }
  });

  const hours = activeTime.getHours();
  const minutes = activeTime.getMinutes();
  const seconds = activeTime.getSeconds();
  const millis = activeTime.getMilliseconds ? activeTime.getMilliseconds() : 0;

  // Compute rotation angles:
  // 0 deg puts index 0 at the top (12 o'clock reading cursor).
  // Rotating the ring by -angle brings the current value exactly under the 12 o'clock cursor.
  const hoursTotal = use24Hour ? 24 : 12;
  const hourValue = use24Hour ? hours : hours % 12;
  const hourFract = hourValue + minutes / 60 + seconds / 3600;
  const hoursRotation = -hourFract * (360 / hoursTotal);

  const minFract = minutes + (smoothMotion ? seconds / 60 : 0);
  const minutesRotation = -minFract * 6; // 360 / 60 = 6 deg per minute

  const secFract = seconds;
  const secondsRotation = -secFract * 6; // 360 / 60 = 6 deg per second

  // Generate 60 Seconds Disc ticks
  const secondTicks = useMemo(() => {
    return Array.from({ length: 60 }, (_, i) => {
      const isMajor = i % 5 === 0;
      const angle = i * 6;
      return { val: i, angle, isMajor };
    });
  }, []);

  // Generate 60 Minutes Disc ticks
  const minuteTicks = useMemo(() => {
    return Array.from({ length: 60 }, (_, i) => {
      const isMajor = i % 5 === 0;
      const angle = i * 6;
      return { val: i, angle, isMajor };
    });
  }, []);

  // Generate Hours Disc ticks (12 or 24)
  const hourTicks = useMemo(() => {
    const count = use24Hour ? 24 : 12;
    const step = 360 / count;
    return Array.from({ length: count }, (_, i) => {
      const val = use24Hour ? i : i === 0 ? 12 : i;
      const angle = i * step;
      return { val, angle };
    });
  }, [use24Hour]);

  const formattedDate = formatDateLocale(activeTime, language, timeZone);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const timeDisplay = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  return (
    <div
      id="rotating-disc-clock-wrapper"
      className="relative w-full h-full flex flex-col items-center justify-center p-2 sm:p-4 select-none overflow-hidden"
      style={{
        fontFamily: config.fontFamily || "'Space Grotesk', system-ui, -apple-system, sans-serif"
      }}
    >
      {/* PERFECT CIRCLE WATCH INSTRUMENT */}
      <div className="relative w-full aspect-square max-w-[min(100%,560px)] max-h-[min(100%,560px)] flex items-center justify-center">
        {/* SVG Dial Rendering for Pinpoint Mathematical Geometry & Crisp Rendering */}
        <svg
          viewBox="0 0 500 500"
          className="w-full h-full filter drop-shadow-[0_20px_50px_rgba(0,0,0,0.95)]"
        >
          <defs>
            {/* Outer Case Radial Metal Gradient */}
            <radialGradient id="caseMetal" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="85%" stopColor="#0f172a" />
              <stop offset="97%" stopColor="#020617" />
              <stop offset="100%" stopColor="#000000" />
            </radialGradient>

            {/* Dial Face Inner Shadow / Sunken Depth */}
            <radialGradient id="dialDeep" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0f172a" stopOpacity="0.4" />
              <stop offset="60%" stopColor="#090d16" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#020617" stopOpacity="1" />
            </radialGradient>

            {/* Metallic Ring Shading */}
            <linearGradient id="metalBezel" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="25%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#64748b" />
              <stop offset="75%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>

            {/* Glowing Accent Gradient for Laser Reticle */}
            <linearGradient id="laserGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={activeSecondary} stopOpacity="1" />
              <stop offset="70%" stopColor={activeAccent} stopOpacity="0.9" />
              <stop offset="100%" stopColor={activeAccent} stopOpacity="0" />
            </linearGradient>

            {/* Hub Central Metal Brushed Cap */}
            <radialGradient id="hubCap" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="90%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </radialGradient>

            {/* High-Precision Glow Filter */}
            <filter id="accentGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Laser Line Glow */}
            <filter id="laserGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* ======================================================== */}
          {/* 1. SOLID CIRCULAR CHASSIS & OUTER TITANIUM BEZEL        */}
          {/* ======================================================== */}
          {/* Outer Watch Case Outer Rim */}
          <circle cx="250" cy="250" r="246" fill="url(#caseMetal)" stroke="#334155" strokeWidth="2.5" />
          {/* Machined Bezel Channel */}
          <circle cx="250" cy="250" r="240" fill="none" stroke="url(#metalBezel)" strokeWidth="4" />
          <circle cx="250" cy="250" r="236" fill="#030712" stroke="#1e293b" strokeWidth="1.5" />

          {/* 12 Outer Precision Hex Screws / Rivets */}
          {Array.from({ length: 12 }).map((_, i) => {
            const angleRad = (i * 30 * Math.PI) / 180;
            const sx = 250 + 238 * Math.cos(angleRad);
            const sy = 250 + 238 * Math.sin(angleRad);
            return (
              <g key={`screw-${i}`} transform={`translate(${sx}, ${sy})`}>
                <circle r="3" fill="#0f172a" stroke="#64748b" strokeWidth="0.8" />
                <line x1="-2" y1="0" x2="2" y2="0" stroke="#94a3b8" strokeWidth="0.6" />
              </g>
            );
          })}

          {/* Main Dial Basin */}
          <circle cx="250" cy="250" r="232" fill="url(#dialDeep)" />

          {/* Ambient Circular Glow Mesh */}
          <circle
            cx="250"
            cy="250"
            r="190"
            fill="none"
            stroke={activeAccent}
            strokeWidth="0.5"
            strokeOpacity="0.2"
            strokeDasharray="2 6"
          />
          <circle
            cx="250"
            cy="250"
            r="138"
            fill="none"
            stroke={activeSecondary}
            strokeWidth="0.5"
            strokeOpacity="0.25"
          />
          <circle
            cx="250"
            cy="250"
            r="82"
            fill="none"
            stroke={activeAccent}
            strokeWidth="0.5"
            strokeOpacity="0.3"
          />

          {/* ======================================================== */}
          {/* 2. OUTER DISC: SECONDS DISC (R = 232 to 192)            */}
          {/* ======================================================== */}
          {config.showSeconds && (
            <g
              transform={`rotate(${secondsRotation} 250 250)`}
              className={smoothMotion ? 'transition-transform duration-700 ease-out' : ''}
            >
              {/* Outer Ring Track Base */}
              <circle
                cx="250"
                cy="250"
                r="212"
                fill="none"
                stroke="#1e293b"
                strokeWidth="40"
                strokeOpacity="0.4"
              />
              <circle cx="250" cy="250" r="192" fill="none" stroke="#334155" strokeWidth="1" strokeOpacity="0.6" />

              {/* 60 Seconds Graduations */}
              {secondTicks.map((tick) => {
                const angleRad = ((tick.angle - 90) * Math.PI) / 180;
                const isCurrentSec = seconds === tick.val;

                // Major 5s marks
                if (tick.isMajor) {
                  const x1 = 250 + 230 * Math.cos(angleRad);
                  const y1 = 250 + 230 * Math.sin(angleRad);
                  const x2 = 250 + 220 * Math.cos(angleRad);
                  const y2 = 250 + 220 * Math.sin(angleRad);
                  const tx = 250 + 207 * Math.cos(angleRad);
                  const ty = 250 + 207 * Math.sin(angleRad);

                  return (
                    <g key={`sec-${tick.val}`}>
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={isCurrentSec ? activeAccent : '#94a3b8'}
                        strokeWidth={isCurrentSec ? 2.5 : 1.2}
                        strokeOpacity={isCurrentSec ? 1 : 0.6}
                      />
                      <text
                        x={tx}
                        y={ty}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill={isCurrentSec ? activeAccent : '#cbd5e1'}
                        fontSize="10"
                        fontWeight={isCurrentSec ? '900' : '700'}
                        fontFamily="monospace"
                        filter={isCurrentSec ? 'url(#accentGlow)' : undefined}
                        transform={`rotate(${tick.angle} ${tx} ${ty})`}
                      >
                        {pad(tick.val)}
                      </text>
                    </g>
                  );
                }

                // Minor 1s tick mark
                const x1 = 250 + 229 * Math.cos(angleRad);
                const y1 = 250 + 229 * Math.sin(angleRad);
                const x2 = 250 + 224 * Math.cos(angleRad);
                const y2 = 250 + 224 * Math.sin(angleRad);

                return (
                  <line
                    key={`sec-min-${tick.val}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#475569"
                    strokeWidth="0.8"
                    strokeOpacity={isCurrentSec ? 1 : 0.5}
                  />
                );
              })}
            </g>
          )}

          {/* Track Divider Flange 1 */}
          <circle cx="250" cy="250" r="190" fill="none" stroke="#020617" strokeWidth="3" />
          <circle cx="250" cy="250" r="190" fill="none" stroke="#475569" strokeWidth="1" strokeOpacity="0.7" />

          {/* ======================================================== */}
          {/* 3. MIDDLE DISC: MINUTES DISC (R = 190 to 138)           */}
          {/* ======================================================== */}
          <g
            transform={`rotate(${minutesRotation} 250 250)`}
            className={smoothMotion ? 'transition-transform duration-700 ease-out' : ''}
          >
            {/* Minutes Track Base */}
            <circle
              cx="250"
              cy="250"
              r="164"
              fill="none"
              stroke="#0f172a"
              strokeWidth="50"
              strokeOpacity="0.8"
            />
            <circle cx="250" cy="250" r="138" fill="none" stroke="#334155" strokeWidth="1.2" strokeOpacity="0.7" />

            {/* 60 Minute Chapter Indices */}
            {minuteTicks.map((tick) => {
              const angleRad = ((tick.angle - 90) * Math.PI) / 180;
              const isCurrentMin = minutes === tick.val;

              if (tick.isMajor) {
                const x1 = 250 + 188 * Math.cos(angleRad);
                const y1 = 250 + 188 * Math.sin(angleRad);
                const x2 = 250 + 176 * Math.cos(angleRad);
                const y2 = 250 + 176 * Math.sin(angleRad);
                const tx = 250 + 158 * Math.cos(angleRad);
                const ty = 250 + 158 * Math.sin(angleRad);

                return (
                  <g key={`min-${tick.val}`}>
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={isCurrentMin ? activeSecondary : '#cbd5e1'}
                      strokeWidth={isCurrentMin ? 3 : 1.5}
                      strokeOpacity={isCurrentMin ? 1 : 0.7}
                    />
                    <text
                      x={tx}
                      y={ty}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={isCurrentMin ? activeSecondary : '#e2e8f0'}
                      fontSize="12.5"
                      fontWeight={isCurrentMin ? '900' : '800'}
                      filter={isCurrentMin ? 'url(#accentGlow)' : undefined}
                      transform={`rotate(${tick.angle} ${tx} ${ty})`}
                    >
                      {pad(tick.val)}m
                    </text>
                  </g>
                );
              }

              // Minor 1m tick mark
              const x1 = 250 + 187 * Math.cos(angleRad);
              const y1 = 250 + 187 * Math.sin(angleRad);
              const x2 = 250 + 180 * Math.cos(angleRad);
              const y2 = 250 + 180 * Math.sin(angleRad);

              return (
                <line
                  key={`min-tick-${tick.val}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#64748b"
                  strokeWidth="0.9"
                  strokeOpacity="0.4"
                />
              );
            })}
          </g>

          {/* Track Divider Flange 2 */}
          <circle cx="250" cy="250" r="136" fill="none" stroke="#020617" strokeWidth="3" />
          <circle
            cx="250"
            cy="250"
            r="136"
            fill="none"
            stroke={activeAccent}
            strokeWidth="1.2"
            strokeOpacity="0.8"
          />

          {/* ======================================================== */}
          {/* 4. INNER DISC: HOURS CHAPTER RING (R = 136 to 82)       */}
          {/* ======================================================== */}
          <g
            transform={`rotate(${hoursRotation} 250 250)`}
            className={smoothMotion ? 'transition-transform duration-700 ease-out' : ''}
          >
            {/* Hours Track Background Ring */}
            <circle
              cx="250"
              cy="250"
              r="109"
              fill="none"
              stroke="#0b1120"
              strokeWidth="52"
            />
            <circle cx="250" cy="250" r="82" fill="none" stroke="#475569" strokeWidth="1.5" strokeOpacity="0.8" />

            {/* Hour Numerals & Intermediate Subdivision Pips */}
            {hourTicks.map((tick) => {
              const angleRad = ((tick.angle - 90) * Math.PI) / 180;
              const currentHrActive = use24Hour ? hours === tick.val : (hours % 12 || 12) === tick.val;

              const x1 = 250 + 134 * Math.cos(angleRad);
              const y1 = 250 + 134 * Math.sin(angleRad);
              const x2 = 250 + 122 * Math.cos(angleRad);
              const y2 = 250 + 122 * Math.sin(angleRad);
              const tx = 250 + 106 * Math.cos(angleRad);
              const ty = 250 + 106 * Math.sin(angleRad);

              // 15, 30, 45 min sub-ticks between hours
              const stepHalf = (360 / (use24Hour ? 24 : 12)) / 2;
              const halfAngleRad = ((tick.angle + stepHalf - 90) * Math.PI) / 180;
              const hx1 = 250 + 134 * Math.cos(halfAngleRad);
              const hy1 = 250 + 134 * Math.sin(halfAngleRad);
              const hx2 = 250 + 127 * Math.cos(halfAngleRad);
              const hy2 = 250 + 127 * Math.sin(halfAngleRad);

              return (
                <g key={`hr-${tick.val}`}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={currentHrActive ? activeAccent : '#94a3b8'}
                    strokeWidth={currentHrActive ? 3.5 : 2}
                    strokeOpacity={currentHrActive ? 1 : 0.6}
                  />
                  <line
                    x1={hx1}
                    y1={hy1}
                    x2={hx2}
                    y2={hy2}
                    stroke="#475569"
                    strokeWidth="1"
                    strokeOpacity="0.5"
                  />
                  <text
                    x={tx}
                    y={ty}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={currentHrActive ? activeAccent : '#f8fafc'}
                    fontSize={use24Hour ? '13' : '18'}
                    fontWeight={currentHrActive ? '900' : '800'}
                    filter={currentHrActive ? 'url(#accentGlow)' : undefined}
                    transform={`rotate(${tick.angle} ${tx} ${ty})`}
                  >
                    {tick.val}
                  </text>
                </g>
              );
            })}
          </g>

          {/* ======================================================== */}
          {/* 5. CENTER BEARING HUB & HOROLOGICAL CORE MEDALLION      */}
          {/* ======================================================== */}
          {/* Deep Core Shadow */}
          <circle cx="250" cy="250" r="82" fill="#020617" stroke="#0f172a" strokeWidth="2" />
          <circle cx="250" cy="250" r="78" fill="url(#hubCap)" stroke="url(#metalBezel)" strokeWidth="2.5" />
          <circle
            cx="250"
            cy="250"
            r="70"
            fill="none"
            stroke={activeAccent}
            strokeWidth="0.8"
            strokeDasharray="3 4"
            strokeOpacity="0.4"
          />

          {/* Center Digital Readout & Rotor Icon */}
          <g transform="translate(250, 250)">
            {/* Pulsing Rotor Jewel Core */}
            <circle cx="0" cy="-34" r="7" fill="#020617" stroke={activeAccent} strokeWidth="1.5" />
            <circle cx="0" cy="-34" r="3.5" fill={activeSecondary} />

            {/* Time String */}
            <text
              x="0"
              y="-10"
              textAnchor="middle"
              dominantBaseline="central"
              fill="#ffffff"
              fontSize="16"
              fontWeight="900"
              fontFamily="monospace"
              letterSpacing="1"
            >
              {timeDisplay}
            </text>

            {/* AM / PM / 24H Badge */}
            <rect
              x="-24"
              y="6"
              width="48"
              height="14"
              rx="7"
              fill="#0f172a"
              stroke={activeAccent}
              strokeWidth="0.8"
            />
            <text
              x="0"
              y="13.5"
              textAnchor="middle"
              dominantBaseline="central"
              fill={activeAccent}
              fontSize="8.5"
              fontWeight="800"
              fontFamily="monospace"
            >
              {use24Hour ? '24H UTC' : hours >= 12 ? 'PM ACTIVE' : 'AM ACTIVE'}
            </text>

            {/* Horology Signature */}
            <text
              x="0"
              y="34"
              textAnchor="middle"
              dominantBaseline="central"
              fill="#64748b"
              fontSize="7.5"
              fontWeight="700"
              letterSpacing="2"
            >
              CHRONO ROTOR
            </text>
          </g>

          {/* ======================================================== */}
          {/* 6. FIXED 12 O'CLOCK OPTICAL SIGHTER & LASER RETICLE     */}
          {/* ======================================================== */}
          {showReticle && (
            <g id="optical-sighter-12" pointerEvents="none">
              {/* Illuminated Vertical Laser Hairline through All 3 Discs */}
              <line
                x1="250"
                y1="16"
                x2="250"
                y2="175"
                stroke="url(#laserGrad)"
                strokeWidth="2.5"
                strokeLinecap="round"
                filter="url(#laserGlow)"
              />
              <line
                x1="250"
                y1="16"
                x2="250"
                y2="175"
                stroke="#ffffff"
                strokeWidth="0.8"
                strokeOpacity="0.9"
              />

              {/* Precision Top Arrow Pip at Outer Bezel */}
              <polygon
                points="242,12 258,12 250,26"
                fill={activeSecondary}
                filter="url(#laserGlow)"
              />
              <polygon points="244,14 256,14 250,23" fill="#ffffff" />

              {/* Optical Magnifier Pip Marks on Disc Boundaries */}
              <circle cx="250" cy="190" r="3" fill="#ffffff" stroke={activeSecondary} strokeWidth="1.5" />
              <circle cx="250" cy="136" r="3" fill="#ffffff" stroke={activeAccent} strokeWidth="1.5" />
            </g>
          )}

          {/* Subtle Sapphire Crystal Glare Arc */}
          <path
            d="M 60 140 A 240 240 0 0 1 440 140 A 244 244 0 0 0 60 140 Z"
            fill="#ffffff"
            fillOpacity="0.03"
            pointerEvents="none"
          />
        </svg>
      </div>

      {/* COMPACT FLOATING CONTROLS & READOUT (Sleek Horology Console) */}
      <div className="w-full max-w-[500px] mt-2 flex flex-wrap items-center justify-between gap-2 bg-slate-900/90 backdrop-blur-md border border-white/10 px-3.5 py-2 rounded-2xl text-xs shadow-xl">
        {/* Live Date Readout */}
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
          <span className="text-[11px] font-semibold text-slate-300 capitalize">{formattedDate}</span>
        </div>

        {/* Quick Instrument Controls */}
        <div className="flex items-center space-x-1.5">
          {/* Laser Sight Toggle */}
          <button
            onClick={() => setShowReticle(!showReticle)}
            className={`px-2.5 py-1 rounded-xl border text-[10.5px] font-bold transition-all flex items-center space-x-1 ${
              showReticle
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                : 'bg-slate-950 text-slate-500 border-slate-800'
            }`}
            title={t('discToggleSight')}
          >
            <Eye className="w-3 h-3" />
            <span>{showReticle ? t('discReticleOn') : t('discReticleOff')}</span>
          </button>

          {/* 12H / 24H Toggle */}
          <button
            onClick={() => setUse24Hour(!use24Hour)}
            className={`px-2 py-1 rounded-xl border text-[10.5px] font-mono font-bold transition-all ${
              use24Hour
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                : 'bg-slate-950 text-slate-400 border-slate-800'
            }`}
            title={t('discToggle1224')}
          >
            {use24Hour ? '24H' : '12H'}
          </button>

          {/* Smooth / Stepped Motion */}
          <button
            onClick={() => setSmoothMotion(!smoothMotion)}
            className={`px-2 py-1 rounded-xl border text-[10.5px] font-bold transition-all ${
              smoothMotion
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                : 'bg-slate-950 text-slate-500 border-slate-800'
            }`}
            title={t('discToggleSmooth')}
          >
            {smoothMotion ? t('discSmooth') : t('discStepped')}
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-1.5 rounded-xl border transition-all ${
              !isMuted
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-950 text-slate-500 border-slate-800'
            }`}
            title={isMuted ? t('discSoundUnmute') : t('discSoundMute')}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Quick Palette Toggles */}
          <div className="flex items-center space-x-1 pl-1 border-l border-white/10">
            {[
              { accent: '#38bdf8', sec: '#f43f5e', labelKey: 'discPaletteCyberpunk' as const },
              { accent: '#f59e0b', sec: '#ef4444', labelKey: 'discPaletteHorology' as const },
              { accent: '#10b981', sec: '#06b6d4', labelKey: 'discPaletteEmerald' as const },
              { accent: '#e2e8f0', sec: '#94a3b8', labelKey: 'discPaletteBauhaus' as const }
            ].map((p) => (
              <button
                key={p.accent}
                onClick={() => {
                  setActiveAccent(p.accent);
                  setActiveSecondary(p.sec);
                }}
                className={`w-3.5 h-3.5 rounded-full border transition-all ${
                  activeAccent === p.accent
                    ? 'scale-125 border-white shadow-md'
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
                style={{
                  background: `linear-gradient(135deg, ${p.accent}, ${p.sec})`
                }}
                title={t(p.labelKey)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
