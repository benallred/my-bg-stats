import { describe, test, expect } from 'vitest';
import {
  getTimeAndActivityStats,
  getLoggingAchievements,
  getSoloStats,
  getLongestSinglePlays,
  getTopGamesByUniquePlayers,
  getTopGamesByUniqueLocations,
  getAllLocationsBySession,
} from './year-review.js';

describe('getTimeAndActivityStats', () => {
  test('returns empty state for no plays', () => {
    const result = getTimeAndActivityStats([], 2024);

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
    const plays = [{ gameId: 1, date: '2024-01-15', durationMin: 120 }];

    const result = getTimeAndActivityStats(plays, null);

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
      { gameId: 1, date: '2024-01-15', durationMin: 30 },
      { gameId: 2, date: '2024-01-16', durationMin: 180 },
      { gameId: 1, date: '2024-01-17', durationMin: 60 },
    ];

    const result = getTimeAndActivityStats(plays, 2024);

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
      { gameId: 3, date: '2024-01-15', durationMin: 30 },
    ];

    const result = getTimeAndActivityStats(plays, 2024);

    expect(result.totalMinutes).toBe(180);
    expect(result.longestDayGamesList).toHaveLength(3);
    expect(result.mostGamesDay).toBe(3);
    expect(result.mostGamesDayGamesList).toHaveLength(3);

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
      { gameId: 2, date: '2024-01-15', durationMin: 45 },
    ];

    const result = getTimeAndActivityStats(plays, 2024);

    expect(result.mostGamesDay).toBe(2);
    expect(result.mostGamesDayGamesList).toHaveLength(2);

    const game1 = result.mostGamesDayGamesList.find(g => g.gameId === 1);
    const game2 = result.mostGamesDayGamesList.find(g => g.gameId === 2);
    expect(game1.playCount).toBe(2);
    expect(game2.playCount).toBe(1);

    const game1Minutes = result.longestDayGamesList.find(g => g.gameId === 1);
    expect(game1Minutes.minutes).toBe(90);
  });

  test('calculates longest consecutive streak', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', durationMin: 60 },
      { gameId: 1, date: '2024-01-16', durationMin: 60 },
      { gameId: 1, date: '2024-01-17', durationMin: 60 },
      { gameId: 1, date: '2024-01-19', durationMin: 60 },
      { gameId: 1, date: '2024-01-20', durationMin: 60 },
    ];

    const result = getTimeAndActivityStats(plays, 2024);

    expect(result.longestStreak).toBe(3);
    expect(result.longestStreakStart).toBe('2024-01-15');
    expect(result.longestStreakEnd).toBe('2024-01-17');
  });

  test('calculates longest dry spell', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', durationMin: 60 },
      { gameId: 1, date: '2024-01-20', durationMin: 60 },
      { gameId: 1, date: '2024-01-22', durationMin: 60 },
    ];

    const result = getTimeAndActivityStats(plays, 2024);

    expect(result.longestDrySpell).toBe(4);
    expect(result.longestDrySpellStart).toBe('2024-01-16');
    expect(result.longestDrySpellEnd).toBe('2024-01-19');
  });

  test('filters plays by year', () => {
    const plays = [
      { gameId: 1, date: '2023-12-15', durationMin: 60 },
      { gameId: 1, date: '2024-01-15', durationMin: 60 },
      { gameId: 1, date: '2024-01-16', durationMin: 60 },
      { gameId: 1, date: '2025-01-15', durationMin: 60 },
    ];

    const result = getTimeAndActivityStats(plays, 2024);

    expect(result.totalDays).toBe(2);
    expect(result.totalMinutes).toBe(120);
  });

  test('handles all-time stats when year is null', () => {
    const plays = [
      { gameId: 1, date: '2023-12-15', durationMin: 60 },
      { gameId: 1, date: '2024-01-15', durationMin: 60 },
      { gameId: 1, date: '2025-01-15', durationMin: 60 },
    ];

    const result = getTimeAndActivityStats(plays, null);

    expect(result.totalDays).toBe(3);
    expect(result.totalMinutes).toBe(180);
  });

  test('handles single day dry spell', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', durationMin: 60 },
      { gameId: 1, date: '2024-01-17', durationMin: 60 },
    ];

    const result = getTimeAndActivityStats(plays, 2024);

    expect(result.longestDrySpell).toBe(1);
    expect(result.longestDrySpellStart).toBe('2024-01-16');
    expect(result.longestDrySpellEnd).toBe('2024-01-16');
  });

  test('handles zero duration plays', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', durationMin: 0 },
      { gameId: 2, date: '2024-01-15', durationMin: 30 },
    ];

    const result = getTimeAndActivityStats(plays, 2024);

    expect(result.totalMinutes).toBe(30);
    expect(result.shortestDayMinutes).toBe(30);
    expect(result.mostGamesDay).toBe(2);
  });
});

describe('getLoggingAchievements', () => {
  test('returns empty array when no thresholds crossed in year', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', durationMin: 30 },
      { gameId: 2, date: '2024-01-16', durationMin: 30 },
    ];

    const result = getLoggingAchievements(plays, 2024);

    expect(result).toEqual([]);
  });

  test('detects hour thresholds (every 100 hours)', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', durationMin: 5900 },
      { gameId: 2, date: '2024-01-16', durationMin: 100 },
    ];

    const result = getLoggingAchievements(plays, 2024);

    expect(result).toContainEqual({ metric: 'hours', threshold: 100, date: '2024-01-16' });
  });

  test('detects session thresholds (every 100 sessions)', () => {
    const plays = [];
    for (let i = 1; i <= 100; i++) {
      const month = i <= 31 ? '01' : i <= 59 ? '02' : i <= 90 ? '03' : '04';
      const dayOfMonth = i <= 31 ? i : i <= 59 ? i - 31 : i <= 90 ? i - 59 : i - 90;
      plays.push({
        gameId: 1,
        date: `2024-${month}-${dayOfMonth.toString().padStart(2, '0')}`,
        durationMin: 30,
      });
    }

    const result = getLoggingAchievements(plays, 2024);

    expect(result).toContainEqual(expect.objectContaining({ metric: 'sessions', threshold: 100 }));
  });

  test('detects play thresholds (every 250 plays)', () => {
    const plays = [];
    for (let i = 0; i < 250; i++) {
      plays.push({
        gameId: 1,
        date: '2024-01-15',
        durationMin: 10,
      });
    }

    const result = getLoggingAchievements(plays, 2024);

    expect(result).toContainEqual({ metric: 'plays', threshold: 250, date: '2024-01-15' });
  });

  test('returns correct date for each threshold', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', durationMin: 5000 },
      { gameId: 2, date: '2024-01-20', durationMin: 1000 },
    ];

    const result = getLoggingAchievements(plays, 2024);

    const hourAchievement = result.find(a => a.metric === 'hours' && a.threshold === 100);
    expect(hourAchievement.date).toBe('2024-01-20');
  });

  test('handles multiple thresholds of same type in one year', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', durationMin: 6000 },
      { gameId: 2, date: '2024-06-15', durationMin: 6000 },
    ];

    const result = getLoggingAchievements(plays, 2024);

    expect(result).toContainEqual({ metric: 'hours', threshold: 100, date: '2024-01-15' });
    expect(result).toContainEqual({ metric: 'hours', threshold: 200, date: '2024-06-15' });
  });

  test('filters to only specified year', () => {
    const plays = [
      { gameId: 1, date: '2023-12-15', durationMin: 5900 },
      { gameId: 2, date: '2024-01-15', durationMin: 100 },
    ];

    const result = getLoggingAchievements(plays, 2024);

    expect(result).toContainEqual({ metric: 'hours', threshold: 100, date: '2024-01-15' });
  });

  test('excludes thresholds crossed in other years', () => {
    const plays = [{ gameId: 1, date: '2023-06-15', durationMin: 6000 }];

    const result = getLoggingAchievements(plays, 2024);

    expect(result).toEqual([]);
  });

  test('orders results by metric (hours, sessions, plays) then threshold', () => {
    const plays = [];
    for (let i = 0; i < 250; i++) {
      const day = (i % 28) + 1;
      const month = Math.floor(i / 28) + 1;
      plays.push({
        gameId: 1,
        date: `2024-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
        durationMin: 60,
      });
    }

    const result = getLoggingAchievements(plays, 2024);

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
    const plays = [
      { gameId: 1, date: '2024-01-15', durationMin: 30 },
      { gameId: 2, date: '2024-01-15', durationMin: 30 },
      { gameId: 3, date: '2024-01-15', durationMin: 30 },
    ];

    const result = getLoggingAchievements(plays, 2024);

    const sessionAchievements = result.filter(a => a.metric === 'sessions');
    expect(sessionAchievements).toEqual([]);
  });

  test('handles crossing multiple thresholds in single play', () => {
    const plays = [{ gameId: 1, date: '2024-01-15', durationMin: 12500 }];

    const result = getLoggingAchievements(plays, 2024);

    expect(result).toContainEqual({ metric: 'hours', threshold: 100, date: '2024-01-15' });
    expect(result).toContainEqual({ metric: 'hours', threshold: 200, date: '2024-01-15' });
  });
});

describe('getSoloStats', () => {
  test('counts solo plays correctly', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', durationMin: 45, players: [1] },
      { gameId: 1, date: '2024-01-16', durationMin: 50, players: [1, 2] },
      { gameId: 2, date: '2024-01-17', durationMin: 30, players: [1] },
    ];
    const selfPlayerId = 1;

    const result = getSoloStats(plays, selfPlayerId);

    expect(result.totalSoloPlays).toBe(2);
  });

  test('counts solo sessions (unique dates) correctly', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', durationMin: 45, players: [1] },
      { gameId: 1, date: '2024-01-15', durationMin: 30, players: [1] },
      { gameId: 2, date: '2024-01-16', durationMin: 50, players: [1, 2] },
      { gameId: 3, date: '2024-01-17', durationMin: 30, players: [1] },
    ];
    const selfPlayerId = 1;

    const result = getSoloStats(plays, selfPlayerId);

    expect(result.totalSoloSessions).toBe(2);
  });

  test('sums solo minutes correctly', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', durationMin: 45, players: [1] },
      { gameId: 1, date: '2024-01-16', durationMin: 50, players: [1, 2] },
      { gameId: 2, date: '2024-01-17', durationMin: 30, players: [1] },
    ];
    const selfPlayerId = 1;

    const result = getSoloStats(plays, selfPlayerId);

    expect(result.totalSoloMinutes).toBe(75);
  });

  test('filters by year when specified', () => {
    const plays = [
      { gameId: 1, date: '2023-12-31', durationMin: 60, players: [1] },
      { gameId: 1, date: '2024-01-15', durationMin: 45, players: [1] },
      { gameId: 2, date: '2024-01-16', durationMin: 30, players: [1] },
    ];
    const selfPlayerId = 1;

    const result = getSoloStats(plays, selfPlayerId, 2024);

    expect(result.totalSoloPlays).toBe(2);
    expect(result.totalSoloSessions).toBe(2);
    expect(result.totalSoloMinutes).toBe(75);
  });

  test('returns all-time stats when year is null', () => {
    const plays = [
      { gameId: 1, date: '2023-12-31', durationMin: 60, players: [1] },
      { gameId: 1, date: '2024-01-15', durationMin: 45, players: [1] },
      { gameId: 2, date: '2024-01-16', durationMin: 30, players: [1] },
    ];
    const selfPlayerId = 1;

    const result = getSoloStats(plays, selfPlayerId, null);

    expect(result.totalSoloPlays).toBe(3);
    expect(result.totalSoloSessions).toBe(3);
    expect(result.totalSoloMinutes).toBe(135);
  });

  test('handles empty plays array', () => {
    const result = getSoloStats([], 1);

    expect(result.totalSoloMinutes).toBe(0);
    expect(result.totalSoloSessions).toBe(0);
    expect(result.totalSoloPlays).toBe(0);
  });

  test('handles no solo plays', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', durationMin: 45, players: [1, 2] },
      { gameId: 2, date: '2024-01-16', durationMin: 30, players: [1, 2, 3] },
    ];
    const selfPlayerId = 1;

    const result = getSoloStats(plays, selfPlayerId);

    expect(result.totalSoloMinutes).toBe(0);
    expect(result.totalSoloSessions).toBe(0);
    expect(result.totalSoloPlays).toBe(0);
  });

  test('does not count single-player games with different player as solo', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', durationMin: 45, players: [2] },
      { gameId: 2, date: '2024-01-16', durationMin: 30, players: [1] },
    ];
    const selfPlayerId = 1;

    const result = getSoloStats(plays, selfPlayerId);

    expect(result.totalSoloPlays).toBe(1);
    expect(result.totalSoloMinutes).toBe(30);
  });

  test('returns results in hours, sessions, plays order', () => {
    const plays = [{ gameId: 1, date: '2024-01-15', durationMin: 60, players: [1] }];
    const selfPlayerId = 1;

    const result = getSoloStats(plays, selfPlayerId);

    const keys = Object.keys(result);
    expect(keys).toEqual(['totalSoloMinutes', 'totalSoloSessions', 'totalSoloPlays']);
  });
});

describe('getAllLocationsBySession', () => {
  const locations = [
    { locationId: 1, name: 'Home' },
    { locationId: 2, name: 'Church' },
    { locationId: 3, name: 'Work' },
    { locationId: 4, name: 'Vacation' },
  ];

  test('returns all locations sorted by session count', () => {
    const plays = [
      { gameId: 1, date: '2024-01-01', locationId: 1 },
      { gameId: 1, date: '2024-01-02', locationId: 1 },
      { gameId: 1, date: '2024-01-03', locationId: 1 },
      { gameId: 1, date: '2024-01-04', locationId: 2 },
      { gameId: 1, date: '2024-01-05', locationId: 2 },
      { gameId: 1, date: '2024-01-06', locationId: 3 },
    ];

    const result = getAllLocationsBySession(plays, locations);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ locationId: 1, name: 'Home', sessions: 3 });
    expect(result[1]).toEqual({ locationId: 2, name: 'Church', sessions: 2 });
    expect(result[2]).toEqual({ locationId: 3, name: 'Work', sessions: 1 });
  });

  test('counts unique dates (sessions) not plays per location', () => {
    const plays = [
      { gameId: 1, date: '2024-01-01', locationId: 1 },
      { gameId: 2, date: '2024-01-01', locationId: 1 },
      { gameId: 3, date: '2024-01-01', locationId: 1 },
      { gameId: 1, date: '2024-01-02', locationId: 2 },
      { gameId: 2, date: '2024-01-03', locationId: 2 },
    ];

    const result = getAllLocationsBySession(plays, locations);

    expect(result[0]).toEqual({ locationId: 2, name: 'Church', sessions: 2 });
    expect(result[1]).toEqual({ locationId: 1, name: 'Home', sessions: 1 });
  });

  test('filters by year when specified', () => {
    const plays = [
      { gameId: 1, date: '2023-01-01', locationId: 1 },
      { gameId: 1, date: '2023-01-02', locationId: 1 },
      { gameId: 1, date: '2024-01-01', locationId: 2 },
      { gameId: 1, date: '2024-01-02', locationId: 2 },
      { gameId: 1, date: '2024-01-03', locationId: 2 },
    ];

    const result = getAllLocationsBySession(plays, locations, 2024);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ locationId: 2, name: 'Church', sessions: 3 });
  });

  test('returns all locations when year is null', () => {
    const plays = [
      { gameId: 1, date: '2023-01-01', locationId: 1 },
      { gameId: 1, date: '2024-01-01', locationId: 2 },
    ];

    const result = getAllLocationsBySession(plays, locations);

    expect(result).toHaveLength(2);
  });

  test('handles empty plays array', () => {
    const result = getAllLocationsBySession([], locations);

    expect(result).toEqual([]);
  });

  test('returns empty array when no plays match year filter', () => {
    const plays = [
      { gameId: 1, date: '2023-01-01', locationId: 1 },
      { gameId: 1, date: '2023-01-02', locationId: 2 },
    ];

    const result = getAllLocationsBySession(plays, locations, 2024);

    expect(result).toEqual([]);
  });

  test('handles unknown location IDs gracefully', () => {
    const plays = [{ gameId: 1, date: '2024-01-01', locationId: 999 }];

    const result = getAllLocationsBySession(plays, locations);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Location 999');
    expect(result[0].sessions).toBe(1);
  });

  test('returns all locations without any limit', () => {
    const plays = [
      { gameId: 1, date: '2024-01-01', locationId: 1 },
      { gameId: 1, date: '2024-01-02', locationId: 2 },
      { gameId: 1, date: '2024-01-03', locationId: 3 },
      { gameId: 1, date: '2024-01-04', locationId: 4 },
    ];

    const result = getAllLocationsBySession(plays, locations);

    expect(result).toHaveLength(4);
  });
});

describe('getLongestSinglePlays', () => {
  const games = [
    { id: 1, name: 'Wingspan' },
    { id: 2, name: 'Catan' },
    { id: 3, name: 'Azul' },
    { id: 4, name: 'Ticket to Ride' },
  ];

  test('returns top 3 longest plays sorted by duration descending', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', durationMin: 60 },
      { gameId: 2, date: '2024-01-16', durationMin: 180 },
      { gameId: 3, date: '2024-01-17', durationMin: 120 },
      { gameId: 4, date: '2024-01-18', durationMin: 90 },
    ];

    const result = getLongestSinglePlays(games, plays, 2024, 3);

    expect(result).toHaveLength(3);
    expect(result[0].durationMin).toBe(180);
    expect(result[0].game.name).toBe('Catan');
    expect(result[1].durationMin).toBe(120);
    expect(result[1].game.name).toBe('Azul');
    expect(result[2].durationMin).toBe(90);
    expect(result[2].game.name).toBe('Ticket to Ride');
  });

  test('includes date in results', () => {
    const plays = [
      { gameId: 1, date: '2024-08-11', durationMin: 120 },
    ];

    const result = getLongestSinglePlays(games, plays, 2024, 3);

    expect(result[0].date).toBe('2024-08-11');
  });

  test('filters plays by year', () => {
    const plays = [
      { gameId: 1, date: '2023-01-15', durationMin: 300 },
      { gameId: 2, date: '2024-01-16', durationMin: 180 },
      { gameId: 3, date: '2025-01-17', durationMin: 240 },
    ];

    const result = getLongestSinglePlays(games, plays, 2024, 3);

    expect(result).toHaveLength(1);
    expect(result[0].durationMin).toBe(180);
  });

  test('handles fewer plays than requested count', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', durationMin: 60 },
      { gameId: 2, date: '2024-01-16', durationMin: 120 },
    ];

    const result = getLongestSinglePlays(games, plays, 2024, 3);

    expect(result).toHaveLength(2);
  });

  test('excludes plays with zero duration', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', durationMin: 0 },
      { gameId: 2, date: '2024-01-16', durationMin: 60 },
      { gameId: 3, date: '2024-01-17', durationMin: 0 },
    ];

    const result = getLongestSinglePlays(games, plays, 2024, 3);

    expect(result).toHaveLength(1);
    expect(result[0].durationMin).toBe(60);
  });

  test('returns empty array when no plays match year', () => {
    const plays = [
      { gameId: 1, date: '2023-01-15', durationMin: 120 },
    ];

    const result = getLongestSinglePlays(games, plays, 2024, 3);

    expect(result).toEqual([]);
  });

  test('returns empty array when all plays have zero duration', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', durationMin: 0 },
      { gameId: 2, date: '2024-01-16', durationMin: 0 },
    ];

    const result = getLongestSinglePlays(games, plays, 2024, 3);

    expect(result).toEqual([]);
  });

  test('handles empty plays array', () => {
    const result = getLongestSinglePlays(games, [], 2024, 3);

    expect(result).toEqual([]);
  });

  test('handles multiple plays of same game', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', durationMin: 60 },
      { gameId: 1, date: '2024-01-16', durationMin: 180 },
      { gameId: 1, date: '2024-01-17', durationMin: 120 },
    ];

    const result = getLongestSinglePlays(games, plays, 2024, 3);

    expect(result).toHaveLength(3);
    expect(result[0].durationMin).toBe(180);
    expect(result[1].durationMin).toBe(120);
    expect(result[2].durationMin).toBe(60);
    expect(result.every(r => r.game.name === 'Wingspan')).toBe(true);
  });
});

describe('getTopGamesByUniquePlayers', () => {
  const games = [
    { id: 1, name: 'Wingspan' },
    { id: 2, name: 'Catan' },
    { id: 3, name: 'Azul' },
    { id: 4, name: 'Ticket to Ride' },
  ];

  test('returns top 3 games sorted by unique player count descending', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', players: [1, 2, 3] },
      { gameId: 1, date: '2024-01-16', players: [1, 4] },
      { gameId: 2, date: '2024-01-17', players: [1, 2] },
      { gameId: 3, date: '2024-01-18', players: [1, 2, 3, 4, 5] },
      { gameId: 4, date: '2024-01-19', players: [1] },
    ];

    const result = getTopGamesByUniquePlayers(games, plays, 2024, 3, null);

    expect(result).toHaveLength(3);
    expect(result[0].game.name).toBe('Azul');
    expect(result[0].value).toBe(5);
    expect(result[1].game.name).toBe('Wingspan');
    expect(result[1].value).toBe(4);
    expect(result[2].game.name).toBe('Catan');
    expect(result[2].value).toBe(2);
  });

  test('counts unique players across multiple plays of same game', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', players: [1, 2] },
      { gameId: 1, date: '2024-01-16', players: [2, 3] },
      { gameId: 1, date: '2024-01-17', players: [3, 4] },
    ];

    const result = getTopGamesByUniquePlayers(games, plays, 2024, 3, null);

    expect(result).toHaveLength(1);
    expect(result[0].game.name).toBe('Wingspan');
    expect(result[0].value).toBe(4);
  });

  test('filters plays by year', () => {
    const plays = [
      { gameId: 1, date: '2023-01-15', players: [1, 2, 3, 4, 5] },
      { gameId: 2, date: '2024-01-16', players: [1, 2] },
    ];

    const result = getTopGamesByUniquePlayers(games, plays, 2024, 3, null);

    expect(result).toHaveLength(1);
    expect(result[0].game.name).toBe('Catan');
    expect(result[0].value).toBe(2);
  });

  test('handles fewer games than requested count', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', players: [1, 2] },
      { gameId: 2, date: '2024-01-16', players: [1] },
    ];

    const result = getTopGamesByUniquePlayers(games, plays, 2024, 3, null);

    expect(result).toHaveLength(2);
  });

  test('returns empty array when no plays match year', () => {
    const plays = [
      { gameId: 1, date: '2023-01-15', players: [1, 2] },
    ];

    const result = getTopGamesByUniquePlayers(games, plays, 2024, 3, null);

    expect(result).toEqual([]);
  });

  test('handles empty plays array', () => {
    const result = getTopGamesByUniquePlayers(games, [], 2024, 3, null);

    expect(result).toEqual([]);
  });

  test('filters out unknown games', () => {
    const plays = [
      { gameId: 999, date: '2024-01-15', players: [1, 2, 3] },
      { gameId: 1, date: '2024-01-16', players: [1, 2] },
    ];

    const result = getTopGamesByUniquePlayers(games, plays, 2024, 3, null);

    expect(result).toHaveLength(1);
    expect(result[0].game.name).toBe('Wingspan');
  });

  test('handles empty players array', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', players: [], durationMin: 60 },
      { gameId: 2, date: '2024-01-16', players: [1, 2], durationMin: 60 },
    ];

    const result = getTopGamesByUniquePlayers(games, plays, 2024, 3, null);

    expect(result).toHaveLength(2);
    expect(result[0].game.name).toBe('Catan');
    expect(result[0].value).toBe(2);
    expect(result[1].game.name).toBe('Wingspan');
    expect(result[1].value).toBe(0);
  });

  test('breaks ties by hours (minutes) descending', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', players: [1, 2], durationMin: 60 },
      { gameId: 2, date: '2024-01-16', players: [3, 4], durationMin: 120 },
    ];

    const result = getTopGamesByUniquePlayers(games, plays, 2024, 3, null);

    expect(result).toHaveLength(2);
    expect(result[0].value).toBe(2);
    expect(result[1].value).toBe(2);
    expect(result[0].game.name).toBe('Catan');
    expect(result[1].game.name).toBe('Wingspan');
  });

  test('breaks ties by sessions descending when hours are equal', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', players: [1, 2], durationMin: 60 },
      { gameId: 2, date: '2024-01-16', players: [3, 4], durationMin: 30 },
      { gameId: 2, date: '2024-01-17', players: [3, 4], durationMin: 30 },
    ];

    const result = getTopGamesByUniquePlayers(games, plays, 2024, 3, null);

    expect(result).toHaveLength(2);
    expect(result[0].value).toBe(2);
    expect(result[1].value).toBe(2);
    expect(result[0].game.name).toBe('Catan');
    expect(result[1].game.name).toBe('Wingspan');
  });

  test('breaks ties by plays descending when hours and sessions are equal', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', players: [1, 2], durationMin: 30 },
      { gameId: 2, date: '2024-01-16', players: [3, 4], durationMin: 15 },
      { gameId: 2, date: '2024-01-16', players: [3, 4], durationMin: 15 },
    ];

    const result = getTopGamesByUniquePlayers(games, plays, 2024, 3, null);

    expect(result).toHaveLength(2);
    expect(result[0].value).toBe(2);
    expect(result[1].value).toBe(2);
    expect(result[0].game.name).toBe('Catan');
    expect(result[1].game.name).toBe('Wingspan');
  });

  test('counts multiple anonymous players in single play', () => {
    const anonymousPlayerId = 99;
    const plays = [
      // Game 1: player 2, three anonymous players, player 3, player 4 = 6 total
      { gameId: 1, date: '2024-01-15', players: [2, 99, 99, 99, 3, 4], durationMin: 60 },
    ];

    const result = getTopGamesByUniquePlayers(games, plays, 2024, 3, anonymousPlayerId);

    expect(result).toHaveLength(1);
    expect(result[0].game.name).toBe('Wingspan');
    expect(result[0].value).toBe(6); // 3 unique named + 3 anonymous
  });

  test('counts anonymous players per occurrence across multiple plays', () => {
    const anonymousPlayerId = 99;
    const plays = [
      // Game 1 play 1: players 2, 3 + 2 anonymous = 4 people
      { gameId: 1, date: '2024-01-15', players: [2, 3, 99, 99], durationMin: 60 },
      // Game 1 play 2: players 2, 4 + 1 anonymous = 3 people (but player 2 already counted)
      { gameId: 1, date: '2024-01-16', players: [2, 4, 99], durationMin: 60 },
    ];

    const result = getTopGamesByUniquePlayers(games, plays, 2024, 3, anonymousPlayerId);

    expect(result).toHaveLength(1);
    expect(result[0].game.name).toBe('Wingspan');
    // 3 unique named (2, 3, 4) + 3 anonymous (2 from first play + 1 from second) = 6
    expect(result[0].value).toBe(6);
  });

  test('dedupes named players but not anonymous players', () => {
    const anonymousPlayerId = 99;
    const plays = [
      // Same named player (2) appears in both plays - should only count once
      // Anonymous player appears in both plays - should count each time
      { gameId: 1, date: '2024-01-15', players: [2, 99], durationMin: 60 },
      { gameId: 1, date: '2024-01-16', players: [2, 99], durationMin: 60 },
    ];

    const result = getTopGamesByUniquePlayers(games, plays, 2024, 3, anonymousPlayerId);

    expect(result).toHaveLength(1);
    expect(result[0].game.name).toBe('Wingspan');
    // 1 unique named (2) + 2 anonymous = 3
    expect(result[0].value).toBe(3);
  });

  test('handles null anonymousPlayerId by treating all players as named', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', players: [1, 1, 1, 2], durationMin: 60 },
    ];

    const result = getTopGamesByUniquePlayers(games, plays, 2024, 3, null);

    expect(result).toHaveLength(1);
    expect(result[0].game.name).toBe('Wingspan');
    // All player IDs deduplicated: {1, 2} = 2
    expect(result[0].value).toBe(2);
  });
});

describe('getTopGamesByUniqueLocations', () => {
  const games = [
    { id: 1, name: 'Wingspan' },
    { id: 2, name: 'Catan' },
    { id: 3, name: 'Azul' },
    { id: 4, name: 'Ticket to Ride' },
  ];

  test('returns top 3 games sorted by unique location count descending', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', locationId: 1 },
      { gameId: 1, date: '2024-01-16', locationId: 2 },
      { gameId: 1, date: '2024-01-17', locationId: 3 },
      { gameId: 2, date: '2024-01-18', locationId: 1 },
      { gameId: 2, date: '2024-01-19', locationId: 2 },
      { gameId: 3, date: '2024-01-20', locationId: 1 },
      { gameId: 4, date: '2024-01-21', locationId: 1 },
      { gameId: 4, date: '2024-01-22', locationId: 2 },
      { gameId: 4, date: '2024-01-23', locationId: 3 },
      { gameId: 4, date: '2024-01-24', locationId: 4 },
    ];

    const result = getTopGamesByUniqueLocations(games, plays, 2024, 3);

    expect(result).toHaveLength(3);
    expect(result[0].game.name).toBe('Ticket to Ride');
    expect(result[0].value).toBe(4);
    expect(result[1].game.name).toBe('Wingspan');
    expect(result[1].value).toBe(3);
    expect(result[2].game.name).toBe('Catan');
    expect(result[2].value).toBe(2);
  });

  test('counts unique locations across multiple plays of same game', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', locationId: 1 },
      { gameId: 1, date: '2024-01-16', locationId: 1 },
      { gameId: 1, date: '2024-01-17', locationId: 2 },
      { gameId: 1, date: '2024-01-18', locationId: 2 },
      { gameId: 1, date: '2024-01-19', locationId: 3 },
    ];

    const result = getTopGamesByUniqueLocations(games, plays, 2024, 3);

    expect(result).toHaveLength(1);
    expect(result[0].game.name).toBe('Wingspan');
    expect(result[0].value).toBe(3);
  });

  test('filters plays by year', () => {
    const plays = [
      { gameId: 1, date: '2023-01-15', locationId: 1 },
      { gameId: 1, date: '2023-01-16', locationId: 2 },
      { gameId: 1, date: '2023-01-17', locationId: 3 },
      { gameId: 2, date: '2024-01-18', locationId: 1 },
      { gameId: 2, date: '2024-01-19', locationId: 2 },
    ];

    const result = getTopGamesByUniqueLocations(games, plays, 2024, 3);

    expect(result).toHaveLength(1);
    expect(result[0].game.name).toBe('Catan');
    expect(result[0].value).toBe(2);
  });

  test('handles fewer games than requested count', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', locationId: 1 },
      { gameId: 2, date: '2024-01-16', locationId: 1 },
    ];

    const result = getTopGamesByUniqueLocations(games, plays, 2024, 3);

    expect(result).toHaveLength(2);
  });

  test('returns empty array when no plays match year', () => {
    const plays = [
      { gameId: 1, date: '2023-01-15', locationId: 1 },
    ];

    const result = getTopGamesByUniqueLocations(games, plays, 2024, 3);

    expect(result).toEqual([]);
  });

  test('handles empty plays array', () => {
    const result = getTopGamesByUniqueLocations(games, [], 2024, 3);

    expect(result).toEqual([]);
  });

  test('filters out unknown games', () => {
    const plays = [
      { gameId: 999, date: '2024-01-15', locationId: 1, durationMin: 60 },
      { gameId: 999, date: '2024-01-16', locationId: 2, durationMin: 60 },
      { gameId: 999, date: '2024-01-17', locationId: 3, durationMin: 60 },
      { gameId: 1, date: '2024-01-18', locationId: 1, durationMin: 60 },
    ];

    const result = getTopGamesByUniqueLocations(games, plays, 2024, 3);

    expect(result).toHaveLength(1);
    expect(result[0].game.name).toBe('Wingspan');
  });

  test('breaks ties by hours (minutes) descending', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', locationId: 1, durationMin: 60 },
      { gameId: 2, date: '2024-01-16', locationId: 2, durationMin: 120 },
    ];

    const result = getTopGamesByUniqueLocations(games, plays, 2024, 3);

    expect(result).toHaveLength(2);
    expect(result[0].value).toBe(1);
    expect(result[1].value).toBe(1);
    expect(result[0].game.name).toBe('Catan');
    expect(result[1].game.name).toBe('Wingspan');
  });

  test('breaks ties by sessions descending when hours are equal', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', locationId: 1, durationMin: 60 },
      { gameId: 2, date: '2024-01-16', locationId: 2, durationMin: 30 },
      { gameId: 2, date: '2024-01-17', locationId: 2, durationMin: 30 },
    ];

    const result = getTopGamesByUniqueLocations(games, plays, 2024, 3);

    expect(result).toHaveLength(2);
    expect(result[0].value).toBe(1);
    expect(result[1].value).toBe(1);
    expect(result[0].game.name).toBe('Catan');
    expect(result[1].game.name).toBe('Wingspan');
  });

  test('breaks ties by plays descending when hours and sessions are equal', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', locationId: 1, durationMin: 30 },
      { gameId: 2, date: '2024-01-16', locationId: 2, durationMin: 15 },
      { gameId: 2, date: '2024-01-16', locationId: 2, durationMin: 15 },
    ];

    const result = getTopGamesByUniqueLocations(games, plays, 2024, 3);

    expect(result).toHaveLength(2);
    expect(result[0].value).toBe(1);
    expect(result[1].value).toBe(1);
    expect(result[0].game.name).toBe('Catan');
    expect(result[1].game.name).toBe('Wingspan');
  });
});
