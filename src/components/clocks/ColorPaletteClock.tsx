import React, { useState } from 'react';
import { ClockConfig } from '../../types';
import { playClockSound } from '../../utils/audioSynth';
import { useZonedClock } from '../../utils/useZonedClock';
import { useLanguage } from '../../i18n/LanguageContext';

interface Props {
  config: ClockConfig;
  soundEnabled?: boolean;
  soundVolume?: number;
  timeZone?: string;
  timeOverride?: Date | null;
  isFullSize?: boolean;
}

export const ColorPaletteClock: React.FC<Props> = ({
  config,
  soundEnabled = false,
  soundVolume = 0.1,
  timeZone,
  timeOverride,
  isFullSize = false
}) => {
  const { t } = useLanguage();
  const [paletteMode, setPaletteMode] = useState<'gradient' | 'swatches' | 'hexcode'>('gradient');

  const activeTime = useZonedClock(timeZone || config.timeZone, timeOverride, (now) => {
    if (soundEnabled && config.soundType) {
      playClockSound(config.soundType, soundVolume);
    }
  });
  const hours = activeTime.getHours();
  const minutes = activeTime.getMinutes();
  const seconds = activeTime.getSeconds();

  // Convert time to HSL hues
  const hourHue = Math.round((hours / 24) * 360);
  const minHue = Math.round((minutes / 60) * 360);
  const secHue = Math.round((seconds / 60) * 360);

  const hourColor = `hsl(${hourHue}, 85%, 55%)`;
  const minColor = `hsl(${minHue}, 80%, 50%)`;
  const secColor = `hsl(${secHue}, 90%, 60%)`;

  // Hex time format e.g. #142859
  const hexTime = `#${hours.toString().padStart(2, '0')}${minutes.toString().padStart(2, '0')}${seconds.toString().padStart(2, '0')}`;

  return (
    <div
      className="relative w-full h-full min-h-[320px] flex flex-col justify-between p-6 rounded-2xl select-none transition-colors duration-1000 overflow-hidden"
      style={{
        background:
          paletteMode === 'gradient'
            ? `radial-gradient(circle at ${seconds * 1.6}%, ${hourColor} 0%, ${minColor} 50%, ${secColor} 100%)`
            : config.bgColor,
        color: config.textColor,
        fontFamily: config.fontFamily || 'sans-serif'
      }}
    >
      {/* Mode Switcher */}
      <div className="flex items-center justify-between border-b border-white/20 pb-2 z-10">
        <span className="text-xs font-bold uppercase tracking-wider backdrop-blur-md bg-black/30 px-2.5 py-1 rounded-lg border border-white/10">
          🎨 {t('colorPaletteTitle')}
        </span>
        <div className="flex space-x-1 bg-black/40 backdrop-blur-md p-1 rounded-lg border border-white/10 text-xs">
          <button
            onClick={() => setPaletteMode('gradient')}
            className={`px-2 py-0.5 rounded transition-all ${
              paletteMode === 'gradient' ? 'bg-white text-black font-bold' : 'text-white/70 hover:text-white'
            }`}
          >
            {t('colorGradient')}
          </button>
          <button
            onClick={() => setPaletteMode('swatches')}
            className={`px-2 py-0.5 rounded transition-all ${
              paletteMode === 'swatches' ? 'bg-white text-black font-bold' : 'text-white/70 hover:text-white'
            }`}
          >
            {t('colorSwatches')}
          </button>
          <button
            onClick={() => setPaletteMode('hexcode')}
            className={`px-2 py-0.5 rounded transition-all ${
              paletteMode === 'hexcode' ? 'bg-white text-black font-bold' : 'text-white/70 hover:text-white'
            }`}
          >
            {t('colorHex')}
          </button>
        </div>
      </div>

      {/* Main Display Area */}
      <div className="my-auto z-10 flex flex-col items-center justify-center">
        {paletteMode === 'swatches' ? (
          <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
            {/* Hour Swatch */}
            <div
              className="p-4 rounded-xl shadow-lg border border-white/20 flex flex-col items-center justify-center transition-all duration-700"
              style={{ backgroundColor: hourColor }}
            >
              <span className="text-2xl font-black text-white drop-shadow-md">{hours.toString().padStart(2, '0')}</span>
              <span className="text-[10px] uppercase font-bold text-white/80">{t('colorHourHue')} {hourHue}°</span>
            </div>
            {/* Minute Swatch */}
            <div
              className="p-4 rounded-xl shadow-lg border border-white/20 flex flex-col items-center justify-center transition-all duration-700"
              style={{ backgroundColor: minColor }}
            >
              <span className="text-2xl font-black text-white drop-shadow-md">{minutes.toString().padStart(2, '0')}</span>
              <span className="text-[10px] uppercase font-bold text-white/80">{t('colorMinHue')} {minHue}°</span>
            </div>
            {/* Second Swatch */}
            <div
              className="p-4 rounded-xl shadow-lg border border-white/20 flex flex-col items-center justify-center transition-all duration-700"
              style={{ backgroundColor: secColor }}
            >
              <span className="text-2xl font-black text-white drop-shadow-md">{seconds.toString().padStart(2, '0')}</span>
              <span className="text-[10px] uppercase font-bold text-white/80">{t('colorSecHue')} {secHue}°</span>
            </div>
          </div>
        ) : paletteMode === 'hexcode' ? (
          <div
            className="p-6 rounded-2xl border-2 border-white/30 backdrop-blur-xl shadow-2xl flex flex-col items-center space-y-2 transition-all duration-1000"
            style={{ backgroundColor: hexTime }}
          >
            <div className="text-xs uppercase tracking-widest font-bold text-white/80">{t('colorCodeOfTime')}</div>
            <div className="text-3xl sm:text-4xl font-mono font-extrabold text-white drop-shadow-lg tracking-wider">
              {hexTime}
            </div>
            <div className="text-xs font-mono text-white/90">
              {hours.toString().padStart(2, '0')}h : {minutes.toString().padStart(2, '0')}m : {seconds.toString().padStart(2, '0')}s
            </div>
          </div>
        ) : (
          /* Gradient Display Mode */
          <div className="text-center p-6 rounded-2xl backdrop-blur-md bg-black/40 border border-white/10 shadow-2xl">
            <div className="text-4xl sm:text-6xl font-extrabold tracking-widest text-white drop-shadow-lg">
              {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}
              {config.showSeconds && <span className="text-2xl font-normal opacity-90">:{seconds.toString().padStart(2, '0')}</span>}
            </div>
            <div className="mt-2 text-xs font-mono text-white/80 tracking-wider">
              HSL({hourHue}°, {minHue}°, {secHue}°)
            </div>
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="z-10 flex justify-between items-center text-xs opacity-80 backdrop-blur-md bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">
        <span>{t('colorChangesEverySec')}</span>
        <span className="font-mono font-bold" style={{ color: secColor }}>
          ● {t('colorLivePalette')}
        </span>
      </div>
    </div>
  );
};
