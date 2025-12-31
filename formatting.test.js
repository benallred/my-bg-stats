import { describe, test, expect } from 'vitest';
import {
  formatApproximateHours,
  formatCostLabel,
  formatDateShort,
  formatDateWithWeekday,
  formatLargeNumber,
} from './formatting.js';

describe('formatApproximateHours', () => {
  test('returns "more than X" when decimal is less than 0.5', () => {
    expect(formatApproximateHours(180)).toBe('more than 3'); // exactly 3 hours
    expect(formatApproximateHours(190)).toBe('more than 3'); // 3.17 hours
    expect(formatApproximateHours(200)).toBe('more than 3'); // 3.33 hours
  });

  test('returns "almost X" when decimal is 0.5 or greater', () => {
    expect(formatApproximateHours(210)).toBe('almost 4'); // 3.5 hours
    expect(formatApproximateHours(220)).toBe('almost 4'); // 3.67 hours
    expect(formatApproximateHours(230)).toBe('almost 4'); // 3.83 hours
  });

  test('handles zero minutes', () => {
    expect(formatApproximateHours(0)).toBe('more than 0');
  });

  test('handles small values under 1 hour', () => {
    expect(formatApproximateHours(20)).toBe('more than 0'); // 0.33 hours
    expect(formatApproximateHours(35)).toBe('almost 1'); // 0.58 hours
  });

  test('handles large values', () => {
    expect(formatApproximateHours(600)).toBe('more than 10'); // exactly 10 hours
    expect(formatApproximateHours(630)).toBe('almost 11'); // 10.5 hours
  });
});

describe('formatDateShort', () => {
  test('formats date as "Mon DD"', () => {
    expect(formatDateShort('2024-08-11')).toBe('Aug 11');
    expect(formatDateShort('2024-01-01')).toBe('Jan 1');
    expect(formatDateShort('2024-12-25')).toBe('Dec 25');
  });

  test('returns "-" for null or undefined', () => {
    expect(formatDateShort(null)).toBe('-');
    expect(formatDateShort(undefined)).toBe('-');
    expect(formatDateShort('')).toBe('-');
  });
});

describe('formatDateWithWeekday', () => {
  test('formats date as "Day, Mon DD"', () => {
    expect(formatDateWithWeekday('2024-08-11')).toBe('Sun, Aug 11');
    expect(formatDateWithWeekday('2024-01-01')).toBe('Mon, Jan 1');
    expect(formatDateWithWeekday('2024-12-25')).toBe('Wed, Dec 25');
  });

  test('returns "-" for null or undefined', () => {
    expect(formatDateWithWeekday(null)).toBe('-');
    expect(formatDateWithWeekday(undefined)).toBe('-');
    expect(formatDateWithWeekday('')).toBe('-');
  });
});

describe('formatLargeNumber', () => {
  test('rounds to whole number with commas for values >= 1000', () => {
    expect(formatLargeNumber(1000)).toBe('1,000');
    expect(formatLargeNumber(1037.8)).toBe('1,038');
    expect(formatLargeNumber(1037.2)).toBe('1,037');
    expect(formatLargeNumber(12345.6)).toBe('12,346');
  });

  test('shows 1 decimal place for values < 1000', () => {
    expect(formatLargeNumber(999.9)).toBe('999.9');
    expect(formatLargeNumber(500)).toBe('500.0');
    expect(formatLargeNumber(43.25)).toBe('43.3');
    expect(formatLargeNumber(0.5)).toBe('0.5');
  });

  test('handles zero', () => {
    expect(formatLargeNumber(0)).toBe('0.0');
  });
});

describe('formatCostLabel', () => {
  test('formats integer dollar values without decimals', () => {
    expect(formatCostLabel(5)).toBe('$5');
    expect(formatCostLabel(1)).toBe('$1');
    expect(formatCostLabel(10)).toBe('$10');
  });

  test('formats decimal dollar values with two decimal places', () => {
    expect(formatCostLabel(2.5)).toBe('$2.50');
    expect(formatCostLabel(1.99)).toBe('$1.99');
    expect(formatCostLabel(3.1)).toBe('$3.10');
  });

  test('formats sub-dollar values as cents', () => {
    expect(formatCostLabel(0.5)).toBe('50¢');
    expect(formatCostLabel(0.25)).toBe('25¢');
    expect(formatCostLabel(0.99)).toBe('99¢');
  });

  test('handles edge case at $1 boundary', () => {
    expect(formatCostLabel(1)).toBe('$1');
    expect(formatCostLabel(0.99)).toBe('99¢');
  });
});
