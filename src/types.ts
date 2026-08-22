export type ClockType =
  | 'rotating_disc'
  | 'binary'
  | 'marble_run'
  | 'color_palette'
  | 'word_dutch'
  | 'nixie_tube'
  | 'fibonacci'
  | 'solar_orbit'
  | 'split_flap'
  | 'liquid_ferrofluid'
  | 'soundwave_oscilloscope'
  | 'game_of_life'
  | 'custom_ai';

export type AmbientSoundType =
  | 'none'
  | 'rain'
  | 'synth432'
  | 'brown_noise'
  | 'forest'
  | 'cosmic_hum';

export type ChimeSoundType =
  | 'none'
  | 'westminster'
  | 'singing_bowl'
  | 'grandfather'
  | 'cuckoo';

export interface ClockConfig {
  style: string; // 'cyberpunk' | 'steampunk' | 'minimal' | 'neon' | 'nature' | 'space' | 'retro_nixie' | 'art_deco' | 'fluid' | 'celestial' | 'retro_terminal' | 'mechanical_amber';
  bgColor: string;
  accentColor: string;
  secondaryColor: string;
  textColor: string;
  fontFamily: string; // 'sans-serif' | 'serif' | 'monospace' | 'cursive';
  showSeconds: boolean;
  glowEffect: boolean;
  particleEffect: string; // 'none' | 'matrix' | 'stars' | 'steam' | 'sakura' | 'bubbles' | 'fireflies' | 'sparks' | 'aurora' | 'rain_drops';
  discStyle: string; // 'clean' | 'neon_rings' | 'brass_gears' | 'radar' | 'concentric' | 'minimal_dots';
  handStyle: string; // 'needle' | 'laser_beam' | 'ornate_brass' | 'thick_modern' | 'glowing_arrow' | 'dot_markers';
  soundType: string; // 'none' | 'soft_tick' | 'digital_beep' | 'gear_click' | 'water_drop' | 'space_hum' | 'split_flap' | 'oscilloscope_blip';
  ambientSound?: AmbientSoundType;
  hourlyChime?: ChimeSoundType;
  customText?: string;
  clockTypeCategory?: string;
  timeZone?: string;
  burnInProtection?: boolean;
}

export interface ClockItem {
  id: string;
  name: string;
  description: string;
  category: string;
  type: ClockType;
  author?: string;
  likes?: number;
  createdAt?: string;
  isBuiltIn?: boolean;
  isFavorite?: boolean;
  config: ClockConfig;
}

export interface DashboardSlot {
  id: string;
  clockId: string;
  timeZone?: string;
  customConfig?: ClockConfig;
}

export interface PomodoroState {
  isActive: boolean;
  mode: 'work' | 'short_break' | 'long_break';
  timeLeft: number;
  workDuration: number;
  breakDuration: number;
  sessionsCompleted: number;
}
