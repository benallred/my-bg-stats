/**
 * Display Formatting Module
 * Functions for formatting data for UI display
 */

/**
 * Format minutes as "more than X" or "almost X" hours based on decimal
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted hours string (e.g., "more than 3" or "almost 4")
 */
export function formatApproximateHours(minutes) {
    const hoursExact = minutes / 60;
    const hoursFloor = Math.floor(hoursExact);
    const decimal = hoursExact - hoursFloor;
    return decimal < 0.5
        ? `more than ${hoursFloor}`
        : `almost ${hoursFloor + 1}`;
}

/**
 * Format a YYYY-MM-DD date string as "Aug 11"
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {string} Formatted date string or '-' if invalid
 */
export function formatDateShort(dateString) {
    if (!dateString) return '-';
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format a YYYY-MM-DD date string as "Mon, Aug 11"
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {string} Formatted date string or '-' if invalid
 */
export function formatDateWithWeekday(dateString) {
    if (!dateString) return '-';
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/**
 * Format a number with commas. If >= 1000, rounds to whole number; otherwise shows 1 decimal.
 * @param {number} num - The number to format
 * @returns {string} Formatted number string (e.g., "1,038" or "937.8")
 */
export function formatLargeNumber(num) {
    if (num >= 1000) {
        return Math.round(num).toLocaleString();
    }
    return num.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/**
 * Format a cost value as a currency label
 * - Integer dollar values: "$5", "$1"
 * - Decimal dollar values: "$2.50"
 * - Sub-dollar values: "50¢"
 * @param {number} value - Cost value in dollars
 * @returns {string} Formatted cost label
 */
export function formatCostLabel(value) {
    if (value >= 1) {
        return Number.isInteger(value) ? `$${value}` : `$${value.toFixed(2)}`;
    }
    return `${value * 100}¢`;
}
