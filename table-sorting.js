/**
 * Table sorting module for stat detail tables
 *
 * Provides column configurations, sorting logic, and header HTML generation
 * for interactive table sorting with URL persistence.
 */

/**
 * Column configurations for each sortable table.
 *
 * Each column can have:
 * - key: Unique identifier for the column
 * - getValue: Function to extract sortable value (for single-value columns)
 * - getValues: Function returning [value1, value2] for multi-value columns (Min/Max, Median/Avg)
 *              Sorting uses Math.min() for ascending, Math.max() for descending
 * - type: 'string' for alphabetical sort, numeric is default
 * - defaultDir: 'asc' or 'desc' - marks this as the default sort column
 * - sortable: false to disable sorting for this column
 */
export const tableColumnConfigs = {
    'total-play-time': [
        { key: 'game', getValue: item => item.game.name, type: 'string' },
        { key: 'time', getValue: item => item.totalMinutes, defaultDir: 'desc' },
        { key: 'minmax', getValues: item => [item.minMinutes, item.maxMinutes] },
        { key: 'medavg', getValues: item => [item.medianMinutes, item.avgMinutes] },
        { key: 'durations', sortable: false },
    ],
    'total-days-played': [
        { key: 'game', getValue: item => item.game.name, type: 'string' },
        { key: 'days', getValue: item => item.uniqueDays, defaultDir: 'desc' },
        { key: 'medavgplays', getValues: item => [item.medianPlays, item.avgPlays] },
        { key: 'minmaxtime', getValues: item => [item.minMinutes, item.maxMinutes] },
        { key: 'medavgtime', getValues: item => [item.medianMinutes, item.avgMinutes] },
    ],
    'games-played': [
        { key: 'game', getValue: item => item.game.name, type: 'string' },
        { key: 'plays', getValue: item => item.plays, defaultDir: 'desc' },
        { key: 'status', sortable: false },
    ],
    'h-index': [
        { key: 'rank', getValue: item => item.rank },
        { key: 'game', getValue: item => item.game.name, type: 'string' },
        { key: 'value', getValue: item => item.value, defaultDir: 'desc' },
        { key: 'contributes', getValue: item => item.contributes ? 1 : 0 },
    ],
    'people-h-index': [
        { key: 'rank', getValue: item => item.rank },
        { key: 'game', getValue: item => item.game.name, type: 'string' },
        { key: 'players', getValue: item => item.uniquePlayers, defaultDir: 'desc' },
        { key: 'contributes', getValue: item => item.contributes ? 1 : 0 },
    ],
    'players': [
        { key: 'player', getValue: item => item.name, type: 'string' },
        { key: 'hours', getValue: item => item.minutes },
        { key: 'sessions', getValue: item => item.sessions },
        { key: 'plays', getValue: item => item.plays },
    ],
    'solo': [
        { key: 'game', getValue: item => item.game.name, type: 'string' },
        { key: 'hours', getValue: item => item.minutes },
        { key: 'sessions', getValue: item => item.sessions },
        { key: 'plays', getValue: item => item.plays },
    ],
    'locations': [
        { key: 'location', getValue: item => item.name, type: 'string' },
        { key: 'hours', getValue: item => item.minutes },
        { key: 'sessions', getValue: item => item.sessions },
        { key: 'plays', getValue: item => item.plays },
    ],
    'fives': [
        { key: 'game', getValue: item => item.game.name, type: 'string' },
        { key: 'count', getValue: item => item.count, defaultDir: 'desc' },
    ],
    'dimes': [
        { key: 'game', getValue: item => item.game.name, type: 'string' },
        { key: 'count', getValue: item => item.count, defaultDir: 'desc' },
    ],
    'quarters': [
        { key: 'game', getValue: item => item.game.name, type: 'string' },
        { key: 'count', getValue: item => item.count, defaultDir: 'desc' },
    ],
    'centuries': [
        { key: 'game', getValue: item => item.game.name, type: 'string' },
        { key: 'count', getValue: item => item.count, defaultDir: 'desc' },
    ],
    'total-cost': [
        { key: 'game', getValue: item => item.game.name, type: 'string' },
        { key: 'price', getValue: item => item.totalPricePaid ?? 0, defaultDir: 'desc' },
    ],
    'value-clubs': [
        { key: 'game', getValue: item => item.game.name, type: 'string' },
        { key: 'value', getValue: item => item.metricValue },
        { key: 'costper', getValue: item => item.costPerMetric, defaultDir: 'asc' },
        { key: 'price', getValue: item => item.pricePaid },
    ],
    'cost-per-metric': [
        { key: 'game', getValue: item => item.game.name, type: 'string' },
        { key: 'value', getValue: item => item.metricValue },
        { key: 'costper', getValue: item => item.costPerMetric, defaultDir: 'asc' },
        { key: 'price', getValue: item => item.pricePaid },
    ],
    'shelf-of-shame': [
        { key: 'game', getValue: item => item.game.name, type: 'string' },
        { key: 'price', getValue: item => item.pricePaid, defaultDir: 'desc' },
    ],
    'bgg-entries': [
        { key: 'name', getValue: item => item.name, type: 'string' },
        { key: 'type', getValue: item => item.type, type: 'string' },
        { key: 'date', getValue: item => item.acquisitionDate, type: 'string', defaultDir: 'desc' },
    ],
    'expansions': [
        { key: 'name', getValue: item => item.name, type: 'string' },
        { key: 'type', getValue: item => item.type, type: 'string' },
        { key: 'date', getValue: item => item.acquisitionDate, type: 'string', defaultDir: 'desc' },
    ],
};

/**
 * Get the default sort configuration for a table.
 *
 * @param {string} statType - The stat type identifier
 * @param {string} [currentMetric] - Optional current metric for tables with metric-based defaults
 * @returns {{ column: string, direction: string } | null} Default sort config or null
 */
export function getDefaultSort(statType, currentMetric) {
    const config = tableColumnConfigs[statType];
    if (!config) return null;

    // Tables with metric-based default sort
    const metricBasedTables = ['players', 'solo', 'locations'];
    if (currentMetric && metricBasedTables.includes(statType)) {
        return {
            column: currentMetric, // 'hours', 'sessions', or 'plays'
            direction: 'desc',
        };
    }

    const defaultCol = config.find(c => c.defaultDir);
    if (!defaultCol) return null;

    return {
        column: defaultCol.key,
        direction: defaultCol.defaultDir,
    };
}

/**
 * Sort table data by the specified column and direction.
 *
 * For multi-value columns (getValues):
 * - Ascending: sort by Math.min(value1, value2)
 * - Descending: sort by Math.max(value1, value2)
 *
 * @param {Array} data - Array of data items to sort
 * @param {string} statType - The stat type identifier
 * @param {string|null} sortCol - Column key to sort by (null uses default)
 * @param {string|null} sortDir - Sort direction 'asc' or 'desc' (null uses default)
 * @param {string} [currentMetric] - Optional current metric for tables with metric-based defaults
 * @returns {Array} Sorted copy of the data array
 */
export function sortTableData(data, statType, sortCol, sortDir, currentMetric) {
    const config = tableColumnConfigs[statType];
    if (!config || !data || data.length === 0) return data;

    // Use default sort if not specified
    if (!sortCol || !sortDir) {
        const defaultSort = getDefaultSort(statType, currentMetric);
        if (!defaultSort) return data;
        sortCol = defaultSort.column;
        sortDir = defaultSort.direction;
    }

    const colConfig = config.find(c => c.key === sortCol);
    if (!colConfig || colConfig.sortable === false) return data;

    const sorted = [...data].sort((a, b) => {
        let aVal, bVal;

        if (colConfig.getValues) {
            // Multi-value column: use Math.min for asc, Math.max for desc
            const [aVal1, aVal2] = colConfig.getValues(a);
            const [bVal1, bVal2] = colConfig.getValues(b);
            if (sortDir === 'asc') {
                aVal = Math.min(aVal1, aVal2);
                bVal = Math.min(bVal1, bVal2);
            } else {
                aVal = Math.max(aVal1, aVal2);
                bVal = Math.max(bVal1, bVal2);
            }
        } else {
            aVal = colConfig.getValue(a);
            bVal = colConfig.getValue(b);
        }

        // Handle null/undefined values (sort to end)
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;

        // Compare based on type
        let result;
        if (colConfig.type === 'string') {
            result = String(aVal).localeCompare(String(bVal));
        } else {
            result = aVal - bVal;
        }

        return sortDir === 'desc' ? -result : result;
    });

    return sorted;
}

/**
 * Generate HTML for sortable table headers.
 *
 * @param {string} statType - The stat type identifier
 * @param {Array<{key: string, label: string}>} columns - Column definitions with labels
 * @param {string|null} sortCol - Currently sorted column key
 * @param {string|null} sortDir - Current sort direction
 * @returns {string} HTML string for table header cells
 */
export function createSortableHeaderHtml(statType, columns, sortCol, sortDir) {
    const config = tableColumnConfigs[statType];
    if (!config) {
        // Fallback: non-sortable headers
        return columns.map(col => `<th>${col.label}</th>`).join('');
    }

    // Use default sort for visual indicators if no active sort
    if (!sortCol || !sortDir) {
        const defaultSort = getDefaultSort(statType);
        if (defaultSort) {
            sortCol = defaultSort.column;
            sortDir = defaultSort.direction;
        }
    }

    return columns.map(col => {
        const colConfig = config.find(c => c.key === col.key);

        // Non-sortable column
        if (!colConfig || colConfig.sortable === false) {
            return `<th>${col.label}</th>`;
        }

        // Determine sort state
        const isSorted = sortCol === col.key;
        let sortClass;
        if (isSorted) {
            sortClass = sortDir === 'asc' ? 'sorted-asc' : 'sorted-desc';
        } else {
            sortClass = 'sortable';
        }

        return `<th class="${sortClass}" data-sort-col="${col.key}">${col.label}</th>`;
    }).join('');
}
