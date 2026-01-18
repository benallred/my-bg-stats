import { calculateMedian } from '../utils.js';

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
 * Selects the rating to use for a game from its copies.
 * Priority: owned copies (latest acquired) > unowned copies with rating.
 * If only one copy has a rating, uses that regardless of ownership.
 * @param {Array} copies - Array of processed copy objects (with rating field)
 * @returns {number|null} The selected rating or null if none
 */
function selectGameRating(copies) {
  if (!copies || copies.length === 0) {
    return null;
  }

  // Filter to copies with ratings
  const copiesWithRating = copies.filter(copy => copy.rating !== null);

  if (copiesWithRating.length === 0) {
    return null;
  }

  // If only one copy has a rating, use it
  if (copiesWithRating.length === 1) {
    return copiesWithRating[0].rating;
  }

  // Multiple copies with ratings - prefer owned copies
  const ownedWithRating = copiesWithRating.filter(copy => copy.statusOwned);

  // Choose from owned if any, otherwise from all with rating
  const candidates = ownedWithRating.length > 0 ? ownedWithRating : copiesWithRating;

  // Sort by acquisition date descending (latest first), nulls last
  candidates.sort((a, b) => {
    if (!a.acquisitionDate && !b.acquisitionDate) return 0;
    if (!a.acquisitionDate) return 1;
    if (!b.acquisitionDate) return -1;
    return b.acquisitionDate.localeCompare(a.acquisitionDate);
  });

  return candidates[0].rating;
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
      let rating = null;

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
          if (metadata.Rating) {
            const parsedRating = parseInt(metadata.Rating, 10);
            if (!isNaN(parsedRating)) {
              rating = parsedRating;
            }
          }
        } catch (e) {
          // Invalid JSON in metaData, skip
        }
      }

      result.push({
        copyId: copy.uuid || null,
        versionName: copy.versionName || null,
        acquisitionDate: copyAcquisitionDate,
        statusOwned: copy.statusOwned === true,
        pricePaid: pricePaid,
        currency: currency,
        rating: rating,
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
 * Finds the "One Time" tag ID from the tags array.
 * @param {Array} tags - Array of tag objects from BG Stats
 * @returns {number|undefined} Tag ID if found, undefined otherwise
 */
function findOneTimeTagId(tags) {
  return tags.find(t => t.name.toLowerCase() === 'one time')?.id;
}

/**
 * Extracts players from players array.
 * @param {Array} players - Array of player objects from BG Stats
 * @returns {Array} Array of player objects with playerId and name
 */
function extractPlayers(players) {
  return players
    .map(player => ({
      playerId: player.id,
      name: player.name
    }))
    .sort((a, b) => a.playerId - b.playerId);
}

/**
 * Extracts locations from locations array.
 * @param {Array} locations - Array of location objects from BG Stats
 * @returns {Array} Array of location objects with locationId and name
 */
function extractLocations(locations) {
  return locations
    .map(location => ({
      locationId: location.id,
      name: location.name
    }))
    .sort((a, b) => a.locationId - b.locationId);
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
 * @param {number|undefined} oneTimeTagId - ID of the "One Time" tag
 * @returns {Map} Map of game ID to enhanced game object
 */
function buildGamesMap(games, expandaloneTagId, oneTimeTagId) {
  const gamesMap = new Map();

  games.forEach(game => {
    // Check if game has expandalone tag
    const isExpandalone = expandaloneTagId && game.tags?.some(tag => tag.tagRefId === expandaloneTagId) || false;
    // Check if game has "One Time" tag (legacy games, escape rooms, etc.)
    const isNonReplayable = oneTimeTagId && game.tags?.some(tag => tag.tagRefId === oneTimeTagId) || false;

    // Extract copies metadata
    const copies = extractCopyMetadata(game.copies);

    // Select game-level rating from copies
    const rating = selectGameRating(copies);

    // Classify game based on mutually exclusive rules
    const classification = classifyGame(game, isExpandalone);

    // Extract image URLs: prefer game-level, then earliest owned copy, then null
    let thumbnailUrl = game.urlThumb || null;
    let coverUrl = game.urlImage || null;

    // Fall back to earliest owned copy if game doesn't have them
    if ((!thumbnailUrl || !coverUrl) && game.copies && game.copies.length > 0) {
      const earliestCopyId = getEarliestOwnedCopy(copies);
      if (earliestCopyId) {
        const earliestCopy = game.copies.find(copy => copy.uuid === earliestCopyId);
        if (earliestCopy) {
          if (!thumbnailUrl) {
            thumbnailUrl = earliestCopy.urlThumb || null;
          }
          if (!coverUrl) {
            coverUrl = earliestCopy.urlImage || null;
          }
        }
      }
    }

    // Strip rating from copies for output (rating is stored at game level only)
    const outputCopies = copies.map(({ rating: _rating, ...rest }) => rest);

    gamesMap.set(game.id, {
      id: game.id,
      name: game.name,
      bggId: game.bggId,
      year: game.bggYear || null,
      rating: rating,
      isBaseGame: classification.isBaseGame,
      isExpansion: classification.isExpansion,
      isExpandalone: classification.isExpandalone,
      isNonReplayable: isNonReplayable,
      copies: outputCopies,
      playCount: 0,
      uniquePlayDays: new Set(),
      thumbnailUrl: thumbnailUrl,
      coverUrl: coverUrl,
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

    // Extract player IDs from playerScores, excluding NPCs
    const players = play.playerScores && Array.isArray(play.playerScores)
      ? play.playerScores
          .filter(ps => {
            if (!ps.metaData) return true;
            try {
              const metadata = JSON.parse(ps.metaData);
              return metadata.isNpc !== 1;
            } catch (e) {
              return true;
            }
          })
          .map(ps => ps.playerRefId)
      : [];

    // Extract location ID
    const locationId = play.locationRefId;

    processedPlays.push({
      gameId: gameId,
      copyId: copyId,
      date: playDate,
      timestamp: play.playDate,
      durationMin: finalDuration,
      durationEstimated: isEstimated,
      players: players,
      locationId: locationId
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
 * @param {Array} players - Array of player objects
 * @param {Array} locations - Array of location objects
 * @param {number} selfPlayerId - Player ID of the owner
 * @param {number|null} anonymousPlayerId - Player ID for anonymous players
 * @param {number|null} homeLocationId - Location ID for home
 * @returns {Object} Final output object with games, plays, players, locations, and metadata
 */
function finalizeOutput(gamesMap, plays, players, locations, selfPlayerId, anonymousPlayerId, homeLocationId) {
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
    selfPlayerId: selfPlayerId,
    anonymousPlayerId: anonymousPlayerId,
    homeLocationId: homeLocationId,
    games: games,
    plays: plays,
    players: players,
    locations: locations,
    generatedAt: generatedAt,
  };
}

// Pure transformation function (testable)
function processData(bgStatsData) {
  // Extract players and locations
  const players = extractPlayers(bgStatsData.players);
  const locations = extractLocations(bgStatsData.locations);
  const selfPlayerId = bgStatsData.userInfo.meRefId;

  // Find anonymous player ID
  const anonymousPlayer = bgStatsData.players.find(p => p.isAnonymous);
  const anonymousPlayerId = anonymousPlayer ? anonymousPlayer.id : null;

  // Find home location ID (location named "Home")
  const homeLocation = bgStatsData.locations.find(loc => loc.name === 'Home');
  const homeLocationId = homeLocation ? homeLocation.id : null;

  // Build games map from BG Stats
  const expandaloneTagId = findExpandaloneTagId(bgStatsData.tags);
  const oneTimeTagId = findOneTimeTagId(bgStatsData.tags);
  const gamesMap = buildGamesMap(bgStatsData.games, expandaloneTagId, oneTimeTagId);

  // Calculate typical play times for all games
  const gameDurationsMap = collectGameDurations(bgStatsData.plays);
  calculateTypicalPlayTimes(gamesMap, gameDurationsMap, bgStatsData.plays);

  // Process plays (store date, game reference, duration data, players, and location)
  const plays = processPlays(bgStatsData.plays, gamesMap);

  // Finalize output (convert to arrays, sort, add metadata)
  return finalizeOutput(gamesMap, plays, players, locations, selfPlayerId, anonymousPlayerId, homeLocationId);
}

export { processData };
