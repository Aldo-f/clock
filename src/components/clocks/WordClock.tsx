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

export const WordClock: React.FC<Props> = ({
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

  // Dutch Word Matrix Logic
  // Matrix layout:
  // H E T K I S V I J F
  // T I E N A V O O R K
  // O V E R M H A L F T
  // E E N T W E E D R I E
  // V I E R V I J F Z E S
  // Z E V E N A C H T O
  // N E G E N T I E N L
  // E L F T W A A L F U

  const getActiveWords = () => {
    const words = new Set<string>();
    words.add('HET');
    words.add('IS');

    // Round to nearest 5 minutes
    const roundedMins = Math.floor(minutes / 5) * 5;
    let hr = hours % 12 || 12;

    if (minutes >= 20) {
      hr = (hr % 12) + 1; // Next hour for "tien voor half ...", "half ...", "over half ..."
    }

    if (roundedMins === 5) {
      words.add('VIJF');
      words.add('OVER');
    } else if (roundedMins === 10) {
      words.add('TIEN');
      words.add('OVER');
    } else if (roundedMins === 15) {
      words.add('KWART');
      words.add('OVER');
    } else if (roundedMins === 20) {
      words.add('TIEN');
      words.add('VOOR');
      words.add('HALF');
    } else if (roundedMins === 25) {
      words.add('VIJF');
      words.add('VOOR');
      words.add('HALF');
    } else if (roundedMins === 30) {
      words.add('HALF');
    } else if (roundedMins === 35) {
      words.add('VIJF');
      words.add('OVER');
      words.add('HALF');
    } else if (roundedMins === 40) {
      words.add('TIEN');
      words.add('OVER');
      words.add('HALF');
    } else if (roundedMins === 45) {
      words.add('KWART');
      words.add('VOOR');
    } else if (roundedMins === 50) {
      words.add('TIEN');
      words.add('VOOR');
    } else if (roundedMins === 55) {
      words.add('VIJF');
      words.add('VOOR');
    } else if (roundedMins === 0) {
      words.add('UUR');
    }

    const hrNames: Record<number, string> = {
      1: 'EEN',
      2: 'TWEE',
      3: 'DRIE',
      4: 'VIER',
      5: 'VIJF_H',
      6: 'ZES',
      7: 'ZEVEN',
      8: 'ACHT',
      9: 'NEGEN',
      10: 'TIEN_H',
      11: 'ELF',
      12: 'TWAALF'
    };

    if (hrNames[hr]) {
      words.add(hrNames[hr]);
    }

    return words;
  };

  const activeWords = getActiveWords();

  const grid = [
    [
      { char: 'H', key: 'HET' },
      { char: 'E', key: 'HET' },
      { char: 'T', key: 'HET' },
      { char: 'K' },
      { char: 'I', key: 'IS' },
      { char: 'S', key: 'IS' },
      { char: 'V', key: 'VIJF' },
      { char: 'I', key: 'VIJF' },
      { char: 'J', key: 'VIJF' },
      { char: 'F', key: 'VIJF' }
    ],
    [
      { char: 'T', key: 'TIEN' },
      { char: 'I', key: 'TIEN' },
      { char: 'E', key: 'TIEN' },
      { char: 'N', key: 'TIEN' },
      { char: 'K', key: 'KWART' },
      { char: 'W', key: 'KWART' },
      { char: 'A', key: 'KWART' },
      { char: 'R', key: 'KWART' },
      { char: 'T', key: 'KWART' },
      { char: 'S' }
    ],
    [
      { char: 'V', key: 'VOOR' },
      { char: 'O', key: 'VOOR' },
      { char: 'O', key: 'VOOR' },
      { char: 'R', key: 'VOOR' },
      { char: 'O', key: 'OVER' },
      { char: 'V', key: 'OVER' },
      { char: 'E', key: 'OVER' },
      { char: 'R', key: 'OVER' },
      { char: 'A' },
      { char: 'B' }
    ],
    [
      { char: 'H', key: 'HALF' },
      { char: 'A', key: 'HALF' },
      { char: 'L', key: 'HALF' },
      { char: 'F', key: 'HALF' },
      { char: 'U', key: 'UUR' },
      { char: 'U', key: 'UUR' },
      { char: 'R', key: 'UUR' },
      { char: 'E', key: 'EEN' },
      { char: 'E', key: 'EEN' },
      { char: 'N', key: 'EEN' }
    ],
    [
      { char: 'T', key: 'TWEE' },
      { char: 'W', key: 'TWEE' },
      { char: 'E', key: 'TWEE' },
      { char: 'E', key: 'TWEE' },
      { char: 'D', key: 'DRIE' },
      { char: 'R', key: 'DRIE' },
      { char: 'I', key: 'DRIE' },
      { char: 'E', key: 'DRIE' },
      { char: 'V', key: 'VIER' },
      { char: 'I', key: 'VIER' }
    ],
    [
      { char: 'E', key: 'VIER' },
      { char: 'R', key: 'VIER' },
      { char: 'V', key: 'VIJF_H' },
      { char: 'I', key: 'VIJF_H' },
      { char: 'J', key: 'VIJF_H' },
      { char: 'F', key: 'VIJF_H' },
      { char: 'Z', key: 'ZES' },
      { char: 'E', key: 'ZES' },
      { char: 'S', key: 'ZES' },
      { char: 'Z' }
    ],
    [
      { char: 'Z', key: 'ZEVEN' },
      { char: 'E', key: 'ZEVEN' },
      { char: 'V', key: 'ZEVEN' },
      { char: 'E', key: 'ZEVEN' },
      { char: 'N', key: 'ZEVEN' },
      { char: 'A', key: 'ACHT' },
      { char: 'C', key: 'ACHT' },
      { char: 'H', key: 'ACHT' },
      { char: 'T', key: 'ACHT' },
      { char: 'N' }
    ],
    [
      { char: 'N', key: 'NEGEN' },
      { char: 'E', key: 'NEGEN' },
      { char: 'G', key: 'NEGEN' },
      { char: 'E', key: 'NEGEN' },
      { char: 'N', key: 'NEGEN' },
      { char: 'T', key: 'TIEN_H' },
      { char: 'I', key: 'TIEN_H' },
      { char: 'E', key: 'TIEN_H' },
      { char: 'N', key: 'TIEN_H' },
      { char: 'E', key: 'ELF' }
    ],
    [
      { char: 'L', key: 'ELF' },
      { char: 'F', key: 'ELF' },
      { char: 'T', key: 'TWAALF' },
      { char: 'W', key: 'TWAALF' },
      { char: 'A', key: 'TWAALF' },
      { char: 'A', key: 'TWAALF' },
      { char: 'L', key: 'TWAALF' },
      { char: 'F', key: 'TWAALF' },
      { char: 'O' },
      { char: 'K' }
    ]
  ];

  return (
    <div
      className="relative w-full h-full min-h-[320px] flex flex-col items-center justify-center p-4 rounded-2xl select-none"
      style={{
        backgroundColor: config.bgColor,
        color: config.textColor,
        fontFamily: config.fontFamily || 'sans-serif'
      }}
    >
      <div className="grid grid-rows-9 gap-1 my-auto max-w-xs sm:max-w-sm w-full bg-black/40 p-4 rounded-2xl border border-white/10 shadow-2xl">
        {grid.map((row, rIdx) => (
          <div key={`row-${rIdx}`} className="flex justify-between items-center">
            {row.map((item, cIdx) => {
              const isActive = item.key && activeWords.has(item.key);
              return (
                <span
                  key={`cell-${rIdx}-${cIdx}`}
                  className="font-bold font-mono text-sm sm:text-base transition-all duration-500 w-6 h-6 flex items-center justify-center rounded"
                  style={{
                    color: isActive ? config.accentColor : `${config.textColor}25`,
                    textShadow: isActive && config.glowEffect ? `0 0 10px ${config.accentColor}` : 'none',
                    backgroundColor: isActive ? `${config.accentColor}15` : 'transparent'
                  }}
                >
                  {item.char}
                </span>
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-2 text-center z-10">
        <div className="text-xs font-mono opacity-60">
          {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}
          {config.showSeconds && <span>:{seconds.toString().padStart(2, '0')}</span>}
        </div>
      </div>
    </div>
  );
};
