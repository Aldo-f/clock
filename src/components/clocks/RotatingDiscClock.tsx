import React, { useEffect, useState, useMemo } from 'react';
import { ClockConfig } from '../../types';
import { playClockSound } from '../../utils/audioSynth';
import { getZonedDate, formatDateLocale } from '../../utils/timeUtils';
import { useLanguage } from '../../i18n/LanguageContext';
import { Compass, Sparkles, Sliders, Disc, Eye, Layers, Gauge } from 'lucide-react';

interface Props {
  config: ClockConfig;
  soundEnabled?: boolean;
  soundVolume?: number;
  timeZone?: string;
  timeOverride?: Date | null;
  isFullSize?: boolean;
}

type DialMode = 'tri_disc' | 'radial_gauge' | 'aperture_minimal';

export const RotatingDiscClock: React.FC<Props> = ({
  config,
  soundEnabled = false,
  soundVolume = 0.15,
  timeZone,
  timeOverride,
  isFullSize = false
}) => {
  const { language } = useLanguage();
  const [internalTime, setInternalTime] = useState(() => getZonedDate(new Date(), timeZone || config.timeZone));
  const [dialMode, setDialMode] = useState<DialMode>('tri_disc');
  const [showReticle, setShowReticle] = useState<boolean>(true);
  const [smoothMotion, setSmoothMotion] = useState<boolean>(true);
  const [activeAccent, setActiveAccent] = useState<string>(config.accentColor || '#38bdf8');
  const [activeSecondary, setActiveSecondary] = useState<string>(config.secondaryColor || '#818cf8');

  useEffect(() => {
    if (config.accentColor) setActiveAccent(config.accentColor);
    if (config.secondaryColor) setActiveSecondary(config.secondaryColor);
  }, [config.accentColor, config.secondaryColor]);

  useEffect(() => {
    if (timeOverride) return;
    const timer = setInterval(() => {
      const now = getZonedDate(new Date(), timeZone || config.timeZone);
      setInternalTime(now);
      if (soundEnabled && config.soundType) {
        // Gear click for high-precision mechanical disc sensation
        playClockSound(config.soundType || 'gear_click', soundVolume);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [soundEnabled, soundVolume, config.soundType, timeZone, config.timeZone, timeOverride]);

  const activeTime = timeOverride ? getZonedDate(timeOverride, timeZone || config.timeZone) : internalTime;
  const hours = activeTime.getHours();
  const minutes = activeTime.getMinutes();
  const seconds = activeTime.getSeconds();
  const millis = activeTime.getMilliseconds ? activeTime.getMilliseconds() : 0;

  // Angles: 0 deg points to top marker (12 o'clock).
  // Rotating the ring by -angle brings the target value under the top crosshair.
  const hourFract = (hours % 12) + minutes / 60 + seconds / 3600;
  const hoursRotation = -hourFract * 30; // 360 / 12 = 30 deg per hour

  const minFract = minutes + seconds / 60;
  const minutesRotation = -minFract * 6; // 360 / 60 = 6 deg per minute

  const secFract = seconds;
  const secondsRotation = -secFract * 6; // 360 / 60 = 6 deg per second

  // Generate full 12 hour ticks and sub-ticks
  const hourTicks = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const val = i === 0 ? 12 : i;
      const angle = i * 30;
      return { val, angle };
    });
  }, []);

  // Generate 60 minute ticks (every 5 is labeled, intermediates are ticks)
  const minuteTicks = useMemo(() => {
    return Array.from({ length: 60 }, (_, i) => {
      const isMajor = i % 5 === 0;
      const angle = i * 6;
      return { val: i, angle, isMajor };
    });
  }, []);

  // Generate 60 second ticks
  const secondTicks = useMemo(() => {
    return Array.from({ length: 60 }, (_, i) => {
      const isMajor = i % 5 === 0;
      const angle = i * 6;
      return { val: i, angle, isMajor };
    });
  }, []);

  const formattedDate = formatDateLocale(activeTime, language, timeZone);
  const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div
      className={`relative w-full h-full flex flex-col items-center justify-between p-3 sm:p-6 select-none ${
        isFullSize ? 'min-h-[600px] max-w-4xl' : 'min-h-[380px] max-w-lg'
      } mx-auto transition-all`}
    >
      {/* Dial Chassis */}
      <div
        className="relative w-full aspect-square max-w-[540px] rounded-full p-4 sm:p-8 flex items-center justify-center border border-slate-800/80 bg-gradient-to-b from-slate-950 via-slate-900 to-black shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden"
        style={{
          fontFamily: config.fontFamily || "'Space Grotesk', system-ui, monospace"
        }}
      >
        {/* Outer Bezel Tachymeter Scale */}
        <div className="absolute inset-2 rounded-full border border-slate-800/60 pointer-events-none" />
        <div className="absolute inset-3 rounded-full border-2 border-dashed border-slate-700/30 pointer-events-none" />

        {/* Ambient Radial Backlight */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none opacity-20"
          style={{
            background: `radial-gradient(circle at center, ${activeAccent}35 0%, transparent 65%)`
          }}
        />

        {/* Reticle / Optical Index Sight at 12 o'clock Top Position */}
        {showReticle && (
          <div className="absolute top-2 sm:top-4 z-40 flex flex-col items-center pointer-events-none">
            {/* Top Laser Arrow */}
            <div
              className="w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-t-[14px] filter drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]"
              style={{ borderTopColor: activeAccent }}
            />
            {/* Illuminated Center Hairline Sighter */}
            <div
              className="w-0.5 h-14 sm:h-20 rounded-full opacity-90"
              style={{
                background: `linear-gradient(to bottom, ${activeAccent}, ${activeSecondary}, transparent)`,
                boxShadow: `0 0 10px ${activeAccent}`
              }}
            />
          </div>
        )}

        {/* Horizontal Alignment Guides (Subtle Horology Wireframe) */}
        <div className="absolute inset-x-4 top-1/2 h-[1px] bg-white/5 pointer-events-none" />
        <div className="absolute inset-y-4 left-1/2 w-[1px] bg-white/5 pointer-events-none" />

        {/* MAIN ROTATING CONCENTRIC DISCS */}
        <div className="relative w-full h-full flex items-center justify-center">
          {/* ======================================================== */}
          {/* 1. OUTER DISC: SECONDS DISC (00 - 59)                   */}
          {/* ======================================================== */}
          {config.showSeconds && (
            <div
              className={`absolute w-full h-full rounded-full border border-slate-700/40 flex items-center justify-center ${
                smoothMotion ? 'transition-transform duration-700 ease-out' : ''
              }`}
              style={{
                transform: `rotate(${secondsRotation}deg)`
              }}
            >
              {secondTicks.map((tick) => {
                const isCurrentSec = seconds === tick.val;
                return (
                  <div
                    key={`sec-tick-${tick.val}`}
                    className="absolute w-full h-full flex justify-center items-start pt-1 pointer-events-none"
                    style={{
                      transform: `rotate(${tick.angle}deg)`
                    }}
                  >
                    {tick.isMajor ? (
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-0.5 h-2.5 rounded-full ${
                            isCurrentSec ? 'scale-125' : 'opacity-40'
                          }`}
                          style={{ backgroundColor: isCurrentSec ? activeAccent : '#94a3b8' }}
                        />
                        <span
                          className={`text-[9px] sm:text-[11px] font-mono font-bold mt-0.5 transform -rotate-${tick.angle} ${
                            isCurrentSec ? 'font-black scale-110' : 'opacity-40'
                          }`}
                          style={{
                            color: isCurrentSec ? activeAccent : '#94a3b8',
                            textShadow: isCurrentSec ? `0 0 8px ${activeAccent}` : 'none'
                          }}
                        >
                          {tick.val.toString().padStart(2, '0')}
                        </span>
                      </div>
                    ) : (
                      <div className="w-[1px] h-1.5 bg-slate-700/60 mt-0.5" />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ======================================================== */}
          {/* 2. MIDDLE DISC: MINUTES DISC (00 - 59)                  */}
          {/* ======================================================== */}
          <div
            className={`absolute w-[76%] h-[76%] rounded-full border-2 border-slate-700/60 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center shadow-inner ${
              smoothMotion ? 'transition-transform duration-700 ease-out' : ''
            }`}
            style={{
              borderColor: `${activeSecondary}50`,
              transform: `rotate(${minutesRotation}deg)`
            }}
          >
            {minuteTicks.map((tick) => {
              const isCurrentMin = minutes === tick.val;
              return (
                <div
                  key={`min-tick-${tick.val}`}
                  className="absolute w-full h-full flex justify-center items-start pt-1 pointer-events-none"
                  style={{
                    transform: `rotate(${tick.angle}deg)`
                  }}
                >
                  {tick.isMajor ? (
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-1 h-3 rounded-full ${
                          isCurrentMin ? 'scale-125' : 'opacity-50'
                        }`}
                        style={{ backgroundColor: isCurrentMin ? activeSecondary : '#cbd5e1' }}
                      />
                      <span
                        className={`text-xs sm:text-sm font-bold tracking-tight mt-0.5 ${
                          isCurrentMin ? 'font-black scale-125' : 'opacity-50'
                        }`}
                        style={{
                          color: isCurrentMin ? activeSecondary : '#cbd5e1',
                          textShadow: isCurrentMin ? `0 0 10px ${activeSecondary}` : 'none'
                        }}
                      >
                        {tick.val.toString().padStart(2, '0')}m
                      </span>
                    </div>
                  ) : (
                    <div className="w-[1px] h-2 bg-slate-700/80 mt-0.5" />
                  )}
                </div>
              );
            })}
          </div>

          {/* ======================================================== */}
          {/* 3. INNER DISC: HOURS DISC (1 - 12)                      */}
          {/* ======================================================== */}
          <div
            className={`absolute w-[50%] h-[50%] rounded-full border-2 bg-slate-900 flex items-center justify-center shadow-2xl ${
              smoothMotion ? 'transition-transform duration-700 ease-out' : ''
            }`}
            style={{
              borderColor: activeAccent,
              boxShadow: config.glowEffect ? `0 0 25px ${activeAccent}40, inset 0 0 15px rgba(0,0,0,0.8)` : 'none',
              transform: `rotate(${hoursRotation}deg)`
            }}
          >
            {hourTicks.map((tick) => {
              const currentHr12 = hours % 12 || 12;
              const isCurrentHour = currentHr12 === tick.val;
              return (
                <div
                  key={`hr-tick-${tick.val}`}
                  className="absolute w-full h-full flex justify-center items-start pt-1.5 pointer-events-none"
                  style={{
                    transform: `rotate(${tick.angle}deg)`
                  }}
                >
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-1.5 h-3.5 rounded-full ${
                        isCurrentHour ? 'scale-125' : 'opacity-40'
                      }`}
                      style={{ backgroundColor: isCurrentHour ? activeAccent : '#94a3b8' }}
                    />
                    <span
                      className={`text-sm sm:text-xl font-black mt-0.5 ${
                        isCurrentHour ? 'scale-125' : 'opacity-40'
                      }`}
                      style={{
                        color: isCurrentHour ? activeAccent : '#94a3b8',
                        textShadow: isCurrentHour ? `0 0 14px ${activeAccent}` : 'none'
                      }}
                    >
                      {tick.val}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ======================================================== */}
          {/* 4. CENTER HUB CAP WITH COMPASS BEARING & PRECISION EYE  */}
          {/* ======================================================== */}
          <div
            className="absolute w-16 h-16 sm:w-20 sm:h-20 rounded-full z-30 flex flex-col items-center justify-center border-2 border-white/10 shadow-[0_10px_25px_rgba(0,0,0,0.8)] backdrop-blur-md"
            style={{
              background: 'radial-gradient(circle, #0f172a 30%, #020617 100%)',
              borderColor: `${activeAccent}80`
            }}
          >
            <Disc className="w-5 h-5 text-sky-400 animate-spin" style={{ animationDuration: '30s' }} />
            <span className="text-[9px] font-mono font-black text-slate-300 tracking-tighter uppercase mt-0.5">
              ROTOR
            </span>
          </div>
        </div>
      </div>

      {/* Control Bar & Readout Subtitle */}
      <div className="w-full max-w-[540px] mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/80 backdrop-blur-md border border-white/10 px-4 py-2.5 rounded-2xl text-xs">
        {/* Live Digital Readout */}
        <div className="flex items-center space-x-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse" />
          <div>
            <div className="font-mono text-base font-black text-white tracking-widest flex items-center space-x-1">
              <span>{timeStr}</span>
              <span className="text-[10px] text-sky-400 bg-sky-500/20 px-1.5 py-0.2 rounded font-bold">
                {hours >= 12 ? 'PM' : 'AM'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">{formattedDate}</p>
          </div>
        </div>

        {/* Live Options & Customization Pill Buttons */}
        <div className="flex items-center space-x-2">
          {/* Reticle Sight Toggle */}
          <button
            onClick={() => setShowReticle(!showReticle)}
            className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold transition-all flex items-center space-x-1 ${
              showReticle
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                : 'bg-slate-950 text-slate-500 border-slate-800'
            }`}
            title="Vizier en afleeslijn aan/uit"
          >
            <Eye className="w-3 h-3" />
            <span>Vizier</span>
          </button>

          {/* Smooth / Stepped Animation Toggle */}
          <button
            onClick={() => setSmoothMotion(!smoothMotion)}
            className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold transition-all ${
              smoothMotion
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                : 'bg-slate-950 text-slate-500 border-slate-800'
            }`}
            title="Vloeiende overgang animatie aan/uit"
          >
            {smoothMotion ? 'Vloeiend' : 'Stap'}
          </button>

          {/* Color Palette Switcher */}
          <div className="flex items-center space-x-1 pl-1">
            {[
              { accent: '#38bdf8', sec: '#818cf8', label: 'Cyaan / indigo' },
              { accent: '#f59e0b', sec: '#ef4444', label: 'Amber / rood' },
              { accent: '#10b981', sec: '#06b6d4', label: 'Smaragd / groenblauw' },
              { accent: '#ec4899', sec: '#a855f7', label: 'Magenta / paars' }
            ].map((p) => (
              <button
                key={p.accent}
                onClick={() => {
                  setActiveAccent(p.accent);
                  setActiveSecondary(p.sec);
                }}
                className={`w-4 h-4 rounded-full border transition-all ${
                  activeAccent === p.accent ? 'scale-125 border-white shadow-md' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
                style={{
                  background: `linear-gradient(135deg, ${p.accent}, ${p.sec})`
                }}
                title={p.label}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
