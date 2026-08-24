export type FibSquareColor = 'red' | 'green' | 'blue' | 'none';

// Square values in display order: [5, 3, 2, 1b, 1a]
export const FIB_SQUARE_VALUES = [5, 3, 2, 1, 1] as const;

/**
 * Greedy Fibonacci decomposition of a 12-hour clock reading.
 * targetHr: 1-12, targetMin: minutes already divided by 5 (0-11).
 * Returns one color per square: red = hour only, green = minute only,
 * blue = both, none = unused.
 */
export function solveFibonacci(targetHr: number, targetMin: number): FibSquareColor[] {
  const hrBits = [false, false, false, false, false];
  const minBits = [false, false, false, false, false];

  let remHr = targetHr;
  let remMin = targetMin;
  for (let i = 0; i < FIB_SQUARE_VALUES.length; i++) {
    const val = FIB_SQUARE_VALUES[i];
    if (remHr >= val) {
      hrBits[i] = true;
      remHr -= val;
    }
    if (remMin >= val) {
      minBits[i] = true;
      remMin -= val;
    }
  }

  return FIB_SQUARE_VALUES.map((_, idx) => {
    const inHr = hrBits[idx];
    const inMin = minBits[idx];
    if (inHr && inMin) return 'blue';
    if (inHr) return 'red';
    if (inMin) return 'green';
    return 'none';
  });
}
