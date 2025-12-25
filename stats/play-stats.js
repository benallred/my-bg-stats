/**
 * Play statistics functions - counts, time tracking, session stats
 */

import { calculateMedian } from '../utils.js';
import { Metric } from './constants.js';
import { isPlayInYear, filterPlaysByYear } from './play-helpers.js';

/**
 * Get total plays logged
 * @param {Array} plays - Array of play objects
 * @param {number|null} year - Optional year filter
 * @returns {number} count
 */
function getTotalPlays(plays, year = null) {
  return filterPlaysByYear(plays, year).length;
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
    if (isPlayInYear(play, year)) {
      uniqueDays.add(play.date);
    }
  });
  return uniqueDays.size;
}

/**
 * Get daily session statistics (median and average play duration per gaming day)
 * @param {Array} plays - Array of play objects
 * @param {number|null} year - Optional year filter
 * @returns {Object} Object with medianHours and averageHours properties (null if no data)
 */
function getDailySessionStats(plays, year) {
  const dailyTotals = new Map();

  plays.forEach(play => {
    if (!isPlayInYear(play, year)) return;

    const currentTotal = dailyTotals.get(play.date) || 0;
    dailyTotals.set(play.date, currentTotal + play.durationMin);
  });

  const dailyMinutes = Array.from(dailyTotals.values())
    .filter(minutes => minutes > 0);

  if (dailyMinutes.length === 0) {
    return { medianMinutes: null, averageMinutes: null };
  }

  const averageMinutes = dailyMinutes.reduce((sum, m) => sum + m, 0) / dailyMinutes.length;
  const medianMinutes = calculateMedian(dailyMinutes);

  return {
    medianMinutes,
    averageMinutes,
  };
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
    if (isPlayInYear(play, year)) {
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

  // Determine which games are "my games" vs "others' games"
  // Check all plays for each game (not just year-filtered plays)
  const myGamesIds = new Set();
  const othersGamesIds = new Set();
  gamesPlayedIds.forEach(gameId => {
    const hasMyPlay = plays.some(play =>
      play.gameId === gameId && play.copyId !== null
    );
    if (hasMyPlay) {
      myGamesIds.add(gameId);
    } else {
      othersGamesIds.add(gameId);
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
    newToMe: year ? newToMe : null,
    myGames: myGamesIds.size,
    othersGames: othersGamesIds.size,
  };
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
    if (!isPlayInYear(play, year)) return;

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
    totalPlays,
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
    if (!isPlayInYear(play, year)) return;

    if (!gameTimeMap.has(play.gameId)) {
      gameTimeMap.set(play.gameId, {
        totalMinutes: 0,
        playCount: 0,
        actualCount: 0,
        estimatedCount: 0,
        durations: [],
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
        medianMinutes = calculateMedian(timeData.durations);
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
        avgMinutes,
      });
    }
  });

  // Sort by total minutes descending
  breakdown.sort((a, b) => b.totalMinutes - a.totalMinutes);

  return breakdown;
}

function getDaysPlayedByGame(games, plays, year = null) {
  const gameDaysMap = new Map();

  plays.forEach(play => {
    if (!isPlayInYear(play, year)) return;

    if (!gameDaysMap.has(play.gameId)) {
      gameDaysMap.set(play.gameId, {
        uniqueDates: new Set(),
        minutesPerDay: new Map(), // date -> total minutes
        playsPerDay: new Map(), // date -> play count
      });
    }

    const gameDays = gameDaysMap.get(play.gameId);
    gameDays.uniqueDates.add(play.date);

    // Track minutes per day
    const currentMinutes = gameDays.minutesPerDay.get(play.date) || 0;
    gameDays.minutesPerDay.set(play.date, currentMinutes + play.durationMin);

    // Track plays per day
    const currentPlays = gameDays.playsPerDay.get(play.date) || 0;
    gameDays.playsPerDay.set(play.date, currentPlays + 1);
  });

  // Convert to array with game objects
  const breakdown = [];
  gameDaysMap.forEach((daysData, gameId) => {
    const game = games.find(g => g.id === gameId);
    if (game) {
      const minutesPerDayArray = Array.from(daysData.minutesPerDay.values());
      const playsPerDayArray = Array.from(daysData.playsPerDay.values());

      // Calculate min, max, median, and average minutes per day
      let minMinutes = null;
      let maxMinutes = null;
      let medianMinutes = null;
      let avgMinutes = null;

      if (minutesPerDayArray.length > 0) {
        minMinutes = Math.min(...minutesPerDayArray);
        maxMinutes = Math.max(...minutesPerDayArray);
        avgMinutes = minutesPerDayArray.reduce((sum, minutes) => sum + minutes, 0) / minutesPerDayArray.length;
        medianMinutes = calculateMedian(minutesPerDayArray);
      }

      // Calculate median and average plays per day
      let medianPlays = null;
      let avgPlays = null;

      if (playsPerDayArray.length > 0) {
        avgPlays = playsPerDayArray.reduce((sum, plays) => sum + plays, 0) / playsPerDayArray.length;
        medianPlays = calculateMedian(playsPerDayArray);
      }

      breakdown.push({
        game,
        uniqueDays: daysData.uniqueDates.size,
        minMinutes,
        maxMinutes,
        medianMinutes,
        avgMinutes,
        medianPlays,
        avgPlays,
      });
    }
  });

  // Sort by unique days descending
  breakdown.sort((a, b) => b.uniqueDays - a.uniqueDays);

  return breakdown;
}

/**
 * Get top games by a specific metric
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @param {number} year - Year to filter by
 * @param {string} metric - Metric type: 'hours', 'sessions', or 'plays'
 * @param {number} limit - Number of top games to return (default 3)
 * @returns {Array} Array of { game, value, hours, sessions, plays } sorted by metric then hours/sessions/plays
 */
function getTopGamesByMetric(games, plays, year, metric, limit = 3) {
  // Get all three breakdowns to enable secondary sorting
  const hoursBreakdown = getPlayTimeByGame(games, plays, year);
  const sessionsBreakdown = getDaysPlayedByGame(games, plays, year);

  // Build plays breakdown inline to avoid circular dependency with h-index.js
  const playCountsPerGame = new Map();
  plays.forEach(play => {
    if (!isPlayInYear(play, year)) return;
    const count = playCountsPerGame.get(play.gameId) || 0;
    playCountsPerGame.set(play.gameId, count + 1);
  });
  const playsBreakdown = [];
  playCountsPerGame.forEach((count, gameId) => {
    const game = games.find(g => g.id === gameId);
    if (game) {
      playsBreakdown.push({ game, count });
    }
  });

  // Create lookup maps for quick access
  const hoursMap = new Map(hoursBreakdown.map(item => [item.game.id, item.totalMinutes]));
  const sessionsMap = new Map(sessionsBreakdown.map(item => [item.game.id, item.uniqueDays]));
  const playsMap = new Map(playsBreakdown.map(item => [item.game.id, item.count]));

  // Get all unique game IDs
  const allGameIds = new Set([
    ...hoursBreakdown.map(item => item.game.id),
    ...sessionsBreakdown.map(item => item.game.id),
    ...playsBreakdown.map(item => item.game.id),
  ]);

  // Build combined data for each game
  const combined = [];
  allGameIds.forEach(gameId => {
    const game = games.find(g => g.id === gameId);
    if (game) {
      const hours = hoursMap.get(gameId);
      const sessions = sessionsMap.get(gameId);
      const gamePlays = playsMap.get(gameId);

      let value;
      switch (metric) {
        case Metric.SESSIONS:
          value = sessions;
          break;
        case Metric.PLAYS:
          value = gamePlays;
          break;
        case Metric.HOURS:
        default:
          value = hours;
          break;
      }

      combined.push({
        game,
        value,
        hours,
        sessions,
        plays: gamePlays,
      });
    }
  });

  // Sort by: metric value desc, then hours desc, then sessions desc, then plays desc
  combined.sort((a, b) => {
    if (b.value !== a.value) return b.value - a.value;
    if (b.hours !== a.hours) return b.hours - a.hours;
    if (b.sessions !== a.sessions) return b.sessions - a.sessions;
    return b.plays - a.plays;
  });

  return combined.slice(0, limit);
}

/**
 * Get the top "new to me" game (first played in year) by a specific metric
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @param {number} year - Year to filter by (required)
 * @param {string} metric - Metric type: 'hours', 'sessions', or 'plays'
 * @returns {Object|null} { game, value, hours, sessions, plays } or null if no new-to-me games
 */
function getTopNewToMeGame(games, plays, year, metric) {
  if (!year) return null;

  // Find first play date for each game
  const firstPlayDates = new Map();
  plays.forEach(play => {
    if (!firstPlayDates.has(play.gameId)) {
      firstPlayDates.set(play.gameId, play.date);
    } else {
      const currentFirst = firstPlayDates.get(play.gameId);
      if (play.date < currentFirst) {
        firstPlayDates.set(play.gameId, play.date);
      }
    }
  });

  // Get games that are "new to me" (first played in this year)
  const newToMeGameIds = new Set();
  firstPlayDates.forEach((firstDate, gameId) => {
    if (firstDate.startsWith(year.toString())) {
      newToMeGameIds.add(gameId);
    }
  });

  if (newToMeGameIds.size === 0) return null;

  // Get metrics for all games played in the year
  const hoursBreakdown = getPlayTimeByGame(games, plays, year);
  const sessionsBreakdown = getDaysPlayedByGame(games, plays, year);

  // Build plays breakdown
  const playCountsPerGame = new Map();
  plays.forEach(play => {
    if (!isPlayInYear(play, year)) return;
    const count = playCountsPerGame.get(play.gameId) || 0;
    playCountsPerGame.set(play.gameId, count + 1);
  });

  // Create lookup maps
  const hoursMap = new Map(hoursBreakdown.map(item => [item.game.id, item.totalMinutes]));
  const sessionsMap = new Map(sessionsBreakdown.map(item => [item.game.id, item.uniqueDays]));

  // Build combined data only for new-to-me games
  const combined = [];
  newToMeGameIds.forEach(gameId => {
    const game = games.find(g => g.id === gameId);
    if (game) {
      const hours = hoursMap.get(gameId);
      const sessions = sessionsMap.get(gameId);
      const gamePlays = playCountsPerGame.get(gameId);

      let value;
      switch (metric) {
        case Metric.SESSIONS:
          value = sessions;
          break;
        case Metric.PLAYS:
          value = gamePlays;
          break;
        case Metric.HOURS:
        default:
          value = hours;
          break;
      }

      combined.push({
        game,
        value,
        hours,
        sessions,
        plays: gamePlays,
      });
    }
  });

  if (combined.length === 0) return null;

  // Sort by: metric value desc, then hours desc, then sessions desc, then plays desc
  combined.sort((a, b) => {
    if (b.value !== a.value) return b.value - a.value;
    if (b.hours !== a.hours) return b.hours - a.hours;
    if (b.sessions !== a.sessions) return b.sessions - a.sessions;
    return b.plays - a.plays;
  });

  return combined[0];
}

/**
 * Get the top "returning" game (first played before year) by a specific metric
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @param {number} year - Year to filter by (required)
 * @param {string} metric - Metric type: 'hours', 'sessions', or 'plays'
 * @returns {Object|null} { game, value, hours, sessions, plays } or null if no returning games
 */
function getTopReturningGame(games, plays, year, metric) {
  if (!year) return null;

  // Find first play date for each game
  const firstPlayDates = new Map();
  plays.forEach(play => {
    if (!firstPlayDates.has(play.gameId)) {
      firstPlayDates.set(play.gameId, play.date);
    } else {
      const currentFirst = firstPlayDates.get(play.gameId);
      if (play.date < currentFirst) {
        firstPlayDates.set(play.gameId, play.date);
      }
    }
  });

  // Get games that are "returning" (first played before this year)
  const returningGameIds = new Set();
  firstPlayDates.forEach((firstDate, gameId) => {
    if (!firstDate.startsWith(year.toString())) {
      returningGameIds.add(gameId);
    }
  });

  if (returningGameIds.size === 0) return null;

  // Get metrics for all games played in the year
  const hoursBreakdown = getPlayTimeByGame(games, plays, year);
  const sessionsBreakdown = getDaysPlayedByGame(games, plays, year);

  // Build plays breakdown
  const playCountsPerGame = new Map();
  plays.forEach(play => {
    if (!isPlayInYear(play, year)) return;
    const count = playCountsPerGame.get(play.gameId) || 0;
    playCountsPerGame.set(play.gameId, count + 1);
  });

  // Create lookup maps
  const hoursMap = new Map(hoursBreakdown.map(item => [item.game.id, item.totalMinutes]));
  const sessionsMap = new Map(sessionsBreakdown.map(item => [item.game.id, item.uniqueDays]));

  // Build combined data only for returning games that were played this year
  const combined = [];
  returningGameIds.forEach(gameId => {
    const game = games.find(g => g.id === gameId);
    // Only include if the game was actually played in this year
    if (game && playCountsPerGame.has(gameId)) {
      const hours = hoursMap.get(gameId);
      const sessions = sessionsMap.get(gameId);
      const gamePlays = playCountsPerGame.get(gameId);

      let value;
      switch (metric) {
        case Metric.SESSIONS:
          value = sessions;
          break;
        case Metric.PLAYS:
          value = gamePlays;
          break;
        case Metric.HOURS:
        default:
          value = hours;
          break;
      }

      combined.push({
        game,
        value,
        hours,
        sessions,
        plays: gamePlays,
      });
    }
  });

  if (combined.length === 0) return null;

  // Sort by: metric value desc, then hours desc, then sessions desc, then plays desc
  combined.sort((a, b) => {
    if (b.value !== a.value) return b.value - a.value;
    if (b.hours !== a.hours) return b.hours - a.hours;
    if (b.sessions !== a.sessions) return b.sessions - a.sessions;
    return b.plays - a.plays;
  });

  return combined[0];
}

export {
  getTotalPlays,
  getTotalDaysPlayed,
  getDailySessionStats,
  getTotalGamesPlayed,
  getTotalPlayTime,
  getPlayTimeByGame,
  getDaysPlayedByGame,
  getTopGamesByMetric,
  getTopNewToMeGame,
  getTopReturningGame,
};
