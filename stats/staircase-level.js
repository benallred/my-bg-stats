/**
 * Staircase Level calculation functions
 *
 * The staircase level is the greatest N where, for each rank i (1-indexed),
 * the game at rank i has metric value >= N - i + 1 (a descending staircase threshold).
 * Algorithm: compute adjustedValue = value[i] + i for each 0-based index,
 * track the running minimum, and the staircase level is the largest i+1
 * where runningMin >= i+1.
 */

import { Metric } from './constants.js';
import { isPlayInYear } from './play-helpers.js';

/**
 * Helper: Calculate staircase level from sorted values
 * @param {Array} sortedValues - Array of values sorted in descending order
 * @returns {number} staircase level value
 */
function calculateStaircaseLevelFromSortedValues(sortedValues) {
  let staircaseLevel = 0;
  let runningMin = Infinity;
  for (let i = 0; i < sortedValues.length; i++) {
    const adjustedValue = sortedValues[i] + i;
    runningMin = Math.min(runningMin, adjustedValue);
    if (runningMin >= i + 1) {
      staircaseLevel = i + 1;
    } else {
      break;
    }
  }
  return staircaseLevel;
}

/**
 * Calculate play staircase level (counts all play entries)
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @param {number|null} year - Optional year filter
 * @returns {number} staircase level value
 */
function calculatePlayStaircaseLevel(games, plays, year = null) {
  // Count plays per game
  const playCountsPerGame = new Map();

  plays.forEach(play => {
    if (!isPlayInYear(play, year)) return;

    const count = playCountsPerGame.get(play.gameId) || 0;
    playCountsPerGame.set(play.gameId, count + 1);
  });

  // Get sorted counts
  const counts = Array.from(playCountsPerGame.values()).sort((a, b) => b - a);

  return calculateStaircaseLevelFromSortedValues(counts);
}

/**
 * Calculate session staircase level (unique days per game)
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @param {number|null} year - Optional year filter
 * @returns {number} staircase level value
 */
function calculateSessionStaircaseLevel(games, plays, year = null) {
  // Count unique days per game
  const uniqueDaysPerGame = new Map();

  plays.forEach(play => {
    if (!isPlayInYear(play, year)) return;

    if (!uniqueDaysPerGame.has(play.gameId)) {
      uniqueDaysPerGame.set(play.gameId, new Set());
    }
    uniqueDaysPerGame.get(play.gameId).add(play.date);
  });

  // Get sorted counts
  const counts = Array.from(uniqueDaysPerGame.values())
    .map(dateSet => dateSet.size)
    .sort((a, b) => b - a);

  return calculateStaircaseLevelFromSortedValues(counts);
}

/**
 * Calculate hour staircase level (total hours played per game)
 * @param {Array} plays - Array of play objects
 * @param {number|null} year - Optional year filter
 * @returns {number} staircase level value
 */
function calculateHourStaircaseLevel(plays, year = null) {
  // Sum minutes per game
  const minutesPerGame = new Map();

  plays.forEach(play => {
    if (!isPlayInYear(play, year)) return;

    const total = minutesPerGame.get(play.gameId) || 0;
    minutesPerGame.set(play.gameId, total + play.durationMin);
  });

  // Convert to hours and sort
  const hours = Array.from(minutesPerGame.values())
    .map(min => min / 60)
    .sort((a, b) => b - a);

  return calculateStaircaseLevelFromSortedValues(hours);
}

/**
 * Calculate all-time staircase level through a specific year (includes all plays up to and including that year)
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @param {number} year - Year to calculate through (inclusive)
 * @param {string} metric - Metric type: 'plays', 'sessions', or 'hours'
 * @returns {number} staircase level value
 */
function calculateAllTimeStaircaseLevelThroughYear(games, plays, year, metric) {
  // Filter plays up to and including the specified year
  const filteredPlays = plays.filter(play => {
    const playYear = parseInt(play.date.substring(0, 4));
    return playYear <= year;
  });

  // Calculate staircase level based on metric type
  switch (metric) {
    case Metric.SESSIONS:
      return calculateSessionStaircaseLevel(games, filteredPlays);
    case Metric.PLAYS:
      return calculatePlayStaircaseLevel(games, filteredPlays);
    case Metric.HOURS:
    default:
      return calculateHourStaircaseLevel(filteredPlays);
  }
}

/**
 * Calculate year-over-year staircase level increase
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @param {number} year - Year to calculate increase for
 * @param {string} metric - Metric type: 'plays', 'sessions', or 'hours'
 * @returns {number} staircase level increase (can be negative or zero)
 */
function calculateStaircaseLevelIncrease(games, plays, year, metric) {
  const currentYearLevel = calculateAllTimeStaircaseLevelThroughYear(games, plays, year, metric);
  const previousYearLevel = calculateAllTimeStaircaseLevelThroughYear(games, plays, year - 1, metric);
  return currentYearLevel - previousYearLevel;
}

/**
 * Get detailed staircase level breakdown (games sorted by count)
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @param {number|null} year - Optional year filter
 * @param {boolean} usePlaySessions - True for session staircase level, false for play count
 * @returns {Array} Array of {game, count} sorted by count descending
 */
function getStaircaseLevelBreakdown(games, plays, year = null, usePlaySessions = false) {
  const countsPerGame = new Map();

  if (usePlaySessions) {
    // Count unique days per game
    const uniqueDaysPerGame = new Map();
    plays.forEach(play => {
      if (!isPlayInYear(play, year)) return;
      if (!uniqueDaysPerGame.has(play.gameId)) {
        uniqueDaysPerGame.set(play.gameId, new Set());
      }
      uniqueDaysPerGame.get(play.gameId).add(play.date);
    });
    uniqueDaysPerGame.forEach((dateSet, gameId) => {
      countsPerGame.set(gameId, dateSet.size);
    });
  } else {
    // Count all plays per game
    plays.forEach(play => {
      if (!isPlayInYear(play, year)) return;
      const count = countsPerGame.get(play.gameId) || 0;
      countsPerGame.set(play.gameId, count + 1);
    });
  }

  // Convert to array with game objects
  const breakdown = [];
  countsPerGame.forEach((count, gameId) => {
    const game = games.find(g => g.id === gameId);
    if (game) {
      breakdown.push({ game, count });
    }
  });

  // Sort by count descending
  breakdown.sort((a, b) => b.count - a.count);

  return breakdown;
}

/**
 * Get detailed hour staircase level breakdown (games sorted by hours)
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @param {number|null} year - Optional year filter
 * @returns {Array} Array of {game, hours} sorted by hours descending
 */
function getHourStaircaseLevelBreakdown(games, plays, year = null) {
  const minutesPerGame = new Map();

  // Sum minutes per game
  plays.forEach(play => {
    if (!isPlayInYear(play, year)) return;
    const total = minutesPerGame.get(play.gameId) || 0;
    minutesPerGame.set(play.gameId, total + play.durationMin);
  });

  // Convert to array with game objects and hours
  const breakdown = [];
  minutesPerGame.forEach((minutes, gameId) => {
    const game = games.find(g => g.id === gameId);
    if (game) {
      breakdown.push({ game, hours: minutes / 60 });
    }
  });

  // Sort by hours descending
  breakdown.sort((a, b) => b.hours - a.hours);

  return breakdown;
}

/**
 * Get games newly added to staircase level in a specific year
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @param {number} year - Year to analyze
 * @param {string} metric - Metric type: 'plays', 'sessions', or 'hours'
 * @returns {Array} Array of games newly contributing to staircase level this year
 */
function getNewStaircaseLevelGames(games, plays, year, metric) {
  // Get current year staircase level and previous year staircase level
  const currentLevel = calculateAllTimeStaircaseLevelThroughYear(games, plays, year, metric);
  const previousLevel = calculateAllTimeStaircaseLevelThroughYear(games, plays, year - 1, metric);

  // Get contributor games for current year
  const filteredPlaysCurrentYear = plays.filter(play => {
    const playYear = parseInt(play.date.substring(0, 4));
    return playYear <= year;
  });

  let currentBreakdown;
  switch (metric) {
    case Metric.SESSIONS:
      currentBreakdown = getStaircaseLevelBreakdown(games, filteredPlaysCurrentYear, null, true);
      break;
    case Metric.PLAYS:
      currentBreakdown = getStaircaseLevelBreakdown(games, filteredPlaysCurrentYear, null, false);
      break;
    case Metric.HOURS:
    default:
      currentBreakdown = getHourStaircaseLevelBreakdown(games, filteredPlaysCurrentYear);
      break;
  }

  // Get contributor game IDs for current year
  // All games at positions 0 to currentLevel-1 are contributors by definition of staircase level
  const currentContributors = new Set();
  for (let i = 0; i < currentLevel && i < currentBreakdown.length; i++) {
    currentContributors.add(currentBreakdown[i].game.id);
  }

  // Get contributor games for previous year
  const filteredPlaysPreviousYear = plays.filter(play => {
    const playYear = parseInt(play.date.substring(0, 4));
    return playYear <= year - 1;
  });

  let previousBreakdown;
  switch (metric) {
    case Metric.SESSIONS:
      previousBreakdown = getStaircaseLevelBreakdown(games, filteredPlaysPreviousYear, null, true);
      break;
    case Metric.PLAYS:
      previousBreakdown = getStaircaseLevelBreakdown(games, filteredPlaysPreviousYear, null, false);
      break;
    case Metric.HOURS:
    default:
      previousBreakdown = getHourStaircaseLevelBreakdown(games, filteredPlaysPreviousYear);
      break;
  }

  // Get contributor game IDs for previous year
  // All games at positions 0 to previousLevel-1 are contributors by definition of staircase level
  const previousContributors = new Set();
  for (let i = 0; i < previousLevel && i < previousBreakdown.length; i++) {
    previousContributors.add(previousBreakdown[i].game.id);
  }

  // Find games that are in current contributors but not in previous contributors
  const newGames = [];
  for (let i = 0; i < currentBreakdown.length; i++) {
    const gameId = currentBreakdown[i].game.id;
    if (currentContributors.has(gameId) && !previousContributors.has(gameId)) {
      const allTimeValue = metric === Metric.HOURS ? currentBreakdown[i].hours : currentBreakdown[i].count;

      // Calculate this year's value for this game
      const thisYearPlays = plays.filter(play => {
        const playYear = parseInt(play.date.substring(0, 4));
        return playYear === year && play.gameId === gameId;
      });

      let thisYearValue;
      switch (metric) {
        case Metric.SESSIONS:
          // Count unique days
          thisYearValue = new Set(thisYearPlays.map(play => play.date)).size;
          break;
        case Metric.PLAYS:
          // Count plays
          thisYearValue = thisYearPlays.length;
          break;
        case Metric.HOURS:
        default:
          // Sum hours
          thisYearValue = thisYearPlays.reduce((sum, play) => sum + (play.durationMin / 60), 0);
          break;
      }

      newGames.push({
        game: currentBreakdown[i].game,
        value: allTimeValue,
        thisYearValue: thisYearValue,
      });
    }
  }

  return newGames;
}

export {
  calculateStaircaseLevelFromSortedValues,
  calculatePlayStaircaseLevel,
  calculateSessionStaircaseLevel,
  calculateHourStaircaseLevel,
  calculateAllTimeStaircaseLevelThroughYear,
  calculateStaircaseLevelIncrease,
  getStaircaseLevelBreakdown,
  getHourStaircaseLevelBreakdown,
  getNewStaircaseLevelGames,
};
