/**
 * Achievements - all-time running list of logging totals and notable events.
 *
 * The structure is generator-based so new achievement kinds can be added without
 * touching the aggregation or sort logic: implement a generator that returns rows
 * of the common shape { type, timestamp, ... }, then register it in
 * ACHIEVEMENT_GENERATORS. Type-specific display (icon, color, text) lives in the
 * display layer.
 *
 * Rows carry the full play `timestamp` (used for sorting, most-recent first); the
 * display layer decides how much of it to show (e.g. just the date).
 */

import { Metric, Milestone, ValueClub } from './constants.js';
import { calculateHIndexFromSortedValues } from './h-index.js';
import { calculateStaircaseLevelFromSortedValues } from './staircase-level.js';
import { calculateCostPerMetric, getGamePricePaid, valueClubGameFilter } from './value-stats.js';

/**
 * Achievement type identifiers. Add a new entry here for each new achievement kind.
 */
const AchievementType = {
  LOGGING: 'logging',
  MILESTONE: 'milestone',
  H_INDEX: 'h-index',
  PEOPLE_H_INDEX: 'people-h-index',
  STAIRCASE: 'staircase',
  VALUE_CLUB: 'value-club',
  BUDDY: 'buddy',
  SOLO: 'solo',
  STREAK: 'streak',
  UNIQUE_GAMES: 'unique-games',
};

// Cumulative thresholds for logging totals, solo, and buddy crossings
const HOUR_THRESHOLD_STEP = 100;
const SESSION_THRESHOLD_STEP = 100;
const PLAY_THRESHOLD_STEP = 250;

// Threshold step for the unique-games-played count
const UNIQUE_GAMES_THRESHOLD_STEP = 25;

// Pseudo-metric for the people h-index (not a per-game hours/sessions/plays value)
const PEOPLE_METRIC = 'people';

// Sort plays chronologically (oldest first) without mutating the input.
function sortByTimestamp(plays) {
  return [...plays].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

// ---------------------------------------------------------------------------
// Cumulative totals: hours/sessions/plays crossing round-number thresholds
// (logging totals across all plays, solo totals, and per-buddy totals)
// ---------------------------------------------------------------------------

/**
 * Create a stateful tracker for one entity's cumulative hours/sessions/plays. Feed
 * it plays in chronological order; each call returns the { metric, threshold }
 * crossings (every 100 hours, 100 sessions, 250 plays) triggered by that play.
 * @returns {(play: Object) => Array<{ metric: string, threshold: number }>}
 */
function makeCumulativeMetricTracker() {
  let cumulativeMinutes = 0;
  const uniqueDays = new Set();
  let cumulativePlays = 0;
  let nextHourThreshold = HOUR_THRESHOLD_STEP;
  let nextSessionThreshold = SESSION_THRESHOLD_STEP;
  let nextPlayThreshold = PLAY_THRESHOLD_STEP;

  return (play) => {
    const crossings = [];

    cumulativeMinutes += play.durationMin;
    const hours = Math.floor(cumulativeMinutes / 60);
    while (nextHourThreshold <= hours) {
      crossings.push({ metric: Metric.HOURS, threshold: nextHourThreshold });
      nextHourThreshold += HOUR_THRESHOLD_STEP;
    }

    const prevSessions = uniqueDays.size;
    uniqueDays.add(play.date);
    if (uniqueDays.size > prevSessions) {
      while (nextSessionThreshold <= uniqueDays.size) {
        crossings.push({ metric: Metric.SESSIONS, threshold: nextSessionThreshold });
        nextSessionThreshold += SESSION_THRESHOLD_STEP;
      }
    }

    cumulativePlays++;
    while (nextPlayThreshold <= cumulativePlays) {
      crossings.push({ metric: Metric.PLAYS, threshold: nextPlayThreshold });
      nextPlayThreshold += PLAY_THRESHOLD_STEP;
    }

    return crossings;
  };
}

/**
 * Generate cumulative threshold-crossing achievements over a set of plays: total
 * hours, sessions, and plays crossing round-number thresholds. Shared by the
 * all-play logging totals and the solo totals (which pass pre-filtered plays).
 * @param {Array} plays - Array of play objects (already scoped to the desired set)
 * @param {string} type - AchievementType to tag each emitted row with
 * @returns {Array} Rows of { type, timestamp, gameId, metric, threshold }
 */
function getCumulativeThresholdCrossings(plays, type) {
  const track = makeCumulativeMetricTracker();
  const achievements = [];
  for (const play of sortByTimestamp(plays)) {
    for (const { metric, threshold } of track(play)) {
      achievements.push({ type, timestamp: play.timestamp, gameId: play.gameId, metric, threshold });
    }
  }
  return achievements;
}

/**
 * Generate cumulative logging totals across all logged plays.
 * @param {Array} plays - Array of play objects
 * @returns {Array} Rows of { type, timestamp, gameId, metric, threshold }
 */
function getCumulativeLoggingTotals(plays) {
  return getCumulativeThresholdCrossings(plays, AchievementType.LOGGING);
}

/**
 * Generate cumulative solo totals: hours, sessions, and plays crossing round-number
 * thresholds, counting only solo plays (you as the sole player).
 * @param {Array} plays - Array of play objects
 * @param {number} selfPlayerId - Player ID representing the user
 * @returns {Array} Rows of { type, timestamp, gameId, metric, threshold }
 */
function getSoloAchievements(plays, selfPlayerId) {
  const soloPlays = plays.filter(play => play.players.length === 1 && play.players[0] === selfPlayerId);
  return getCumulativeThresholdCrossings(soloPlays, AchievementType.SOLO);
}

/**
 * Generate per-buddy achievements: each time the cumulative hours, sessions,
 * or plays you've logged *with* a specific person crosses a round-number threshold
 * (every 100 hours, 100 sessions, 250 plays). Self and anonymous players are
 * excluded. The person is the subject; the game whose play triggered it is the trigger.
 * @param {Array} plays - Array of play objects
 * @param {number} selfPlayerId - Player ID representing the user (excluded)
 * @param {number} anonymousPlayerId - Player ID for anonymous players (excluded)
 * @returns {Array} Rows of { type, timestamp, gameId, playerId, metric, threshold }
 */
function getBuddyAchievements(plays, selfPlayerId, anonymousPlayerId) {
  const trackerByPlayer = new Map();
  const achievements = [];

  for (const play of sortByTimestamp(plays)) {
    for (const playerId of play.players) {
      if (playerId === selfPlayerId || playerId === anonymousPlayerId) continue;

      if (!trackerByPlayer.has(playerId)) {
        trackerByPlayer.set(playerId, makeCumulativeMetricTracker());
      }
      for (const { metric, threshold } of trackerByPlayer.get(playerId)(play)) {
        achievements.push({
          type: AchievementType.BUDDY,
          timestamp: play.timestamp,
          gameId: play.gameId,
          playerId,
          metric,
          threshold,
        });
      }
    }
  }

  return achievements;
}

// ---------------------------------------------------------------------------
// Per-game tier crossings (milestones and value clubs)
// ---------------------------------------------------------------------------

/**
 * Generate per-game tier-crossing achievements. Walks plays chronologically, keeps
 * per-game cumulative hours/sessions/plays, and for each metric emits a row each time
 * the game reaches the next tier in `tierCollection` (its own direction — ascending or
 * descending — decides "reached"). `isEligible(gameId)` limits which games are tracked;
 * `testValue(gameId, metric, value)` returns the number compared against the tier, or
 * null to skip that metric for this play.
 * @returns {Array} Rows of { type, timestamp, gameId, metric, threshold }
 */
function getPerGameTierCrossings(plays, isEligible, tierCollection, type, testValue) {
  const gameProgress = new Map();
  const achievements = [];

  for (const play of sortByTimestamp(plays)) {
    if (!isEligible(play.gameId)) continue;

    if (!gameProgress.has(play.gameId)) {
      gameProgress.set(play.gameId, {
        totalMinutes: 0,
        uniqueDates: new Set(),
        playCount: 0,
        nextTierIndex: { [Metric.HOURS]: 0, [Metric.SESSIONS]: 0, [Metric.PLAYS]: 0 },
      });
    }
    const progress = gameProgress.get(play.gameId);

    progress.totalMinutes += play.durationMin;
    progress.uniqueDates.add(play.date);
    progress.playCount += 1;

    const values = {
      [Metric.HOURS]: progress.totalMinutes / 60,
      [Metric.SESSIONS]: progress.uniqueDates.size,
      [Metric.PLAYS]: progress.playCount,
    };

    for (const metric of [Metric.HOURS, Metric.SESSIONS, Metric.PLAYS]) {
      const value = testValue(play.gameId, metric, values[metric]);
      if (value === null) continue;
      while (progress.nextTierIndex[metric] < tierCollection.values.length &&
             tierCollection.isValueAtOrBeyondTier(value, tierCollection.values[progress.nextTierIndex[metric]])) {
        achievements.push({
          type,
          timestamp: play.timestamp,
          gameId: play.gameId,
          metric,
          threshold: tierCollection.values[progress.nextTierIndex[metric]],
        });
        progress.nextTierIndex[metric] += 1;
      }
    }
  }

  return achievements;
}

/**
 * Generate per-game milestone achievements: each time a game's cumulative hours,
 * sessions, or plays reaches a Milestone tier (five, dime, quarter, century).
 * The game is the subject of the achievement.
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @returns {Array} Rows of { type, timestamp, gameId, metric, threshold }
 */
function getMilestoneAchievements(games, plays) {
  const validGameIds = new Set(games.map(g => g.id));
  return getPerGameTierCrossings(
    plays,
    gameId => validGameIds.has(gameId),
    Milestone,
    AchievementType.MILESTONE,
    (gameId, metric, value) => value,
  );
}

/**
 * Generate value-club achievements: each time an owned base game's cost per metric
 * (hours, sessions, or plays) drops to a new ValueClub tier ($5, $2.50, $1, $0.50).
 * Cost per metric falls as the game is played more, so tiers are reached in order.
 * The game is the subject of the achievement.
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @returns {Array} Rows of { type, timestamp, gameId, metric, threshold }
 */
function getValueClubAchievements(games, plays) {
  // Eligible games: owned base games with a known price paid
  const pricePaidByGame = new Map();
  for (const game of games) {
    if (!valueClubGameFilter(game)) continue;
    const pricePaid = getGamePricePaid(game);
    if (pricePaid === null) continue;
    pricePaidByGame.set(game.id, pricePaid);
  }

  return getPerGameTierCrossings(
    plays,
    gameId => pricePaidByGame.has(gameId),
    ValueClub,
    AchievementType.VALUE_CLUB,
    // Cost per metric; null when the metric is still 0 (nothing to divide yet)
    (gameId, metric, value) => value === 0 ? null : calculateCostPerMetric(pricePaidByGame.get(gameId), value),
  );
}

// ---------------------------------------------------------------------------
// Index progression (h-index, people h-index, staircase level)
// ---------------------------------------------------------------------------

// Build a descending-sorted array of per-game values from an accumulator map.
function sortedDescValues(perGameMap, valueOf) {
  return Array.from(perGameMap.values(), valueOf).sort((a, b) => b - a);
}

/**
 * Generate index-progression achievements: one each time an h-index (hours,
 * sessions, plays), the people h-index, or a staircase level (hours, sessions,
 * plays) rises to a new value. These indices are monotonic over all time, so a
 * rise is always attributable to the game whose play triggered the recompute.
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @param {number} selfPlayerId - Player ID representing the user (excluded from people h-index)
 * @param {number} anonymousPlayerId - Player ID for anonymous players (counted per occurrence)
 * @returns {Array} Rows of { type, timestamp, gameId, metric, threshold }
 */
function getIndexAchievements(games, plays, selfPlayerId, anonymousPlayerId) {
  const validGameIds = new Set(games.map(g => g.id));
  const sortedPlays = sortByTimestamp(plays);

  const minutesPerGame = new Map();
  const datesPerGame = new Map();
  const playsPerGame = new Map();
  const peoplePerGame = new Map();

  // Each tracker recomputes its index from the current per-game values and
  // remembers the highest value reached so far (indices never decrease all-time).
  const trackers = [
    { type: AchievementType.H_INDEX, metric: Metric.HOURS, index: calculateHIndexFromSortedValues, reached: 0 },
    { type: AchievementType.H_INDEX, metric: Metric.SESSIONS, index: calculateHIndexFromSortedValues, reached: 0 },
    { type: AchievementType.H_INDEX, metric: Metric.PLAYS, index: calculateHIndexFromSortedValues, reached: 0 },
    { type: AchievementType.PEOPLE_H_INDEX, metric: PEOPLE_METRIC, index: calculateHIndexFromSortedValues, reached: 0 },
    { type: AchievementType.STAIRCASE, metric: Metric.HOURS, index: calculateStaircaseLevelFromSortedValues, reached: 0 },
    { type: AchievementType.STAIRCASE, metric: Metric.SESSIONS, index: calculateStaircaseLevelFromSortedValues, reached: 0 },
    { type: AchievementType.STAIRCASE, metric: Metric.PLAYS, index: calculateStaircaseLevelFromSortedValues, reached: 0 },
  ];

  const achievements = [];

  for (const play of sortedPlays) {
    if (!validGameIds.has(play.gameId)) continue;

    minutesPerGame.set(play.gameId, (minutesPerGame.get(play.gameId) || 0) + play.durationMin);
    if (!datesPerGame.has(play.gameId)) datesPerGame.set(play.gameId, new Set());
    datesPerGame.get(play.gameId).add(play.date);
    playsPerGame.set(play.gameId, (playsPerGame.get(play.gameId) || 0) + 1);
    if (!peoplePerGame.has(play.gameId)) peoplePerGame.set(play.gameId, { players: new Set(), anonymousCount: 0 });
    const people = peoplePerGame.get(play.gameId);
    for (const playerId of play.players) {
      if (playerId === selfPlayerId) continue;
      if (playerId === anonymousPlayerId) people.anonymousCount++;
      else people.players.add(playerId);
    }

    const valuesByMetric = {
      [Metric.HOURS]: sortedDescValues(minutesPerGame, minutes => minutes / 60),
      [Metric.SESSIONS]: sortedDescValues(datesPerGame, dates => dates.size),
      [Metric.PLAYS]: sortedDescValues(playsPerGame, count => count),
      [PEOPLE_METRIC]: sortedDescValues(peoplePerGame, p => p.players.size + p.anonymousCount),
    };

    for (const tracker of trackers) {
      const level = tracker.index(valuesByMetric[tracker.metric]);
      // A single play can lift an index by more than one step; emit each new level.
      for (let newLevel = tracker.reached + 1; newLevel <= level; newLevel++) {
        achievements.push({
          type: tracker.type,
          timestamp: play.timestamp,
          gameId: play.gameId,
          metric: tracker.metric,
          threshold: newLevel,
        });
      }
      tracker.reached = level;
    }
  }

  return achievements;
}

// ---------------------------------------------------------------------------
// Play streaks (consecutive-day records)
// ---------------------------------------------------------------------------

// Number of days since the epoch for a YYYY-MM-DD date (for consecutive-day math).
function dayNumber(date) {
  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / 86400000;
}

/**
 * Generate play-streak achievements: each time a *completed* streak of consecutive
 * calendar days with plays sets a new personal record, emit one achievement (at the
 * streak's end) carrying the streak length and its start/end dates. The current
 * ongoing streak (no gap after it yet) is not emitted. These have no game and no
 * metric.
 * @param {Array} plays - Array of play objects
 * @returns {Array} Rows of { type, timestamp, threshold, streakStart, streakEnd }
 */
function getStreakAchievements(plays) {
  const dates = [...new Set(plays.map(play => play.date))].sort();
  if (dates.length === 0) return [];

  // Latest play timestamp per date, so a streak's achievement is stamped at its last play
  const latestTimestampByDate = new Map();
  for (const play of plays) {
    const current = latestTimestampByDate.get(play.date);
    if (!current || play.timestamp > current) {
      latestTimestampByDate.set(play.date, play.timestamp);
    }
  }

  const achievements = [];
  let record = 1; // a lone day is the baseline, not a streak
  let streakStart = dates[0];
  let streakLength = 1;

  for (let i = 1; i < dates.length; i++) {
    if (dayNumber(dates[i]) - dayNumber(dates[i - 1]) === 1) {
      streakLength++;
    } else {
      // The streak ending at dates[i - 1] is now complete (a gap follows)
      if (streakLength > record) {
        achievements.push({
          type: AchievementType.STREAK,
          timestamp: latestTimestampByDate.get(dates[i - 1]),
          threshold: streakLength,
          streakStart,
          streakEnd: dates[i - 1],
        });
        record = streakLength;
      }
      streakStart = dates[i];
      streakLength = 1;
    }
  }

  // The final streak is still ongoing (no gap yet), so it is intentionally not emitted.
  return achievements;
}

// ---------------------------------------------------------------------------
// Unique games played
// ---------------------------------------------------------------------------

/**
 * Generate unique-games-played achievements: each time the running count of distinct
 * games you've played crosses a round-number threshold (every 25). The triggering
 * game is the newly played game that reached the count. Has no metric.
 * @param {Array} plays - Array of play objects
 * @returns {Array} Rows of { type, timestamp, gameId, threshold }
 */
function getUniqueGamesAchievements(plays) {
  const sortedPlays = sortByTimestamp(plays);

  const seenGameIds = new Set();
  const achievements = [];
  let nextThreshold = UNIQUE_GAMES_THRESHOLD_STEP;

  for (const play of sortedPlays) {
    if (seenGameIds.has(play.gameId)) continue;
    seenGameIds.add(play.gameId);

    while (nextThreshold <= seenGameIds.size) {
      achievements.push({
        type: AchievementType.UNIQUE_GAMES,
        timestamp: play.timestamp,
        gameId: play.gameId,
        threshold: nextThreshold,
      });
      nextThreshold += UNIQUE_GAMES_THRESHOLD_STEP;
    }
  }

  return achievements;
}

// ---------------------------------------------------------------------------
// Aggregation: run every generator and order the combined list
// ---------------------------------------------------------------------------

/**
 * Registry of achievement generators. Each receives the shared data context and
 * returns an array of achievement rows. Add new generators here to extend the list.
 */
const ACHIEVEMENT_GENERATORS = [
  (context) => getCumulativeLoggingTotals(context.plays),
  (context) => getSoloAchievements(context.plays, context.selfPlayerId),
  (context) => getBuddyAchievements(context.plays, context.selfPlayerId, context.anonymousPlayerId),
  (context) => getMilestoneAchievements(context.games, context.plays),
  (context) => getValueClubAchievements(context.games, context.plays),
  (context) => getIndexAchievements(context.games, context.plays, context.selfPlayerId, context.anonymousPlayerId),
  (context) => getStreakAchievements(context.plays),
  (context) => getUniqueGamesAchievements(context.plays),
];

const metricOrder = { [Metric.HOURS]: 0, [Metric.SESSIONS]: 1, [Metric.PLAYS]: 2, [PEOPLE_METRIC]: 3 };

// Sort rank for a metric; metric-less rows (e.g. streaks) rank last.
function metricRank(metric) {
  return metricOrder[metric] ?? 4;
}

/**
 * Comparator ordering achievements most-recent first by play timestamp. When a
 * single play crosses several thresholds at once (same timestamp), fall back to a
 * deterministic tiebreak: metric convention (hours, sessions, plays), then
 * threshold, then achievement type.
 * @param {Object} a - Achievement row
 * @param {Object} b - Achievement row
 * @returns {number} Comparison result
 */
function compareAchievements(a, b) {
  if (a.timestamp !== b.timestamp) {
    return b.timestamp.localeCompare(a.timestamp);
  }
  const orderDiff = metricRank(a.metric) - metricRank(b.metric);
  if (orderDiff !== 0) {
    return orderDiff;
  }
  if (a.threshold !== b.threshold) {
    return a.threshold - b.threshold;
  }
  return a.type.localeCompare(b.type);
}

/**
 * Get the all-time running list of achievements, most recent first.
 * @param {Object} context - Shared data context: { games, plays }
 * @returns {Array} Achievement rows of shape { type, timestamp, ... } sorted most-recent first
 */
function getAchievements(context) {
  return ACHIEVEMENT_GENERATORS
    .flatMap(generate => generate(context))
    .sort(compareAchievements);
}

export {
  AchievementType,
  getAchievements,
  getCumulativeLoggingTotals,
  getSoloAchievements,
  getBuddyAchievements,
  getMilestoneAchievements,
  getValueClubAchievements,
  getIndexAchievements,
  getStreakAchievements,
  getUniqueGamesAchievements,
};
