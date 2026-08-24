import {
  ALLOWED_AMBIENT_SOUNDS,
  ALLOWED_CHIME_SOUNDS,
  ALLOWED_CLOCK_TYPE_CATEGORIES,
  ALLOWED_DISC_STYLES,
  ALLOWED_FONT_FAMILIES,
  ALLOWED_HAND_STYLES,
  ALLOWED_PARTICLE_EFFECTS,
  ALLOWED_SOUND_TYPES,
  ALLOWED_STYLES,
  ClockConfig
} from '../src/types';

// CSS-valid hex forms only: #RGB, #RGBA, #RRGGBB, #RRGGBBAA
const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

function asString<T extends string>(value: unknown, fallback: T, allowed?: readonly T[]): T {
  if (typeof value !== 'string') return fallback;
  if (allowed && !allowed.includes(value as T)) return fallback;
  return value as T;
}

function asHexColor(value: unknown, fallback: string): string {
  return typeof value === 'string' && HEX.test(value) ? value : fallback;
}

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function clampText(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

export function sanitizeClockConfig(raw: unknown): ClockConfig {
  const r = (raw ?? {}) as Record<string, unknown>;
  const config: ClockConfig = {
    style: asString(r.style, 'cyberpunk', ALLOWED_STYLES),
    bgColor: asHexColor(r.bgColor, '#0f172a'),
    accentColor: asHexColor(r.accentColor, '#38bdf8'),
    secondaryColor: asHexColor(r.secondaryColor, '#f43f5e'),
    textColor: asHexColor(r.textColor, '#f8fafc'),
    fontFamily: asString(r.fontFamily, 'monospace', ALLOWED_FONT_FAMILIES),
    showSeconds: asBool(r.showSeconds, true),
    glowEffect: asBool(r.glowEffect, true),
    particleEffect: asString(r.particleEffect, 'stars', ALLOWED_PARTICLE_EFFECTS),
    discStyle: asString(r.discStyle, 'neon_rings', ALLOWED_DISC_STYLES),
    handStyle: asString(r.handStyle, 'laser_beam', ALLOWED_HAND_STYLES),
    soundType: asString(r.soundType, 'soft_tick', ALLOWED_SOUND_TYPES)
  };

  config.customText = clampText(r.customText, 40);
  config.clockTypeCategory = asString(
    r.clockTypeCategory,
    '',
    ALLOWED_CLOCK_TYPE_CATEGORIES
  ) || undefined;

  const ambient = asString(r.ambientSound, 'none', ALLOWED_AMBIENT_SOUNDS);
  if (ambient !== 'none') config.ambientSound = ambient;
  const chime = asString(r.hourlyChime, 'none', ALLOWED_CHIME_SOUNDS);
  if (chime !== 'none') config.hourlyChime = chime;
  if (typeof r.burnInProtection === 'boolean') config.burnInProtection = r.burnInProtection;
  if (typeof r.timeZone === 'string' && r.timeZone) config.timeZone = r.timeZone.slice(0, 64);

  return config;
}

export interface CommunityClockInput {
  name: string;
  description?: string;
  author?: string;
  category?: string;
  config: ClockConfig;
}

export function sanitizeCommunityClockInput(body: unknown): CommunityClockInput | null {
  const b = (body ?? {}) as Record<string, unknown>;
  const name = clampText(b.name, 80);
  if (!name) return null;

  return {
    name,
    description: clampText(b.description, 200),
    author: clampText(b.author, 60),
    category: clampText(b.category, 40),
    config: sanitizeClockConfig(b.config)
  };
}
