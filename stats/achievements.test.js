import { describe, test, expect } from 'vitest';
import { Metric } from './constants.js';
import {
  AchievementType,
  getAchievements,
  getCumulativeLoggingAchievements,
} from './achievements.js';

// Build a play with the fields the achievements generators read.
function play(date, durationMin, time = '12:00:00', gameId = 1) {
  return { date, timestamp: `${date} ${time}`, durationMin, gameId };
}

describe('getCumulativeLoggingAchievements', () => {
  test('returns empty array for no plays', () => {
    expect(getCumulativeLoggingAchievements([])).toEqual([]);
  });

  test('emits an hours achievement when the 100th hour is crossed', () => {
    // 6000 minutes = 100 hours
    const result = getCumulativeLoggingAchievements([play('2024-01-01', 6000, '12:00:00', 42)]);

    expect(result).toEqual([
      {
        type: AchievementType.LOGGING,
        timestamp: '2024-01-01 12:00:00',
        gameId: 42,
        metric: Metric.HOURS,
        threshold: 100,
      },
    ]);
  });

  test('records the triggering game on each achievement', () => {
    const result = getCumulativeLoggingAchievements([play('2024-01-01', 6000, '12:00:00', 7)]);
    expect(result.every(a => a.gameId === 7)).toBe(true);
  });

  test('emits multiple hours achievements when several thresholds cross in one play', () => {
    // 15000 minutes = 250 hours -> crosses 100 and 200
    const result = getCumulativeLoggingAchievements([play('2024-01-01', 15000)]);
    const hours = result.filter(a => a.metric === Metric.HOURS);

    expect(hours.map(a => a.threshold)).toEqual([100, 200]);
  });

  test('does not emit before a threshold is reached', () => {
    // 99 hours, 249 plays, 99 sessions - nothing crossed
    const plays = Array.from({ length: 99 }, (_, i) =>
      play(`2024-${String(Math.floor(i / 28) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`, 60)
    );
    expect(getCumulativeLoggingAchievements(plays)).toEqual([]);
  });

  test('emits a sessions achievement on the 100th unique day', () => {
    // 100 unique days, one short play each (no hour/play thresholds reached)
    const plays = Array.from({ length: 100 }, (_, i) => {
      const day = new Date(Date.UTC(2024, 0, 1 + i)).toISOString().split('T')[0];
      return play(day, 1);
    });

    const result = getCumulativeLoggingAchievements(plays);
    const sessions = result.filter(a => a.metric === Metric.SESSIONS);

    expect(sessions).toHaveLength(1);
    expect(sessions[0].threshold).toBe(100);
    expect(sessions[0].timestamp).toBe(plays[99].timestamp);
  });

  test('multiple plays on the same day count as one session', () => {
    const plays = [
      play('2024-01-01', 1, '09:00:00'),
      play('2024-01-01', 1, '10:00:00'),
    ];
    const sessions = getCumulativeLoggingAchievements(plays).filter(a => a.metric === Metric.SESSIONS);
    expect(sessions).toEqual([]);
  });

  test('emits a plays achievement on the 250th play', () => {
    // 250 short plays across 250 unique days (the 250th play crosses the plays threshold)
    const plays = Array.from({ length: 250 }, (_, i) => {
      const day = new Date(Date.UTC(2024, 0, 1 + i)).toISOString().split('T')[0];
      return play(day, 1);
    });

    const result = getCumulativeLoggingAchievements(plays);
    const playAchievements = result.filter(a => a.metric === Metric.PLAYS);

    expect(playAchievements).toHaveLength(1);
    expect(playAchievements[0].threshold).toBe(250);
    expect(playAchievements[0].timestamp).toBe(plays[249].timestamp);
  });

  test('crosses thresholds in timestamp order regardless of input order', () => {
    const plays = [
      play('2024-06-01', 3000, '12:00:00'), // later
      play('2024-01-01', 3000, '12:00:00'), // earlier -> crosses 100h first
    ];
    const result = getCumulativeLoggingAchievements(plays);
    const hours = result.filter(a => a.metric === Metric.HOURS);

    expect(hours).toHaveLength(1);
    expect(hours[0].timestamp).toBe('2024-06-01 12:00:00'); // 100th hour reached on the second-chronological play
  });
});

describe('getAchievements', () => {
  test('returns empty array for no plays', () => {
    expect(getAchievements({ games: [], plays: [] })).toEqual([]);
  });

  test('orders achievements most-recent first by timestamp', () => {
    const plays = [
      play('2024-01-01', 6000, '12:00:00'), // 100th hour here
      play('2024-02-01', 6000, '12:00:00'), // 200th hour here
    ];
    const result = getAchievements({ games: [], plays });
    const hours = result.filter(a => a.metric === Metric.HOURS);

    expect(hours.map(a => a.threshold)).toEqual([200, 100]);
    expect(hours[0].timestamp).toBe('2024-02-01 12:00:00');
  });

  test('breaks same-timestamp ties by metric convention then threshold', () => {
    // A single play that simultaneously crosses hours, sessions, and plays.
    // 100 hours = 6000 min; but a single play cannot reach 100 sessions/250 plays,
    // so construct history so the final play crosses all three at once.
    // 99 sessions + 249 plays already banked via prior short plays, then one big play.
    const prior = Array.from({ length: 249 }, (_, i) => {
      const day = new Date(Date.UTC(2023, 0, 1 + i)).toISOString().split('T')[0];
      return play(day, 1, '08:00:00');
    });
    // The 250th play, on a new (100th... actually 250th unique) day, large enough to cross 100h.
    // prior gives 249 plays across 249 unique days and ~249 minutes total.
    const finalDay = new Date(Date.UTC(2023, 0, 1 + 249)).toISOString().split('T')[0];
    const plays = [...prior, play(finalDay, 6000, '20:00:00')];

    const result = getAchievements({ games: [], plays });
    const sameTs = result.filter(a => a.timestamp === `${finalDay} 20:00:00`);

    // hours before plays (sessions threshold 100 already passed earlier, not on this play)
    expect(sameTs.map(a => a.metric)).toEqual([Metric.HOURS, Metric.PLAYS]);
  });

  test('breaks same-timestamp, same-metric ties by threshold ascending', () => {
    // 15000 minutes = 250 hours in one play -> crosses 100 and 200 at the same timestamp
    const result = getAchievements({ games: [], plays: [play('2024-01-01', 15000)] });
    const hours = result.filter(a => a.metric === Metric.HOURS);

    expect(hours.map(a => a.threshold)).toEqual([100, 200]);
  });

  test('every achievement carries a timestamp', () => {
    const result = getAchievements({ games: [], plays: [play('2024-01-01', 6000)] });
    for (const a of result) {
      expect(a.timestamp).toBe('2024-01-01 12:00:00');
    }
  });
});
