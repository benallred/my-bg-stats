/**
 * Play helper functions for filtering and year checks
 */

/**
 * Check if a play occurred in a specific year
 * @param {Object} play - Play object with date property
 * @param {number|null} year - Year to check, or null for all years
 * @returns {boolean} true if play is in the year (or year is null)
 */
function isPlayInYear(play, year) {
  if (!year) return true;
  return play.date.startsWith(year.toString());
}

/**
 * Check if a play occurred in or before a specific year
 * @param {Object} play - Play object with date property
 * @param {number|null} year - Year to check, or null for all years
 * @returns {boolean} true if play is in or before the year (or year is null)
 */
function isPlayInOrBeforeYear(play, year) {
  if (!year) return true;
  const playYear = parseInt(play.date.substring(0, 4));
  return playYear <= year;
}

/**
 * Filter plays by year
 * @param {Array} plays - Array of play objects
 * @param {number|null} year - Year to filter by, or null for all plays
 * @returns {Array} Filtered plays
 */
function filterPlaysByYear(plays, year) {
  if (!year) return plays;
  return plays.filter(play => isPlayInYear(play, year));
}

/**
 * Calculate metric values (plays, sessions, hours) per game through a given year
 * @param {Array} plays - Array of play objects
 * @param {number|null} year - Include plays through this year (inclusive), or null for all time
 * @returns {Map} Map of gameId -> { playCount, totalMinutes, uniqueDates }
 */
function getMetricValuesThroughYear(plays, year = null) {
  const metricValues = new Map();

  plays.forEach(play => {
    if (!isPlayInOrBeforeYear(play, year)) return;

    const currentValue = metricValues.get(play.gameId) || {
      playCount: 0,
      totalMinutes: 0,
      uniqueDates: new Set(),
    };

    currentValue.playCount += 1;
    currentValue.totalMinutes += (play.durationMin || 0);
    currentValue.uniqueDates.add(play.date);

    metricValues.set(play.gameId, currentValue);
  });

  return metricValues;
}

export { isPlayInYear, isPlayInOrBeforeYear, filterPlaysByYear, getMetricValuesThroughYear };
