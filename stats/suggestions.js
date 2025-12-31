/**
 * Game suggestion algorithms
 */

import { Metric, Milestone, ValueClub } from './constants.js';
import { isGameOwned } from './game-helpers.js';
import {
  calculateTraditionalHIndex,
  calculatePlaySessionHIndex,
  calculateHourHIndex,
} from './h-index.js';
import { formatCostLabel } from '../formatting.js';

/**
 * Helper: Get metric value from game play data
 * Note: Uses uniqueDays (suggestions data structure) not uniqueDates (play-helpers structure)
 * @param {Object} data - Game play data with totalMinutes, uniqueDays, playCount
 * @param {string} metric - Metric type
 * @returns {number} Metric value
 */
function getMetricValue(data, metric) {
  switch (metric) {
    case Metric.SESSIONS:
      return data.uniqueDays.size;
    case Metric.PLAYS:
      return data.playCount;
    case Metric.HOURS:
    default:
      return data.totalMinutes / 60;
  }
}

/**
 * Helper: Get singular metric label
 * @param {string} metric - Metric type
 * @returns {string} Singular label ('hour', 'session', or 'play')
 */
function getMetricLabel(metric) {
  switch (metric) {
    case Metric.SESSIONS:
      return 'session';
    case Metric.PLAYS:
      return 'play';
    case Metric.HOURS:
    default:
      return 'hour';
  }
}

/**
 * Helper: Format a total metric stat string with proper pluralization
 * @param {number} value - Metric value
 * @param {string} metric - Metric type
 * @returns {string} Formatted stat (e.g., "9.5 total hours", "1 total session", "10 total plays")
 */
function formatTotalMetricStat(value, metric) {
  if (metric === Metric.HOURS) {
    return `${value.toFixed(1)} total hours`;
  }
  const intValue = Math.floor(value);
  const label = getMetricLabel(metric);
  const pluralLabel = intValue === 1 ? label : `${label}s`;
  return `${intValue} total ${pluralLabel}`;
}

/**
 * Helper: Calculate days since a date
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {number} Days since the date
 */
function calculateDaysSince(dateString) {
  const today = new Date();
  const date = new Date(dateString);
  return Math.floor((today - date) / (1000 * 60 * 60 * 24));
}

/**
 * Helper: Randomly select one item from an array
 * @param {Array} items - Array of items to select from
 * @returns {Object|null} Randomly selected item or null if array is empty
 */
function selectRandom(items) {
  if (items.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * items.length);
  return items[randomIndex];
}

/**
 * Select a random item with sqrt rarity weighting.
 * Items in larger groups get lower weight to boost underrepresented groups.
 * @param {Array} items - Array of items to select from
 * @param {Function} getGroupKeyFn - Function that returns group key for an item
 * @returns {*} Selected item or null if items is empty
 */
function selectRandomWeightedBySqrtRarity(items, getGroupKeyFn) {
  if (items.length === 0) return null;

  // Count items per group
  const groupCounts = new Map();
  items.forEach(item => {
    const key = getGroupKeyFn(item);
    groupCounts.set(key, (groupCounts.get(key) || 0) + 1);
  });

  // Calculate weight for each item: 1 / sqrt(groupSize)
  const weights = items.map(item => {
    const groupSize = groupCounts.get(getGroupKeyFn(item));
    return 1 / Math.sqrt(groupSize);
  });

  // Calculate cumulative weights
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const cumulativeWeights = [];
  let cumulative = 0;
  for (const weight of weights) {
    cumulative += weight;
    cumulativeWeights.push(cumulative);
  }

  // Select using weighted random
  const random = Math.random() * totalWeight;
  for (let i = 0; i < cumulativeWeights.length; i++) {
    if (random <= cumulativeWeights[i]) {
      return items[i];
    }
  }

  // Should never reach here due to cumulative weight math
  // If we do, return undefined and let the caller fail loudly (bug detection)
}

/**
 * Suggestion Algorithm 1: Recent games with lowest play session counts
 * @param {Map} gamePlayData - Map of game play data
 * @returns {Object|null} Suggestion object or null
 */
function suggestRecentlyPlayedWithLowSessions(gamePlayData) {
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const oneMonthAgoStr = oneMonthAgo.toISOString().split('T')[0];

  const recentlyPlayedGames = Array.from(gamePlayData.values())
    .filter(data => data.lastPlayDate && data.lastPlayDate >= oneMonthAgoStr && data.uniqueDays.size > 0)
    .sort((a, b) => a.uniqueDays.size - b.uniqueDays.size);

  if (recentlyPlayedGames.length === 0) return null;

  // Select randomly from games with the minimum session count
  const minSessions = recentlyPlayedGames[0].uniqueDays.size;
  const tiedGames = recentlyPlayedGames.filter(data => data.uniqueDays.size === minSessions);
  const candidate = selectRandom(tiedGames);
  return {
    game: candidate.game,
    reason: 'Fresh and recent',
    stat: formatTotalMetricStat(candidate.uniqueDays.size, Metric.SESSIONS),
  };
}

/**
 * Suggestion Algorithm 2: Game not played the longest
 * @param {Map} gamePlayData - Map of game play data
 * @returns {Object|null} Suggestion object or null
 */
function suggestLongestUnplayed(gamePlayData) {
  const playedGames = Array.from(gamePlayData.values())
    .filter(data => data.lastPlayDate !== null);

  if (playedGames.length === 0) return null;

  playedGames.sort((a, b) => a.lastPlayDate.localeCompare(b.lastPlayDate));

  // Select randomly from games with the oldest last play date
  const oldestDate = playedGames[0].lastPlayDate;
  const tiedGames = playedGames.filter(data => data.lastPlayDate === oldestDate);
  const candidate = selectRandom(tiedGames);

  // Format date as "Last played Month Year"
  const date = new Date(candidate.lastPlayDate);
  const monthYear = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  return {
    game: candidate.game,
    reason: 'Gathering dust',
    stat: `Last played ${monthYear}`,
  };
}

/**
 * Helper: Generic h-index suggestion algorithm
 * @param {Map} gamePlayData - Map of game play data
 * @param {number} currentHIndex - Current h-index value
 * @param {Function} getValue - Function to get the metric value from game data
 * @param {string} metricName - Name of the metric ('Hours', 'Sessions', or 'Plays')
 * @returns {Object|null} Suggestion object or null
 */
function suggestForNextHIndex(gamePlayData, currentHIndex, getValue, metricName) {
  const nextHIndex = currentHIndex + 1;

  // Count how many games already have nextHIndex or more of the metric
  const gamesAtOrAboveNext = Array.from(gamePlayData.values())
    .filter(data => getValue(data) >= nextHIndex).length;

  // How many more games need to reach nextHIndex to achieve h-index of nextHIndex
  // Note: gamesNeeded is always > 0 here because:
  // - If gamesAtOrAboveNext >= nextHIndex, then by h-index definition, currentHIndex >= nextHIndex
  // - But nextHIndex = currentHIndex + 1, so this is impossible
  const gamesNeeded = nextHIndex - gamesAtOrAboveNext;

  // Get all candidates with metric below nextHIndex, sorted by highest metric first
  const candidates = Array.from(gamePlayData.values())
    .filter(data => {
      const value = getValue(data);
      return value > 0 && value < nextHIndex;
    })
    .sort((a, b) => getValue(b) - getValue(a));

  if (candidates.length === 0) return null;

  // Find the metric value of the Nth candidate (where N = gamesNeeded)
  // Then select randomly from ALL games at that value or higher
  const cutoffValue = getValue(candidates[Math.min(gamesNeeded - 1, candidates.length - 1)]);
  const qualifyingCandidates = candidates.filter(data => getValue(data) >= cutoffValue);

  // Select randomly from all qualifying candidates (not just those tied at max)
  const candidate = selectRandom(qualifyingCandidates);

  // Generate stat description based on the metric value
  const metricValue = getValue(candidate);
  let statText;
  let reasonText;
  if (metricName === 'Hours') {
    statText = `${metricValue.toFixed(1)} hours`;
    reasonText = `Squaring up: ${nextHIndex} hours`;
  } else if (metricName === 'Sessions') {
    const sessionText = metricValue === 1 ? 'session' : 'sessions';
    statText = `${metricValue} ${sessionText}`;
    // Note: nextHIndex is always >= 2 here because candidates require value > 0 && value < nextHIndex,
    // which is impossible when nextHIndex === 1 for integer metrics
    reasonText = `Squaring up: ${nextHIndex} sessions`;
  } else {
    // Default case handles 'Plays' metric
    const playText = metricValue === 1 ? 'play' : 'plays';
    statText = `${metricValue} ${playText}`;
    // Note: nextHIndex is always >= 2 here for the same reason as sessions
    reasonText = `Squaring up: ${nextHIndex} plays`;
  }

  return {
    game: candidate.game,
    reason: reasonText,
    stat: statText,
  };
}

/**
 * Suggestion Algorithm 3: Games needed for next play session h-index
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @param {Map} gamePlayData - Map of game play data
 * @returns {Object|null} Suggestion object or null
 */
function suggestForNextSessionHIndex(games, plays, gamePlayData) {
  const currentHIndex = calculatePlaySessionHIndex(games, plays);
  return suggestForNextHIndex(
    gamePlayData,
    currentHIndex,
    data => data.uniqueDays.size,
    'Sessions'
  );
}

/**
 * Suggestion Algorithm 4: Games needed for next traditional h-index (play count)
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @param {Map} gamePlayData - Map of game play data
 * @returns {Object|null} Suggestion object or null
 */
function suggestForNextTraditionalHIndex(games, plays, gamePlayData) {
  const currentHIndex = calculateTraditionalHIndex(games, plays);
  return suggestForNextHIndex(
    gamePlayData,
    currentHIndex,
    data => data.playCount,
    'Plays'
  );
}

/**
 * Suggestion Algorithm 5: Games needed for next hour h-index
 * @param {Array} plays - Array of play objects
 * @param {Map} gamePlayData - Map of game play data
 * @returns {Object|null} Suggestion object or null
 */
function suggestForNextHourHIndex(plays, gamePlayData) {
  const currentHourHIndex = calculateHourHIndex(plays);
  return suggestForNextHIndex(
    gamePlayData,
    currentHourHIndex,
    data => data.totalMinutes / 60,
    'Hours'
  );
}

/**
 * Suggestion Algorithm 6: Games needed for next milestone (metric-aware)
 * @param {Map} gamePlayData - Map of game play data
 * @param {string} metric - Metric type: 'plays', 'sessions', or 'hours'
 * @returns {Object|null} Suggestion object or null
 */
function suggestForNextMilestone(gamePlayData, metric) {
  const allPlayedGames = Array.from(gamePlayData.values())
    .filter(data => getMetricValue(data, metric) > 0);

  // Find games approaching each milestone
  const milestoneChaseGames = allPlayedGames
    .map(data => {
      const currentValue = getMetricValue(data, metric);
      const target = Milestone.getNextTarget(currentValue);
      if (!target) return null;
      return {
        ...data,
        currentValue,
        target,
        needed: target - currentValue,
      };
    })
    .filter(item => item !== null);

  if (milestoneChaseGames.length === 0) return null;

  // Find the highest value below each milestone
  const closestToEachMilestone = [];

  Milestone.values.forEach(milestone => {
    const gamesUnderThisMilestone = milestoneChaseGames.filter(data => data.target === milestone);
    if (gamesUnderThisMilestone.length > 0) {
      // Find the highest value for this milestone
      const maxValue = Math.max(...gamesUnderThisMilestone.map(data => data.currentValue));
      closestToEachMilestone.push(maxValue);
    }
  });

  // Note: closestToEachMilestone cannot be empty here because:
  // 1. milestoneChaseGames is non-empty (checked above)
  // 2. Each game in milestoneChaseGames has a target from Milestone.values
  // So at least one milestone will match at least one game

  // Filter to games at these "closest" values, then select one with sqrt rarity weighting
  const closestGames = milestoneChaseGames.filter(data => closestToEachMilestone.includes(data.currentValue));
  const candidate = selectRandomWeightedBySqrtRarity(closestGames, game => game.target);

  // Create pithy reason based on milestone target
  const milestoneNames = {
    5: 'five',
    10: 'dime',
    25: 'quarter',
    100: 'century',
  };
  const milestoneName = milestoneNames[candidate.target];

  // Determine if within 90% of target (rounded down)
  const prefix = candidate.currentValue >= Math.floor(candidate.target * 0.9) ? 'Almost a' : 'Closest to a';

  return {
    game: candidate.game,
    reason: `${prefix} ${milestoneName}`,
    stat: formatTotalMetricStat(candidate.currentValue, metric),
  };
}

/**
 * Suggestion Algorithm: Game closest to joining their next value club tier
 * @param {Map} gamePlayData - Map of game play data (enriched with pricePaid)
 * @param {string} metric - Metric type: 'hours', 'sessions', or 'plays'
 * @returns {Object|null} Suggestion object or null
 */
function suggestForNextValueClub(gamePlayData, metric) {
  // Find games approaching their next value club tier
  const valueClubChaseGames = Array.from(gamePlayData.values())
    .map(data => {
      // Skip non-replayable games (legacy games, escape rooms, etc.)
      if (data.game.isNonReplayable) return null;

      // Must have price data
      if (data.pricePaid === null || data.pricePaid === undefined) return null;

      const metricValue = getMetricValue(data, metric);

      // Must have at least some play data
      if (metricValue === 0) return null;

      const costPerMetric = data.pricePaid / metricValue;
      const target = ValueClub.getNextTarget(costPerMetric);

      // Skip games that have achieved all tiers
      if (!target) return null;

      // Calculate how much more metric is needed to reach target tier
      const neededMetricForClub = data.pricePaid / target;
      const additionalNeeded = neededMetricForClub - metricValue;

      return {
        game: data.game,
        costPerMetric,
        metricValue,
        target,
        additionalNeeded,
        pricePaid: data.pricePaid,
      };
    })
    .filter(item => item !== null);

  if (valueClubChaseGames.length === 0) return null;

  // Find the minimum floored additionalNeeded for each tier (closest to joining)
  const closestToEachTier = [];

  ValueClub.values.forEach(tier => {
    const gamesTargetingThisTier = valueClubChaseGames.filter(data => data.target === tier);
    if (gamesTargetingThisTier.length > 0) {
      // Find the minimum additionalNeeded for this tier (closest to joining)
      const minNeeded = Math.min(...gamesTargetingThisTier.map(data => Math.floor(data.additionalNeeded)));
      closestToEachTier.push(minNeeded);
    }
  });

  // Filter to games at these "closest" values, then select one with sqrt rarity weighting
  const closestGames = valueClubChaseGames.filter(data =>
    closestToEachTier.includes(Math.floor(data.additionalNeeded)),
  );
  const selected = selectRandomWeightedBySqrtRarity(closestGames, game => game.target);

  const metricLabel = getMetricLabel(metric);

  return {
    game: selected.game,
    reason: `Join the ${formatCostLabel(selected.target)}/${metricLabel} club`,
    stat: `$${selected.costPerMetric.toFixed(2)}/${metricLabel}`,
  };
}

/**
 * Suggestion Algorithm 7: Add never-played game as suggestion
 * @param {Map} gamePlayData - Map of game play data
 * @returns {Object|null} Suggestion object or null
 */
function suggestNeverPlayedGame(gamePlayData) {
  const neverPlayedGames = Array.from(gamePlayData.values())
    .filter(data => data.playCount === 0);

  if (neverPlayedGames.length === 0) return null;

  // Select random never-played game
  const candidate = selectRandom(neverPlayedGames);

  return {
    game: candidate.game,
    reason: 'Shelf of shame',
    stat: 'Never played',
  };
}

/**
 * Get suggested games to play next based on play patterns
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @param {boolean} isExperimental - Whether experimental features are enabled
 * @returns {Array} Array of {game, reasons, stats} in priority order
 */
function getSuggestedGames(games, plays, isExperimental = false) {
  // Filter to owned base games only
  const ownedBaseGames = games.filter(game => game.isBaseGame && isGameOwned(game));

  // Build play data for each game
  const gamePlayData = new Map();

  ownedBaseGames.forEach(game => {
    gamePlayData.set(game.id, {
      game,
      playCount: 0,
      uniqueDays: new Set(),
      totalMinutes: 0,
      lastPlayDate: null,
      pricePaid: null,
    });
  });

  // Populate play data
  plays.forEach(play => {
    if (gamePlayData.has(play.gameId)) {
      const data = gamePlayData.get(play.gameId);
      data.playCount++;
      data.uniqueDays.add(play.date);
      data.totalMinutes += play.durationMin;

      // Track most recent play date
      if (!data.lastPlayDate || play.date > data.lastPlayDate) {
        data.lastPlayDate = play.date;
      }
    }
  });

  // Enrich with pricePaid when experimental features enabled
  if (isExperimental) {
    gamePlayData.forEach((data) => {
      const game = data.game;
      // Note: game.copies is guaranteed to exist here because isGameOwned filters out games without copies
      const ownedCopies = game.copies.filter(c => c.statusOwned === true);
      let totalPricePaid = 0;
      let hasPriceData = false;

      ownedCopies.forEach(copy => {
        if (copy.pricePaid !== null && copy.pricePaid !== undefined && copy.pricePaid !== '') {
          totalPricePaid += copy.pricePaid;
          hasPriceData = true;
        }
      });

      data.pricePaid = hasPriceData ? totalPricePaid : null;
    });
  }

  // Collect suggestions from each algorithm (in priority order)
  const suggestions = [
    suggestRecentlyPlayedWithLowSessions(gamePlayData),        // Fresh and recent
    suggestForNextHourHIndex(plays, gamePlayData),             // Squaring up: Hours
    suggestForNextSessionHIndex(games, plays, gamePlayData),   // Squaring up: Sessions
    suggestForNextTraditionalHIndex(games, plays, gamePlayData), // Squaring up: Plays
    suggestForNextMilestone(gamePlayData, Metric.HOURS),        // Almost a milestone (hours)
    suggestForNextMilestone(gamePlayData, Metric.SESSIONS),    // Almost a milestone (sessions)
    suggestForNextMilestone(gamePlayData, Metric.PLAYS),       // Almost a milestone (plays)
    // Value club suggestions (experimental) - one per metric type
    isExperimental ? suggestForNextValueClub(gamePlayData, Metric.HOURS) : null,
    isExperimental ? suggestForNextValueClub(gamePlayData, Metric.SESSIONS) : null,
    isExperimental ? suggestForNextValueClub(gamePlayData, Metric.PLAYS) : null,
    suggestLongestUnplayed(gamePlayData),                      // Gathering dust
    suggestNeverPlayedGame(gamePlayData),                       // Shelf of shame
  ].filter(suggestion => suggestion !== null);

  // Merge duplicates by collecting reasons and stats into arrays
  const gameMap = new Map();

  suggestions.forEach(suggestion => {
    if (!gameMap.has(suggestion.game.id)) {
      // Convert reason and stat to arrays for first occurrence
      suggestion.reasons = [suggestion.reason];
      suggestion.stats = [suggestion.stat];
      delete suggestion.reason;
      delete suggestion.stat;
      gameMap.set(suggestion.game.id, suggestion);
    } else {
      // Add reason and stat to existing arrays
      const existing = gameMap.get(suggestion.game.id);
      existing.reasons.push(suggestion.reason);
      existing.stats.push(suggestion.stat);
    }
  });

  // Convert map back to array (maintains priority order from first occurrence)
  return Array.from(gameMap.values());
}

export {
  calculateDaysSince,
  selectRandom,
  selectRandomWeightedBySqrtRarity,
  suggestRecentlyPlayedWithLowSessions,
  suggestLongestUnplayed,
  suggestForNextHIndex,
  suggestForNextSessionHIndex,
  suggestForNextTraditionalHIndex,
  suggestForNextHourHIndex,
  suggestForNextMilestone,
  suggestForNextValueClub,
  suggestNeverPlayedGame,
  getSuggestedGames,
};
