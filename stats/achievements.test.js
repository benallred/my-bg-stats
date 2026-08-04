import { describe, test, expect } from 'vitest';
import { Metric } from './constants.js';
import {
  AchievementType,
  getAchievements,
  getCumulativeLoggingTotals,
  getMilestoneAchievements,
  getIndexAchievements,
  getValueClubAchievements,
  getBuddyAchievements,
  getSoloAchievements,
} from './achievements.js';
import {
  calculateHourHIndex,
  calculatePlaySessionHIndex,
  calculateTraditionalHIndex,
  calculatePeopleHIndex,
} from './h-index.js';
import {
  calculateHourStaircaseLevel,
  calculateSessionStaircaseLevel,
  calculatePlayStaircaseLevel,
} from './staircase-level.js';

// Build a play with the fields the achievements generators read.
function play(date, durationMin, time = '12:00:00', gameId = 1, players = []) {
  return { date, timestamp: `${date} ${time}`, durationMin, gameId, players };
}

// Distinct dates so each play is its own session, starting 2024-01-01.
function dayN(n) {
  return new Date(Date.UTC(2024, 0, 1 + n)).toISOString().split('T')[0];
}

describe('getCumulativeLoggingTotals', () => {
  test('returns empty array for no plays', () => {
    expect(getCumulativeLoggingTotals([])).toEqual([]);
  });

  test('emits an hours achievement when the 100th hour is crossed', () => {
    // 6000 minutes = 100 hours
    const result = getCumulativeLoggingTotals([play('2024-01-01', 6000, '12:00:00', 42)]);

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
    const result = getCumulativeLoggingTotals([play('2024-01-01', 6000, '12:00:00', 7)]);
    expect(result.every(a => a.gameId === 7)).toBe(true);
  });

  test('emits multiple hours achievements when several thresholds cross in one play', () => {
    // 15000 minutes = 250 hours -> crosses 100 and 200
    const result = getCumulativeLoggingTotals([play('2024-01-01', 15000)]);
    const hours = result.filter(a => a.metric === Metric.HOURS);

    expect(hours.map(a => a.threshold)).toEqual([100, 200]);
  });

  test('does not emit before a threshold is reached', () => {
    // 99 hours, 249 plays, 99 sessions - nothing crossed
    const plays = Array.from({ length: 99 }, (_, i) =>
      play(`2024-${String(Math.floor(i / 28) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`, 60)
    );
    expect(getCumulativeLoggingTotals(plays)).toEqual([]);
  });

  test('emits a sessions achievement on the 100th unique day', () => {
    // 100 unique days, one short play each (no hour/play thresholds reached)
    const plays = Array.from({ length: 100 }, (_, i) => {
      const day = new Date(Date.UTC(2024, 0, 1 + i)).toISOString().split('T')[0];
      return play(day, 1);
    });

    const result = getCumulativeLoggingTotals(plays);
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
    const sessions = getCumulativeLoggingTotals(plays).filter(a => a.metric === Metric.SESSIONS);
    expect(sessions).toEqual([]);
  });

  test('emits a plays achievement on the 250th play', () => {
    // 250 short plays across 250 unique days (the 250th play crosses the plays threshold)
    const plays = Array.from({ length: 250 }, (_, i) => {
      const day = new Date(Date.UTC(2024, 0, 1 + i)).toISOString().split('T')[0];
      return play(day, 1);
    });

    const result = getCumulativeLoggingTotals(plays);
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
    const result = getCumulativeLoggingTotals(plays);
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

  test('is deterministic when logging and milestone tie on timestamp, metric, and threshold', () => {
    // A single 6000-minute play (100 hours) for game 1 crosses the 100th total
    // hour (logging) and the game's century (milestone) at the same instant.
    const result = getAchievements({ games: [{ id: 1 }], plays: [play('2024-01-01', 6000)] });
    const hundredHour = result.filter(a => a.metric === Metric.HOURS && a.threshold === 100);

    expect(hundredHour.map(a => a.type)).toEqual([AchievementType.LOGGING, AchievementType.MILESTONE]);
  });

  test('includes both logging and milestone achievements', () => {
    const result = getAchievements({ games: [{ id: 1 }], plays: [play('2024-01-01', 6000)] });
    expect(result.some(a => a.type === AchievementType.LOGGING)).toBe(true);
    expect(result.some(a => a.type === AchievementType.MILESTONE)).toBe(true);
  });
});

describe('getMilestoneAchievements', () => {
  const games = [{ id: 1 }, { id: 2 }];

  test('returns empty array for no plays', () => {
    expect(getMilestoneAchievements(games, [])).toEqual([]);
  });

  test('emits a plays milestone when a game reaches five plays', () => {
    const plays = Array.from({ length: 5 }, (_, i) => play(dayN(i), 30));
    const result = getMilestoneAchievements(games, plays).filter(a => a.metric === Metric.PLAYS);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      type: AchievementType.MILESTONE,
      gameId: 1,
      metric: Metric.PLAYS,
      threshold: 5,
    });
  });

  test('emits an hours milestone from accumulated minutes (five = 5 hours)', () => {
    // A single 300-minute play = 5.0 hours (and only 1 session / 1 play)
    const result = getMilestoneAchievements(games, [play(dayN(0), 300)]).filter(a => a.metric === Metric.HOURS);
    expect(result.map(a => a.threshold)).toEqual([5]);
  });

  test('emits a sessions milestone when a game is played on five unique days', () => {
    const plays = Array.from({ length: 5 }, (_, i) => play(dayN(i), 30));
    const result = getMilestoneAchievements(games, plays).filter(a => a.metric === Metric.SESSIONS);
    expect(result.map(a => a.threshold)).toEqual([5]);
  });

  test('crosses multiple tiers in one play', () => {
    // 6000 minutes = 100 hours in one play -> five, dime, quarter, century
    const result = getMilestoneAchievements(games, [play(dayN(0), 6000)]).filter(a => a.metric === Metric.HOURS);
    expect(result.map(a => a.threshold)).toEqual([5, 10, 25, 100]);
  });

  test('tracks each game independently', () => {
    const plays = [
      ...Array.from({ length: 5 }, (_, i) => play(dayN(i), 30, '12:00:00', 1)),
      ...Array.from({ length: 5 }, (_, i) => play(dayN(i), 30, '13:00:00', 2)),
    ];
    const fives = getMilestoneAchievements(games, plays)
      .filter(a => a.metric === Metric.PLAYS && a.threshold === 5);

    expect(fives.map(a => a.gameId).sort()).toEqual([1, 2]);
  });

  test('ignores plays for unknown games', () => {
    const plays = Array.from({ length: 5 }, (_, i) => play(dayN(i), 30, '12:00:00', 999));
    expect(getMilestoneAchievements(games, plays)).toEqual([]);
  });
});

describe('getIndexAchievements', () => {
  const games = [{ id: 1 }, { id: 2 }];
  const SELF = 3;
  const ANON = 1;

  test('returns empty array for no plays', () => {
    expect(getIndexAchievements(games, [], SELF, ANON)).toEqual([]);
  });

  test('emits h-index steps for a metric as it rises', () => {
    // Two games each reaching 2 plays -> plays h-index climbs 1 then 2
    const plays = [
      play(dayN(0), 30, '10:00:00', 1, [SELF, 10]),
      play(dayN(1), 30, '11:00:00', 2, [SELF, 11]),
      play(dayN(2), 30, '12:00:00', 1, [SELF, 10]),
      play(dayN(3), 30, '13:00:00', 2, [SELF, 11]),
    ];
    const playsH = getIndexAchievements(games, plays, SELF, ANON)
      .filter(a => a.type === AchievementType.H_INDEX && a.metric === Metric.PLAYS);

    expect(playsH.map(a => a.threshold)).toEqual([1, 2]);
    expect(playsH[1].gameId).toBe(2); // game 2's play pushed it to 2
  });

  test('emits people h-index steps, excluding self and counting anonymous per occurrence', () => {
    const plays = [
      play(dayN(0), 30, '10:00:00', 1, [SELF, ANON]), // game1: 1 anonymous -> 1
      play(dayN(1), 30, '11:00:00', 2, [SELF, 10]),   // game2: 1 named -> [1, 1]
      play(dayN(2), 30, '12:00:00', 1, [SELF, ANON]), // game1: 2 anonymous -> [2, 1]
      play(dayN(3), 30, '13:00:00', 2, [SELF, 11]),   // game2: 2 named -> [2, 2] -> 2
    ];
    const people = getIndexAchievements(games, plays, SELF, ANON)
      .filter(a => a.type === AchievementType.PEOPLE_H_INDEX);

    expect(people.map(a => a.threshold)).toEqual([1, 2]);
    expect(people.every(a => a.metric === 'people')).toBe(true);
  });

  test('emits staircase-level steps', () => {
    const plays = [
      play(dayN(0), 30, '10:00:00', 1, [SELF]),
      play(dayN(1), 30, '11:00:00', 1, [SELF]),
      play(dayN(2), 30, '12:00:00', 2, [SELF]),
      play(dayN(3), 30, '13:00:00', 2, [SELF]),
    ];
    const stair = getIndexAchievements(games, plays, SELF, ANON)
      .filter(a => a.type === AchievementType.STAIRCASE && a.metric === Metric.PLAYS);

    expect(stair.map(a => a.threshold)).toEqual([1, 2]);
  });

  test('ignores plays for unknown games', () => {
    const plays = [play(dayN(0), 6000, '10:00:00', 999, [SELF, 10])];
    expect(getIndexAchievements(games, plays, SELF, ANON)).toEqual([]);
  });

  test('final levels match the canonical all-time index calculations', () => {
    const plays = [
      play(dayN(0), 200, '10:00:00', 1, [SELF, 10, ANON]),
      play(dayN(1), 400, '11:00:00', 2, [SELF, 11]),
      play(dayN(2), 100, '12:00:00', 1, [SELF, 12]),
      play(dayN(3), 700, '13:00:00', 2, [SELF, ANON]),
      play(dayN(4), 60, '14:00:00', 1, [SELF, 10]),
    ];
    const result = getIndexAchievements(games, plays, SELF, ANON);
    const maxLevel = (type, metric) =>
      result
        .filter(a => a.type === type && a.metric === metric)
        .reduce((max, a) => Math.max(max, a.threshold), 0);

    expect(maxLevel(AchievementType.H_INDEX, Metric.HOURS)).toBe(calculateHourHIndex(plays));
    expect(maxLevel(AchievementType.H_INDEX, Metric.SESSIONS)).toBe(calculatePlaySessionHIndex(games, plays));
    expect(maxLevel(AchievementType.H_INDEX, Metric.PLAYS)).toBe(calculateTraditionalHIndex(games, plays));
    expect(maxLevel(AchievementType.PEOPLE_H_INDEX, 'people')).toBe(calculatePeopleHIndex(games, plays, SELF, ANON));
    expect(maxLevel(AchievementType.STAIRCASE, Metric.HOURS)).toBe(calculateHourStaircaseLevel(plays));
    expect(maxLevel(AchievementType.STAIRCASE, Metric.SESSIONS)).toBe(calculateSessionStaircaseLevel(games, plays));
    expect(maxLevel(AchievementType.STAIRCASE, Metric.PLAYS)).toBe(calculatePlayStaircaseLevel(games, plays));
  });
});

describe('getValueClubAchievements', () => {
  const valueGame = (id, pricePaid) => ({ id, isBaseGame: true, copies: [{ statusOwned: true, pricePaid }] });

  test('returns empty array for no plays', () => {
    expect(getValueClubAchievements([valueGame(1, 50)], [])).toEqual([]);
  });

  test('reaches value club tiers as cost per play falls', () => {
    // $10 game: cost/play hits $5 at 2 plays, $2.50 at 4, $1 at 10, $0.50 at 20
    const plays = Array.from({ length: 20 }, (_, i) => play(dayN(i), 30, '12:00:00', 1));
    const result = getValueClubAchievements([valueGame(1, 10)], plays)
      .filter(a => a.metric === Metric.PLAYS);

    expect(result.map(a => a.threshold)).toEqual([5, 2.5, 1, 0.5]);
    expect(result.every(a => a.type === AchievementType.VALUE_CLUB && a.gameId === 1)).toBe(true);
  });

  test('crosses multiple tiers in one play', () => {
    // $10 game, first play is 10 hours -> cost/hour = $1 immediately: $5, $2.50, $1 at once
    const result = getValueClubAchievements([valueGame(1, 10)], [play(dayN(0), 600, '12:00:00', 1)])
      .filter(a => a.metric === Metric.HOURS);

    expect(result.map(a => a.threshold)).toEqual([5, 2.5, 1]);
  });

  test('ignores a metric whose value is zero (missing duration)', () => {
    // Duration 0 -> hours value stays 0; expensive game so plays/sessions don't qualify either
    const result = getValueClubAchievements([valueGame(1, 100)], [play(dayN(0), 0, '12:00:00', 1)]);
    expect(result).toEqual([]);
  });

  test('ignores games without a price, unowned games, and non-base games', () => {
    const games = [
      { id: 1, isBaseGame: true, copies: [{ statusOwned: true, pricePaid: null }] }, // no price
      { id: 2, isBaseGame: true, copies: [{ statusOwned: false, pricePaid: 10 }] },   // not owned
      { id: 3, isBaseGame: false, copies: [{ statusOwned: true, pricePaid: 10 }] },   // not base game
    ];
    const plays = [
      ...Array.from({ length: 20 }, (_, i) => play(dayN(i), 30, '10:00:00', 1)),
      ...Array.from({ length: 20 }, (_, i) => play(dayN(i), 30, '11:00:00', 2)),
      ...Array.from({ length: 20 }, (_, i) => play(dayN(i), 30, '12:00:00', 3)),
    ];

    expect(getValueClubAchievements(games, plays)).toEqual([]);
  });
});

describe('getBuddyAchievements', () => {
  const SELF = 3;
  const ANON = 1;

  test('returns empty array for no plays', () => {
    expect(getBuddyAchievements([], SELF, ANON)).toEqual([]);
  });

  test('emits an hours achievement when 100 hours with a person is reached', () => {
    // 6000 minutes = 100 hours with player 10, on game 5
    const result = getBuddyAchievements([play('2024-01-01', 6000, '12:00:00', 5, [SELF, 10])], SELF, ANON);

    expect(result).toEqual([
      {
        type: AchievementType.BUDDY,
        timestamp: '2024-01-01 12:00:00',
        gameId: 5,
        playerId: 10,
        metric: Metric.HOURS,
        threshold: 100,
      },
    ]);
  });

  test('excludes self and anonymous players', () => {
    const result = getBuddyAchievements([play('2024-01-01', 6000, '12:00:00', 5, [SELF, ANON])], SELF, ANON);
    expect(result).toEqual([]);
  });

  test('emits multiple hours thresholds crossed in one play', () => {
    // 15000 minutes = 250 hours with player 10 -> 100 and 200
    const result = getBuddyAchievements([play('2024-01-01', 15000, '12:00:00', 5, [SELF, 10])], SELF, ANON)
      .filter(a => a.metric === Metric.HOURS);
    expect(result.map(a => a.threshold)).toEqual([100, 200]);
  });

  test('emits a sessions achievement on the 100th unique day with a person', () => {
    const plays = Array.from({ length: 100 }, (_, i) => play(dayN(i), 1, '12:00:00', 5, [SELF, 10]));
    const result = getBuddyAchievements(plays, SELF, ANON).filter(a => a.metric === Metric.SESSIONS);
    expect(result.map(a => a.threshold)).toEqual([100]);
  });

  test('emits a plays achievement on the 250th play with a person', () => {
    const plays = Array.from({ length: 250 }, (_, i) => play(dayN(i), 1, '12:00:00', 5, [SELF, 10]));
    const result = getBuddyAchievements(plays, SELF, ANON).filter(a => a.metric === Metric.PLAYS);
    expect(result.map(a => a.threshold)).toEqual([250]);
  });

  test('tracks each person independently', () => {
    // One 100-hour play with two people -> each reaches 100 hours
    const result = getBuddyAchievements([play('2024-01-01', 6000, '12:00:00', 5, [SELF, 10, 11])], SELF, ANON)
      .filter(a => a.metric === Metric.HOURS && a.threshold === 100);
    expect(result.map(a => a.playerId).sort()).toEqual([10, 11]);
  });
});

describe('getSoloAchievements', () => {
  const SELF = 3;

  test('returns empty array for no plays', () => {
    expect(getSoloAchievements([], SELF)).toEqual([]);
  });

  test('emits an hours achievement when 100 solo hours is reached', () => {
    // 6000 solo minutes = 100 hours, on game 5
    const result = getSoloAchievements([play('2024-01-01', 6000, '12:00:00', 5, [SELF])], SELF);

    expect(result).toEqual([
      {
        type: AchievementType.SOLO,
        timestamp: '2024-01-01 12:00:00',
        gameId: 5,
        metric: Metric.HOURS,
        threshold: 100,
      },
    ]);
  });

  test('ignores non-solo plays (multiplayer or another sole player)', () => {
    const plays = [
      play('2024-01-01', 6000, '12:00:00', 5, [SELF, 10]), // with someone else
      play('2024-01-02', 6000, '12:00:00', 5, [10]),       // someone else solo, not you
    ];
    expect(getSoloAchievements(plays, SELF)).toEqual([]);
  });

  test('emits a sessions achievement on the 100th solo day', () => {
    const plays = Array.from({ length: 100 }, (_, i) => play(dayN(i), 1, '12:00:00', 5, [SELF]));
    const result = getSoloAchievements(plays, SELF).filter(a => a.metric === Metric.SESSIONS);
    expect(result.map(a => a.threshold)).toEqual([100]);
  });

  test('emits a plays achievement on the 250th solo play', () => {
    const plays = Array.from({ length: 250 }, (_, i) => play(dayN(i), 1, '12:00:00', 5, [SELF]));
    const result = getSoloAchievements(plays, SELF).filter(a => a.metric === Metric.PLAYS);
    expect(result.map(a => a.threshold)).toEqual([250]);
  });

  test('emits multiple hours thresholds crossed in one solo play', () => {
    // 15000 solo minutes = 250 hours -> 100 and 200
    const result = getSoloAchievements([play('2024-01-01', 15000, '12:00:00', 5, [SELF])], SELF)
      .filter(a => a.metric === Metric.HOURS);
    expect(result.map(a => a.threshold)).toEqual([100, 200]);
  });
});
