/**
 * Cost statistics - price per play, cost clubs
 */

import { Metric } from './constants.js';
import { isGameOwned, wasCopyAcquiredInYear } from './game-helpers.js';
import { isPlayInOrBeforeYear } from './play-helpers.js';

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
 * Calculate metric values per game from plays
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @param {number|null} year - Optional year filter
 * @returns {Map} Map of gameId -> { playCount, totalMinutes, uniqueDates }
 */
function calculateMetricValuesPerGame(games, plays, year = null) {
  const metricValuesPerGame = new Map();

  plays.forEach(play => {
    if (!isPlayInOrBeforeYear(play, year)) return;

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

  return metricValuesPerGame;
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
  const metricValuesPerGame = calculateMetricValuesPerGame(games, plays, year);

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
  const metricValuesPerGame = calculateMetricValuesPerGame(games, plays, year);

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

export {
  CostClub,
  getTotalCost,
  getCostClubGames,
  getGamesApproachingCostClub,
  calculateMetricValuesPerGame,
  getMetricValue,
};
