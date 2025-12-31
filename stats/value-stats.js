/**
 * Value statistics - price per play, value clubs
 */

import { ValueClub } from './constants.js';
import { isGameOwned, wasCopyAcquiredInYear, wasCopyAcquiredInOrBeforeYear } from './game-helpers.js';
import { getMetricValueFromPlayData, getMetricValuesThroughYear } from './play-helpers.js';
import { calculateMedian } from '../utils.js';
import {
  getGamesInTier,
  calculateTierIncrease,
  getNewTierGames,
  getSkippedTierCount,
} from './tier-helpers.js';

/**
 * Get total price paid for owned copies of a game
 * Note: Assumes game passes valueClubGameFilter (has owned copies)
 * @param {Object} game - Game object
 * @returns {number|null} Total price paid or null if no price data
 */
function getGamePricePaid(game) {
  const ownedCopies = game.copies.filter(copy => copy.statusOwned === true);

  let totalPricePaid = 0;
  let hasPriceData = false;

  ownedCopies.forEach(copy => {
    if (copy.pricePaid !== null && copy.pricePaid !== undefined && copy.pricePaid !== '') {
      totalPricePaid += copy.pricePaid;
      hasPriceData = true;
    }
  });

  return hasPriceData ? totalPricePaid : null;
}

/**
 * Get total cost of all owned copies
 * @param {Array} games - Array of game objects
 * @param {number|null} year - Optional year filter (by acquisition date)
 * @returns {Object} { totalCost, games, gamesWithoutPrice }
 */
function getTotalCost(games, year = null) {
  const result = {
    totalCost: 0,
    games: [],
    gamesWithoutPrice: 0,
  };

  games.forEach(game => {
    // Only include base games (not expansions, not expandalones)
    if (!game.isBaseGame) return;

    if (!game.copies || game.copies.length === 0) return;

    // Get owned copies, filtered by acquisition year if specified
    let relevantCopies = game.copies.filter(copy => copy.statusOwned === true);
    if (year) {
      relevantCopies = relevantCopies.filter(copy => wasCopyAcquiredInYear(copy, year));
    }
    if (relevantCopies.length === 0) return;

    // Sum price paid across relevant copies
    let totalPricePaid = 0;
    let hasPriceData = false;

    relevantCopies.forEach(copy => {
      if (copy.pricePaid !== null && copy.pricePaid !== undefined && copy.pricePaid !== '') {
        totalPricePaid += copy.pricePaid;
        hasPriceData = true;
      }
    });

    if (hasPriceData) {
      result.totalCost += totalPricePaid;
      result.games.push({
        game,
        totalPricePaid,
      });
    } else {
      result.gamesWithoutPrice++;
      result.games.push({
        game,
        totalPricePaid: null,
      });
    }
  });

  // Sort by totalPricePaid descending (null/unknown sorts as 0)
  result.games.sort((a, b) => (b.totalPricePaid ?? 0) - (a.totalPricePaid ?? 0));

  return result;
}

/**
 * Get value club value (cost per metric) for a game
 * Note: Assumes game passes valueClubGameFilter (owned base game)
 * @param {Object} game - Game object
 * @param {Object} playData - Play data from getMetricValuesThroughYear
 * @param {string} metric - Metric type
 * @returns {number|null} Cost per metric value or null if not calculable
 */
function getValueClubValue(game, playData, metric) {
  const pricePaid = getGamePricePaid(game);
  if (pricePaid === null) return null;

  if (!playData) return null;
  const metricValue = getMetricValueFromPlayData(playData, metric);
  if (metricValue === 0) return null;

  // Cap at pricePaid so cost/metric never exceeds what was paid (handles metric < 1)
  return Math.min(pricePaid / metricValue, pricePaid);
}

/**
 * Game filter for value club (owned base games)
 * @param {Object} game - Game object
 * @returns {boolean} true if game is eligible for value club
 */
function valueClubGameFilter(game) {
  return game.isBaseGame && isGameOwned(game);
}

/**
 * Build value club game details from play data
 * @param {Object} game - Game object
 * @param {Object} playData - Play data from getMetricValuesThroughYear
 * @param {number} costPerMetric - Cost per metric value
 * @param {string} metric - Metric type
 * @returns {Object} { game, metricValue, costPerMetric, pricePaid }
 */
function getValueClubGameDetails(game, playData, costPerMetric, metric) {
  const metricValue = getMetricValueFromPlayData(playData, metric);
  const pricePaid = getGamePricePaid(game);
  return {
    game,
    metricValue,
    costPerMetric,
    pricePaid,
  };
}

/**
 * Calculate this year's metric value for a game (for value club)
 * Note: Called after getValueClubValue confirms currentPlayData exists
 * @param {Object} game - Game object (unused)
 * @param {Object} currentPlayData - Current year cumulative play data (guaranteed non-null)
 * @param {Object} previousPlayData - Previous year cumulative play data (may be null)
 * @param {string} metric - Metric type
 * @returns {number} This year's metric value
 */
function getValueClubThisYearValue(game, currentPlayData, previousPlayData, metric) {
  const current = getMetricValueFromPlayData(currentPlayData, metric);
  const previous = previousPlayData ? getMetricValueFromPlayData(previousPlayData, metric) : 0;
  return current - previous;
}

/**
 * Build new value club game details (includes thisYearMetricValue)
 * @param {Object} game - Game object
 * @param {Object} playData - Play data from getMetricValuesThroughYear
 * @param {number} costPerMetric - Cost per metric value
 * @param {number} thisYearMetricValue - Metric value added this year
 * @param {string} metric - Metric type
 * @returns {Object} { game, metricValue, costPerMetric, pricePaid, thisYearMetricValue }
 */
function getNewValueClubGameDetails(game, playData, costPerMetric, thisYearMetricValue, metric) {
  const metricValue = getMetricValueFromPlayData(playData, metric);
  const pricePaid = getGamePricePaid(game);
  return {
    game,
    metricValue,
    costPerMetric,
    pricePaid,
    thisYearMetricValue,
  };
}

/**
 * Get games in the value club (cost per metric <= threshold)
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @param {string} metric - Metric type: 'hours', 'sessions', or 'plays'
 * @param {number} threshold - Cost per metric threshold
 * @param {number|null} year - Optional year filter
 * @returns {Object} { count, games }
 */
function getValueClubGames(games, plays, metric, threshold, year = null) {
  const clubGames = getGamesInTier({
    games,
    plays,
    year,
    metric,
    tierCollection: ValueClub,
    tier: threshold,
    getGameValue: getValueClubValue,
    gameFilter: valueClubGameFilter,
    getGameDetails: getValueClubGameDetails,
  });

  return {
    count: clubGames.length,
    games: clubGames,
  };
}

/**
 * Calculate the increase in value club membership for a specific year
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @param {number} year - Year to analyze
 * @param {string} metric - Metric type: 'hours', 'sessions', or 'plays'
 * @param {number} threshold - Cost per metric threshold
 * @returns {number} Increase in value club membership (can be negative)
 */
function calculateValueClubIncrease(games, plays, year, metric, threshold) {
  return calculateTierIncrease({
    games,
    plays,
    year,
    metric,
    tierCollection: ValueClub,
    tier: threshold,
    getGameValue: getValueClubValue,
    gameFilter: valueClubGameFilter,
  });
}

/**
 * Get games that newly entered value club during a specific year
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @param {number} year - Year to analyze
 * @param {string} metric - Metric type: 'hours', 'sessions', or 'plays'
 * @param {number} threshold - Cost per metric threshold
 * @returns {Array} Array of { game, metricValue, costPerMetric, pricePaid, thisYearMetricValue }
 */
function getNewValueClubGames(games, plays, year, metric, threshold) {
  return getNewTierGames({
    games,
    plays,
    year,
    metric,
    tierCollection: ValueClub,
    tier: threshold,
    getGameValue: getValueClubValue,
    gameFilter: valueClubGameFilter,
    getThisYearValue: getValueClubThisYearValue,
    getGameDetails: getNewValueClubGameDetails,
  });
}

/**
 * Get count of games that skipped over a value club threshold entirely
 * A game skips when it goes from above threshold to below next-lower-threshold in one year
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @param {number} year - Year to analyze
 * @param {string} metric - Metric type: 'hours', 'sessions', or 'plays'
 * @param {number} threshold - Cost per metric threshold
 * @param {number|null} nextLowerThreshold - Next lower threshold (null if none exists)
 * @returns {number} Count of games that skipped this threshold
 */
function getSkippedValueClubCount(games, plays, year, metric, threshold, nextLowerThreshold = null) {
  // If no lower threshold exists, nothing can be skipped
  if (nextLowerThreshold === null) return 0;

  return getSkippedTierCount({
    games,
    plays,
    year,
    metric,
    tierCollection: ValueClub,
    tier: threshold,
    getGameValue: getValueClubValue,
    gameFilter: valueClubGameFilter,
  });
}

/**
 * Calculate cost-per-metric statistics for owned games
 * Includes both played games (cost/metric) and unplayed games (cost = price paid)
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @param {string} metric - Metric type: 'hours', 'sessions', or 'plays'
 * @param {number|null} year - Optional year filter (cumulative through year for plays, acquired through year for unplayed)
 * @returns {Object} { median, gameAverage, overallRate, gameCount, games }
 */
function getCostPerMetricStats(games, plays, metric, year = null) {
  const metricValues = getMetricValuesThroughYear(plays, year);
  const eligibleGames = [];

  games.forEach(game => {
    // Only include owned base games
    if (!valueClubGameFilter(game)) return;

    const pricePaid = getGamePricePaid(game);
    if (pricePaid === null) return;

    const playData = metricValues.get(game.id);
    const metricValue = playData ? getMetricValueFromPlayData(playData, metric) : 0;

    // Calculate all metric values for secondary sorting
    const hours = playData ? playData.totalMinutes / 60 : 0;
    const sessions = playData ? playData.uniqueDates.size : 0;
    const plays = playData ? playData.playCount : 0;

    // For unplayed games (metricValue === 0), apply acquisition year filter if year specified
    if (metricValue === 0) {
      if (year) {
        // Check if any owned copy was acquired in or before the year
        const hasRelevantCopy = game.copies.some(copy =>
          copy.statusOwned === true && wasCopyAcquiredInOrBeforeYear(copy, year)
        );
        if (!hasRelevantCopy) return;
      }
      // Unplayed games have costPerMetric = pricePaid (worst possible value)
      eligibleGames.push({
        game,
        pricePaid,
        metricValue: 0,
        costPerMetric: pricePaid,
        hours,
        sessions,
        plays,
      });
    } else {
      // Cap at pricePaid so cost/metric never exceeds what was paid (handles metric < 1)
      const costPerMetric = Math.min(pricePaid / metricValue, pricePaid);

      eligibleGames.push({
        game,
        pricePaid,
        metricValue,
        costPerMetric,
        hours,
        sessions,
        plays,
      });
    }
  });

  // Sort by costPerMetric ascending (best value first)
  // Secondary sort: current metric > hours > sessions > plays (descending - more is better)
  eligibleGames.sort((a, b) => {
    const costDiff = a.costPerMetric - b.costPerMetric;
    if (costDiff !== 0) return costDiff;
    const metricDiff = b.metricValue - a.metricValue;
    if (metricDiff !== 0) return metricDiff;
    const hoursDiff = b.hours - a.hours;
    if (hoursDiff !== 0) return hoursDiff;
    const sessionsDiff = b.sessions - a.sessions;
    if (sessionsDiff !== 0) return sessionsDiff;
    return b.plays - a.plays;
  });

  const costPerMetricValues = eligibleGames.map(g => g.costPerMetric);
  const totalCost = eligibleGames.reduce((sum, g) => sum + g.pricePaid, 0);
  const totalMetric = eligibleGames.reduce((sum, g) => sum + g.metricValue, 0);

  return {
    median: calculateMedian(costPerMetricValues),
    gameAverage: costPerMetricValues.length > 0
      ? costPerMetricValues.reduce((sum, v) => sum + v, 0) / costPerMetricValues.length
      : null,
    overallRate: totalMetric > 0 ? totalCost / totalMetric : null,
    gameCount: eligibleGames.length,
    games: eligibleGames,
  };
}

/**
 * Get shelf of shame - owned base games with known price but never played
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @param {number|null} year - Optional year filter (games acquired through year)
 * @returns {Object} { totalCost, count, games }
 */
function getShelfOfShame(games, plays, year = null) {
  // Build set of all played game IDs (ever, no year filter)
  const playedGameIds = new Set(plays.map(play => play.gameId));

  const shameGames = [];

  games.forEach(game => {
    // Only include base games (not expansions, not expandalones)
    if (!game.isBaseGame) return;

    // Only include owned games
    if (!isGameOwned(game)) return;

    // Exclude if ever played
    if (playedGameIds.has(game.id)) return;

    // Get owned copies, filtered by acquisition year if specified
    let relevantCopies = game.copies.filter(copy => copy.statusOwned === true);
    if (year) {
      relevantCopies = relevantCopies.filter(copy => wasCopyAcquiredInOrBeforeYear(copy, year));
    }
    if (relevantCopies.length === 0) return;

    // Sum price paid across relevant copies
    let totalPricePaid = 0;
    let hasPriceData = false;

    relevantCopies.forEach(copy => {
      if (copy.pricePaid !== null && copy.pricePaid !== undefined && copy.pricePaid !== '') {
        totalPricePaid += copy.pricePaid;
        hasPriceData = true;
      }
    });

    if (!hasPriceData) return;

    shameGames.push({
      game,
      pricePaid: totalPricePaid,
    });
  });

  // Sort by pricePaid descending (most expensive first)
  shameGames.sort((a, b) => b.pricePaid - a.pricePaid);

  const totalCost = shameGames.reduce((sum, g) => sum + g.pricePaid, 0);

  return {
    totalCost,
    count: shameGames.length,
    games: shameGames,
  };
}

export {
  getTotalCost,
  getValueClubGames,
  calculateValueClubIncrease,
  getNewValueClubGames,
  getSkippedValueClubCount,
  getCostPerMetricStats,
  getShelfOfShame,
};
