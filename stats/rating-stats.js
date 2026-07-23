/**
 * Rating statistics - average ratings for owned and played games
 */

import {
  isGameOwned,
  wasGameAcquiredInYear,
  getGameAcquisitionDate,
} from './game-helpers.js';
import { isPlayInYear } from './play-helpers.js';

/**
 * Get played rating breakdown for games played
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @param {number|null} year - Optional year filter
 * @returns {Object} { average, ratedCount, totalCount, gameRatings }
 */
function getPlayedRatingBreakdown(games, plays, year = null) {
  // Build play data per game
  const playDataPerGame = new Map();

  plays.forEach(play => {
    if (!isPlayInYear(play, year)) return;

    if (!playDataPerGame.has(play.gameId)) {
      playDataPerGame.set(play.gameId, {
        totalMinutes: 0,
        playCount: 0,
        uniqueDates: new Set(),
        owned: false,
      });
    }

    const data = playDataPerGame.get(play.gameId);
    data.totalMinutes += play.durationMin || 0;
    data.playCount += 1;
    data.uniqueDates.add(play.date);
    if (play.copyId !== null) {
      data.owned = true;
    }
  });

  let sumRatings = 0;
  let ratedCount = 0;
  const gameRatings = [];

  // Weighted-rating accumulators: each rated game's rating is weighted by its
  // share of the metric (minutes for hours, sessions, plays). Ordering follows
  // the hours/sessions/plays convention.
  let weightedMinutesSum = 0;
  let totalMinutes = 0;
  let weightedSessionsSum = 0;
  let totalSessions = 0;
  let weightedPlaysSum = 0;
  let totalPlays = 0;

  playDataPerGame.forEach((playData, gameId) => {
    const game = games.find(g => g.id === gameId);
    if (!game) return;

    const hasRating = game.rating !== null && game.rating !== undefined;
    const sessions = playData.uniqueDates.size;

    if (hasRating) {
      sumRatings += game.rating;
      ratedCount++;

      weightedMinutesSum += playData.totalMinutes * game.rating;
      totalMinutes += playData.totalMinutes;
      weightedSessionsSum += sessions * game.rating;
      totalSessions += sessions;
      weightedPlaysSum += playData.playCount * game.rating;
      totalPlays += playData.playCount;
    }

    gameRatings.push({
      game,
      rating: game.rating,
      playData: {
        totalMinutes: playData.totalMinutes,
        playCount: playData.playCount,
        uniqueDates: sessions,
        owned: playData.owned,
      },
    });
  });

  return {
    average: ratedCount > 0 ? sumRatings / ratedCount : null,
    weightedAverage: {
      hours: totalMinutes > 0 ? weightedMinutesSum / totalMinutes : null,
      sessions: totalSessions > 0 ? weightedSessionsSum / totalSessions : null,
      plays: totalPlays > 0 ? weightedPlaysSum / totalPlays : null,
    },
    ratedCount,
    totalCount: playDataPerGame.size,
    gameRatings,
  };
}

/**
 * Get collection rating breakdown for owned games
 * @param {Array} games - Array of game objects
 * @param {number|null} year - Optional year filter
 * @returns {Object} { average, ratedCount, totalCount, gameRatings }
 */
function getCollectionRatingBreakdown(games, year = null) {
  let sumRatings = 0;
  let ratedCount = 0;
  let totalCount = 0;
  const gameRatings = [];

  games.forEach(game => {
    if (!game.isBaseGame) return;

    const acquisitionDate = getGameAcquisitionDate(game);

    if (year) {
      if (!wasGameAcquiredInYear(game, year)) return;
    } else {
      if (!isGameOwned(game)) return;
    }

    totalCount++;
    const hasRating = game.rating !== null && game.rating !== undefined;

    if (hasRating) {
      sumRatings += game.rating;
      ratedCount++;
    }

    gameRatings.push({
      game,
      rating: game.rating,
      acquisitionDate,
    });
  });

  return {
    average: ratedCount > 0 ? sumRatings / ratedCount : null,
    ratedCount,
    totalCount,
    gameRatings,
  };
}

export {
  getPlayedRatingBreakdown,
  getCollectionRatingBreakdown,
};
