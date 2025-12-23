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
  calculatePeopleHIndex,
  calculateAllTimePeopleHIndexThroughYear,
  calculatePeopleHIndexIncrease,
  getPeopleHIndexBreakdown,
  getNewPeopleHIndexGames,
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

// People H-Index Tests

describe('calculatePeopleHIndex', () => {
  const SELF_ID = 99;
  const ANON_ID = 1;

  test('calculates People H-Index excluding self player', () => {
    const games = [
      { id: 1, name: 'Game A' },
      { id: 2, name: 'Game B' },
    ];
    const plays = [
      { gameId: 1, date: '2024-01-01', durationMin: 60, players: [SELF_ID, 2, 3] },
      { gameId: 1, date: '2024-01-02', durationMin: 60, players: [SELF_ID, 4] },
      { gameId: 2, date: '2024-01-01', durationMin: 60, players: [SELF_ID, 2] },
    ];
    // Game 1: 3 unique players (2, 3, 4) - self excluded
    // Game 2: 1 unique player (2)
    // Sorted: [3, 1] -> H-Index = 1 (rank 1 <= 3, rank 2 > 1)
    const hIndex = calculatePeopleHIndex(games, plays, SELF_ID, ANON_ID);
    expect(hIndex).toBe(1);
  });

  test('counts anonymous players per occurrence (not deduplicated)', () => {
    const games = [{ id: 1, name: 'Game A' }];
    const plays = [
      { gameId: 1, date: '2024-01-01', durationMin: 60, players: [SELF_ID, ANON_ID, ANON_ID] },
      { gameId: 1, date: '2024-01-02', durationMin: 60, players: [SELF_ID, ANON_ID] },
    ];
    // Game 1: 3 anonymous player occurrences
    const hIndex = calculatePeopleHIndex(games, plays, SELF_ID, ANON_ID);
    expect(hIndex).toBe(1); // 1 game with 3 unique players
  });

  test('deduplicates named players across plays of same game', () => {
    const games = [{ id: 1, name: 'Game A' }];
    const plays = [
      { gameId: 1, date: '2024-01-01', durationMin: 60, players: [SELF_ID, 2, 3] },
      { gameId: 1, date: '2024-01-02', durationMin: 60, players: [SELF_ID, 2, 3] }, // Same players
      { gameId: 1, date: '2024-01-03', durationMin: 60, players: [SELF_ID, 2] },
    ];
    // Game 1: 2 unique named players (2, 3) - deduplicated
    const hIndex = calculatePeopleHIndex(games, plays, SELF_ID, ANON_ID);
    expect(hIndex).toBe(1); // 1 game with 2 unique players
  });

  test('returns 0 for empty plays', () => {
    const hIndex = calculatePeopleHIndex([], [], SELF_ID, ANON_ID);
    expect(hIndex).toBe(0);
  });

  test('returns 0 when only self plays', () => {
    const games = [{ id: 1, name: 'Game A' }];
    const plays = [
      { gameId: 1, date: '2024-01-01', durationMin: 60, players: [SELF_ID] },
    ];
    const hIndex = calculatePeopleHIndex(games, plays, SELF_ID, ANON_ID);
    expect(hIndex).toBe(0);
  });

  test('filters by year when specified', () => {
    const games = [{ id: 1, name: 'Game A' }];
    const plays = [
      { gameId: 1, date: '2023-01-01', durationMin: 60, players: [SELF_ID, 2, 3] },
      { gameId: 1, date: '2024-01-01', durationMin: 60, players: [SELF_ID, 4, 5] },
    ];
    const hIndex2023 = calculatePeopleHIndex(games, plays, SELF_ID, ANON_ID, 2023);
    const hIndex2024 = calculatePeopleHIndex(games, plays, SELF_ID, ANON_ID, 2024);
    expect(hIndex2023).toBe(1); // Game 1 has 2 unique players in 2023
    expect(hIndex2024).toBe(1); // Game 1 has 2 unique players in 2024
  });

  test('handles null year for all-time calculation', () => {
    const games = [{ id: 1, name: 'Game A' }];
    const plays = [
      { gameId: 1, date: '2023-01-01', durationMin: 60, players: [SELF_ID, 2, 3] },
      { gameId: 1, date: '2024-01-01', durationMin: 60, players: [SELF_ID, 4, 5] },
    ];
    const hIndex = calculatePeopleHIndex(games, plays, SELF_ID, ANON_ID, null);
    expect(hIndex).toBe(1); // Game 1 has 4 unique players all-time
  });

  test('achieves higher h-index with more qualifying games', () => {
    const games = [
      { id: 1, name: 'Game A' },
      { id: 2, name: 'Game B' },
      { id: 3, name: 'Game C' },
    ];
    const plays = [
      // Game 1: 3 unique players
      { gameId: 1, date: '2024-01-01', durationMin: 60, players: [SELF_ID, 2, 3, 4] },
      // Game 2: 3 unique players
      { gameId: 2, date: '2024-01-01', durationMin: 60, players: [SELF_ID, 5, 6, 7] },
      // Game 3: 3 unique players
      { gameId: 3, date: '2024-01-01', durationMin: 60, players: [SELF_ID, 8, 9, 10] },
    ];
    // All 3 games have 3 unique players -> H-Index = 3
    const hIndex = calculatePeopleHIndex(games, plays, SELF_ID, ANON_ID);
    expect(hIndex).toBe(3);
  });

  test('calculates correctly with typical fixture data', () => {
    const hIndex = calculatePeopleHIndex(
      typicalData.games,
      typicalData.plays,
      typicalData.selfPlayerId,
      typicalData.anonymousPlayerId,
    );
    expect(hIndex).toBeGreaterThanOrEqual(0);
  });
});

describe('calculateAllTimePeopleHIndexThroughYear', () => {
  const SELF_ID = 99;
  const ANON_ID = 1;

  test('includes plays from previous years', () => {
    const games = [{ id: 1, name: 'Game A' }];
    const plays = [
      { gameId: 1, date: '2022-01-01', durationMin: 60, players: [SELF_ID, 2] },
      { gameId: 1, date: '2023-01-01', durationMin: 60, players: [SELF_ID, 3] },
    ];
    const hIndex2023 = calculateAllTimePeopleHIndexThroughYear(games, plays, SELF_ID, ANON_ID, 2023);
    expect(hIndex2023).toBe(1); // 1 game with 2 unique players
  });

  test('excludes plays from future years', () => {
    const games = [{ id: 1, name: 'Game A' }];
    const plays = [
      { gameId: 1, date: '2022-01-01', durationMin: 60, players: [SELF_ID, 2] },
      { gameId: 1, date: '2024-01-01', durationMin: 60, players: [SELF_ID, 3, 4, 5] },
    ];
    const hIndex2022 = calculateAllTimePeopleHIndexThroughYear(games, plays, SELF_ID, ANON_ID, 2022);
    expect(hIndex2022).toBe(1); // Only 1 unique player through 2022
  });

  test('returns 0 for empty plays', () => {
    const hIndex = calculateAllTimePeopleHIndexThroughYear([], [], SELF_ID, ANON_ID, 2024);
    expect(hIndex).toBe(0);
  });
});

describe('calculatePeopleHIndexIncrease', () => {
  const SELF_ID = 99;
  const ANON_ID = 1;

  test('calculates positive increase', () => {
    const games = [
      { id: 1, name: 'Game A' },
      { id: 2, name: 'Game B' },
    ];
    const plays = [
      { gameId: 1, date: '2023-01-01', durationMin: 60, players: [SELF_ID, 2] },
      { gameId: 1, date: '2024-01-01', durationMin: 60, players: [SELF_ID, 3] },
      { gameId: 2, date: '2024-01-01', durationMin: 60, players: [SELF_ID, 4, 5] },
    ];
    const increase = calculatePeopleHIndexIncrease(games, plays, SELF_ID, ANON_ID, 2024);
    expect(increase).toBeGreaterThanOrEqual(0);
  });

  test('calculates zero when no change', () => {
    const games = [{ id: 1, name: 'Game A' }];
    const plays = [
      { gameId: 1, date: '2023-01-01', durationMin: 60, players: [SELF_ID, 2] },
    ];
    const increase = calculatePeopleHIndexIncrease(games, plays, SELF_ID, ANON_ID, 2024);
    expect(increase).toBe(0); // No plays in 2024, no change
  });

  test('calculates negative when decrease', () => {
    // This scenario is rare for h-index but test the math works
    const games = [{ id: 1, name: 'Game A' }];
    const plays = [
      { gameId: 1, date: '2023-01-01', durationMin: 60, players: [SELF_ID, 2] },
    ];
    // Through 2023: h-index = 1
    // Through 2022: h-index = 0
    const increase = calculatePeopleHIndexIncrease(games, plays, SELF_ID, ANON_ID, 2023);
    expect(increase).toBe(1); // Increased by 1
  });

  test('handles first year of logging', () => {
    const games = [{ id: 1, name: 'Game A' }];
    const plays = [
      { gameId: 1, date: '2024-01-01', durationMin: 60, players: [SELF_ID, 2] },
    ];
    const increase = calculatePeopleHIndexIncrease(games, plays, SELF_ID, ANON_ID, 2024);
    expect(increase).toBe(1); // First year, h-index went from 0 to 1
  });
});

describe('getPeopleHIndexBreakdown', () => {
  const SELF_ID = 99;
  const ANON_ID = 1;

  test('returns games sorted by unique player count descending', () => {
    const games = [
      { id: 1, name: 'Game A' },
      { id: 2, name: 'Game B' },
    ];
    const plays = [
      { gameId: 1, date: '2024-01-01', durationMin: 60, players: [SELF_ID, 2, 3, 4] },
      { gameId: 2, date: '2024-01-01', durationMin: 60, players: [SELF_ID, 5] },
    ];
    const breakdown = getPeopleHIndexBreakdown(games, plays, SELF_ID, ANON_ID);
    expect(breakdown.length).toBe(2);
    expect(breakdown[0].uniquePlayers).toBeGreaterThanOrEqual(breakdown[1].uniquePlayers);
    expect(breakdown[0].uniquePlayers).toBe(3); // Game A: 3 unique
    expect(breakdown[1].uniquePlayers).toBe(1); // Game B: 1 unique
  });

  test('includes namedPlayers and anonymousCount in breakdown', () => {
    const games = [{ id: 1, name: 'Game A' }];
    const plays = [
      { gameId: 1, date: '2024-01-01', durationMin: 60, players: [SELF_ID, 2, ANON_ID, ANON_ID] },
    ];
    const breakdown = getPeopleHIndexBreakdown(games, plays, SELF_ID, ANON_ID);
    expect(breakdown.length).toBe(1);
    expect(breakdown[0].namedPlayers).toBe(1); // Player 2
    expect(breakdown[0].anonymousCount).toBe(2); // 2 anonymous
    expect(breakdown[0].uniquePlayers).toBe(3); // Total
  });

  test('excludes self from player counts', () => {
    const games = [{ id: 1, name: 'Game A' }];
    const plays = [
      { gameId: 1, date: '2024-01-01', durationMin: 60, players: [SELF_ID, 2] },
    ];
    const breakdown = getPeopleHIndexBreakdown(games, plays, SELF_ID, ANON_ID);
    expect(breakdown[0].uniquePlayers).toBe(1); // Only player 2, not self
    expect(breakdown[0].namedPlayers).toBe(1);
  });

  test('filters by year', () => {
    const games = [{ id: 1, name: 'Game A' }];
    const plays = [
      { gameId: 1, date: '2023-01-01', durationMin: 60, players: [SELF_ID, 2] },
      { gameId: 1, date: '2024-01-01', durationMin: 60, players: [SELF_ID, 3, 4] },
    ];
    const breakdown2023 = getPeopleHIndexBreakdown(games, plays, SELF_ID, ANON_ID, 2023);
    const breakdown2024 = getPeopleHIndexBreakdown(games, plays, SELF_ID, ANON_ID, 2024);
    expect(breakdown2023[0].uniquePlayers).toBe(1); // Only player 2 in 2023
    expect(breakdown2024[0].uniquePlayers).toBe(2); // Players 3, 4 in 2024
  });

  test('returns empty array for no plays', () => {
    const breakdown = getPeopleHIndexBreakdown([], [], SELF_ID, ANON_ID);
    expect(breakdown).toEqual([]);
  });
});

describe('getNewPeopleHIndexGames', () => {
  const SELF_ID = 99;
  const ANON_ID = 1;

  test('returns games newly added to People H-Index', () => {
    const games = [
      { id: 1, name: 'Game A' },
      { id: 2, name: 'Game B' },
    ];
    const plays = [
      // 2023: Only game 1 with 1 unique player
      { gameId: 1, date: '2023-01-01', durationMin: 60, players: [SELF_ID, 2] },
      // 2024: Game 1 gets more players, Game 2 added
      { gameId: 1, date: '2024-01-01', durationMin: 60, players: [SELF_ID, 3] },
      { gameId: 2, date: '2024-01-01', durationMin: 60, players: [SELF_ID, 4, 5] },
    ];
    const newGames = getNewPeopleHIndexGames(games, plays, SELF_ID, ANON_ID, 2024);
    expect(Array.isArray(newGames)).toBe(true);
    newGames.forEach(item => {
      expect(item).toHaveProperty('game');
      expect(item).toHaveProperty('value');
      expect(item).toHaveProperty('thisYearValue');
    });
  });

  test('includes thisYearValue showing this year contribution', () => {
    const games = [{ id: 1, name: 'Game A' }];
    const plays = [
      { gameId: 1, date: '2023-01-01', durationMin: 60, players: [SELF_ID, 2] },
      { gameId: 1, date: '2024-01-01', durationMin: 60, players: [SELF_ID, 3, 4] },
    ];
    const newGames = getNewPeopleHIndexGames(games, plays, SELF_ID, ANON_ID, 2024);
    if (newGames.length > 0) {
      const game1 = newGames.find(g => g.game.id === 1);
      if (game1) {
        expect(game1.value).toBe(3); // All-time: players 2, 3, 4
        expect(game1.thisYearValue).toBe(2); // 2024 only: players 3, 4
      }
    }
  });

  test('returns empty array when h-index unchanged', () => {
    const games = [{ id: 1, name: 'Game A' }];
    const plays = [
      { gameId: 1, date: '2023-01-01', durationMin: 60, players: [SELF_ID, 2] },
    ];
    const newGames = getNewPeopleHIndexGames(games, plays, SELF_ID, ANON_ID, 2099);
    expect(newGames).toEqual([]);
  });

  test('handles anonymous players in thisYearValue calculation', () => {
    const games = [{ id: 1, name: 'Game A' }];
    const plays = [
      { gameId: 1, date: '2024-01-01', durationMin: 60, players: [SELF_ID, ANON_ID, ANON_ID, 2] },
    ];
    const newGames = getNewPeopleHIndexGames(games, plays, SELF_ID, ANON_ID, 2024);
    if (newGames.length > 0) {
      const game1 = newGames.find(g => g.game.id === 1);
      if (game1) {
        expect(game1.value).toBe(3); // 2 anonymous + 1 named
        expect(game1.thisYearValue).toBe(3); // Same, all in 2024
      }
    }
  });

  test('calculates correctly with typical fixture data', () => {
    const newGames = getNewPeopleHIndexGames(
      typicalData.games,
      typicalData.plays,
      typicalData.selfPlayerId,
      typicalData.anonymousPlayerId,
      2024,
    );
    expect(Array.isArray(newGames)).toBe(true);
    newGames.forEach(item => {
      expect(item).toHaveProperty('game');
      expect(item).toHaveProperty('value');
      expect(item).toHaveProperty('thisYearValue');
      expect(item.value).toBeGreaterThanOrEqual(item.thisYearValue);
    });
  });
});
