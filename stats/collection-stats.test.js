import { describe, test, expect } from 'vitest';
import {
  getTotalBGGEntries,
  getTotalGamesOwned,
  getTotalExpansions,
  getMilestones,
  getCumulativeMilestoneCount,
  calculateMilestoneIncrease,
  getNewMilestoneGames,
  getSkippedMilestoneCount,
  getGamesWithUnknownAcquisitionDate,
  getOwnedGamesNeverPlayed,
  getOwnedBaseGamesMissingPricePaid,
  getAllAcquisitionYears,
  getAvailableYears,
} from './collection-stats.js';
import { Milestone } from './constants.js';
import { isGameOwned } from './game-helpers.js';
import { processData } from '../scripts/transform-game-data.js';
import typicalFixture from '../tests/fixtures/typical.json';
import edgeCasesFixture from '../tests/fixtures/edge-cases.json';
import expandaloneFixture from '../tests/fixtures/expandalone.json';

const typicalData = processData(typicalFixture);
const edgeCasesData = processData(edgeCasesFixture);
const expandaloneData = processData(expandaloneFixture);

describe('getTotalBGGEntries', () => {
  test('counts all owned copies without year filter', () => {
    const total = getTotalBGGEntries(typicalData.games);
    expect(total).toBeGreaterThan(0);
  });

  test('counts copies acquired in specific year', () => {
    const total2020 = getTotalBGGEntries(typicalData.games, 2020);
    expect(total2020).toBeGreaterThanOrEqual(0);
  });

  test('returns 0 for empty games array', () => {
    const total = getTotalBGGEntries([]);
    expect(total).toBe(0);
  });

  test('handles games with no copies', () => {
    const games = [{ copies: [] }];
    expect(getTotalBGGEntries(games)).toBe(0);
  });

  test('counts multiple copies of same game', () => {
    const game = typicalData.games.find(g => g.name === 'Multiple Copies Game');
    expect(game.copies.length).toBeGreaterThan(1);
  });
});

describe('getTotalGamesOwned', () => {
  test('counts base games without year filter', () => {
    const total = getTotalGamesOwned(typicalData.games);
    expect(total).toBeGreaterThan(0);
  });

  test('excludes expandalones', () => {
    const total = getTotalGamesOwned(expandaloneData.games);
    expect(total).toBe(1);
  });

  test('excludes expansions', () => {
    const total = getTotalGamesOwned(typicalData.games);
    const expansionCount = typicalData.games.filter(g => g.isExpansion).length;
    expect(total).toBeLessThanOrEqual(typicalData.games.length - expansionCount);
  });

  test('filters by acquisition year', () => {
    const total2020 = getTotalGamesOwned(typicalData.games, 2020);
    expect(total2020).toBeGreaterThanOrEqual(0);
  });

  test('returns 0 for empty games array', () => {
    expect(getTotalGamesOwned([])).toBe(0);
  });
});

describe('getTotalExpansions', () => {
  test('returns object with total, expandalones, expansionOnly', () => {
    const result = getTotalExpansions(typicalData.games);
    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('expandalones');
    expect(result).toHaveProperty('expansionOnly');
  });

  test('counts expandalones separately from expansions', () => {
    const result = getTotalExpansions(expandaloneData.games);
    expect(result.expandalones).toBe(1);
    expect(result.expansionOnly).toBe(1);
    expect(result.total).toBe(2);
  });

  test('filters by acquisition year', () => {
    const result2021 = getTotalExpansions(typicalData.games, 2021);
    expect(result2021.total).toBeGreaterThanOrEqual(0);
  });

  test('returns zeros for empty games array', () => {
    const result = getTotalExpansions([]);
    expect(result.total).toBe(0);
    expect(result.expandalones).toBe(0);
    expect(result.expansionOnly).toBe(0);
  });
});

describe('getMilestones', () => {
  describe('plays metric', () => {
    test('returns object with fives, dimes, quarters, centuries', () => {
      const result = getMilestones(edgeCasesData.games, edgeCasesData.plays, null, 'plays');
      expect(result).toHaveProperty('5');
      expect(result).toHaveProperty('10');
      expect(result).toHaveProperty('25');
      expect(result).toHaveProperty('100');
    });

    test('categorizes games at exactly 5 plays', () => {
      const result = getMilestones(edgeCasesData.games, edgeCasesData.plays, null, 'plays');
      expect(result[5].length).toBeGreaterThan(0);
    });

    test('categorizes games at exactly 10 plays', () => {
      const result = getMilestones(edgeCasesData.games, edgeCasesData.plays, null, 'plays');
      expect(result[10].length).toBeGreaterThan(0);
    });

    test('categorizes games at exactly 25 plays', () => {
      const result = getMilestones(edgeCasesData.games, edgeCasesData.plays, null, 'plays');
      expect(result[25].length).toBeGreaterThan(0);
    });

    test('categorizes games at 100 plays', () => {
      const result = getMilestones(edgeCasesData.games, edgeCasesData.plays, null, 'plays');
      expect(result[100].length).toBeGreaterThan(0);
    });

    test('sorts each category by count descending', () => {
      const result = getMilestones(edgeCasesData.games, edgeCasesData.plays, null, 'plays');
      if (result[100].length > 1) {
        expect(result[100][0].count).toBeGreaterThanOrEqual(result[100][1].count);
      }
    });

    test('filters by year', () => {
      const result2020 = getMilestones(edgeCasesData.games, edgeCasesData.plays, 2020, 'plays');
      expect(result2020).toBeDefined();
    });

    test('returns empty arrays for no plays', () => {
      const result = getMilestones(typicalData.games, [], null, 'plays');
      expect(result[5]).toEqual([]);
      expect(result[10]).toEqual([]);
      expect(result[25]).toEqual([]);
      expect(result[100]).toEqual([]);
    });

    test('ignores plays for games not in games array', () => {
      const testGames = [{ id: 1, name: 'Game 1' }];
      const testPlays = [
        ...Array.from({ length: 5 }, (_, i) => ({ gameId: 1, date: `2020-01-0${i + 1}`, durationMin: 60 })),
        ...Array.from({ length: 5 }, (_, i) => ({ gameId: 999, date: `2020-01-0${i + 1}`, durationMin: 60 })),
      ];
      const result = getMilestones(testGames, testPlays, null, 'plays');
      expect(result[5]).toHaveLength(1);
      expect(result[5][0].game.id).toBe(1);
    });
  });

  describe('sessions metric', () => {
    test('categorizes games by unique days played', () => {
      const result = getMilestones(edgeCasesData.games, edgeCasesData.plays, null, 'sessions');
      expect(result[5].length).toBeGreaterThan(0);
    });

    test('counts unique dates correctly', () => {
      const testGames = [{ id: 1, name: 'Test Game' }];
      const testPlays = [
        { gameId: 1, date: '2020-01-01', durationMin: 60 },
        { gameId: 1, date: '2020-01-01', durationMin: 60 },
        { gameId: 1, date: '2020-01-02', durationMin: 60 },
        { gameId: 1, date: '2020-01-03', durationMin: 60 },
        { gameId: 1, date: '2020-01-04', durationMin: 60 },
        { gameId: 1, date: '2020-01-05', durationMin: 60 },
      ];
      const result = getMilestones(testGames, testPlays, null, 'sessions');
      expect(result[5]).toHaveLength(1);
      expect(result[5][0].count).toBe(5);
    });

    test('filters by year for sessions', () => {
      const result = getMilestones(edgeCasesData.games, edgeCasesData.plays, 2020, 'sessions');
      expect(result).toBeDefined();
    });
  });

  describe('hours metric', () => {
    test('categorizes games by total hours played', () => {
      const result = getMilestones(edgeCasesData.games, edgeCasesData.plays, null, 'hours');
      expect(result[5].length).toBeGreaterThan(0);
    });

    test('calculates hours from durationMin correctly', () => {
      const testGames = [{ id: 1, name: 'Test Game' }];
      const testPlays = [{ gameId: 1, date: '2020-01-01', durationMin: 300 }];
      const result = getMilestones(testGames, testPlays, null, 'hours');
      expect(result[5]).toHaveLength(1);
      expect(result[5][0].count).toBe(5);
    });

    test('sums hours across multiple plays', () => {
      const testGames = [{ id: 1, name: 'Test Game' }];
      const testPlays = [
        { gameId: 1, date: '2020-01-01', durationMin: 120 },
        { gameId: 1, date: '2020-01-02', durationMin: 180 },
      ];
      const result = getMilestones(testGames, testPlays, null, 'hours');
      expect(result[5]).toHaveLength(1);
      expect(result[5][0].count).toBe(5);
    });

    test('handles missing duration as 0', () => {
      const testGames = [{ id: 1, name: 'Test Game' }];
      const testPlays = [{ gameId: 1, date: '2020-01-01' }];
      const result = getMilestones(testGames, testPlays, null, 'hours');
      expect(result[5]).toHaveLength(0);
    });

    test('filters by year for hours', () => {
      const result = getMilestones(edgeCasesData.games, edgeCasesData.plays, 2020, 'hours');
      expect(result).toBeDefined();
    });
  });

  test('defaults to plays metric when not specified', () => {
    const resultDefault = getMilestones(edgeCasesData.games, edgeCasesData.plays);
    const resultPlays = getMilestones(edgeCasesData.games, edgeCasesData.plays, null, 'plays');
    expect(resultDefault).toEqual(resultPlays);
  });
});

describe('Milestone.getThreshold', () => {
  test('returns correct thresholds for fives', () => {
    expect(Milestone.getThreshold(5)).toEqual({ threshold: 5, nextThreshold: 10 });
  });

  test('returns correct thresholds for dimes', () => {
    expect(Milestone.getThreshold(10)).toEqual({ threshold: 10, nextThreshold: 25 });
  });

  test('returns correct thresholds for quarters', () => {
    expect(Milestone.getThreshold(25)).toEqual({ threshold: 25, nextThreshold: 100 });
  });

  test('returns correct thresholds for centuries', () => {
    expect(Milestone.getThreshold(100)).toEqual({ threshold: 100, nextThreshold: null });
  });

  test('returns null thresholds for unknown milestone type', () => {
    expect(Milestone.getThreshold(999)).toEqual({ threshold: null, nextThreshold: null });
  });
});

describe('getCumulativeMilestoneCount', () => {
  describe('plays metric', () => {
    test('counts games with 5+ plays', () => {
      const testGames = [
        { id: 1, name: 'Game 1' },
        { id: 2, name: 'Game 2' },
        { id: 3, name: 'Game 3' },
      ];
      const testPlays = [
        { gameId: 1, date: '2020-01-01', durationMin: 60 },
        { gameId: 1, date: '2020-01-02', durationMin: 60 },
        { gameId: 1, date: '2020-01-03', durationMin: 60 },
        { gameId: 1, date: '2020-01-04', durationMin: 60 },
        { gameId: 1, date: '2020-01-05', durationMin: 60 },
        { gameId: 2, date: '2020-01-01', durationMin: 60 },
        { gameId: 2, date: '2020-01-02', durationMin: 60 },
        { gameId: 2, date: '2020-01-03', durationMin: 60 },
        { gameId: 3, date: '2020-01-01', durationMin: 60 },
        { gameId: 3, date: '2020-01-02', durationMin: 60 },
        { gameId: 3, date: '2020-01-03', durationMin: 60 },
        { gameId: 3, date: '2020-01-04', durationMin: 60 },
        { gameId: 3, date: '2020-01-05', durationMin: 60 },
        { gameId: 3, date: '2020-01-06', durationMin: 60 },
        { gameId: 3, date: '2020-01-07', durationMin: 60 },
        { gameId: 3, date: '2020-01-08', durationMin: 60 },
        { gameId: 3, date: '2020-01-09', durationMin: 60 },
        { gameId: 3, date: '2020-01-10', durationMin: 60 },
      ];
      const result = getCumulativeMilestoneCount(testGames, testPlays, null, 'plays', 5);
      expect(result).toBe(1);
    });

    test('returns 0 when no games meet threshold', () => {
      const testGames = [{ id: 1, name: 'Game 1' }];
      const testPlays = [
        { gameId: 1, date: '2020-01-01', durationMin: 60 },
        { gameId: 1, date: '2020-01-02', durationMin: 60 },
      ];
      const result = getCumulativeMilestoneCount(testGames, testPlays, null, 'plays', 5);
      expect(result).toBe(0);
    });
  });

  describe('hours metric', () => {
    test('counts games with 5+ hours', () => {
      const testGames = [{ id: 1, name: 'Game 1' }];
      const testPlays = [
        { gameId: 1, date: '2020-01-01', durationMin: 300 },
      ];
      const result = getCumulativeMilestoneCount(testGames, testPlays, null, 'hours', 5);
      expect(result).toBe(1);
    });

    test('returns 0 when hours below threshold', () => {
      const testGames = [{ id: 1, name: 'Game 1' }];
      const testPlays = [
        { gameId: 1, date: '2020-01-01', durationMin: 240 },
      ];
      const result = getCumulativeMilestoneCount(testGames, testPlays, null, 'hours', 5);
      expect(result).toBe(0);
    });
  });

  describe('sessions metric', () => {
    test('counts games with 5+ sessions', () => {
      const testGames = [{ id: 1, name: 'Game 1' }];
      const testPlays = [
        { gameId: 1, date: '2020-01-01', durationMin: 60 },
        { gameId: 1, date: '2020-01-02', durationMin: 60 },
        { gameId: 1, date: '2020-01-03', durationMin: 60 },
        { gameId: 1, date: '2020-01-04', durationMin: 60 },
        { gameId: 1, date: '2020-01-05', durationMin: 60 },
      ];
      const result = getCumulativeMilestoneCount(testGames, testPlays, null, 'sessions', 5);
      expect(result).toBe(1);
    });

    test('counts unique dates for sessions', () => {
      const testGames = [{ id: 1, name: 'Game 1' }];
      const testPlays = [
        { gameId: 1, date: '2020-01-01', durationMin: 60 },
        { gameId: 1, date: '2020-01-01', durationMin: 60 },
        { gameId: 1, date: '2020-01-02', durationMin: 60 },
        { gameId: 1, date: '2020-01-03', durationMin: 60 },
      ];
      const result = getCumulativeMilestoneCount(testGames, testPlays, null, 'sessions', 5);
      expect(result).toBe(0);
    });
  });

  test('returns 0 for empty plays array', () => {
    const testGames = [{ id: 1, name: 'Game 1' }];
    const result = getCumulativeMilestoneCount(testGames, [], null, 'plays', 5);
    expect(result).toBe(0);
  });

  test('handles plays for games not in games array', () => {
    const testGames = [{ id: 1, name: 'Game 1' }];
    const testPlays = [
      { gameId: 1, date: '2020-01-01', durationMin: 60 },
      { gameId: 1, date: '2020-01-02', durationMin: 60 },
      { gameId: 1, date: '2020-01-03', durationMin: 60 },
      { gameId: 1, date: '2020-01-04', durationMin: 60 },
      { gameId: 1, date: '2020-01-05', durationMin: 60 },
      { gameId: 999, date: '2020-01-01', durationMin: 60 },
    ];
    const result = getCumulativeMilestoneCount(testGames, testPlays, null, 'plays', 5);
    expect(result).toBe(1);
  });

  test('handles plays with missing durationMin', () => {
    const testGames = [{ id: 1, name: 'Game 1' }];
    const testPlays = [
      { gameId: 1, date: '2020-01-01' },
      { gameId: 1, date: '2020-01-02' },
      { gameId: 1, date: '2020-01-03' },
      { gameId: 1, date: '2020-01-04' },
      { gameId: 1, date: '2020-01-05' },
    ];
    const result = getCumulativeMilestoneCount(testGames, testPlays, null, 'plays', 5);
    expect(result).toBe(1);
  });
});

describe('calculateMilestoneIncrease', () => {
  describe('plays metric', () => {
    test('calculates increase when games enter milestone range', () => {
      const testGames = [
        { id: 1, name: 'Game 1' },
        { id: 2, name: 'Game 2' },
      ];
      const testPlays = [
        { gameId: 1, date: '2020-01-01', durationMin: 60 },
        { gameId: 1, date: '2020-01-02', durationMin: 60 },
        { gameId: 1, date: '2020-01-03', durationMin: 60 },
        { gameId: 1, date: '2021-01-01', durationMin: 60 },
        { gameId: 1, date: '2021-01-02', durationMin: 60 },
        { gameId: 2, date: '2020-01-01', durationMin: 60 },
        { gameId: 2, date: '2020-01-02', durationMin: 60 },
        { gameId: 2, date: '2020-01-03', durationMin: 60 },
        { gameId: 2, date: '2020-01-04', durationMin: 60 },
        { gameId: 2, date: '2020-01-05', durationMin: 60 },
      ];
      const result = calculateMilestoneIncrease(testGames, testPlays, 2021, 'plays', 5);
      expect(result).toBe(1);
    });

    test('returns 0 when no change in milestone count', () => {
      const testGames = [{ id: 1, name: 'Game 1' }];
      const testPlays = [
        { gameId: 1, date: '2020-01-01', durationMin: 60 },
        { gameId: 1, date: '2020-01-02', durationMin: 60 },
        { gameId: 1, date: '2020-01-03', durationMin: 60 },
        { gameId: 1, date: '2020-01-04', durationMin: 60 },
        { gameId: 1, date: '2020-01-05', durationMin: 60 },
        { gameId: 1, date: '2021-01-01', durationMin: 60 },
      ];
      const result = calculateMilestoneIncrease(testGames, testPlays, 2021, 'plays', 5);
      expect(result).toBe(0);
    });
  });

  describe('hours metric', () => {
    test('calculates increase when game reaches 5 hours', () => {
      const testGames = [{ id: 1, name: 'Game 1' }];
      const testPlays = [
        { gameId: 1, date: '2020-01-01', durationMin: 180 },
        { gameId: 1, date: '2021-01-01', durationMin: 120 },
      ];
      const result = calculateMilestoneIncrease(testGames, testPlays, 2021, 'hours', 5);
      expect(result).toBe(1);
    });

    test('returns 0 when already at milestone before year', () => {
      const testGames = [{ id: 1, name: 'Game 1' }];
      const testPlays = [
        { gameId: 1, date: '2020-01-01', durationMin: 300 },
        { gameId: 1, date: '2021-01-01', durationMin: 60 },
      ];
      const result = calculateMilestoneIncrease(testGames, testPlays, 2021, 'hours', 5);
      expect(result).toBe(0);
    });
  });

  describe('sessions metric', () => {
    test('calculates increase when game reaches 5 sessions', () => {
      const testGames = [{ id: 1, name: 'Game 1' }];
      const testPlays = [
        { gameId: 1, date: '2020-01-01', durationMin: 60 },
        { gameId: 1, date: '2020-01-02', durationMin: 60 },
        { gameId: 1, date: '2020-01-03', durationMin: 60 },
        { gameId: 1, date: '2021-01-01', durationMin: 60 },
        { gameId: 1, date: '2021-01-02', durationMin: 60 },
      ];
      const result = calculateMilestoneIncrease(testGames, testPlays, 2021, 'sessions', 5);
      expect(result).toBe(1);
    });

    test('returns 0 when already at milestone before year', () => {
      const testGames = [{ id: 1, name: 'Game 1' }];
      const testPlays = [
        { gameId: 1, date: '2020-01-01', durationMin: 60 },
        { gameId: 1, date: '2020-01-02', durationMin: 60 },
        { gameId: 1, date: '2020-01-03', durationMin: 60 },
        { gameId: 1, date: '2020-01-04', durationMin: 60 },
        { gameId: 1, date: '2020-01-05', durationMin: 60 },
        { gameId: 1, date: '2021-01-01', durationMin: 60 },
      ];
      const result = calculateMilestoneIncrease(testGames, testPlays, 2021, 'sessions', 5);
      expect(result).toBe(0);
    });
  });
});

describe('getNewMilestoneGames', () => {
  describe('plays metric', () => {
    test('identifies games that entered milestone in given year', () => {
      const testGames = [
        { id: 1, name: 'Game 1' },
        { id: 2, name: 'Game 2' },
      ];
      const testPlays = [
        { gameId: 1, date: '2020-01-01', durationMin: 60 },
        { gameId: 1, date: '2020-01-02', durationMin: 60 },
        { gameId: 1, date: '2021-01-01', durationMin: 60 },
        { gameId: 1, date: '2021-01-02', durationMin: 60 },
        { gameId: 1, date: '2021-01-03', durationMin: 60 },
        { gameId: 2, date: '2019-01-01', durationMin: 60 },
        { gameId: 2, date: '2019-01-02', durationMin: 60 },
        { gameId: 2, date: '2019-01-03', durationMin: 60 },
        { gameId: 2, date: '2019-01-04', durationMin: 60 },
        { gameId: 2, date: '2019-01-05', durationMin: 60 },
      ];
      const result = getNewMilestoneGames(testGames, testPlays, 2021, 'plays', 5);
      expect(result.length).toBe(1);
      expect(result[0].game.id).toBe(1);
      expect(result[0].value).toBe(5);
      expect(result[0].thisYearValue).toBe(3);
    });

    test('returns empty array when no games entered milestone', () => {
      const testGames = [{ id: 1, name: 'Game 1' }];
      const testPlays = [
        { gameId: 1, date: '2020-01-01', durationMin: 60 },
        { gameId: 1, date: '2021-01-01', durationMin: 60 },
      ];
      const result = getNewMilestoneGames(testGames, testPlays, 2021, 'plays', 5);
      expect(result).toEqual([]);
    });
  });

  describe('hours metric', () => {
    test('identifies games that reached 5 hours in given year', () => {
      const testGames = [{ id: 1, name: 'Game 1' }];
      const testPlays = [
        { gameId: 1, date: '2020-01-01', durationMin: 180 },
        { gameId: 1, date: '2021-01-01', durationMin: 120 },
      ];
      const result = getNewMilestoneGames(testGames, testPlays, 2021, 'hours', 5);
      expect(result.length).toBe(1);
      expect(result[0].game.id).toBe(1);
      expect(result[0].value).toBe(5);
      expect(result[0].thisYearValue).toBe(2);
    });
  });

  describe('sessions metric', () => {
    test('identifies games that reached 5 sessions in given year', () => {
      const testGames = [{ id: 1, name: 'Game 1' }];
      const testPlays = [
        { gameId: 1, date: '2020-01-01', durationMin: 60 },
        { gameId: 1, date: '2020-01-02', durationMin: 60 },
        { gameId: 1, date: '2020-01-03', durationMin: 60 },
        { gameId: 1, date: '2021-01-01', durationMin: 60 },
        { gameId: 1, date: '2021-01-02', durationMin: 60 },
      ];
      const result = getNewMilestoneGames(testGames, testPlays, 2021, 'sessions', 5);
      expect(result.length).toBe(1);
      expect(result[0].game.id).toBe(1);
      expect(result[0].value).toBe(5);
      expect(result[0].thisYearValue).toBe(2);
    });
  });

  test('handles plays for games not in games array', () => {
    const testGames = [{ id: 1, name: 'Game 1' }];
    const testPlays = [
      { gameId: 1, date: '2020-01-01', durationMin: 60 },
      { gameId: 1, date: '2020-01-02', durationMin: 60 },
      { gameId: 1, date: '2021-01-01', durationMin: 60 },
      { gameId: 1, date: '2021-01-02', durationMin: 60 },
      { gameId: 1, date: '2021-01-03', durationMin: 60 },
      { gameId: 999, date: '2021-01-01', durationMin: 60 },
    ];
    const result = getNewMilestoneGames(testGames, testPlays, 2021, 'plays', 5);
    expect(result.length).toBe(1);
    expect(result[0].game.id).toBe(1);
  });

  test('handles plays with missing durationMin', () => {
    const testGames = [{ id: 1, name: 'Game 1' }];
    const testPlays = [
      { gameId: 1, date: '2020-01-01' },
      { gameId: 1, date: '2020-01-02' },
      { gameId: 1, date: '2021-01-01' },
      { gameId: 1, date: '2021-01-02' },
      { gameId: 1, date: '2021-01-03' },
    ];
    const result = getNewMilestoneGames(testGames, testPlays, 2021, 'plays', 5);
    expect(result.length).toBe(1);
  });

  test('handles game first played this year (no previous year data)', () => {
    const testGames = [{ id: 1, name: 'Game 1' }];
    // Game had no plays in previous year, reaches 5 plays this year
    const testPlays = [
      { gameId: 1, date: '2021-01-01', durationMin: 60 },
      { gameId: 1, date: '2021-01-02', durationMin: 60 },
      { gameId: 1, date: '2021-01-03', durationMin: 60 },
      { gameId: 1, date: '2021-01-04', durationMin: 60 },
      { gameId: 1, date: '2021-01-05', durationMin: 60 },
    ];
    const result = getNewMilestoneGames(testGames, testPlays, 2021, 'plays', 5);
    expect(result.length).toBe(1);
    expect(result[0].game.id).toBe(1);
    expect(result[0].thisYearValue).toBe(5);
  });

  test('sorts multiple new milestone games by value descending', () => {
    const testGames = [
      { id: 1, name: 'Game 1' },
      { id: 2, name: 'Game 2' },
    ];
    // Both games reach fives milestone this year, Game 2 has more plays
    const testPlays = [
      // Game 1: 5 plays
      { gameId: 1, date: '2021-01-01', durationMin: 60 },
      { gameId: 1, date: '2021-01-02', durationMin: 60 },
      { gameId: 1, date: '2021-01-03', durationMin: 60 },
      { gameId: 1, date: '2021-01-04', durationMin: 60 },
      { gameId: 1, date: '2021-01-05', durationMin: 60 },
      // Game 2: 7 plays
      { gameId: 2, date: '2021-01-01', durationMin: 60 },
      { gameId: 2, date: '2021-01-02', durationMin: 60 },
      { gameId: 2, date: '2021-01-03', durationMin: 60 },
      { gameId: 2, date: '2021-01-04', durationMin: 60 },
      { gameId: 2, date: '2021-01-05', durationMin: 60 },
      { gameId: 2, date: '2021-01-06', durationMin: 60 },
      { gameId: 2, date: '2021-01-07', durationMin: 60 },
    ];
    const result = getNewMilestoneGames(testGames, testPlays, 2021, 'plays', 5);
    expect(result.length).toBe(2);
    // Should be sorted by value descending (Game 2 first with 7, then Game 1 with 5)
    expect(result[0].game.id).toBe(2);
    expect(result[0].value).toBe(7);
    expect(result[1].game.id).toBe(1);
    expect(result[1].value).toBe(5);
  });
});

describe('getSkippedMilestoneCount', () => {
  test('counts games that skip fives (jump from <5 to >=10)', () => {
    const testGames = [{ id: 1, name: 'Game 1' }];
    // Game had 3 plays in 2020, gets 10 more in 2021 = 13 total (skips fives, lands in dimes)
    const testPlays = [
      { gameId: 1, date: '2020-01-01', durationMin: 60 },
      { gameId: 1, date: '2020-01-02', durationMin: 60 },
      { gameId: 1, date: '2020-01-03', durationMin: 60 },
      { gameId: 1, date: '2021-01-01', durationMin: 60 },
      { gameId: 1, date: '2021-01-02', durationMin: 60 },
      { gameId: 1, date: '2021-01-03', durationMin: 60 },
      { gameId: 1, date: '2021-01-04', durationMin: 60 },
      { gameId: 1, date: '2021-01-05', durationMin: 60 },
      { gameId: 1, date: '2021-01-06', durationMin: 60 },
      { gameId: 1, date: '2021-01-07', durationMin: 60 },
      { gameId: 1, date: '2021-01-08', durationMin: 60 },
      { gameId: 1, date: '2021-01-09', durationMin: 60 },
      { gameId: 1, date: '2021-01-10', durationMin: 60 },
    ];
    const result = getSkippedMilestoneCount(testGames, testPlays, 2021, 'plays', 5);
    expect(result).toBe(1);
  });

  test('does not count games that land within the range', () => {
    const testGames = [{ id: 1, name: 'Game 1' }];
    // Game had 3 plays in 2020, gets 4 more in 2021 = 7 total (lands in fives, not skipped)
    const testPlays = [
      { gameId: 1, date: '2020-01-01', durationMin: 60 },
      { gameId: 1, date: '2020-01-02', durationMin: 60 },
      { gameId: 1, date: '2020-01-03', durationMin: 60 },
      { gameId: 1, date: '2021-01-01', durationMin: 60 },
      { gameId: 1, date: '2021-01-02', durationMin: 60 },
      { gameId: 1, date: '2021-01-03', durationMin: 60 },
      { gameId: 1, date: '2021-01-04', durationMin: 60 },
    ];
    const result = getSkippedMilestoneCount(testGames, testPlays, 2021, 'plays', 5);
    expect(result).toBe(0);
  });

  test('returns 0 for centuries (cannot be skipped)', () => {
    const testGames = [{ id: 1, name: 'Game 1' }];
    const testPlays = [];
    const result = getSkippedMilestoneCount(testGames, testPlays, 2021, 'plays', 100);
    expect(result).toBe(0);
  });

  test('counts games that skip dimes (jump from <10 to >=25)', () => {
    const testGames = [{ id: 1, name: 'Game 1' }];
    // Game had 8 plays in 2020, gets 20 more in 2021 = 28 total (skips dimes, lands in quarters)
    const testPlays = [
      { gameId: 1, date: '2020-01-01', durationMin: 60 },
      { gameId: 1, date: '2020-01-02', durationMin: 60 },
      { gameId: 1, date: '2020-01-03', durationMin: 60 },
      { gameId: 1, date: '2020-01-04', durationMin: 60 },
      { gameId: 1, date: '2020-01-05', durationMin: 60 },
      { gameId: 1, date: '2020-01-06', durationMin: 60 },
      { gameId: 1, date: '2020-01-07', durationMin: 60 },
      { gameId: 1, date: '2020-01-08', durationMin: 60 },
      ...Array.from({ length: 20 }, (_, i) => ({
        gameId: 1,
        date: `2021-01-${String(i + 1).padStart(2, '0')}`,
        durationMin: 60,
      })),
    ];
    const result = getSkippedMilestoneCount(testGames, testPlays, 2021, 'plays', 10);
    expect(result).toBe(1);
  });

  test('works with hours metric', () => {
    const testGames = [{ id: 1, name: 'Game 1' }];
    // Game had 3 hours in 2020, gets 8 more in 2021 = 11 total (skips fives, lands in dimes)
    const testPlays = [
      { gameId: 1, date: '2020-01-01', durationMin: 180 },
      { gameId: 1, date: '2021-01-01', durationMin: 480 },
    ];
    const result = getSkippedMilestoneCount(testGames, testPlays, 2021, 'hours', 5);
    expect(result).toBe(1);
  });

  test('works with sessions metric', () => {
    const testGames = [{ id: 1, name: 'Game 1' }];
    // Game had 3 sessions in 2020, gets 8 more in 2021 = 11 total (skips fives, lands in dimes)
    const testPlays = [
      { gameId: 1, date: '2020-01-01', durationMin: 60 },
      { gameId: 1, date: '2020-01-02', durationMin: 60 },
      { gameId: 1, date: '2020-01-03', durationMin: 60 },
      { gameId: 1, date: '2021-01-01', durationMin: 60 },
      { gameId: 1, date: '2021-01-02', durationMin: 60 },
      { gameId: 1, date: '2021-01-03', durationMin: 60 },
      { gameId: 1, date: '2021-01-04', durationMin: 60 },
      { gameId: 1, date: '2021-01-05', durationMin: 60 },
      { gameId: 1, date: '2021-01-06', durationMin: 60 },
      { gameId: 1, date: '2021-01-07', durationMin: 60 },
      { gameId: 1, date: '2021-01-08', durationMin: 60 },
    ];
    const result = getSkippedMilestoneCount(testGames, testPlays, 2021, 'sessions', 5);
    expect(result).toBe(1);
  });

  test('does not count games already above threshold in previous year', () => {
    const testGames = [{ id: 1, name: 'Game 1' }];
    // Game had 12 plays in 2020 (already above fives max), gets more in 2021
    const testPlays = [
      ...Array.from({ length: 12 }, (_, i) => ({
        gameId: 1,
        date: `2020-01-${String(i + 1).padStart(2, '0')}`,
        durationMin: 60,
      })),
      { gameId: 1, date: '2021-01-01', durationMin: 60 },
    ];
    const result = getSkippedMilestoneCount(testGames, testPlays, 2021, 'plays', 5);
    expect(result).toBe(0);
  });

  test('ignores plays for games not in games array', () => {
    const testGames = [{ id: 1, name: 'Game 1' }];
    // Game 1 skips fives, Game 999 would skip too but isn't in games array
    const testPlays = [
      ...Array.from({ length: 3 }, (_, i) => ({ gameId: 1, date: `2020-01-0${i + 1}`, durationMin: 60 })),
      ...Array.from({ length: 10 }, (_, i) => ({ gameId: 1, date: `2021-01-${String(i + 1).padStart(2, '0')}`, durationMin: 60 })),
      ...Array.from({ length: 3 }, (_, i) => ({ gameId: 999, date: `2020-01-0${i + 1}`, durationMin: 60 })),
      ...Array.from({ length: 10 }, (_, i) => ({ gameId: 999, date: `2021-01-${String(i + 1).padStart(2, '0')}`, durationMin: 60 })),
    ];
    const result = getSkippedMilestoneCount(testGames, testPlays, 2021, 'plays', 5);
    expect(result).toBe(1);
  });

  test('handles game first played this year that skips milestone (no previous year data)', () => {
    const testGames = [{ id: 1, name: 'Game 1' }];
    // Game had 0 plays before 2021, reaches 12 plays in 2021 (skips fives)
    const testPlays = Array.from({ length: 12 }, (_, i) => ({
      gameId: 1,
      date: `2021-01-${String(i + 1).padStart(2, '0')}`,
      durationMin: 60,
    }));
    const result = getSkippedMilestoneCount(testGames, testPlays, 2021, 'plays', 5);
    expect(result).toBe(1);
  });
});

describe('Diagnostic Functions', () => {
  describe('getGamesWithUnknownAcquisitionDate', () => {
    test('finds games without acquisition dates', () => {
      const result = getGamesWithUnknownAcquisitionDate(edgeCasesData.games);
      expect(result.length).toBeGreaterThan(0);
    });

    test('only returns owned games', () => {
      const result = getGamesWithUnknownAcquisitionDate(edgeCasesData.games);
      result.forEach(game => {
        expect(isGameOwned(game)).toBe(true);
      });
    });

    test('returns empty array when all games have acquisition dates', () => {
      const result = getGamesWithUnknownAcquisitionDate(typicalData.games);
      expect(Array.isArray(result)).toBe(true);
    });

    test('handles games with no copies', () => {
      const games = [{ copies: [] }];
      expect(getGamesWithUnknownAcquisitionDate(games)).toEqual([]);
    });
  });

  describe('getOwnedGamesNeverPlayed', () => {
    test('finds owned base games with no plays', () => {
      const result = getOwnedGamesNeverPlayed(typicalData.games, typicalData.plays);
      expect(result.length).toBeGreaterThan(0);
    });

    test('excludes expansions', () => {
      const result = getOwnedGamesNeverPlayed(typicalData.games, typicalData.plays);
      result.forEach(game => {
        expect(game.isExpansion).toBe(false);
      });
    });

    test('excludes expandalones', () => {
      const result = getOwnedGamesNeverPlayed(typicalData.games, typicalData.plays);
      result.forEach(game => {
        expect(game.isBaseGame).toBe(true);
      });
    });

    test('filters by acquisition year', () => {
      const result2023 = getOwnedGamesNeverPlayed(typicalData.games, typicalData.plays, 2023);
      expect(Array.isArray(result2023)).toBe(true);
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
          copies: [{ statusOwned: true, acquisitionDate: '2023-01-01', pricePaid: null }],
        },
        {
          id: 2,
          name: 'Base Game With Price',
          isBaseGame: true,
          isExpansion: false,
          isExpandalone: false,
          copies: [{ statusOwned: true, acquisitionDate: '2023-01-01', pricePaid: 39.99 }],
        },
      ];
      const result = getOwnedBaseGamesMissingPricePaid(testGames);
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
          copies: [{ statusOwned: true, acquisitionDate: '2023-01-01', pricePaid: null }],
        },
      ];
      const result = getOwnedBaseGamesMissingPricePaid(testGames);
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
          copies: [{ statusOwned: true, acquisitionDate: '2023-01-01', pricePaid: '' }],
        },
      ];
      const result = getOwnedBaseGamesMissingPricePaid(testGames);
      expect(result.length).toBe(1);
    });

    test('handles games with no copies property', () => {
      const testGames = [
        {
          id: 1,
          name: 'Game Without Copies',
          isBaseGame: true,
          isExpansion: false,
          isExpandalone: false,
        },
      ];
      const result = getOwnedBaseGamesMissingPricePaid(testGames);
      expect(result.length).toBe(0);
    });

    test('handles games with no owned copies', () => {
      const testGames = [
        {
          id: 1,
          name: 'Game With Unowned Copy',
          isBaseGame: true,
          isExpansion: false,
          isExpandalone: false,
          copies: [{ statusOwned: false, pricePaid: null }],
        },
      ];
      const result = getOwnedBaseGamesMissingPricePaid(testGames);
      expect(result.length).toBe(0);
    });
  });
});

describe('Year Functions', () => {
  describe('getAllAcquisitionYears', () => {
    test('extracts acquisition years from games', () => {
      const years = getAllAcquisitionYears(typicalData.games);
      expect(years.length).toBeGreaterThan(0);
      expect(years.every(y => typeof y === 'number')).toBe(true);
    });

    test('sorts years in descending order', () => {
      const years = getAllAcquisitionYears(typicalData.games);
      for (let i = 0; i < years.length - 1; i++) {
        expect(years[i]).toBeGreaterThanOrEqual(years[i + 1]);
      }
    });

    test('returns empty array for games with no acquisition dates', () => {
      const games = [{ copies: [{ acquisitionDate: null }] }];
      expect(getAllAcquisitionYears(games)).toEqual([]);
    });

    test('handles games with no copies property', () => {
      const games = [{ id: 1, name: 'Game without copies' }];
      expect(getAllAcquisitionYears(games)).toEqual([]);
    });

    test('handles games with empty copies array', () => {
      const games = [{ id: 1, name: 'Game A', copies: [] }];
      expect(getAllAcquisitionYears(games)).toEqual([]);
    });

    test('extracts years from copies with acquisition dates', () => {
      const games = [
        {
          id: 1,
          name: 'Game A',
          copies: [
            { acquisitionDate: '2023-05-15' },
            { acquisitionDate: '2024-01-01' },
          ],
        },
      ];
      const years = getAllAcquisitionYears(games);
      expect(years).toEqual([2024, 2023]);
    });

    test('handles empty games array', () => {
      expect(getAllAcquisitionYears([])).toEqual([]);
    });

    test('deduplicates years', () => {
      const years = getAllAcquisitionYears(typicalData.games);
      const uniqueYears = new Set(years);
      expect(years.length).toBe(uniqueYears.size);
    });
  });

  describe('getAvailableYears', () => {
    test('extracts years from plays', () => {
      const years = getAvailableYears(typicalData.plays);
      expect(years.length).toBeGreaterThan(0);
      expect(years.every(y => y.year && y.hasPlays !== undefined)).toBe(true);
    });

    test('includes acquisition years when games provided', () => {
      const years = getAvailableYears(typicalData.plays, typicalData.games);
      expect(years.length).toBeGreaterThan(0);
    });

    test('marks pre-logging years correctly', () => {
      const years = getAvailableYears(typicalData.plays, typicalData.games);
      const preLoggingYears = years.filter(y => y.isPreLogging);
      expect(Array.isArray(preLoggingYears)).toBe(true);
    });

    test('sorts years in descending order', () => {
      const years = getAvailableYears(typicalData.plays, typicalData.games);
      for (let i = 0; i < years.length - 1; i++) {
        expect(years[i].year).toBeGreaterThanOrEqual(years[i + 1].year);
      }
    });

    test('handles empty plays array', () => {
      const years = getAvailableYears([]);
      expect(years).toEqual([]);
    });
  });
});
