import { describe, test, expect } from 'vitest';
import { calculateMedian } from './utils.js';

describe('calculateMedian', () => {
  test('returns null for empty array', () => {
    expect(calculateMedian([])).toBeNull();
  });

  test('returns single value for array of one', () => {
    expect(calculateMedian([5])).toBe(5);
  });

  test('returns middle value for odd-length array', () => {
    expect(calculateMedian([1, 3, 5])).toBe(3);
    expect(calculateMedian([1, 2, 3, 4, 5])).toBe(3);
  });

  test('returns average of middle values for even-length array', () => {
    expect(calculateMedian([1, 2, 3, 4])).toBe(2.5);
    expect(calculateMedian([1, 2])).toBe(1.5);
  });

  test('sorts values before calculating', () => {
    expect(calculateMedian([5, 1, 3])).toBe(3);
    expect(calculateMedian([4, 1, 3, 2])).toBe(2.5);
  });
});
