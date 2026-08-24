import { describe, it, expect, beforeEach, vi } from 'vitest';
import { parseCurrentRoute } from '../src/utils/urlRouter';
import { PRESET_CLOCKS } from '../src/data/presetClocks';

function setLocation(url: string): void {
  const target = new URL(url);
  vi.stubGlobal('window', {
    location: {
      pathname: target.pathname,
      search: target.search
    }
  });
}

const clocks = PRESET_CLOCKS;

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('parseCurrentRoute', () => {
  it('defaults to the gallery view', () => {
    setLocation('https://x.test/');
    expect(parseCurrentRoute(clocks)).toMatchObject({
      tab: 'gallery',
      fullscreenClockId: null
    });
  });

  it('resolves /clock/:id case-insensitively', () => {
    setLocation('https://x.test/clock/CLOCK-BINARY');
    expect(parseCurrentRoute(clocks).fullscreenClockId).toBe('clock-binary');
  });

  it('matches the clock-<id> prefix form', () => {
    setLocation('https://x.test/clock/binary');
    expect(parseCurrentRoute(clocks).fullscreenClockId).toBe('clock-binary');
  });

  it('keeps unknown slugs as-is', () => {
    setLocation('https://x.test/clock/does-not-exist');
    expect(parseCurrentRoute(clocks).fullscreenClockId).toBe('does-not-exist');
  });

  it('parses dashboard/library aliases', () => {
    setLocation('https://x.test/dashboard');
    expect(parseCurrentRoute(clocks).tab).toBe('dashboard');
    setLocation('https://x.test/multi');
    expect(parseCurrentRoute(clocks).tab).toBe('dashboard');
    setLocation('https://x.test/community');
    expect(parseCurrentRoute(clocks).tab).toBe('library');
  });

  it('parses the admin view via path and ?tab= alias', () => {
    setLocation('https://x.test/admin');
    expect(parseCurrentRoute(clocks).tab).toBe('admin');
    setLocation('https://x.test/?t=admin');
    expect(parseCurrentRoute(clocks).tab).toBe('admin');
  });

  it('?c= overrides or complements the path', () => {
    setLocation('https://x.test/?c=nixie');
    expect(parseCurrentRoute(clocks).fullscreenClockId).toBe('clock-nixie');
    setLocation('https://x.test/dashboard?c=marble-run');
    const route = parseCurrentRoute(clocks);
    expect(route.tab).toBe('dashboard');
    expect(route.fullscreenClockId).toBe('clock-marble-run');
  });

  it('carries lang/tz/embed parameters', () => {
    setLocation('https://x.test/?lang=de&tz=Asia%2FTokyo&embed=true');
    expect(parseCurrentRoute(clocks)).toMatchObject({
      language: 'de',
      timeZone: 'Asia/Tokyo',
      isEmbed: true
    });
  });
});
