import { describe, test, expect } from 'vitest';
import {
  formatApproximateHours,
  formatDateShort,
  formatDateWithWeekday,
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
