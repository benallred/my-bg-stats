/**
 * Statistics Calculation Module
 * All functions for calculating board game statistics
 */

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

  // Calculate h-index
  let hIndex = 0;
  for (let i = 0; i < counts.length; i++) {
    if (counts[i] >= i + 1) {
      hIndex = i + 1;
    } else {
      break;
    }
  }

  return hIndex;
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

  // Calculate h-index
  let hIndex = 0;
  for (let i = 0; i < counts.length; i++) {
    if (counts[i] >= i + 1) {
      hIndex = i + 1;
    } else {
      break;
    }
  }

  return hIndex;
}

/**
 * Get total BGG entries owned (includes expansions and expandalones)
 * @param {Array} games - Array of game objects
 * @param {number|null} year - Optional year filter (for acquisitions)
 * @returns {number} count
 */
function getTotalBGGEntries(games, year = null) {
  return games.filter(game => {
    if (year) {
      return game.acquisitionDate && game.acquisitionDate.startsWith(year.toString());
    }
    return true;
  }).length;
}

/**
 * Get total base games owned (excludes expandalones)
 * @param {Array} games - Array of game objects
 * @param {number|null} year - Optional year filter (for acquisitions)
 * @returns {number} count
 */
function getTotalGamesOwned(games, year = null) {
  return games.filter(game => {
    if (!game.isBaseGame || game.isExpandalone) return false;
    if (year) {
      return game.acquisitionDate && game.acquisitionDate.startsWith(year.toString());
    }
    return true;
  }).length;
}

/**
 * Get total expansions owned
 * @param {Array} games - Array of game objects
 * @param {number|null} year - Optional year filter (for acquisitions)
 * @returns {Object} { total, expandalones, expansionOnly }
 */
function getTotalExpansions(games, year = null) {
  const expansions = games.filter(game => {
    if (!game.isExpansion) return false;
    if (year) {
      return game.acquisitionDate && game.acquisitionDate.startsWith(year.toString());
    }
    return true;
  });

  return {
    total: expansions.length,
    expandalones: expansions.filter(g => g.isExpandalone).length,
    expansionOnly: expansions.filter(g => !g.isExpandalone).length
  };
}

/**
 * Get total plays logged
 * @param {Array} plays - Array of play objects
 * @param {number|null} year - Optional year filter
 * @returns {number} count
 */
function getTotalPlays(plays, year = null) {
  if (!year) return plays.length;
  return plays.filter(play => play.date.startsWith(year.toString())).length;
}

/**
 * Get total unique days played
 * @param {Array} plays - Array of play objects
 * @param {number|null} year - Optional year filter
 * @returns {number} count
 */
function getTotalDaysPlayed(plays, year = null) {
  const uniqueDays = new Set();
  plays.forEach(play => {
    if (!year || play.date.startsWith(year.toString())) {
      uniqueDays.add(play.date);
    }
  });
  return uniqueDays.size;
}

/**
 * Get total unique games played
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @param {number|null} year - Optional year filter
 * @returns {Object} { total, newToMe }
 */
function getTotalGamesPlayed(games, plays, year = null) {
  const gamesPlayedIds = new Set();
  const firstPlayDates = new Map();

  // Find all games played and their first play date
  plays.forEach(play => {
    if (!year || play.date.startsWith(year.toString())) {
      gamesPlayedIds.add(play.gameId);
    }

    // Track first play date for each game
    if (!firstPlayDates.has(play.gameId)) {
      firstPlayDates.set(play.gameId, play.date);
    } else {
      const currentFirst = firstPlayDates.get(play.gameId);
      if (play.date < currentFirst) {
        firstPlayDates.set(play.gameId, play.date);
      }
    }
  });

  // Count new-to-me games if filtering by year
  let newToMe = 0;
  if (year) {
    firstPlayDates.forEach((firstDate, gameId) => {
      if (firstDate.startsWith(year.toString())) {
        newToMe++;
      }
    });
  }

  return {
    total: gamesPlayedIds.size,
    newToMe: year ? newToMe : null
  };
}

/**
 * Get games by play milestones (fives, dimes, quarters, centuries)
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @param {number|null} year - Optional year filter
 * @returns {Object} { fives, dimes, quarters, centuries }
 */
function getPlayMilestones(games, plays, year = null) {
  // Count plays per game
  const playCountsPerGame = new Map();

  plays.forEach(play => {
    if (year && !play.date.startsWith(year.toString())) return;

    const count = playCountsPerGame.get(play.gameId) || 0;
    playCountsPerGame.set(play.gameId, count + 1);
  });

  // Categorize games by milestone
  const milestones = {
    fives: [],
    dimes: [],
    quarters: [],
    centuries: []
  };

  playCountsPerGame.forEach((count, gameId) => {
    const game = games.find(g => g.id === gameId);
    if (!game) return;

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
 * Get games with unknown acquisition dates
 * @param {Array} games - Array of game objects
 * @param {number|null} year - Optional year filter (for plays in that year)
 * @returns {Array} games without acquisition dates
 */
function getGamesWithUnknownAcquisitionDate(games, year = null) {
  return games.filter(game => !game.acquisitionDate);
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
    // Must not have been played
    if (playedGameIds.has(game.id)) return false;

    // If year filter is active, only show games acquired that year
    if (year) {
      return game.acquisitionDate && game.acquisitionDate.startsWith(year.toString());
    }

    return true;
  });
}

/**
 * Get all available years from plays
 * @param {Array} plays - Array of play objects
 * @returns {Array} sorted array of years
 */
function getAvailableYears(plays) {
  const years = new Set();
  plays.forEach(play => {
    const year = parseInt(play.date.substring(0, 4));
    years.add(year);
  });
  return Array.from(years).sort((a, b) => b - a); // Most recent first
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
