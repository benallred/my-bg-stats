/**
 * Statistics Calculation Module
 * All functions for calculating board game statistics
 */

/**
 * Helper: Check if a game is currently owned
 * @param {Object} game - Game object
 * @returns {boolean} true if any copy is currently owned
 */
function isGameOwned(game) {
  if (!game.copies || game.copies.length === 0) return false;
  return game.copies.some(copy => copy.statusOwned === true);
}

/**
 * Helper: Check if a game was acquired in a specific year
 * @param {Object} game - Game object
 * @param {number} year - Year to check
 * @returns {boolean} true if any copy was acquired in the year
 */
function wasGameAcquiredInYear(game, year) {
  if (!game.copies || game.copies.length === 0) return false;
  return game.copies.some(copy =>
    copy.acquisitionDate && copy.acquisitionDate.startsWith(year.toString())
  );
}

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
    expansionOnly: expansions.length
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
      uniqueDates: new Set()
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
    centuries: []
  };

  metricValuesPerGame.forEach((value, gameId) => {
    const game = games.find(g => g.id === gameId);
    if (!game) return;

    // Select the appropriate metric value
    let count;
    if (metric === 'hours') {
      count = value.totalMinutes / 60;
    } else if (metric === 'sessions') {
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
 * Get cumulative count of games that have reached a specific milestone threshold or higher
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @param {number|null} year - Year filter, or null for all time
 * @param {string} metric - Metric to use ('hours', 'sessions', or 'plays')
 * @param {number} threshold - Threshold value (5, 10, 25, or 100)
 * @returns {number} Count of games with metric value >= threshold
 */
function getCumulativeMilestoneCount(games, plays, year, metric, threshold) {
  // Calculate metric values per game
  const metricValuesPerGame = new Map();

  plays.forEach(play => {
    if (year && !play.date.startsWith(year.toString())) return;

    const currentValue = metricValuesPerGame.get(play.gameId) || {
      playCount: 0,
      totalMinutes: 0,
      uniqueDates: new Set()
    };

    currentValue.playCount += 1;
    currentValue.totalMinutes += (play.durationMin || 0);
    currentValue.uniqueDates.add(play.date);

    metricValuesPerGame.set(play.gameId, currentValue);
  });

  // Count games at or above threshold
  let count = 0;
  metricValuesPerGame.forEach((value, gameId) => {
    const game = games.find(g => g.id === gameId);
    if (!game) return;

    // Select the appropriate metric value
    let metricValue;
    if (metric === 'hours') {
      metricValue = value.totalMinutes / 60;
    } else if (metric === 'sessions') {
      metricValue = value.uniqueDates.size;
    } else {
      metricValue = value.playCount;
    }

    if (metricValue >= threshold) {
      count++;
    }
  });

  return count;
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
    case 'sessions':
      return calculatePlaySessionHIndex(games, filteredPlays);
    case 'plays':
      return calculateTraditionalHIndex(games, filteredPlays);
    case 'hours':
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
    case 'sessions':
      currentBreakdown = getHIndexBreakdown(games, filteredPlaysCurrentYear, null, true);
      break;
    case 'plays':
      currentBreakdown = getHIndexBreakdown(games, filteredPlaysCurrentYear, null, false);
      break;
    case 'hours':
    default:
      currentBreakdown = getHourHIndexBreakdown(games, filteredPlaysCurrentYear);
      break;
  }

  // Get contributor game IDs for current year
  const currentContributors = new Set();
  for (let i = 0; i < currentHIndex && i < currentBreakdown.length; i++) {
    const rank = i + 1;
    const value = metric === 'hours' ? currentBreakdown[i].hours : currentBreakdown[i].count;
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
    case 'sessions':
      previousBreakdown = getHIndexBreakdown(games, filteredPlaysPreviousYear, null, true);
      break;
    case 'plays':
      previousBreakdown = getHIndexBreakdown(games, filteredPlaysPreviousYear, null, false);
      break;
    case 'hours':
    default:
      previousBreakdown = getHourHIndexBreakdown(games, filteredPlaysPreviousYear);
      break;
  }

  // Get contributor game IDs for previous year
  const previousContributors = new Set();
  for (let i = 0; i < previousHIndex && i < previousBreakdown.length; i++) {
    const rank = i + 1;
    const value = metric === 'hours' ? previousBreakdown[i].hours : previousBreakdown[i].count;
    if (rank <= value && rank <= previousHIndex) {
      previousContributors.add(previousBreakdown[i].game.id);
    }
  }

  // Find games that are in current contributors but not in previous contributors
  const newGames = [];
  for (let i = 0; i < currentBreakdown.length; i++) {
    const gameId = currentBreakdown[i].game.id;
    if (currentContributors.has(gameId) && !previousContributors.has(gameId)) {
      const allTimeValue = metric === 'hours' ? currentBreakdown[i].hours : currentBreakdown[i].count;

      // Calculate this year's value for this game
      const thisYearPlays = plays.filter(play => {
        const playYear = parseInt(play.date.substring(0, 4));
        return playYear === year && play.gameId === gameId;
      });

      let thisYearValue;
      switch (metric) {
        case 'sessions':
          // Count unique days
          thisYearValue = new Set(thisYearPlays.map(play => play.date)).size;
          break;
        case 'plays':
          // Count plays
          thisYearValue = thisYearPlays.length;
          break;
        case 'hours':
        default:
          // Sum hours
          thisYearValue = thisYearPlays.reduce((sum, play) => sum + (play.durationMin / 60), 0);
          break;
      }

      newGames.push({
        game: currentBreakdown[i].game,
        value: allTimeValue,
        thisYearValue: thisYearValue
      });
    }
  }

  return newGames;
}

/**
 * Get total play time statistics
 * @param {Array} plays - Array of play objects
 * @param {number|null} year - Optional year filter
 * @returns {Object} { totalMinutes, totalHours, playsWithActualDuration, playsWithEstimatedDuration, totalPlays }
 */
function getTotalPlayTime(plays, year = null) {
  let totalMinutes = 0;
  let playsWithActualDuration = 0;
  let playsWithEstimatedDuration = 0;
  let totalPlays = 0;

  plays.forEach(play => {
    if (year && !play.date.startsWith(year.toString())) return;

    totalPlays++;

    // Note: With current process-data.js implementation, all plays have durationMin > 0
    // (either actual or estimated with 30-minute default), so playsSkipped should always be 0
    if (play.durationMin > 0) {
      totalMinutes += play.durationMin;
      if (play.durationEstimated) {
        playsWithEstimatedDuration++;
      } else {
        playsWithActualDuration++;
      }
    }
  });

  return {
    totalMinutes,
    totalHours: totalMinutes / 60,
    playsWithActualDuration,
    playsWithEstimatedDuration,
    totalPlays
  };
}

/**
 * Get play time breakdown by game
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @param {number|null} year - Optional year filter
 * @returns {Array} Array of {game, totalMinutes, totalHours, playCount, actualCount, estimatedCount, minMinutes, maxMinutes, medianMinutes, avgMinutes} sorted by totalMinutes descending. Min/max/median/avg are only calculated from plays with duration data.
 */
function getPlayTimeByGame(games, plays, year = null) {
  const gameTimeMap = new Map();

  plays.forEach(play => {
    if (year && !play.date.startsWith(year.toString())) return;

    if (!gameTimeMap.has(play.gameId)) {
      gameTimeMap.set(play.gameId, {
        totalMinutes: 0,
        playCount: 0,
        actualCount: 0,
        estimatedCount: 0,
        durations: []
      });
    }

    const gameTime = gameTimeMap.get(play.gameId);
    gameTime.playCount++;

    if (play.durationMin > 0) {
      gameTime.totalMinutes += play.durationMin;
      gameTime.durations.push(play.durationMin);
      if (play.durationEstimated) {
        gameTime.estimatedCount++;
      } else {
        gameTime.actualCount++;
      }
    }
  });

  // Convert to array with game objects
  const breakdown = [];
  gameTimeMap.forEach((timeData, gameId) => {
    const game = games.find(g => g.id === gameId);
    if (game) {
      // Calculate min, max, median, and average
      let minMinutes = null;
      let maxMinutes = null;
      let medianMinutes = null;
      let avgMinutes = null;

      if (timeData.durations.length > 0) {
        minMinutes = Math.min(...timeData.durations);
        maxMinutes = Math.max(...timeData.durations);
        avgMinutes = timeData.totalMinutes / timeData.durations.length;

        // Calculate median
        const sorted = [...timeData.durations].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        if (sorted.length % 2 === 0) {
          medianMinutes = (sorted[mid - 1] + sorted[mid]) / 2;
        } else {
          medianMinutes = sorted[mid];
        }
      }

      breakdown.push({
        game,
        totalMinutes: timeData.totalMinutes,
        totalHours: timeData.totalMinutes / 60,
        playCount: timeData.playCount,
        actualCount: timeData.actualCount,
        estimatedCount: timeData.estimatedCount,
        minMinutes,
        maxMinutes,
        medianMinutes,
        avgMinutes
      });
    }
  });

  // Sort by total minutes descending
  breakdown.sort((a, b) => b.totalMinutes - a.totalMinutes);

  return breakdown;
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
 * Helper: Get next milestone target for a play count
 * @param {number} count - Current play count
 * @returns {number|null} Next milestone target or null if past 100
 */
function getNextMilestoneTarget(count) {
  if (count < 5) return 5;
  if (count < 10) return 10;
  if (count < 25) return 25;
  if (count < 100) return 100;
  return null;
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
  const sessionText = candidate.uniqueDays.size === 1 ? '1 total session' : `${candidate.uniqueDays.size} total sessions`;
  return {
    game: candidate.game,
    reason: 'Fresh and recent',
    stat: sessionText
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
    stat: `Last played ${monthYear}`
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
  const gamesNeeded = nextHIndex - gamesAtOrAboveNext;

  if (gamesNeeded <= 0) return null; // Already at next h-index or beyond

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
    const nextSessionText = nextHIndex === 1 ? 'session' : 'sessions';
    reasonText = `Squaring up: ${nextHIndex} ${nextSessionText}`;
  } else if (metricName === 'Plays') {
    const playText = metricValue === 1 ? 'play' : 'plays';
    statText = `${metricValue} ${playText}`;
    const nextPlayText = nextHIndex === 1 ? 'play' : 'plays';
    reasonText = `Squaring up: ${nextHIndex} ${nextPlayText}`;
  }

  return {
    game: candidate.game,
    reason: reasonText,
    stat: statText
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
  // Get value based on metric
  const getValue = (data) => {
    if (metric === 'hours') {
      return data.totalMinutes / 60;
    } else if (metric === 'sessions') {
      return data.uniqueDays.size;
    } else {
      return data.playCount;
    }
  };

  const allPlayedGames = Array.from(gamePlayData.values())
    .filter(data => getValue(data) > 0);

  // Find games approaching each milestone
  const milestoneChaseGames = allPlayedGames
    .map(data => {
      const currentValue = getValue(data);
      const target = getNextMilestoneTarget(currentValue);
      if (!target) return null;
      return {
        ...data,
        currentValue,
        target,
        needed: target - currentValue
      };
    })
    .filter(item => item !== null);

  if (milestoneChaseGames.length === 0) return null;

  // Find the highest value below each milestone (5, 10, 25, 100)
  const milestones = [5, 10, 25, 100];
  const closestToEachMilestone = [];

  milestones.forEach(milestone => {
    const gamesUnderThisMilestone = milestoneChaseGames.filter(data => data.target === milestone);
    if (gamesUnderThisMilestone.length > 0) {
      // Find the highest value for this milestone
      const maxValue = Math.max(...gamesUnderThisMilestone.map(data => data.currentValue));
      closestToEachMilestone.push(maxValue);
    }
  });

  if (closestToEachMilestone.length === 0) return null;

  // Filter to games at these "closest" values, then select one with sqrt rarity weighting
  const closestGames = milestoneChaseGames.filter(data => closestToEachMilestone.includes(data.currentValue));
  const candidate = selectRandomWeightedBySqrtRarity(closestGames, game => game.target);

  // Create pithy reason based on milestone target
  const milestoneNames = {
    5: 'five',
    10: 'dime',
    25: 'quarter',
    100: 'century'
  };
  const milestoneName = milestoneNames[candidate.target];

  // Determine if within 90% of target (rounded down)
  const prefix = candidate.currentValue >= Math.floor(candidate.target * 0.9) ? 'Almost a' : 'Closest to a';

  // Format stat text based on metric
  let statText;
  if (metric === 'hours') {
    statText = `${candidate.currentValue.toFixed(1)} total hours`;
  } else if (metric === 'sessions') {
    const sessionCount = Math.floor(candidate.currentValue);
    statText = sessionCount === 1 ? '1 total day' : `${sessionCount} total days`;
  } else {
    const playCount = Math.floor(candidate.currentValue);
    statText = playCount === 1 ? '1 total play' : `${playCount} total plays`;
  }

  return {
    game: candidate.game,
    reason: `${prefix} ${milestoneName}`,
    stat: statText
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
    stat: 'Never played'
  };
}

/**
 * Get suggested games to play next based on play patterns
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @returns {Array} Array of {game, reasons, stats} in priority order
 */
function getSuggestedGames(games, plays) {
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
      lastPlayDate: null
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

  // Collect suggestions from each algorithm (in priority order)
  const suggestions = [
    suggestRecentlyPlayedWithLowSessions(gamePlayData),        // Fresh and recent
    suggestForNextHourHIndex(plays, gamePlayData),             // Squaring up: Hours
    suggestForNextSessionHIndex(games, plays, gamePlayData),   // Squaring up: Sessions
    suggestForNextTraditionalHIndex(games, plays, gamePlayData), // Squaring up: Plays
    suggestForNextMilestone(gamePlayData, 'hours'),            // Almost a milestone (hours)
    suggestForNextMilestone(gamePlayData, 'sessions'),         // Almost a milestone (sessions)
    suggestForNextMilestone(gamePlayData, 'plays'),            // Almost a milestone (plays)
    suggestLongestUnplayed(gamePlayData),                      // Gathering dust
    suggestNeverPlayedGame(gamePlayData)                       // Shelf of shame
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

// Export functions for testing (ES modules)
export {
  isGameOwned,
  wasGameAcquiredInYear,
  calculateDaysSince,
  calculateHIndexFromSortedValues,
  calculateTraditionalHIndex,
  calculatePlaySessionHIndex,
  calculateHourHIndex,
  calculateAllTimeHIndexThroughYear,
  calculateHIndexIncrease,
  getNewHIndexGames,
  getTotalBGGEntries,
  getTotalGamesOwned,
  getTotalExpansions,
  getTotalPlays,
  getTotalDaysPlayed,
  getTotalGamesPlayed,
  getMilestones,
  getCumulativeMilestoneCount,
  getGamesWithUnknownAcquisitionDate,
  getOwnedGamesNeverPlayed,
  getAllAcquisitionYears,
  getAvailableYears,
  getHIndexBreakdown,
  getHourHIndexBreakdown,
  getTotalPlayTime,
  getPlayTimeByGame,
  getNextMilestoneTarget,
  selectRandom,
  selectRandomWeightedBySqrtRarity,
  getSuggestedGames
};
