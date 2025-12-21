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
