/**
 * Collection statistics - ownership, milestones, diagnostics
 */

import { Metric } from './constants.js';
import { isGameOwned, wasGameAcquiredInYear } from './game-helpers.js';

/**
 * Get total BGG entries owned (includes expansions and expandalones)
 * Counts all owned copies, not just unique games
 * @param {Array} games - Array of game objects
 * @param {number|null} year - Optional year filter (for acquisitions)
 * @returns {number} count
 */
function getTotalBGGEntries(games, year = null) {
  let totalCopies = 0;

  games.forEach(game => {
    if (game.copies && game.copies.length > 0) {
      // Count copies based on year filter and ownership status
      game.copies.forEach(copy => {
        if (year) {
          // Year selected: count copies acquired in that year (regardless of current ownership)
          if (copy.acquisitionDate && copy.acquisitionDate.startsWith(year.toString())) {
            totalCopies++;
          }
        } else {
          // No year: count only currently owned copies
          if (copy.statusOwned === true) {
            totalCopies++;
          }
        }
      });
    }
  });

  return totalCopies;
}

/**
 * Get total base games owned (excludes expandalones)
 * @param {Array} games - Array of game objects
 * @param {number|null} year - Optional year filter (for acquisitions)
 * @returns {number} count
 */
function getTotalGamesOwned(games, year = null) {
  return games.filter(game => {
    if (!game.isBaseGame) return false;
    if (year) {
      // Year selected: count games acquired in that year (regardless of current ownership)
      return wasGameAcquiredInYear(game, year);
    }
    // No year: count only currently owned games
    return isGameOwned(game);
  }).length;
}

/**
 * Get total expansions owned
 * @param {Array} games - Array of game objects
 * @param {number|null} year - Optional year filter (for acquisitions)
 * @returns {Object} { total, expandalones, expansionOnly }
 */
function getTotalExpansions(games, year = null) {
  // Get all expansions (pure expansions only, not expandalones)
  const expansions = games.filter(game => {
    if (!game.isExpansion) return false;
    if (year) {
      // Year selected: count expansions acquired in that year (regardless of current ownership)
      return wasGameAcquiredInYear(game, year);
    }
    // No year: count only currently owned expansions
    return isGameOwned(game);
  });

  // Get expandalones separately (they are mutually exclusive with expansions)
  const expandalones = games.filter(game => {
    if (!game.isExpandalone) return false;
    if (year) {
      // Year selected: count expandalones acquired in that year (regardless of current ownership)
      return wasGameAcquiredInYear(game, year);
    }
    // No year: count only currently owned expandalones
    return isGameOwned(game);
  });

  return {
    total: expansions.length + expandalones.length,
    expandalones: expandalones.length,
    expansionOnly: expansions.length,
  };
}

/**
 * Get games categorized by milestones based on specified metric
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @param {number|null} year - Optional year filter
 * @param {string} metric - Metric type: 'plays', 'sessions', or 'hours'
 * @returns {Object} Milestone categories: {fives, dimes, quarters, centuries}
 */
function getMilestones(games, plays, year, metric) {
  // Calculate metric values per game
  const metricValuesPerGame = new Map();

  plays.forEach(play => {
    if (year && !play.date.startsWith(year.toString())) return;

    const currentValue = metricValuesPerGame.get(play.gameId) || {
      playCount: 0,
      totalMinutes: 0,
      uniqueDates: new Set(),
    };

    currentValue.playCount += 1;
    currentValue.totalMinutes += (play.durationMin || 0);
    currentValue.uniqueDates.add(play.date);

    metricValuesPerGame.set(play.gameId, currentValue);
  });

  // Categorize games by milestone
  const milestones = {
    fives: [],
    dimes: [],
    quarters: [],
    centuries: [],
  };

  metricValuesPerGame.forEach((value, gameId) => {
    const game = games.find(g => g.id === gameId);
    if (!game) return;

    // Select the appropriate metric value
    let count;
    if (metric === Metric.HOURS) {
      count = value.totalMinutes / 60;
    } else if (metric === Metric.SESSIONS) {
      count = value.uniqueDates.size;
    } else {
      count = value.playCount;
    }

    // Categorize by threshold
    if (count >= 100) {
      milestones.centuries.push({ game, count });
    } else if (count >= 25) {
      milestones.quarters.push({ game, count });
    } else if (count >= 10) {
      milestones.dimes.push({ game, count });
    } else if (count >= 5) {
      milestones.fives.push({ game, count });
    }
  });

  // Sort each category by count descending
  Object.keys(milestones).forEach(key => {
    milestones[key].sort((a, b) => b.count - a.count);
  });

  return milestones;
}

/**
 * Get threshold range for milestone type
 * @param {string} milestoneType - Milestone type: 'fives', 'dimes', 'quarters', or 'centuries'
 * @returns {Object} Object with min and max threshold values
 */
function getMilestoneThreshold(milestoneType) {
  switch (milestoneType) {
    case 'fives': return { min: 5, max: 10 };
    case 'dimes': return { min: 10, max: 25 };
    case 'quarters': return { min: 25, max: 100 };
    case 'centuries': return { min: 100, max: null };
    default: return { min: 0, max: null };
  }
}

/**
 * Get cumulative count of games within a milestone range
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @param {number|null} year - Year filter, or null for all time
 * @param {string} metric - Metric to use ('hours', 'sessions', or 'plays')
 * @param {string} milestoneType - Milestone type: 'fives', 'dimes', 'quarters', or 'centuries'
 * @returns {number} Count of games within the milestone range
 */
function getCumulativeMilestoneCount(games, plays, year, metric, milestoneType) {
  const { min, max } = getMilestoneThreshold(milestoneType);

  // Calculate metric values per game
  const metricValuesPerGame = new Map();

  plays.forEach(play => {
    if (year && parseInt(play.date.substring(0, 4)) > year) return;

    const currentValue = metricValuesPerGame.get(play.gameId) || {
      playCount: 0,
      totalMinutes: 0,
      uniqueDates: new Set(),
    };

    currentValue.playCount += 1;
    currentValue.totalMinutes += (play.durationMin || 0);
    currentValue.uniqueDates.add(play.date);

    metricValuesPerGame.set(play.gameId, currentValue);
  });

  // Count games within the threshold range
  let count = 0;
  metricValuesPerGame.forEach((value, gameId) => {
    const game = games.find(g => g.id === gameId);
    if (!game) return;

    // Select the appropriate metric value
    let metricValue;
    if (metric === Metric.HOURS) {
      metricValue = value.totalMinutes / 60;
    } else if (metric === Metric.SESSIONS) {
      metricValue = value.uniqueDates.size;
    } else {
      metricValue = value.playCount;
    }

    // Check if value is within range
    const meetsMin = metricValue >= min;
    const meetsMax = max === null || metricValue < max;

    if (meetsMin && meetsMax) {
      count++;
    }
  });

  return count;
}

/**
 * Calculate the increase in milestone count for a specific milestone type
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @param {number} year - Year to analyze
 * @param {string} metric - Metric type: 'plays', 'sessions', or 'hours'
 * @param {string} milestoneType - Milestone type: 'fives', 'dimes', 'quarters', or 'centuries'
 * @returns {number} Increase in milestone count (can be negative)
 */
function calculateMilestoneIncrease(games, plays, year, metric, milestoneType) {
  // Calculate current year count
  const currentYearCount = getCumulativeMilestoneCount(games, plays, year, metric, milestoneType);

  // Calculate previous year count
  const previousYearCount = getCumulativeMilestoneCount(games, plays, year - 1, metric, milestoneType);

  return currentYearCount - previousYearCount;
}

/**
 * Get games newly reaching a specific milestone threshold in a specific year
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @param {number} year - Year to analyze
 * @param {string} metric - Metric type: 'plays', 'sessions', or 'hours'
 * @param {string} milestoneType - Milestone type: 'fives', 'dimes', 'quarters', or 'centuries'
 * @returns {Array} Array of games newly reaching this milestone threshold
 */
function getNewMilestoneGames(games, plays, year, metric, milestoneType) {
  const { min, max } = getMilestoneThreshold(milestoneType);

  // Calculate metric values per game through current year
  const metricValuesCurrentYear = new Map();
  plays.forEach(play => {
    const playYear = parseInt(play.date.substring(0, 4));
    if (playYear > year) return;

    const currentValue = metricValuesCurrentYear.get(play.gameId) || {
      playCount: 0,
      totalMinutes: 0,
      uniqueDates: new Set(),
    };

    currentValue.playCount += 1;
    currentValue.totalMinutes += (play.durationMin || 0);
    currentValue.uniqueDates.add(play.date);

    metricValuesCurrentYear.set(play.gameId, currentValue);
  });

  // Calculate metric values per game through previous year
  const metricValuesPreviousYear = new Map();
  plays.forEach(play => {
    const playYear = parseInt(play.date.substring(0, 4));
    if (playYear > year - 1) return;

    const currentValue = metricValuesPreviousYear.get(play.gameId) || {
      playCount: 0,
      totalMinutes: 0,
      uniqueDates: new Set(),
    };

    currentValue.playCount += 1;
    currentValue.totalMinutes += (play.durationMin || 0);
    currentValue.uniqueDates.add(play.date);

    metricValuesPreviousYear.set(play.gameId, currentValue);
  });

  // Find games that crossed the threshold this year
  const newMilestoneGames = [];

  metricValuesCurrentYear.forEach((currentValue, gameId) => {
    const game = games.find(g => g.id === gameId);
    if (!game) return;

    // Calculate current year metric value
    let currentCount;
    if (metric === Metric.HOURS) {
      currentCount = currentValue.totalMinutes / 60;
    } else if (metric === Metric.SESSIONS) {
      currentCount = currentValue.uniqueDates.size;
    } else {
      currentCount = currentValue.playCount;
    }

    // Check if game is within the milestone range by current year
    const currentMeetsMin = currentCount >= min;
    const currentMeetsMax = max === null || currentCount < max;
    if (!currentMeetsMin || !currentMeetsMax) return;

    // Calculate previous year metric value
    const previousValue = metricValuesPreviousYear.get(gameId);
    let previousCount = 0;
    if (previousValue) {
      if (metric === Metric.HOURS) {
        previousCount = previousValue.totalMinutes / 60;
      } else if (metric === Metric.SESSIONS) {
        previousCount = previousValue.uniqueDates.size;
      } else {
        previousCount = previousValue.playCount;
      }
    }

    // Check if game entered this milestone range this year
    const previousMeetsMin = previousCount >= min;
    const previousMeetsMax = max === null || previousCount < max;
    const wasInRange = previousMeetsMin && previousMeetsMax;

    if (!wasInRange) {
      // Calculate this year's value for this game
      const thisYearPlays = plays.filter(play => {
        const playYear = parseInt(play.date.substring(0, 4));
        return playYear === year && play.gameId === gameId;
      });

      let thisYearValue;
      if (metric === Metric.HOURS) {
        thisYearValue = thisYearPlays.reduce((sum, play) => sum + (play.durationMin / 60), 0);
      } else if (metric === Metric.SESSIONS) {
        thisYearValue = new Set(thisYearPlays.map(play => play.date)).size;
      } else {
        thisYearValue = thisYearPlays.length;
      }

      newMilestoneGames.push({
        game: game,
        value: currentCount,
        thisYearValue: thisYearValue,
      });
    }
  });

  // Sort by value descending
  newMilestoneGames.sort((a, b) => b.value - a.value);

  return newMilestoneGames;
}

/**
 * Get games with unknown acquisition dates
 * Only returns currently owned games (including expansions and expandalones)
 * @param {Array} games - Array of game objects
 * @param {number|null} year - Optional year filter (for plays in that year)
 * @returns {Array} games without acquisition dates
 */
function getGamesWithUnknownAcquisitionDate(games, year = null) {
  return games.filter(game => {
    if (!game.copies || game.copies.length === 0) return false;

    // Check if any owned copy has unknown acquisition date
    const ownedCopies = game.copies.filter(copy => copy.statusOwned === true);
    if (ownedCopies.length === 0) return false;

    return ownedCopies.some(copy => !copy.acquisitionDate);
  });
}

/**
 * Get owned games that have never been played
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @param {number|null} year - Optional year filter (for acquisitions in that year)
 * @returns {Array} games with zero plays
 */
function getOwnedGamesNeverPlayed(games, plays, year = null) {
  // Get set of all played game IDs
  const playedGameIds = new Set(plays.map(play => play.gameId));

  // Filter for owned games with no plays
  return games.filter(game => {
    // Must be a base game (exclude expansions and expandalones)
    if (!game.isBaseGame) return false;

    // Must not have been played
    if (playedGameIds.has(game.id)) return false;

    // If year filter is active, only show games acquired that year
    if (year) {
      return wasGameAcquiredInYear(game, year);
    }

    // No year: only show currently owned games
    return isGameOwned(game);
  });
}

/**
 * Get owned base games missing price paid information
 * Only returns owned base games (excludes expansions and expandalones)
 * @param {Array} games - Array of game objects
 * @returns {Array} base games with owned copies missing price paid
 */
function getOwnedBaseGamesMissingPricePaid(games) {
  return games.filter(game => {
    // Must be a base game (exclude expansions and expandalones)
    if (!game.isBaseGame) return false;

    if (!game.copies || game.copies.length === 0) return false;

    // Get owned copies
    const ownedCopies = game.copies.filter(copy => copy.statusOwned === true);
    if (ownedCopies.length === 0) return false;

    // Check if any owned copy is missing price paid
    return ownedCopies.some(copy =>
      copy.pricePaid === null ||
      copy.pricePaid === undefined ||
      copy.pricePaid === ''
    );
  });
}

/**
 * Get all acquisition years from game copies
 * @param {Array} games - Array of game objects
 * @returns {Array} sorted array of years
 */
function getAllAcquisitionYears(games) {
  const years = new Set();
  games.forEach(game => {
    if (game.copies && game.copies.length > 0) {
      game.copies.forEach(copy => {
        if (copy.acquisitionDate) {
          const year = parseInt(copy.acquisitionDate.substring(0, 4));
          years.add(year);
        }
      });
    }
  });
  return Array.from(years).sort((a, b) => b - a); // Most recent first
}

/**
 * Get all available years from plays and acquisitions with metadata
 * @param {Array} plays - Array of play objects
 * @param {Array} games - Array of game objects
 * @returns {Array} sorted array of year objects with metadata {year, hasPlays, isPreLogging}
 */
function getAvailableYears(plays, games = null) {
  const playYears = new Set();
  plays.forEach(play => {
    const year = parseInt(play.date.substring(0, 4));
    playYears.add(year);
  });

  // Determine first play year (pre-logging boundary)
  const firstPlayYear = plays.length > 0
    ? Math.min(...Array.from(playYears))
    : null;

  // Build comprehensive year list
  const yearMap = new Map();

  // Add play years
  playYears.forEach(year => {
    yearMap.set(year, { year, hasPlays: true, isPreLogging: false });
  });

  // Add acquisition years if games provided
  if (games) {
    const acquisitionYears = getAllAcquisitionYears(games);
    acquisitionYears.forEach(year => {
      if (!yearMap.has(year)) {
        const isPreLogging = firstPlayYear !== null && year < firstPlayYear;
        yearMap.set(year, { year, hasPlays: false, isPreLogging });
      }
    });
  }

  // Convert to array and sort (most recent first)
  return Array.from(yearMap.values()).sort((a, b) => b.year - a.year);
}

export {
  getTotalBGGEntries,
  getTotalGamesOwned,
  getTotalExpansions,
  getMilestones,
  getMilestoneThreshold,
  getCumulativeMilestoneCount,
  calculateMilestoneIncrease,
  getNewMilestoneGames,
  getGamesWithUnknownAcquisitionDate,
  getOwnedGamesNeverPlayed,
  getOwnedBaseGamesMissingPricePaid,
  getAllAcquisitionYears,
  getAvailableYears,
};
