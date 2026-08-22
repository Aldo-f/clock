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

export const MarbleRunClock: React.FC<Props> = ({
  config,
  soundEnabled = false,
  soundVolume = 0.2,
  timeZone,
  timeOverride,
  isFullSize = false
}) => {
  const [internalTime, setInternalTime] = useState(() => getZonedDate(new Date(), timeZone || config.timeZone));
  const [animatingMarble, setAnimatingMarble] = useState<boolean>(false);

  useEffect(() => {
    if (timeOverride) return;
    const timer = setInterval(() => {
      const now = getZonedDate(new Date(), timeZone || config.timeZone);
      // On second 0, trigger marble drop sound/animation
      if (now.getSeconds() === 0) {
        setAnimatingMarble(true);
        if (soundEnabled) {
          playClockSound('marble_roll', soundVolume);
        }
        setTimeout(() => setAnimatingMarble(false), 1200);
      }
      setInternalTime(now);
    }, 1000);
    return () => clearInterval(timer);
  }, [soundEnabled, soundVolume, timeZone, config.timeZone, timeOverride]);

  const activeTime = timeOverride ? getZonedDate(timeOverride, timeZone || config.timeZone) : internalTime;
  const hours = activeTime.getHours() % 12 || 12;
  const minutes = activeTime.getMinutes();
  const seconds = activeTime.getSeconds();

  const minBallsCount = minutes % 5; // 0 to 4 balls
  const min5BallsCount = Math.floor(minutes / 5); // 0 to 11 balls
  const hourBallsCount = hours; // 1 to 12 balls

  const handleManualDrop = () => {
    setAnimatingMarble(true);
    playClockSound('marble_roll', soundVolume * 1.2);
    setTimeout(() => setAnimatingMarble(false), 1200);
  };

  return (
    <div
      className="relative w-full h-full min-h-[360px] flex flex-col justify-between p-5 rounded-2xl select-none overflow-hidden"
      style={{
        backgroundColor: config.bgColor,
        color: config.textColor,
        fontFamily: config.fontFamily || 'sans-serif'
      }}
    >
      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center space-x-2">
          <div
            className="w-3 h-3 rounded-full animate-ping"
            style={{ backgroundColor: config.accentColor }}
          />
          <span className="text-xs font-bold uppercase tracking-wider opacity-80">
            Knikkerbaanklok (rolling ball)
          </span>
        </div>
        <button
          onClick={handleManualDrop}
          className="px-2.5 py-1 text-xs rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 transition-all active:scale-95 flex items-center space-x-1"
        >
          <span>🔮 Rol knikker</span>
        </button>
      </div>

      {/* Kinetic Marble Tracks */}
      <div className="my-auto space-y-4 py-2">
        {/* Track 1: Minutes (1, 2, 3, 4) */}
        <div className="bg-black/30 p-3 rounded-xl border border-white/10 relative">
          <div className="flex justify-between items-center mb-1 text-xs font-semibold">
            <span className="text-amber-400">Niveau 1: minuten (+1 min/bal)</span>
            <span className="font-mono text-amber-300 font-bold">{minBallsCount} / 4 ballen</span>
          </div>

          <div className="relative h-10 bg-stone-900/80 rounded-lg border-b-4 border-amber-600/60 flex items-center px-3 space-x-3 overflow-hidden shadow-inner">
            {/* Guide Track Line */}
            <div className="absolute inset-x-2 bottom-2 h-1 bg-stone-700/80 rounded" />

            {/* Balls on Track */}
            {Array.from({ length: 4 }).map((_, i) => {
              const hasBall = i < minBallsCount;
              return (
                <div
                  key={`min-ball-${i}`}
                  className={`w-6 h-6 rounded-full transition-all duration-500 flex items-center justify-center font-bold text-[9px] shadow-md ${
                    hasBall
                      ? 'scale-100 opacity-100 bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-200 text-stone-950 border border-amber-200'
                      : 'scale-75 opacity-20 bg-stone-700 border border-stone-600'
                  }`}
                  style={{
                    boxShadow: hasBall && config.glowEffect ? `0 0 10px ${config.accentColor}` : 'none'
                  }}
                >
                  {i + 1}
                </div>
              );
            })}

            {/* Animated Rolling Marble when minute turns */}
            {animatingMarble && (
              <div className="absolute left-0 w-6 h-6 rounded-full bg-gradient-to-tr from-yellow-300 to-amber-500 border border-white animate-bounce shadow-lg" />
            )}
          </div>
        </div>

        {/* Track 2: 5-Minutes (5, 10, 15, ..., 55) */}
        <div className="bg-black/30 p-3 rounded-xl border border-white/10">
          <div className="flex justify-between items-center mb-1 text-xs font-semibold">
            <span className="text-sky-400">Niveau 2: 5-minutenblokken</span>
            <span className="font-mono text-sky-300 font-bold">{min5BallsCount * 5} min ({min5BallsCount} / 11)</span>
          </div>

          <div className="relative h-10 bg-stone-900/80 rounded-lg border-b-4 border-sky-600/60 flex items-center px-2 space-x-1.5 overflow-x-auto shadow-inner">
            <div className="absolute inset-x-2 bottom-2 h-1 bg-stone-700/80 rounded" />
            {Array.from({ length: 11 }).map((_, i) => {
              const hasBall = i < min5BallsCount;
              return (
                <div
                  key={`min5-ball-${i}`}
                  className={`w-5 h-5 rounded-full transition-all duration-500 flex-shrink-0 flex items-center justify-center font-bold text-[8px] ${
                    hasBall
                      ? 'scale-100 opacity-100 bg-gradient-to-tr from-sky-600 via-cyan-300 to-sky-100 text-slate-950 border border-cyan-200'
                      : 'scale-75 opacity-20 bg-stone-700 border border-stone-600'
                  }`}
                >
                  {(i + 1) * 5}
                </div>
              );
            })}
          </div>
        </div>

        {/* Track 3: Hours (1 to 12) */}
        <div className="bg-black/30 p-3 rounded-xl border border-white/10">
          <div className="flex justify-between items-center mb-1 text-xs font-semibold">
            <span className="text-rose-400">Niveau 3: uren (1 tot 12)</span>
            <span className="font-mono text-rose-300 font-bold">{hours} uur ({hourBallsCount} / 12)</span>
          </div>

          <div className="relative h-10 bg-stone-900/80 rounded-lg border-b-4 border-rose-600/60 flex items-center px-2 space-x-1.5 overflow-x-auto shadow-inner">
            <div className="absolute inset-x-2 bottom-2 h-1 bg-stone-700/80 rounded" />
            {Array.from({ length: 12 }).map((_, i) => {
              const hasBall = i < hourBallsCount;
              return (
                <div
                  key={`hr-ball-${i}`}
                  className={`w-5 h-5 rounded-full transition-all duration-500 flex-shrink-0 flex items-center justify-center font-bold text-[8px] ${
                    hasBall
                      ? 'scale-100 opacity-100 bg-gradient-to-tr from-rose-600 via-pink-400 to-rose-100 text-stone-950 border border-rose-200'
                      : 'scale-75 opacity-20 bg-stone-700 border border-stone-600'
                  }`}
                >
                  {i + 1}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer Readout */}
      <div className="border-t border-white/10 pt-2 flex items-center justify-between">
        <div className="text-xs font-mono opacity-70">
          Seconden tik: <span className="font-bold text-amber-400">{seconds}s</span>
        </div>
        <div className="text-lg font-mono font-bold tracking-widest" style={{ color: config.accentColor }}>
          {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}
          {config.showSeconds && <span className="text-xs font-normal opacity-80">:{seconds.toString().padStart(2, '0')}</span>}
        </div>
      </div>
    </div>
  );
};
