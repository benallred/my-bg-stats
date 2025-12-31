/**
 * Cost statistics - price per play, cost clubs
 */

import { CostClub } from './constants.js';
import { isGameOwned, wasCopyAcquiredInYear } from './game-helpers.js';
import { getMetricValueFromPlayData } from './play-helpers.js';
import {
  getGamesInTier,
  calculateTierIncrease,
  getNewTierGames,
  getSkippedTierCount,
} from './tier-helpers.js';

/**
 * Get total price paid for owned copies of a game
 * Note: Assumes game passes costClubGameFilter (has owned copies)
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
 * Get cost club value (cost per metric) for a game
 * Note: Assumes game passes costClubGameFilter (owned base game)
 * @param {Object} game - Game object
 * @param {Object} playData - Play data from getMetricValuesThroughYear
 * @param {string} metric - Metric type
 * @returns {number|null} Cost per metric value or null if not calculable
 */
function getCostClubValue(game, playData, metric) {
  const pricePaid = getGamePricePaid(game);
  if (pricePaid === null) return null;

  if (!playData) return null;
  const metricValue = getMetricValueFromPlayData(playData, metric);
  if (metricValue === 0) return null;

  // Cap at pricePaid so cost/metric never exceeds what was paid (handles metric < 1)
  return Math.min(pricePaid / metricValue, pricePaid);
}

/**
 * Game filter for cost club (owned base games)
 * @param {Object} game - Game object
 * @returns {boolean} true if game is eligible for cost club
 */
function costClubGameFilter(game) {
  return game.isBaseGame && isGameOwned(game);
}

/**
 * Build cost club game details from play data
 * @param {Object} game - Game object
 * @param {Object} playData - Play data from getMetricValuesThroughYear
 * @param {number} costPerMetric - Cost per metric value
 * @param {string} metric - Metric type
 * @returns {Object} { game, metricValue, costPerMetric, pricePaid }
 */
function getCostClubGameDetails(game, playData, costPerMetric, metric) {
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
 * Calculate this year's metric value for a game (for cost club)
 * Note: Called after getCostClubValue confirms currentPlayData exists
 * @param {Object} game - Game object (unused)
 * @param {Object} currentPlayData - Current year cumulative play data (guaranteed non-null)
 * @param {Object} previousPlayData - Previous year cumulative play data (may be null)
 * @param {string} metric - Metric type
 * @returns {number} This year's metric value
 */
function getCostClubThisYearValue(game, currentPlayData, previousPlayData, metric) {
  const current = getMetricValueFromPlayData(currentPlayData, metric);
  const previous = previousPlayData ? getMetricValueFromPlayData(previousPlayData, metric) : 0;
  return current - previous;
}

/**
 * Build new cost club game details (includes thisYearMetricValue)
 * @param {Object} game - Game object
 * @param {Object} playData - Play data from getMetricValuesThroughYear
 * @param {number} costPerMetric - Cost per metric value
 * @param {number} thisYearMetricValue - Metric value added this year
 * @param {string} metric - Metric type
 * @returns {Object} { game, metricValue, costPerMetric, pricePaid, thisYearMetricValue }
 */
function getNewCostClubGameDetails(game, playData, costPerMetric, thisYearMetricValue, metric) {
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
 * Get games in the cost club (cost per metric <= threshold)
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @param {string} metric - Metric type: 'hours', 'sessions', or 'plays'
 * @param {number} threshold - Cost per metric threshold
 * @param {number|null} year - Optional year filter
 * @returns {Object} { count, games }
 */
function getCostClubGames(games, plays, metric, threshold, year = null) {
  const clubGames = getGamesInTier({
    games,
    plays,
    year,
    metric,
    tierCollection: CostClub,
    tier: threshold,
    getGameValue: getCostClubValue,
    gameFilter: costClubGameFilter,
    getGameDetails: getCostClubGameDetails,
  });

  return {
    count: clubGames.length,
    games: clubGames,
  };
}

/**
 * Calculate the increase in cost club membership for a specific year
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @param {number} year - Year to analyze
 * @param {string} metric - Metric type: 'hours', 'sessions', or 'plays'
 * @param {number} threshold - Cost per metric threshold
 * @returns {number} Increase in cost club membership (can be negative)
 */
function calculateCostClubIncrease(games, plays, year, metric, threshold) {
  return calculateTierIncrease({
    games,
    plays,
    year,
    metric,
    tierCollection: CostClub,
    tier: threshold,
    getGameValue: getCostClubValue,
    gameFilter: costClubGameFilter,
  });
}

/**
 * Get games that newly entered cost club during a specific year
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @param {number} year - Year to analyze
 * @param {string} metric - Metric type: 'hours', 'sessions', or 'plays'
 * @param {number} threshold - Cost per metric threshold
 * @returns {Array} Array of { game, metricValue, costPerMetric, pricePaid, thisYearMetricValue }
 */
function getNewCostClubGames(games, plays, year, metric, threshold) {
  return getNewTierGames({
    games,
    plays,
    year,
    metric,
    tierCollection: CostClub,
    tier: threshold,
    getGameValue: getCostClubValue,
    gameFilter: costClubGameFilter,
    getThisYearValue: getCostClubThisYearValue,
    getGameDetails: getNewCostClubGameDetails,
  });
}

/**
 * Get count of games that skipped over a cost club threshold entirely
 * A game skips when it goes from above threshold to below next-lower-threshold in one year
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @param {number} year - Year to analyze
 * @param {string} metric - Metric type: 'hours', 'sessions', or 'plays'
 * @param {number} threshold - Cost per metric threshold
 * @param {number|null} nextLowerThreshold - Next lower threshold (null if none exists)
 * @returns {number} Count of games that skipped this threshold
 */
function getSkippedCostClubCount(games, plays, year, metric, threshold, nextLowerThreshold = null) {
  // If no lower threshold exists, nothing can be skipped
  if (nextLowerThreshold === null) return 0;

  return getSkippedTierCount({
    games,
    plays,
    year,
    metric,
    tierCollection: CostClub,
    tier: threshold,
    getGameValue: getCostClubValue,
    gameFilter: costClubGameFilter,
  });
}

export {
  getTotalCost,
  getCostClubGames,
  calculateCostClubIncrease,
  getNewCostClubGames,
  getSkippedCostClubCount,
};
