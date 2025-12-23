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
 * Filter plays by year
 * @param {Array} plays - Array of play objects
 * @param {number|null} year - Year to filter by, or null for all plays
 * @returns {Array} Filtered plays
 */
function filterPlaysByYear(plays, year) {
  if (!year) return plays;
  return plays.filter(play => isPlayInYear(play, year));
}

export { isPlayInYear, filterPlaysByYear };
