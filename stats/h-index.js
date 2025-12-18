/**
 * H-Index calculation functions
 */

import { Metric } from './constants.js';

/**
 * Helper: Calculate h-index from sorted values
 * @param {Array} sortedValues - Array of values sorted in descending order
 * @returns {number} h-index value
 */
function calculateHIndexFromSortedValues(sortedValues) {
  let hIndex = 0;
  for (let i = 0; i < sortedValues.length; i++) {
    if (sortedValues[i] >= i + 1) {
      hIndex = i + 1;
    } else {
      break;
    }
  }
  return hIndex;
}

/**
 * Calculate traditional h-index (counts all play entries)
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @param {number|null} year - Optional year filter
 * @returns {number} h-index value
 */
function calculateTraditionalHIndex(games, plays, year = null) {
  // Count plays per game
  const playCountsPerGame = new Map();

  plays.forEach(play => {
    if (year && !play.date.startsWith(year.toString())) return;

    const count = playCountsPerGame.get(play.gameId) || 0;
    playCountsPerGame.set(play.gameId, count + 1);
  });

  // Get sorted counts
  const counts = Array.from(playCountsPerGame.values()).sort((a, b) => b - a);

  return calculateHIndexFromSortedValues(counts);
}

/**
 * Calculate play session h-index (unique days per game)
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @param {number|null} year - Optional year filter
 * @returns {number} h-index value
 */
function calculatePlaySessionHIndex(games, plays, year = null) {
  // Count unique days per game
  const uniqueDaysPerGame = new Map();

  plays.forEach(play => {
    if (year && !play.date.startsWith(year.toString())) return;

    if (!uniqueDaysPerGame.has(play.gameId)) {
      uniqueDaysPerGame.set(play.gameId, new Set());
    }
    uniqueDaysPerGame.get(play.gameId).add(play.date);
  });

  // Get sorted counts
  const counts = Array.from(uniqueDaysPerGame.values())
    .map(dateSet => dateSet.size)
    .sort((a, b) => b - a);

  return calculateHIndexFromSortedValues(counts);
}

/**
 * Calculate hour h-index (total hours played per game)
 * @param {Array} plays - Array of play objects
 * @param {number|null} year - Optional year filter
 * @returns {number} h-index value
 */
function calculateHourHIndex(plays, year = null) {
  // Sum minutes per game
  const minutesPerGame = new Map();

  plays.forEach(play => {
    if (year && !play.date.startsWith(year.toString())) return;

    const total = minutesPerGame.get(play.gameId) || 0;
    minutesPerGame.set(play.gameId, total + play.durationMin);
  });

  // Convert to hours and sort
  const hours = Array.from(minutesPerGame.values())
    .map(min => min / 60)
    .sort((a, b) => b - a);

  return calculateHIndexFromSortedValues(hours);
}

/**
 * Calculate all-time h-index through a specific year (includes all plays up to and including that year)
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @param {number} year - Year to calculate through (inclusive)
 * @param {string} metric - Metric type: 'plays', 'sessions', or 'hours'
 * @returns {number} h-index value
 */
function calculateAllTimeHIndexThroughYear(games, plays, year, metric) {
  // Filter plays up to and including the specified year
  const filteredPlays = plays.filter(play => {
    const playYear = parseInt(play.date.substring(0, 4));
    return playYear <= year;
  });

  // Calculate h-index based on metric type
  switch (metric) {
    case Metric.SESSIONS:
      return calculatePlaySessionHIndex(games, filteredPlays);
    case Metric.PLAYS:
      return calculateTraditionalHIndex(games, filteredPlays);
    case Metric.HOURS:
    default:
      return calculateHourHIndex(filteredPlays);
  }
}

/**
 * Calculate year-over-year h-index increase
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @param {number} year - Year to calculate increase for
 * @param {string} metric - Metric type: 'plays', 'sessions', or 'hours'
 * @returns {number} h-index increase (can be negative or zero)
 */
function calculateHIndexIncrease(games, plays, year, metric) {
  const currentYearHIndex = calculateAllTimeHIndexThroughYear(games, plays, year, metric);
  const previousYearHIndex = calculateAllTimeHIndexThroughYear(games, plays, year - 1, metric);
  return currentYearHIndex - previousYearHIndex;
}

/**
 * Get detailed h-index breakdown (games contributing to h-index)
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @param {number|null} year - Optional year filter
 * @param {boolean} usePlaySessions - True for play session h-index, false for traditional
 * @returns {Array} Array of {game, count} sorted by count descending
 */
function getHIndexBreakdown(games, plays, year = null, usePlaySessions = false) {
  const countsPerGame = new Map();

  if (usePlaySessions) {
    // Count unique days per game
    const uniqueDaysPerGame = new Map();
    plays.forEach(play => {
      if (year && !play.date.startsWith(year.toString())) return;
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
      if (year && !play.date.startsWith(year.toString())) return;
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
 * Get detailed hour h-index breakdown (games contributing to hour h-index)
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @param {number|null} year - Optional year filter
 * @returns {Array} Array of {game, hours} sorted by hours descending
 */
function getHourHIndexBreakdown(games, plays, year = null) {
  const minutesPerGame = new Map();

  // Sum minutes per game
  plays.forEach(play => {
    if (year && !play.date.startsWith(year.toString())) return;
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
 * Get games newly added to h-index in a specific year
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @param {number} year - Year to analyze
 * @param {string} metric - Metric type: 'plays', 'sessions', or 'hours'
 * @returns {Array} Array of games newly contributing to h-index this year
 */
function getNewHIndexGames(games, plays, year, metric) {
  // Get current year h-index and previous year h-index
  const currentHIndex = calculateAllTimeHIndexThroughYear(games, plays, year, metric);
  const previousHIndex = calculateAllTimeHIndexThroughYear(games, plays, year - 1, metric);

  // Get contributor games for current year
  const filteredPlaysCurrentYear = plays.filter(play => {
    const playYear = parseInt(play.date.substring(0, 4));
    return playYear <= year;
  });

  let currentBreakdown;
  switch (metric) {
    case Metric.SESSIONS:
      currentBreakdown = getHIndexBreakdown(games, filteredPlaysCurrentYear, null, true);
      break;
    case Metric.PLAYS:
      currentBreakdown = getHIndexBreakdown(games, filteredPlaysCurrentYear, null, false);
      break;
    case Metric.HOURS:
    default:
      currentBreakdown = getHourHIndexBreakdown(games, filteredPlaysCurrentYear);
      break;
  }

  // Get contributor game IDs for current year
  const currentContributors = new Set();
  for (let i = 0; i < currentHIndex && i < currentBreakdown.length; i++) {
    const rank = i + 1;
    const value = metric === Metric.HOURS ? currentBreakdown[i].hours : currentBreakdown[i].count;
    if (rank <= value && rank <= currentHIndex) {
      currentContributors.add(currentBreakdown[i].game.id);
    }
  }

  // Get contributor games for previous year
  const filteredPlaysPreviousYear = plays.filter(play => {
    const playYear = parseInt(play.date.substring(0, 4));
    return playYear <= year - 1;
  });

  let previousBreakdown;
  switch (metric) {
    case Metric.SESSIONS:
      previousBreakdown = getHIndexBreakdown(games, filteredPlaysPreviousYear, null, true);
      break;
    case Metric.PLAYS:
      previousBreakdown = getHIndexBreakdown(games, filteredPlaysPreviousYear, null, false);
      break;
    case Metric.HOURS:
    default:
      previousBreakdown = getHourHIndexBreakdown(games, filteredPlaysPreviousYear);
      break;
  }

  // Get contributor game IDs for previous year
  const previousContributors = new Set();
  for (let i = 0; i < previousHIndex && i < previousBreakdown.length; i++) {
    const rank = i + 1;
    const value = metric === Metric.HOURS ? previousBreakdown[i].hours : previousBreakdown[i].count;
    if (rank <= value && rank <= previousHIndex) {
      previousContributors.add(previousBreakdown[i].game.id);
    }
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
  calculateHIndexFromSortedValues,
  calculateTraditionalHIndex,
  calculatePlaySessionHIndex,
  calculateHourHIndex,
  calculateAllTimeHIndexThroughYear,
  calculateHIndexIncrease,
  getHIndexBreakdown,
  getHourHIndexBreakdown,
  getNewHIndexGames,
};
