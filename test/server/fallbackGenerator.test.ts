import { describe, it, expect } from 'vitest';
import { generateFallbackClockConfig } from '../../server/fallbackGenerator';

describe('generateFallbackClockConfig', () => {
  it('maps ocean prompts to the water theme', () => {
    const out = generateFallbackClockConfig('een aquarium met bubbels');
    expect(out.particleEffect).toBe('bubbles');
    expect(out.soundType).toBe('water_drop');
    expect(out.style).toBe('nature');
  });

  it('maps neon/cyber prompts to digital beep + matrix on request', () => {
    expect(generateFallbackClockConfig('neon cyber klok').soundType).toBe('digital_beep');
    const matrix = generateFallbackClockConfig('cyberpunk matrix stream');
    expect(matrix.particleEffect).toBe('matrix');
  });

  it('carries over untouched fields from currentConfig', () => {
    const out = generateFallbackClockConfig('ocean', {
      accentColor: '#123456',
      showSeconds: false
    });
    expect(out.accentColor).toBe('#123456');
    expect(out.showSeconds).toBe(false);
  });

  it('derives a capitalized name from the prompt', () => {
    expect(generateFallbackClockConfig('gouden steampunk tandwiel').name).toBe(
      'Gouden steampunk tandwiel Klok'
    );
  });

  it('falls back to a default name for punctuation-only prompts', () => {
    expect(generateFallbackClockConfig('!!! ???').name).toBe('Aangepaste AI Klok');
  });
});
