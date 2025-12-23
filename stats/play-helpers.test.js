import { describe, test, expect } from 'vitest';
import { isPlayInYear, filterPlaysByYear } from './play-helpers.js';

describe('isPlayInYear', () => {
  const play2023 = { date: '2023-06-15', gameId: 1 };
  const play2024 = { date: '2024-01-20', gameId: 2 };

  test('returns true when play is in specified year', () => {
    expect(isPlayInYear(play2023, 2023)).toBe(true);
    expect(isPlayInYear(play2024, 2024)).toBe(true);
  });

  test('returns false when play is in different year', () => {
    expect(isPlayInYear(play2023, 2024)).toBe(false);
    expect(isPlayInYear(play2024, 2023)).toBe(false);
  });

  test('returns true when year is null', () => {
    expect(isPlayInYear(play2023, null)).toBe(true);
    expect(isPlayInYear(play2024, null)).toBe(true);
  });

  test('returns true when year is undefined', () => {
    expect(isPlayInYear(play2023, undefined)).toBe(true);
  });

  test('returns true when year is 0', () => {
    expect(isPlayInYear(play2023, 0)).toBe(true);
  });
});

describe('filterPlaysByYear', () => {
  const plays = [
    { date: '2023-01-15', gameId: 1 },
    { date: '2023-06-20', gameId: 2 },
    { date: '2024-03-10', gameId: 1 },
    { date: '2024-12-25', gameId: 3 },
  ];

  test('filters plays to specified year', () => {
    const result = filterPlaysByYear(plays, 2023);
    expect(result).toHaveLength(2);
    expect(result.every(p => p.date.startsWith('2023'))).toBe(true);
  });

  test('returns different plays for different year', () => {
    const result = filterPlaysByYear(plays, 2024);
    expect(result).toHaveLength(2);
    expect(result.every(p => p.date.startsWith('2024'))).toBe(true);
  });

  test('returns empty array when no plays in year', () => {
    const result = filterPlaysByYear(plays, 2022);
    expect(result).toHaveLength(0);
  });

  test('returns all plays when year is null', () => {
    const result = filterPlaysByYear(plays, null);
    expect(result).toHaveLength(4);
    expect(result).toBe(plays); // Same reference when no filtering
  });

  test('returns all plays when year is undefined', () => {
    const result = filterPlaysByYear(plays, undefined);
    expect(result).toBe(plays);
  });

  test('returns all plays when year is 0', () => {
    const result = filterPlaysByYear(plays, 0);
    expect(result).toBe(plays);
  });

  test('returns empty array when plays array is empty', () => {
    const result = filterPlaysByYear([], 2023);
    expect(result).toHaveLength(0);
  });
});
