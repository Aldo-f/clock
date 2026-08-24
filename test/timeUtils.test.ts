import { describe, it, expect } from 'vitest';
import {
  TIME_ZONES,
  getLocalizedTimeZones,
  getZonedDate,
  formatTimeDisplay,
  formatDateLocale
} from '../src/utils/timeUtils';

describe('getZonedDate', () => {
  const utcNoon = new Date('2026-06-15T12:00:00.000Z');

  it('returns the same date for local/undefined', () => {
    const d = new Date('2026-01-01T00:00:00Z');
    expect(getZonedDate(d)).toBe(d);
    expect(getZonedDate(d, 'local')).toBe(d);
  });

  it('shifts wall-clock fields into the target zone', () => {
    const tokyo = getZonedDate(utcNoon, 'Asia/Tokyo');
    expect(tokyo.getHours()).toBe(21);
    const la = getZonedDate(utcNoon, 'America/Los_Angeles');
    expect(la.getHours()).toBe(5);
  });

  it('falls back to the input date on invalid zones', () => {
    const d = new Date('2026-01-01T00:00:00Z');
    expect(getZonedDate(d, 'Not/AZone')).toBe(d);
  });
});

describe('formatTimeDisplay', () => {
  const d = new Date(2026, 5, 15, 14, 5, 9);

  it('formats 24h with seconds by default', () => {
    expect(formatTimeDisplay(d)).toBe('14:05:09');
  });

  it('supports 12h suffix and dropping seconds', () => {
    expect(formatTimeDisplay(d, false, true)).toBe('02:05:09 PM');
    expect(formatTimeDisplay(d, true, false)).toBe('14:05');
    expect(formatTimeDisplay(d, false, false)).toBe('02:05 PM');
  });

  it('handles midnight and noon in 12h mode', () => {
    expect(formatTimeDisplay(new Date(2026, 0, 1, 0, 30), false, false)).toBe('12:30 AM');
    expect(formatTimeDisplay(new Date(2026, 0, 1, 12, 30), false, false)).toBe('12:30 PM');
  });
});

describe('formatDateLocale', () => {
  it('maps language codes to full locales', () => {
    const d = new Date('2026-06-15T12:00:00Z');
    expect(formatDateLocale(d, 'en', 'UTC')).toMatch(/Monday/);
    expect(formatDateLocale(d, 'nl', 'UTC')).toMatch(/maandag/i);
  });

  it('defaults to Dutch for unknown codes', () => {
    const d = new Date('2026-06-15T12:00:00Z');
    expect(formatDateLocale(d, 'xx', 'UTC')).toMatch(/maandag|Monday/i);
  });
});

describe('getLocalizedTimeZones', () => {
  it('keeps the canonical zone list order and ids', () => {
    const t = (key: string) => `t_${key}`;
    const zones = getLocalizedTimeZones(t);
    expect(zones.map((z) => z.id)).toEqual(TIME_ZONES.map((z) => z.id));
  });

  it('localizes only the special local/UTC entries', () => {
    const zones = getLocalizedTimeZones((key) => `[${key}]`);
    expect(zones[0]).toMatchObject({ id: 'local', city: '[tzLocal]' });
    const utc = zones.find((z) => z.id === 'UTC');
    expect(utc?.label).toBe('[tzUniversalDesc]');
    const ams = zones.find((z) => z.id === 'Europe/Amsterdam');
    expect(ams?.city).toBe('Amsterdam');
  });
});
