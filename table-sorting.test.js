import { describe, test, expect } from 'vitest';
import {
    tableColumnConfigs,
    getDefaultSort,
    sortTableData,
    createSortableHeaderHtml,
} from './table-sorting.js';

describe('tableColumnConfigs', () => {
    test('has config for total-play-time', () => {
        expect(tableColumnConfigs['total-play-time']).toBeDefined();
        expect(tableColumnConfigs['total-play-time'].length).toBe(5);
    });

    test('total-play-time has correct default column', () => {
        const config = tableColumnConfigs['total-play-time'];
        const defaultCol = config.find(c => c.defaultDir);
        expect(defaultCol.key).toBe('time');
        expect(defaultCol.defaultDir).toBe('desc');
    });
});

describe('getDefaultSort', () => {
    test('returns default sort for total-play-time', () => {
        const result = getDefaultSort('total-play-time');
        expect(result).toEqual({ column: 'time', direction: 'desc' });
    });

    test('returns default sort for h-index', () => {
        const result = getDefaultSort('h-index');
        expect(result).toEqual({ column: 'value', direction: 'desc' });
    });

    test('returns default sort for cost-per-metric (ascending)', () => {
        const result = getDefaultSort('cost-per-metric');
        expect(result).toEqual({ column: 'costper', direction: 'asc' });
    });

    test('returns null for unknown stat type', () => {
        const result = getDefaultSort('unknown-stat');
        expect(result).toBeNull();
    });

    test('returns metric-based default for players table', () => {
        const result = getDefaultSort('players', 'hours');
        expect(result).toEqual({ column: 'hours', direction: 'desc' });
    });

    test('returns metric-based default for solo table', () => {
        const result = getDefaultSort('solo', 'sessions');
        expect(result).toEqual({ column: 'sessions', direction: 'desc' });
    });

    test('returns metric-based default for locations table', () => {
        const result = getDefaultSort('locations', 'plays');
        expect(result).toEqual({ column: 'plays', direction: 'desc' });
    });

    test('returns null for tables without defaultDir when no metric specified', () => {
        // players, solo, locations have no defaultDir - they use currentMetric
        const result = getDefaultSort('players');
        expect(result).toBeNull();
    });
});

describe('sortTableData', () => {
    const testData = [
        { game: { name: 'Catan' }, totalMinutes: 120, minMinutes: 30, maxMinutes: 60, medianMinutes: 40, avgMinutes: 45 },
        { game: { name: 'Azul' }, totalMinutes: 60, minMinutes: 15, maxMinutes: 30, medianMinutes: 20, avgMinutes: 22 },
        { game: { name: 'Wingspan' }, totalMinutes: 180, minMinutes: 45, maxMinutes: 90, medianMinutes: 60, avgMinutes: 70 },
    ];

    test('returns original data for unknown stat type', () => {
        const result = sortTableData(testData, 'unknown');
        expect(result).toBe(testData);
    });

    test('returns original data for empty array', () => {
        const result = sortTableData([], 'total-play-time', 'time', 'desc');
        expect(result).toEqual([]);
    });

    test('uses default sort when sortCol is null', () => {
        const result = sortTableData(testData, 'total-play-time', null, null);
        // Default is time desc (highest first)
        expect(result[0].game.name).toBe('Wingspan');
        expect(result[1].game.name).toBe('Catan');
        expect(result[2].game.name).toBe('Azul');
    });

    test('returns original data when no default sort exists', () => {
        const playerData = [
            { name: 'Alice', minutes: 100, sessions: 5, plays: 10 },
            { name: 'Bob', minutes: 200, sessions: 10, plays: 20 },
        ];
        // players table has no defaultDir, and no metric is passed
        const result = sortTableData(playerData, 'players', null, null);
        expect(result).toBe(playerData);
    });

    test('sorts by string column ascending', () => {
        const result = sortTableData(testData, 'total-play-time', 'game', 'asc');
        expect(result[0].game.name).toBe('Azul');
        expect(result[1].game.name).toBe('Catan');
        expect(result[2].game.name).toBe('Wingspan');
    });

    test('sorts by string column descending', () => {
        const result = sortTableData(testData, 'total-play-time', 'game', 'desc');
        expect(result[0].game.name).toBe('Wingspan');
        expect(result[1].game.name).toBe('Catan');
        expect(result[2].game.name).toBe('Azul');
    });

    test('sorts by numeric column ascending', () => {
        const result = sortTableData(testData, 'total-play-time', 'time', 'asc');
        expect(result[0].totalMinutes).toBe(60);
        expect(result[1].totalMinutes).toBe(120);
        expect(result[2].totalMinutes).toBe(180);
    });

    test('sorts by numeric column descending', () => {
        const result = sortTableData(testData, 'total-play-time', 'time', 'desc');
        expect(result[0].totalMinutes).toBe(180);
        expect(result[1].totalMinutes).toBe(120);
        expect(result[2].totalMinutes).toBe(60);
    });

    test('sorts multi-value column by Math.min when ascending', () => {
        const result = sortTableData(testData, 'total-play-time', 'minmax', 'asc');
        // Sorted by Math.min(minMinutes, maxMinutes) ascending: 15, 30, 45
        expect(result[0].minMinutes).toBe(15);
        expect(result[1].minMinutes).toBe(30);
        expect(result[2].minMinutes).toBe(45);
    });

    test('sorts multi-value column by Math.max when descending', () => {
        const result = sortTableData(testData, 'total-play-time', 'minmax', 'desc');
        // Sorted by Math.max(minMinutes, maxMinutes) descending: 90, 60, 30
        expect(result[0].maxMinutes).toBe(90);
        expect(result[1].maxMinutes).toBe(60);
        expect(result[2].maxMinutes).toBe(30);
    });

    test('sorts median/avg column by Math.min when ascending', () => {
        const result = sortTableData(testData, 'total-play-time', 'medavg', 'asc');
        // Sorted by Math.min(medianMinutes, avgMinutes) ascending: 20, 40, 60
        expect(result[0].medianMinutes).toBe(20);
        expect(result[1].medianMinutes).toBe(40);
        expect(result[2].medianMinutes).toBe(60);
    });

    test('sorts median/avg column by Math.max when descending', () => {
        const result = sortTableData(testData, 'total-play-time', 'medavg', 'desc');
        // Sorted by Math.max(medianMinutes, avgMinutes) descending: 70, 45, 22
        expect(result[0].avgMinutes).toBe(70);
        expect(result[1].avgMinutes).toBe(45);
        expect(result[2].avgMinutes).toBe(22);
    });

    test('handles null values by sorting them to end', () => {
        const dataWithNulls = [
            { game: { name: 'Catan' }, totalMinutes: 120 },
            { game: { name: 'Azul' }, totalMinutes: null },
            { game: { name: 'Wingspan' }, totalMinutes: 180 },
        ];
        const resultAsc = sortTableData(dataWithNulls, 'total-play-time', 'time', 'asc');
        expect(resultAsc[0].totalMinutes).toBe(120);
        expect(resultAsc[1].totalMinutes).toBe(180);
        expect(resultAsc[2].totalMinutes).toBeNull();

        const resultDesc = sortTableData(dataWithNulls, 'total-play-time', 'time', 'desc');
        expect(resultDesc[0].totalMinutes).toBe(180);
        expect(resultDesc[1].totalMinutes).toBe(120);
        expect(resultDesc[2].totalMinutes).toBeNull();
    });

    test('handles both values being null', () => {
        const dataWithBothNulls = [
            { game: { name: 'Catan' }, totalMinutes: null },
            { game: { name: 'Azul' }, totalMinutes: null },
            { game: { name: 'Wingspan' }, totalMinutes: 180 },
        ];
        const result = sortTableData(dataWithBothNulls, 'total-play-time', 'time', 'desc');
        // Non-null value should come first, nulls should maintain relative order
        expect(result[0].totalMinutes).toBe(180);
        expect(result[1].totalMinutes).toBeNull();
        expect(result[2].totalMinutes).toBeNull();
    });

    test('returns original data for non-sortable column', () => {
        const result = sortTableData(testData, 'total-play-time', 'durations', 'asc');
        // Should not change order since durations is not sortable
        expect(result[0]).toBe(testData[0]);
    });

    test('does not mutate original array', () => {
        const original = [...testData];
        sortTableData(testData, 'total-play-time', 'time', 'asc');
        expect(testData[0]).toBe(original[0]);
    });
});

describe('sortTableData - all table types', () => {
    // Test each table type to ensure all getValue functions are covered

    test('total-days-played sorts by all columns', () => {
        // For multi-value columns: asc sorts by Math.min(val1, val2), desc sorts by Math.max(val1, val2)
        const data = [
            { game: { name: 'Catan' }, uniqueDays: 5, medianPlays: 2, avgPlays: 6, minMinutes: 30, maxMinutes: 60, medianMinutes: 40, avgMinutes: 50 },
            { game: { name: 'Azul' }, uniqueDays: 10, medianPlays: 4, avgPlays: 5, minMinutes: 20, maxMinutes: 40, medianMinutes: 35, avgMinutes: 45 },
        ];
        expect(sortTableData(data, 'total-days-played', 'game', 'asc')[0].game.name).toBe('Azul');
        expect(sortTableData(data, 'total-days-played', 'days', 'desc')[0].uniqueDays).toBe(10);
        // medavgplays: Catan Math.min(2,6)=2, Math.max(2,6)=6; Azul Math.min(4,5)=4, Math.max(4,5)=5
        // asc by Math.min: Catan(2) < Azul(4) → Catan first
        expect(sortTableData(data, 'total-days-played', 'medavgplays', 'asc')[0].game.name).toBe('Catan');
        // desc by Math.max: Catan(6) > Azul(5) → Catan first
        expect(sortTableData(data, 'total-days-played', 'medavgplays', 'desc')[0].game.name).toBe('Catan');
        // minmaxtime: Catan Math.min(30,60)=30, Math.max(30,60)=60; Azul Math.min(20,40)=20, Math.max(20,40)=40
        // asc by Math.min: Azul(20) < Catan(30) → Azul first
        expect(sortTableData(data, 'total-days-played', 'minmaxtime', 'asc')[0].game.name).toBe('Azul');
        // desc by Math.max: Catan(60) > Azul(40) → Catan first
        expect(sortTableData(data, 'total-days-played', 'minmaxtime', 'desc')[0].game.name).toBe('Catan');
        // medavgtime: Catan Math.min(40,50)=40, Math.max(40,50)=50; Azul Math.min(35,45)=35, Math.max(35,45)=45
        // asc by Math.min: Azul(35) < Catan(40) → Azul first
        expect(sortTableData(data, 'total-days-played', 'medavgtime', 'asc')[0].game.name).toBe('Azul');
        // desc by Math.max: Catan(50) > Azul(45) → Catan first
        expect(sortTableData(data, 'total-days-played', 'medavgtime', 'desc')[0].game.name).toBe('Catan');
    });

    test('games-played sorts by game and plays', () => {
        const data = [
            { game: { name: 'Catan' }, plays: 5 },
            { game: { name: 'Azul' }, plays: 10 },
        ];
        expect(sortTableData(data, 'games-played', 'game', 'asc')[0].game.name).toBe('Azul');
        expect(sortTableData(data, 'games-played', 'plays', 'desc')[0].plays).toBe(10);
    });

    test('h-index sorts by all columns', () => {
        const data = [
            { rank: 1, game: { name: 'Catan' }, value: 5, contributes: true },
            { rank: 2, game: { name: 'Azul' }, value: 10, contributes: false },
        ];
        expect(sortTableData(data, 'h-index', 'rank', 'asc')[0].rank).toBe(1);
        expect(sortTableData(data, 'h-index', 'game', 'asc')[0].game.name).toBe('Azul');
        expect(sortTableData(data, 'h-index', 'value', 'desc')[0].value).toBe(10);
        expect(sortTableData(data, 'h-index', 'contributes', 'desc')[0].contributes).toBe(true);
    });

    test('people-h-index sorts by all columns', () => {
        const data = [
            { rank: 1, game: { name: 'Catan' }, uniquePlayers: 5, contributes: true },
            { rank: 2, game: { name: 'Azul' }, uniquePlayers: 10, contributes: false },
        ];
        expect(sortTableData(data, 'people-h-index', 'rank', 'asc')[0].rank).toBe(1);
        expect(sortTableData(data, 'people-h-index', 'game', 'asc')[0].game.name).toBe('Azul');
        expect(sortTableData(data, 'people-h-index', 'players', 'desc')[0].uniquePlayers).toBe(10);
        expect(sortTableData(data, 'people-h-index', 'contributes', 'desc')[0].contributes).toBe(true);
    });

    test('players sorts by all columns', () => {
        const data = [
            { name: 'Alice', minutes: 100, sessions: 5, plays: 10 },
            { name: 'Bob', minutes: 200, sessions: 10, plays: 20 },
        ];
        expect(sortTableData(data, 'players', 'player', 'asc')[0].name).toBe('Alice');
        expect(sortTableData(data, 'players', 'hours', 'desc')[0].minutes).toBe(200);
        expect(sortTableData(data, 'players', 'sessions', 'desc')[0].sessions).toBe(10);
        expect(sortTableData(data, 'players', 'plays', 'desc')[0].plays).toBe(20);
    });

    test('solo sorts by all columns', () => {
        const data = [
            { game: { name: 'A' }, minutes: 100, sessions: 5, plays: 10 },
            { game: { name: 'B' }, minutes: 200, sessions: 10, plays: 20 },
        ];
        expect(sortTableData(data, 'solo', 'game', 'asc')[0].game.name).toBe('A');
        expect(sortTableData(data, 'solo', 'hours', 'desc')[0].minutes).toBe(200);
        expect(sortTableData(data, 'solo', 'sessions', 'desc')[0].sessions).toBe(10);
        expect(sortTableData(data, 'solo', 'plays', 'desc')[0].plays).toBe(20);
    });

    test('locations sorts by all columns', () => {
        const data = [
            { name: 'Home', minutes: 100, sessions: 5, plays: 10 },
            { name: 'Cafe', minutes: 200, sessions: 10, plays: 20 },
        ];
        expect(sortTableData(data, 'locations', 'location', 'asc')[0].name).toBe('Cafe');
        expect(sortTableData(data, 'locations', 'hours', 'desc')[0].minutes).toBe(200);
        expect(sortTableData(data, 'locations', 'sessions', 'desc')[0].sessions).toBe(10);
        expect(sortTableData(data, 'locations', 'plays', 'desc')[0].plays).toBe(20);
    });

    test('fives sorts by game and count', () => {
        const data = [
            { game: { name: 'Catan' }, count: 5 },
            { game: { name: 'Azul' }, count: 10 },
        ];
        expect(sortTableData(data, 'fives', 'game', 'asc')[0].game.name).toBe('Azul');
        expect(sortTableData(data, 'fives', 'count', 'desc')[0].count).toBe(10);
    });

    test('dimes sorts by game and count', () => {
        const data = [
            { game: { name: 'Catan' }, count: 10 },
            { game: { name: 'Azul' }, count: 20 },
        ];
        expect(sortTableData(data, 'dimes', 'game', 'asc')[0].game.name).toBe('Azul');
        expect(sortTableData(data, 'dimes', 'count', 'desc')[0].count).toBe(20);
    });

    test('quarters sorts by game and count', () => {
        const data = [
            { game: { name: 'Catan' }, count: 25 },
            { game: { name: 'Azul' }, count: 50 },
        ];
        expect(sortTableData(data, 'quarters', 'game', 'asc')[0].game.name).toBe('Azul');
        expect(sortTableData(data, 'quarters', 'count', 'desc')[0].count).toBe(50);
    });

    test('centuries sorts by game and count', () => {
        const data = [
            { game: { name: 'Catan' }, count: 100 },
            { game: { name: 'Azul' }, count: 200 },
        ];
        expect(sortTableData(data, 'centuries', 'game', 'asc')[0].game.name).toBe('Azul');
        expect(sortTableData(data, 'centuries', 'count', 'desc')[0].count).toBe(200);
    });

    test('total-cost sorts by game and price', () => {
        const data = [
            { game: { name: 'Catan' }, totalPricePaid: 50 },
            { game: { name: 'Azul' }, totalPricePaid: 0 },
            { game: { name: 'Brass' }, totalPricePaid: 100 },
        ];
        expect(sortTableData(data, 'total-cost', 'game', 'asc')[0].game.name).toBe('Azul');
        const resultPrice = sortTableData(data, 'total-cost', 'price', 'desc');
        expect(resultPrice[0].totalPricePaid).toBe(100);
        expect(resultPrice[1].totalPricePaid).toBe(50);
        expect(resultPrice[2].totalPricePaid).toBe(0);
    });

    test('total-cost handles null price via coalesce', () => {
        const data = [
            { game: { name: 'Catan' }, totalPricePaid: null },
            { game: { name: 'Azul' }, totalPricePaid: 50 },
        ];
        // null coalesces to 0, so Azul (50) should sort first in desc
        const result = sortTableData(data, 'total-cost', 'price', 'desc');
        expect(result[0].totalPricePaid).toBe(50);
        expect(result[1].totalPricePaid).toBe(null);
    });

    test('value-clubs sorts by all columns', () => {
        const data = [
            { game: { name: 'Catan' }, metricValue: 10, costPerMetric: 5, pricePaid: 50 },
            { game: { name: 'Azul' }, metricValue: 20, costPerMetric: 2, pricePaid: 40 },
        ];
        expect(sortTableData(data, 'value-clubs', 'game', 'asc')[0].game.name).toBe('Azul');
        expect(sortTableData(data, 'value-clubs', 'value', 'desc')[0].metricValue).toBe(20);
        expect(sortTableData(data, 'value-clubs', 'costper', 'asc')[0].costPerMetric).toBe(2);
        expect(sortTableData(data, 'value-clubs', 'price', 'desc')[0].pricePaid).toBe(50);
    });

    test('cost-per-metric sorts by all columns', () => {
        const data = [
            { game: { name: 'Catan' }, metricValue: 10, costPerMetric: 5, pricePaid: 50 },
            { game: { name: 'Azul' }, metricValue: 20, costPerMetric: 2, pricePaid: 40 },
        ];
        expect(sortTableData(data, 'cost-per-metric', 'game', 'asc')[0].game.name).toBe('Azul');
        expect(sortTableData(data, 'cost-per-metric', 'value', 'desc')[0].metricValue).toBe(20);
        expect(sortTableData(data, 'cost-per-metric', 'costper', 'asc')[0].costPerMetric).toBe(2);
        expect(sortTableData(data, 'cost-per-metric', 'price', 'desc')[0].pricePaid).toBe(50);
    });

    test('shelf-of-shame sorts by game and price', () => {
        const data = [
            { game: { name: 'Catan' }, pricePaid: 50 },
            { game: { name: 'Azul' }, pricePaid: 100 },
        ];
        expect(sortTableData(data, 'shelf-of-shame', 'game', 'asc')[0].game.name).toBe('Azul');
        expect(sortTableData(data, 'shelf-of-shame', 'price', 'desc')[0].pricePaid).toBe(100);
    });

    test('bgg-entries sorts by all columns', () => {
        const data = [
            { name: 'Catan', type: 'boardgame', acquisitionDate: '2024-01-01' },
            { name: 'Azul', type: 'boardgame', acquisitionDate: '2024-06-01' },
        ];
        expect(sortTableData(data, 'bgg-entries', 'name', 'asc')[0].name).toBe('Azul');
        expect(sortTableData(data, 'bgg-entries', 'type', 'asc')[0].type).toBe('boardgame');
        expect(sortTableData(data, 'bgg-entries', 'date', 'desc')[0].acquisitionDate).toBe('2024-06-01');
    });

    test('expansions sorts by all columns', () => {
        const data = [
            { name: 'Catan: Seafarers', type: 'Expansion', acquisitionDate: '2024-01-01' },
            { name: 'Azul: Crystal Mosaic', type: 'Expansion', acquisitionDate: '2024-06-01' },
        ];
        expect(sortTableData(data, 'expansions', 'name', 'asc')[0].name).toBe('Azul: Crystal Mosaic');
        expect(sortTableData(data, 'expansions', 'type', 'asc')[0].type).toBe('Expansion');
        expect(sortTableData(data, 'expansions', 'date', 'desc')[0].acquisitionDate).toBe('2024-06-01');
    });
});

describe('createSortableHeaderHtml', () => {
    const columns = [
        { key: 'game', label: 'Game' },
        { key: 'time', label: 'Time Played' },
        { key: 'minmax', label: 'Min/Max Play Time' },
        { key: 'medavg', label: 'Median/Avg Play Time' },
        { key: 'durations', label: 'Play Durations' },
    ];

    test('generates non-sortable header for unknown stat type', () => {
        const result = createSortableHeaderHtml('unknown', columns, null, null);
        expect(result).toBe('<th>Game</th><th>Time Played</th><th>Min/Max Play Time</th><th>Median/Avg Play Time</th><th>Play Durations</th>');
    });

    test('marks default sort column as sorted when no active sort', () => {
        const result = createSortableHeaderHtml('total-play-time', columns, null, null);
        expect(result).toContain('class="sorted-desc" data-sort-col="time"');
    });

    test('all columns sortable when no default sort exists', () => {
        const playerColumns = [
            { key: 'player', label: 'Player' },
            { key: 'hours', label: 'Hours' },
        ];
        // players table has no defaultDir, so all columns should be sortable (not sorted)
        const result = createSortableHeaderHtml('players', playerColumns, null, null);
        expect(result).toContain('class="sortable" data-sort-col="player"');
        expect(result).toContain('class="sortable" data-sort-col="hours"');
        expect(result).not.toContain('sorted-');
    });

    test('marks active sort column with correct class', () => {
        const result = createSortableHeaderHtml('total-play-time', columns, 'game', 'asc');
        expect(result).toContain('class="sorted-asc" data-sort-col="game"');
        expect(result).toContain('class="sortable" data-sort-col="time"');
    });

    test('marks descending sort correctly', () => {
        const result = createSortableHeaderHtml('total-play-time', columns, 'medavg', 'desc');
        expect(result).toContain('class="sorted-desc" data-sort-col="medavg"');
    });

    test('non-sortable columns have no class or data attribute', () => {
        const result = createSortableHeaderHtml('total-play-time', columns, 'time', 'desc');
        expect(result).toContain('<th>Play Durations</th>');
        expect(result).not.toContain('data-sort-col="durations"');
    });

    test('sortable columns have sortable class when not active', () => {
        const result = createSortableHeaderHtml('total-play-time', columns, 'time', 'desc');
        expect(result).toContain('class="sortable" data-sort-col="game"');
        expect(result).toContain('class="sortable" data-sort-col="minmax"');
        expect(result).toContain('class="sortable" data-sort-col="medavg"');
    });
});
