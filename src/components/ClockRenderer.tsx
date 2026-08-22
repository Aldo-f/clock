import React from 'react';
import { ClockItem } from '../types';
import { RotatingDiscClock } from './clocks/RotatingDiscClock';
import { BinaryClock } from './clocks/BinaryClock';
import { MarbleRunClock } from './clocks/MarbleRunClock';
import { ColorPaletteClock } from './clocks/ColorPaletteClock';
import { WordClock } from './clocks/WordClock';
import { NixieTubeClock } from './clocks/NixieTubeClock';
import { FibonacciClock } from './clocks/FibonacciClock';
import { SolarOrbitClock } from './clocks/SolarOrbitClock';
import { SplitFlapClock } from './clocks/SplitFlapClock';
import { LiquidFerrofluidClock } from './clocks/LiquidFerrofluidClock';
import { SoundwaveOscilloscopeClock } from './clocks/SoundwaveOscilloscopeClock';
import { GameOfLifeClock } from './clocks/GameOfLifeClock';
import { CustomAiClock } from './clocks/CustomAiClock';

interface Props {
  clock: ClockItem;
  soundEnabled?: boolean;
  soundVolume?: number;
  timeZone?: string;
  timeOverride?: Date | null;
  isFullSize?: boolean;
}

export const ClockRenderer: React.FC<Props> = ({
  clock,
  soundEnabled = false,
  soundVolume = 0.15,
  timeZone,
  timeOverride,
  isFullSize = false
}) => {
  const commonProps = {
    config: clock.config,
    soundEnabled,
    soundVolume,
    timeZone: timeZone || clock.config.timeZone,
    timeOverride,
    isFullSize
  };

  switch (clock.type) {
    case 'rotating_disc':
      return <RotatingDiscClock {...commonProps} />;
    case 'binary':
      return <BinaryClock {...commonProps} />;
    case 'marble_run':
      return <MarbleRunClock {...commonProps} />;
    case 'color_palette':
      return <ColorPaletteClock {...commonProps} />;
    case 'word_dutch':
      return <WordClock {...commonProps} />;
    case 'nixie_tube':
      return <NixieTubeClock {...commonProps} />;
    case 'fibonacci':
      return <FibonacciClock {...commonProps} />;
    case 'solar_orbit':
      return <SolarOrbitClock {...commonProps} />;
    case 'split_flap':
      return <SplitFlapClock {...commonProps} />;
    case 'liquid_ferrofluid':
      return <LiquidFerrofluidClock {...commonProps} />;
    case 'soundwave_oscilloscope':
      return <SoundwaveOscilloscopeClock {...commonProps} />;
    case 'game_of_life':
      return <GameOfLifeClock {...commonProps} />;
    case 'custom_ai':
    default:
      return <CustomAiClock {...commonProps} />;
  }
};

