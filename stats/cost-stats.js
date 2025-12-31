/**
 * Cost statistics - price per play, cost clubs
 */

import { Metric } from './constants.js';
import { isGameOwned, wasCopyAcquiredInYear } from './game-helpers.js';
import { getMetricValuesThroughYear } from './play-helpers.js';

/**
 * Cost club thresholds (cost per metric unit)
 */
const CostClub = {
  FIVE_DOLLAR: 5,
};

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
 * Get metric value from play data
 * @param {Object} playData - { playCount, totalMinutes, uniqueDates }
 * @param {string} metric - Metric type: 'hours', 'sessions', or 'plays'
 * @returns {number} Metric value
 */
function getMetricValue(playData, metric) {
  switch (metric) {
    case Metric.SESSIONS:
      return playData.uniqueDates.size;
    case Metric.PLAYS:
      return playData.playCount;
    case Metric.HOURS:
    default:
      return playData.totalMinutes / 60;
  }
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
  const metricValuesPerGame = getMetricValuesThroughYear(plays, year);

  const clubGames = [];

  games.forEach(game => {
    // Only include owned base games
    if (!game.isBaseGame) return;
    if (!isGameOwned(game)) return;

    // Get owned copies and calculate total price paid
    const ownedCopies = game.copies.filter(copy => copy.statusOwned === true);
    let totalPricePaid = 0;
    let hasPriceData = false;

    ownedCopies.forEach(copy => {
      if (copy.pricePaid !== null && copy.pricePaid !== undefined && copy.pricePaid !== '') {
        totalPricePaid += copy.pricePaid;
        hasPriceData = true;
      }
    });

    // Must have price data to be in cost club
    if (!hasPriceData) return;

    // Must have play data with at least some metric value
    const playData = metricValuesPerGame.get(game.id);
    if (!playData) return;

    const metricValue = getMetricValue(playData, metric);
    if (metricValue === 0) return;

    // Cap at pricePaid so cost/metric never exceeds what was paid (handles metric < 1)
    const costPerMetric = Math.min(totalPricePaid / metricValue, totalPricePaid);

    // Include if cost per metric is at or below threshold
    if (costPerMetric <= threshold) {
      clubGames.push({
        game,
        metricValue,
        costPerMetric,
        pricePaid: totalPricePaid,
      });
    }
  });

  // Sort by costPerMetric ascending (best value games at top)
  clubGames.sort((a, b) => a.costPerMetric - b.costPerMetric);

  return {
    count: clubGames.length,
    games: clubGames,
  };
}

/**
 * Get games approaching cost club threshold
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @param {string} metric - Metric type: 'hours', 'sessions', or 'plays'
 * @param {number} threshold - Cost per metric threshold
 * @param {number} topN - Number of candidates to return
 * @param {number|null} year - Optional year filter
 * @returns {Array} Array of { game, costPerMetric, metricValue, additionalNeeded, pricePaid }
 */
function getGamesApproachingCostClub(games, plays, metric, threshold, topN, year = null) {
  const metricValuesPerGame = getMetricValuesThroughYear(plays, year);

  const candidates = [];

  games.forEach(game => {
    // Only include owned base games
    if (!game.isBaseGame) return;
    if (!isGameOwned(game)) return;

    // Get owned copies and calculate total price paid
    const ownedCopies = game.copies.filter(copy => copy.statusOwned === true);
    let totalPricePaid = 0;
    let hasPriceData = false;

    ownedCopies.forEach(copy => {
      if (copy.pricePaid !== null && copy.pricePaid !== undefined && copy.pricePaid !== '') {
        totalPricePaid += copy.pricePaid;
        hasPriceData = true;
      }
    });

    // Must have price data
    if (!hasPriceData) return;

    // Must have play data with at least some metric value
    const playData = metricValuesPerGame.get(game.id);
    if (!playData) return;

    const metricValue = getMetricValue(playData, metric);
    if (metricValue === 0) return;

    // Cap at pricePaid so cost/metric never exceeds what was paid (handles metric < 1)
    const costPerMetric = Math.min(totalPricePaid / metricValue, totalPricePaid);

    // Only include games not yet in club (above threshold)
    if (costPerMetric <= threshold) return;

    // Calculate how much more metric is needed to reach threshold
    // threshold = pricePaid / neededMetric
    // neededMetric = pricePaid / threshold
    const neededMetricForClub = totalPricePaid / threshold;
    const additionalNeeded = neededMetricForClub - metricValue;

    candidates.push({
      game,
      costPerMetric,
      metricValue,
      additionalNeeded,
      pricePaid: totalPricePaid,
    });
  });

  // Sort by additionalNeeded ascending (closest to club first)
  candidates.sort((a, b) => a.additionalNeeded - b.additionalNeeded);

  // Return top N
  return candidates.slice(0, topN);
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
  const currentYearCount = getCostClubGames(games, plays, metric, threshold, year).count;
  const previousYearCount = getCostClubGames(games, plays, metric, threshold, year - 1).count;

  return currentYearCount - previousYearCount;
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
  const currentYearClub = getCostClubGames(games, plays, metric, threshold, year);
  const previousYearClub = getCostClubGames(games, plays, metric, threshold, year - 1);

  // Build set of game IDs that were in club at end of previous year
  const previousYearIds = new Set(previousYearClub.games.map(g => g.game.id));

  // Calculate metric values for both years to compute thisYearMetricValue
  const metricValuesCurrentYear = getMetricValuesThroughYear(plays, year);
  const metricValuesPreviousYear = getMetricValuesThroughYear(plays, year - 1);

  // Find games in current year club but not in previous year club
  const newClubGames = currentYearClub.games
    .filter(g => !previousYearIds.has(g.game.id))
    .map(g => {
      const currentPlayData = metricValuesCurrentYear.get(g.game.id);
      const previousPlayData = metricValuesPreviousYear.get(g.game.id);
      const previousMetricValue = previousPlayData ? getMetricValue(previousPlayData, metric) : 0;
      const currentMetricValue = getMetricValue(currentPlayData, metric);

      return {
        game: g.game,
        metricValue: g.metricValue,
        costPerMetric: g.costPerMetric,
        pricePaid: g.pricePaid,
        thisYearMetricValue: currentMetricValue - previousMetricValue,
      };
    });

  // Already sorted by costPerMetric from getCostClubGames
  return newClubGames;
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

  // Games currently below nextLowerThreshold (skipped past this threshold)
  const currentBelowLower = getCostClubGames(games, plays, metric, nextLowerThreshold, year);
  const currentBelowLowerIds = new Set(currentBelowLower.games.map(g => g.game.id));

  // Games that were in threshold club at end of previous year
  const previousInClub = getCostClubGames(games, plays, metric, threshold, year - 1);
  const previousInClubIds = new Set(previousInClub.games.map(g => g.game.id));

  // Count games that are now below nextLowerThreshold but weren't in threshold club previously
  let skippedCount = 0;
  for (const id of currentBelowLowerIds) {
    if (!previousInClubIds.has(id)) {
      skippedCount++;
    }
  }

  return skippedCount;
}

export {
  CostClub,
  getTotalCost,
  getCostClubGames,
  getGamesApproachingCostClub,
  getMetricValue,
  calculateCostClubIncrease,
  getNewCostClubGames,
  getSkippedCostClubCount,
};
