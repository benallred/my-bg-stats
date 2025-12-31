/**
 * Tier helper functions for milestone and cost club calculations
 */

import { getMetricValuesThroughYear } from './play-helpers.js';

/**
 * Get games within a tier through a given year
 * @param {Object} config - Configuration object
 * @param {Array} config.games - Array of game objects
 * @param {Array} config.plays - Array of play objects
 * @param {number|null} config.year - Year filter, or null for all time
 * @param {string} config.metric - Metric type: 'hours', 'sessions', or 'plays'
 * @param {Object} config.tierCollection - Tier collection (Milestone or CostClub)
 * @param {number} config.tier - Tier value to check
 * @param {Function} config.getGameValue - Function(game, playData, metric) => number|null
 * @param {Function} [config.gameFilter] - Function(game) => boolean (optional, defaults to () => true)
 * @param {Function} [config.getGameDetails] - Function(game, playData, value, metric) => object (optional, for custom result shape)
 * @returns {Array} Array of { game, value } or custom shape from getGameDetails
 */
function getGamesInTier(config) {
  const {
    games,
    plays,
    year,
    metric,
    tierCollection,
    tier,
    getGameValue,
    gameFilter = () => true,
    getGameDetails = null,
  } = config;

  const metricValuesPerGame = getMetricValuesThroughYear(plays, year);
  const result = [];

  games.forEach(game => {
    if (!gameFilter(game)) return;

    const playData = metricValuesPerGame.get(game.id);
    const value = getGameValue(game, playData, metric);
    if (value === null) return;

    const isInTier = tierCollection.isValueInTier(value, tier);

    if (isInTier) {
      if (getGameDetails) {
        const details = getGameDetails(game, playData, value, metric);
        details.value = value; // Ensure value is available for sorting
        result.push(details);
      } else {
        result.push({ game, value });
      }
    }
  });

  // Sort by value (direction-aware)
  if (tierCollection.direction === 'ascending') {
    result.sort((a, b) => b.value - a.value);
  } else {
    result.sort((a, b) => a.value - b.value);
  }

  return result;
}

/**
 * Count games within a tier range through a given year
 * @param {Object} config - Configuration object (same as getGamesInTier)
 * @returns {number} Count of games within the tier range
 */
function countGamesInTier(config) {
  return getGamesInTier(config).length;
}

/**
 * Calculate the increase in tier count for a specific year
 * @param {Object} config - Configuration object (same as countGamesInTier)
 * @returns {number} Increase in tier count (can be negative)
 */
function calculateTierIncrease(config) {
  const currentYearCount = countGamesInTier(config);
  const previousYearCount = countGamesInTier({
    ...config,
    year: config.year - 1,
  });
  return currentYearCount - previousYearCount;
}

/**
 * Get games newly reaching a specific tier in a specific year
 * @param {Object} config - Configuration object
 * @param {Array} config.games - Array of game objects
 * @param {Array} config.plays - Array of play objects
 * @param {number} config.year - Year to analyze
 * @param {string} config.metric - Metric type
 * @param {Object} config.tierCollection - Tier collection
 * @param {number} config.tier - Tier value to check
 * @param {Function} config.getGameValue - Function(game, playData, metric) => number|null
 * @param {Function} [config.gameFilter] - Function(game) => boolean (optional)
 * @param {Function} config.getThisYearValue - Function(game, currentPlayData, previousPlayData, metric) => number
 * @param {Function} [config.getGameDetails] - Function(game, currentPlayData, value, thisYearValue, metric) => object (optional)
 * @returns {Array} Array of { game, value, thisYearValue } or custom shape from getGameDetails
 */
function getNewTierGames(config) {
  const {
    games,
    plays,
    year,
    metric,
    tierCollection,
    tier,
    getGameValue,
    gameFilter = () => true,
    getThisYearValue,
    getGameDetails = null,
  } = config;

  const metricValuesCurrentYear = getMetricValuesThroughYear(plays, year);
  const metricValuesPreviousYear = getMetricValuesThroughYear(plays, year - 1);

  const newTierGames = [];

  games.forEach(game => {
    if (!gameFilter(game)) return;

    const currentPlayData = metricValuesCurrentYear.get(game.id);
    const currentValue = getGameValue(game, currentPlayData, metric);
    if (currentValue === null) return;

    // Check if game is within the tier range by current year
    if (!tierCollection.isValueInTier(currentValue, tier)) return;

    // Calculate previous year value
    const previousPlayData = metricValuesPreviousYear.get(game.id);
    const previousValue = getGameValue(game, previousPlayData, metric);

    // Check if game was already in this tier range last year
    const wasInRange = previousValue !== null && tierCollection.isValueInTier(previousValue, tier);

    if (!wasInRange) {
      const thisYearValue = getThisYearValue(game, currentPlayData, previousPlayData, metric);

      if (getGameDetails) {
        const details = getGameDetails(game, currentPlayData, currentValue, thisYearValue, metric);
        details.value = currentValue; // Ensure value is available for sorting
        newTierGames.push(details);
      } else {
        newTierGames.push({
          game,
          value: currentValue,
          thisYearValue,
        });
      }
    }
  });

  // Sort by value (direction-aware)
  if (tierCollection.direction === 'ascending') {
    newTierGames.sort((a, b) => b.value - a.value);
  } else {
    newTierGames.sort((a, b) => a.value - b.value);
  }

  return newTierGames;
}

/**
 * Get count of games that skipped a tier entirely
 * A game "skips" a tier when it was before the tier at end of previous year
 * and is beyond the tier at end of current year (jumped completely over the range)
 * @param {Object} config - Configuration object
 * @param {Array} config.games - Array of game objects
 * @param {Array} config.plays - Array of play objects
 * @param {number} config.year - Year to analyze
 * @param {string} config.metric - Metric type
 * @param {Object} config.tierCollection - Tier collection
 * @param {number} config.tier - Tier value to check
 * @param {Function} config.getGameValue - Function(game, playData, metric) => number|null
 * @param {Function} [config.gameFilter] - Function(game) => boolean (optional)
 * @returns {number} Count of games that skipped this tier
 */
function getSkippedTierCount(config) {
  const {
    games,
    plays,
    year,
    metric,
    tierCollection,
    tier,
    getGameValue,
    gameFilter = () => true,
  } = config;

  // Get next threshold (tier boundary beyond current tier)
  const { threshold, nextThreshold } = tierCollection.getThreshold(tier);
  if (nextThreshold === null) return 0; // Last tier can't be skipped

  const metricValuesCurrentYear = getMetricValuesThroughYear(plays, year);
  const metricValuesPreviousYear = getMetricValuesThroughYear(plays, year - 1);

  let skippedCount = 0;

  games.forEach(game => {
    if (!gameFilter(game)) return;

    const currentPlayData = metricValuesCurrentYear.get(game.id);
    const currentValue = getGameValue(game, currentPlayData, metric);
    if (currentValue === null) return;

    // Game must be beyond the tier range (jumped over)
    const isBeyondTier = tierCollection.direction === 'ascending'
      ? currentValue >= nextThreshold
      : currentValue <= nextThreshold;
    if (!isBeyondTier) return;

    // Calculate previous year value
    const previousPlayData = metricValuesPreviousYear.get(game.id);
    const previousValue = getGameValue(game, previousPlayData, metric);

    // Game must have been before the tier threshold at end of previous year
    const wasBeforeTier = previousValue === null ||
      (tierCollection.direction === 'ascending'
        ? previousValue < threshold
        : previousValue > threshold);

    if (wasBeforeTier) {
      skippedCount++;
    }
  });

  return skippedCount;
}

export {
  getGamesInTier,
  countGamesInTier,
  calculateTierIncrease,
  getNewTierGames,
  getSkippedTierCount,
};
