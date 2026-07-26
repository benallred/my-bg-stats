/**
 * Tag statistics - group base games by descriptive tag, ranked by rating
 */

import { isPlayInYear, getMetricValueFromPlayData } from './play-helpers.js';

/**
 * Get base games grouped by tag, each group ranked by rating descending.
 *
 * Only base games are included. When a year is given, a tag's list holds only
 * games played that year; all time shows every base game carrying the tag,
 * whether or not it has ever been played. Games sort by rating descending with
 * unrated games last; ties break by metric value descending, then game name.
 * The metric value reflects plays in the selected year (or all time when year
 * is null).
 *
 * @param {Array} games - Array of game objects
 * @param {Array} plays - Array of play objects
 * @param {string} metric - Base metric: 'hours', 'sessions', or 'plays'
 * @param {number|null} year - Optional year filter
 * @returns {Array} Array of { tag, games: [{ game, rating, metricValue }] } sorted by tag name
 */
function getTopGamesByTag(games, plays, metric, year = null) {
  // Aggregate play data per game for the selected period
  const playDataPerGame = new Map();
  plays.forEach(play => {
    if (!isPlayInYear(play, year)) return;

    const data = playDataPerGame.get(play.gameId) || {
      totalMinutes: 0,
      playCount: 0,
      uniqueDates: new Set(),
    };
    data.totalMinutes += play.durationMin || 0;
    data.playCount += 1;
    data.uniqueDates.add(play.date);
    playDataPerGame.set(play.gameId, data);
  });

  const emptyPlayData = { totalMinutes: 0, playCount: 0, uniqueDates: new Set() };

  // Group base games by each of their tags
  const tagGroups = new Map();
  games.forEach(game => {
    if (!game.isBaseGame) return;
    if (!game.tags || game.tags.length === 0) return;

    const playData = playDataPerGame.get(game.id);
    // When filtering by year, only include games actually played that year
    if (year !== null && !playData) return;

    const metricValue = getMetricValueFromPlayData(playData || emptyPlayData, metric);

    game.tags.forEach(tag => {
      if (!tagGroups.has(tag)) {
        tagGroups.set(tag, []);
      }
      tagGroups.get(tag).push({ game, rating: game.rating, metricValue });
    });
  });

  // Sort each group by rating (unrated last), then build a tag-sorted result
  const result = [];
  Array.from(tagGroups.keys())
    .sort((a, b) => a.localeCompare(b))
    .forEach(tag => {
      const groupGames = tagGroups.get(tag).sort((a, b) => {
        const ratingA = a.rating ?? -Infinity;
        const ratingB = b.rating ?? -Infinity;
        if (ratingB !== ratingA) return ratingB - ratingA;
        if (b.metricValue !== a.metricValue) return b.metricValue - a.metricValue;
        return a.game.name.localeCompare(b.game.name);
      });
      result.push({ tag, games: groupGames });
    });

  return result;
}

export { getTopGamesByTag };
