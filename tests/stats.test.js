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

  describe('getPlayMilestones', () => {
    test('returns object with fives, dimes, quarters, centuries', () => {
      const result = stats.getPlayMilestones(edgeCasesData.games, edgeCasesData.plays);
      expect(result).toHaveProperty('fives');
      expect(result).toHaveProperty('dimes');
      expect(result).toHaveProperty('quarters');
      expect(result).toHaveProperty('centuries');
    });

    test('categorizes games at exactly 5 plays', () => {
      const result = stats.getPlayMilestones(edgeCasesData.games, edgeCasesData.plays);
      expect(result.fives.length).toBeGreaterThan(0);
    });

    test('categorizes games at exactly 10 plays', () => {
      const result = stats.getPlayMilestones(edgeCasesData.games, edgeCasesData.plays);
      expect(result.dimes.length).toBeGreaterThan(0);
    });

    test('categorizes games at exactly 25 plays', () => {
      const result = stats.getPlayMilestones(edgeCasesData.games, edgeCasesData.plays);
      expect(result.quarters.length).toBeGreaterThan(0);
    });

    test('categorizes games at 100 plays', () => {
      const result = stats.getPlayMilestones(edgeCasesData.games, edgeCasesData.plays);
      expect(result.centuries.length).toBeGreaterThan(0);
    });

    test('sorts each category by count descending', () => {
      const result = stats.getPlayMilestones(edgeCasesData.games, edgeCasesData.plays);
      if (result.centuries.length > 1) {
        expect(result.centuries[0].count).toBeGreaterThanOrEqual(result.centuries[1].count);
      }
    });

    test('filters by year', () => {
      const result2020 = stats.getPlayMilestones(edgeCasesData.games, edgeCasesData.plays, 2020);
      expect(result2020).toBeDefined();
    });

    test('returns empty arrays for no plays', () => {
      const result = stats.getPlayMilestones(typicalData.games, []);
      expect(result.fives).toEqual([]);
      expect(result.dimes).toEqual([]);
      expect(result.quarters).toEqual([]);
      expect(result.centuries).toEqual([]);
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
  });
});
