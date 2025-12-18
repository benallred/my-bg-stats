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
 * Helper: Check if a game was acquired in a specific year
 * @param {Object} game - Game object
 * @param {number} year - Year to check
 * @returns {boolean} true if any copy was acquired in the year
 */
function wasGameAcquiredInYear(game, year) {
  if (!game.copies || game.copies.length === 0) return false;
  return game.copies.some(copy =>
    copy.acquisitionDate && copy.acquisitionDate.startsWith(year.toString())
  );
}

export { isGameOwned, wasGameAcquiredInYear };
