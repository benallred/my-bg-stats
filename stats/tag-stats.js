/**
 * Tag statistics - group base games by descriptive tag ranked by rating, and
 * group games by source-data mapping tag for diagnostics
 */

import { isPlayInYear, getMetricValueFromPlayData } from './play-helpers.js';

const TAG_NAMESPACE_SEPARATOR = ':';

/**
 * Close a title with "games" so it reads as a noun phrase. A tag that already
 * ends in "game" is pluralized instead of doubled up, so "Party Game" titles as
 * "Party Games" rather than "Party Game games".
 *
 * @param {string} value - Tag value
 * @returns {{tag: string, suffix: string}} Tag text to display and the text after it
 */
function withGamesSuffix(value) {
  if (/games$/i.test(value)) {
    return { tag: value, suffix: '' };
  }

  if (/game$/i.test(value)) {
    return { tag: `${value}s`, suffix: '' };
  }

  return { tag: value, suffix: ' games' };
}

/**
 * Section heading and list phrasing for tags with no namespace prefix.
 *
 * A title splits into the tag itself and the fixed text around it so the UI can
 * highlight the tag.
 */
const DEFAULT_TAG_NAMESPACE = {
  heading: 'Categories',
  getTitleParts: (value) => ({ prefix: 'Top 10 ', ...withGamesSuffix(value) }),
};

/**
 * Registered tag namespaces, keyed by the prefix of a `Prefix:Value` tag name.
 * Declaration order sets the order their sections appear in. A namespace found
 * in the data with no entry here falls back to its own prefix as the heading
 * and to the default title phrasing.
 */
const TAG_NAMESPACES = {
  Replaces: {
    heading: 'Replaces',
    getTitleParts: (value) => ({ prefix: 'Top 10 games that replace ', tag: value, suffix: '' }),
  },
};

/**
 * Split a tag name into its namespace prefix and value.
 *
 * @param {string} tag - Tag name, optionally `Prefix:Value`
 * @returns {{namespace: string|null, value: string}} Namespace (null when unprefixed) and value
 */
function parseTagName(tag) {
  const separatorIndex = tag.indexOf(TAG_NAMESPACE_SEPARATOR);
  if (separatorIndex === -1) {
    return { namespace: null, value: tag };
  }

  return {
    namespace: tag.slice(0, separatorIndex).trim(),
    value: tag.slice(separatorIndex + 1).trim(),
  };
}

function getTagNamespaceMeta(namespace) {
  if (namespace === null) {
    return DEFAULT_TAG_NAMESPACE;
  }

  return TAG_NAMESPACES[namespace] || {
    heading: namespace,
    getTitleParts: DEFAULT_TAG_NAMESPACE.getTitleParts,
  };
}

/**
 * Group ranked tag lists into one section per tag namespace.
 *
 * Unprefixed tags come first, then registered namespaces in TAG_NAMESPACES
 * declaration order, then unregistered namespaces alphabetically. Lists keep
 * the order they arrive in.
 *
 * @param {Array} tagGroups - Output of getTopGamesByTag
 * @returns {Array} Array of { namespace, heading, lists: [{ tag, value, title: { prefix, tag, suffix }, games }] }
 */
function groupTagsByNamespace(tagGroups) {
  const sections = new Map();

  tagGroups.forEach(({ tag, games }) => {
    const { namespace, value } = parseTagName(tag);
    const meta = getTagNamespaceMeta(namespace);

    if (!sections.has(namespace)) {
      sections.set(namespace, { namespace, heading: meta.heading, lists: [] });
    }

    sections.get(namespace).lists.push({
      tag,
      value,
      title: meta.getTitleParts(value),
      games,
    });
  });

  const registeredOrder = Object.keys(TAG_NAMESPACES);
  const sectionRank = (namespace) => {
    if (namespace === null) return -1;
    const index = registeredOrder.indexOf(namespace);
    return index === -1 ? registeredOrder.length : index;
  };

  return Array.from(sections.values()).sort((a, b) => {
    const rankDiff = sectionRank(a.namespace) - sectionRank(b.namespace);
    if (rankDiff !== 0) return rankDiff;
    return a.namespace.localeCompare(b.namespace);
  });
}

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

/**
 * Group games by `Data:` tag, one group per tag.
 *
 * Data tags map source data rather than describe a game, so they stay out of
 * the Top 10's and surface as diagnostics instead. Every game carrying the tag
 * counts, whatever its type.
 *
 * @param {Array} games - Array of game objects
 * @returns {Array} Array of { tag, value, games } sorted by tag name, each group's games sorted by name
 */
function getDataTagGroups(games) {
  const groups = new Map();

  games.forEach(game => {
    game.dataTags.forEach(tag => {
      if (!groups.has(tag)) {
        groups.set(tag, []);
      }
      groups.get(tag).push(game);
    });
  });

  return Array.from(groups.keys())
    .sort((a, b) => a.localeCompare(b))
    .map(tag => ({
      tag,
      value: parseTagName(tag).value,
      games: groups.get(tag).sort((a, b) => a.name.localeCompare(b.name)),
    }));
}

export { getTopGamesByTag, groupTagsByNamespace, getDataTagGroups };
