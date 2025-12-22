/**
 * Year-in-review statistics - streaks, achievements, solo stats, locations
 */

import { Metric } from './constants.js';

/**
 * Get time and activity statistics for Gaming Year in Review
 * @param {Array} plays - Array of play objects
 * @param {number|null} year - Optional year filter
 * @returns {Object} Time and activity metrics including streaks, dry spells, and daily stats
 */
function getTimeAndActivityStats(plays, year = null) {
  // Filter plays by year
  const filteredPlays = plays.filter(play => {
    if (!year) return true;
    return play.date.startsWith(year.toString());
  });

  if (filteredPlays.length === 0) {
    return {
      totalDays: 0,
      totalMinutes: 0,
      longestDayMinutes: null,
      longestDayDate: null,
      longestDayGamesList: [],
      shortestDayMinutes: null,
      shortestDayDate: null,
      shortestDayGamesList: [],
      longestStreak: 0,
      longestStreakStart: null,
      longestStreakEnd: null,
      longestDrySpell: 0,
      longestDrySpellStart: null,
      longestDrySpellEnd: null,
      mostGamesDay: 0,
      mostGamesDayDate: null,
      mostGamesDayGamesList: [],
    };
  }

  // Aggregate by date
  const dateMap = new Map(); // date -> { minutes, games: Set, gamePlays: Map<gameId, count>, gameMinutes: Map<gameId, minutes> }
  filteredPlays.forEach(play => {
    if (!dateMap.has(play.date)) {
      dateMap.set(play.date, {
        minutes: 0,
        games: new Set(),
        gamePlays: new Map(),
        gameMinutes: new Map(),
      });
    }
    const dayData = dateMap.get(play.date);
    dayData.minutes += play.durationMin;
    dayData.games.add(play.gameId);
    dayData.gamePlays.set(play.gameId, (dayData.gamePlays.get(play.gameId) || 0) + 1);
    dayData.gameMinutes.set(play.gameId, (dayData.gameMinutes.get(play.gameId) || 0) + play.durationMin);
  });

  // Get sorted dates
  const sortedDates = Array.from(dateMap.keys()).sort();
  const totalDays = sortedDates.length;

  // Total play time (sum all minutes)
  const totalMinutes = Array.from(dateMap.values()).reduce((sum, d) => sum + d.minutes, 0);

  // Find longest and shortest playtime days
  let longestDayMinutes = -Infinity;
  let longestDayDate = null;
  let longestDayGamesList = [];
  let shortestDayMinutes = Infinity;
  let shortestDayDate = null;
  let shortestDayGamesList = [];

  dateMap.forEach((data, date) => {
    if (data.minutes > longestDayMinutes) {
      longestDayMinutes = data.minutes;
      longestDayDate = date;
      longestDayGamesList = Array.from(data.games).map(gameId => ({
        gameId: gameId,
        minutes: data.gameMinutes.get(gameId) || 0,
      }));
    }
    if (data.minutes < shortestDayMinutes) {
      shortestDayMinutes = data.minutes;
      shortestDayDate = date;
      shortestDayGamesList = Array.from(data.games).map(gameId => ({
        gameId: gameId,
        minutes: data.gameMinutes.get(gameId) || 0,
      }));
    }
  });

  // Calculate longest streak (consecutive days)
  let longestStreak = 1;
  let longestStreakStart = sortedDates[0];
  let longestStreakEnd = sortedDates[0];
  let currentStreak = 1;
  let currentStreakStart = sortedDates[0];

  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = new Date(sortedDates[i - 1]);
    const currDate = new Date(sortedDates[i]);
    const daysDiff = Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24));

    if (daysDiff === 1) {
      currentStreak++;
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
        longestStreakStart = currentStreakStart;
        longestStreakEnd = sortedDates[i];
      }
    } else {
      currentStreak = 1;
      currentStreakStart = sortedDates[i];
    }
  }

  // Calculate longest dry spell (days between sessions)
  let longestDrySpell = 0;
  let longestDrySpellStart = null;
  let longestDrySpellEnd = null;

  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = new Date(sortedDates[i - 1]);
    const currDate = new Date(sortedDates[i]);
    const daysDiff = Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24)) - 1;

    if (daysDiff > longestDrySpell) {
      longestDrySpell = daysDiff;
      // Calculate the first and last days of the dry spell (not the play dates)
      const drySpellStartDate = new Date(prevDate);
      drySpellStartDate.setDate(drySpellStartDate.getDate() + 1);
      const drySpellEndDate = new Date(currDate);
      drySpellEndDate.setDate(drySpellEndDate.getDate() - 1);

      longestDrySpellStart = drySpellStartDate.toISOString().split('T')[0];
      longestDrySpellEnd = drySpellEndDate.toISOString().split('T')[0];
    }
  }

  // Find most games played in one day
  let mostGamesDay = 0;
  let mostGamesDayDate = null;
  let mostGamesDayGamesList = [];

  dateMap.forEach((data, date) => {
    const gameCount = data.games.size;
    if (gameCount > mostGamesDay) {
      mostGamesDay = gameCount;
      mostGamesDayDate = date;
      mostGamesDayGamesList = Array.from(data.games).map(gameId => ({
        gameId: gameId,
        playCount: data.gamePlays.get(gameId) || 1,
      }));
    }
  });

  return {
    totalDays,
    totalMinutes,
    longestDayMinutes,
    longestDayDate,
    longestDayGamesList,
    shortestDayMinutes,
    shortestDayDate,
    shortestDayGamesList,
    longestStreak,
    longestStreakStart,
    longestStreakEnd,
    longestDrySpell,
    longestDrySpellStart,
    longestDrySpellEnd,
    mostGamesDay,
    mostGamesDayDate,
    mostGamesDayGamesList,
  };
}

/**
 * Get logging achievements (cumulative totals crossing round-number thresholds) for a year
 * @param {Array} plays - Array of play objects
 * @param {number} year - Year to filter achievements by
 * @returns {Array} Array of { metric: Metric.HOURS|Metric.SESSIONS|Metric.PLAYS, threshold: number, date: string }
 */
function getLoggingAchievements(plays, year) {
  // Sort plays chronologically (oldest first)
  const sortedPlays = [...plays].sort((a, b) => a.date.localeCompare(b.date));

  let cumulativeMinutes = 0;
  const uniqueDays = new Set();
  let cumulativePlays = 0;

  const achievements = [];
  let nextHourThreshold = 100;
  let nextSessionThreshold = 100;
  let nextPlayThreshold = 250;

  for (const play of sortedPlays) {
    // Track hours
    cumulativeMinutes += play.durationMin;
    const newHours = Math.floor(cumulativeMinutes / 60);

    // Check hour thresholds crossed
    while (nextHourThreshold <= newHours) {
      achievements.push({ metric: Metric.HOURS, threshold: nextHourThreshold, date: play.date });
      nextHourThreshold += 100;
    }

    // Track sessions (only count if this is a new unique day)
    const prevSessions = uniqueDays.size;
    uniqueDays.add(play.date);
    const newSessions = uniqueDays.size;

    // Check session thresholds crossed
    if (newSessions > prevSessions) {
      while (nextSessionThreshold <= newSessions) {
        achievements.push({ metric: Metric.SESSIONS, threshold: nextSessionThreshold, date: play.date });
        nextSessionThreshold += 100;
      }
    }

    // Track plays
    cumulativePlays++;

    // Check play thresholds crossed
    while (nextPlayThreshold <= cumulativePlays) {
      achievements.push({ metric: Metric.PLAYS, threshold: nextPlayThreshold, date: play.date });
      nextPlayThreshold += 250;
    }
  }

  // Filter to achievements where date is in specified year
  // Sort by: hours first, then sessions, then plays (per metric ordering convention)
  // Within each metric, sort by threshold ascending
  const metricOrder = { [Metric.HOURS]: 0, [Metric.SESSIONS]: 1, [Metric.PLAYS]: 2 };
  return achievements
    .filter(a => a.date.startsWith(year.toString()))
    .sort((a, b) => {
      if (metricOrder[a.metric] !== metricOrder[b.metric]) {
        return metricOrder[a.metric] - metricOrder[b.metric];
      }
      return a.threshold - b.threshold;
    });
}

/**
 * Get solo gaming statistics for Year in Review
 * @param {Array} plays - Array of play objects
 * @param {number} selfPlayerId - The player ID representing the user
 * @param {number|null} year - Year to filter by, or null for all time
 * @returns {Object} Solo statistics: totalSoloMinutes, totalSoloSessions, totalSoloPlays
 */
function getSoloStats(plays, selfPlayerId, year = null) {
  const filteredPlays = year
    ? plays.filter(play => play.date.startsWith(year.toString()))
    : plays;

  const soloPlays = filteredPlays.filter(
    play => play.players.length === 1 && play.players[0] === selfPlayerId
  );

  const soloDates = new Set(soloPlays.map(play => play.date));
  const totalSoloMinutes = soloPlays.reduce((sum, play) => sum + play.durationMin, 0);

  return {
    totalSoloMinutes,
    totalSoloSessions: soloDates.size,
    totalSoloPlays: soloPlays.length,
  };
}

/**
 * Get the longest single plays for Year in Review
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @param {number} year - Year to filter by
 * @param {number} count - Number of plays to return
 * @returns {Array} Array of { game, durationMin, date } sorted by duration descending
 */
function getLongestSinglePlays(games, plays, year, count) {
  const filteredPlays = plays.filter(
    play => play.date.startsWith(year.toString()) && play.durationMin > 0
  );

  // Sort by duration descending
  const sortedPlays = [...filteredPlays].sort((a, b) => b.durationMin - a.durationMin);

  // Create game lookup map
  const gameMap = new Map(games.map(g => [g.id, g]));

  // Take top N and map to result format
  return sortedPlays.slice(0, count).map(play => ({
    game: gameMap.get(play.gameId),
    durationMin: play.durationMin,
    date: play.date,
  }));
}

/**
 * Get top games by number of unique players
 * Anonymous players (identified by anonymousPlayerId) are counted per occurrence,
 * while named players are deduplicated across plays.
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @param {number} year - Year to filter by
 * @param {number} count - Number of games to return
 * @param {number|null} anonymousPlayerId - Player ID for anonymous players (counted per occurrence)
 * @returns {Array} Array of { game, value } sorted by unique player count descending, then by hours, sessions, plays
 */
function getTopGamesByUniquePlayers(games, plays, year, count, anonymousPlayerId) {
  const filteredPlays = plays.filter(
    play => play.date.startsWith(year.toString())
  );

  // Create game lookup map
  const gameMap = new Map(games.map(g => [g.id, g]));

  // Group plays by gameId and collect stats
  const gameStatsMap = new Map();
  for (const play of filteredPlays) {
    if (!gameStatsMap.has(play.gameId)) {
      gameStatsMap.set(play.gameId, {
        players: new Set(),
        anonymousCount: 0,
        minutes: 0,
        sessions: new Set(),
        plays: 0,
      });
    }
    const stats = gameStatsMap.get(play.gameId);
    for (const playerId of play.players) {
      if (playerId === anonymousPlayerId) {
        stats.anonymousCount++;
      } else {
        stats.players.add(playerId);
      }
    }
    stats.minutes += play.durationMin;
    stats.sessions.add(play.date);
    stats.plays++;
  }

  // Convert to array with unique player counts and sort
  const results = Array.from(gameStatsMap.entries())
    .map(([gameId, stats]) => ({
      game: gameMap.get(gameId),
      value: stats.players.size + stats.anonymousCount,
      minutes: stats.minutes,
      sessions: stats.sessions.size,
      plays: stats.plays,
    }))
    .filter(item => item.game) // Filter out unknown games
    .sort((a, b) => {
      // Primary: unique players descending
      if (b.value !== a.value) return b.value - a.value;
      // Secondary: hours (minutes) descending
      if (b.minutes !== a.minutes) return b.minutes - a.minutes;
      // Tertiary: sessions descending
      if (b.sessions !== a.sessions) return b.sessions - a.sessions;
      // Quaternary: plays descending
      return b.plays - a.plays;
    });

  return results.slice(0, count);
}

/**
 * Get top games by number of unique locations
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @param {number} year - Year to filter by
 * @param {number} count - Number of games to return
 * @returns {Array} Array of { game, value } sorted by unique location count descending, then by hours, sessions, plays
 */
function getTopGamesByUniqueLocations(games, plays, year, count) {
  const filteredPlays = plays.filter(
    play => play.date.startsWith(year.toString())
  );

  // Create game lookup map
  const gameMap = new Map(games.map(g => [g.id, g]));

  // Group plays by gameId and collect stats
  const gameStatsMap = new Map();
  for (const play of filteredPlays) {
    if (!gameStatsMap.has(play.gameId)) {
      gameStatsMap.set(play.gameId, {
        locations: new Set(),
        minutes: 0,
        sessions: new Set(),
        plays: 0,
      });
    }
    const stats = gameStatsMap.get(play.gameId);
    stats.locations.add(play.locationId);
    stats.minutes += play.durationMin;
    stats.sessions.add(play.date);
    stats.plays++;
  }

  // Convert to array with unique location counts and sort
  const results = Array.from(gameStatsMap.entries())
    .map(([gameId, stats]) => ({
      game: gameMap.get(gameId),
      value: stats.locations.size,
      minutes: stats.minutes,
      sessions: stats.sessions.size,
      plays: stats.plays,
    }))
    .filter(item => item.game) // Filter out unknown games
    .sort((a, b) => {
      // Primary: unique locations descending
      if (b.value !== a.value) return b.value - a.value;
      // Secondary: hours (minutes) descending
      if (b.minutes !== a.minutes) return b.minutes - a.minutes;
      // Tertiary: sessions descending
      if (b.sessions !== a.sessions) return b.sessions - a.sessions;
      // Quaternary: plays descending
      return b.plays - a.plays;
    });

  return results.slice(0, count);
}

/**
 * Get all locations by number of sessions (unique play dates)
 * @param {Array} plays - Array of play objects
 * @param {Array} locations - Array of location objects with locationId and name
 * @param {number|null} year - Year to filter by, or null for all time
 * @returns {Array} Array of { locationId, name, sessions } sorted by sessions descending
 */
function getAllLocationsBySession(plays, locations, year = null) {
  const filteredPlays = year
    ? plays.filter(play => play.date.startsWith(year.toString()))
    : plays;

  // Create location lookup map
  const locationMap = new Map(locations.map(loc => [loc.locationId, loc.name]));

  // Group plays by locationId and collect unique dates
  const locationDates = new Map();
  for (const play of filteredPlays) {
    if (!locationDates.has(play.locationId)) {
      locationDates.set(play.locationId, new Set());
    }
    locationDates.get(play.locationId).add(play.date);
  }

  // Convert to array with session counts and sort
  const results = Array.from(locationDates.entries())
    .map(([locationId, dates]) => ({
      locationId,
      name: locationMap.get(locationId) || `Location ${locationId}`,
      sessions: dates.size,
    }))
    .sort((a, b) => b.sessions - a.sessions);

  return results;
}

export {
  getTimeAndActivityStats,
  getLoggingAchievements,
  getSoloStats,
  getLongestSinglePlays,
  getTopGamesByUniquePlayers,
  getTopGamesByUniqueLocations,
  getAllLocationsBySession,
};
