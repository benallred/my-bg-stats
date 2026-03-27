/**
 * Ranking Statistics Module
 * Functions for computing a game's rank among base games by various metrics
 */

import { getPlayTimeByGame, getDaysPlayedByGame } from './play-stats.js';

/**
 * Get rankings for a specific game among all base games.
 * Rankings use secondary tiebreakers following hours > sessions > plays ordering.
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @param {number} gameId - ID of the game to rank
 * @returns {Object} { ratingRank, hoursRank, sessionsRank, playsRank } — 0 means game not found in that ranking
 */
function getGameRankings(games, plays, gameId) {
    const baseGameIds = new Set(games.filter(g => g.isBaseGame).map(g => g.id));

    const allTimeHours = getPlayTimeByGame(games, plays, null);
    const allTimeSessions = getDaysPlayedByGame(games, plays, null);

    const hoursMap = new Map(allTimeHours.map(e => [e.game.id, e.totalMinutes]));
    const sessionsMap = new Map(allTimeSessions.map(e => [e.game.id, e.uniqueDays]));
    const playsMap = new Map(allTimeHours.map(e => [e.game.id, e.playCount]));

    const getHours = (id) => hoursMap.get(id) || 0;
    const getSessions = (id) => sessionsMap.get(id) || 0;
    const getPlays = (id) => playsMap.get(id) || 0;

    const metricTiebreak = (aId, bId) =>
        (getHours(bId) - getHours(aId))
        || (getSessions(bId) - getSessions(aId))
        || (getPlays(bId) - getPlays(aId));

    // Rating: primary by rating desc, tiebreak by hours > sessions > plays
    const ratingRanked = games
        .filter(g => baseGameIds.has(g.id) && g.rating !== null && g.rating !== undefined)
        .sort((a, b) => b.rating - a.rating || metricTiebreak(a.id, b.id));
    const ratingRank = ratingRanked.findIndex(g => g.id === gameId) + 1;

    // Hours: tiebreak by sessions > plays
    const hoursRanked = allTimeHours
        .filter(e => baseGameIds.has(e.game.id))
        .sort((a, b) => b.totalMinutes - a.totalMinutes
            || (getSessions(b.game.id) - getSessions(a.game.id))
            || (getPlays(b.game.id) - getPlays(a.game.id)));
    const hoursRank = hoursRanked.findIndex(e => e.game.id === gameId) + 1;

    // Sessions: tiebreak by hours > plays
    const sessionsRanked = allTimeSessions
        .filter(e => baseGameIds.has(e.game.id))
        .sort((a, b) => b.uniqueDays - a.uniqueDays
            || (getHours(b.game.id) - getHours(a.game.id))
            || (getPlays(b.game.id) - getPlays(a.game.id)));
    const sessionsRank = sessionsRanked.findIndex(e => e.game.id === gameId) + 1;

    // Plays: tiebreak by hours > sessions
    const playsRanked = allTimeHours
        .filter(e => baseGameIds.has(e.game.id))
        .sort((a, b) => b.playCount - a.playCount
            || (getHours(b.game.id) - getHours(a.game.id))
            || (getSessions(b.game.id) - getSessions(a.game.id)));
    const playsRank = playsRanked.findIndex(e => e.game.id === gameId) + 1;

    return { ratingRank, hoursRank, sessionsRank, playsRank };
}

export {
    getGameRankings,
};
