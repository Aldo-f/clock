import { describe, it, expect } from 'vitest';
import { translations } from '../src/i18n/translations';

// The dictionary type is derived from the nl literal; this guards the runtime
// side of that contract: every other language must expose exactly the same keys.
describe('translations key parity', () => {
  const baseKeys = Object.keys(translations.nl).sort();

  it('nl is non-trivial', () => {
    expect(baseKeys.length).toBeGreaterThan(300);
  });

  for (const [lang, dict] of Object.entries(translations)) {
    if (lang === 'nl') continue;
    it(`${lang} has exactly the nl key set`, () => {
      expect(Object.keys(dict).sort()).toEqual(baseKeys);
    });
    it(`${lang} has no empty values`, () => {
      for (const [key, value] of Object.entries(dict)) {
        expect(value, `${lang}.${key}`).toBeTruthy();
      }
    });
  }
});
