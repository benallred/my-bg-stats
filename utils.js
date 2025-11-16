/**
 * Utility Functions Module
 * Shared helper functions used across the application
 */

/**
 * Calculate median of an array of numbers
 * @param {number[]} values - Array of numeric values
 * @returns {number|null} Median value or null if array is empty
 */
export function calculateMedian(values) {
  if (values.length === 0) {
    return null;
  }

  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  } else {
    return sorted[mid];
  }
}
