import React, { useEffect, useRef, useState } from 'react';
import { ClockConfig } from '../../types';
import { playClockSound } from '../../utils/audioSynth';
import { getZonedDate } from '../../utils/timeUtils';
import { Play, Pause, RotateCcw, Sparkles, Grid } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface Props {
  config: ClockConfig;
  soundEnabled?: boolean;
  soundVolume?: number;
  timeZone?: string;
  timeOverride?: Date | null;
  isFullSize?: boolean;
}

const DIGITS_5x5: Record<string, number[][]> = {
  '0': [
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1]
  ],
  '1': [
    [0, 0, 1, 0, 0],
    [0, 1, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 1, 1, 1, 0]
  ],
  '2': [
    [1, 1, 1, 1, 1],
    [0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 1]
  ],
  '3': [
    [1, 1, 1, 1, 1],
    [0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1],
    [0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1]
  ],
  '4': [
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 0, 1]
  ],
  '5': [
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 1],
    [0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1]
  ],
  '6': [
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1]
  ],
  '7': [
    [1, 1, 1, 1, 1],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 1, 0],
    [0, 0, 1, 0, 0],
    [0, 1, 0, 0, 0]
  ],
  '8': [
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1]
  ],
  '9': [
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1],
    [0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1]
  ],
  ':': [
    [0, 0, 0],
    [0, 1, 0],
    [0, 0, 0],
    [0, 1, 0],
    [0, 0, 0]
  ]
};

const COLS = 48;
const ROWS = 26;

export const GameOfLifeClock: React.FC<Props> = ({
  config,
  soundEnabled = false,
  soundVolume = 0.15,
  timeZone,
  timeOverride,
  isFullSize = false
}) => {
  const { t } = useLanguage();
  const [grid, setGrid] = useState<number[][]>(() => createEmptyGrid());
  const [generation, setGeneration] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [speed, setSpeed] = useState<number>(120); // ms per gen

  const [date, setDate] = useState<Date>(new Date());
  const lastStampedMinuteRef = useRef<number>(-1);

  function createEmptyGrid(): number[][] {
    const g: number[][] = [];
    for (let r = 0; r < ROWS; r++) {
      g.push(new Array(COLS).fill(0));
    }
    return g;
  }

  // Stamp current time into center of grid
  const stampTimeToGrid = (targetGrid: number[][], timeStr: string) => {
    // Clear middle band
    for (let r = 8; r < 18; r++) {
      for (let c = 4; c < COLS - 4; c++) {
        targetGrid[r][c] = 0;
      }
    }

    const startRow = 10;
    let curCol = Math.floor((COLS - (timeStr.length * 6)) / 2);

    for (let i = 0; i < timeStr.length; i++) {
      const char = timeStr[i];
      const pattern = DIGITS_5x5[char] || DIGITS_5x5['0'];
      const charW = pattern[0].length;

      for (let r = 0; r < pattern.length; r++) {
        for (let c = 0; c < charW; c++) {
          if (pattern[r][c] === 1 && startRow + r < ROWS && curCol + c < COLS) {
            targetGrid[startRow + r][curCol + c] = 1;
          }
        }
      }
      curCol += charW + 1;
    }

    // Add randomized gliders on outskirts
    for (let g = 0; g < 3; g++) {
      const gr = Math.floor(Math.random() * 4) + 1;
      const gc = Math.floor(Math.random() * 8) + 1;
      // Glider shape
      targetGrid[gr][gc + 1] = 1;
      targetGrid[gr + 1][gc + 2] = 1;
      targetGrid[gr + 2][gc] = 1;
      targetGrid[gr + 2][gc + 1] = 1;
      targetGrid[gr + 2][gc + 2] = 1;
    }
  };

  useEffect(() => {
    if (timeOverride) {
      setDate(timeOverride);
      return;
    }
    const timer = setInterval(() => {
      const now = new Date();
      setDate(now);
      if (soundEnabled) {
        playClockSound('digital_beep', soundVolume * 0.3);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [soundEnabled, soundVolume, timeOverride]);

  const activeDate = timeOverride || date;
  const zonedDate = getZonedDate(activeDate, timeZone || config.timeZone);

  const hours = zonedDate.getHours();
  const minutes = zonedDate.getMinutes();
  const seconds = zonedDate.getSeconds();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const timeStr = `${pad(hours)}:${pad(minutes)}`;

  // Restamp time when minute changes
  useEffect(() => {
    if (lastStampedMinuteRef.current !== minutes) {
      lastStampedMinuteRef.current = minutes;
      setGrid((prev) => {
        const next = prev.map((row) => [...row]);
        stampTimeToGrid(next, timeStr);
        return next;
      });
    }
  }, [minutes, timeStr]);

  // Cellular automaton tick (Conway B3/S23)
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setGrid((prev) => {
        const next = createEmptyGrid();
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            // Count live neighbors with toroidal wrap
            let neighbors = 0;
            for (let dr = -1; dr <= 1; dr++) {
              for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = (r + dr + ROWS) % ROWS;
                const nc = (c + dc + COLS) % COLS;
                if (prev[nr][nc] === 1) neighbors++;
              }
            }

            if (prev[r][c] === 1) {
              next[r][c] = neighbors === 2 || neighbors === 3 ? 1 : 0;
            } else {
              next[r][c] = neighbors === 3 ? 1 : 0;
            }
          }
        }
        return next;
      });
      setGeneration((g) => g + 1);
    }, speed);

    return () => clearInterval(interval);
  }, [isRunning, speed]);

  const handleCellClick = (r: number, c: number) => {
    setGrid((prev) => {
      const next = prev.map((row) => [...row]);
      next[r][c] = next[r][c] ? 0 : 1;
      return next;
    });
  };

  const handleResetClock = () => {
    const next = createEmptyGrid();
    stampTimeToGrid(next, timeStr);
    setGrid(next);
    setGeneration(0);
  };

  const accentColor = config.accentColor || '#38bdf8';

  return (
    <div
      id="game-of-life-clock"
      className="relative w-full h-full flex flex-col items-center justify-center p-3 select-none overflow-hidden"
      style={{
        backgroundColor: config.bgColor || '#050811',
        color: config.textColor || '#f8fafc',
        fontFamily: config.fontFamily || 'monospace'
      }}
    >
      {/* Top Header Bar */}
      <div className="mb-2 flex items-center justify-between w-full max-w-2xl px-2 text-xs font-mono text-slate-400">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          <span className="font-bold text-sky-300">{t('gameOfLifeTitle')}</span>
          <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">
            {t('gameOfLifeGen')}: {generation}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all"
            title={isRunning ? t('gameOfLifePause') : t('gameOfLifePlay')}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleResetClock}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all"
            title={t('gameOfLifeReset')}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Automaton Grid Matrix */}
      <div
        className="grid gap-[2px] bg-slate-950 p-2 sm:p-3 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden cursor-crosshair"
        style={{
          gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`
        }}
      >
        {grid.map((row, r) =>
          row.map((cell, c) => {
            const isAlive = cell === 1;
            return (
              <div
                key={`${r}-${c}`}
                onClick={() => handleCellClick(r, c)}
                className={`transition-all duration-75 ${
                  isFullSize ? 'w-3 h-3 sm:w-4 sm:h-4' : 'w-2 h-2 sm:w-2.5 sm:h-2.5'
                } rounded-[2px] ${
                  isAlive
                    ? 'shadow-[0_0_6px_rgba(56,189,248,0.8)] scale-100'
                    : 'bg-slate-900/40 hover:bg-slate-800/80 scale-95'
                }`}
                style={{
                  backgroundColor: isAlive ? accentColor : undefined
                }}
              />
            );
          })
        )}
      </div>

      {/* Digital Time Overlay and Subtext */}
      <div className="mt-3 flex items-center justify-between w-full max-w-2xl px-2 text-xs font-mono text-slate-400">
        <div className="flex items-center space-x-2">
          <span className="text-white font-bold tracking-wider">{timeStr}:{pad(seconds)}</span>
          <span className="text-[10px] text-slate-500">{t('gameOfLifeCellularTime')}</span>
        </div>
        <span className="text-[10px] text-slate-500 hidden sm:inline">
          {t('gameOfLifeInject')}
        </span>
      </div>
    </div>
  );
};
