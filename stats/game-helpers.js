/**
 * Game helper functions for ownership and acquisition checks
 */

/**
 * Helper: Check if a game is currently owned
 * @param {Object} game - Game object
 * @returns {boolean} true if any copy is currently owned
 */
function isGameOwned(game) {
  if (!game.copies || game.copies.length === 0) return false;
  return game.copies.some(copy => copy.statusOwned === true);
}

/**
 * Helper: Check if a copy was acquired in a specific year
 * @param {Object} copy - Copy object
 * @param {number} year - Year to check
 * @returns {boolean} true if the copy was acquired in the year
 */
function wasCopyAcquiredInYear(copy, year) {
  return copy.acquisitionDate && copy.acquisitionDate.startsWith(year.toString());
}

/**
 * Helper: Check if a copy was acquired in or before a specific year
 * @param {Object} copy - Copy object
 * @param {number} year - Year to check
 * @returns {boolean} true if the copy was acquired in or before the year
 */
function wasCopyAcquiredInOrBeforeYear(copy, year) {
  if (!copy.acquisitionDate) return false;
  const acquisitionYear = parseInt(copy.acquisitionDate.substring(0, 4));
  return acquisitionYear <= year;
}

/**
 * Helper: Check if a game was acquired in a specific year
 * @param {Object} game - Game object
 * @param {number} year - Year to check
 * @returns {boolean} true if any copy was acquired in the year
 */
function wasGameAcquiredInYear(game, year) {
  if (!game.copies || game.copies.length === 0) return false;
  return game.copies.some(copy => wasCopyAcquiredInYear(copy, year));
}

/**
 * Helper: Check if a game was acquired in or before a specific year
 * @param {Object} game - Game object
 * @param {number} year - Year to check
 * @returns {boolean} true if any copy was acquired in or before the year
 */
function wasGameAcquiredInOrBeforeYear(game, year) {
  if (!game.copies || game.copies.length === 0) return false;
  return game.copies.some(copy => wasCopyAcquiredInOrBeforeYear(copy, year));
}

/**
 * Helper: Get the earliest acquisition date of a game
 * @param {Object} game - Game object
 * @returns {string|null} The earliest acquisition date, or null if none
 */
function getGameAcquisitionDate(game) {
  if (!game.copies || game.copies.length === 0) return null;
  const dates = game.copies
    .map(c => c.acquisitionDate)
    .filter(d => d);
  if (dates.length === 0) return null;
  dates.sort();
  return dates[0];
}

export {
  isGameOwned,
  wasCopyAcquiredInYear,
  wasCopyAcquiredInOrBeforeYear,
  wasGameAcquiredInYear,
  wasGameAcquiredInOrBeforeYear,
  getGameAcquisitionDate,
};
