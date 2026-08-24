import { describe, it, expect } from 'vitest';
import { injectLocalizedTitle, localizedPageTitle } from '../../server/titleLocalization';
import { translations } from '../../src/i18n/translations';

const HTML =
  '<html><head><title>Clocky - Digitale klok studio</title></head><body></body></html>';

describe('localizedPageTitle', () => {
  it('returns null for absent/unsupported values', () => {
    expect(localizedPageTitle(undefined)).toBeNull();
    expect(localizedPageTitle(42)).toBeNull();
    expect(localizedPageTitle('xx')).toBeNull();
    expect(localizedPageTitle('  ')).toBeNull();
  });

  it('matches two-letter codes case-insensitively', () => {
    expect(localizedPageTitle('EN')).toBe(translations.en.pageTitle);
    expect(localizedPageTitle(' fr ')).toBeTruthy();
  });
});

describe('injectLocalizedTitle', () => {
  it('swaps the title for a supported language', () => {
    const out = injectLocalizedTitle(HTML, 'en');
    expect(out).toContain('<title>Clocky - Digital Clock Studio</title>');
    expect(out).not.toContain('Digitale klok studio');
  });

  it('leaves the html untouched for unknown languages', () => {
    expect(injectLocalizedTitle(HTML, 'zz')).toBe(HTML);
  });

  it('handles multiline title elements', () => {
    const multiline = '<html><head><title>\n  Clocky\n</title></head></html>';
    expect(injectLocalizedTitle(multiline, 'de')).toMatch(
      /<title>Clocky - Digitales Uhrenstudio<\/title>/
    );
  });
});
