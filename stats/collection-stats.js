/**
 * Collection statistics - ownership, milestones, diagnostics
 */

import { Metric, Milestone } from './constants.js';
import { isGameOwned, wasGameAcquiredInYear } from './game-helpers.js';
import { isPlayInYear, getMetricValuesThroughYear } from './play-helpers.js';

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
 * Get metric value from raw play data
 * @param {Object} playData - { playCount, totalMinutes, uniqueDates }
 * @param {string} metric - Metric type
 * @returns {number} Metric value
 */
function getMetricValueFromPlayData(playData, metric) {
  if (metric === Metric.HOURS) {
    return playData.totalMinutes / 60;
  } else if (metric === Metric.SESSIONS) {
    return playData.uniqueDates.size;
  } else {
    return playData.playCount;
  }
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
    if (!isPlayInYear(play, year)) return;

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

  // Initialize milestone categories from tier collection
  const milestones = {};
  Milestone.values.forEach(tier => {
    milestones[tier] = [];
  });

  metricValuesPerGame.forEach((value, gameId) => {
    const game = games.find(g => g.id === gameId);
    if (!game) return;

    const count = getMetricValueFromPlayData(value, metric);
    const tier = Milestone.getTierForValue(count);

    if (tier) {
      milestones[tier].push({ game, count });
    }
  });

  // Sort each category by count descending
  Object.keys(milestones).forEach(key => {
    milestones[key].sort((a, b) => b.count - a.count);
  });

  return milestones;
}

/**
 * Get cumulative count of games within a milestone range
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @param {number|null} year - Year filter, or null for all time
 * @param {string} metric - Metric to use ('hours', 'sessions', or 'plays')
 * @param {number} milestoneType - Milestone tier value (e.g., Milestone.FIVES, Milestone.DIMES)
 * @returns {number} Count of games within the milestone range
 */
function getCumulativeMilestoneCount(games, plays, year, metric, milestoneType) {
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

    const metricValue = getMetricValueFromPlayData(value, metric);

    if (Milestone.isValueInTier(metricValue, milestoneType)) {
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
 * @param {number} milestoneType - Milestone tier value (e.g., Milestone.FIVES, Milestone.DIMES)
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
 * @param {number} milestoneType - Milestone tier value (e.g., Milestone.FIVES, Milestone.DIMES)
 * @returns {Array} Array of games newly reaching this milestone threshold
 */
function getNewMilestoneGames(games, plays, year, metric, milestoneType) {
  // Calculate metric values per game through current and previous years
  const metricValuesCurrentYear = getMetricValuesThroughYear(plays, year);
  const metricValuesPreviousYear = getMetricValuesThroughYear(plays, year - 1);

  // Find games that crossed the threshold this year
  const newMilestoneGames = [];

  metricValuesCurrentYear.forEach((currentValue, gameId) => {
    const game = games.find(g => g.id === gameId);
    if (!game) return;

    const currentCount = getMetricValueFromPlayData(currentValue, metric);

    // Check if game is within the milestone range by current year
    if (!Milestone.isValueInTier(currentCount, milestoneType)) return;

    // Calculate previous year metric value
    const previousValue = metricValuesPreviousYear.get(gameId);
    const previousCount = previousValue ? getMetricValueFromPlayData(previousValue, metric) : 0;

    // Check if game was already in this milestone range last year
    const wasInRange = Milestone.isValueInTier(previousCount, milestoneType);

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
 * Get count of games that skipped a milestone entirely
 * A game "skips" a milestone when it was below the minimum at end of previous year
 * and is above the maximum at end of current year (jumped completely over the range)
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @param {number} year - Year to analyze
 * @param {string} metric - Metric type: 'plays', 'sessions', or 'hours'
 * @param {number} milestoneType - Milestone tier value (e.g., Milestone.FIVES, Milestone.DIMES)
 * @returns {number} Count of games that skipped this milestone
 */
function getSkippedMilestoneCount(games, plays, year, metric, milestoneType) {
  // Last tier can't be skipped (no higher milestone)
  const { threshold, nextThreshold } = Milestone.getThreshold(milestoneType);
  if (nextThreshold === null) return 0;

  // Calculate metric values per game through current and previous years
  const metricValuesCurrentYear = getMetricValuesThroughYear(plays, year);
  const metricValuesPreviousYear = getMetricValuesThroughYear(plays, year - 1);

  // Count games that skipped this milestone
  let skippedCount = 0;

  metricValuesCurrentYear.forEach((currentValue, gameId) => {
    const game = games.find(g => g.id === gameId);
    if (!game) return;

    const currentCount = getMetricValueFromPlayData(currentValue, metric);

    // Game must be above the max threshold (jumped over the range)
    if (currentCount < nextThreshold) return;

    // Calculate previous year metric value
    const previousValue = metricValuesPreviousYear.get(gameId);
    const previousCount = previousValue ? getMetricValueFromPlayData(previousValue, metric) : 0;

    // Game must have been below the min threshold at end of previous year
    if (previousCount < threshold) {
      skippedCount++;
    }
  });

  return skippedCount;
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
  getCumulativeMilestoneCount,
  calculateMilestoneIncrease,
  getNewMilestoneGames,
  getSkippedMilestoneCount,
  getGamesWithUnknownAcquisitionDate,
  getOwnedGamesNeverPlayed,
  getOwnedBaseGamesMissingPricePaid,
  getAllAcquisitionYears,
  getAvailableYears,
};
