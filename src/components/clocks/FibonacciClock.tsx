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

export const FibonacciClock: React.FC<Props> = ({
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
  const hours = activeTime.getHours() % 12 || 12;
  const minutes = activeTime.getMinutes();
  const seconds = activeTime.getSeconds();
  const minUnits = Math.floor(minutes / 5);

  // Fibonacci decomposition solver
  // We have squares with values: [1a, 1b, 2, 3, 5]
  const solveFib = (targetHr: number, targetMin: number) => {
    // Greedy heuristic / precomputed solutions for 1..12
    // Return array of colors for [5, 3, 2, 1b, 1a]
    const fibValues = [5, 3, 2, 1, 1];
    const hrBits = [false, false, false, false, false];
    const minBits = [false, false, false, false, false];

    let remHr = targetHr;
    for (let i = 0; i < 5; i++) {
      if (remHr >= fibValues[i]) {
        hrBits[i] = true;
        remHr -= fibValues[i];
      }
    }

    let remMin = targetMin;
    for (let i = 0; i < 5; i++) {
      if (remMin >= fibValues[i]) {
        minBits[i] = true;
        remMin -= fibValues[i];
      }
    }

    return fibValues.map((val, idx) => {
      const inHr = hrBits[idx];
      const inMin = minBits[idx];
      if (inHr && inMin) return 'blue'; // Both
      if (inHr) return 'red'; // Hour
      if (inMin) return 'green'; // Minute
      return 'none'; // Unused
    });
  };

  const squareColors = solveFib(hours, minUnits);
  // [5, 3, 2, 1b, 1a]
  // 5 = index 0, 3 = index 1, 2 = index 2, 1b = index 3, 1a = index 4

  const getColorClass = (type: string) => {
    if (type === 'red') return 'bg-red-500 border-red-300 text-white shadow-red-500/50';
    if (type === 'green') return 'bg-emerald-500 border-emerald-300 text-white shadow-emerald-500/50';
    if (type === 'blue') return 'bg-blue-600 border-blue-300 text-white shadow-blue-500/50';
    return 'bg-stone-900 border-stone-700 text-stone-500';
  };

  return (
    <div
      className="relative w-full h-full min-h-[320px] flex flex-col items-center justify-between p-5 rounded-2xl select-none"
      style={{
        backgroundColor: config.bgColor,
        color: config.textColor,
        fontFamily: 'monospace'
      }}
    >
      {/* Legend Header */}
      <div className="flex items-center space-x-3 text-[11px] bg-black/40 p-2 rounded-xl border border-white/10">
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span>Rood = Uur</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 rounded bg-emerald-500" />
          <span>Groen = Min (x5)</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 rounded bg-blue-600" />
          <span>Blauw = Beide</span>
        </div>
      </div>

      {/* Fibonacci Golden Grid Layout */}
      <div className="w-full max-w-sm h-48 sm:h-56 grid grid-cols-8 grid-rows-5 gap-1.5 p-2 bg-black/50 rounded-2xl border border-white/10 my-auto shadow-2xl">
        {/* 5-Square (5x5 grid block) */}
        <div
          className={`col-span-5 row-span-5 rounded-xl border-2 flex items-center justify-center font-bold text-xl transition-all duration-500 shadow-lg ${getColorClass(
            squareColors[0]
          )}`}
        >
          5
        </div>

        {/* 3-Square (3x3 grid block) */}
        <div
          className={`col-span-3 row-span-3 rounded-xl border-2 flex items-center justify-center font-bold text-lg transition-all duration-500 shadow-lg ${getColorClass(
            squareColors[1]
          )}`}
        >
          3
        </div>

        {/* 2-Square (2x2 grid block) */}
        <div
          className={`col-span-2 row-span-2 rounded-xl border-2 flex items-center justify-center font-bold text-sm transition-all duration-500 shadow-lg ${getColorClass(
            squareColors[2]
          )}`}
        >
          2
        </div>

        {/* 1b-Square (1x1) */}
        <div
          className={`col-span-1 row-span-1 rounded-lg border flex items-center justify-center font-bold text-xs transition-all duration-500 ${getColorClass(
            squareColors[3]
          )}`}
        >
          1
        </div>

        {/* 1a-Square (1x1) */}
        <div
          className={`col-span-1 row-span-1 rounded-lg border flex items-center justify-center font-bold text-xs transition-all duration-500 ${getColorClass(
            squareColors[4]
          )}`}
        >
          1
        </div>
      </div>

      {/* Time Readout */}
      <div className="text-center">
        <div className="text-xl font-mono font-bold tracking-widest text-sky-400">
          {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}
          {config.showSeconds && <span className="text-xs font-normal opacity-70">:{seconds.toString().padStart(2, '0')}</span>}
        </div>
        <div className="text-[10px] opacity-60 mt-0.5">
          Som: (Rood + Blauw) Uren & (Groen + Blauw)×5 Min
        </div>
      </div>
    </div>
  );
};
