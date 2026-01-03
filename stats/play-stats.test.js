import { describe, test, expect } from 'vitest';
import {
  getTotalPlays,
  getTotalDaysPlayed,
  getDailySessionStats,
  getTotalGamesPlayed,
  getTotalPlayTime,
  getPlayTimeByGame,
  getDaysPlayedByGame,
  getTopGamesByMetric,
  getTopNewToMeGames,
  getTopReturningGames,
} from './play-stats.js';
import { processData } from '../scripts/transform-game-data.js';
import minimalFixture from '../tests/fixtures/minimal.json';
import typicalFixture from '../tests/fixtures/typical.json';
import durationMissingFixture from '../tests/fixtures/duration-missing.json';

const minimalData = processData(minimalFixture);
const typicalData = processData(typicalFixture);
const durationData = processData(durationMissingFixture);

describe('getTotalPlays', () => {
  test('counts all plays without year filter', () => {
    const total = getTotalPlays(typicalData.plays);
    expect(total).toBe(typicalData.plays.length);
  });

  test('filters plays by year', () => {
    const total2023 = getTotalPlays(typicalData.plays, 2023);
    const total2024 = getTotalPlays(typicalData.plays, 2024);
    expect(total2023).toBeGreaterThan(0);
    expect(total2024).toBeGreaterThan(0);
    expect(total2023 + total2024).toBeLessThan(typicalData.plays.length);
  });

  test('returns 0 for empty plays array', () => {
    expect(getTotalPlays([])).toBe(0);
  });

  test('returns 0 for year with no plays', () => {
    expect(getTotalPlays(typicalData.plays, 2000)).toBe(0);
  });
});

describe('getTotalDaysPlayed', () => {
  test('counts unique days without year filter', () => {
    const total = getTotalDaysPlayed(typicalData.plays);
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThanOrEqual(typicalData.plays.length);
  });

  test('filters days by year', () => {
    const total2023 = getTotalDaysPlayed(typicalData.plays, 2023);
    expect(total2023).toBeGreaterThan(0);
  });

  test('returns 0 for empty plays array', () => {
    expect(getTotalDaysPlayed([])).toBe(0);
  });

  test('deduplicates plays on same day', () => {
    const total = getTotalDaysPlayed(minimalData.plays);
    expect(total).toBeLessThanOrEqual(minimalData.plays.length);
  });
});

describe('getDailySessionStats', () => {
  test('calculates median and average without year filter', () => {
    const result = getDailySessionStats(typicalData.plays, null);
    expect(result.medianMinutes).toBeGreaterThan(0);
    expect(result.averageMinutes).toBeGreaterThan(0);
  });

  test('filters by year correctly', () => {
    const result2023 = getDailySessionStats(typicalData.plays, 2023);
    expect(result2023.medianMinutes).toBeGreaterThan(0);
    expect(result2023.averageMinutes).toBeGreaterThan(0);
  });

  test('returns null for empty plays array', () => {
    const result = getDailySessionStats([], null);
    expect(result.medianMinutes).toBeNull();
    expect(result.averageMinutes).toBeNull();
  });

  test('excludes days with zero total duration', () => {
    const testPlays = [
      { date: '2023-01-01', durationMin: 60 },
      { date: '2023-01-02', durationMin: 0 },
      { date: '2023-01-03', durationMin: 120 },
    ];
    const result = getDailySessionStats(testPlays, null);
    expect(result.medianMinutes).toBe(90);
    expect(result.averageMinutes).toBe(90);
  });

  test('calculates median correctly for odd number of days', () => {
    const testPlays = [
      { date: '2023-01-01', durationMin: 60 },
      { date: '2023-01-02', durationMin: 120 },
      { date: '2023-01-03', durationMin: 180 },
    ];
    const result = getDailySessionStats(testPlays, null);
    expect(result.medianMinutes).toBe(120);
  });

  test('calculates median correctly for even number of days', () => {
    const testPlays = [
      { date: '2023-01-01', durationMin: 60 },
      { date: '2023-01-02', durationMin: 120 },
      { date: '2023-01-03', durationMin: 180 },
      { date: '2023-01-04', durationMin: 240 },
    ];
    const result = getDailySessionStats(testPlays, null);
    expect(result.medianMinutes).toBe(150);
  });

  test('sums multiple plays on same day', () => {
    const testPlays = [
      { date: '2023-01-01', durationMin: 60 },
      { date: '2023-01-01', durationMin: 60 },
      { date: '2023-01-02', durationMin: 120 },
    ];
    const result = getDailySessionStats(testPlays, null);
    expect(result.medianMinutes).toBe(120);
    expect(result.averageMinutes).toBe(120);
  });

  test('returns minutes directly', () => {
    const testPlays = [{ date: '2023-01-01', durationMin: 90 }];
    const result = getDailySessionStats(testPlays, null);
    expect(result.medianMinutes).toBe(90);
    expect(result.averageMinutes).toBe(90);
  });
});

describe('getTotalGamesPlayed', () => {
  test('counts unique games played without year filter', () => {
    const result = getTotalGamesPlayed(typicalData.games, typicalData.plays);
    expect(result.total).toBeGreaterThan(0);
    expect(result.newToMe).toBeNull();
  });

  test('counts new-to-me games with year filter', () => {
    const result2023 = getTotalGamesPlayed(typicalData.games, typicalData.plays, 2023);
    expect(result2023.total).toBeGreaterThan(0);
    expect(result2023.newToMe).toBeGreaterThanOrEqual(0);
  });

  test('returns 0 for empty plays array', () => {
    const result = getTotalGamesPlayed(typicalData.games, []);
    expect(result.total).toBe(0);
    expect(result.newToMe).toBeNull();
  });

  test('identifies first play dates correctly', () => {
    const result2024 = getTotalGamesPlayed(typicalData.games, typicalData.plays, 2024);
    expect(result2024.newToMe).toBeGreaterThanOrEqual(0);
  });

  test('handles out-of-order plays when determining first play date', () => {
    // Plays are intentionally not in chronological order
    const plays = [
      { gameId: 1, date: '2024-06-15', durationMin: 60, copyId: 1 },
      { gameId: 1, date: '2024-01-01', durationMin: 60, copyId: 1 }, // Earlier date, processed later
      { gameId: 1, date: '2024-03-15', durationMin: 60, copyId: 1 },
    ];
    const games = [{ id: 1, name: 'Test Game' }];
    const result = getTotalGamesPlayed(games, plays, 2024);
    // Game should be counted as new-to-me in 2024 based on earliest date (Jan 1)
    expect(result.total).toBe(1);
    expect(result.newToMe).toBe(1);
  });

  test('handles plays referencing non-existent games', () => {
    const plays = [
      { gameId: 1, date: '2024-01-01', durationMin: 60, copyId: 1 },
      { gameId: 999, date: '2024-01-01', durationMin: 60, copyId: null }, // Non-existent game
    ];
    const games = [{ id: 1, name: 'Test Game' }];
    const result = getTotalGamesPlayed(games, plays);
    // Should only count games that exist
    expect(result.myGames).toBe(1);
  });
});

describe('getTotalPlayTime', () => {
  test('calculates total play time correctly', () => {
    const result = getTotalPlayTime(durationData.plays);
    expect(result).toHaveProperty('totalMinutes');
    expect(result).toHaveProperty('totalHours');
    expect(result).toHaveProperty('playsWithActualDuration');
    expect(result).toHaveProperty('playsWithEstimatedDuration');
    expect(result).toHaveProperty('totalPlays');
  });

  test('converts minutes to hours correctly', () => {
    const result = getTotalPlayTime(durationData.plays);
    expect(result.totalHours).toBe(result.totalMinutes / 60);
  });

  test('distinguishes between actual and estimated durations', () => {
    const playsWithEstimated = durationData.plays.map(p => ({
      ...p,
      durationEstimated: p.durationMin === 0,
    }));
    const result = getTotalPlayTime(playsWithEstimated);
    expect(result.playsWithActualDuration + result.playsWithEstimatedDuration).toBe(result.totalPlays);
  });

  test('counts estimated durations from processData', () => {
    const result = getTotalPlayTime(durationData.plays);
    const estimatedPlays = durationData.plays.filter(p => p.durationEstimated);
    expect(estimatedPlays.length).toBeGreaterThan(0);
    expect(result.playsWithEstimatedDuration).toBe(estimatedPlays.length);
  });

  test('filters by year', () => {
    const result2024 = getTotalPlayTime(durationData.plays, 2024);
    expect(result2024.totalPlays).toBeGreaterThanOrEqual(0);
  });

  test('excludes plays outside specified year', () => {
    const plays = [
      { date: '2023-01-01', durationMin: 60, durationEstimated: false },
      { date: '2024-01-01', durationMin: 120, durationEstimated: false },
      { date: '2024-01-02', durationMin: 90, durationEstimated: true },
    ];
    const result2024 = getTotalPlayTime(plays, 2024);
    expect(result2024.totalPlays).toBe(2);
    expect(result2024.totalMinutes).toBe(210); // 120 + 90
    expect(result2024.playsWithActualDuration).toBe(1);
    expect(result2024.playsWithEstimatedDuration).toBe(1);
  });

  test('returns zeros for empty plays', () => {
    const result = getTotalPlayTime([]);
    expect(result.totalMinutes).toBe(0);
    expect(result.totalHours).toBe(0);
    expect(result.totalPlays).toBe(0);
  });
});

describe('getPlayTimeByGame', () => {
  test('returns play time breakdown by game', () => {
    const breakdown = getPlayTimeByGame(durationData.games, durationData.plays);
    expect(breakdown.length).toBeGreaterThan(0);
    expect(breakdown[0]).toHaveProperty('game');
    expect(breakdown[0]).toHaveProperty('totalMinutes');
    expect(breakdown[0]).toHaveProperty('totalHours');
    expect(breakdown[0]).toHaveProperty('playCount');
  });

  test('calculates min, max, median, avg correctly', () => {
    const breakdown = getPlayTimeByGame(durationData.games, durationData.plays);
    const gameWithDuration = breakdown.find(b => b.minMinutes !== null);
    if (gameWithDuration) {
      expect(gameWithDuration.minMinutes).toBeLessThanOrEqual(gameWithDuration.maxMinutes);
      expect(gameWithDuration.medianMinutes).toBeGreaterThanOrEqual(gameWithDuration.minMinutes);
      expect(gameWithDuration.medianMinutes).toBeLessThanOrEqual(gameWithDuration.maxMinutes);
    }
  });

  test('handles even number of durations for median', () => {
    const breakdown = getPlayTimeByGame(durationData.games, durationData.plays);
    const gameWithEvenPlays = breakdown.find(b => b.playCount % 2 === 0 && b.minMinutes !== null);
    if (gameWithEvenPlays) {
      expect(gameWithEvenPlays.medianMinutes).toBeDefined();
    }
  });

  test('handles odd number of durations for median', () => {
    const breakdown = getPlayTimeByGame(durationData.games, durationData.plays);
    const gameWithOddPlays = breakdown.find(b => b.playCount % 2 === 1 && b.minMinutes !== null);
    if (gameWithOddPlays) {
      expect(gameWithOddPlays.medianMinutes).toBeDefined();
    }
  });

  test('sorts by total minutes descending', () => {
    const breakdown = getPlayTimeByGame(durationData.games, durationData.plays);
    for (let i = 0; i < breakdown.length - 1; i++) {
      expect(breakdown[i].totalMinutes).toBeGreaterThanOrEqual(breakdown[i + 1].totalMinutes);
    }
  });

  test('filters by year', () => {
    const breakdown2024 = getPlayTimeByGame(durationData.games, durationData.plays, 2024);
    expect(Array.isArray(breakdown2024)).toBe(true);
  });

  test('handles games with no duration data', () => {
    const breakdown = getPlayTimeByGame(durationData.games, durationData.plays);
    const gameWithNoDuration = breakdown.find(b => b.totalMinutes === 0);
    if (gameWithNoDuration) {
      expect(gameWithNoDuration.minMinutes).toBeNull();
      expect(gameWithNoDuration.maxMinutes).toBeNull();
      expect(gameWithNoDuration.medianMinutes).toBeNull();
      expect(gameWithNoDuration.avgMinutes).toBeNull();
    }
  });
});

describe('getDaysPlayedByGame', () => {
  test('calculates unique days played for each game', () => {
    const testGames = [
      { id: 1, name: 'Game 1' },
      { id: 2, name: 'Game 2' },
    ];
    const testPlays = [
      { gameId: 1, date: '2020-01-01', durationMin: 60 },
      { gameId: 1, date: '2020-01-01', durationMin: 30 },
      { gameId: 1, date: '2020-01-02', durationMin: 90 },
      { gameId: 2, date: '2020-01-01', durationMin: 120 },
    ];
    const result = getDaysPlayedByGame(testGames, testPlays);
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
      { gameId: 1, date: '2020-01-03', durationMin: 90 },
    ];
    const result = getDaysPlayedByGame(testGames, testPlays);
    expect(result.length).toBe(1);
    expect(result[0].minMinutes).toBe(60);
    expect(result[0].maxMinutes).toBe(120);
    expect(result[0].medianMinutes).toBe(90);
    expect(result[0].avgMinutes).toBe(90);
  });

  test('sums minutes for multiple plays on same day', () => {
    const testGames = [{ id: 1, name: 'Game 1' }];
    const testPlays = [
      { gameId: 1, date: '2020-01-01', durationMin: 60 },
      { gameId: 1, date: '2020-01-01', durationMin: 30 },
      { gameId: 1, date: '2020-01-01', durationMin: 30 },
    ];
    const result = getDaysPlayedByGame(testGames, testPlays);
    expect(result[0].uniqueDays).toBe(1);
    expect(result[0].minMinutes).toBe(120);
    expect(result[0].maxMinutes).toBe(120);
  });

  test('calculates median and avg plays per day', () => {
    const testGames = [{ id: 1, name: 'Game 1' }];
    const testPlays = [
      { gameId: 1, date: '2020-01-01', durationMin: 60 },
      { gameId: 1, date: '2020-01-01', durationMin: 60 },
      { gameId: 1, date: '2020-01-02', durationMin: 60 },
      { gameId: 1, date: '2020-01-02', durationMin: 60 },
      { gameId: 1, date: '2020-01-02', durationMin: 60 },
      { gameId: 1, date: '2020-01-03', durationMin: 60 },
    ];
    const result = getDaysPlayedByGame(testGames, testPlays);
    expect(result[0].medianPlays).toBe(2);
    expect(result[0].avgPlays).toBe(2);
  });

  test('filters by year when provided', () => {
    const testGames = [{ id: 1, name: 'Game 1' }];
    const testPlays = [
      { gameId: 1, date: '2020-01-01', durationMin: 60 },
      { gameId: 1, date: '2020-01-02', durationMin: 60 },
      { gameId: 1, date: '2021-01-01', durationMin: 60 },
    ];
    const result = getDaysPlayedByGame(testGames, testPlays, 2020);
    expect(result[0].uniqueDays).toBe(2);
  });

  test('sorts by unique days descending', () => {
    const testGames = [
      { id: 1, name: 'Game 1' },
      { id: 2, name: 'Game 2' },
    ];
    const testPlays = [
      { gameId: 1, date: '2020-01-01', durationMin: 60 },
      { gameId: 2, date: '2020-01-01', durationMin: 60 },
      { gameId: 2, date: '2020-01-02', durationMin: 60 },
      { gameId: 2, date: '2020-01-03', durationMin: 60 },
    ];
    const result = getDaysPlayedByGame(testGames, testPlays);
    expect(result[0].game.id).toBe(2);
    expect(result[1].game.id).toBe(1);
  });

  test('ignores plays for non-existent games', () => {
    const testGames = [{ id: 1, name: 'Game 1' }];
    const testPlays = [
      { gameId: 1, date: '2020-01-01', durationMin: 60 },
      { gameId: 2, date: '2020-01-01', durationMin: 60 },
    ];
    const result = getDaysPlayedByGame(testGames, testPlays);
    expect(result.length).toBe(1);
    expect(result[0].game.id).toBe(1);
  });

  test('returns empty array for empty plays', () => {
    const testGames = [{ id: 1, name: 'Game 1' }];
    const result = getDaysPlayedByGame(testGames, []);
    expect(result).toEqual([]);
  });
});

describe('getTopGamesByMetric', () => {
  test('returns top N games by hours', () => {
    const result = getTopGamesByMetric(typicalData.games, typicalData.plays, 2024, 'hours', 3);
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
    const result = getTopGamesByMetric(typicalData.games, typicalData.plays, 2024, 'sessions', 3);
    expect(result.length).toBeLessThanOrEqual(3);
    result.forEach(item => {
      expect(item.value).toBe(item.sessions);
    });
  });

  test('returns top N games by plays', () => {
    const result = getTopGamesByMetric(typicalData.games, typicalData.plays, 2024, 'plays', 3);
    expect(result.length).toBeLessThanOrEqual(3);
    result.forEach(item => {
      expect(item.value).toBe(item.plays);
    });
  });

  test('sorts by metric value descending', () => {
    const result = getTopGamesByMetric(typicalData.games, typicalData.plays, 2024, 'hours', 3);
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].value).toBeGreaterThanOrEqual(result[i].value);
    }
  });

  test('limits results to specified count', () => {
    const result = getTopGamesByMetric(typicalData.games, typicalData.plays, 2024, 'hours', 2);
    expect(result.length).toBeLessThanOrEqual(2);
  });

  test('returns empty array when no plays in year', () => {
    const result = getTopGamesByMetric(typicalData.games, typicalData.plays, 1900, 'hours', 3);
    expect(result).toEqual([]);
  });

  test('secondary sort uses hours then sessions then plays', () => {
    const result = getTopGamesByMetric(typicalData.games, typicalData.plays, 2024, 'hours', 10);
    for (let i = 1; i < result.length; i++) {
      const prev = result[i - 1];
      const curr = result[i];
      if (prev.value === curr.value) {
        expect(
          prev.hours >= curr.hours ||
            (prev.hours === curr.hours && prev.sessions >= curr.sessions) ||
            (prev.hours === curr.hours && prev.sessions === curr.sessions && prev.plays >= curr.plays)
        ).toBe(true);
      }
    }
  });

  test('tiebreaker sort falls through hours to sessions to plays', () => {
    const games = [
      { id: 1, name: 'Game A' },
      { id: 2, name: 'Game B' },
      { id: 3, name: 'Game C' },
    ];
    const plays = [
      { gameId: 1, date: '2024-01-01', durationMin: 60 },
      { gameId: 2, date: '2024-01-01', durationMin: 60 },
      { gameId: 3, date: '2024-01-01', durationMin: 60 },
      { gameId: 3, date: '2024-01-01', durationMin: 0 },
      { gameId: 3, date: '2024-01-01', durationMin: 0 },
    ];

    const result = getTopGamesByMetric(games, plays, 2024, 'hours', 3);

    expect(result[0].game.id).toBe(3);
    expect(result[0].plays).toBe(3);
    expect(result[1].plays).toBe(1);
    expect(result[2].plays).toBe(1);
  });

  test('tiebreaker sort handles sessions tiebreaker when hours tie', () => {
    const games = [
      { id: 1, name: 'Game A' },
      { id: 2, name: 'Game B' },
    ];
    const plays = [
      { gameId: 1, date: '2024-01-01', durationMin: 60 },
      { gameId: 2, date: '2024-01-01', durationMin: 30 },
      { gameId: 2, date: '2024-01-02', durationMin: 30 },
    ];

    const result = getTopGamesByMetric(games, plays, 2024, 'hours', 2);

    expect(result[0].game.id).toBe(2);
    expect(result[0].sessions).toBe(2);
    expect(result[1].game.id).toBe(1);
    expect(result[1].sessions).toBe(1);
  });

  test('ignores plays for games not in games array', () => {
    const games = [{ id: 1, name: 'Game A' }];
    const plays = [
      { gameId: 1, date: '2024-01-01', durationMin: 60 },
      { gameId: 999, date: '2024-01-01', durationMin: 120 },
    ];

    const result = getTopGamesByMetric(games, plays, 2024, 'hours', 3);

    expect(result.length).toBe(1);
    expect(result[0].game.id).toBe(1);
  });

  test('defaults to limit of 3 when not specified', () => {
    const games = [
      { id: 1, name: 'Game A' },
      { id: 2, name: 'Game B' },
      { id: 3, name: 'Game C' },
      { id: 4, name: 'Game D' },
    ];
    const plays = [
      { gameId: 1, date: '2024-01-01', durationMin: 60 },
      { gameId: 2, date: '2024-01-01', durationMin: 50 },
      { gameId: 3, date: '2024-01-01', durationMin: 40 },
      { gameId: 4, date: '2024-01-01', durationMin: 30 },
    ];

    const result = getTopGamesByMetric(games, plays, 2024, 'hours');

    expect(result.length).toBe(3);
  });

  test('handles games with zero duration (fallback to 0 in maps)', () => {
    const games = [
      { id: 1, name: 'Game A' },
      { id: 2, name: 'Game B' },
    ];
    const plays = [
      { gameId: 1, date: '2024-01-01', durationMin: 60 },
      { gameId: 2, date: '2024-01-01', durationMin: 0 },
    ];
    const result = getTopGamesByMetric(games, plays, 2024, 'plays', 2);
    expect(result.length).toBe(2);
    const game2 = result.find(r => r.game.id === 2);
    expect(game2.hours).toBe(0);
    expect(game2.plays).toBe(1);
  });

  test('tiebreaker uses sessions when value and hours tie', () => {
    const games = [
      { id: 1, name: 'Game A' },
      { id: 2, name: 'Game B' },
    ];
    const plays = [
      // Game A: 2 plays, 60 minutes, 1 session
      { gameId: 1, date: '2024-01-01', durationMin: 30 },
      { gameId: 1, date: '2024-01-01', durationMin: 30 },
      // Game B: 2 plays, 60 minutes, 2 sessions - should win on sessions
      { gameId: 2, date: '2024-02-01', durationMin: 30 },
      { gameId: 2, date: '2024-02-02', durationMin: 30 },
    ];
    const result = getTopGamesByMetric(games, plays, 2024, 'plays', 2);
    expect(result[0].game.id).toBe(2);
    expect(result[0].sessions).toBe(2);
  });
});

describe('getTopNewToMeGames', () => {
  test('returns empty array when year is null', () => {
    const result = getTopNewToMeGames(typicalData.games, typicalData.plays, null, 'sessions', 2);
    expect(result).toEqual([]);
  });

  test('returns empty array when no new-to-me games exist', () => {
    const games = [{ id: 1, name: 'Game A' }];
    const plays = [
      { gameId: 1, date: '2023-01-01', durationMin: 60 },
      { gameId: 1, date: '2024-01-01', durationMin: 60 },
    ];
    const result = getTopNewToMeGames(games, plays, 2024, 'sessions', 2);
    expect(result).toEqual([]);
  });

  test('returns top N new-to-me games by sessions', () => {
    const games = [
      { id: 1, name: 'Game A' },
      { id: 2, name: 'Game B' },
      { id: 3, name: 'Game C' },
    ];
    const plays = [
      { gameId: 1, date: '2024-01-01', durationMin: 60 },
      { gameId: 1, date: '2024-01-02', durationMin: 60 },
      { gameId: 1, date: '2024-01-03', durationMin: 60 },
      { gameId: 2, date: '2024-01-01', durationMin: 120 },
      { gameId: 2, date: '2024-01-02', durationMin: 120 },
      { gameId: 3, date: '2024-01-01', durationMin: 30 },
    ];
    const result = getTopNewToMeGames(games, plays, 2024, 'sessions', 2);
    expect(result).toHaveLength(2);
    expect(result[0].game.name).toBe('Game A');
    expect(result[0].sessions).toBe(3);
    expect(result[1].game.name).toBe('Game B');
    expect(result[1].sessions).toBe(2);
  });

  test('returns top N new-to-me games by hours', () => {
    const games = [
      { id: 1, name: 'Game A' },
      { id: 2, name: 'Game B' },
      { id: 3, name: 'Game C' },
    ];
    const plays = [
      { gameId: 1, date: '2024-01-01', durationMin: 60 },
      { gameId: 1, date: '2024-01-02', durationMin: 60 },
      { gameId: 2, date: '2024-01-01', durationMin: 180 },
      { gameId: 3, date: '2024-01-01', durationMin: 90 },
    ];
    const result = getTopNewToMeGames(games, plays, 2024, 'hours', 2);
    expect(result).toHaveLength(2);
    expect(result[0].game.name).toBe('Game B');
    expect(result[0].hours).toBe(180);
    expect(result[1].game.name).toBe('Game A');
    expect(result[1].hours).toBe(120);
  });

  test('returns top N new-to-me games by plays', () => {
    const games = [
      { id: 1, name: 'Game A' },
      { id: 2, name: 'Game B' },
    ];
    const plays = [
      { gameId: 1, date: '2024-01-01', durationMin: 30 },
      { gameId: 1, date: '2024-01-01', durationMin: 30 },
      { gameId: 1, date: '2024-01-01', durationMin: 30 },
      { gameId: 2, date: '2024-01-01', durationMin: 60 },
    ];
    const result = getTopNewToMeGames(games, plays, 2024, 'plays', 2);
    expect(result).toHaveLength(2);
    expect(result[0].game.name).toBe('Game A');
    expect(result[0].plays).toBe(3);
    expect(result[1].game.name).toBe('Game B');
    expect(result[1].plays).toBe(1);
  });

  test('returns fewer than count if not enough games exist', () => {
    const games = [{ id: 1, name: 'Game A' }];
    const plays = [{ gameId: 1, date: '2024-01-01', durationMin: 60 }];
    const result = getTopNewToMeGames(games, plays, 2024, 'sessions', 5);
    expect(result).toHaveLength(1);
  });

  test('excludes games first played before the year', () => {
    const games = [
      { id: 1, name: 'Old Game' },
      { id: 2, name: 'New Game' },
    ];
    const plays = [
      { gameId: 1, date: '2023-01-01', durationMin: 60 },
      { gameId: 1, date: '2024-01-01', durationMin: 60 },
      { gameId: 2, date: '2024-01-01', durationMin: 60 },
    ];
    const result = getTopNewToMeGames(games, plays, 2024, 'sessions', 2);
    expect(result).toHaveLength(1);
    expect(result[0].game.name).toBe('New Game');
  });

  test('uses plays as final tiebreaker when value, hours, and sessions are equal', () => {
    const games = [
      { id: 1, name: 'Game A' },
      { id: 2, name: 'Game B' },
    ];
    const plays = [
      // Both games: same sessions (1), same hours (60 min), but different plays
      { gameId: 1, date: '2024-01-01', durationMin: 30 },
      { gameId: 1, date: '2024-01-01', durationMin: 30 },
      { gameId: 2, date: '2024-01-01', durationMin: 60 },
    ];
    const result = getTopNewToMeGames(games, plays, 2024, 'sessions', 2);
    expect(result).toHaveLength(2);
    // Game A has 2 plays, Game B has 1 play - Game A should be first
    expect(result[0].game.name).toBe('Game A');
    expect(result[0].plays).toBe(2);
    expect(result[1].game.name).toBe('Game B');
    expect(result[1].plays).toBe(1);
  });

  test('updates first play date when earlier play is found later in array', () => {
    const games = [{ id: 1, name: 'Game A' }];
    const plays = [
      // Later play comes first in array
      { gameId: 1, date: '2024-06-01', durationMin: 60 },
      // Earlier play comes second - should update first play date to Jan
      { gameId: 1, date: '2024-01-01', durationMin: 60 },
    ];
    const result = getTopNewToMeGames(games, plays, 2024, 'sessions', 1);
    expect(result).toHaveLength(1);
    expect(result[0].game.name).toBe('Game A');
  });

  test('uses sessions tiebreaker when value and hours are equal', () => {
    const games = [
      { id: 1, name: 'Game A' },
      { id: 2, name: 'Game B' },
    ];
    const plays = [
      // Game A: 60 min total across 2 sessions
      { gameId: 1, date: '2024-01-01', durationMin: 30 },
      { gameId: 1, date: '2024-01-02', durationMin: 30 },
      // Game B: 60 min total in 1 session
      { gameId: 2, date: '2024-01-01', durationMin: 60 },
    ];
    // Sort by hours - both have 60 min, so sessions is tiebreaker
    const result = getTopNewToMeGames(games, plays, 2024, 'hours', 2);
    expect(result).toHaveLength(2);
    expect(result[0].game.name).toBe('Game A'); // 2 sessions
    expect(result[1].game.name).toBe('Game B'); // 1 session
  });

  test('uses hours tiebreaker when value is equal but hours differ', () => {
    const games = [
      { id: 1, name: 'Game A' },
      { id: 2, name: 'Game B' },
    ];
    const plays = [
      // Game A: 2 sessions, 120 min total
      { gameId: 1, date: '2024-01-01', durationMin: 60 },
      { gameId: 1, date: '2024-01-02', durationMin: 60 },
      // Game B: 2 sessions, 60 min total
      { gameId: 2, date: '2024-01-01', durationMin: 30 },
      { gameId: 2, date: '2024-01-02', durationMin: 30 },
    ];
    // Sort by sessions - both have 2 sessions, so hours is tiebreaker
    const result = getTopNewToMeGames(games, plays, 2024, 'sessions', 2);
    expect(result).toHaveLength(2);
    expect(result[0].game.name).toBe('Game A'); // 120 min
    expect(result[1].game.name).toBe('Game B'); // 60 min
  });

  test('ignores plays with non-existent game IDs', () => {
    const games = [{ id: 1, name: 'Game A' }];
    const plays = [
      { gameId: 1, date: '2024-01-01', durationMin: 60 },
      { gameId: 999, date: '2024-01-01', durationMin: 60 }, // Non-existent game
    ];
    const result = getTopNewToMeGames(games, plays, 2024, 'sessions', 2);
    expect(result).toHaveLength(1);
    expect(result[0].game.name).toBe('Game A');
  });

  test('returns empty array when plays exist but games array is empty', () => {
    const games = [];
    const plays = [{ gameId: 1, date: '2024-01-01', durationMin: 60 }];
    const result = getTopNewToMeGames(games, plays, 2024, 'sessions', 2);
    expect(result).toEqual([]);
  });
});

describe('getTopReturningGames', () => {
  test('returns empty array when year is null', () => {
    const result = getTopReturningGames(typicalData.games, typicalData.plays, null, 'sessions', 2);
    expect(result).toEqual([]);
  });

  test('returns empty array when no returning games exist', () => {
    const games = [{ id: 1, name: 'Game A' }];
    const plays = [
      { gameId: 1, date: '2024-01-01', durationMin: 60 },
    ];
    const result = getTopReturningGames(games, plays, 2024, 'sessions', 2);
    expect(result).toEqual([]);
  });

  test('returns top N returning games by sessions', () => {
    const games = [
      { id: 1, name: 'Game A' },
      { id: 2, name: 'Game B' },
      { id: 3, name: 'Game C' },
    ];
    const plays = [
      { gameId: 1, date: '2023-01-01', durationMin: 60 },
      { gameId: 1, date: '2024-01-01', durationMin: 60 },
      { gameId: 1, date: '2024-01-02', durationMin: 60 },
      { gameId: 1, date: '2024-01-03', durationMin: 60 },
      { gameId: 2, date: '2023-01-01', durationMin: 60 },
      { gameId: 2, date: '2024-01-01', durationMin: 120 },
      { gameId: 2, date: '2024-01-02', durationMin: 120 },
      { gameId: 3, date: '2023-01-01', durationMin: 60 },
      { gameId: 3, date: '2024-01-01', durationMin: 30 },
    ];
    const result = getTopReturningGames(games, plays, 2024, 'sessions', 2);
    expect(result).toHaveLength(2);
    expect(result[0].game.name).toBe('Game A');
    expect(result[0].sessions).toBe(3);
    expect(result[1].game.name).toBe('Game B');
    expect(result[1].sessions).toBe(2);
  });

  test('returns top N returning games by hours', () => {
    const games = [
      { id: 1, name: 'Game A' },
      { id: 2, name: 'Game B' },
      { id: 3, name: 'Game C' },
    ];
    const plays = [
      { gameId: 1, date: '2023-01-01', durationMin: 60 },
      { gameId: 1, date: '2024-01-01', durationMin: 60 },
      { gameId: 1, date: '2024-01-02', durationMin: 60 },
      { gameId: 2, date: '2023-01-01', durationMin: 60 },
      { gameId: 2, date: '2024-01-01', durationMin: 180 },
      { gameId: 3, date: '2023-01-01', durationMin: 60 },
      { gameId: 3, date: '2024-01-01', durationMin: 90 },
    ];
    const result = getTopReturningGames(games, plays, 2024, 'hours', 2);
    expect(result).toHaveLength(2);
    expect(result[0].game.name).toBe('Game B');
    expect(result[0].hours).toBe(180);
    expect(result[1].game.name).toBe('Game A');
    expect(result[1].hours).toBe(120);
  });

  test('returns top N returning games by plays', () => {
    const games = [
      { id: 1, name: 'Game A' },
      { id: 2, name: 'Game B' },
    ];
    const plays = [
      { gameId: 1, date: '2023-01-01', durationMin: 60 },
      { gameId: 1, date: '2024-01-01', durationMin: 30 },
      { gameId: 1, date: '2024-01-01', durationMin: 30 },
      { gameId: 1, date: '2024-01-01', durationMin: 30 },
      { gameId: 2, date: '2023-01-01', durationMin: 60 },
      { gameId: 2, date: '2024-01-01', durationMin: 60 },
    ];
    const result = getTopReturningGames(games, plays, 2024, 'plays', 2);
    expect(result).toHaveLength(2);
    expect(result[0].game.name).toBe('Game A');
    expect(result[0].plays).toBe(3);
    expect(result[1].game.name).toBe('Game B');
    expect(result[1].plays).toBe(1);
  });

  test('returns fewer than count if not enough games exist', () => {
    const games = [{ id: 1, name: 'Game A' }];
    const plays = [
      { gameId: 1, date: '2023-01-01', durationMin: 60 },
      { gameId: 1, date: '2024-01-01', durationMin: 60 },
    ];
    const result = getTopReturningGames(games, plays, 2024, 'sessions', 5);
    expect(result).toHaveLength(1);
  });

  test('excludes games first played in the year (new-to-me games)', () => {
    const games = [
      { id: 1, name: 'Old Game' },
      { id: 2, name: 'New Game' },
    ];
    const plays = [
      { gameId: 1, date: '2023-01-01', durationMin: 60 },
      { gameId: 1, date: '2024-01-01', durationMin: 60 },
      { gameId: 2, date: '2024-01-01', durationMin: 120 },
    ];
    const result = getTopReturningGames(games, plays, 2024, 'sessions', 2);
    expect(result).toHaveLength(1);
    expect(result[0].game.name).toBe('Old Game');
  });

  test('excludes returning games not played in the year', () => {
    const games = [
      { id: 1, name: 'Played This Year' },
      { id: 2, name: 'Not Played This Year' },
    ];
    const plays = [
      { gameId: 1, date: '2023-01-01', durationMin: 60 },
      { gameId: 1, date: '2024-01-01', durationMin: 60 },
      { gameId: 2, date: '2023-01-01', durationMin: 60 },
    ];
    const result = getTopReturningGames(games, plays, 2024, 'sessions', 2);
    expect(result).toHaveLength(1);
    expect(result[0].game.name).toBe('Played This Year');
  });

  test('updates first play date when earlier play is found later in array', () => {
    const games = [{ id: 1, name: 'Game A' }];
    const plays = [
      // Later play comes first in array
      { gameId: 1, date: '2023-06-01', durationMin: 60 },
      // Earlier play comes second - should update first play date
      { gameId: 1, date: '2023-01-01', durationMin: 60 },
      { gameId: 1, date: '2024-01-01', durationMin: 60 },
    ];
    const result = getTopReturningGames(games, plays, 2024, 'sessions', 1);
    expect(result).toHaveLength(1);
    expect(result[0].game.name).toBe('Game A');
  });

  test('uses tiebreakers (hours, sessions, plays) when primary metric is equal', () => {
    const games = [
      { id: 1, name: 'Game A' },
      { id: 2, name: 'Game B' },
      { id: 3, name: 'Game C' },
    ];
    const plays = [
      // Game A: 1 session (value), 60 min (hours), 1 session, 2 plays
      { gameId: 1, date: '2023-01-01', durationMin: 60 },
      { gameId: 1, date: '2024-01-01', durationMin: 30 },
      { gameId: 1, date: '2024-01-01', durationMin: 30 },
      // Game B: 1 session (value), 60 min (hours), 1 session, 1 play
      { gameId: 2, date: '2023-01-01', durationMin: 60 },
      { gameId: 2, date: '2024-01-01', durationMin: 60 },
      // Game C: 1 session (value), 30 min (hours) - should be last
      { gameId: 3, date: '2023-01-01', durationMin: 60 },
      { gameId: 3, date: '2024-01-01', durationMin: 30 },
    ];
    const result = getTopReturningGames(games, plays, 2024, 'sessions', 3);
    expect(result).toHaveLength(3);
    // All have same sessions (1), so sorted by hours (A=60, B=60, C=30)
    // A and B tied on hours, so sorted by sessions (both 1), then plays (A=2, B=1)
    expect(result[0].game.name).toBe('Game A');
    expect(result[1].game.name).toBe('Game B');
    expect(result[2].game.name).toBe('Game C');
  });

  test('uses sessions tiebreaker when value and hours are equal', () => {
    const games = [
      { id: 1, name: 'Game A' },
      { id: 2, name: 'Game B' },
    ];
    const plays = [
      // Game A: first played 2023, 60 min total in 2024 across 2 sessions
      { gameId: 1, date: '2023-01-01', durationMin: 60 },
      { gameId: 1, date: '2024-01-01', durationMin: 30 },
      { gameId: 1, date: '2024-01-02', durationMin: 30 },
      // Game B: first played 2023, 60 min total in 2024 in 1 session
      { gameId: 2, date: '2023-01-01', durationMin: 60 },
      { gameId: 2, date: '2024-01-01', durationMin: 60 },
    ];
    // Sort by hours - both have 60 min, so sessions is tiebreaker
    const result = getTopReturningGames(games, plays, 2024, 'hours', 2);
    expect(result).toHaveLength(2);
    expect(result[0].game.name).toBe('Game A'); // 2 sessions
    expect(result[1].game.name).toBe('Game B'); // 1 session
  });

  test('returns empty array when returning games exist but none played in year', () => {
    const games = [{ id: 1, name: 'Game A' }];
    const plays = [
      // Game played before year but not in the year
      { gameId: 1, date: '2023-01-01', durationMin: 60 },
    ];
    const result = getTopReturningGames(games, plays, 2024, 'sessions', 2);
    expect(result).toEqual([]);
  });
});
