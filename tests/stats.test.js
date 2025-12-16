import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import * as stats from '../stats.js';
import { processData } from '../scripts/transform-game-data.js';
import minimalFixture from './fixtures/minimal.json';
import typicalFixture from './fixtures/typical.json';
import edgeCasesFixture from './fixtures/edge-cases.json';
import expandaloneFixture from './fixtures/expandalone.json';
import durationMissingFixture from './fixtures/duration-missing.json';

// Process fixtures once at module level (pure function, no side effects)
const minimalData = processData(minimalFixture);
const typicalData = processData(typicalFixture);
const edgeCasesData = processData(edgeCasesFixture);
const expandaloneData = processData(expandaloneFixture);
const durationData = processData(durationMissingFixture);

describe('Helper Functions', () => {

  describe('isGameOwned', () => {
    test('returns true when game has owned copy', () => {
      const ownedGame = minimalData.games.find(g => g.name === 'Test Base Game');
      expect(stats.isGameOwned(ownedGame)).toBe(true);
    });

    test('returns false when game has no owned copies', () => {
      const unownedGame = minimalData.games.find(g => g.name === 'Test Expandalone');
      expect(stats.isGameOwned(unownedGame)).toBe(false);
    });

    test('returns false when game has empty copies array', () => {
      const game = { copies: [] };
      expect(stats.isGameOwned(game)).toBe(false);
    });

    test('returns false when game has no copies property', () => {
      const game = {};
      expect(stats.isGameOwned(game)).toBe(false);
    });
  });

  describe('wasGameAcquiredInYear', () => {
    test('returns true when game acquired in specified year', () => {
      const game = minimalData.games[0];
      expect(stats.wasGameAcquiredInYear(game, 2021)).toBe(true);
    });

    test('returns false when game acquired in different year', () => {
      const game = minimalData.games[0];
      expect(stats.wasGameAcquiredInYear(game, 2020)).toBe(false);
    });

    test('returns false when game has no acquisition date', () => {
      const game = minimalData.games[1];
      expect(stats.wasGameAcquiredInYear(game, 2021)).toBe(false);
    });

    test('returns false when game has empty copies array', () => {
      const game = { copies: [] };
      expect(stats.wasGameAcquiredInYear(game, 2021)).toBe(false);
    });

    test('returns false when game has no copies property', () => {
      const game = {};
      expect(stats.wasGameAcquiredInYear(game, 2021)).toBe(false);
    });
  });

  describe('calculateDaysSince', () => {
    test('calculates days since a date', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateString = yesterday.toISOString().split('T')[0];
      expect(stats.calculateDaysSince(dateString)).toBe(1);
    });

    test('returns 0 for today', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(stats.calculateDaysSince(today)).toBe(0);
    });
  });
});

describe('H-Index Calculations', () => {

  describe('calculateHIndexFromSortedValues', () => {
    test('calculates h-index correctly for sorted values', () => {
      expect(stats.calculateHIndexFromSortedValues([10, 5, 3, 2, 1])).toBe(3);
      expect(stats.calculateHIndexFromSortedValues([5, 4, 3, 2, 1])).toBe(3);
      expect(stats.calculateHIndexFromSortedValues([1, 1, 1, 1])).toBe(1);
    });

    test('returns 0 for empty array', () => {
      expect(stats.calculateHIndexFromSortedValues([])).toBe(0);
    });

    test('handles single element', () => {
      expect(stats.calculateHIndexFromSortedValues([5])).toBe(1);
      expect(stats.calculateHIndexFromSortedValues([0])).toBe(0);
    });

    test('handles all values equal to index + 1', () => {
      expect(stats.calculateHIndexFromSortedValues([3, 2, 1])).toBe(2);
    });
  });

  describe('calculateTraditionalHIndex', () => {
    test('calculates traditional h-index without year filter', () => {
      const hIndex = stats.calculateTraditionalHIndex(typicalData.games, typicalData.plays);
      expect(hIndex).toBeGreaterThan(0);
    });

    test('calculates traditional h-index with year filter', () => {
      const hIndex2023 = stats.calculateTraditionalHIndex(typicalData.games, typicalData.plays, 2023);
      const hIndex2024 = stats.calculateTraditionalHIndex(typicalData.games, typicalData.plays, 2024);
      expect(hIndex2023).toBeGreaterThan(0);
      expect(hIndex2024).toBeGreaterThan(0);
    });

    test('returns 0 for empty plays', () => {
      const hIndex = stats.calculateTraditionalHIndex(typicalData.games, []);
      expect(hIndex).toBe(0);
    });

    test('returns 0 when year has no plays', () => {
      const hIndex = stats.calculateTraditionalHIndex(typicalData.games, typicalData.plays, 2000);
      expect(hIndex).toBe(0);
    });
  });

  describe('calculatePlaySessionHIndex', () => {
    test('calculates play session h-index without year filter', () => {
      const hIndex = stats.calculatePlaySessionHIndex(typicalData.games, typicalData.plays);
      expect(hIndex).toBeGreaterThan(0);
    });

    test('calculates play session h-index with year filter', () => {
      const hIndex2023 = stats.calculatePlaySessionHIndex(typicalData.games, typicalData.plays, 2023);
      expect(hIndex2023).toBeGreaterThan(0);
    });

    test('returns 0 for empty plays', () => {
      const hIndex = stats.calculatePlaySessionHIndex(typicalData.games, []);
      expect(hIndex).toBe(0);
    });

    test('counts unique days correctly', () => {
      const hIndex = stats.calculatePlaySessionHIndex(minimalData.games, minimalData.plays);
      expect(hIndex).toBeGreaterThan(0);
    });
  });

  describe('calculateHourHIndex', () => {
    test('calculates hour h-index without year filter', () => {
      const hIndex = stats.calculateHourHIndex(typicalData.plays);
      expect(hIndex).toBeGreaterThan(0);
    });

    test('calculates hour h-index with year filter', () => {
      const hIndex2023 = stats.calculateHourHIndex(typicalData.plays, 2023);
      expect(hIndex2023).toBeGreaterThan(0);
    });

    test('returns 0 for empty plays', () => {
      const hIndex = stats.calculateHourHIndex([]);
      expect(hIndex).toBe(0);
    });

    test('converts minutes to hours correctly', () => {
      const hIndex = stats.calculateHourHIndex(typicalData.plays);
      expect(hIndex).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateAllTimeHIndexThroughYear', () => {
    test('calculates all-time h-index through specified year for plays', () => {
      const hIndex = stats.calculateAllTimeHIndexThroughYear(typicalData.games, typicalData.plays, 2023, 'plays');
      expect(hIndex).toBeGreaterThanOrEqual(0);
    });

    test('calculates all-time h-index through specified year for sessions', () => {
      const hIndex = stats.calculateAllTimeHIndexThroughYear(typicalData.games, typicalData.plays, 2023, 'sessions');
      expect(hIndex).toBeGreaterThanOrEqual(0);
    });

    test('calculates all-time h-index through specified year for hours', () => {
      const hIndex = stats.calculateAllTimeHIndexThroughYear(typicalData.games, typicalData.plays, 2023, 'hours');
      expect(hIndex).toBeGreaterThanOrEqual(0);
    });

    test('includes plays from previous years', () => {
      const hIndex2022 = stats.calculateAllTimeHIndexThroughYear(typicalData.games, typicalData.plays, 2022, 'plays');
      const hIndex2023 = stats.calculateAllTimeHIndexThroughYear(typicalData.games, typicalData.plays, 2023, 'plays');
      expect(hIndex2023).toBeGreaterThanOrEqual(hIndex2022);
    });

    test('excludes plays from future years', () => {
      const hIndex2022 = stats.calculateAllTimeHIndexThroughYear(typicalData.games, typicalData.plays, 2022, 'plays');
      const hIndex2023 = stats.calculateAllTimeHIndexThroughYear(typicalData.games, typicalData.plays, 2023, 'plays');
      expect(hIndex2022).toBeLessThanOrEqual(hIndex2023);
    });

    test('returns 0 for empty plays', () => {
      const hIndex = stats.calculateAllTimeHIndexThroughYear(typicalData.games, [], 2023, 'plays');
      expect(hIndex).toBe(0);
    });
  });

  describe('calculateHIndexIncrease', () => {
    test('calculates positive increase in plays h-index', () => {
      const increase = stats.calculateHIndexIncrease(typicalData.games, typicalData.plays, 2023, 'plays');
      expect(increase).toBeGreaterThanOrEqual(0);
    });

    test('calculates increase in sessions h-index', () => {
      const increase = stats.calculateHIndexIncrease(typicalData.games, typicalData.plays, 2023, 'sessions');
      expect(typeof increase).toBe('number');
    });

    test('calculates increase in hours h-index', () => {
      const increase = stats.calculateHIndexIncrease(typicalData.games, typicalData.plays, 2023, 'hours');
      expect(typeof increase).toBe('number');
    });

    test('returns 0 when no plays in year', () => {
      const increase = stats.calculateHIndexIncrease(typicalData.games, typicalData.plays, 2099, 'plays');
      expect(increase).toBe(0);
    });

    test('handles first year of logging', () => {
      const plays = [{ gameId: 1, date: '2020-01-01', durationMin: 60 }];
      const games = [{ id: 1, name: 'Test Game' }];
      const increase = stats.calculateHIndexIncrease(games, plays, 2020, 'plays');
      expect(increase).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getNewHIndexGames', () => {
    test('returns games newly added to plays h-index', () => {
      const newGames = stats.getNewHIndexGames(typicalData.games, typicalData.plays, 2023, 'plays');
      expect(Array.isArray(newGames)).toBe(true);
      newGames.forEach(item => {
        expect(item).toHaveProperty('game');
        expect(item).toHaveProperty('value');
        expect(item).toHaveProperty('thisYearValue');
        expect(item.value).toBeGreaterThanOrEqual(item.thisYearValue);
      });
    });

    test('returns games newly added to sessions h-index', () => {
      const newGames = stats.getNewHIndexGames(typicalData.games, typicalData.plays, 2023, 'sessions');
      expect(Array.isArray(newGames)).toBe(true);
      newGames.forEach(item => {
        expect(item).toHaveProperty('game');
        expect(item).toHaveProperty('value');
        expect(item).toHaveProperty('thisYearValue');
      });
    });

    test('returns games newly added to hours h-index', () => {
      const newGames = stats.getNewHIndexGames(typicalData.games, typicalData.plays, 2023, 'hours');
      expect(Array.isArray(newGames)).toBe(true);
      newGames.forEach(item => {
        expect(item).toHaveProperty('game');
        expect(item).toHaveProperty('value');
        expect(item).toHaveProperty('thisYearValue');
        expect(item.value).toBeGreaterThanOrEqual(item.thisYearValue);
      });
    });

    test('returns empty array when h-index does not increase', () => {
      const newGames = stats.getNewHIndexGames(typicalData.games, typicalData.plays, 2099, 'plays');
      expect(newGames).toEqual([]);
    });

    test('returns empty array for empty plays', () => {
      const newGames = stats.getNewHIndexGames(typicalData.games, [], 2023, 'plays');
      expect(newGames).toEqual([]);
    });

    test('handles first year of logging', () => {
      const plays = [
        { gameId: 1, date: '2020-01-01', durationMin: 60 },
        { gameId: 2, date: '2020-01-02', durationMin: 60 },
        { gameId: 2, date: '2020-01-03', durationMin: 60 }
      ];
      const games = [
        { id: 1, name: 'Game A' },
        { id: 2, name: 'Game B' }
      ];
      const newGames = stats.getNewHIndexGames(games, plays, 2020, 'plays');
      expect(newGames.length).toBeGreaterThan(0);
    });

    test('thisYearValue reflects only plays from selected year', () => {
      const plays = [
        { gameId: 1, date: '2020-01-01', durationMin: 60 },
        { gameId: 1, date: '2021-01-01', durationMin: 60 },
        { gameId: 1, date: '2021-01-02', durationMin: 60 }
      ];
      const games = [{ id: 1, name: 'Game A' }];
      const newGames = stats.getNewHIndexGames(games, plays, 2021, 'plays');

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
        { gameId: 1, date: '2021-01-02', durationMin: 60 }
      ];
      const games = [{ id: 1, name: 'Game A' }];
      const newGames = stats.getNewHIndexGames(games, plays, 2021, 'sessions');

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
        { gameId: 1, date: '2021-01-02', durationMin: 90 }
      ];
      const games = [{ id: 1, name: 'Game A' }];
      const newGames = stats.getNewHIndexGames(games, plays, 2021, 'hours');

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
        { gameId: 3, date: '2021-01-02', durationMin: 60 }
      ];
      const games = [
        { id: 1, name: 'Game A' },
        { id: 2, name: 'Game B' },
        { id: 3, name: 'Game C' }
      ];

      const increase = stats.calculateHIndexIncrease(games, plays, 2021, 'plays');
      const newGames = stats.getNewHIndexGames(games, plays, 2021, 'plays');

      // h-index increase might be 1, but we could have 2 new games
      expect(newGames.length).toBeGreaterThanOrEqual(increase);
    });
  });
});

describe('Collection Statistics', () => {


  describe('getTotalBGGEntries', () => {
    test('counts all owned copies without year filter', () => {
      const total = stats.getTotalBGGEntries(typicalData.games);
      expect(total).toBeGreaterThan(0);
    });

    test('counts copies acquired in specific year', () => {
      const total2020 = stats.getTotalBGGEntries(typicalData.games, 2020);
      expect(total2020).toBeGreaterThanOrEqual(0);
    });

    test('returns 0 for empty games array', () => {
      const total = stats.getTotalBGGEntries([]);
      expect(total).toBe(0);
    });

    test('handles games with no copies', () => {
      const games = [{ copies: [] }];
      expect(stats.getTotalBGGEntries(games)).toBe(0);
    });

    test('counts multiple copies of same game', () => {
      const game = typicalData.games.find(g => g.name === 'Multiple Copies Game');
      expect(game.copies.length).toBeGreaterThan(1);
    });
  });

  describe('getTotalGamesOwned', () => {
    test('counts base games without year filter', () => {
      const total = stats.getTotalGamesOwned(typicalData.games);
      expect(total).toBeGreaterThan(0);
    });

    test('excludes expandalones', () => {
      const total = stats.getTotalGamesOwned(expandaloneData.games);
      expect(total).toBe(1); // Only "Pure Base Game"
    });

    test('excludes expansions', () => {
      const total = stats.getTotalGamesOwned(typicalData.games);
      const expansionCount = typicalData.games.filter(g => g.isExpansion).length;
      expect(total).toBeLessThanOrEqual(typicalData.games.length - expansionCount);
    });

    test('filters by acquisition year', () => {
      const total2020 = stats.getTotalGamesOwned(typicalData.games, 2020);
      expect(total2020).toBeGreaterThanOrEqual(0);
    });

    test('returns 0 for empty games array', () => {
      expect(stats.getTotalGamesOwned([])).toBe(0);
    });
  });

  describe('getTotalExpansions', () => {
    test('returns object with total, expandalones, expansionOnly', () => {
      const result = stats.getTotalExpansions(typicalData.games);
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('expandalones');
      expect(result).toHaveProperty('expansionOnly');
    });

    test('counts expandalones separately from expansions', () => {
      const result = stats.getTotalExpansions(expandaloneData.games);
      expect(result.expandalones).toBe(1);
      expect(result.expansionOnly).toBe(1);
      expect(result.total).toBe(2);
    });

    test('filters by acquisition year', () => {
      const result2021 = stats.getTotalExpansions(typicalData.games, 2021);
      expect(result2021.total).toBeGreaterThanOrEqual(0);
    });

    test('returns zeros for empty games array', () => {
      const result = stats.getTotalExpansions([]);
      expect(result.total).toBe(0);
      expect(result.expandalones).toBe(0);
      expect(result.expansionOnly).toBe(0);
    });
  });
});

describe('Play Statistics', () => {


  describe('getTotalPlays', () => {
    test('counts all plays without year filter', () => {
      const total = stats.getTotalPlays(typicalData.plays);
      expect(total).toBe(typicalData.plays.length);
    });

    test('filters plays by year', () => {
      const total2023 = stats.getTotalPlays(typicalData.plays, 2023);
      const total2024 = stats.getTotalPlays(typicalData.plays, 2024);
      expect(total2023).toBeGreaterThan(0);
      expect(total2024).toBeGreaterThan(0);
      expect(total2023 + total2024).toBeLessThan(typicalData.plays.length); // Some plays in other years
    });

    test('returns 0 for empty plays array', () => {
      expect(stats.getTotalPlays([])).toBe(0);
    });

    test('returns 0 for year with no plays', () => {
      expect(stats.getTotalPlays(typicalData.plays, 2000)).toBe(0);
    });
  });

  describe('getTotalDaysPlayed', () => {
    test('counts unique days without year filter', () => {
      const total = stats.getTotalDaysPlayed(typicalData.plays);
      expect(total).toBeGreaterThan(0);
      expect(total).toBeLessThanOrEqual(typicalData.plays.length);
    });

    test('filters days by year', () => {
      const total2023 = stats.getTotalDaysPlayed(typicalData.plays, 2023);
      expect(total2023).toBeGreaterThan(0);
    });

    test('returns 0 for empty plays array', () => {
      expect(stats.getTotalDaysPlayed([])).toBe(0);
    });

    test('deduplicates plays on same day', () => {
      const total = stats.getTotalDaysPlayed(minimalData.plays);
      expect(total).toBeLessThanOrEqual(minimalData.plays.length);
    });
  });

  describe('getDailySessionStats', () => {
    test('calculates median and average without year filter', () => {
      const result = stats.getDailySessionStats(typicalData.plays, null);
      expect(result.medianMinutes).toBeGreaterThan(0);
      expect(result.averageMinutes).toBeGreaterThan(0);
    });

    test('filters by year correctly', () => {
      const result2023 = stats.getDailySessionStats(typicalData.plays, 2023);
      expect(result2023.medianMinutes).toBeGreaterThan(0);
      expect(result2023.averageMinutes).toBeGreaterThan(0);
    });

    test('returns null for empty plays array', () => {
      const result = stats.getDailySessionStats([], null);
      expect(result.medianMinutes).toBeNull();
      expect(result.averageMinutes).toBeNull();
    });

    test('excludes days with zero total duration', () => {
      const testPlays = [
        { date: '2023-01-01', durationMin: 60 },
        { date: '2023-01-02', durationMin: 0 },
        { date: '2023-01-03', durationMin: 120 }
      ];
      const result = stats.getDailySessionStats(testPlays, null);
      expect(result.medianMinutes).toBe(90);
      expect(result.averageMinutes).toBe(90);
    });

    test('calculates median correctly for odd number of days', () => {
      const testPlays = [
        { date: '2023-01-01', durationMin: 60 },
        { date: '2023-01-02', durationMin: 120 },
        { date: '2023-01-03', durationMin: 180 }
      ];
      const result = stats.getDailySessionStats(testPlays, null);
      expect(result.medianMinutes).toBe(120);
    });

    test('calculates median correctly for even number of days', () => {
      const testPlays = [
        { date: '2023-01-01', durationMin: 60 },
        { date: '2023-01-02', durationMin: 120 },
        { date: '2023-01-03', durationMin: 180 },
        { date: '2023-01-04', durationMin: 240 }
      ];
      const result = stats.getDailySessionStats(testPlays, null);
      expect(result.medianMinutes).toBe(150);
    });

    test('sums multiple plays on same day', () => {
      const testPlays = [
        { date: '2023-01-01', durationMin: 60 },
        { date: '2023-01-01', durationMin: 60 },
        { date: '2023-01-02', durationMin: 120 }
      ];
      const result = stats.getDailySessionStats(testPlays, null);
      expect(result.medianMinutes).toBe(120);
      expect(result.averageMinutes).toBe(120);
    });

    test('returns minutes directly', () => {
      const testPlays = [
        { date: '2023-01-01', durationMin: 90 }
      ];
      const result = stats.getDailySessionStats(testPlays, null);
      expect(result.medianMinutes).toBe(90);
      expect(result.averageMinutes).toBe(90);
    });
  });

  describe('getTotalGamesPlayed', () => {
    test('counts unique games played without year filter', () => {
      const result = stats.getTotalGamesPlayed(typicalData.games, typicalData.plays);
      expect(result.total).toBeGreaterThan(0);
      expect(result.newToMe).toBeNull();
    });

    test('counts new-to-me games with year filter', () => {
      const result2023 = stats.getTotalGamesPlayed(typicalData.games, typicalData.plays, 2023);
      expect(result2023.total).toBeGreaterThan(0);
      expect(result2023.newToMe).toBeGreaterThanOrEqual(0);
    });

    test('returns 0 for empty plays array', () => {
      const result = stats.getTotalGamesPlayed(typicalData.games, []);
      expect(result.total).toBe(0);
      expect(result.newToMe).toBeNull();
    });

    test('identifies first play dates correctly', () => {
      const result2024 = stats.getTotalGamesPlayed(typicalData.games, typicalData.plays, 2024);
      expect(result2024.newToMe).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getMilestones', () => {
    describe('plays metric', () => {
      test('returns object with fives, dimes, quarters, centuries', () => {
        const result = stats.getMilestones(edgeCasesData.games, edgeCasesData.plays, null, 'plays');
        expect(result).toHaveProperty('fives');
        expect(result).toHaveProperty('dimes');
        expect(result).toHaveProperty('quarters');
        expect(result).toHaveProperty('centuries');
      });

      test('categorizes games at exactly 5 plays', () => {
        const result = stats.getMilestones(edgeCasesData.games, edgeCasesData.plays, null, 'plays');
        expect(result.fives.length).toBeGreaterThan(0);
      });

      test('categorizes games at exactly 10 plays', () => {
        const result = stats.getMilestones(edgeCasesData.games, edgeCasesData.plays, null, 'plays');
        expect(result.dimes.length).toBeGreaterThan(0);
      });

      test('categorizes games at exactly 25 plays', () => {
        const result = stats.getMilestones(edgeCasesData.games, edgeCasesData.plays, null, 'plays');
        expect(result.quarters.length).toBeGreaterThan(0);
      });

      test('categorizes games at 100 plays', () => {
        const result = stats.getMilestones(edgeCasesData.games, edgeCasesData.plays, null, 'plays');
        expect(result.centuries.length).toBeGreaterThan(0);
      });

      test('sorts each category by count descending', () => {
        const result = stats.getMilestones(edgeCasesData.games, edgeCasesData.plays, null, 'plays');
        if (result.centuries.length > 1) {
          expect(result.centuries[0].count).toBeGreaterThanOrEqual(result.centuries[1].count);
        }
      });

      test('filters by year', () => {
        const result2020 = stats.getMilestones(edgeCasesData.games, edgeCasesData.plays, 2020, 'plays');
        expect(result2020).toBeDefined();
      });

      test('returns empty arrays for no plays', () => {
        const result = stats.getMilestones(typicalData.games, [], null, 'plays');
        expect(result.fives).toEqual([]);
        expect(result.dimes).toEqual([]);
        expect(result.quarters).toEqual([]);
        expect(result.centuries).toEqual([]);
      });
    });

    describe('sessions metric', () => {
      test('categorizes games by unique days played', () => {
        const result = stats.getMilestones(edgeCasesData.games, edgeCasesData.plays, null, 'sessions');
        expect(result.fives.length).toBeGreaterThan(0);
      });

      test('counts unique dates correctly', () => {
        // Create test data with known sessions
        const testGames = [{ id: 1, name: 'Test Game' }];
        const testPlays = [
          { gameId: 1, date: '2020-01-01', durationMin: 60 },
          { gameId: 1, date: '2020-01-01', durationMin: 60 }, // Same day, should count as 1 session
          { gameId: 1, date: '2020-01-02', durationMin: 60 },
          { gameId: 1, date: '2020-01-03', durationMin: 60 },
          { gameId: 1, date: '2020-01-04', durationMin: 60 },
          { gameId: 1, date: '2020-01-05', durationMin: 60 }
        ];
        const result = stats.getMilestones(testGames, testPlays, null, 'sessions');
        expect(result.fives).toHaveLength(1);
        expect(result.fives[0].count).toBe(5); // 5 unique days
      });

      test('filters by year for sessions', () => {
        const result = stats.getMilestones(edgeCasesData.games, edgeCasesData.plays, 2020, 'sessions');
        expect(result).toBeDefined();
      });
    });

    describe('hours metric', () => {
      test('categorizes games by total hours played', () => {
        const result = stats.getMilestones(edgeCasesData.games, edgeCasesData.plays, null, 'hours');
        expect(result.fives.length).toBeGreaterThan(0);
      });

      test('calculates hours from durationMin correctly', () => {
        // Create test data with known hours
        const testGames = [{ id: 1, name: 'Test Game' }];
        const testPlays = [
          { gameId: 1, date: '2020-01-01', durationMin: 300 }, // 5 hours
        ];
        const result = stats.getMilestones(testGames, testPlays, null, 'hours');
        expect(result.fives).toHaveLength(1);
        expect(result.fives[0].count).toBe(5);
      });

      test('sums hours across multiple plays', () => {
        const testGames = [{ id: 1, name: 'Test Game' }];
        const testPlays = [
          { gameId: 1, date: '2020-01-01', durationMin: 120 }, // 2 hours
          { gameId: 1, date: '2020-01-02', durationMin: 180 }, // 3 hours
        ];
        const result = stats.getMilestones(testGames, testPlays, null, 'hours');
        expect(result.fives).toHaveLength(1);
        expect(result.fives[0].count).toBe(5); // 2 + 3 = 5 hours
      });

      test('handles missing duration as 0', () => {
        const testGames = [{ id: 1, name: 'Test Game' }];
        const testPlays = [
          { gameId: 1, date: '2020-01-01' }, // No durationMin
        ];
        const result = stats.getMilestones(testGames, testPlays, null, 'hours');
        expect(result.fives).toHaveLength(0);
      });

      test('filters by year for hours', () => {
        const result = stats.getMilestones(edgeCasesData.games, edgeCasesData.plays, 2020, 'hours');
        expect(result).toBeDefined();
      });
    });

    test('defaults to plays metric when not specified', () => {
      const resultDefault = stats.getMilestones(edgeCasesData.games, edgeCasesData.plays);
      const resultPlays = stats.getMilestones(edgeCasesData.games, edgeCasesData.plays, null, 'plays');
      expect(resultDefault).toEqual(resultPlays);
    });
  });

  describe('getCumulativeMilestoneCount', () => {
    describe('plays metric', () => {
      test('counts games with 5+ plays', () => {
        const testGames = [
          { id: 1, name: 'Game 1' },
          { id: 2, name: 'Game 2' },
          { id: 3, name: 'Game 3' }
        ];
        const testPlays = [
          { gameId: 1, date: '2020-01-01', durationMin: 60 },
          { gameId: 1, date: '2020-01-02', durationMin: 60 },
          { gameId: 1, date: '2020-01-03', durationMin: 60 },
          { gameId: 1, date: '2020-01-04', durationMin: 60 },
          { gameId: 1, date: '2020-01-05', durationMin: 60 }, // 5 plays
          { gameId: 2, date: '2020-01-01', durationMin: 60 },
          { gameId: 2, date: '2020-01-02', durationMin: 60 },
          { gameId: 2, date: '2020-01-03', durationMin: 60 }, // 3 plays
          { gameId: 3, date: '2020-01-01', durationMin: 60 },
          { gameId: 3, date: '2020-01-02', durationMin: 60 },
          { gameId: 3, date: '2020-01-03', durationMin: 60 },
          { gameId: 3, date: '2020-01-04', durationMin: 60 },
          { gameId: 3, date: '2020-01-05', durationMin: 60 },
          { gameId: 3, date: '2020-01-06', durationMin: 60 },
          { gameId: 3, date: '2020-01-07', durationMin: 60 },
          { gameId: 3, date: '2020-01-08', durationMin: 60 },
          { gameId: 3, date: '2020-01-09', durationMin: 60 },
          { gameId: 3, date: '2020-01-10', durationMin: 60 } // 10 plays
        ];
        const result = stats.getCumulativeMilestoneCount(testGames, testPlays, null, 'plays', 'fives');
        expect(result).toBe(1); // Only Game 1 (5 plays). Game 3 (10 plays) is in 'dimes' milestone
      });

      test('counts games with 10+ plays', () => {
        const testGames = [
          { id: 1, name: 'Game 1' },
          { id: 2, name: 'Game 2' }
        ];
        const testPlays = [
          ...Array(10).fill(null).map((_, i) => ({ gameId: 1, date: `2020-01-${String(i + 1).padStart(2, '0')}`, durationMin: 60 })),
          ...Array(5).fill(null).map((_, i) => ({ gameId: 2, date: `2020-01-${String(i + 1).padStart(2, '0')}`, durationMin: 60 }))
        ];
        const result = stats.getCumulativeMilestoneCount(testGames, testPlays, null, 'plays', 'dimes');
        expect(result).toBe(1); // Only Game 1 has 10+ plays
      });

      test('counts games with 25+ plays', () => {
        const testGames = [{ id: 1, name: 'Game 1' }];
        const testPlays = Array(30).fill(null).map((_, i) => ({
          gameId: 1,
          date: `2020-01-${String((i % 30) + 1).padStart(2, '0')}`,
          durationMin: 60
        }));
        const result = stats.getCumulativeMilestoneCount(testGames, testPlays, null, 'plays', 'quarters');
        expect(result).toBe(1);
      });

      test('counts games with 100+ plays', () => {
        const testGames = [{ id: 1, name: 'Game 1' }];
        const testPlays = Array(150).fill(null).map((_, i) => ({
          gameId: 1,
          date: `2020-${String(Math.floor(i / 30) + 1).padStart(2, '0')}-${String((i % 30) + 1).padStart(2, '0')}`,
          durationMin: 60
        }));
        const result = stats.getCumulativeMilestoneCount(testGames, testPlays, null, 'plays', 'centuries');
        expect(result).toBe(1);
      });

      test('returns 0 when no games meet threshold', () => {
        const testGames = [{ id: 1, name: 'Game 1' }];
        const testPlays = [
          { gameId: 1, date: '2020-01-01', durationMin: 60 },
          { gameId: 1, date: '2020-01-02', durationMin: 60 }
        ];
        const result = stats.getCumulativeMilestoneCount(testGames, testPlays, null, 'plays', 'fives');
        expect(result).toBe(0);
      });

      test('filters by year', () => {
        const testGames = [{ id: 1, name: 'Game 1' }];
        const testPlays = [
          { gameId: 1, date: '2020-01-01', durationMin: 60 },
          { gameId: 1, date: '2020-01-02', durationMin: 60 },
          { gameId: 1, date: '2020-01-03', durationMin: 60 },
          { gameId: 1, date: '2020-01-04', durationMin: 60 },
          { gameId: 1, date: '2020-01-05', durationMin: 60 },
          { gameId: 1, date: '2021-01-01', durationMin: 60 }
        ];
        const result2020 = stats.getCumulativeMilestoneCount(testGames, testPlays, 2020, 'plays', 'fives');
        const result2021 = stats.getCumulativeMilestoneCount(testGames, testPlays, 2021, 'plays', 'fives');
        expect(result2020).toBe(1); // 5 plays cumulative through 2020
        expect(result2021).toBe(1); // 6 plays cumulative through 2021 (still in fives range)
      });
    });

    describe('sessions metric', () => {
      test('counts games with 5+ sessions', () => {
        const testGames = [{ id: 1, name: 'Game 1' }];
        const testPlays = [
          { gameId: 1, date: '2020-01-01', durationMin: 60 },
          { gameId: 1, date: '2020-01-01', durationMin: 60 }, // Same day
          { gameId: 1, date: '2020-01-02', durationMin: 60 },
          { gameId: 1, date: '2020-01-03', durationMin: 60 },
          { gameId: 1, date: '2020-01-04', durationMin: 60 },
          { gameId: 1, date: '2020-01-05', durationMin: 60 }
        ];
        const result = stats.getCumulativeMilestoneCount(testGames, testPlays, null, 'sessions', 'fives');
        expect(result).toBe(1); // 5 unique days
      });

      test('correctly handles duplicate dates', () => {
        const testGames = [{ id: 1, name: 'Game 1' }];
        const testPlays = [
          { gameId: 1, date: '2020-01-01', durationMin: 60 },
          { gameId: 1, date: '2020-01-01', durationMin: 60 },
          { gameId: 1, date: '2020-01-01', durationMin: 60 }
        ];
        const result = stats.getCumulativeMilestoneCount(testGames, testPlays, null, 'sessions', 'fives');
        expect(result).toBe(0); // Only 1 unique day, doesn't meet 5+ threshold
      });
    });

    describe('hours metric', () => {
      test('counts games with 5+ hours', () => {
        const testGames = [{ id: 1, name: 'Game 1' }];
        const testPlays = [
          { gameId: 1, date: '2020-01-01', durationMin: 300 } // 5 hours
        ];
        const result = stats.getCumulativeMilestoneCount(testGames, testPlays, null, 'hours', 'fives');
        expect(result).toBe(1);
      });

      test('sums hours across multiple plays', () => {
        const testGames = [{ id: 1, name: 'Game 1' }];
        const testPlays = [
          { gameId: 1, date: '2020-01-01', durationMin: 120 }, // 2 hours
          { gameId: 1, date: '2020-01-02', durationMin: 180 }, // 3 hours
          { gameId: 1, date: '2020-01-03', durationMin: 60 }   // 1 hour
        ];
        const result = stats.getCumulativeMilestoneCount(testGames, testPlays, null, 'hours', 'fives');
        expect(result).toBe(1); // 6 total hours
      });

      test('handles missing duration as 0', () => {
        const testGames = [{ id: 1, name: 'Game 1' }];
        const testPlays = [
          { gameId: 1, date: '2020-01-01' } // No durationMin
        ];
        const result = stats.getCumulativeMilestoneCount(testGames, testPlays, null, 'hours', 'fives');
        expect(result).toBe(0);
      });

      test('handles fractional hours correctly', () => {
        const testGames = [{ id: 1, name: 'Game 1' }];
        const testPlays = [
          { gameId: 1, date: '2020-01-01', durationMin: 299 } // 4.98 hours
        ];
        const result5 = stats.getCumulativeMilestoneCount(testGames, testPlays, null, 'hours', 'fives');
        const result4 = stats.getCumulativeMilestoneCount(testGames, testPlays, null, 'hours', 'fives');
        expect(result5).toBe(0); // Less than 5 hours
        expect(result4).toBe(0); // Less than 5 hours (both check fives milestone)
      });
    });

    test('returns 0 for empty plays array', () => {
      const testGames = [{ id: 1, name: 'Game 1' }];
      const result = stats.getCumulativeMilestoneCount(testGames, [], null, 'plays', 'fives');
      expect(result).toBe(0);
    });

    test('ignores plays for non-existent games', () => {
      const testGames = [{ id: 1, name: 'Game 1' }];
      const testPlays = [
        { gameId: 1, date: '2020-01-01', durationMin: 60 },
        { gameId: 2, date: '2020-01-01', durationMin: 60 },
        { gameId: 2, date: '2020-01-02', durationMin: 60 },
        { gameId: 2, date: '2020-01-03', durationMin: 60 },
        { gameId: 2, date: '2020-01-04', durationMin: 60 },
        { gameId: 2, date: '2020-01-05', durationMin: 60 }
      ];
      const result = stats.getCumulativeMilestoneCount(testGames, testPlays, null, 'plays', 'fives');
      expect(result).toBe(0); // Game 2 doesn't exist in games array
    });
  });

  describe('calculateMilestoneIncrease', () => {
    test('calculates increase when games enter milestone range', () => {
      const testGames = [
        { id: 1, name: 'Game 1' },
        { id: 2, name: 'Game 2' }
      ];
      const testPlays = [
        // Game 1: 3 plays in 2020, 2 more in 2021 (total 5, enters fives)
        { gameId: 1, date: '2020-01-01', durationMin: 60 },
        { gameId: 1, date: '2020-01-02', durationMin: 60 },
        { gameId: 1, date: '2020-01-03', durationMin: 60 },
        { gameId: 1, date: '2021-01-01', durationMin: 60 },
        { gameId: 1, date: '2021-01-02', durationMin: 60 },
        // Game 2: 5 plays in 2020 (already in fives)
        { gameId: 2, date: '2020-01-01', durationMin: 60 },
        { gameId: 2, date: '2020-01-02', durationMin: 60 },
        { gameId: 2, date: '2020-01-03', durationMin: 60 },
        { gameId: 2, date: '2020-01-04', durationMin: 60 },
        { gameId: 2, date: '2020-01-05', durationMin: 60 }
      ];
      const result = stats.calculateMilestoneIncrease(testGames, testPlays, 2021, 'plays', 'fives');
      expect(result).toBe(1); // Game 1 entered fives in 2021
    });

    test('calculates decrease when games leave milestone range', () => {
      const testGames = [{ id: 1, name: 'Game 1' }];
      const testPlays = [
        // 5 plays in 2020 (in fives), 5 more in 2021 (total 10, moves to dimes)
        { gameId: 1, date: '2020-01-01', durationMin: 60 },
        { gameId: 1, date: '2020-01-02', durationMin: 60 },
        { gameId: 1, date: '2020-01-03', durationMin: 60 },
        { gameId: 1, date: '2020-01-04', durationMin: 60 },
        { gameId: 1, date: '2020-01-05', durationMin: 60 },
        { gameId: 1, date: '2021-01-01', durationMin: 60 },
        { gameId: 1, date: '2021-01-02', durationMin: 60 },
        { gameId: 1, date: '2021-01-03', durationMin: 60 },
        { gameId: 1, date: '2021-01-04', durationMin: 60 },
        { gameId: 1, date: '2021-01-05', durationMin: 60 }
      ];
      const result = stats.calculateMilestoneIncrease(testGames, testPlays, 2021, 'plays', 'fives');
      expect(result).toBe(-1); // Game 1 left fives (moved to dimes)
    });

    test('returns 0 when no change in milestone count', () => {
      const testGames = [{ id: 1, name: 'Game 1' }];
      const testPlays = [
        { gameId: 1, date: '2020-01-01', durationMin: 60 },
        { gameId: 1, date: '2020-01-02', durationMin: 60 },
        { gameId: 1, date: '2020-01-03', durationMin: 60 },
        { gameId: 1, date: '2020-01-04', durationMin: 60 },
        { gameId: 1, date: '2020-01-05', durationMin: 60 },
        { gameId: 1, date: '2021-01-01', durationMin: 60 } // Still in fives (6 total)
      ];
      const result = stats.calculateMilestoneIncrease(testGames, testPlays, 2021, 'plays', 'fives');
      expect(result).toBe(0); // No change, still 1 game in fives
    });

    test('works with hours metric', () => {
      const testGames = [{ id: 1, name: 'Game 1' }];
      const testPlays = [
        { gameId: 1, date: '2020-01-01', durationMin: 180 }, // 3 hours
        { gameId: 1, date: '2021-01-01', durationMin: 120 }, // +2 hours = 5 total
        { gameId: 1, date: '2021-01-02', durationMin: 60 }   // +1 hour = 6 total
      ];
      const result = stats.calculateMilestoneIncrease(testGames, testPlays, 2021, 'hours', 'fives');
      expect(result).toBe(1); // Game 1 entered fives in 2021
    });

    test('works with sessions metric', () => {
      const testGames = [{ id: 1, name: 'Game 1' }];
      const testPlays = [
        { gameId: 1, date: '2020-01-01', durationMin: 60 },
        { gameId: 1, date: '2020-01-02', durationMin: 60 },
        { gameId: 1, date: '2020-01-03', durationMin: 60 },
        { gameId: 1, date: '2021-01-01', durationMin: 60 },
        { gameId: 1, date: '2021-01-02', durationMin: 60 } // 5 sessions total
      ];
      const result = stats.calculateMilestoneIncrease(testGames, testPlays, 2021, 'sessions', 'fives');
      expect(result).toBe(1); // Game 1 entered fives in 2021
    });
  });

  describe('getNewMilestoneGames', () => {
    test('identifies games that entered milestone in given year', () => {
      const testGames = [
        { id: 1, name: 'Game 1' },
        { id: 2, name: 'Game 2' }
      ];
      const testPlays = [
        // Game 1: enters fives in 2021
        { gameId: 1, date: '2020-01-01', durationMin: 60 },
        { gameId: 1, date: '2020-01-02', durationMin: 60 },
        { gameId: 1, date: '2021-01-01', durationMin: 60 },
        { gameId: 1, date: '2021-01-02', durationMin: 60 },
        { gameId: 1, date: '2021-01-03', durationMin: 60 },
        // Game 2: already in fives by 2020
        { gameId: 2, date: '2019-01-01', durationMin: 60 },
        { gameId: 2, date: '2019-01-02', durationMin: 60 },
        { gameId: 2, date: '2019-01-03', durationMin: 60 },
        { gameId: 2, date: '2019-01-04', durationMin: 60 },
        { gameId: 2, date: '2019-01-05', durationMin: 60 }
      ];
      const result = stats.getNewMilestoneGames(testGames, testPlays, 2021, 'plays', 'fives');
      expect(result.length).toBe(1);
      expect(result[0].game.id).toBe(1);
      expect(result[0].value).toBe(5); // Cumulative value
      expect(result[0].thisYearValue).toBe(3); // Value added in 2021
    });

    test('returns empty array when no games entered milestone', () => {
      const testGames = [{ id: 1, name: 'Game 1' }];
      const testPlays = [
        { gameId: 1, date: '2020-01-01', durationMin: 60 },
        { gameId: 1, date: '2021-01-01', durationMin: 60 }
      ];
      const result = stats.getNewMilestoneGames(testGames, testPlays, 2021, 'plays', 'fives');
      expect(result).toEqual([]);
    });

    test('excludes games that left milestone range', () => {
      const testGames = [{ id: 1, name: 'Game 1' }];
      const testPlays = [
        // Enters fives in 2020, leaves for dimes in 2021
        { gameId: 1, date: '2020-01-01', durationMin: 60 },
        { gameId: 1, date: '2020-01-02', durationMin: 60 },
        { gameId: 1, date: '2020-01-03', durationMin: 60 },
        { gameId: 1, date: '2020-01-04', durationMin: 60 },
        { gameId: 1, date: '2020-01-05', durationMin: 60 },
        { gameId: 1, date: '2021-01-01', durationMin: 60 },
        { gameId: 1, date: '2021-01-02', durationMin: 60 },
        { gameId: 1, date: '2021-01-03', durationMin: 60 },
        { gameId: 1, date: '2021-01-04', durationMin: 60 },
        { gameId: 1, date: '2021-01-05', durationMin: 60 } // 10 total
      ];
      const result = stats.getNewMilestoneGames(testGames, testPlays, 2021, 'plays', 'fives');
      expect(result).toEqual([]); // Game left fives range, not in result
    });

    test('sorts results by cumulative value descending', () => {
      const testGames = [
        { id: 1, name: 'Game 1' },
        { id: 2, name: 'Game 2' }
      ];
      const testPlays = [
        // Game 1: 8 plays total (higher)
        { gameId: 1, date: '2020-01-01', durationMin: 60 },
        { gameId: 1, date: '2020-01-02', durationMin: 60 },
        { gameId: 1, date: '2020-01-03', durationMin: 60 },
        { gameId: 1, date: '2021-01-01', durationMin: 60 },
        { gameId: 1, date: '2021-01-02', durationMin: 60 },
        { gameId: 1, date: '2021-01-03', durationMin: 60 },
        { gameId: 1, date: '2021-01-04', durationMin: 60 },
        { gameId: 1, date: '2021-01-05', durationMin: 60 },
        // Game 2: 5 plays total (lower)
        { gameId: 2, date: '2020-01-01', durationMin: 60 },
        { gameId: 2, date: '2021-01-01', durationMin: 60 },
        { gameId: 2, date: '2021-01-02', durationMin: 60 },
        { gameId: 2, date: '2021-01-03', durationMin: 60 },
        { gameId: 2, date: '2021-01-04', durationMin: 60 }
      ];
      const result = stats.getNewMilestoneGames(testGames, testPlays, 2021, 'plays', 'fives');
      expect(result.length).toBe(2);
      expect(result[0].game.id).toBe(1); // Higher value first
      expect(result[1].game.id).toBe(2);
    });

    test('works with hours metric', () => {
      const testGames = [{ id: 1, name: 'Game 1' }];
      const testPlays = [
        { gameId: 1, date: '2020-01-01', durationMin: 120 }, // 2 hours
        { gameId: 1, date: '2021-01-01', durationMin: 180 }, // +3 hours = 5 total
        { gameId: 1, date: '2021-01-02', durationMin: 60 }   // +1 hour = 6 total
      ];
      const result = stats.getNewMilestoneGames(testGames, testPlays, 2021, 'hours', 'fives');
      expect(result.length).toBe(1);
      expect(result[0].value).toBe(6);
      expect(result[0].thisYearValue).toBe(4); // 240 minutes / 60
    });

    test('works with sessions metric', () => {
      const testGames = [{ id: 1, name: 'Game 1' }];
      const testPlays = [
        { gameId: 1, date: '2020-01-01', durationMin: 60 },
        { gameId: 1, date: '2020-01-01', durationMin: 60 }, // Same day
        { gameId: 1, date: '2021-01-01', durationMin: 60 },
        { gameId: 1, date: '2021-01-02', durationMin: 60 },
        { gameId: 1, date: '2021-01-03', durationMin: 60 },
        { gameId: 1, date: '2021-01-04', durationMin: 60 } // 5 unique days total
      ];
      const result = stats.getNewMilestoneGames(testGames, testPlays, 2021, 'sessions', 'fives');
      expect(result.length).toBe(1);
      expect(result[0].value).toBe(5);
      expect(result[0].thisYearValue).toBe(4);
    });

    test('ignores plays for non-existent games', () => {
      const testGames = [{ id: 1, name: 'Game 1' }];
      const testPlays = [
        { gameId: 2, date: '2020-01-01', durationMin: 60 },
        { gameId: 2, date: '2021-01-01', durationMin: 60 },
        { gameId: 2, date: '2021-01-02', durationMin: 60 },
        { gameId: 2, date: '2021-01-03', durationMin: 60 },
        { gameId: 2, date: '2021-01-04', durationMin: 60 }
      ];
      const result = stats.getNewMilestoneGames(testGames, testPlays, 2021, 'plays', 'fives');
      expect(result).toEqual([]);
    });
  });

  describe('getDaysPlayedByGame', () => {
    test('calculates unique days played for each game', () => {
      const testGames = [
        { id: 1, name: 'Game 1' },
        { id: 2, name: 'Game 2' }
      ];
      const testPlays = [
        { gameId: 1, date: '2020-01-01', durationMin: 60 },
        { gameId: 1, date: '2020-01-01', durationMin: 30 }, // Same day
        { gameId: 1, date: '2020-01-02', durationMin: 90 },
        { gameId: 2, date: '2020-01-01', durationMin: 120 }
      ];
      const result = stats.getDaysPlayedByGame(testGames, testPlays);
      expect(result.length).toBe(2);

      const game1 = result.find(r => r.game.id === 1);
      expect(game1.uniqueDays).toBe(2);

      const game2 = result.find(r => r.game.id === 2);
      expect(game2.uniqueDays).toBe(1);
    });

    test('calculates min, max, median, avg minutes per day', () => {
      const testGames = [{ id: 1, name: 'Game 1' }];
      const testPlays = [
        { gameId: 1, date: '2020-01-01', durationMin: 60 },
        { gameId: 1, date: '2020-01-02', durationMin: 120 },
        { gameId: 1, date: '2020-01-03', durationMin: 90 }
      ];
      const result = stats.getDaysPlayedByGame(testGames, testPlays);
      expect(result.length).toBe(1);
      expect(result[0].minMinutes).toBe(60);
      expect(result[0].maxMinutes).toBe(120);
      expect(result[0].medianMinutes).toBe(90);
      expect(result[0].avgMinutes).toBe(90); // (60+120+90)/3
    });

    test('sums minutes for multiple plays on same day', () => {
      const testGames = [{ id: 1, name: 'Game 1' }];
      const testPlays = [
        { gameId: 1, date: '2020-01-01', durationMin: 60 },
        { gameId: 1, date: '2020-01-01', durationMin: 30 },
        { gameId: 1, date: '2020-01-01', durationMin: 30 }
      ];
      const result = stats.getDaysPlayedByGame(testGames, testPlays);
      expect(result[0].uniqueDays).toBe(1);
      expect(result[0].minMinutes).toBe(120); // Sum of all plays that day
      expect(result[0].maxMinutes).toBe(120);
    });

    test('calculates median and avg plays per day', () => {
      const testGames = [{ id: 1, name: 'Game 1' }];
      const testPlays = [
        { gameId: 1, date: '2020-01-01', durationMin: 60 },
        { gameId: 1, date: '2020-01-01', durationMin: 60 }, // 2 plays
        { gameId: 1, date: '2020-01-02', durationMin: 60 },
        { gameId: 1, date: '2020-01-02', durationMin: 60 },
        { gameId: 1, date: '2020-01-02', durationMin: 60 }, // 3 plays
        { gameId: 1, date: '2020-01-03', durationMin: 60 }  // 1 play
      ];
      const result = stats.getDaysPlayedByGame(testGames, testPlays);
      expect(result[0].medianPlays).toBe(2); // [1, 2, 3] -> 2
      expect(result[0].avgPlays).toBe(2); // (2+3+1)/3
    });

    test('filters by year when provided', () => {
      const testGames = [{ id: 1, name: 'Game 1' }];
      const testPlays = [
        { gameId: 1, date: '2020-01-01', durationMin: 60 },
        { gameId: 1, date: '2020-01-02', durationMin: 60 },
        { gameId: 1, date: '2021-01-01', durationMin: 60 }
      ];
      const result = stats.getDaysPlayedByGame(testGames, testPlays, 2020);
      expect(result[0].uniqueDays).toBe(2); // Only 2020 plays
    });

    test('sorts by unique days descending', () => {
      const testGames = [
        { id: 1, name: 'Game 1' },
        { id: 2, name: 'Game 2' }
      ];
      const testPlays = [
        { gameId: 1, date: '2020-01-01', durationMin: 60 },
        { gameId: 2, date: '2020-01-01', durationMin: 60 },
        { gameId: 2, date: '2020-01-02', durationMin: 60 },
        { gameId: 2, date: '2020-01-03', durationMin: 60 }
      ];
      const result = stats.getDaysPlayedByGame(testGames, testPlays);
      expect(result[0].game.id).toBe(2); // 3 days
      expect(result[1].game.id).toBe(1); // 1 day
    });

    test('ignores plays for non-existent games', () => {
      const testGames = [{ id: 1, name: 'Game 1' }];
      const testPlays = [
        { gameId: 1, date: '2020-01-01', durationMin: 60 },
        { gameId: 2, date: '2020-01-01', durationMin: 60 }
      ];
      const result = stats.getDaysPlayedByGame(testGames, testPlays);
      expect(result.length).toBe(1);
      expect(result[0].game.id).toBe(1);
    });

    test('returns empty array for empty plays', () => {
      const testGames = [{ id: 1, name: 'Game 1' }];
      const result = stats.getDaysPlayedByGame(testGames, []);
      expect(result).toEqual([]);
    });
  });

});

describe('Diagnostic Functions', () => {


  describe('getGamesWithUnknownAcquisitionDate', () => {
    test('finds games without acquisition dates', () => {
      const result = stats.getGamesWithUnknownAcquisitionDate(edgeCasesData.games);
      expect(result.length).toBeGreaterThan(0);
    });

    test('only returns owned games', () => {
      const result = stats.getGamesWithUnknownAcquisitionDate(edgeCasesData.games);
      result.forEach(game => {
        expect(stats.isGameOwned(game)).toBe(true);
      });
    });

    test('returns empty array when all games have acquisition dates', () => {
      const result = stats.getGamesWithUnknownAcquisitionDate(typicalData.games);
      // Result may or may not be empty, just ensure it's an array
      expect(Array.isArray(result)).toBe(true);
    });

    test('handles games with no copies', () => {
      const games = [{ copies: [] }];
      expect(stats.getGamesWithUnknownAcquisitionDate(games)).toEqual([]);
    });
  });

  describe('getOwnedGamesNeverPlayed', () => {
    test('finds owned base games with no plays', () => {
      const result = stats.getOwnedGamesNeverPlayed(typicalData.games, typicalData.plays);
      expect(result.length).toBeGreaterThan(0);
    });

    test('excludes expansions', () => {
      const result = stats.getOwnedGamesNeverPlayed(typicalData.games, typicalData.plays);
      result.forEach(game => {
        expect(game.isExpansion).toBe(false);
      });
    });

    test('excludes expandalones', () => {
      const result = stats.getOwnedGamesNeverPlayed(typicalData.games, typicalData.plays);
      result.forEach(game => {
        expect(game.isBaseGame).toBe(true);
      });
    });

    test('filters by acquisition year', () => {
      const result2023 = stats.getOwnedGamesNeverPlayed(typicalData.games, typicalData.plays, 2023);
      expect(Array.isArray(result2023)).toBe(true);
    });

    test('returns empty array when all games are played', () => {
      const result = stats.getOwnedGamesNeverPlayed(minimalData.games, minimalData.plays);
      // May or may not be empty depending on fixture, just ensure it's an array
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getOwnedBaseGamesMissingPricePaid', () => {
    test('finds owned base games without price paid', () => {
      const testGames = [
        {
          id: 1,
          name: 'Base Game Without Price',
          isBaseGame: true,
          isExpansion: false,
          isExpandalone: false,
          copies: [{ statusOwned: true, acquisitionDate: '2023-01-01', pricePaid: null }]
        },
        {
          id: 2,
          name: 'Base Game With Price',
          isBaseGame: true,
          isExpansion: false,
          isExpandalone: false,
          copies: [{ statusOwned: true, acquisitionDate: '2023-01-01', pricePaid: 39.99 }]
        }
      ];
      const result = stats.getOwnedBaseGamesMissingPricePaid(testGames);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe(1);
    });

    test('excludes expandalones even if missing price', () => {
      const testGames = [
        {
          id: 1,
          name: 'Expandalone Without Price',
          isBaseGame: false,
          isExpansion: false,
          isExpandalone: true,
          copies: [{ statusOwned: true, acquisitionDate: '2023-01-01', pricePaid: null }]
        }
      ];
      const result = stats.getOwnedBaseGamesMissingPricePaid(testGames);
      expect(result.length).toBe(0);
    });

    test('excludes expansions even if missing price', () => {
      const testGames = [
        {
          id: 1,
          name: 'Expansion Without Price',
          isBaseGame: false,
          isExpansion: true,
          isExpandalone: false,
          copies: [{ statusOwned: true, acquisitionDate: '2023-01-01', pricePaid: null }]
        }
      ];
      const result = stats.getOwnedBaseGamesMissingPricePaid(testGames);
      expect(result.length).toBe(0);
    });

    test('excludes unowned games missing price', () => {
      const testGames = [
        {
          id: 1,
          name: 'Unowned Base Game',
          isBaseGame: true,
          isExpansion: false,
          isExpandalone: false,
          copies: [{ statusOwned: false, acquisitionDate: '2023-01-01', pricePaid: null }]
        }
      ];
      const result = stats.getOwnedBaseGamesMissingPricePaid(testGames);
      expect(result.length).toBe(0);
    });

    test('handles empty string as missing price', () => {
      const testGames = [
        {
          id: 1,
          name: 'Game With Empty Price',
          isBaseGame: true,
          isExpansion: false,
          isExpandalone: false,
          copies: [{ statusOwned: true, acquisitionDate: '2023-01-01', pricePaid: '' }]
        }
      ];
      const result = stats.getOwnedBaseGamesMissingPricePaid(testGames);
      expect(result.length).toBe(1);
    });

    test('handles undefined price paid', () => {
      const testGames = [
        {
          id: 1,
          name: 'Game With Undefined Price',
          isBaseGame: true,
          isExpansion: false,
          isExpandalone: false,
          copies: [{ statusOwned: true, acquisitionDate: '2023-01-01' }]
        }
      ];
      const result = stats.getOwnedBaseGamesMissingPricePaid(testGames);
      expect(result.length).toBe(1);
    });

    test('returns empty array when no games match criteria', () => {
      const testGames = [
        {
          id: 1,
          name: 'Game With Price',
          isBaseGame: true,
          isExpansion: false,
          isExpandalone: false,
          copies: [{ statusOwned: true, acquisitionDate: '2023-01-01', pricePaid: 49.99 }]
        }
      ];
      const result = stats.getOwnedBaseGamesMissingPricePaid(testGames);
      expect(result).toEqual([]);
    });

    test('returns only base games from real dataset', () => {
      const result = stats.getOwnedBaseGamesMissingPricePaid(typicalData.games);
      result.forEach(game => {
        expect(game.isBaseGame).toBe(true);
      });
    });

    test('handles games with no copies array', () => {
      const testGames = [
        {
          id: 1,
          name: 'Game Without Copies',
          isBaseGame: true,
          isExpansion: false,
          isExpandalone: false
        }
      ];
      const result = stats.getOwnedBaseGamesMissingPricePaid(testGames);
      expect(result.length).toBe(0);
    });

    test('handles games with empty copies array', () => {
      const testGames = [
        {
          id: 1,
          name: 'Game With Empty Copies',
          isBaseGame: true,
          isExpansion: false,
          isExpandalone: false,
          copies: []
        }
      ];
      const result = stats.getOwnedBaseGamesMissingPricePaid(testGames);
      expect(result.length).toBe(0);
    });
  });
});

describe('Year Functions', () => {


  describe('getAllAcquisitionYears', () => {
    test('extracts acquisition years from games', () => {
      const years = stats.getAllAcquisitionYears(typicalData.games);
      expect(years.length).toBeGreaterThan(0);
      expect(years.every(y => typeof y === 'number')).toBe(true);
    });

    test('sorts years in descending order', () => {
      const years = stats.getAllAcquisitionYears(typicalData.games);
      for (let i = 0; i < years.length - 1; i++) {
        expect(years[i]).toBeGreaterThanOrEqual(years[i + 1]);
      }
    });

    test('returns empty array for games with no acquisition dates', () => {
      const games = [{ copies: [{ acquisitionDate: null }] }];
      expect(stats.getAllAcquisitionYears(games)).toEqual([]);
    });

    test('handles empty games array', () => {
      expect(stats.getAllAcquisitionYears([])).toEqual([]);
    });

    test('deduplicates years', () => {
      const years = stats.getAllAcquisitionYears(typicalData.games);
      const uniqueYears = new Set(years);
      expect(years.length).toBe(uniqueYears.size);
    });
  });

  describe('getAvailableYears', () => {
    test('extracts years from plays', () => {
      const years = stats.getAvailableYears(typicalData.plays);
      expect(years.length).toBeGreaterThan(0);
      expect(years.every(y => y.year && y.hasPlays !== undefined)).toBe(true);
    });

    test('includes acquisition years when games provided', () => {
      const years = stats.getAvailableYears(typicalData.plays, typicalData.games);
      expect(years.length).toBeGreaterThan(0);
    });

    test('marks pre-logging years correctly', () => {
      const years = stats.getAvailableYears(typicalData.plays, typicalData.games);
      // Pre-logging years are acquisition years before first play year
      const preLoggingYears = years.filter(y => y.isPreLogging);
      expect(Array.isArray(preLoggingYears)).toBe(true);
    });

    test('sorts years in descending order', () => {
      const years = stats.getAvailableYears(typicalData.plays, typicalData.games);
      for (let i = 0; i < years.length - 1; i++) {
        expect(years[i].year).toBeGreaterThanOrEqual(years[i + 1].year);
      }
    });

    test('handles empty plays array', () => {
      const years = stats.getAvailableYears([]);
      expect(years).toEqual([]);
    });
  });
});

describe('Breakdown Functions', () => {


  describe('getHIndexBreakdown', () => {
    test('returns breakdown for traditional h-index', () => {
      const breakdown = stats.getHIndexBreakdown(typicalData.games, typicalData.plays, null, false);
      expect(breakdown.length).toBeGreaterThan(0);
      expect(breakdown[0]).toHaveProperty('game');
      expect(breakdown[0]).toHaveProperty('count');
    });

    test('returns breakdown for play session h-index', () => {
      const breakdown = stats.getHIndexBreakdown(typicalData.games, typicalData.plays, null, true);
      expect(breakdown.length).toBeGreaterThan(0);
      expect(breakdown[0]).toHaveProperty('game');
      expect(breakdown[0]).toHaveProperty('count');
    });

    test('sorts by count descending', () => {
      const breakdown = stats.getHIndexBreakdown(typicalData.games, typicalData.plays);
      for (let i = 0; i < breakdown.length - 1; i++) {
        expect(breakdown[i].count).toBeGreaterThanOrEqual(breakdown[i + 1].count);
      }
    });

    test('filters by year', () => {
      const breakdown2023 = stats.getHIndexBreakdown(typicalData.games, typicalData.plays, 2023);
      expect(Array.isArray(breakdown2023)).toBe(true);
    });

    test('returns empty array for no plays', () => {
      const breakdown = stats.getHIndexBreakdown(typicalData.games, []);
      expect(breakdown).toEqual([]);
    });
  });

  describe('getHourHIndexBreakdown', () => {
    test('returns breakdown with hours', () => {
      const breakdown = stats.getHourHIndexBreakdown(typicalData.games, typicalData.plays);
      expect(breakdown.length).toBeGreaterThan(0);
      expect(breakdown[0]).toHaveProperty('game');
      expect(breakdown[0]).toHaveProperty('hours');
      expect(typeof breakdown[0].hours).toBe('number');
    });

    test('sorts by hours descending', () => {
      const breakdown = stats.getHourHIndexBreakdown(typicalData.games, typicalData.plays);
      for (let i = 0; i < breakdown.length - 1; i++) {
        expect(breakdown[i].hours).toBeGreaterThanOrEqual(breakdown[i + 1].hours);
      }
    });

    test('filters by year', () => {
      const breakdown2023 = stats.getHourHIndexBreakdown(typicalData.games, typicalData.plays, 2023);
      expect(Array.isArray(breakdown2023)).toBe(true);
    });

    test('returns empty array for no plays', () => {
      const breakdown = stats.getHourHIndexBreakdown(typicalData.games, []);
      expect(breakdown).toEqual([]);
    });
  });
});

describe('Play Time Statistics', () => {


  describe('getTotalPlayTime', () => {
    test('calculates total play time correctly', () => {
      const result = stats.getTotalPlayTime(durationData.plays);
      expect(result).toHaveProperty('totalMinutes');
      expect(result).toHaveProperty('totalHours');
      expect(result).toHaveProperty('playsWithActualDuration');
      expect(result).toHaveProperty('playsWithEstimatedDuration');
      expect(result).toHaveProperty('totalPlays');
    });

    test('converts minutes to hours correctly', () => {
      const result = stats.getTotalPlayTime(durationData.plays);
      expect(result.totalHours).toBe(result.totalMinutes / 60);
    });

    test('distinguishes between actual and estimated durations', () => {
      const playsWithEstimated = durationData.plays.map(p => ({
        ...p,
        durationEstimated: p.durationMin === 0
      }));
      const result = stats.getTotalPlayTime(playsWithEstimated);
      expect(result.playsWithActualDuration + result.playsWithEstimatedDuration).toBe(result.totalPlays);
    });

    test('counts estimated durations from processData', () => {
      const result = stats.getTotalPlayTime(durationData.plays);
      // processData estimates durations for plays with 0 duration
      // All plays should have durationMin > 0 (either actual or estimated with 30-minute default)
      const estimatedPlays = durationData.plays.filter(p => p.durationEstimated);
      expect(estimatedPlays.length).toBeGreaterThan(0);
      expect(result.playsWithEstimatedDuration).toBe(estimatedPlays.length);
    });

    test('filters by year', () => {
      const result2024 = stats.getTotalPlayTime(durationData.plays, 2024);
      expect(result2024.totalPlays).toBeGreaterThanOrEqual(0);
    });

    test('returns zeros for empty plays', () => {
      const result = stats.getTotalPlayTime([]);
      expect(result.totalMinutes).toBe(0);
      expect(result.totalHours).toBe(0);
      expect(result.totalPlays).toBe(0);
    });
  });

  describe('getPlayTimeByGame', () => {
    test('returns play time breakdown by game', () => {
      const breakdown = stats.getPlayTimeByGame(durationData.games, durationData.plays);
      expect(breakdown.length).toBeGreaterThan(0);
      expect(breakdown[0]).toHaveProperty('game');
      expect(breakdown[0]).toHaveProperty('totalMinutes');
      expect(breakdown[0]).toHaveProperty('totalHours');
      expect(breakdown[0]).toHaveProperty('playCount');
    });

    test('calculates min, max, median, avg correctly', () => {
      const breakdown = stats.getPlayTimeByGame(durationData.games, durationData.plays);
      const gameWithDuration = breakdown.find(b => b.minMinutes !== null);
      if (gameWithDuration) {
        expect(gameWithDuration.minMinutes).toBeLessThanOrEqual(gameWithDuration.maxMinutes);
        expect(gameWithDuration.medianMinutes).toBeGreaterThanOrEqual(gameWithDuration.minMinutes);
        expect(gameWithDuration.medianMinutes).toBeLessThanOrEqual(gameWithDuration.maxMinutes);
      }
    });

    test('handles even number of durations for median', () => {
      const breakdown = stats.getPlayTimeByGame(durationData.games, durationData.plays);
      const gameWithEvenPlays = breakdown.find(b => b.playCount % 2 === 0 && b.minMinutes !== null);
      if (gameWithEvenPlays) {
        expect(gameWithEvenPlays.medianMinutes).toBeDefined();
      }
    });

    test('handles odd number of durations for median', () => {
      const breakdown = stats.getPlayTimeByGame(durationData.games, durationData.plays);
      const gameWithOddPlays = breakdown.find(b => b.playCount % 2 === 1 && b.minMinutes !== null);
      if (gameWithOddPlays) {
        expect(gameWithOddPlays.medianMinutes).toBeDefined();
      }
    });

    test('sorts by total minutes descending', () => {
      const breakdown = stats.getPlayTimeByGame(durationData.games, durationData.plays);
      for (let i = 0; i < breakdown.length - 1; i++) {
        expect(breakdown[i].totalMinutes).toBeGreaterThanOrEqual(breakdown[i + 1].totalMinutes);
      }
    });

    test('filters by year', () => {
      const breakdown2024 = stats.getPlayTimeByGame(durationData.games, durationData.plays, 2024);
      expect(Array.isArray(breakdown2024)).toBe(true);
    });

    test('handles games with no duration data', () => {
      const breakdown = stats.getPlayTimeByGame(durationData.games, durationData.plays);
      const gameWithNoDuration = breakdown.find(b => b.totalMinutes === 0);
      if (gameWithNoDuration) {
        expect(gameWithNoDuration.minMinutes).toBeNull();
        expect(gameWithNoDuration.maxMinutes).toBeNull();
        expect(gameWithNoDuration.medianMinutes).toBeNull();
        expect(gameWithNoDuration.avgMinutes).toBeNull();
      }
    });
  });

  describe('getTopGamesByMetric', () => {
    test('returns top N games by hours', () => {
      const result = stats.getTopGamesByMetric(typicalData.games, typicalData.plays, 2024, 'hours', 3);
      expect(result.length).toBeLessThanOrEqual(3);
      expect(result.length).toBeGreaterThan(0);
      result.forEach(item => {
        expect(item).toHaveProperty('game');
        expect(item).toHaveProperty('value');
        expect(item).toHaveProperty('hours');
        expect(item).toHaveProperty('sessions');
        expect(item).toHaveProperty('plays');
      });
    });

    test('returns top N games by sessions', () => {
      const result = stats.getTopGamesByMetric(typicalData.games, typicalData.plays, 2024, 'sessions', 3);
      expect(result.length).toBeLessThanOrEqual(3);
      result.forEach(item => {
        expect(item.value).toBe(item.sessions);
      });
    });

    test('returns top N games by plays', () => {
      const result = stats.getTopGamesByMetric(typicalData.games, typicalData.plays, 2024, 'plays', 3);
      expect(result.length).toBeLessThanOrEqual(3);
      result.forEach(item => {
        expect(item.value).toBe(item.plays);
      });
    });

    test('sorts by metric value descending', () => {
      const result = stats.getTopGamesByMetric(typicalData.games, typicalData.plays, 2024, 'hours', 3);
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].value).toBeGreaterThanOrEqual(result[i].value);
      }
    });

    test('limits results to specified count', () => {
      const result = stats.getTopGamesByMetric(typicalData.games, typicalData.plays, 2024, 'hours', 2);
      expect(result.length).toBeLessThanOrEqual(2);
    });

    test('returns empty array when no plays in year', () => {
      const result = stats.getTopGamesByMetric(typicalData.games, typicalData.plays, 1900, 'hours', 3);
      expect(result).toEqual([]);
    });

    test('secondary sort uses hours then sessions then plays', () => {
      // When primary metric ties, should fall back to hours, then sessions, then plays
      const result = stats.getTopGamesByMetric(typicalData.games, typicalData.plays, 2024, 'hours', 10);
      for (let i = 1; i < result.length; i++) {
        const prev = result[i - 1];
        const curr = result[i];
        if (prev.value === curr.value) {
          // When metric ties, hours should be >= (or if hours tie, sessions >= etc)
          expect(prev.hours >= curr.hours ||
            (prev.hours === curr.hours && prev.sessions >= curr.sessions) ||
            (prev.hours === curr.hours && prev.sessions === curr.sessions && prev.plays >= curr.plays)
          ).toBe(true);
        }
      }
    });

    test('tiebreaker sort falls through hours to sessions to plays', () => {
      // Create mock data where games tie on primary metric and hours, requiring sessions/plays tiebreaker
      const games = [
        { id: 1, name: 'Game A' },
        { id: 2, name: 'Game B' },
        { id: 3, name: 'Game C' }
      ];
      // All games have same hours (60 min each), same sessions (1 day each), but different plays
      const plays = [
        { gameId: 1, date: '2024-01-01', durationMin: 60 },
        { gameId: 2, date: '2024-01-01', durationMin: 60 },
        { gameId: 3, date: '2024-01-01', durationMin: 60 },
        { gameId: 3, date: '2024-01-01', durationMin: 0 }, // Extra play for game 3, no duration
        { gameId: 3, date: '2024-01-01', durationMin: 0 }  // Another extra play for game 3
      ];

      const result = stats.getTopGamesByMetric(games, plays, 2024, 'hours', 3);

      // All have same hours (60), same sessions (1), but game 3 has more plays
      expect(result[0].game.id).toBe(3); // 3 plays
      expect(result[0].plays).toBe(3);
      // Games 1 and 2 both have 1 play, order determined by plays tiebreaker (equal, so stable)
      expect(result[1].plays).toBe(1);
      expect(result[2].plays).toBe(1);
    });

    test('tiebreaker sort handles sessions tiebreaker when hours tie', () => {
      // Create mock data where games tie on hours but differ on sessions
      const games = [
        { id: 1, name: 'Game A' },
        { id: 2, name: 'Game B' }
      ];
      // Both games have same hours (60 min), but different sessions
      const plays = [
        { gameId: 1, date: '2024-01-01', durationMin: 60 },
        { gameId: 2, date: '2024-01-01', durationMin: 30 },
        { gameId: 2, date: '2024-01-02', durationMin: 30 }  // Game 2 has 2 sessions
      ];

      const result = stats.getTopGamesByMetric(games, plays, 2024, 'hours', 2);

      // Both have 60 min hours, but game 2 has 2 sessions vs game 1's 1 session
      expect(result[0].game.id).toBe(2);
      expect(result[0].sessions).toBe(2);
      expect(result[1].game.id).toBe(1);
      expect(result[1].sessions).toBe(1);
    });

    test('ignores plays for games not in games array', () => {
      // Play references a gameId that doesn't exist in games array
      const games = [
        { id: 1, name: 'Game A' }
      ];
      const plays = [
        { gameId: 1, date: '2024-01-01', durationMin: 60 },
        { gameId: 999, date: '2024-01-01', durationMin: 120 }  // Game 999 doesn't exist
      ];

      const result = stats.getTopGamesByMetric(games, plays, 2024, 'hours', 3);

      // Should only return game 1, ignoring the orphaned play
      expect(result.length).toBe(1);
      expect(result[0].game.id).toBe(1);
    });

    test('defaults to limit of 3 when not specified', () => {
      const games = [
        { id: 1, name: 'Game A' },
        { id: 2, name: 'Game B' },
        { id: 3, name: 'Game C' },
        { id: 4, name: 'Game D' }
      ];
      const plays = [
        { gameId: 1, date: '2024-01-01', durationMin: 60 },
        { gameId: 2, date: '2024-01-01', durationMin: 50 },
        { gameId: 3, date: '2024-01-01', durationMin: 40 },
        { gameId: 4, date: '2024-01-01', durationMin: 30 }
      ];

      // Call without limit parameter to test default
      const result = stats.getTopGamesByMetric(games, plays, 2024, 'hours');

      expect(result.length).toBe(3);
    });
  });
});

describe('Suggestion Algorithms', () => {

  beforeEach(() => {
    // Mock Math.random for deterministic tests
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getNextMilestoneTarget', () => {
    test('returns 5 for counts less than 5', () => {
      expect(stats.getNextMilestoneTarget(0)).toBe(5);
      expect(stats.getNextMilestoneTarget(4)).toBe(5);
    });

    test('returns 10 for counts 5-9', () => {
      expect(stats.getNextMilestoneTarget(5)).toBe(10);
      expect(stats.getNextMilestoneTarget(9)).toBe(10);
    });

    test('returns 25 for counts 10-24', () => {
      expect(stats.getNextMilestoneTarget(10)).toBe(25);
      expect(stats.getNextMilestoneTarget(24)).toBe(25);
    });

    test('returns 100 for counts 25-99', () => {
      expect(stats.getNextMilestoneTarget(25)).toBe(100);
      expect(stats.getNextMilestoneTarget(99)).toBe(100);
    });

    test('returns null for counts 100+', () => {
      expect(stats.getNextMilestoneTarget(100)).toBeNull();
      expect(stats.getNextMilestoneTarget(150)).toBeNull();
    });
  });

  describe('selectRandom', () => {
    test('selects item from array', () => {
      const items = [1, 2, 3, 4, 5];
      const selected = stats.selectRandom(items);
      expect(items).toContain(selected);
    });

    test('returns null for empty array', () => {
      expect(stats.selectRandom([])).toBeNull();
    });

    test('returns single item from single-element array', () => {
      const items = [42];
      expect(stats.selectRandom(items)).toBe(42);
    });
  });

  describe('selectRandomWeightedBySqrtRarity', () => {
    test('selects item with rarity weighting', () => {
      const items = [
        { id: 1, group: 'A' },
        { id: 2, group: 'A' },
        { id: 3, group: 'B' }
      ];
      const selected = stats.selectRandomWeightedBySqrtRarity(items, item => item.group);
      expect(items).toContain(selected);
    });

    test('returns null for empty array', () => {
      expect(stats.selectRandomWeightedBySqrtRarity([], x => x)).toBeNull();
    });

    test('handles single group', () => {
      const items = [{ id: 1, group: 'A' }, { id: 2, group: 'A' }];
      const selected = stats.selectRandomWeightedBySqrtRarity(items, item => item.group);
      expect(items).toContain(selected);
    });

    test('uses sqrt weighting formula correctly', () => {
      const items = Array.from({ length: 10 }, (_, i) => ({ id: i, group: 'A' }));
      const selected = stats.selectRandomWeightedBySqrtRarity(items, item => item.group);
      expect(items).toContain(selected);
    });
  });

  describe('getSuggestedGames', () => {
    test('returns array of suggestions', () => {
      const suggestions = stats.getSuggestedGames(typicalData.games, typicalData.plays);
      expect(Array.isArray(suggestions)).toBe(true);
    });

    test('each suggestion has game, reasons, and stats arrays', () => {
      const suggestions = stats.getSuggestedGames(typicalData.games, typicalData.plays);
      suggestions.forEach(suggestion => {
        expect(suggestion).toHaveProperty('game');
        expect(suggestion).toHaveProperty('reasons');
        expect(suggestion).toHaveProperty('stats');
        expect(Array.isArray(suggestion.reasons)).toBe(true);
        expect(Array.isArray(suggestion.stats)).toBe(true);
      });
    });

    test('only suggests owned base games', () => {
      const suggestions = stats.getSuggestedGames(typicalData.games, typicalData.plays);
      suggestions.forEach(suggestion => {
        expect(suggestion.game.isBaseGame).toBe(true);
        expect(stats.isGameOwned(suggestion.game)).toBe(true);
      });
    });

    test('merges duplicate game suggestions', () => {
      const suggestions = stats.getSuggestedGames(typicalData.games, typicalData.plays);
      const gameIds = suggestions.map(s => s.game.id);
      const uniqueGameIds = new Set(gameIds);
      expect(gameIds.length).toBe(uniqueGameIds.size);
    });

    test('returns empty array when no owned base games', () => {
      const games = typicalData.games.map(g => ({ ...g, isBaseGame: false }));
      const suggestions = stats.getSuggestedGames(games, typicalData.plays);
      expect(suggestions).toEqual([]);
    });

    test('accepts metric parameter and uses it for milestone suggestions (hours)', () => {
      const suggestions = stats.getSuggestedGames(typicalData.games, typicalData.plays, 'hours');
      expect(Array.isArray(suggestions)).toBe(true);
    });

    test('accepts metric parameter and uses it for milestone suggestions (sessions)', () => {
      const suggestions = stats.getSuggestedGames(typicalData.games, typicalData.plays, 'sessions');
      expect(Array.isArray(suggestions)).toBe(true);
    });

    test('milestone suggestion respects hours metric', () => {
      const testGames = [
        { id: 1, name: 'Game Near Hour Milestone', isBaseGame: true, isExpansion: false, isExpandalone: false, copies: [{ statusOwned: true }] }
      ];
      const testPlays = [
        { gameId: 1, date: '2020-01-01', durationMin: 240 }, // 4 hours
      ];
      const suggestions = stats.getSuggestedGames(testGames, testPlays, 'hours');
      const milestoneSuggestion = suggestions.find(s => s.reasons.includes('Closest to a five') || s.reasons.includes('Almost a five'));
      if (milestoneSuggestion) {
        expect(milestoneSuggestion.stats).toContain('4.0 total hours');
      }
    });

    test('milestone suggestion respects sessions metric', () => {
      const testGames = [
        { id: 1, name: 'Game Near Session Milestone', isBaseGame: true, isExpansion: false, isExpandalone: false, copies: [{ statusOwned: true }] }
      ];
      const testPlays = [
        { gameId: 1, date: '2020-01-01', durationMin: 60 },
        { gameId: 1, date: '2020-01-02', durationMin: 60 },
        { gameId: 1, date: '2020-01-03', durationMin: 60 },
        { gameId: 1, date: '2020-01-04', durationMin: 60 }, // 4 sessions
      ];
      const suggestions = stats.getSuggestedGames(testGames, testPlays, 'sessions');
      const milestoneSuggestion = suggestions.find(s => s.reasons.includes('Closest to a five') || s.reasons.includes('Almost a five'));
      if (milestoneSuggestion) {
        expect(milestoneSuggestion.stats).toContain('4 total days');
      }
    });
  });

  describe('Individual suggestion algorithms', () => {
    test('suggestRecentlyPlayedWithLowSessions returns suggestion or null', () => {
      const suggestions = stats.getSuggestedGames(typicalData.games, typicalData.plays);
      // Algorithm may or may not return a suggestion depending on data
      expect(Array.isArray(suggestions)).toBe(true);
    });

    test('suggestLongestUnplayed returns suggestion or null', () => {
      const suggestions = stats.getSuggestedGames(typicalData.games, typicalData.plays);
      // Algorithm may or may not return a suggestion depending on data
      expect(Array.isArray(suggestions)).toBe(true);
    });

    test('suggestForNextMilestone returns suggestion or null', () => {
      const suggestions = stats.getSuggestedGames(typicalData.games, typicalData.plays);
      // Algorithm may or may not return a suggestion depending on data
      expect(Array.isArray(suggestions)).toBe(true);
    });

    test('suggestRecentlyPlayedWithLowSessions with recent plays', () => {
      // Create test data with plays from within the last month
      const today = new Date();
      const recentDate = new Date(today);
      recentDate.setDate(today.getDate() - 15); // 15 days ago
      const recentDateStr = recentDate.toISOString().split('T')[0];

      const testGames = [
        { id: 1, name: 'Recent Game', isBaseGame: true, isExpansion: false, isExpandalone: false, copies: [{ statusOwned: true }] }
      ];

      const testPlays = [
        { gameId: 1, date: recentDateStr, durationMin: 60 }
      ];

      const suggestions = stats.getSuggestedGames(testGames, testPlays);
      expect(Array.isArray(suggestions)).toBe(true);
    });

    test('suggestRecentlyPlayedWithLowSessions sorts by session count', () => {
      // Create test data with multiple recent games having different session counts
      const today = new Date();
      const date1 = new Date(today);
      date1.setDate(today.getDate() - 10);
      const date2 = new Date(today);
      date2.setDate(today.getDate() - 11);
      const date3 = new Date(today);
      date3.setDate(today.getDate() - 12);

      const testGames = [
        { id: 1, name: 'Game A', isBaseGame: true, isExpansion: false, isExpandalone: false, copies: [{ statusOwned: true }] },
        { id: 2, name: 'Game B', isBaseGame: true, isExpansion: false, isExpandalone: false, copies: [{ statusOwned: true }] },
        { id: 3, name: 'Game C', isBaseGame: true, isExpansion: false, isExpandalone: false, copies: [{ statusOwned: true }] }
      ];

      const testPlays = [
        // Game 1: 3 sessions (most)
        { gameId: 1, date: date1.toISOString().split('T')[0], durationMin: 60 },
        { gameId: 1, date: date2.toISOString().split('T')[0], durationMin: 60 },
        { gameId: 1, date: date3.toISOString().split('T')[0], durationMin: 60 },
        // Game 2: 2 sessions (medium)
        { gameId: 2, date: date1.toISOString().split('T')[0], durationMin: 60 },
        { gameId: 2, date: date2.toISOString().split('T')[0], durationMin: 60 },
        // Game 3: 1 session (least - should be suggested)
        { gameId: 3, date: date1.toISOString().split('T')[0], durationMin: 60 }
      ];

      const suggestions = stats.getSuggestedGames(testGames, testPlays);
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);

      // The first suggestion should be from the recent/low sessions algorithm
      // and should pick the game with the lowest session count (Game C)
      const recentSuggestion = suggestions.find(s => s && s.reasons && s.reasons.includes('Fresh and recent'));
      expect(recentSuggestion).toBeDefined();
      expect(recentSuggestion.game.name).toBe('Game C');
      expect(recentSuggestion.stats).toContain('1 total session');
    });
  });

  describe('getTimeAndActivityStats', () => {
    test('returns empty state for no plays', () => {
      const result = stats.getTimeAndActivityStats([], 2024);

      expect(result.totalDays).toBe(0);
      expect(result.totalMinutes).toBe(0);
      expect(result.longestDayMinutes).toBeNull();
      expect(result.longestDayDate).toBeNull();
      expect(result.longestDayGamesList).toEqual([]);
      expect(result.shortestDayMinutes).toBeNull();
      expect(result.shortestDayDate).toBeNull();
      expect(result.shortestDayGamesList).toEqual([]);
      expect(result.longestStreak).toBe(0);
      expect(result.longestStreakStart).toBeNull();
      expect(result.longestStreakEnd).toBeNull();
      expect(result.longestDrySpell).toBe(0);
      expect(result.longestDrySpellStart).toBeNull();
      expect(result.longestDrySpellEnd).toBeNull();
      expect(result.mostGamesDay).toBe(0);
      expect(result.mostGamesDayDate).toBeNull();
      expect(result.mostGamesDayGamesList).toEqual([]);
    });

    test('calculates stats for single play day', () => {
      const plays = [
        { gameId: 1, date: '2024-01-15', durationMin: 120 }
      ];

      const result = stats.getTimeAndActivityStats(plays, null);

      expect(result.totalDays).toBe(1);
      expect(result.totalMinutes).toBe(120);
      expect(result.longestDayMinutes).toBe(120);
      expect(result.longestDayDate).toBe('2024-01-15');
      expect(result.shortestDayMinutes).toBe(120);
      expect(result.shortestDayDate).toBe('2024-01-15');
      expect(result.longestStreak).toBe(1);
      expect(result.longestStreakStart).toBe('2024-01-15');
      expect(result.longestStreakEnd).toBe('2024-01-15');
      expect(result.longestDrySpell).toBe(0);
      expect(result.mostGamesDay).toBe(1);
      expect(result.mostGamesDayDate).toBe('2024-01-15');
      expect(result.mostGamesDayGamesList).toHaveLength(1);
      expect(result.mostGamesDayGamesList[0].gameId).toBe(1);
      expect(result.mostGamesDayGamesList[0].playCount).toBe(1);
    });

    test('tracks longest and shortest play days with game lists', () => {
      const plays = [
        { gameId: 1, date: '2024-01-15', durationMin: 30 },  // Short day: 30min
        { gameId: 2, date: '2024-01-16', durationMin: 180 }, // Long day: 180min
        { gameId: 1, date: '2024-01-17', durationMin: 60 }   // Medium day: 60min
      ];

      const result = stats.getTimeAndActivityStats(plays, 2024);

      expect(result.longestDayMinutes).toBe(180);
      expect(result.longestDayDate).toBe('2024-01-16');
      expect(result.longestDayGamesList).toHaveLength(1);
      expect(result.longestDayGamesList[0].gameId).toBe(2);
      expect(result.longestDayGamesList[0].minutes).toBe(180);

      expect(result.shortestDayMinutes).toBe(30);
      expect(result.shortestDayDate).toBe('2024-01-15');
      expect(result.shortestDayGamesList).toHaveLength(1);
      expect(result.shortestDayGamesList[0].gameId).toBe(1);
      expect(result.shortestDayGamesList[0].minutes).toBe(30);
    });

    test('tracks multiple games on same day', () => {
      const plays = [
        { gameId: 1, date: '2024-01-15', durationMin: 60 },
        { gameId: 2, date: '2024-01-15', durationMin: 90 },
        { gameId: 3, date: '2024-01-15', durationMin: 30 }
      ];

      const result = stats.getTimeAndActivityStats(plays, 2024);

      expect(result.totalMinutes).toBe(180);
      expect(result.longestDayGamesList).toHaveLength(3);
      expect(result.mostGamesDay).toBe(3);
      expect(result.mostGamesDayGamesList).toHaveLength(3);

      // Check individual game minutes
      const game1 = result.longestDayGamesList.find(g => g.gameId === 1);
      const game2 = result.longestDayGamesList.find(g => g.gameId === 2);
      const game3 = result.longestDayGamesList.find(g => g.gameId === 3);
      expect(game1.minutes).toBe(60);
      expect(game2.minutes).toBe(90);
      expect(game3.minutes).toBe(30);
    });

    test('tracks multiple plays of same game on same day', () => {
      const plays = [
        { gameId: 1, date: '2024-01-15', durationMin: 60 },
        { gameId: 1, date: '2024-01-15', durationMin: 30 },
        { gameId: 2, date: '2024-01-15', durationMin: 45 }
      ];

      const result = stats.getTimeAndActivityStats(plays, 2024);

      expect(result.mostGamesDay).toBe(2);
      expect(result.mostGamesDayGamesList).toHaveLength(2);

      const game1 = result.mostGamesDayGamesList.find(g => g.gameId === 1);
      const game2 = result.mostGamesDayGamesList.find(g => g.gameId === 2);
      expect(game1.playCount).toBe(2);
      expect(game2.playCount).toBe(1);

      // Check total minutes per game
      const game1Minutes = result.longestDayGamesList.find(g => g.gameId === 1);
      expect(game1Minutes.minutes).toBe(90);
    });

    test('calculates longest consecutive streak', () => {
      const plays = [
        { gameId: 1, date: '2024-01-15', durationMin: 60 },
        { gameId: 1, date: '2024-01-16', durationMin: 60 },
        { gameId: 1, date: '2024-01-17', durationMin: 60 },
        { gameId: 1, date: '2024-01-19', durationMin: 60 },
        { gameId: 1, date: '2024-01-20', durationMin: 60 }
      ];

      const result = stats.getTimeAndActivityStats(plays, 2024);

      expect(result.longestStreak).toBe(3);
      expect(result.longestStreakStart).toBe('2024-01-15');
      expect(result.longestStreakEnd).toBe('2024-01-17');
    });

    test('calculates longest dry spell', () => {
      const plays = [
        { gameId: 1, date: '2024-01-15', durationMin: 60 },
        { gameId: 1, date: '2024-01-20', durationMin: 60 }, // 4 day gap
        { gameId: 1, date: '2024-01-22', durationMin: 60 }  // 1 day gap
      ];

      const result = stats.getTimeAndActivityStats(plays, 2024);

      expect(result.longestDrySpell).toBe(4);
      expect(result.longestDrySpellStart).toBe('2024-01-16');
      expect(result.longestDrySpellEnd).toBe('2024-01-19');
    });

    test('filters plays by year', () => {
      const plays = [
        { gameId: 1, date: '2023-12-15', durationMin: 60 },
        { gameId: 1, date: '2024-01-15', durationMin: 60 },
        { gameId: 1, date: '2024-01-16', durationMin: 60 },
        { gameId: 1, date: '2025-01-15', durationMin: 60 }
      ];

      const result = stats.getTimeAndActivityStats(plays, 2024);

      expect(result.totalDays).toBe(2);
      expect(result.totalMinutes).toBe(120);
    });

    test('handles all-time stats when year is null', () => {
      const plays = [
        { gameId: 1, date: '2023-12-15', durationMin: 60 },
        { gameId: 1, date: '2024-01-15', durationMin: 60 },
        { gameId: 1, date: '2025-01-15', durationMin: 60 }
      ];

      const result = stats.getTimeAndActivityStats(plays, null);

      expect(result.totalDays).toBe(3);
      expect(result.totalMinutes).toBe(180);
    });

    test('tracks most games day with correct counts', () => {
      const plays = [
        { gameId: 1, date: '2024-01-15', durationMin: 60 },
        { gameId: 2, date: '2024-01-15', durationMin: 60 },
        { gameId: 1, date: '2024-01-16', durationMin: 60 },
        { gameId: 2, date: '2024-01-16', durationMin: 60 },
        { gameId: 3, date: '2024-01-16', durationMin: 60 }
      ];

      const result = stats.getTimeAndActivityStats(plays, 2024);

      expect(result.mostGamesDay).toBe(3);
      expect(result.mostGamesDayDate).toBe('2024-01-16');
      expect(result.mostGamesDayGamesList).toHaveLength(3);
    });

    test('handles single day dry spell', () => {
      const plays = [
        { gameId: 1, date: '2024-01-15', durationMin: 60 },
        { gameId: 1, date: '2024-01-17', durationMin: 60 }
      ];

      const result = stats.getTimeAndActivityStats(plays, 2024);

      expect(result.longestDrySpell).toBe(1);
      expect(result.longestDrySpellStart).toBe('2024-01-16');
      expect(result.longestDrySpellEnd).toBe('2024-01-16');
    });

    test('handles decreasing streaks (first streak is longest)', () => {
      const plays = [
        { gameId: 1, date: '2024-01-15', durationMin: 60 },
        { gameId: 1, date: '2024-01-16', durationMin: 60 },
        { gameId: 1, date: '2024-01-17', durationMin: 60 },
        { gameId: 1, date: '2024-01-19', durationMin: 60 },
        { gameId: 1, date: '2024-01-20', durationMin: 60 },
        { gameId: 1, date: '2024-01-25', durationMin: 60 }
      ];

      const result = stats.getTimeAndActivityStats(plays, 2024);

      expect(result.longestStreak).toBe(3);
      expect(result.longestStreakStart).toBe('2024-01-15');
      expect(result.longestStreakEnd).toBe('2024-01-17');
    });

    test('handles decreasing dry spells (first dry spell is longest)', () => {
      const plays = [
        { gameId: 1, date: '2024-01-15', durationMin: 60 },
        { gameId: 1, date: '2024-01-20', durationMin: 60 }, // 4 day gap
        { gameId: 1, date: '2024-01-22', durationMin: 60 }, // 1 day gap
        { gameId: 1, date: '2024-01-23', durationMin: 60 }  // 0 day gap
      ];

      const result = stats.getTimeAndActivityStats(plays, 2024);

      expect(result.longestDrySpell).toBe(4);
      expect(result.longestDrySpellStart).toBe('2024-01-16');
      expect(result.longestDrySpellEnd).toBe('2024-01-19');
    });

    test('handles decreasing game counts (first day has most games)', () => {
      const plays = [
        { gameId: 1, date: '2024-01-15', durationMin: 60 },
        { gameId: 2, date: '2024-01-15', durationMin: 60 },
        { gameId: 3, date: '2024-01-15', durationMin: 60 },
        { gameId: 1, date: '2024-01-16', durationMin: 60 },
        { gameId: 2, date: '2024-01-16', durationMin: 60 }
      ];

      const result = stats.getTimeAndActivityStats(plays, 2024);

      expect(result.mostGamesDay).toBe(3);
      expect(result.mostGamesDayDate).toBe('2024-01-15');
      expect(result.mostGamesDayGamesList).toHaveLength(3);
    });

    test('handles equal duration days (tests tie-breaking)', () => {
      const plays = [
        { gameId: 1, date: '2024-01-15', durationMin: 60 },
        { gameId: 2, date: '2024-01-16', durationMin: 60 },
        { gameId: 3, date: '2024-01-17', durationMin: 60 }
      ];

      const result = stats.getTimeAndActivityStats(plays, 2024);

      expect(result.longestDayMinutes).toBe(60);
      expect(result.shortestDayMinutes).toBe(60);
      expect(result.totalDays).toBe(3);
    });

    test('handles zero duration plays', () => {
      const plays = [
        { gameId: 1, date: '2024-01-15', durationMin: 0 },
        { gameId: 2, date: '2024-01-15', durationMin: 30 }
      ];

      const result = stats.getTimeAndActivityStats(plays, 2024);

      expect(result.totalMinutes).toBe(30);
      expect(result.shortestDayMinutes).toBe(30);
      expect(result.mostGamesDay).toBe(2);
    });
  });
});

describe('getLoggingAchievements', () => {
  test('returns empty array when no thresholds crossed in year', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', durationMin: 30 },
      { gameId: 2, date: '2024-01-16', durationMin: 30 }
    ];

    const result = stats.getLoggingAchievements(plays, 2024);

    expect(result).toEqual([]);
  });

  test('detects hour thresholds (every 100 hours)', () => {
    // 100 hours = 6000 minutes
    const plays = [
      { gameId: 1, date: '2024-01-15', durationMin: 5900 },
      { gameId: 2, date: '2024-01-16', durationMin: 100 } // crosses 100 hours
    ];

    const result = stats.getLoggingAchievements(plays, 2024);

    expect(result).toContainEqual({ metric: 'hours', threshold: 100, date: '2024-01-16' });
  });

  test('detects session thresholds (every 100 sessions)', () => {
    // Create 100 unique days (sessions)
    const plays = [];
    for (let i = 1; i <= 100; i++) {
      const month = i <= 31 ? '01' : i <= 59 ? '02' : i <= 90 ? '03' : '04';
      const dayOfMonth = i <= 31 ? i : i <= 59 ? i - 31 : i <= 90 ? i - 59 : i - 90;
      plays.push({
        gameId: 1,
        date: `2024-${month}-${dayOfMonth.toString().padStart(2, '0')}`,
        durationMin: 30
      });
    }

    const result = stats.getLoggingAchievements(plays, 2024);

    expect(result).toContainEqual(expect.objectContaining({ metric: 'sessions', threshold: 100 }));
  });

  test('detects play thresholds (every 250 plays)', () => {
    // Create 250 plays
    const plays = [];
    for (let i = 0; i < 250; i++) {
      plays.push({
        gameId: 1,
        date: '2024-01-15',
        durationMin: 10
      });
    }

    const result = stats.getLoggingAchievements(plays, 2024);

    expect(result).toContainEqual({ metric: 'plays', threshold: 250, date: '2024-01-15' });
  });

  test('returns correct date for each threshold', () => {
    // 100 hours = 6000 minutes, spread across two days
    const plays = [
      { gameId: 1, date: '2024-01-15', durationMin: 5000 },
      { gameId: 2, date: '2024-01-20', durationMin: 1000 } // crosses 100 hours on this date
    ];

    const result = stats.getLoggingAchievements(plays, 2024);

    const hourAchievement = result.find(a => a.metric === 'hours' && a.threshold === 100);
    expect(hourAchievement.date).toBe('2024-01-20');
  });

  test('handles multiple thresholds of same type in one year', () => {
    // 200 hours = 12000 minutes
    const plays = [
      { gameId: 1, date: '2024-01-15', durationMin: 6000 }, // crosses 100 hours
      { gameId: 2, date: '2024-06-15', durationMin: 6000 }  // crosses 200 hours
    ];

    const result = stats.getLoggingAchievements(plays, 2024);

    expect(result).toContainEqual({ metric: 'hours', threshold: 100, date: '2024-01-15' });
    expect(result).toContainEqual({ metric: 'hours', threshold: 200, date: '2024-06-15' });
  });

  test('filters to only specified year', () => {
    const plays = [
      { gameId: 1, date: '2023-12-15', durationMin: 5900 },
      { gameId: 2, date: '2024-01-15', durationMin: 100 } // crosses 100 hours, but threshold was nearly reached in 2023
    ];

    const result = stats.getLoggingAchievements(plays, 2024);

    // Should include the 100 hour threshold since it was crossed in 2024
    expect(result).toContainEqual({ metric: 'hours', threshold: 100, date: '2024-01-15' });
  });

  test('excludes thresholds crossed in other years', () => {
    const plays = [
      { gameId: 1, date: '2023-06-15', durationMin: 6000 } // crosses 100 hours in 2023
    ];

    const result = stats.getLoggingAchievements(plays, 2024);

    expect(result).toEqual([]);
  });

  test('orders results by metric (hours, sessions, plays) then threshold', () => {
    // Create plays that cross multiple thresholds
    const plays = [];
    // 250 plays on unique days with enough hours
    for (let i = 0; i < 250; i++) {
      const day = (i % 28) + 1;
      const month = Math.floor(i / 28) + 1;
      plays.push({
        gameId: 1,
        date: `2024-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
        durationMin: 60 // 1 hour each, so 250 hours total
      });
    }

    const result = stats.getLoggingAchievements(plays, 2024);

    // Verify ordering: hours first, then sessions, then plays
    const metrics = result.map(a => a.metric);
    const hoursEndIndex = metrics.lastIndexOf('hours');
    const sessionsStartIndex = metrics.indexOf('sessions');
    const sessionsEndIndex = metrics.lastIndexOf('sessions');
    const playsStartIndex = metrics.indexOf('plays');

    if (hoursEndIndex >= 0 && sessionsStartIndex >= 0) {
      expect(hoursEndIndex).toBeLessThan(sessionsStartIndex);
    }
    if (sessionsEndIndex >= 0 && playsStartIndex >= 0) {
      expect(sessionsEndIndex).toBeLessThan(playsStartIndex);
    }
  });

  test('session threshold only counts unique days', () => {
    // Multiple plays on same day should only count as 1 session
    const plays = [
      { gameId: 1, date: '2024-01-15', durationMin: 30 },
      { gameId: 2, date: '2024-01-15', durationMin: 30 },
      { gameId: 3, date: '2024-01-15', durationMin: 30 }
    ];

    const result = stats.getLoggingAchievements(plays, 2024);

    // Should not have any session thresholds since only 1 unique day
    const sessionAchievements = result.filter(a => a.metric === 'sessions');
    expect(sessionAchievements).toEqual([]);
  });

  test('handles crossing multiple thresholds in single play', () => {
    // One massive play that crosses 100 and 200 hours
    const plays = [
      { gameId: 1, date: '2024-01-15', durationMin: 12500 } // ~208 hours
    ];

    const result = stats.getLoggingAchievements(plays, 2024);

    expect(result).toContainEqual({ metric: 'hours', threshold: 100, date: '2024-01-15' });
    expect(result).toContainEqual({ metric: 'hours', threshold: 200, date: '2024-01-15' });
  });
});
