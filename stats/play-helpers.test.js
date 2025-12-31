import { describe, test, expect } from 'vitest';
import { isPlayInYear, isPlayInOrBeforeYear, filterPlaysByYear, getMetricValuesThroughYear } from './play-helpers.js';

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

describe('isPlayInOrBeforeYear', () => {
  const play2022 = { date: '2022-03-10', gameId: 1 };
  const play2023 = { date: '2023-06-15', gameId: 2 };
  const play2024 = { date: '2024-01-20', gameId: 3 };

  test('returns true when play is in specified year', () => {
    expect(isPlayInOrBeforeYear(play2023, 2023)).toBe(true);
    expect(isPlayInOrBeforeYear(play2024, 2024)).toBe(true);
  });

  test('returns true when play is before specified year', () => {
    expect(isPlayInOrBeforeYear(play2022, 2023)).toBe(true);
    expect(isPlayInOrBeforeYear(play2022, 2024)).toBe(true);
    expect(isPlayInOrBeforeYear(play2023, 2024)).toBe(true);
  });

  test('returns false when play is after specified year', () => {
    expect(isPlayInOrBeforeYear(play2024, 2023)).toBe(false);
    expect(isPlayInOrBeforeYear(play2024, 2022)).toBe(false);
    expect(isPlayInOrBeforeYear(play2023, 2022)).toBe(false);
  });

  test('returns true when year is null', () => {
    expect(isPlayInOrBeforeYear(play2023, null)).toBe(true);
    expect(isPlayInOrBeforeYear(play2024, null)).toBe(true);
  });

  test('returns true when year is undefined', () => {
    expect(isPlayInOrBeforeYear(play2023, undefined)).toBe(true);
  });

  test('returns true when year is 0', () => {
    expect(isPlayInOrBeforeYear(play2023, 0)).toBe(true);
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

describe('getMetricValuesThroughYear', () => {
  const plays = [
    { gameId: 1, date: '2022-06-15', durationMin: 60 },
    { gameId: 1, date: '2023-01-10', durationMin: 90 },
    { gameId: 1, date: '2023-01-10', durationMin: 30 }, // Same day as above
    { gameId: 2, date: '2023-03-20', durationMin: 120 },
    { gameId: 1, date: '2024-05-01', durationMin: 45 },
  ];

  test('returns Map of game metrics', () => {
    const result = getMetricValuesThroughYear(plays);
    expect(result instanceof Map).toBe(true);
  });

  test('calculates playCount correctly', () => {
    const result = getMetricValuesThroughYear(plays);
    const game1Data = result.get(1);
    expect(game1Data.playCount).toBe(4);
  });

  test('calculates uniqueDates correctly', () => {
    const result = getMetricValuesThroughYear(plays);
    const game1Data = result.get(1);
    // 3 unique dates: 2022-06-15, 2023-01-10, 2024-05-01
    expect(game1Data.uniqueDates.size).toBe(3);
  });

  test('calculates totalMinutes correctly', () => {
    const result = getMetricValuesThroughYear(plays);
    const game1Data = result.get(1);
    expect(game1Data.totalMinutes).toBe(225); // 60 + 90 + 30 + 45
  });

  test('filters by year when provided', () => {
    const result2023 = getMetricValuesThroughYear(plays, 2023);
    const result2024 = getMetricValuesThroughYear(plays, 2024);

    // Through 2023: game 1 has 3 plays (2022 + 2023)
    expect(result2023.get(1).playCount).toBe(3);
    // Through 2024: game 1 has 4 plays (all)
    expect(result2024.get(1).playCount).toBe(4);
  });

  test('returns all plays when year is null', () => {
    const result = getMetricValuesThroughYear(plays, null);
    expect(result.get(1).playCount).toBe(4);
    expect(result.get(2).playCount).toBe(1);
  });

  test('returns empty Map for empty plays array', () => {
    const result = getMetricValuesThroughYear([]);
    expect(result.size).toBe(0);
  });

  test('handles plays with zero duration', () => {
    const playsWithZero = [
      { gameId: 1, date: '2023-01-01', durationMin: 0 },
      { gameId: 1, date: '2023-01-02', durationMin: 60 },
    ];
    const result = getMetricValuesThroughYear(playsWithZero);
    expect(result.get(1).totalMinutes).toBe(60);
    expect(result.get(1).playCount).toBe(2);
  });

  test('handles plays with undefined duration', () => {
    const playsWithUndefined = [
      { gameId: 1, date: '2023-01-01' },
      { gameId: 1, date: '2023-01-02', durationMin: 60 },
    ];
    const result = getMetricValuesThroughYear(playsWithUndefined);
    expect(result.get(1).totalMinutes).toBe(60);
    expect(result.get(1).playCount).toBe(2);
  });
});
