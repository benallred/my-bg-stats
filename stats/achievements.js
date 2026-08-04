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
  INDIVIDUAL: 'individual',
};

// Pseudo-metric for the people h-index (which is not a per-game hours/sessions/plays value)
const PEOPLE_METRIC = 'people';

// Cumulative thresholds for logging totals (matches Year in Review logging totals)
const HOUR_THRESHOLD_STEP = 100;
const SESSION_THRESHOLD_STEP = 100;
const PLAY_THRESHOLD_STEP = 250;

/**
 * Generate cumulative logging totals across all logged plays:
 * total hours, sessions, and plays crossing round-number thresholds.
 * @param {Array} plays - Array of play objects
 * @returns {Array} Rows of { type, timestamp, gameId, metric, threshold }
 */
function getCumulativeLoggingTotals(plays) {
  // Sort plays chronologically (oldest first) so thresholds cross in order
  const sortedPlays = [...plays].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  let cumulativeMinutes = 0;
  const uniqueDays = new Set();
  let cumulativePlays = 0;

  const achievements = [];
  let nextHourThreshold = HOUR_THRESHOLD_STEP;
  let nextSessionThreshold = SESSION_THRESHOLD_STEP;
  let nextPlayThreshold = PLAY_THRESHOLD_STEP;

  for (const play of sortedPlays) {
    // Track hours
    cumulativeMinutes += play.durationMin;
    const newHours = Math.floor(cumulativeMinutes / 60);
    while (nextHourThreshold <= newHours) {
      achievements.push({
        type: AchievementType.LOGGING,
        timestamp: play.timestamp,
        gameId: play.gameId,
        metric: Metric.HOURS,
        threshold: nextHourThreshold,
      });
      nextHourThreshold += HOUR_THRESHOLD_STEP;
    }

    // Track sessions (only count if this is a new unique day)
    const prevSessions = uniqueDays.size;
    uniqueDays.add(play.date);
    const newSessions = uniqueDays.size;
    if (newSessions > prevSessions) {
      while (nextSessionThreshold <= newSessions) {
        achievements.push({
          type: AchievementType.LOGGING,
          timestamp: play.timestamp,
          gameId: play.gameId,
          metric: Metric.SESSIONS,
          threshold: nextSessionThreshold,
        });
        nextSessionThreshold += SESSION_THRESHOLD_STEP;
      }
    }

    // Track plays
    cumulativePlays++;
    while (nextPlayThreshold <= cumulativePlays) {
      achievements.push({
        type: AchievementType.LOGGING,
        timestamp: play.timestamp,
        gameId: play.gameId,
        metric: Metric.PLAYS,
        threshold: nextPlayThreshold,
      });
      nextPlayThreshold += PLAY_THRESHOLD_STEP;
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
  const sortedPlays = [...plays].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  // Per-game running totals plus the index of the next tier not yet reached per metric
  const gameProgress = new Map();
  const achievements = [];

  for (const play of sortedPlays) {
    if (!validGameIds.has(play.gameId)) continue;

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
      while (progress.nextTierIndex[metric] < Milestone.values.length &&
             values[metric] >= Milestone.values[progress.nextTierIndex[metric]]) {
        achievements.push({
          type: AchievementType.MILESTONE,
          timestamp: play.timestamp,
          gameId: play.gameId,
          metric,
          threshold: Milestone.values[progress.nextTierIndex[metric]],
        });
        progress.nextTierIndex[metric] += 1;
      }
    }
  }

  return achievements;
}

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
  const sortedPlays = [...plays].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

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

  const sortedPlays = [...plays].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  // Per-game running totals plus the index of the next tier not yet reached per metric
  const gameProgress = new Map();
  const achievements = [];

  for (const play of sortedPlays) {
    if (!pricePaidByGame.has(play.gameId)) continue;

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

    const pricePaid = pricePaidByGame.get(play.gameId);
    const values = {
      [Metric.HOURS]: progress.totalMinutes / 60,
      [Metric.SESSIONS]: progress.uniqueDates.size,
      [Metric.PLAYS]: progress.playCount,
    };

    for (const metric of [Metric.HOURS, Metric.SESSIONS, Metric.PLAYS]) {
      const metricValue = values[metric];
      if (metricValue === 0) continue;
      const costPerMetric = calculateCostPerMetric(pricePaid, metricValue);
      // ValueClub tiers descend ($5 → $0.50); a lower cost per metric reaches a better tier
      while (progress.nextTierIndex[metric] < ValueClub.values.length &&
             costPerMetric <= ValueClub.values[progress.nextTierIndex[metric]]) {
        achievements.push({
          type: AchievementType.VALUE_CLUB,
          timestamp: play.timestamp,
          gameId: play.gameId,
          metric,
          threshold: ValueClub.values[progress.nextTierIndex[metric]],
        });
        progress.nextTierIndex[metric] += 1;
      }
    }
  }

  return achievements;
}

/**
 * Generate per-individual achievements: each time the cumulative hours, sessions,
 * or plays you've logged *with* a specific person crosses a round-number threshold
 * (every 100 hours, 100 sessions, 250 plays). Self and anonymous players are
 * excluded. The person is the subject; the game whose play triggered it is the trigger.
 * @param {Array} plays - Array of play objects
 * @param {number} selfPlayerId - Player ID representing the user (excluded)
 * @param {number} anonymousPlayerId - Player ID for anonymous players (excluded)
 * @returns {Array} Rows of { type, timestamp, gameId, playerId, metric, threshold }
 */
function getIndividualAchievements(plays, selfPlayerId, anonymousPlayerId) {
  const sortedPlays = [...plays].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  // Per-person running totals and the next threshold not yet reached per metric
  const perPlayer = new Map();
  const achievements = [];

  for (const play of sortedPlays) {
    for (const playerId of play.players) {
      if (playerId === selfPlayerId || playerId === anonymousPlayerId) continue;

      if (!perPlayer.has(playerId)) {
        perPlayer.set(playerId, {
          totalMinutes: 0,
          uniqueDates: new Set(),
          playCount: 0,
          nextHourThreshold: HOUR_THRESHOLD_STEP,
          nextSessionThreshold: SESSION_THRESHOLD_STEP,
          nextPlayThreshold: PLAY_THRESHOLD_STEP,
        });
      }
      const progress = perPlayer.get(playerId);

      // Hours with this person
      progress.totalMinutes += play.durationMin;
      const hours = Math.floor(progress.totalMinutes / 60);
      while (progress.nextHourThreshold <= hours) {
        achievements.push({
          type: AchievementType.INDIVIDUAL,
          timestamp: play.timestamp,
          gameId: play.gameId,
          playerId,
          metric: Metric.HOURS,
          threshold: progress.nextHourThreshold,
        });
        progress.nextHourThreshold += HOUR_THRESHOLD_STEP;
      }

      // Sessions with this person (unique days)
      const prevSessions = progress.uniqueDates.size;
      progress.uniqueDates.add(play.date);
      if (progress.uniqueDates.size > prevSessions) {
        while (progress.nextSessionThreshold <= progress.uniqueDates.size) {
          achievements.push({
            type: AchievementType.INDIVIDUAL,
            timestamp: play.timestamp,
            gameId: play.gameId,
            playerId,
            metric: Metric.SESSIONS,
            threshold: progress.nextSessionThreshold,
          });
          progress.nextSessionThreshold += SESSION_THRESHOLD_STEP;
        }
      }

      // Plays with this person
      progress.playCount += 1;
      while (progress.nextPlayThreshold <= progress.playCount) {
        achievements.push({
          type: AchievementType.INDIVIDUAL,
          timestamp: play.timestamp,
          gameId: play.gameId,
          playerId,
          metric: Metric.PLAYS,
          threshold: progress.nextPlayThreshold,
        });
        progress.nextPlayThreshold += PLAY_THRESHOLD_STEP;
      }
    }
  }

  return achievements;
}

/**
 * Registry of achievement generators. Each receives the shared data context and
 * returns an array of achievement rows. Add new generators here to extend the list.
 */
const ACHIEVEMENT_GENERATORS = [
  (context) => getCumulativeLoggingTotals(context.plays),
  (context) => getMilestoneAchievements(context.games, context.plays),
  (context) => getIndexAchievements(context.games, context.plays, context.selfPlayerId, context.anonymousPlayerId),
  (context) => getValueClubAchievements(context.games, context.plays),
  (context) => getIndividualAchievements(context.plays, context.selfPlayerId, context.anonymousPlayerId),
];

const metricOrder = { [Metric.HOURS]: 0, [Metric.SESSIONS]: 1, [Metric.PLAYS]: 2, [PEOPLE_METRIC]: 3 };

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
  const orderDiff = metricOrder[a.metric] - metricOrder[b.metric];
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
  getMilestoneAchievements,
  getIndexAchievements,
  getValueClubAchievements,
  getIndividualAchievements,
};
