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

export const ALLOWED_STYLES = [
  'cyberpunk',
  'steampunk',
  'minimal',
  'neon',
  'nature',
  'space',
  'retro_nixie',
  'art_deco',
  'fluid',
  'celestial',
  'retro_terminal',
  'mechanical_amber'
] as const;

export const ALLOWED_FONT_FAMILIES = ['sans-serif', 'serif', 'monospace', 'cursive'] as const;

export const ALLOWED_PARTICLE_EFFECTS = [
  'none',
  'matrix',
  'stars',
  'steam',
  'sakura',
  'bubbles',
  'fireflies',
  'sparks',
  'aurora',
  'rain_drops'
] as const;

export const ALLOWED_DISC_STYLES = [
  'clean',
  'neon_rings',
  'brass_gears',
  'radar',
  'concentric',
  'minimal_dots'
] as const;

export const ALLOWED_HAND_STYLES = [
  'needle',
  'laser_beam',
  'ornate_brass',
  'thick_modern',
  'glowing_arrow',
  'dot_markers'
] as const;

export const ALLOWED_SOUND_TYPES = [
  'none',
  'soft_tick',
  'digital_beep',
  'gear_click',
  'water_drop',
  'space_hum',
  'split_flap',
  'oscilloscope_blip'
] as const;

export const ALLOWED_AMBIENT_SOUNDS: AmbientSoundType[] = [
  'none',
  'rain',
  'synth432',
  'brown_noise',
  'forest',
  'cosmic_hum'
];

export const ALLOWED_CHIME_SOUNDS: ChimeSoundType[] = [
  'none',
  'westminster',
  'singing_bowl',
  'grandfather',
  'cuckoo'
];

export const ALLOWED_CLOCK_TYPE_CATEGORIES = [
  'Roterende Schijven',
  'Binaire Klok',
  'Knikkerbaan',
  'Kleurenpalet',
  'Woordklok',
  'Custom AI Design'
] as const;

export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  username: string;
  email?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export type AIProviderType = 'gemini' | 'openai_compatible';

export interface AIProviderConfig {
  id: string;
  name: string;
  type: AIProviderType;
  baseUrl?: string;
  apiKey?: string;
  customHeaders?: Record<string, string>;
  isEnabled: boolean;
  availableModels: string[];
  createdAt: string;
  updatedAt: string;
}

export interface WaterfallStep {
  id: string;
  providerId: string;
  modelName: string;
  isEnabled: boolean;
  timeoutMs: number;
  temperature: number;
}

export interface AIConfigData {
  providers: AIProviderConfig[];
  waterfall: WaterfallStep[];
  fallbackToLocalOnFailure: boolean;
}

export interface GenerationLog {
  id: string;
  timestamp: string;
  prompt: string;
  success: boolean;
  providerIdUsed?: string;
  providerNameUsed?: string;
  modelUsed?: string;
  waterfallStepIndex?: number;
  durationMs: number;
  error?: string;
  isFallback: boolean;
}

