import { describe, it, expect } from 'vitest';
import { solveFibonacci, FIB_SQUARE_VALUES } from '../src/utils/fibonacciSolver';

const sumOf = (colors: string[]) =>
  colors.reduce((acc, c, i) => (c === 'red' || c === 'blue' ? acc + FIB_SQUARE_VALUES[i] : acc), 0);

const minSumOf = (colors: string[]) =>
  colors.reduce((acc, c, i) => (c === 'green' || c === 'blue' ? acc + FIB_SQUARE_VALUES[i] : acc), 0);

describe('solveFibonacci', () => {
  it('returns five colors in square order', () => {
    expect(solveFibonacci(6, 4)).toHaveLength(5);
  });

  it('red+blue squares sum back to the requested hour', () => {
    for (let hr = 0; hr <= 12; hr++) {
      expect(sumOf(solveFibonacci(hr, 0))).toBe(hr);
    }
  });

  it('green+blue squares sum back to the requested minute units', () => {
    for (let units = 0; units <= 11; units++) {
      expect(minSumOf(solveFibonacci(12, units))).toBe(units);
    }
  });

  it('lights every square at hour 12 with 11 minute-units', () => {
    // 12h = 5+3+2+1+1 lights all squares; minutes reuse four of them as blue
    const full = solveFibonacci(12, 11);
    expect(full.filter((c) => c !== 'none')).toHaveLength(5);
  });

  it('keeps an empty board at 00:00', () => {
    expect(solveFibonacci(0, 0)).toEqual(['none', 'none', 'none', 'none', 'none']);
  });

  it('uses blue only where hour and minute overlap', () => {
    const overlap = solveFibonacci(5, 5); // both consume the value-5 square
    expect(overlap[0]).toBe('blue');
    const soloHour = solveFibonacci(3, 0);
    expect(soloHour[1]).toBe('red');
    const soloMinute = solveFibonacci(0, 1);
    expect(soloMinute[3]).toBe('green');
  });
});
