/**
 * Calculates the median of an array of numbers.
 * @param {number[]} durations - Array of duration values
 * @returns {number|null} Median value or null if array is empty
 */
function calculateMedian(durations) {
  if (durations.length === 0) {
    return null;
  }

  const sorted = durations.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    // Even number: average of two middle values
    return (sorted[mid - 1] + sorted[mid]) / 2;
  } else {
    // Odd number: middle value
    return sorted[mid];
  }
}

/**
 * Enum representing the playUsedGameCopy field values from BG Stats.
 * @readonly
 * @enum {number}
 */
const PlayUsedGameCopyType = {
  NOT_SET: 0,
  MY_COPY: 1,
  OTHER_PLAYER_COPY: 2
};

/**
 * Gets the earliest acquired owned copy from a game's copies array.
 * @param {Array} copies - Array of copy objects
 * @returns {string|null} copyId of the earliest acquired owned copy, or null if none found
 */
function getEarliestOwnedCopy(copies) {
  if (!copies || copies.length === 0) {
    return null;
  }

  // Filter to owned copies with acquisition dates
  const ownedCopies = copies.filter(copy =>
    copy.statusOwned && copy.acquisitionDate
  );

  if (ownedCopies.length === 0) {
    // No owned copies with dates - try owned copies without dates
    const ownedWithoutDates = copies.filter(copy => copy.statusOwned);
    return ownedWithoutDates.length > 0 ? ownedWithoutDates[0].copyId : null;
  }

  // Sort by acquisition date (earliest first)
  ownedCopies.sort((a, b) => a.acquisitionDate.localeCompare(b.acquisitionDate));

  return ownedCopies[0].copyId;
}

/**
 * Extracts copy metadata from a game's copies array.
 * @param {Array} copies - Array of copy objects from BG Stats
 * @returns {Array} Array of copy objects with acquisitionDate and statusOwned
 */
function extractCopyMetadata(copies) {
  const result = [];

  if (copies && copies.length > 0) {
    copies.forEach(copy => {
      let copyAcquisitionDate = null;
      let pricePaid = null;
      let currency = null;

      if (copy.metaData) {
        try {
          const metadata = JSON.parse(copy.metaData);
          if (metadata.AcquisitionDate) {
            copyAcquisitionDate = metadata.AcquisitionDate; // Already in YYYY-MM-DD format
          }
          if (metadata.PricePaid) {
            const price = parseFloat(metadata.PricePaid);
            if (!isNaN(price)) {
              pricePaid = price;
            }
          }
          if (metadata.PricePaidCurrency) {
            currency = metadata.PricePaidCurrency;
          }
        } catch (e) {
          // Invalid JSON in metaData, skip
        }
      }

      result.push({
        copyId: copy.uuid || null,
        acquisitionDate: copyAcquisitionDate,
        statusOwned: copy.statusOwned === true,
        pricePaid: pricePaid,
        currency: currency
      });
    });
  }

  return result;
}

/**
 * Finds the expandalone tag ID from the tags array.
 * @param {Array} tags - Array of tag objects from BG Stats
 * @returns {number|undefined} Tag ID if found, undefined otherwise
 */
function findExpandaloneTagId(tags) {
  return tags.find(t => t.name.toLowerCase() === 'expandalone')?.id;
}

/**
 * Classifies a game based on mutually exclusive rules.
 * Priority: expandalone > base game > expansion
 * @param {Object} game - Game object from BG Stats
 * @param {boolean} isExpandalone - Whether game has expandalone tag
 * @returns {Object} Classification result with isBaseGame, isExpansion, isExpandalone
 */
function classifyGame(game, isExpandalone) {
  let finalIsBaseGame = false;
  let finalIsExpansion = false;
  let finalIsExpandalone = false;

  if (isExpandalone) {
    // Has expandalone tag - classify as expandalone
    finalIsExpandalone = true;
  } else if (game.isBaseGame === 1) {
    // Is base game (with or without expansion flag) - classify as base game
    finalIsBaseGame = true;
  } else if (game.isExpansion === 1) {
    // Pure expansion only
    finalIsExpansion = true;
  }
  // If none are set, all remain false (unknown type)

  return {
    isBaseGame: finalIsBaseGame,
    isExpansion: finalIsExpansion,
    isExpandalone: finalIsExpandalone
  };
}

/**
 * Builds a map of games with metadata and classification.
 * Modifies map in place by adding games.
 * @param {Array} games - Array of game objects from BG Stats
 * @param {number|undefined} expandaloneTagId - ID of the expandalone tag
 * @returns {Map} Map of game ID to enhanced game object
 */
function buildGamesMap(games, expandaloneTagId) {
  const gamesMap = new Map();

  games.forEach(game => {
    // Check if game has expandalone tag
    const isExpandalone = expandaloneTagId && game.tags?.some(tag => tag.tagRefId === expandaloneTagId) || false;

    // Extract copies metadata
    const copies = extractCopyMetadata(game.copies);

    // Classify game based on mutually exclusive rules
    const classification = classifyGame(game, isExpandalone);

    gamesMap.set(game.id, {
      id: game.id,
      name: game.name,
      bggId: game.bggId,
      year: game.bggYear || null,
      isBaseGame: classification.isBaseGame,
      isExpansion: classification.isExpansion,
      isExpandalone: classification.isExpandalone,
      copies: copies,
      playCount: 0,
      uniquePlayDays: new Set()
    });
  });

  return gamesMap;
}

/**
 * Collects durations per game from plays array.
 * Filters out zero durations.
 * @param {Array} plays - Array of play objects from BG Stats
 * @returns {Map} Map of game ID to array of durations
 */
function collectGameDurations(plays) {
  const gameDurationsMap = new Map();

  plays.forEach(play => {
    const gameId = play.gameRefId;
    const duration = play.durationMin || 0;

    if (duration > 0) {
      if (!gameDurationsMap.has(gameId)) {
        gameDurationsMap.set(gameId, []);
      }
      gameDurationsMap.get(gameId).push(duration);
    }
  });

  return gameDurationsMap;
}

/**
 * Calculates typical play times for all games.
 * Modifies gamesMap in place by setting typicalPlayTimeMinutes property.
 * @param {Map} gamesMap - Map of game ID to game object
 * @param {Map} gameDurationsMap - Map of game ID to array of durations
 * @param {Array} plays - Array of play objects from BG Stats
 */
function calculateTypicalPlayTimes(gamesMap, gameDurationsMap, plays) {
  // Calculate median for each game
  gameDurationsMap.forEach((durations, gameId) => {
    if (gamesMap.has(gameId)) {
      const median = calculateMedian(durations);
      gamesMap.get(gameId).typicalPlayTimeMinutes = median;
    }
  });

  // Ensure all games have typicalPlayTimeMinutes property (null if no data yet)
  gamesMap.forEach(game => {
    if (!game.hasOwnProperty('typicalPlayTimeMinutes')) {
      game.typicalPlayTimeMinutes = null;
    }
  });

  // Count plays per game to identify games that need 30-minute default
  const gamePlayCounts = new Map();
  plays.forEach(play => {
    const gameId = play.gameRefId;
    gamePlayCounts.set(gameId, (gamePlayCounts.get(gameId) || 0) + 1);
  });

  // Apply 30-minute default to games with plays but no duration data
  gamesMap.forEach(game => {
    if (game.typicalPlayTimeMinutes === null && gamePlayCounts.has(game.id)) {
      game.typicalPlayTimeMinutes = 30;
    }
  });
}

/**
 * Processes play records, extracting dates and denormalizing durations.
 * Modifies gamesMap in place by updating play statistics.
 * @param {Array} plays - Array of play objects from BG Stats
 * @param {Map} gamesMap - Map of game ID to game object
 * @returns {Array} Array of processed play objects
 */
function processPlays(plays, gamesMap) {
  const processedPlays = [];

  plays.forEach(play => {
    const gameId = play.gameRefId;
    const playDate = play.playDate.split(' ')[0]; // Just the date part (YYYY-MM-DD)
    const originalDuration = play.durationMin || 0;

    let finalDuration = originalDuration;
    let isEstimated = false;

    // If duration is missing (0), use game's typical play time
    if (originalDuration === 0 && gamesMap.has(gameId)) {
      const gameTypicalTime = gamesMap.get(gameId).typicalPlayTimeMinutes;
      if (gameTypicalTime !== null) {
        finalDuration = gameTypicalTime;
        isEstimated = true;
      }
    }

    // Extract copy ID based on playUsedGameCopy enum
    let copyId = null;
    if (gamesMap.has(gameId)) {
      const game = gamesMap.get(gameId);
      let playUsedGameCopyType = PlayUsedGameCopyType.NOT_SET;

      // Parse playUsedGameCopy from metaData
      if (play.metaData) {
        try {
          const metadata = JSON.parse(play.metaData);
          if (metadata.playUsedGameCopy !== undefined) {
            playUsedGameCopyType = metadata.playUsedGameCopy;
          }
        } catch (e) {
          // Invalid JSON in metaData, treat as NOT_SET
        }
      }

      // Handle enum cases
      if (playUsedGameCopyType === PlayUsedGameCopyType.MY_COPY) {
        // My copy - check for explicit UUID, otherwise use earliest owned copy
        if (play.playGameCopyUuid) {
          // Find copy by UUID
          const matchingCopy = game.copies.find(copy => copy.copyId === play.playGameCopyUuid);
          copyId = matchingCopy ? matchingCopy.copyId : getEarliestOwnedCopy(game.copies);
        } else {
          // No explicit UUID - use earliest owned copy
          copyId = getEarliestOwnedCopy(game.copies);
        }
      } else if (playUsedGameCopyType === PlayUsedGameCopyType.NOT_SET) {
        // Not set - assume my copy if I own the game
        copyId = getEarliestOwnedCopy(game.copies);
      }
      // playUsedGameCopyType === OTHER_PLAYER_COPY: copyId remains null
    }

    processedPlays.push({
      gameId: gameId,
      copyId: copyId,
      date: playDate,
      timestamp: play.playDate,
      durationMin: finalDuration,
      durationEstimated: isEstimated
    });

    // Update game play statistics
    if (gamesMap.has(gameId)) {
      const game = gamesMap.get(gameId);
      game.playCount++;
      game.uniquePlayDays.add(playDate);
    }
  });

  return processedPlays;
}

/**
 * Finalizes output by converting maps to arrays, sorting, and adding metadata.
 * @param {Map} gamesMap - Map of game ID to game object
 * @param {Array} plays - Array of processed play objects
 * @returns {Object} Final output object with games, plays, and metadata
 */
function finalizeOutput(gamesMap, plays) {
  // Convert games map to array and finalize
  const games = Array.from(gamesMap.values()).map(game => ({
    ...game,
    uniquePlayDays: game.uniquePlayDays.size
  }));

  // Sort games by name for easier browsing
  games.sort((a, b) => a.name.localeCompare(b.name));

  // Sort plays by timestamp (most recent first)
  plays.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  // Use latest play timestamp for generatedAt
  let generatedAt;
  if (plays.length > 0) {
    generatedAt = new Date(plays[0].timestamp).toISOString();
  } else {
    // Fallback to current time if no plays exist
    generatedAt = new Date().toISOString();
  }

  // Create output data
  return {
    games: games,
    plays: plays,
    generatedAt: generatedAt
  };
}

// Pure transformation function (testable)
function processData(bgStatsData) {
  // Build games map from BG Stats
  const expandaloneTagId = findExpandaloneTagId(bgStatsData.tags);
  const gamesMap = buildGamesMap(bgStatsData.games, expandaloneTagId);

  // Calculate typical play times for all games
  const gameDurationsMap = collectGameDurations(bgStatsData.plays);
  calculateTypicalPlayTimes(gamesMap, gameDurationsMap, bgStatsData.plays);

  // Process plays (store date, game reference, and duration data)
  const plays = processPlays(bgStatsData.plays, gamesMap);

  // Finalize output (convert to arrays, sort, add metadata)
  return finalizeOutput(gamesMap, plays);
}

module.exports = { processData };
