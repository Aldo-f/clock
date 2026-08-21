export type ClockType =
  | 'rotating_disc'
  | 'binary'
  | 'marble_run'
  | 'color_palette'
  | 'word_dutch'
  | 'nixie_tube'
  | 'fibonacci'
  | 'custom_ai';

export interface ClockConfig {
  style: string; // 'cyberpunk' | 'steampunk' | 'minimal' | 'neon' | 'nature' | 'space' | 'retro_nixie' | 'art_deco' | 'fluid';
  bgColor: string;
  accentColor: string;
  secondaryColor: string;
  textColor: string;
  fontFamily: string; // 'sans-serif' | 'serif' | 'monospace' | 'cursive';
  showSeconds: boolean;
  glowEffect: boolean;
  particleEffect: string; // 'none' | 'matrix' | 'stars' | 'steam' | 'sakura' | 'bubbles' | 'fireflies' | 'sparks';
  discStyle: string; // 'clean' | 'neon_rings' | 'brass_gears' | 'radar' | 'concentric' | 'minimal_dots';
  handStyle: string; // 'needle' | 'laser_beam' | 'ornate_brass' | 'thick_modern' | 'glowing_arrow' | 'dot_markers';
  soundType: string; // 'none' | 'soft_tick' | 'digital_beep' | 'gear_click' | 'water_drop' | 'space_hum';
  customText?: string;
  clockTypeCategory?: string;
  timeZone?: string;
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
