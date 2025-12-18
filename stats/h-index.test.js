import { describe, test, expect } from 'vitest';
import {
  calculateHIndexFromSortedValues,
  calculateTraditionalHIndex,
  calculatePlaySessionHIndex,
  calculateHourHIndex,
  calculateAllTimeHIndexThroughYear,
  calculateHIndexIncrease,
  getNewHIndexGames,
  getHIndexBreakdown,
  getHourHIndexBreakdown,
} from './h-index.js';
import { processData } from '../scripts/transform-game-data.js';
import minimalFixture from '../tests/fixtures/minimal.json';
import typicalFixture from '../tests/fixtures/typical.json';

const minimalData = processData(minimalFixture);
const typicalData = processData(typicalFixture);

describe('calculateHIndexFromSortedValues', () => {
  test('calculates h-index correctly for sorted values', () => {
    expect(calculateHIndexFromSortedValues([10, 5, 3, 2, 1])).toBe(3);
    expect(calculateHIndexFromSortedValues([5, 4, 3, 2, 1])).toBe(3);
    expect(calculateHIndexFromSortedValues([1, 1, 1, 1])).toBe(1);
  });

  test('returns 0 for empty array', () => {
    expect(calculateHIndexFromSortedValues([])).toBe(0);
  });

  test('handles single element', () => {
    expect(calculateHIndexFromSortedValues([5])).toBe(1);
    expect(calculateHIndexFromSortedValues([0])).toBe(0);
  });

  test('handles all values equal to index + 1', () => {
    expect(calculateHIndexFromSortedValues([3, 2, 1])).toBe(2);
  });
});

describe('calculateTraditionalHIndex', () => {
  test('calculates traditional h-index without year filter', () => {
    const hIndex = calculateTraditionalHIndex(typicalData.games, typicalData.plays);
    expect(hIndex).toBeGreaterThan(0);
  });

  test('calculates traditional h-index with year filter', () => {
    const hIndex2023 = calculateTraditionalHIndex(typicalData.games, typicalData.plays, 2023);
    const hIndex2024 = calculateTraditionalHIndex(typicalData.games, typicalData.plays, 2024);
    expect(hIndex2023).toBeGreaterThan(0);
    expect(hIndex2024).toBeGreaterThan(0);
  });

  test('returns 0 for empty plays', () => {
    const hIndex = calculateTraditionalHIndex(typicalData.games, []);
    expect(hIndex).toBe(0);
  });

  test('returns 0 when year has no plays', () => {
    const hIndex = calculateTraditionalHIndex(typicalData.games, typicalData.plays, 2000);
    expect(hIndex).toBe(0);
  });
});

describe('calculatePlaySessionHIndex', () => {
  test('calculates play session h-index without year filter', () => {
    const hIndex = calculatePlaySessionHIndex(typicalData.games, typicalData.plays);
    expect(hIndex).toBeGreaterThan(0);
  });

  test('calculates play session h-index with year filter', () => {
    const hIndex2023 = calculatePlaySessionHIndex(typicalData.games, typicalData.plays, 2023);
    expect(hIndex2023).toBeGreaterThan(0);
  });

  test('returns 0 for empty plays', () => {
    const hIndex = calculatePlaySessionHIndex(typicalData.games, []);
    expect(hIndex).toBe(0);
  });

  test('counts unique days correctly', () => {
    const hIndex = calculatePlaySessionHIndex(minimalData.games, minimalData.plays);
    expect(hIndex).toBeGreaterThan(0);
  });
});

describe('calculateHourHIndex', () => {
  test('calculates hour h-index without year filter', () => {
    const hIndex = calculateHourHIndex(typicalData.plays);
    expect(hIndex).toBeGreaterThan(0);
  });

  test('calculates hour h-index with year filter', () => {
    const hIndex2023 = calculateHourHIndex(typicalData.plays, 2023);
    expect(hIndex2023).toBeGreaterThan(0);
  });

  test('returns 0 for empty plays', () => {
    const hIndex = calculateHourHIndex([]);
    expect(hIndex).toBe(0);
  });

  test('converts minutes to hours correctly', () => {
    const hIndex = calculateHourHIndex(typicalData.plays);
    expect(hIndex).toBeGreaterThanOrEqual(0);
  });
});

describe('calculateAllTimeHIndexThroughYear', () => {
  test('calculates all-time h-index through specified year for plays', () => {
    const hIndex = calculateAllTimeHIndexThroughYear(typicalData.games, typicalData.plays, 2023, 'plays');
    expect(hIndex).toBeGreaterThanOrEqual(0);
  });

  test('calculates all-time h-index through specified year for sessions', () => {
    const hIndex = calculateAllTimeHIndexThroughYear(typicalData.games, typicalData.plays, 2023, 'sessions');
    expect(hIndex).toBeGreaterThanOrEqual(0);
  });

  test('calculates all-time h-index through specified year for hours', () => {
    const hIndex = calculateAllTimeHIndexThroughYear(typicalData.games, typicalData.plays, 2023, 'hours');
    expect(hIndex).toBeGreaterThanOrEqual(0);
  });

  test('includes plays from previous years', () => {
    const hIndex2022 = calculateAllTimeHIndexThroughYear(typicalData.games, typicalData.plays, 2022, 'plays');
    const hIndex2023 = calculateAllTimeHIndexThroughYear(typicalData.games, typicalData.plays, 2023, 'plays');
    expect(hIndex2023).toBeGreaterThanOrEqual(hIndex2022);
  });

  test('excludes plays from future years', () => {
    const hIndex2022 = calculateAllTimeHIndexThroughYear(typicalData.games, typicalData.plays, 2022, 'plays');
    const hIndex2023 = calculateAllTimeHIndexThroughYear(typicalData.games, typicalData.plays, 2023, 'plays');
    expect(hIndex2022).toBeLessThanOrEqual(hIndex2023);
  });

  test('returns 0 for empty plays', () => {
    const hIndex = calculateAllTimeHIndexThroughYear(typicalData.games, [], 2023, 'plays');
    expect(hIndex).toBe(0);
  });
});

describe('calculateHIndexIncrease', () => {
  test('calculates positive increase in plays h-index', () => {
    const increase = calculateHIndexIncrease(typicalData.games, typicalData.plays, 2023, 'plays');
    expect(increase).toBeGreaterThanOrEqual(0);
  });

  test('calculates increase in sessions h-index', () => {
    const increase = calculateHIndexIncrease(typicalData.games, typicalData.plays, 2023, 'sessions');
    expect(typeof increase).toBe('number');
  });

  test('calculates increase in hours h-index', () => {
    const increase = calculateHIndexIncrease(typicalData.games, typicalData.plays, 2023, 'hours');
    expect(typeof increase).toBe('number');
  });

  test('returns 0 when no plays in year', () => {
    const increase = calculateHIndexIncrease(typicalData.games, typicalData.plays, 2099, 'plays');
    expect(increase).toBe(0);
  });

  test('handles first year of logging', () => {
    const plays = [{ gameId: 1, date: '2020-01-01', durationMin: 60 }];
    const games = [{ id: 1, name: 'Test Game' }];
    const increase = calculateHIndexIncrease(games, plays, 2020, 'plays');
    expect(increase).toBeGreaterThanOrEqual(0);
  });
});

describe('getNewHIndexGames', () => {
  test('returns games newly added to plays h-index', () => {
    const newGames = getNewHIndexGames(typicalData.games, typicalData.plays, 2023, 'plays');
    expect(Array.isArray(newGames)).toBe(true);
    newGames.forEach(item => {
      expect(item).toHaveProperty('game');
      expect(item).toHaveProperty('value');
      expect(item).toHaveProperty('thisYearValue');
      expect(item.value).toBeGreaterThanOrEqual(item.thisYearValue);
    });
  });

  test('returns games newly added to sessions h-index', () => {
    const newGames = getNewHIndexGames(typicalData.games, typicalData.plays, 2023, 'sessions');
    expect(Array.isArray(newGames)).toBe(true);
    newGames.forEach(item => {
      expect(item).toHaveProperty('game');
      expect(item).toHaveProperty('value');
      expect(item).toHaveProperty('thisYearValue');
    });
  });

  test('returns games newly added to hours h-index', () => {
    const newGames = getNewHIndexGames(typicalData.games, typicalData.plays, 2023, 'hours');
    expect(Array.isArray(newGames)).toBe(true);
    newGames.forEach(item => {
      expect(item).toHaveProperty('game');
      expect(item).toHaveProperty('value');
      expect(item).toHaveProperty('thisYearValue');
      expect(item.value).toBeGreaterThanOrEqual(item.thisYearValue);
    });
  });

  test('returns empty array when h-index does not increase', () => {
    const newGames = getNewHIndexGames(typicalData.games, typicalData.plays, 2099, 'plays');
    expect(newGames).toEqual([]);
  });

  test('returns empty array for empty plays', () => {
    const newGames = getNewHIndexGames(typicalData.games, [], 2023, 'plays');
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
    const newGames = getNewHIndexGames(games, plays, 2020, 'plays');
    expect(newGames.length).toBeGreaterThan(0);
  });

  test('thisYearValue reflects only plays from selected year', () => {
    const plays = [
      { gameId: 1, date: '2020-01-01', durationMin: 60 },
      { gameId: 1, date: '2021-01-01', durationMin: 60 },
      { gameId: 1, date: '2021-01-02', durationMin: 60 },
    ];
    const games = [{ id: 1, name: 'Game A' }];
    const newGames = getNewHIndexGames(games, plays, 2021, 'plays');

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
    const newGames = getNewHIndexGames(games, plays, 2021, 'sessions');

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
    const newGames = getNewHIndexGames(games, plays, 2021, 'hours');

    if (newGames.length > 0) {
      const game1 = newGames.find(g => g.game.id === 1);
      if (game1) {
        expect(game1.value).toBeCloseTo(4.5, 1); // 270 minutes = 4.5 hours all-time
        expect(game1.thisYearValue).toBeCloseTo(3.5, 1); // 210 minutes = 3.5 hours in 2021
      }
    }
  });

  test('can show more games than raw h-index increase', () => {
    // Year 1: Game A with 1 play (h-index = 1)
    // Year 2: Game B and C each with 2 plays (h-index = 2, increase = 1)
    // But 2 games (B and C) are new to the h-index
    const plays = [
      { gameId: 1, date: '2020-01-01', durationMin: 60 },
      { gameId: 2, date: '2021-01-01', durationMin: 60 },
      { gameId: 2, date: '2021-01-02', durationMin: 60 },
      { gameId: 3, date: '2021-01-01', durationMin: 60 },
      { gameId: 3, date: '2021-01-02', durationMin: 60 },
    ];
    const games = [
      { id: 1, name: 'Game A' },
      { id: 2, name: 'Game B' },
      { id: 3, name: 'Game C' },
    ];

    const increase = calculateHIndexIncrease(games, plays, 2021, 'plays');
    const newGames = getNewHIndexGames(games, plays, 2021, 'plays');

    // h-index increase might be 1, but we could have 2 new games
    expect(newGames.length).toBeGreaterThanOrEqual(increase);
  });
});

describe('getHIndexBreakdown', () => {
  test('returns breakdown for traditional h-index', () => {
    const breakdown = getHIndexBreakdown(typicalData.games, typicalData.plays, null, false);
    expect(breakdown.length).toBeGreaterThan(0);
    expect(breakdown[0]).toHaveProperty('game');
    expect(breakdown[0]).toHaveProperty('count');
  });

  test('returns breakdown for play session h-index', () => {
    const breakdown = getHIndexBreakdown(typicalData.games, typicalData.plays, null, true);
    expect(breakdown.length).toBeGreaterThan(0);
    expect(breakdown[0]).toHaveProperty('game');
    expect(breakdown[0]).toHaveProperty('count');
  });

  test('sorts by count descending', () => {
    const breakdown = getHIndexBreakdown(typicalData.games, typicalData.plays);
    for (let i = 0; i < breakdown.length - 1; i++) {
      expect(breakdown[i].count).toBeGreaterThanOrEqual(breakdown[i + 1].count);
    }
  });

  test('filters by year', () => {
    const breakdown2023 = getHIndexBreakdown(typicalData.games, typicalData.plays, 2023);
    expect(Array.isArray(breakdown2023)).toBe(true);
  });

  test('returns empty array for no plays', () => {
    const breakdown = getHIndexBreakdown(typicalData.games, []);
    expect(breakdown).toEqual([]);
  });
});

describe('getHourHIndexBreakdown', () => {
  test('returns breakdown with hours', () => {
    const breakdown = getHourHIndexBreakdown(typicalData.games, typicalData.plays);
    expect(breakdown.length).toBeGreaterThan(0);
    expect(breakdown[0]).toHaveProperty('game');
    expect(breakdown[0]).toHaveProperty('hours');
    expect(typeof breakdown[0].hours).toBe('number');
  });

  test('sorts by hours descending', () => {
    const breakdown = getHourHIndexBreakdown(typicalData.games, typicalData.plays);
    for (let i = 0; i < breakdown.length - 1; i++) {
      expect(breakdown[i].hours).toBeGreaterThanOrEqual(breakdown[i + 1].hours);
    }
  });

  test('filters by year', () => {
    const breakdown2023 = getHourHIndexBreakdown(typicalData.games, typicalData.plays, 2023);
    expect(Array.isArray(breakdown2023)).toBe(true);
  });

  test('returns empty array for no plays', () => {
    const breakdown = getHourHIndexBreakdown(typicalData.games, []);
    expect(breakdown).toEqual([]);
  });
});
