/**
 * Achievements - all-time running list of logging achievements and notable events.
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

import { Metric, Milestone } from './constants.js';

/**
 * Achievement type identifiers. Add a new entry here for each new achievement kind.
 * ("Milestone" is a per-game play-count/metric tier — five, dime, quarter, century;
 * cumulative total-metric thresholds are "logging achievements" — see AGENTS.md.)
 */
const AchievementType = {
  LOGGING: 'logging',
  MILESTONE: 'milestone',
};

// Cumulative thresholds for logging achievements (matches Year in Review logging achievements)
const HOUR_THRESHOLD_STEP = 100;
const SESSION_THRESHOLD_STEP = 100;
const PLAY_THRESHOLD_STEP = 250;

/**
 * Generate cumulative logging achievements across all logged plays:
 * total hours, sessions, and plays crossing round-number thresholds.
 * @param {Array} plays - Array of play objects
 * @returns {Array} Rows of { type, timestamp, gameId, metric, threshold }
 */
function getCumulativeLoggingAchievements(plays) {
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

/**
 * Registry of achievement generators. Each receives the shared data context and
 * returns an array of achievement rows. Add new generators here to extend the list.
 */
const ACHIEVEMENT_GENERATORS = [
  (context) => getCumulativeLoggingAchievements(context.plays),
  (context) => getMilestoneAchievements(context.games, context.plays),
];

const metricOrder = { [Metric.HOURS]: 0, [Metric.SESSIONS]: 1, [Metric.PLAYS]: 2 };

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
  getCumulativeLoggingAchievements,
  getMilestoneAchievements,
};
