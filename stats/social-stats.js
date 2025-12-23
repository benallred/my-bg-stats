/**
 * Social & Locations statistics - players, locations, solo play data
 */

import { filterPlaysByYear } from './play-helpers.js';

/**
 * Get player statistics for Social & Locations section
 * @param {Array} plays - Array of play objects
 * @param {Array} players - Array of player objects with playerId and name
 * @param {number} selfPlayerId - The player ID representing the user
 * @param {number} anonymousPlayerId - The player ID for anonymous players
 * @param {number|null} year - Year to filter by, or null for all time
 * @returns {Object} Player statistics with count and details
 */
function getPlayerStats(plays, players, selfPlayerId, anonymousPlayerId, year = null) {
  const filteredPlays = filterPlaysByYear(plays, year);

  // Create player lookup map
  const playerMap = new Map(players.map(p => [p.playerId, p.name]));

  // Track stats per player (excluding self and anonymous)
  const playerStats = new Map();

  // Track totals for percentage calculation
  let totalMinutes = 0;
  const totalSessions = new Set();
  let totalPlays = 0;

  for (const play of filteredPlays) {
    totalMinutes += play.durationMin;
    totalSessions.add(play.date);
    totalPlays++;

    for (const playerId of play.players) {
      // Skip self and anonymous players
      if (playerId === selfPlayerId || playerId === anonymousPlayerId) {
        continue;
      }

      if (!playerStats.has(playerId)) {
        playerStats.set(playerId, {
          playerId,
          name: playerMap.get(playerId) || `Player ${playerId}`,
          minutes: 0,
          sessions: new Set(),
          plays: 0,
        });
      }

      const stats = playerStats.get(playerId);
      stats.minutes += play.durationMin;
      stats.sessions.add(play.date);
      stats.plays++;
    }
  }

  // Convert to array with final values and percentages
  const playerDetails = Array.from(playerStats.values()).map(stats => ({
    playerId: stats.playerId,
    name: stats.name,
    minutes: stats.minutes,
    sessions: stats.sessions.size,
    plays: stats.plays,
    minutesPercent: (stats.minutes / totalMinutes) * 100,
    sessionsPercent: (stats.sessions.size / totalSessions.size) * 100,
    playsPercent: (stats.plays / totalPlays) * 100,
  }));

  return {
    uniquePlayerCount: playerDetails.length,
    playerDetails,
  };
}

/**
 * Get location statistics for Social & Locations section
 * @param {Array} plays - Array of play objects
 * @param {Array} locations - Array of location objects with locationId and name
 * @param {number|null} year - Year to filter by, or null for all time
 * @returns {Object} Location statistics with count and details including percentages
 */
function getLocationStats(plays, locations, year = null) {
  const filteredPlays = filterPlaysByYear(plays, year);

  // Create location lookup map
  const locationMap = new Map(locations.map(loc => [loc.locationId, loc.name]));

  // Track stats per location
  const locationStats = new Map();

  // Also track totals for percentage calculation
  let totalMinutes = 0;
  const totalSessions = new Set();
  let totalPlays = 0;

  for (const play of filteredPlays) {
    totalMinutes += play.durationMin;
    totalSessions.add(play.date);
    totalPlays++;

    if (!locationStats.has(play.locationId)) {
      locationStats.set(play.locationId, {
        locationId: play.locationId,
        name: locationMap.get(play.locationId) || `Location ${play.locationId}`,
        minutes: 0,
        sessions: new Set(),
        plays: 0,
      });
    }

    const stats = locationStats.get(play.locationId);
    stats.minutes += play.durationMin;
    stats.sessions.add(play.date);
    stats.plays++;
  }

  // Convert to array with final values and percentages
  const locationDetails = Array.from(locationStats.values()).map(stats => ({
    locationId: stats.locationId,
    name: stats.name,
    minutes: stats.minutes,
    sessions: stats.sessions.size,
    plays: stats.plays,
    minutesPercent: (stats.minutes / totalMinutes) * 100,
    sessionsPercent: (stats.sessions.size / totalSessions.size) * 100,
    playsPercent: (stats.plays / totalPlays) * 100,
  }));

  return {
    locationCount: locationDetails.length,
    locationDetails,
  };
}

/**
 * Get solo game statistics for Social & Locations section
 * @param {Array} plays - Array of play objects
 * @param {Array} games - Array of game objects
 * @param {number} selfPlayerId - The player ID representing the user
 * @param {number|null} year - Year to filter by, or null for all time
 * @returns {Object} Solo statistics with totals, percentages, and game breakdown
 */
function getSoloGameStats(plays, games, selfPlayerId, year = null) {
  const filteredPlays = filterPlaysByYear(plays, year);

  // Create game lookup map
  const gameMap = new Map(games.map(g => [g.id, g]));

  // Identify solo plays
  const soloPlays = filteredPlays.filter(
    play => play.players.length === 1 && play.players[0] === selfPlayerId
  );

  // Calculate total stats for all plays (for percentage calculation)
  let totalMinutes = 0;
  const totalSessions = new Set();
  let totalPlays = 0;

  for (const play of filteredPlays) {
    totalMinutes += play.durationMin;
    totalSessions.add(play.date);
    totalPlays++;
  }

  // Calculate solo stats
  let totalSoloMinutes = 0;
  const soloSessions = new Set();
  let totalSoloPlays = 0;

  // Track stats per game for solo plays
  const gameStats = new Map();

  for (const play of soloPlays) {
    totalSoloMinutes += play.durationMin;
    soloSessions.add(play.date);
    totalSoloPlays++;

    if (!gameStats.has(play.gameId)) {
      gameStats.set(play.gameId, {
        gameId: play.gameId,
        game: gameMap.get(play.gameId),
        minutes: 0,
        sessions: new Set(),
        plays: 0,
      });
    }

    const stats = gameStats.get(play.gameId);
    stats.minutes += play.durationMin;
    stats.sessions.add(play.date);
    stats.plays++;
  }

  // Calculate solo-only days (days with ONLY solo plays, no multiplayer)
  // First, find all dates that have multiplayer plays
  const multiplayerDates = new Set();
  for (const play of filteredPlays) {
    if (play.players.length > 1 || play.players[0] !== selfPlayerId) {
      multiplayerDates.add(play.date);
    }
  }

  // Solo-only days are solo sessions that don't appear in multiplayer dates
  let soloOnlyDays = 0;
  for (const date of soloSessions) {
    if (!multiplayerDates.has(date)) {
      soloOnlyDays++;
    }
  }

  // Convert game stats to array
  const gameDetails = Array.from(gameStats.values())
    .filter(stats => stats.game) // Filter out unknown games
    .map(stats => ({
      game: stats.game,
      minutes: stats.minutes,
      sessions: stats.sessions.size,
      plays: stats.plays,
    }));

  return {
    totalSoloMinutes,
    totalSoloSessions: soloSessions.size,
    totalSoloPlays,
    soloOnlyDays,
    totalMinutes,
    totalSessions: totalSessions.size,
    totalPlays,
    gameDetails,
  };
}

/**
 * Get the top player by a given metric for Year in Review summary
 * @param {Array} plays - Array of play objects
 * @param {Array} players - Array of player objects with playerId and name
 * @param {number} selfPlayerId - The player ID representing the user
 * @param {number} anonymousPlayerId - The player ID for anonymous players
 * @param {number} year - Year to filter by
 * @param {string} metric - 'hours', 'sessions', or 'plays'
 * @returns {Object|null} Top player with name and value, or null if no players
 */
function getTopPlayerByMetric(plays, players, selfPlayerId, anonymousPlayerId, year, metric) {
  const stats = getPlayerStats(plays, players, selfPlayerId, anonymousPlayerId, year);

  if (stats.playerDetails.length === 0) {
    return null;
  }

  // Sort by the requested metric
  const sorted = [...stats.playerDetails].sort((a, b) => {
    switch (metric) {
      case 'sessions':
        return b.sessions - a.sessions;
      case 'plays':
        return b.plays - a.plays;
      case 'hours':
      default:
        return b.minutes - a.minutes;
    }
  });

  const top = sorted[0];
  let value;
  switch (metric) {
    case 'sessions':
      value = top.sessions;
      break;
    case 'plays':
      value = top.plays;
      break;
    case 'hours':
    default:
      value = top.minutes;
      break;
  }

  return {
    name: top.name,
    value,
  };
}

/**
 * Get the top location by a given metric for Year in Review summary (excluding home)
 * @param {Array} plays - Array of play objects
 * @param {Array} locations - Array of location objects with locationId and name
 * @param {number} homeLocationId - The location ID for home (to exclude)
 * @param {number} year - Year to filter by
 * @param {string} metric - 'hours', 'sessions', or 'plays'
 * @returns {Object|null} Top location with name and value, or null if no locations
 */
function getTopLocationByMetric(plays, locations, homeLocationId, year, metric) {
  const stats = getLocationStats(plays, locations, year);

  // Filter out home location
  const nonHomeLocations = stats.locationDetails.filter(
    loc => loc.locationId !== homeLocationId
  );

  if (nonHomeLocations.length === 0) {
    return null;
  }

  // Sort by the requested metric
  const sorted = [...nonHomeLocations].sort((a, b) => {
    switch (metric) {
      case 'sessions':
        return b.sessions - a.sessions;
      case 'plays':
        return b.plays - a.plays;
      case 'hours':
      default:
        return b.minutes - a.minutes;
    }
  });

  const top = sorted[0];
  let value;
  switch (metric) {
    case 'sessions':
      value = top.sessions;
      break;
    case 'plays':
      value = top.plays;
      break;
    case 'hours':
    default:
      value = top.minutes;
      break;
  }

  return {
    name: top.name,
    value,
  };
}

/**
 * Get the top solo game by hours for Year in Review summary
 * @param {Array} plays - Array of play objects
 * @param {Array} games - Array of game objects
 * @param {number} selfPlayerId - The player ID representing the user
 * @param {number} year - Year to filter by
 * @returns {Object|null} Top solo game with game object and minutes, or null if no solo plays
 */
function getTopSoloGameByHours(plays, games, selfPlayerId, year) {
  const stats = getSoloGameStats(plays, games, selfPlayerId, year);

  if (stats.gameDetails.length === 0) {
    return null;
  }

  // Sort by minutes (hours)
  const sorted = [...stats.gameDetails].sort((a, b) => b.minutes - a.minutes);

  const top = sorted[0];
  return {
    game: top.game,
    minutes: top.minutes,
  };
}

export {
  getPlayerStats,
  getLocationStats,
  getSoloGameStats,
  getTopPlayerByMetric,
  getTopLocationByMetric,
  getTopSoloGameByHours,
};
