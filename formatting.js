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
 * Format a YYYY-MM-DD date string as "Aug 11, 2024"
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {string} Formatted date string or '-' if invalid
 */
export function formatDateWithYear(dateString) {
    if (!dateString) return '-';
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    // Replace "Mon D" space with non-breaking space; keep space after comma breakable
    return formatted.replace(/^(\w+)\s/, '$1\u00A0');
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
 * Escape HTML-significant characters for safe insertion as element text content.
 * @param {string} str - Raw text
 * @returns {string} Escaped text
 */
export function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Get the BGG rating color for a given rating value.
 * Uses BoardGameGeek's rating color bands (floor-banded, so decimals take the
 * color of their integer floor — e.g. 7.3 is blue like 7, 4.5 is red like 4).
 * @param {number|null} rating - Rating value (1-10) or null
 * @returns {string} Hex color string
 */
export function getRatingColor(rating) {
    if (rating === null || rating === undefined) return '#6b7785';
    if (rating >= 9) return '#249563'; // 9-10 dark green
    if (rating >= 8) return '#2fc482'; // 8 green
    if (rating >= 7) return '#1d8acd'; // 7 blue
    if (rating >= 5) return '#5369a2'; // 5-6 slate blue
    if (rating >= 3) return '#df4751'; // 3-4 red
    if (rating >= 1) return '#db303b'; // 1-2 dark red
    return '#6b7785'; // below 1 / unrated
}

/**
 * Render a BGG-style rating hexagon as an HTML string, colored by rating band.
 * Unrated games (null/undefined) render a muted gray "no rating" hexagon.
 * @param {number|null} rating - Rating value (1-10) or null
 * @param {string|null} extraClass - Optional extra CSS class (e.g. 'rating-hex--lg')
 * @returns {string} HTML string
 */
export function renderRatingHexagon(rating, extraClass = null) {
    const isRated = rating !== null && rating !== undefined;
    const color = getRatingColor(rating);
    const classes = ['rating-hex'];
    if (!isRated) classes.push('rating-hex--none');
    if (extraClass) classes.push(extraClass);
    const cls = classes.join(' ');
    const title = isRated ? '' : ' title="No rating"';
    const label = isRated ? rating : '';
    return `<span class="${cls}" style="background-color: ${color};"${title}>${label}</span>`;
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
    return `${Math.round(value * 100)}¢`;
}
