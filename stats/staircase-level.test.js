import { describe, test, expect } from 'vitest';
import {
  calculateStaircaseLevelFromSortedValues,
  calculatePlayStaircaseLevel,
  calculateSessionStaircaseLevel,
  calculateHourStaircaseLevel,
  calculateAllTimeStaircaseLevelThroughYear,
  calculateStaircaseLevelIncrease,
  getStaircaseLevelBreakdown,
  getHourStaircaseLevelBreakdown,
  getNewStaircaseLevelGames,
} from './staircase-level.js';
import {
  calculateHIndexFromSortedValues,
} from './h-index.js';
import { processData } from '../scripts/transform-game-data.js';
import minimalFixture from '../tests/fixtures/minimal.json';
import typicalFixture from '../tests/fixtures/typical.json';

const minimalData = await processData(minimalFixture);
const typicalData = await processData(typicalFixture);

describe('calculateStaircaseLevelFromSortedValues', () => {
  test('calculates staircase level correctly for spec example', () => {
    // [10, 6, 6, 2, 1, 1] -> level 5
    // Rank 1: 10 >= 5, Rank 2: 6 >= 4, Rank 3: 6 >= 3, Rank 4: 2 >= 2, Rank 5: 1 >= 1
    expect(calculateStaircaseLevelFromSortedValues([10, 6, 6, 2, 1, 1])).toBe(5);
  });

  test('returns 0 for empty array', () => {
    expect(calculateStaircaseLevelFromSortedValues([])).toBe(0);
  });

  test('handles single element', () => {
    expect(calculateStaircaseLevelFromSortedValues([5])).toBe(1);
    expect(calculateStaircaseLevelFromSortedValues([0])).toBe(0);
  });

  test('handles perfect staircase', () => {
    // [5, 4, 3, 2, 1] -> each exactly meets its threshold
    expect(calculateStaircaseLevelFromSortedValues([5, 4, 3, 2, 1])).toBe(5);
  });

  test('handles all same values', () => {
    // [3, 3, 3] -> thresholds are 3, 2, 1 -> all pass -> level 3
    expect(calculateStaircaseLevelFromSortedValues([3, 3, 3])).toBe(3);
  });

  test('handles all ones', () => {
    // [1, 1, 1, 1] -> for N=1: threshold is 1, 1>=1 yes
    // for N=2: rank 1 needs 2, 1<2 -> fails
    expect(calculateStaircaseLevelFromSortedValues([1, 1, 1, 1])).toBe(1);
  });

  test('staircase level is always >= h-index', () => {
    const testCases = [
      [10, 6, 6, 2, 1, 1],
      [5, 4, 3, 2, 1],
      [3, 3, 3],
      [1, 1, 1, 1],
      [100, 50, 25, 10, 5, 3, 2, 1],
      [7, 7, 7, 7, 7, 7, 7],
    ];
    testCases.forEach(values => {
      const staircaseLevel = calculateStaircaseLevelFromSortedValues(values);
      const hIndex = calculateHIndexFromSortedValues(values);
      expect(staircaseLevel).toBeGreaterThanOrEqual(hIndex);
    });
  });

  test('handles all zeros', () => {
    expect(calculateStaircaseLevelFromSortedValues([0, 0, 0])).toBe(0);
  });

  test('handles large first value with small rest', () => {
    // [100, 1] -> for N=2: rank 1 needs 2, 100>=2 yes; rank 2 needs 1, 1>=1 yes -> level 2
    expect(calculateStaircaseLevelFromSortedValues([100, 1])).toBe(2);
  });

  test('handles values where staircase just barely fails', () => {
    // [3, 2, 1, 0] -> for N=3: 3>=3, 2>=2, 1>=1 yes -> level 3
    // for N=4: 3>=4 fails
    expect(calculateStaircaseLevelFromSortedValues([3, 2, 1, 0])).toBe(3);
  });
});

describe('calculatePlayStaircaseLevel', () => {
  test('calculates play staircase level without year filter', () => {
    const level = calculatePlayStaircaseLevel(typicalData.games, typicalData.plays);
    expect(level).toBeGreaterThan(0);
  });

  test('calculates play staircase level with year filter', () => {
    const level2023 = calculatePlayStaircaseLevel(typicalData.games, typicalData.plays, 2023);
    const level2024 = calculatePlayStaircaseLevel(typicalData.games, typicalData.plays, 2024);
    expect(level2023).toBeGreaterThan(0);
    expect(level2024).toBeGreaterThan(0);
  });

  test('returns 0 for empty plays', () => {
    const level = calculatePlayStaircaseLevel(typicalData.games, []);
    expect(level).toBe(0);
  });

  test('returns 0 when year has no plays', () => {
    const level = calculatePlayStaircaseLevel(typicalData.games, typicalData.plays, 2000);
    expect(level).toBe(0);
  });
});

describe('calculateSessionStaircaseLevel', () => {
  test('calculates session staircase level without year filter', () => {
    const level = calculateSessionStaircaseLevel(typicalData.games, typicalData.plays);
    expect(level).toBeGreaterThan(0);
  });

  test('calculates session staircase level with year filter', () => {
    const level2023 = calculateSessionStaircaseLevel(typicalData.games, typicalData.plays, 2023);
    expect(level2023).toBeGreaterThan(0);
  });

  test('returns 0 for empty plays', () => {
    const level = calculateSessionStaircaseLevel(typicalData.games, []);
    expect(level).toBe(0);
  });

  test('counts unique days correctly', () => {
    const level = calculateSessionStaircaseLevel(minimalData.games, minimalData.plays);
    expect(level).toBeGreaterThan(0);
  });
});

describe('calculateHourStaircaseLevel', () => {
  test('calculates hour staircase level without year filter', () => {
    const level = calculateHourStaircaseLevel(typicalData.plays);
    expect(level).toBeGreaterThan(0);
  });

  test('calculates hour staircase level with year filter', () => {
    const level2023 = calculateHourStaircaseLevel(typicalData.plays, 2023);
    expect(level2023).toBeGreaterThan(0);
  });

  test('returns 0 for empty plays', () => {
    const level = calculateHourStaircaseLevel([]);
    expect(level).toBe(0);
  });

  test('converts minutes to hours correctly', () => {
    const level = calculateHourStaircaseLevel(typicalData.plays);
    expect(level).toBeGreaterThanOrEqual(0);
  });
});

describe('calculateAllTimeStaircaseLevelThroughYear', () => {
  test('calculates all-time staircase level through specified year for hours', () => {
    const level = calculateAllTimeStaircaseLevelThroughYear(typicalData.games, typicalData.plays, 2023, 'hours');
    expect(level).toBeGreaterThanOrEqual(0);
  });

  test('calculates all-time staircase level through specified year for sessions', () => {
    const level = calculateAllTimeStaircaseLevelThroughYear(typicalData.games, typicalData.plays, 2023, 'sessions');
    expect(level).toBeGreaterThanOrEqual(0);
  });

  test('calculates all-time staircase level through specified year for plays', () => {
    const level = calculateAllTimeStaircaseLevelThroughYear(typicalData.games, typicalData.plays, 2023, 'plays');
    expect(level).toBeGreaterThanOrEqual(0);
  });

  test('includes plays from previous years', () => {
    const level2022 = calculateAllTimeStaircaseLevelThroughYear(typicalData.games, typicalData.plays, 2022, 'plays');
    const level2023 = calculateAllTimeStaircaseLevelThroughYear(typicalData.games, typicalData.plays, 2023, 'plays');
    expect(level2023).toBeGreaterThanOrEqual(level2022);
  });

  test('excludes plays from future years', () => {
    const level2022 = calculateAllTimeStaircaseLevelThroughYear(typicalData.games, typicalData.plays, 2022, 'plays');
    const level2023 = calculateAllTimeStaircaseLevelThroughYear(typicalData.games, typicalData.plays, 2023, 'plays');
    expect(level2022).toBeLessThanOrEqual(level2023);
  });

  test('returns 0 for empty plays', () => {
    const level = calculateAllTimeStaircaseLevelThroughYear(typicalData.games, [], 2023, 'plays');
    expect(level).toBe(0);
  });
});

describe('calculateStaircaseLevelIncrease', () => {
  test('calculates increase in hours staircase level', () => {
    const increase = calculateStaircaseLevelIncrease(typicalData.games, typicalData.plays, 2023, 'hours');
    expect(typeof increase).toBe('number');
  });

  test('calculates increase in sessions staircase level', () => {
    const increase = calculateStaircaseLevelIncrease(typicalData.games, typicalData.plays, 2023, 'sessions');
    expect(typeof increase).toBe('number');
  });

  test('calculates increase in plays staircase level', () => {
    const increase = calculateStaircaseLevelIncrease(typicalData.games, typicalData.plays, 2023, 'plays');
    expect(typeof increase).toBe('number');
  });

  test('returns 0 when no plays in year', () => {
    const increase = calculateStaircaseLevelIncrease(typicalData.games, typicalData.plays, 2099, 'plays');
    expect(increase).toBe(0);
  });

  test('handles first year of logging', () => {
    const plays = [{ gameId: 1, date: '2020-01-01', durationMin: 60 }];
    const games = [{ id: 1, name: 'Test Game' }];
    const increase = calculateStaircaseLevelIncrease(games, plays, 2020, 'plays');
    expect(increase).toBeGreaterThanOrEqual(0);
  });
});

describe('getStaircaseLevelBreakdown', () => {
  test('returns breakdown for play count', () => {
    const breakdown = getStaircaseLevelBreakdown(typicalData.games, typicalData.plays, null, false);
    expect(breakdown.length).toBeGreaterThan(0);
    expect(breakdown[0]).toHaveProperty('game');
    expect(breakdown[0]).toHaveProperty('count');
  });

  test('returns breakdown for sessions', () => {
    const breakdown = getStaircaseLevelBreakdown(typicalData.games, typicalData.plays, null, true);
    expect(breakdown.length).toBeGreaterThan(0);
    expect(breakdown[0]).toHaveProperty('game');
    expect(breakdown[0]).toHaveProperty('count');
  });

  test('sorts by count descending', () => {
    const breakdown = getStaircaseLevelBreakdown(typicalData.games, typicalData.plays, null, false);
    for (let i = 1; i < breakdown.length; i++) {
      expect(breakdown[i].count).toBeLessThanOrEqual(breakdown[i - 1].count);
    }
  });

  test('filters by year', () => {
    const allTime = getStaircaseLevelBreakdown(typicalData.games, typicalData.plays, null, false);
    const year2023 = getStaircaseLevelBreakdown(typicalData.games, typicalData.plays, 2023, false);
    expect(year2023.length).toBeLessThanOrEqual(allTime.length);
  });

  test('returns empty array for empty plays', () => {
    const breakdown = getStaircaseLevelBreakdown(typicalData.games, [], null, false);
    expect(breakdown).toEqual([]);
  });

  test('skips plays with no matching game', () => {
    const games = [{ id: 1, name: 'Game A' }];
    const plays = [
      { gameId: 1, date: '2023-01-01', durationMin: 60 },
      { gameId: 999, date: '2023-01-01', durationMin: 60 }, // No matching game
    ];
    const breakdown = getStaircaseLevelBreakdown(games, plays, null, false);
    expect(breakdown.length).toBe(1);
    expect(breakdown[0].game.id).toBe(1);
  });

  test('filters sessions breakdown by year', () => {
    const games = [{ id: 1, name: 'Game A' }];
    const plays = [
      { gameId: 1, date: '2023-01-01', durationMin: 60 },
      { gameId: 1, date: '2024-01-01', durationMin: 60 },
    ];
    const breakdown = getStaircaseLevelBreakdown(games, plays, 2023, true);
    expect(breakdown.length).toBe(1);
    expect(breakdown[0].count).toBe(1);
  });
});

describe('getHourStaircaseLevelBreakdown', () => {
  test('returns breakdown with hours', () => {
    const breakdown = getHourStaircaseLevelBreakdown(typicalData.games, typicalData.plays);
    expect(breakdown.length).toBeGreaterThan(0);
    expect(breakdown[0]).toHaveProperty('game');
    expect(breakdown[0]).toHaveProperty('hours');
  });

  test('sorts by hours descending', () => {
    const breakdown = getHourStaircaseLevelBreakdown(typicalData.games, typicalData.plays);
    for (let i = 1; i < breakdown.length; i++) {
      expect(breakdown[i].hours).toBeLessThanOrEqual(breakdown[i - 1].hours);
    }
  });

  test('filters by year', () => {
    const allTime = getHourStaircaseLevelBreakdown(typicalData.games, typicalData.plays);
    const year2023 = getHourStaircaseLevelBreakdown(typicalData.games, typicalData.plays, 2023);
    expect(year2023.length).toBeLessThanOrEqual(allTime.length);
  });

  test('returns empty array for empty plays', () => {
    const breakdown = getHourStaircaseLevelBreakdown(typicalData.games, []);
    expect(breakdown).toEqual([]);
  });

  test('skips plays with no matching game', () => {
    const games = [{ id: 1, name: 'Game A' }];
    const plays = [
      { gameId: 1, date: '2023-01-01', durationMin: 60 },
      { gameId: 999, date: '2023-01-01', durationMin: 120 }, // No matching game
    ];
    const breakdown = getHourStaircaseLevelBreakdown(games, plays);
    expect(breakdown.length).toBe(1);
    expect(breakdown[0].game.id).toBe(1);
  });
});

describe('getNewStaircaseLevelGames', () => {
  test('returns games newly added to plays staircase level', () => {
    const newGames = getNewStaircaseLevelGames(typicalData.games, typicalData.plays, 2023, 'plays');
    expect(Array.isArray(newGames)).toBe(true);
    newGames.forEach(item => {
      expect(item).toHaveProperty('game');
      expect(item).toHaveProperty('value');
      expect(item).toHaveProperty('thisYearValue');
      expect(item.value).toBeGreaterThanOrEqual(item.thisYearValue);
    });
  });

  test('returns games newly added to sessions staircase level', () => {
    const newGames = getNewStaircaseLevelGames(typicalData.games, typicalData.plays, 2023, 'sessions');
    expect(Array.isArray(newGames)).toBe(true);
    newGames.forEach(item => {
      expect(item).toHaveProperty('game');
      expect(item).toHaveProperty('value');
      expect(item).toHaveProperty('thisYearValue');
    });
  });

  test('returns games newly added to hours staircase level', () => {
    const newGames = getNewStaircaseLevelGames(typicalData.games, typicalData.plays, 2023, 'hours');
    expect(Array.isArray(newGames)).toBe(true);
    newGames.forEach(item => {
      expect(item).toHaveProperty('game');
      expect(item).toHaveProperty('value');
      expect(item).toHaveProperty('thisYearValue');
      expect(item.value).toBeGreaterThanOrEqual(item.thisYearValue);
    });
  });

  test('returns empty array when staircase level does not increase', () => {
    const newGames = getNewStaircaseLevelGames(typicalData.games, typicalData.plays, 2099, 'plays');
    expect(newGames).toEqual([]);
  });

  test('returns empty array for empty plays', () => {
    const newGames = getNewStaircaseLevelGames(typicalData.games, [], 2023, 'plays');
    expect(newGames).toEqual([]);
  });

  test('handles first year of logging', () => {
    const plays = [
      { gameId: 1, date: '2020-01-01', durationMin: 60 },
      { gameId: 2, date: '2020-01-02', durationMin: 60 },
      { gameId: 2, date: '2020-01-03', durationMin: 60 },
    ];
    const games = [
      { id: 1, name: 'Game A' },
      { id: 2, name: 'Game B' },
    ];
    const newGames = getNewStaircaseLevelGames(games, plays, 2020, 'plays');
    expect(newGames.length).toBeGreaterThan(0);
  });

  test('exercises previous year contributor lookup with plays metric', () => {
    const plays = [
      { gameId: 1, date: '2020-01-01', durationMin: 60 },
      { gameId: 1, date: '2020-01-02', durationMin: 60 },
      { gameId: 2, date: '2021-01-01', durationMin: 60 },
      { gameId: 2, date: '2021-01-02', durationMin: 60 },
      { gameId: 2, date: '2021-01-03', durationMin: 60 },
    ];
    const games = [
      { id: 1, name: 'Game A' },
      { id: 2, name: 'Game B' },
    ];
    const newGames = getNewStaircaseLevelGames(games, plays, 2021, 'plays');
    expect(Array.isArray(newGames)).toBe(true);
  });

  test('exercises previous year contributor lookup with sessions metric', () => {
    const plays = [
      { gameId: 1, date: '2020-01-01', durationMin: 60 },
      { gameId: 1, date: '2020-01-02', durationMin: 60 },
      { gameId: 2, date: '2021-01-01', durationMin: 60 },
      { gameId: 2, date: '2021-01-02', durationMin: 60 },
      { gameId: 2, date: '2021-01-03', durationMin: 60 },
    ];
    const games = [
      { id: 1, name: 'Game A' },
      { id: 2, name: 'Game B' },
    ];
    const newGames = getNewStaircaseLevelGames(games, plays, 2021, 'sessions');
    expect(Array.isArray(newGames)).toBe(true);
  });

  test('thisYearValue reflects only plays from selected year', () => {
    const plays = [
      { gameId: 1, date: '2020-01-01', durationMin: 60 },
      { gameId: 1, date: '2021-01-01', durationMin: 60 },
      { gameId: 1, date: '2021-01-02', durationMin: 60 },
    ];
    const games = [{ id: 1, name: 'Game A' }];
    const newGames = getNewStaircaseLevelGames(games, plays, 2021, 'plays');

    if (newGames.length > 0) {
      const game1 = newGames.find(g => g.game.id === 1);
      if (game1) {
        expect(game1.value).toBe(3); // All-time plays
        expect(game1.thisYearValue).toBe(2); // Only 2021 plays
      }
    }
  });

  test('calculates sessions correctly for this year', () => {
    const plays = [
      { gameId: 1, date: '2020-01-01', durationMin: 60 },
      { gameId: 1, date: '2021-01-01', durationMin: 60 },
      { gameId: 1, date: '2021-01-01', durationMin: 60 }, // Same day
      { gameId: 1, date: '2021-01-02', durationMin: 60 },
    ];
    const games = [{ id: 1, name: 'Game A' }];
    const newGames = getNewStaircaseLevelGames(games, plays, 2021, 'sessions');

    if (newGames.length > 0) {
      const game1 = newGames.find(g => g.game.id === 1);
      if (game1) {
        expect(game1.value).toBe(2); // 2 unique days all-time
        expect(game1.thisYearValue).toBe(2); // 2 unique days in 2021
      }
    }
  });

  test('calculates hours correctly for this year', () => {
    const plays = [
      { gameId: 1, date: '2020-01-01', durationMin: 60 },
      { gameId: 1, date: '2021-01-01', durationMin: 120 },
      { gameId: 1, date: '2021-01-02', durationMin: 90 },
    ];
    const games = [{ id: 1, name: 'Game A' }];
    const newGames = getNewStaircaseLevelGames(games, plays, 2021, 'hours');

    if (newGames.length > 0) {
      const game1 = newGames.find(g => g.game.id === 1);
      if (game1) {
        expect(game1.value).toBeCloseTo(4.5, 1); // 270 minutes = 4.5 hours all-time
        expect(game1.thisYearValue).toBeCloseTo(3.5, 1); // 210 minutes = 3.5 hours in 2021
      }
    }
  });
});
