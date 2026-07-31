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

import { Metric } from './constants.js';

/**
 * Achievement type identifiers. Add a new entry here for each new achievement kind.
 * ("Milestone" is reserved for per-game play-count tiers; cumulative total-metric
 * thresholds are "logging achievements" — see AGENTS.md terminology.)
 */
const AchievementType = {
  LOGGING: 'logging',
};

// Cumulative thresholds for logging achievements (matches Year in Review logging achievements)
const HOUR_THRESHOLD_STEP = 100;
const SESSION_THRESHOLD_STEP = 100;
const PLAY_THRESHOLD_STEP = 250;

/**
 * Generate cumulative logging achievements across all logged plays:
 * total hours, sessions, and plays crossing round-number thresholds.
 * @param {Array} plays - Array of play objects
 * @returns {Array} Rows of { type, timestamp, metric, threshold }
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
        metric: Metric.PLAYS,
        threshold: nextPlayThreshold,
      });
      nextPlayThreshold += PLAY_THRESHOLD_STEP;
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
];

const metricOrder = { [Metric.HOURS]: 0, [Metric.SESSIONS]: 1, [Metric.PLAYS]: 2 };

/**
 * Comparator ordering achievements most-recent first by play timestamp. When a
 * single play crosses several thresholds at once (same timestamp), fall back to a
 * deterministic tiebreak: metric convention (hours, sessions, plays), then threshold.
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
  return a.threshold - b.threshold;
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
};
