import { describe, it, expect } from 'vitest';
import { sanitizeClockConfig, sanitizeCommunityClockInput } from '../../server/clockValidation';

const validConfig = {
  style: 'steampunk',
  bgColor: '#1c1917',
  accentColor: '#F59E0B',
  secondaryColor: '#78350f',
  textColor: '#fef3c7',
  fontFamily: 'serif',
  showSeconds: false,
  glowEffect: false,
  particleEffect: 'steam',
  discStyle: 'brass_gears',
  handStyle: 'ornate_brass',
  soundType: 'gear_click'
};

describe('sanitizeClockConfig', () => {
  it('passes a fully valid config through', () => {
    const out = sanitizeClockConfig(validConfig);
    expect(out).toMatchObject(validConfig);
  });

  it('replaces invalid enum values with defaults', () => {
    const out = sanitizeClockConfig({
      ...validConfig,
      style: '<script>alert(1)</script>',
      particleEffect: 'definitely-not-a-particle',
      soundType: 42,
      fontFamily: 'Comic Sans MS, Wingdings'
    });
    expect(out.style).toBe('cyberpunk');
    expect(out.particleEffect).toBe('stars');
    expect(out.soundType).toBe('soft_tick');
    expect(out.fontFamily).toBe('monospace');
  });

  it('rejects non-hex colors', () => {
    const out = sanitizeClockConfig({
      ...validConfig,
      bgColor: 'red',
      accentColor: 'url(javascript:alert(1))',
      textColor: '#12345'
    });
    expect(out.bgColor).toBe('#0f172a');
    expect(out.accentColor).toBe('#38bdf8');
    expect(out.textColor).toBe('#f8fafc');
  });

  it('truncates customText and drops junk optional fields', () => {
    const out = sanitizeClockConfig({
      ...validConfig,
      customText: 'x'.repeat(500),
      ambientSound: 'rain',
      hourlyChime: 'westminster',
      burnInProtection: true,
      timeZone: 'Europe/Amsterdam',
      __proto__: { polluted: true },
      extraField: 'dropped'
    });
    expect(out.customText?.length).toBe(40);
    expect(out.ambientSound).toBe('rain');
    expect(out.hourlyChime).toBe('westminster');
    expect(out.burnInProtection).toBe(true);
    expect((out as unknown as Record<string, unknown>).polluted).toBeUndefined();
    expect((out as unknown as Record<string, unknown>).extraField).toBeUndefined();
  });

  it('coerces garbage input into a valid default config', () => {
    const out = sanitizeClockConfig(null);
    expect(out.style).toBe('cyberpunk');
    expect(out.showSeconds).toBe(true);
    expect(typeof out.bgColor).toBe('string');
  });
});

describe('sanitizeCommunityClockInput', () => {
  const body = { name: 'My clock', config: validConfig };

  it('accepts a well-formed share', () => {
    const input = sanitizeCommunityClockInput(body);
    expect(input).not.toBeNull();
    expect(input!.name).toBe('My clock');
    expect(input!.config.style).toBe('steampunk');
  });

  it('rejects missing/blank names and non-object bodies', () => {
    expect(sanitizeCommunityClockInput({ config: {} })).toBeNull();
    expect(sanitizeCommunityClockInput({ name: '   ', config: {} })).toBeNull();
    expect(sanitizeCommunityClockInput(null)).toBeNull();
    expect(sanitizeCommunityClockInput('string')).toBeNull();
  });

  it('clamps long free-text fields', () => {
    const input = sanitizeCommunityClockInput({
      ...body,
      name: 'n'.repeat(200),
      author: 'a'.repeat(200),
      description: 'd'.repeat(500),
      category: 'c'.repeat(100)
    });
    expect(input!.name.length).toBe(80);
    expect(input!.author!.length).toBe(60);
    expect(input!.description!.length).toBe(200);
    expect(input!.category!.length).toBe(40);
  });
});
