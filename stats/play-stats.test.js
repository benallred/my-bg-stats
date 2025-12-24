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
  getTopNewToMeGame,
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
});

describe('getTopNewToMeGame', () => {
  test('returns null when year is null', () => {
    const result = getTopNewToMeGame(typicalData.games, typicalData.plays, null, 'sessions');
    expect(result).toBeNull();
  });

  test('returns null when no new-to-me games exist', () => {
    const games = [{ id: 1, name: 'Game A' }];
    const plays = [
      { gameId: 1, date: '2023-01-01', durationMin: 60 },
      { gameId: 1, date: '2024-01-01', durationMin: 60 },
    ];
    const result = getTopNewToMeGame(games, plays, 2024, 'sessions');
    expect(result).toBeNull();
  });

  test('returns the correct game when multiple new-to-me games exist', () => {
    const games = [
      { id: 1, name: 'Game A' },
      { id: 2, name: 'Game B' },
      { id: 3, name: 'Game C' },
    ];
    const plays = [
      // Game A: first played 2023, not new to me in 2024
      { gameId: 1, date: '2023-01-01', durationMin: 60 },
      { gameId: 1, date: '2024-01-01', durationMin: 60 },
      { gameId: 1, date: '2024-01-02', durationMin: 60 },
      { gameId: 1, date: '2024-01-03', durationMin: 60 },
      // Game B: first played 2024, 3 sessions - should win
      { gameId: 2, date: '2024-02-01', durationMin: 30 },
      { gameId: 2, date: '2024-02-02', durationMin: 30 },
      { gameId: 2, date: '2024-02-03', durationMin: 30 },
      // Game C: first played 2024, 2 sessions
      { gameId: 3, date: '2024-03-01', durationMin: 120 },
      { gameId: 3, date: '2024-03-02', durationMin: 120 },
    ];
    const result = getTopNewToMeGame(games, plays, 2024, 'sessions');
    expect(result).not.toBeNull();
    expect(result.game.id).toBe(2);
    expect(result.sessions).toBe(3);
  });

  test('correctly breaks ties using secondary metrics', () => {
    const games = [
      { id: 1, name: 'Game A' },
      { id: 2, name: 'Game B' },
    ];
    const plays = [
      // Game A: 2 sessions, 60 total minutes
      { gameId: 1, date: '2024-01-01', durationMin: 30 },
      { gameId: 1, date: '2024-01-02', durationMin: 30 },
      // Game B: 2 sessions, 120 total minutes - should win on hours tiebreaker
      { gameId: 2, date: '2024-02-01', durationMin: 60 },
      { gameId: 2, date: '2024-02-02', durationMin: 60 },
    ];
    const result = getTopNewToMeGame(games, plays, 2024, 'sessions');
    expect(result).not.toBeNull();
    expect(result.game.id).toBe(2);
    expect(result.hours).toBe(120);
  });

  test('returns correct structure with all metrics', () => {
    const games = [{ id: 1, name: 'Game A' }];
    const plays = [
      { gameId: 1, date: '2024-01-01', durationMin: 60 },
      { gameId: 1, date: '2024-01-01', durationMin: 30 },
      { gameId: 1, date: '2024-01-02', durationMin: 45 },
    ];
    const result = getTopNewToMeGame(games, plays, 2024, 'sessions');
    expect(result).toHaveProperty('game');
    expect(result).toHaveProperty('value');
    expect(result).toHaveProperty('hours');
    expect(result).toHaveProperty('sessions');
    expect(result).toHaveProperty('plays');
    expect(result.sessions).toBe(2);
    expect(result.plays).toBe(3);
    expect(result.hours).toBe(135);
    expect(result.value).toBe(2);
  });

  test('works with hours metric', () => {
    const games = [
      { id: 1, name: 'Game A' },
      { id: 2, name: 'Game B' },
    ];
    const plays = [
      { gameId: 1, date: '2024-01-01', durationMin: 60 },
      { gameId: 2, date: '2024-02-01', durationMin: 120 },
    ];
    const result = getTopNewToMeGame(games, plays, 2024, 'hours');
    expect(result.game.id).toBe(2);
    expect(result.value).toBe(120);
  });

  test('works with plays metric', () => {
    const games = [
      { id: 1, name: 'Game A' },
      { id: 2, name: 'Game B' },
    ];
    const plays = [
      { gameId: 1, date: '2024-01-01', durationMin: 60 },
      { gameId: 2, date: '2024-02-01', durationMin: 30 },
      { gameId: 2, date: '2024-02-01', durationMin: 30 },
      { gameId: 2, date: '2024-02-01', durationMin: 30 },
    ];
    const result = getTopNewToMeGame(games, plays, 2024, 'plays');
    expect(result.game.id).toBe(2);
    expect(result.value).toBe(3);
  });

  test('only considers plays within the specified year for metrics', () => {
    const games = [{ id: 1, name: 'Game A' }];
    const plays = [
      { gameId: 1, date: '2024-01-01', durationMin: 60 },
      { gameId: 1, date: '2024-01-02', durationMin: 60 },
      { gameId: 1, date: '2025-01-01', durationMin: 60 },
    ];
    const result = getTopNewToMeGame(games, plays, 2024, 'sessions');
    expect(result.sessions).toBe(2);
    expect(result.plays).toBe(2);
  });

  test('ignores games not in games array', () => {
    const games = [{ id: 1, name: 'Game A' }];
    const plays = [
      { gameId: 1, date: '2024-01-01', durationMin: 30 },
      { gameId: 999, date: '2024-02-01', durationMin: 120 },
    ];
    const result = getTopNewToMeGame(games, plays, 2024, 'sessions');
    expect(result.game.id).toBe(1);
  });

  test('handles out-of-order plays when determining first play date', () => {
    const games = [{ id: 1, name: 'Game A' }];
    const plays = [
      // Plays in non-chronological order - later play first in array
      { gameId: 1, date: '2024-03-01', durationMin: 60 },
      { gameId: 1, date: '2024-01-01', durationMin: 60 },
    ];
    const result = getTopNewToMeGame(games, plays, 2024, 'sessions');
    expect(result).not.toBeNull();
    expect(result.game.id).toBe(1);
  });

  test('tiebreaker falls through sessions to plays', () => {
    const games = [
      { id: 1, name: 'Game A' },
      { id: 2, name: 'Game B' },
    ];
    const plays = [
      // Game A: 2 sessions, 60 minutes, 2 plays
      { gameId: 1, date: '2024-01-01', durationMin: 30 },
      { gameId: 1, date: '2024-01-02', durationMin: 30 },
      // Game B: 2 sessions, 60 minutes, 3 plays - should win on plays tiebreaker
      { gameId: 2, date: '2024-02-01', durationMin: 20 },
      { gameId: 2, date: '2024-02-01', durationMin: 20 },
      { gameId: 2, date: '2024-02-02', durationMin: 20 },
    ];
    const result = getTopNewToMeGame(games, plays, 2024, 'sessions');
    expect(result.game.id).toBe(2);
    expect(result.plays).toBe(3);
  });
});
