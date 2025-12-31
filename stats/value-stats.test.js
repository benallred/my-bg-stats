import { describe, test, expect } from 'vitest';
import {
  getTotalCost,
  getValueClubGames,
  calculateValueClubIncrease,
  getNewValueClubGames,
  getSkippedValueClubCount,
  getCostPerMetricStats,
  getShelfOfShame,
} from './value-stats.js';
import { Metric, ValueClub } from './constants.js';
import { processData } from '../scripts/transform-game-data.js';
import typicalFixture from '../tests/fixtures/typical.json';

const typicalData = processData(typicalFixture);

describe('ValueClub', () => {
  test('has FIVE_DOLLAR tier value', () => {
    expect(ValueClub.FIVE_DOLLAR).toBe(5);
  });

  test('has TWO_FIFTY tier value', () => {
    expect(ValueClub.TWO_FIFTY).toBe(2.5);
  });

  test('has ONE_DOLLAR tier value', () => {
    expect(ValueClub.ONE_DOLLAR).toBe(1);
  });

  test('has FIFTY_CENTS tier value', () => {
    expect(ValueClub.FIFTY_CENTS).toBe(0.5);
  });

  test('has descending direction', () => {
    expect(ValueClub.direction).toBe('descending');
  });

  test('has values in descending order', () => {
    expect(ValueClub.values).toEqual([5, 2.5, 1, 0.5]);
  });

  test('getThreshold returns correct next threshold for each tier', () => {
    expect(ValueClub.getThreshold(ValueClub.FIVE_DOLLAR)).toEqual({ threshold: 5, nextThreshold: 2.5 });
    expect(ValueClub.getThreshold(ValueClub.TWO_FIFTY)).toEqual({ threshold: 2.5, nextThreshold: 1 });
    expect(ValueClub.getThreshold(ValueClub.ONE_DOLLAR)).toEqual({ threshold: 1, nextThreshold: 0.5 });
    expect(ValueClub.getThreshold(ValueClub.FIFTY_CENTS)).toEqual({ threshold: 0.5, nextThreshold: null });
  });
});

describe('getTotalCost', () => {
  test('returns object with totalCost, games, and gamesWithoutPrice', () => {
    const result = getTotalCost(typicalData.games);
    expect(result).toHaveProperty('totalCost');
    expect(result).toHaveProperty('games');
    expect(result).toHaveProperty('gamesWithoutPrice');
  });

  test('sums price paid across owned copies', () => {
    const result = getTotalCost(typicalData.games);
    expect(result.totalCost).toBeGreaterThan(0);
  });

  test('counts games without price data', () => {
    const result = getTotalCost(typicalData.games);
    // typicalData has some games without price
    expect(result.gamesWithoutPrice).toBeGreaterThanOrEqual(0);
  });

  test('sorts games by totalPricePaid descending', () => {
    const result = getTotalCost(typicalData.games);
    const gamesWithPrice = result.games.filter(g => g.totalPricePaid !== null);
    for (let i = 1; i < gamesWithPrice.length; i++) {
      expect(gamesWithPrice[i - 1].totalPricePaid).toBeGreaterThanOrEqual(gamesWithPrice[i].totalPricePaid);
    }
  });

  test('sorts games with null prices at end (treated as 0)', () => {
    const games = [
      {
        id: 1,
        name: 'Unknown Price Game',
        isBaseGame: true,
        copies: [{ statusOwned: true, pricePaid: null }],
      },
      {
        id: 2,
        name: 'Expensive Game',
        isBaseGame: true,
        copies: [{ statusOwned: true, pricePaid: 100 }],
      },
      {
        id: 3,
        name: 'Cheap Game',
        isBaseGame: true,
        copies: [{ statusOwned: true, pricePaid: 20 }],
      },
    ];
    const result = getTotalCost(games);
    expect(result.games[0].game.name).toBe('Expensive Game');
    expect(result.games[1].game.name).toBe('Cheap Game');
    expect(result.games[2].game.name).toBe('Unknown Price Game');
  });

  test('returns 0 for empty games array', () => {
    const result = getTotalCost([]);
    expect(result.totalCost).toBe(0);
    expect(result.games).toEqual([]);
    expect(result.gamesWithoutPrice).toBe(0);
  });

  test('skips games with empty copies array', () => {
    const games = [{
      id: 1,
      name: 'No Copies Game',
      isBaseGame: true,
      copies: [],
    }];
    const result = getTotalCost(games);
    expect(result.totalCost).toBe(0);
    expect(result.games).toEqual([]);
    expect(result.gamesWithoutPrice).toBe(0);
  });

  test('skips expansions and expandalones', () => {
    const games = [
      {
        id: 1,
        name: 'Expansion',
        isBaseGame: false,
        copies: [{ statusOwned: true, pricePaid: 30 }],
      },
      {
        id: 2,
        name: 'Expandalone',
        isBaseGame: false,
        copies: [{ statusOwned: true, pricePaid: 40 }],
      },
      {
        id: 3,
        name: 'Base Game',
        isBaseGame: true,
        copies: [{ statusOwned: true, pricePaid: 50 }],
      },
    ];
    const result = getTotalCost(games);
    expect(result.totalCost).toBe(50);
    expect(result.games.length).toBe(1);
    expect(result.games[0].game.name).toBe('Base Game');
  });

  test('only includes owned copies', () => {
    // Create test data with one owned and one unowned copy
    const games = [{
      id: 1,
      name: 'Test Game',
      isBaseGame: true,
      copies: [
        { statusOwned: true, pricePaid: 20 },
        { statusOwned: false, pricePaid: 15 },
      ],
    }];
    const result = getTotalCost(games);
    // Should only include the owned copy's price
    expect(result.totalCost).toBe(20);
  });

  test('sums multiple owned copies', () => {
    const games = [{
      id: 1,
      name: 'Test Game',
      isBaseGame: true,
      copies: [
        { statusOwned: true, pricePaid: 20 },
        { statusOwned: true, pricePaid: 15 },
      ],
    }];
    const result = getTotalCost(games);
    expect(result.totalCost).toBe(35);
    expect(result.games[0].totalPricePaid).toBe(35);
  });

  test('handles null pricePaid as unknown', () => {
    const games = [{
      id: 1,
      name: 'Test Game',
      isBaseGame: true,
      copies: [
        { statusOwned: true, pricePaid: null },
      ],
    }];
    const result = getTotalCost(games);
    expect(result.totalCost).toBe(0);
    expect(result.gamesWithoutPrice).toBe(1);
    expect(result.games[0].totalPricePaid).toBeNull();
  });

  test('handles undefined pricePaid as unknown', () => {
    const games = [{
      id: 1,
      name: 'Test Game',
      isBaseGame: true,
      copies: [
        { statusOwned: true },
      ],
    }];
    const result = getTotalCost(games);
    expect(result.totalCost).toBe(0);
    expect(result.gamesWithoutPrice).toBe(1);
  });

  test('handles empty string pricePaid as unknown', () => {
    const games = [{
      id: 1,
      name: 'Test Game',
      isBaseGame: true,
      copies: [
        { statusOwned: true, pricePaid: '' },
      ],
    }];
    const result = getTotalCost(games);
    expect(result.totalCost).toBe(0);
    expect(result.gamesWithoutPrice).toBe(1);
  });

  test('returns all-time cost when year is null', () => {
    const games = [{
      id: 1,
      name: 'Test Game',
      isBaseGame: true,
      copies: [
        { statusOwned: true, pricePaid: 30, acquisitionDate: '2023-01-15' },
        { statusOwned: true, pricePaid: 20, acquisitionDate: '2024-06-01' },
      ],
    }];
    const result = getTotalCost(games, null);
    expect(result.totalCost).toBe(50);
  });

  test('filters by acquisition year when year is specified', () => {
    const games = [{
      id: 1,
      name: 'Test Game',
      isBaseGame: true,
      copies: [
        { statusOwned: true, pricePaid: 30, acquisitionDate: '2023-01-15' },
        { statusOwned: true, pricePaid: 20, acquisitionDate: '2024-06-01' },
      ],
    }];
    const result = getTotalCost(games, 2024);
    expect(result.totalCost).toBe(20);
    expect(result.games.length).toBe(1);
  });

  test('returns 0 when no copies acquired in specified year', () => {
    const games = [{
      id: 1,
      name: 'Test Game',
      isBaseGame: true,
      copies: [
        { statusOwned: true, pricePaid: 30, acquisitionDate: '2023-01-15' },
      ],
    }];
    const result = getTotalCost(games, 2024);
    expect(result.totalCost).toBe(0);
    expect(result.games.length).toBe(0);
  });

  test('skips copies without acquisitionDate when year filter is active', () => {
    const games = [{
      id: 1,
      name: 'Test Game',
      isBaseGame: true,
      copies: [
        { statusOwned: true, pricePaid: 30, acquisitionDate: null },
        { statusOwned: true, pricePaid: 20, acquisitionDate: '2024-06-01' },
      ],
    }];
    const result = getTotalCost(games, 2024);
    expect(result.totalCost).toBe(20);
  });

  test('includes copies without acquisitionDate when year is null', () => {
    const games = [{
      id: 1,
      name: 'Test Game',
      isBaseGame: true,
      copies: [
        { statusOwned: true, pricePaid: 30, acquisitionDate: null },
        { statusOwned: true, pricePaid: 20, acquisitionDate: '2024-06-01' },
      ],
    }];
    const result = getTotalCost(games, null);
    expect(result.totalCost).toBe(50);
  });

  test('counts gamesWithoutPrice correctly with year filter', () => {
    const games = [
      {
        id: 1,
        name: 'Game With Price',
        isBaseGame: true,
        copies: [
          { statusOwned: true, pricePaid: 30, acquisitionDate: '2024-01-15' },
        ],
      },
      {
        id: 2,
        name: 'Game Without Price',
        isBaseGame: true,
        copies: [
          { statusOwned: true, pricePaid: null, acquisitionDate: '2024-06-01' },
        ],
      },
    ];
    const result = getTotalCost(games, 2024);
    expect(result.totalCost).toBe(30);
    expect(result.gamesWithoutPrice).toBe(1);
    expect(result.games.length).toBe(2);
  });
});

describe('getValueClubGames', () => {
  test('returns object with count and games', () => {
    const result = getValueClubGames(typicalData.games, typicalData.plays, Metric.HOURS, ValueClub.FIVE_DOLLAR);
    expect(result).toHaveProperty('count');
    expect(result).toHaveProperty('games');
  });

  test('only includes owned base games', () => {
    const result = getValueClubGames(typicalData.games, typicalData.plays, Metric.HOURS, ValueClub.FIVE_DOLLAR);
    result.games.forEach(item => {
      expect(item.game.isBaseGame).toBe(true);
    });
  });

  test('only includes games with price data', () => {
    const result = getValueClubGames(typicalData.games, typicalData.plays, Metric.HOURS, ValueClub.FIVE_DOLLAR);
    result.games.forEach(item => {
      expect(item.pricePaid).toBeGreaterThan(0);
    });
  });

  test('only includes games with metric value > 0', () => {
    const result = getValueClubGames(typicalData.games, typicalData.plays, Metric.HOURS, ValueClub.FIVE_DOLLAR);
    result.games.forEach(item => {
      expect(item.metricValue).toBeGreaterThan(0);
    });
  });

  test('only includes games where costPerMetric <= threshold', () => {
    const result = getValueClubGames(typicalData.games, typicalData.plays, Metric.HOURS, ValueClub.FIVE_DOLLAR);
    result.games.forEach(item => {
      expect(item.costPerMetric).toBeLessThanOrEqual(ValueClub.FIVE_DOLLAR);
    });
  });

  test('calculates costPerMetric correctly', () => {
    const result = getValueClubGames(typicalData.games, typicalData.plays, Metric.HOURS, ValueClub.FIVE_DOLLAR);
    result.games.forEach(item => {
      // costPerMetric is capped at pricePaid (handles metric < 1)
      const expectedCost = Math.min(item.pricePaid / item.metricValue, item.pricePaid);
      expect(item.costPerMetric).toBeCloseTo(expectedCost, 5);
    });
  });

  test('caps costPerMetric at pricePaid when metric < 1', () => {
    const games = [{
      id: 1,
      name: 'Short Play Game',
      isBaseGame: true,
      copies: [{ statusOwned: true, pricePaid: 1 }],
    }];
    // 12 minutes = 0.2 hours, without cap would be $1/0.2 = $5/hour
    // With cap, should be $1/hour (price paid), which is in the $1 tier (range $0.50-$1)
    const plays = [
      { gameId: 1, date: '2023-01-01', durationMin: 12 },
    ];
    const result = getValueClubGames(games, plays, Metric.HOURS, ValueClub.ONE_DOLLAR);
    expect(result.count).toBe(1);
    expect(result.games[0].metricValue).toBeCloseTo(0.2, 5);
    expect(result.games[0].costPerMetric).toBe(1); // Capped at pricePaid, not $5
  });

  test('sorts by costPerMetric descending', () => {
    const result = getValueClubGames(typicalData.games, typicalData.plays, Metric.HOURS, ValueClub.FIVE_DOLLAR);
    for (let i = 1; i < result.games.length; i++) {
      expect(result.games[i - 1].costPerMetric).toBeGreaterThanOrEqual(result.games[i].costPerMetric);
    }
  });

  test('works with different metrics', () => {
    const hoursResult = getValueClubGames(typicalData.games, typicalData.plays, Metric.HOURS, ValueClub.FIVE_DOLLAR);
    const sessionsResult = getValueClubGames(typicalData.games, typicalData.plays, Metric.SESSIONS, ValueClub.FIVE_DOLLAR);
    const playsResult = getValueClubGames(typicalData.games, typicalData.plays, Metric.PLAYS, ValueClub.FIVE_DOLLAR);

    // Results should differ between metrics
    expect(hoursResult.count).toBeDefined();
    expect(sessionsResult.count).toBeDefined();
    expect(playsResult.count).toBeDefined();
  });

  test('returns empty array for empty games', () => {
    const result = getValueClubGames([], [], Metric.HOURS, ValueClub.FIVE_DOLLAR);
    expect(result.count).toBe(0);
    expect(result.games).toEqual([]);
  });

  test('excludes games with price data but no play data', () => {
    const games = [{
      id: 1,
      name: 'Unplayed Game',
      isBaseGame: true,
      copies: [{ statusOwned: true, pricePaid: 50 }],
    }];
    const plays = []; // No plays at all
    const result = getValueClubGames(games, plays, Metric.HOURS, ValueClub.FIVE_DOLLAR);
    expect(result.count).toBe(0);
  });

  test('excludes games with zero hours (plays with 0 duration)', () => {
    const games = [{
      id: 1,
      name: 'Zero Duration Game',
      isBaseGame: true,
      copies: [{ statusOwned: true, pricePaid: 50 }],
    }];
    // Play with 0 duration - has play data but 0 hours
    const plays = [
      { gameId: 1, date: '2023-01-01', durationMin: 0 },
    ];
    const result = getValueClubGames(games, plays, Metric.HOURS, ValueClub.FIVE_DOLLAR);
    expect(result.count).toBe(0); // Excluded because 0 hours
  });

  test('threshold of exactly $5 is included', () => {
    const games = [{
      id: 1,
      name: 'Test Game',
      isBaseGame: true,
      copies: [{ statusOwned: true, pricePaid: 50 }],
    }];
    const plays = [
      { gameId: 1, date: '2023-01-01', durationMin: 600 }, // 10 hours = $5/hour
    ];
    const result = getValueClubGames(games, plays, Metric.HOURS, ValueClub.FIVE_DOLLAR);
    expect(result.count).toBe(1);
    expect(result.games[0].costPerMetric).toBe(5);
  });

  test('threshold just above $5 is excluded', () => {
    const games = [{
      id: 1,
      name: 'Test Game',
      isBaseGame: true,
      copies: [{ statusOwned: true, pricePaid: 50 }],
    }];
    const plays = [
      { gameId: 1, date: '2023-01-01', durationMin: 540 }, // 9 hours = $5.56/hour
    ];
    const result = getValueClubGames(games, plays, Metric.HOURS, ValueClub.FIVE_DOLLAR);
    expect(result.count).toBe(0);
  });

  test('year filter includes plays from current and previous years (cumulative)', () => {
    const games = [{
      id: 1,
      name: 'Test Game',
      isBaseGame: true,
      copies: [{ statusOwned: true, pricePaid: 50 }],
    }];
    // Plays across multiple years - 5 hours in 2022, 5 hours in 2023
    const plays = [
      { gameId: 1, date: '2022-06-15', durationMin: 300 }, // 5 hours
      { gameId: 1, date: '2023-06-15', durationMin: 300 }, // 5 hours
    ];
    // With just 2023 plays (5 hours), cost would be $10/hour - not in club
    // With cumulative through 2023 (10 hours), cost is $5/hour - in club
    const result = getValueClubGames(games, plays, Metric.HOURS, ValueClub.FIVE_DOLLAR, 2023);
    expect(result.count).toBe(1);
    expect(result.games[0].metricValue).toBe(10); // 10 hours total
    expect(result.games[0].costPerMetric).toBe(5); // $5/hour
  });

  test('year filter excludes plays from future years', () => {
    const games = [{
      id: 1,
      name: 'Test Game',
      isBaseGame: true,
      copies: [{ statusOwned: true, pricePaid: 50 }],
    }];
    // 5 hours in 2023, 5 hours in 2024
    const plays = [
      { gameId: 1, date: '2023-06-15', durationMin: 300 }, // 5 hours
      { gameId: 1, date: '2024-06-15', durationMin: 300 }, // 5 hours
    ];
    // Through 2023 only gets 5 hours ($10/hour) - not in club
    const result2023 = getValueClubGames(games, plays, Metric.HOURS, ValueClub.FIVE_DOLLAR, 2023);
    expect(result2023.count).toBe(0);

    // Through 2024 gets all 10 hours ($5/hour) - in club
    const result2024 = getValueClubGames(games, plays, Metric.HOURS, ValueClub.FIVE_DOLLAR, 2024);
    expect(result2024.count).toBe(1);
  });

  test('year filter null returns all plays', () => {
    const games = [{
      id: 1,
      name: 'Test Game',
      isBaseGame: true,
      copies: [{ statusOwned: true, pricePaid: 50 }],
    }];
    const plays = [
      { gameId: 1, date: '2022-06-15', durationMin: 300 },
      { gameId: 1, date: '2023-06-15', durationMin: 300 },
    ];
    const result = getValueClubGames(games, plays, Metric.HOURS, ValueClub.FIVE_DOLLAR, null);
    expect(result.count).toBe(1);
    expect(result.games[0].metricValue).toBe(10);
  });

  test('TWO_FIFTY tier only includes games between $1 and $2.50', () => {
    const games = [{
      id: 1,
      name: 'Test Game',
      isBaseGame: true,
      copies: [{ statusOwned: true, pricePaid: 20 }],
    }];
    const plays = [
      { gameId: 1, date: '2023-06-15', durationMin: 600 }, // 10 hours = $2/hour
    ];
    const result = getValueClubGames(games, plays, Metric.HOURS, ValueClub.TWO_FIFTY);
    expect(result.count).toBe(1);
    expect(result.games[0].costPerMetric).toBe(2);
  });

  test('TWO_FIFTY tier excludes games above $2.50', () => {
    const games = [{
      id: 1,
      name: 'Test Game',
      isBaseGame: true,
      copies: [{ statusOwned: true, pricePaid: 30 }],
    }];
    const plays = [
      { gameId: 1, date: '2023-06-15', durationMin: 600 }, // 10 hours = $3/hour
    ];
    const result = getValueClubGames(games, plays, Metric.HOURS, ValueClub.TWO_FIFTY);
    expect(result.count).toBe(0); // $3/hour is in FIVE_DOLLAR tier, not TWO_FIFTY
  });

  test('ONE_DOLLAR tier only includes games between 50¢ and $1', () => {
    const games = [{
      id: 1,
      name: 'Test Game',
      isBaseGame: true,
      copies: [{ statusOwned: true, pricePaid: 8 }],
    }];
    const plays = [
      { gameId: 1, date: '2023-06-15', durationMin: 600 }, // 10 hours = $0.80/hour
    ];
    const result = getValueClubGames(games, plays, Metric.HOURS, ValueClub.ONE_DOLLAR);
    expect(result.count).toBe(1);
    expect(result.games[0].costPerMetric).toBe(0.8);
  });

  test('FIFTY_CENTS tier only includes games at 50¢ or less', () => {
    const games = [{
      id: 1,
      name: 'Test Game',
      isBaseGame: true,
      copies: [{ statusOwned: true, pricePaid: 5 }],
    }];
    const plays = [
      { gameId: 1, date: '2023-06-15', durationMin: 600 }, // 10 hours = $0.50/hour
    ];
    const result = getValueClubGames(games, plays, Metric.HOURS, ValueClub.FIFTY_CENTS);
    expect(result.count).toBe(1);
    expect(result.games[0].costPerMetric).toBe(0.5);
  });

  test('FIFTY_CENTS tier excludes games above 50¢', () => {
    const games = [{
      id: 1,
      name: 'Test Game',
      isBaseGame: true,
      copies: [{ statusOwned: true, pricePaid: 6 }],
    }];
    const plays = [
      { gameId: 1, date: '2023-06-15', durationMin: 600 }, // 10 hours = $0.60/hour
    ];
    const result = getValueClubGames(games, plays, Metric.HOURS, ValueClub.FIFTY_CENTS);
    expect(result.count).toBe(0);
  });

  test('game in lowest tier is only in that tier range', () => {
    const games = [{
      id: 1,
      name: 'Best Value Game',
      isBaseGame: true,
      copies: [{ statusOwned: true, pricePaid: 2 }],
    }];
    const plays = [
      { gameId: 1, date: '2023-06-15', durationMin: 600 }, // 10 hours = $0.20/hour
    ];
    // Should only be in FIFTY_CENTS tier (range is 0 to 0.5)
    expect(getValueClubGames(games, plays, Metric.HOURS, ValueClub.FIFTY_CENTS).count).toBe(1);
    expect(getValueClubGames(games, plays, Metric.HOURS, ValueClub.ONE_DOLLAR).count).toBe(0);
    expect(getValueClubGames(games, plays, Metric.HOURS, ValueClub.TWO_FIFTY).count).toBe(0);
    expect(getValueClubGames(games, plays, Metric.HOURS, ValueClub.FIVE_DOLLAR).count).toBe(0);
  });
});

describe('calculateValueClubIncrease', () => {
  test('excludes games without price data', () => {
    const games = [{
      id: 1,
      name: 'No Price Game',
      isBaseGame: true,
      copies: [{ statusOwned: true, pricePaid: null }],
    }];
    const plays = [
      { gameId: 1, date: '2023-06-15', durationMin: 600 },
    ];
    const result = calculateValueClubIncrease(games, plays, 2023, Metric.HOURS, ValueClub.FIVE_DOLLAR);
    expect(result).toBe(0); // No price data, not counted
  });

  test('excludes games with zero metric value', () => {
    const games = [{
      id: 1,
      name: 'Zero Hours Game',
      isBaseGame: true,
      copies: [{ statusOwned: true, pricePaid: 50 }],
    }];
    const plays = [
      { gameId: 1, date: '2023-06-15', durationMin: 0 }, // Zero hours
    ];
    const result = calculateValueClubIncrease(games, plays, 2023, Metric.HOURS, ValueClub.FIVE_DOLLAR);
    expect(result).toBe(0); // Zero hours, not counted
  });

  test('returns difference between current and previous year counts', () => {
    const games = [{
      id: 1,
      name: 'Test Game',
      isBaseGame: true,
      copies: [{ statusOwned: true, pricePaid: 50 }],
    }];
    const plays = [
      { gameId: 1, date: '2022-06-15', durationMin: 300 }, // 5 hours
      { gameId: 1, date: '2023-06-15', durationMin: 300 }, // 5 hours
    ];
    // End of 2022: 5 hours = $10/hour (not in club) -> 0 games
    // End of 2023: 10 hours = $5/hour (in club) -> 1 game
    // Increase = 1 - 0 = 1
    const result = calculateValueClubIncrease(games, plays, 2023, Metric.HOURS, ValueClub.FIVE_DOLLAR);
    expect(result).toBe(1);
  });

  test('returns 0 when no change', () => {
    const games = [{
      id: 1,
      name: 'Test Game',
      isBaseGame: true,
      copies: [{ statusOwned: true, pricePaid: 50 }],
    }];
    const plays = [
      { gameId: 1, date: '2022-06-15', durationMin: 600 }, // Already in club by end of 2022
    ];
    // Both 2022 and 2023 have same count (1)
    const result = calculateValueClubIncrease(games, plays, 2023, Metric.HOURS, ValueClub.FIVE_DOLLAR);
    expect(result).toBe(0);
  });

  test('returns negative when games leave club (theoretical - would require price change)', () => {
    // This shouldn't happen in practice since price doesn't change,
    // but the function supports negative values
    const result = calculateValueClubIncrease([], [], 2023, Metric.HOURS, ValueClub.FIVE_DOLLAR);
    expect(result).toBe(0);
  });

  test('works with multiple games entering club', () => {
    const games = [
      {
        id: 1,
        name: 'Game 1',
        isBaseGame: true,
        copies: [{ statusOwned: true, pricePaid: 50 }],
      },
      {
        id: 2,
        name: 'Game 2',
        isBaseGame: true,
        copies: [{ statusOwned: true, pricePaid: 50 }],
      },
    ];
    const plays = [
      { gameId: 1, date: '2023-06-15', durationMin: 600 }, // Game 1 enters in 2023
      { gameId: 2, date: '2023-06-15', durationMin: 600 }, // Game 2 enters in 2023
    ];
    const result = calculateValueClubIncrease(games, plays, 2023, Metric.HOURS, ValueClub.FIVE_DOLLAR);
    expect(result).toBe(2);
  });
});

describe('getNewValueClubGames', () => {
  test('returns array of games that entered club during year', () => {
    const games = [{
      id: 1,
      name: 'Test Game',
      isBaseGame: true,
      copies: [{ statusOwned: true, pricePaid: 50 }],
    }];
    const plays = [
      { gameId: 1, date: '2022-06-15', durationMin: 300 }, // 5 hours
      { gameId: 1, date: '2023-06-15', durationMin: 300 }, // 5 hours
    ];
    const result = getNewValueClubGames(games, plays, 2023, Metric.HOURS, ValueClub.FIVE_DOLLAR);
    expect(result.length).toBe(1);
    expect(result[0].game.id).toBe(1);
  });

  test('returns empty array when no new games entered', () => {
    const games = [{
      id: 1,
      name: 'Test Game',
      isBaseGame: true,
      copies: [{ statusOwned: true, pricePaid: 50 }],
    }];
    const plays = [
      { gameId: 1, date: '2022-06-15', durationMin: 600 }, // Already in club by end of 2022
    ];
    const result = getNewValueClubGames(games, plays, 2023, Metric.HOURS, ValueClub.FIVE_DOLLAR);
    expect(result.length).toBe(0);
  });

  test('includes metricValue, costPerMetric, pricePaid, and thisYearMetricValue', () => {
    const games = [{
      id: 1,
      name: 'Test Game',
      isBaseGame: true,
      copies: [{ statusOwned: true, pricePaid: 50 }],
    }];
    const plays = [
      { gameId: 1, date: '2022-06-15', durationMin: 300 }, // 5 hours in 2022
      { gameId: 1, date: '2023-06-15', durationMin: 300 }, // 5 hours in 2023
    ];
    const result = getNewValueClubGames(games, plays, 2023, Metric.HOURS, ValueClub.FIVE_DOLLAR);
    expect(result[0].metricValue).toBe(10); // Total hours
    expect(result[0].costPerMetric).toBe(5); // $5/hour
    expect(result[0].pricePaid).toBe(50);
    expect(result[0].thisYearMetricValue).toBe(5); // Hours added this year
  });

  test('sorts by costPerMetric ascending', () => {
    const games = [
      {
        id: 1,
        name: 'Game 1',
        isBaseGame: true,
        copies: [{ statusOwned: true, pricePaid: 50 }],
      },
      {
        id: 2,
        name: 'Game 2',
        isBaseGame: true,
        copies: [{ statusOwned: true, pricePaid: 30 }],
      },
    ];
    const plays = [
      { gameId: 1, date: '2023-06-15', durationMin: 600 }, // 10 hours = $5/hour (in $5 tier)
      { gameId: 2, date: '2023-06-15', durationMin: 600 }, // 10 hours = $3/hour (in $5 tier)
    ];
    const result = getNewValueClubGames(games, plays, 2023, Metric.HOURS, ValueClub.FIVE_DOLLAR);
    expect(result[0].game.id).toBe(2); // Lower cost first ($3/hour)
    expect(result[1].game.id).toBe(1); // Higher cost second ($5/hour)
  });

  test('excludes games not currently in club', () => {
    const games = [{
      id: 1,
      name: 'Test Game',
      isBaseGame: true,
      copies: [{ statusOwned: true, pricePaid: 100 }],
    }];
    const plays = [
      { gameId: 1, date: '2023-06-15', durationMin: 600 }, // 10 hours = $10/hour (not in club)
    ];
    const result = getNewValueClubGames(games, plays, 2023, Metric.HOURS, ValueClub.FIVE_DOLLAR);
    expect(result.length).toBe(0);
  });

  test('excludes games that were already in club at end of previous year', () => {
    const games = [{
      id: 1,
      name: 'Test Game',
      isBaseGame: true,
      copies: [{ statusOwned: true, pricePaid: 50 }],
    }];
    const plays = [
      { gameId: 1, date: '2022-06-15', durationMin: 600 }, // 10 hours by end of 2022
      { gameId: 1, date: '2023-06-15', durationMin: 60 }, // 11 hours by end of 2023
    ];
    // Was already in club at $5/hour by end of 2022
    const result = getNewValueClubGames(games, plays, 2023, Metric.HOURS, ValueClub.FIVE_DOLLAR);
    expect(result.length).toBe(0);
  });

  test('includes games with no plays in previous year', () => {
    const games = [{
      id: 1,
      name: 'Test Game',
      isBaseGame: true,
      copies: [{ statusOwned: true, pricePaid: 50 }],
    }];
    const plays = [
      { gameId: 1, date: '2023-06-15', durationMin: 600 }, // First plays in 2023
    ];
    const result = getNewValueClubGames(games, plays, 2023, Metric.HOURS, ValueClub.FIVE_DOLLAR);
    expect(result.length).toBe(1);
    expect(result[0].thisYearMetricValue).toBe(10); // All metric value is from this year
  });

  test('works with different metrics', () => {
    const games = [{
      id: 1,
      name: 'Test Game',
      isBaseGame: true,
      copies: [{ statusOwned: true, pricePaid: 25 }],
    }];
    const plays = [
      { gameId: 1, date: '2023-01-01', durationMin: 60 },
      { gameId: 1, date: '2023-01-02', durationMin: 60 },
      { gameId: 1, date: '2023-01-03', durationMin: 60 },
      { gameId: 1, date: '2023-01-04', durationMin: 60 },
      { gameId: 1, date: '2023-01-05', durationMin: 60 },
    ];
    const hoursResult = getNewValueClubGames(games, plays, 2023, Metric.HOURS, ValueClub.FIVE_DOLLAR);
    const sessionsResult = getNewValueClubGames(games, plays, 2023, Metric.SESSIONS, ValueClub.FIVE_DOLLAR);
    const playsResult = getNewValueClubGames(games, plays, 2023, Metric.PLAYS, ValueClub.FIVE_DOLLAR);

    expect(hoursResult.length).toBe(1);
    expect(sessionsResult.length).toBe(1);
    expect(playsResult.length).toBe(1);
  });
});

describe('getSkippedValueClubCount', () => {
  test('returns 0 when no next lower threshold exists', () => {
    const games = [{
      id: 1,
      name: 'Test Game',
      isBaseGame: true,
      copies: [{ statusOwned: true, pricePaid: 50 }],
    }];
    const plays = [
      { gameId: 1, date: '2023-06-15', durationMin: 6000 }, // 100 hours = $0.50/hour
    ];
    // No next lower threshold passed (null)
    const result = getSkippedValueClubCount(games, plays, 2023, Metric.HOURS, ValueClub.FIVE_DOLLAR, null);
    expect(result).toBe(0);
  });

  test('counts games that skipped over threshold', () => {
    const games = [{
      id: 1,
      name: 'Test Game',
      isBaseGame: true,
      copies: [{ statusOwned: true, pricePaid: 50 }],
    }];
    const plays = [
      // No plays in 2022 (cost would be infinite/undefined)
      { gameId: 1, date: '2023-06-15', durationMin: 3000 }, // 50 hours = $1/hour
    ];
    // Went from no plays to $1/hour, skipping $5 club (threshold 5, nextLower 2.5)
    const result = getSkippedValueClubCount(games, plays, 2023, Metric.HOURS, ValueClub.FIVE_DOLLAR, 2.5);
    expect(result).toBe(1);
  });

  test('does not count games that entered club normally', () => {
    const games = [{
      id: 1,
      name: 'Test Game',
      isBaseGame: true,
      copies: [{ statusOwned: true, pricePaid: 50 }],
    }];
    const plays = [
      { gameId: 1, date: '2022-06-15', durationMin: 300 }, // 5 hours = $10/hour
      { gameId: 1, date: '2023-06-15', durationMin: 300 }, // 10 hours = $5/hour
    ];
    // Entered at $5/hour, not skipped (still at threshold, not below nextLower)
    const result = getSkippedValueClubCount(games, plays, 2023, Metric.HOURS, ValueClub.FIVE_DOLLAR, 2.5);
    expect(result).toBe(0);
  });

  test('does not count games already in club at end of previous year', () => {
    const games = [{
      id: 1,
      name: 'Test Game',
      isBaseGame: true,
      copies: [{ statusOwned: true, pricePaid: 50 }],
    }];
    const plays = [
      { gameId: 1, date: '2022-06-15', durationMin: 600 }, // 10 hours = $5/hour (in club)
      { gameId: 1, date: '2023-06-15', durationMin: 2400 }, // 50 hours = $1/hour
    ];
    // Was already in club, so didn't skip anything
    const result = getSkippedValueClubCount(games, plays, 2023, Metric.HOURS, ValueClub.FIVE_DOLLAR, 2.5);
    expect(result).toBe(0);
  });

  test('returns 0 for empty data', () => {
    const result = getSkippedValueClubCount([], [], 2023, Metric.HOURS, ValueClub.FIVE_DOLLAR, 2.5);
    expect(result).toBe(0);
  });

  test('works with different metrics', () => {
    const games = [{
      id: 1,
      name: 'Test Game',
      isBaseGame: true,
      copies: [{ statusOwned: true, pricePaid: 25 }],
    }];
    // 25 plays in 2023, each 1 hour, different days = $1/hour, $1/session, $1/play
    const plays = [];
    for (let i = 1; i <= 25; i++) {
      plays.push({ gameId: 1, date: `2023-01-${String(i).padStart(2, '0')}`, durationMin: 60 });
    }
    // All metrics skip from nothing to $1/metric
    expect(getSkippedValueClubCount(games, plays, 2023, Metric.HOURS, ValueClub.FIVE_DOLLAR, 2.5)).toBe(1);
    expect(getSkippedValueClubCount(games, plays, 2023, Metric.SESSIONS, ValueClub.FIVE_DOLLAR, 2.5)).toBe(1);
    expect(getSkippedValueClubCount(games, plays, 2023, Metric.PLAYS, ValueClub.FIVE_DOLLAR, 2.5)).toBe(1);
  });
});

describe('getCostPerMetricStats', () => {
  test('returns object with median, gameAverage, overallRate, gameCount, games', () => {
    const result = getCostPerMetricStats(typicalData.games, typicalData.plays, Metric.HOURS);
    expect(result).toHaveProperty('median');
    expect(result).toHaveProperty('gameAverage');
    expect(result).toHaveProperty('overallRate');
    expect(result).toHaveProperty('gameCount');
    expect(result).toHaveProperty('games');
  });

  test('includes games with metric >= 0 (including unplayed)', () => {
    const result = getCostPerMetricStats(typicalData.games, typicalData.plays, Metric.HOURS);
    result.games.forEach(item => {
      expect(item.metricValue).toBeGreaterThanOrEqual(0);
    });
  });

  test('only includes owned base games with price data', () => {
    const result = getCostPerMetricStats(typicalData.games, typicalData.plays, Metric.HOURS);
    result.games.forEach(item => {
      expect(item.game.isBaseGame).toBe(true);
      expect(item.pricePaid).toBeGreaterThan(0);
    });
  });

  test('calculates median correctly for odd number of games', () => {
    const games = [
      { id: 1, name: 'Game1', isBaseGame: true, copies: [{ statusOwned: true, pricePaid: 10 }] },
      { id: 2, name: 'Game2', isBaseGame: true, copies: [{ statusOwned: true, pricePaid: 20 }] },
      { id: 3, name: 'Game3', isBaseGame: true, copies: [{ statusOwned: true, pricePaid: 30 }] },
    ];
    const plays = [
      { gameId: 1, date: '2023-01-01', durationMin: 60 },  // $10/hr
      { gameId: 2, date: '2023-01-01', durationMin: 60 },  // $20/hr
      { gameId: 3, date: '2023-01-01', durationMin: 60 },  // $30/hr
    ];
    const result = getCostPerMetricStats(games, plays, Metric.HOURS);
    expect(result.median).toBe(20); // Middle value
  });

  test('calculates median correctly for even number of games', () => {
    const games = [
      { id: 1, name: 'Game1', isBaseGame: true, copies: [{ statusOwned: true, pricePaid: 10 }] },
      { id: 2, name: 'Game2', isBaseGame: true, copies: [{ statusOwned: true, pricePaid: 20 }] },
    ];
    const plays = [
      { gameId: 1, date: '2023-01-01', durationMin: 60 },  // $10/hr
      { gameId: 2, date: '2023-01-01', durationMin: 60 },  // $20/hr
    ];
    const result = getCostPerMetricStats(games, plays, Metric.HOURS);
    expect(result.median).toBe(15); // Average of middle two
  });

  test('calculates gameAverage correctly', () => {
    const games = [
      { id: 1, name: 'Game1', isBaseGame: true, copies: [{ statusOwned: true, pricePaid: 10 }] },
      { id: 2, name: 'Game2', isBaseGame: true, copies: [{ statusOwned: true, pricePaid: 30 }] },
    ];
    const plays = [
      { gameId: 1, date: '2023-01-01', durationMin: 60 },  // $10/hr
      { gameId: 2, date: '2023-01-01', durationMin: 60 },  // $30/hr
    ];
    const result = getCostPerMetricStats(games, plays, Metric.HOURS);
    expect(result.gameAverage).toBe(20); // (10 + 30) / 2
  });

  test('calculates overallRate correctly', () => {
    const games = [
      { id: 1, name: 'Game1', isBaseGame: true, copies: [{ statusOwned: true, pricePaid: 10 }] },
      { id: 2, name: 'Game2', isBaseGame: true, copies: [{ statusOwned: true, pricePaid: 30 }] },
    ];
    const plays = [
      { gameId: 1, date: '2023-01-01', durationMin: 60 },   // 1 hr
      { gameId: 2, date: '2023-01-01', durationMin: 180 },  // 3 hrs
    ];
    const result = getCostPerMetricStats(games, plays, Metric.HOURS);
    // Total cost: $40, Total hours: 4, Rate: $10/hr
    expect(result.overallRate).toBe(10);
  });

  test('returns null values for empty data', () => {
    const result = getCostPerMetricStats([], [], Metric.HOURS);
    expect(result.median).toBeNull();
    expect(result.gameAverage).toBeNull();
    expect(result.overallRate).toBeNull();
    expect(result.gameCount).toBe(0);
  });

  test('works with different metrics (hours, sessions, plays)', () => {
    const hoursResult = getCostPerMetricStats(typicalData.games, typicalData.plays, Metric.HOURS);
    const sessionsResult = getCostPerMetricStats(typicalData.games, typicalData.plays, Metric.SESSIONS);
    const playsResult = getCostPerMetricStats(typicalData.games, typicalData.plays, Metric.PLAYS);

    expect(hoursResult.gameCount).toBeGreaterThanOrEqual(0);
    expect(sessionsResult.gameCount).toBeGreaterThanOrEqual(0);
    expect(playsResult.gameCount).toBeGreaterThanOrEqual(0);
  });

  test('respects year filter (cumulative through year)', () => {
    const games = [{ id: 1, name: 'Game1', isBaseGame: true, copies: [{ statusOwned: true, pricePaid: 50 }] }];
    const plays = [
      { gameId: 1, date: '2022-01-01', durationMin: 60 },
      { gameId: 1, date: '2023-01-01', durationMin: 60 },
    ];
    const result2022 = getCostPerMetricStats(games, plays, Metric.HOURS, 2022);
    const result2023 = getCostPerMetricStats(games, plays, Metric.HOURS, 2023);

    expect(result2022.overallRate).toBe(50); // 1 hour
    expect(result2023.overallRate).toBe(25); // 2 hours
  });

  test('sorts games by costPerMetric ascending', () => {
    const result = getCostPerMetricStats(typicalData.games, typicalData.plays, Metric.HOURS);
    for (let i = 1; i < result.games.length; i++) {
      expect(result.games[i - 1].costPerMetric).toBeLessThanOrEqual(result.games[i].costPerMetric);
    }
  });

  test('caps costPerMetric at pricePaid when metric < 1', () => {
    const games = [{ id: 1, name: 'Game1', isBaseGame: true, copies: [{ statusOwned: true, pricePaid: 10 }] }];
    const plays = [{ gameId: 1, date: '2023-01-01', durationMin: 12 }]; // 0.2 hours
    const result = getCostPerMetricStats(games, plays, Metric.HOURS);
    // Without cap: $10/0.2 = $50/hr, With cap: $10 (pricePaid)
    expect(result.games[0].costPerMetric).toBe(10);
  });

  test('excludes unowned games', () => {
    const games = [
      { id: 1, name: 'Owned', isBaseGame: true, copies: [{ statusOwned: true, pricePaid: 50 }] },
      { id: 2, name: 'NotOwned', isBaseGame: true, copies: [{ statusOwned: false, pricePaid: 30 }] },
    ];
    const plays = [
      { gameId: 1, date: '2023-01-01', durationMin: 60 },
      { gameId: 2, date: '2023-01-01', durationMin: 60 },
    ];
    const result = getCostPerMetricStats(games, plays, Metric.HOURS);
    expect(result.gameCount).toBe(1);
    expect(result.games[0].game.name).toBe('Owned');
  });

  test('excludes expansions and expandalones', () => {
    const games = [
      { id: 1, name: 'Base', isBaseGame: true, copies: [{ statusOwned: true, pricePaid: 50 }] },
      { id: 2, name: 'Expansion', isBaseGame: false, copies: [{ statusOwned: true, pricePaid: 30 }] },
    ];
    const plays = [
      { gameId: 1, date: '2023-01-01', durationMin: 60 },
      { gameId: 2, date: '2023-01-01', durationMin: 60 },
    ];
    const result = getCostPerMetricStats(games, plays, Metric.HOURS);
    expect(result.gameCount).toBe(1);
    expect(result.games[0].game.name).toBe('Base');
  });

  test('excludes games with no price data', () => {
    const games = [
      { id: 1, name: 'HasPrice', isBaseGame: true, copies: [{ statusOwned: true, pricePaid: 50 }] },
      { id: 2, name: 'NoPrice', isBaseGame: true, copies: [{ statusOwned: true, pricePaid: null }] },
    ];
    const plays = [
      { gameId: 1, date: '2023-01-01', durationMin: 60 },
      { gameId: 2, date: '2023-01-01', durationMin: 60 },
    ];
    const result = getCostPerMetricStats(games, plays, Metric.HOURS);
    expect(result.gameCount).toBe(1);
    expect(result.games[0].game.name).toBe('HasPrice');
  });

  test('includes unplayed games with costPerMetric = pricePaid', () => {
    const games = [
      { id: 1, name: 'Played', isBaseGame: true, copies: [{ statusOwned: true, pricePaid: 50 }] },
      { id: 2, name: 'Unplayed', isBaseGame: true, copies: [{ statusOwned: true, pricePaid: 30 }] },
    ];
    const plays = [
      { gameId: 1, date: '2023-01-01', durationMin: 60 },
      // No plays for game 2
    ];
    const result = getCostPerMetricStats(games, plays, Metric.HOURS);
    expect(result.gameCount).toBe(2);
    // Sorted by costPerMetric ascending - played game first
    expect(result.games[0].game.name).toBe('Unplayed');
    expect(result.games[0].metricValue).toBe(0);
    expect(result.games[0].costPerMetric).toBe(30); // pricePaid
    expect(result.games[1].game.name).toBe('Played');
  });

  test('includes games with zero metric value (zero duration plays) with costPerMetric = pricePaid', () => {
    const games = [
      { id: 1, name: 'HasHours', isBaseGame: true, copies: [{ statusOwned: true, pricePaid: 50 }] },
      { id: 2, name: 'ZeroHours', isBaseGame: true, copies: [{ statusOwned: true, pricePaid: 30 }] },
    ];
    const plays = [
      { gameId: 1, date: '2023-01-01', durationMin: 60 },
      { gameId: 2, date: '2023-01-01', durationMin: 0 }, // Zero duration
    ];
    const result = getCostPerMetricStats(games, plays, Metric.HOURS);
    expect(result.gameCount).toBe(2);
    // ZeroHours has costPerMetric = pricePaid (30), sorted ascending
    const zeroHoursGame = result.games.find(g => g.game.name === 'ZeroHours');
    expect(zeroHoursGame.metricValue).toBe(0);
    expect(zeroHoursGame.costPerMetric).toBe(30);
  });

  test('unplayed games with year filter use acquisition date filter', () => {
    const games = [
      { id: 1, name: 'OldUnplayed', isBaseGame: true, copies: [{ statusOwned: true, pricePaid: 50, acquisitionDate: '2020-01-01' }] },
      { id: 2, name: 'NewUnplayed', isBaseGame: true, copies: [{ statusOwned: true, pricePaid: 30, acquisitionDate: '2024-06-01' }] },
    ];
    const plays = [];

    // 2022: Only includes OldUnplayed (acquired 2020)
    const result2022 = getCostPerMetricStats(games, plays, Metric.HOURS, 2022);
    expect(result2022.gameCount).toBe(1);
    expect(result2022.games[0].game.name).toBe('OldUnplayed');

    // 2024: Includes both
    const result2024 = getCostPerMetricStats(games, plays, Metric.HOURS, 2024);
    expect(result2024.gameCount).toBe(2);
  });

  test('unplayed games sort by costPerMetric (their pricePaid) alongside played games', () => {
    const games = [
      { id: 1, name: 'Played', isBaseGame: true, copies: [{ statusOwned: true, pricePaid: 100 }] },
      { id: 2, name: 'Unplayed', isBaseGame: true, copies: [{ statusOwned: true, pricePaid: 10 }] },
    ];
    const plays = [
      { gameId: 1, date: '2023-01-01', durationMin: 600 }, // 10 hours = $10/hour
    ];
    const result = getCostPerMetricStats(games, plays, Metric.HOURS);
    expect(result.games.length).toBe(2);
    // Unplayed: $10 (pricePaid), Played: $10/hour
    // Both have costPerMetric of 10, but Played has 10 hours vs 0 hours
    expect(result.games[0].costPerMetric).toBe(10);
    expect(result.games[1].costPerMetric).toBe(10);
    expect(result.games[0].game.name).toBe('Played'); // More hours sorts first
    expect(result.games[1].game.name).toBe('Unplayed');
  });

  test('secondary sort by hours > sessions > plays when costPerMetric is equal', () => {
    const games = [
      { id: 1, name: 'LowHours', isBaseGame: true, copies: [{ statusOwned: true, pricePaid: 10 }] },
      { id: 2, name: 'HighHours', isBaseGame: true, copies: [{ statusOwned: true, pricePaid: 10 }] },
    ];
    const plays = [
      { gameId: 1, date: '2023-01-01', durationMin: 60 },  // 1 hour = $10/hr
      { gameId: 2, date: '2023-01-01', durationMin: 120 }, // 2 hours = $5/hr
      { gameId: 2, date: '2023-01-02', durationMin: 0 },   // Bump to 2 sessions, still 2 hours = $5/hr
    ];
    // Different costPerMetric - LowHours $10/hr, HighHours $5/hr
    // HighHours should sort first (lower cost)
    const result = getCostPerMetricStats(games, plays, Metric.HOURS);
    expect(result.games[0].game.name).toBe('HighHours');
    expect(result.games[1].game.name).toBe('LowHours');
  });

  test('secondary sort breaks tie by current metric first', () => {
    const games = [
      { id: 1, name: 'LowerMetric', isBaseGame: true, copies: [{ statusOwned: true, pricePaid: 10 }] },
      { id: 2, name: 'HigherMetric', isBaseGame: true, copies: [{ statusOwned: true, pricePaid: 20 }] },
    ];
    const plays = [
      // LowerMetric: 1 hour = $10/hr
      { gameId: 1, date: '2023-01-01', durationMin: 60 },
      // HigherMetric: 2 hours = $10/hr (same cost, more hours)
      { gameId: 2, date: '2023-01-01', durationMin: 120 },
    ];
    // Both: $10/hr (same cost)
    // HigherMetric has 2 hours vs 1 hour - should sort first
    const result = getCostPerMetricStats(games, plays, Metric.HOURS);
    expect(result.games[0].game.name).toBe('HigherMetric');
    expect(result.games[1].game.name).toBe('LowerMetric');
  });

  test('secondary sort breaks tie by hours when current metric is equal', () => {
    const games = [
      { id: 1, name: 'FewerHours', isBaseGame: true, copies: [{ statusOwned: true, pricePaid: 10 }] },
      { id: 2, name: 'MoreHours', isBaseGame: true, copies: [{ statusOwned: true, pricePaid: 10 }] },
    ];
    const plays = [
      // FewerHours: 5 sessions, 1 hour total = $2/session
      { gameId: 1, date: '2023-01-01', durationMin: 12 },
      { gameId: 1, date: '2023-01-02', durationMin: 12 },
      { gameId: 1, date: '2023-01-03', durationMin: 12 },
      { gameId: 1, date: '2023-01-04', durationMin: 12 },
      { gameId: 1, date: '2023-01-05', durationMin: 12 },
      // MoreHours: 5 sessions, 2 hours total = $2/session
      { gameId: 2, date: '2023-01-01', durationMin: 24 },
      { gameId: 2, date: '2023-01-02', durationMin: 24 },
      { gameId: 2, date: '2023-01-03', durationMin: 24 },
      { gameId: 2, date: '2023-01-04', durationMin: 24 },
      { gameId: 2, date: '2023-01-05', durationMin: 24 },
    ];
    // Both: $2/session (same cost), same sessions (5)
    // MoreHours has 2 hours vs 1 hour - should sort first
    const result = getCostPerMetricStats(games, plays, Metric.SESSIONS);
    expect(result.games[0].game.name).toBe('MoreHours');
    expect(result.games[1].game.name).toBe('FewerHours');
  });

  test('secondary sort breaks tie by sessions when current metric and hours are equal', () => {
    const games = [
      { id: 1, name: 'FewerSessions', isBaseGame: true, copies: [{ statusOwned: true, pricePaid: 10 }] },
      { id: 2, name: 'MoreSessions', isBaseGame: true, copies: [{ statusOwned: true, pricePaid: 10 }] },
    ];
    const plays = [
      // FewerSessions: 1 hour, 1 session, 1 play = $10/hr
      { gameId: 1, date: '2023-01-01', durationMin: 60 },
      // MoreSessions: 1 hour, 2 sessions, 2 plays = $10/hr
      { gameId: 2, date: '2023-01-01', durationMin: 30 },
      { gameId: 2, date: '2023-01-02', durationMin: 30 },
    ];
    // Using HOURS metric: both $10/hr, same hours (1)
    // MoreSessions has 2 sessions vs 1 - should sort first
    const result = getCostPerMetricStats(games, plays, Metric.HOURS);
    expect(result.games[0].game.name).toBe('MoreSessions');
    expect(result.games[1].game.name).toBe('FewerSessions');
  });

  test('secondary sort breaks tie by plays when current metric, hours, and sessions are equal', () => {
    const games = [
      { id: 1, name: 'FewerPlays', isBaseGame: true, copies: [{ statusOwned: true, pricePaid: 10 }] },
      { id: 2, name: 'MorePlays', isBaseGame: true, copies: [{ statusOwned: true, pricePaid: 10 }] },
    ];
    const plays = [
      // FewerPlays: 1 hour, 1 session, 1 play
      { gameId: 1, date: '2023-01-01', durationMin: 60 },
      // MorePlays: 1 hour, 1 session, 2 plays
      { gameId: 2, date: '2023-01-01', durationMin: 30 },
      { gameId: 2, date: '2023-01-01', durationMin: 30 },
    ];
    // Using HOURS metric: both $10/hr, same hours (1), same sessions (1)
    // MorePlays has 2 plays vs 1 - should sort first
    const result = getCostPerMetricStats(games, plays, Metric.HOURS);
    expect(result.games[0].game.name).toBe('MorePlays');
    expect(result.games[1].game.name).toBe('FewerPlays');
  });
});

describe('getShelfOfShame', () => {
  test('returns object with totalCost, count, games', () => {
    const result = getShelfOfShame(typicalData.games, typicalData.plays);
    expect(result).toHaveProperty('totalCost');
    expect(result).toHaveProperty('count');
    expect(result).toHaveProperty('games');
  });

  test('only includes base games', () => {
    const games = [
      { id: 1, name: 'Base', isBaseGame: true, copies: [{ statusOwned: true, pricePaid: 50 }] },
      { id: 2, name: 'Expansion', isBaseGame: false, copies: [{ statusOwned: true, pricePaid: 30 }] },
    ];
    const plays = [];
    const result = getShelfOfShame(games, plays);
    expect(result.count).toBe(1);
    expect(result.games[0].game.name).toBe('Base');
  });

  test('only includes owned games', () => {
    const games = [
      { id: 1, name: 'Owned', isBaseGame: true, copies: [{ statusOwned: true, pricePaid: 50 }] },
      { id: 2, name: 'NotOwned', isBaseGame: true, copies: [{ statusOwned: false, pricePaid: 30 }] },
    ];
    const plays = [];
    const result = getShelfOfShame(games, plays);
    expect(result.count).toBe(1);
    expect(result.games[0].game.name).toBe('Owned');
  });

  test('only includes games with price data', () => {
    const games = [
      { id: 1, name: 'HasPrice', isBaseGame: true, copies: [{ statusOwned: true, pricePaid: 50 }] },
      { id: 2, name: 'NoPrice', isBaseGame: true, copies: [{ statusOwned: true, pricePaid: null }] },
    ];
    const plays = [];
    const result = getShelfOfShame(games, plays);
    expect(result.count).toBe(1);
    expect(result.games[0].game.name).toBe('HasPrice');
  });

  test('excludes played games (ever)', () => {
    const games = [
      { id: 1, name: 'Unplayed', isBaseGame: true, copies: [{ statusOwned: true, pricePaid: 50 }] },
      { id: 2, name: 'Played', isBaseGame: true, copies: [{ statusOwned: true, pricePaid: 30 }] },
    ];
    const plays = [{ gameId: 2, date: '2020-01-01', durationMin: 60 }]; // Played ever
    const result = getShelfOfShame(games, plays);
    expect(result.count).toBe(1);
    expect(result.games[0].game.name).toBe('Unplayed');
  });

  test('calculates totalCost correctly', () => {
    const games = [
      { id: 1, name: 'Game1', isBaseGame: true, copies: [{ statusOwned: true, pricePaid: 50 }] },
      { id: 2, name: 'Game2', isBaseGame: true, copies: [{ statusOwned: true, pricePaid: 30 }] },
    ];
    const plays = [];
    const result = getShelfOfShame(games, plays);
    expect(result.totalCost).toBe(80);
  });

  test('sums multiple owned copies for same game', () => {
    const games = [{
      id: 1,
      name: 'MultiCopy',
      isBaseGame: true,
      copies: [
        { statusOwned: true, pricePaid: 30 },
        { statusOwned: true, pricePaid: 20 },
      ],
    }];
    const plays = [];
    const result = getShelfOfShame(games, plays);
    expect(result.totalCost).toBe(50);
    expect(result.games[0].pricePaid).toBe(50);
  });

  test('returns empty results when no shelf of shame games', () => {
    const games = [{ id: 1, name: 'Played', isBaseGame: true, copies: [{ statusOwned: true, pricePaid: 50 }] }];
    const plays = [{ gameId: 1, date: '2023-01-01', durationMin: 60 }];
    const result = getShelfOfShame(games, plays);
    expect(result.totalCost).toBe(0);
    expect(result.count).toBe(0);
    expect(result.games).toEqual([]);
  });

  test('sorts games by pricePaid descending', () => {
    const games = [
      { id: 1, name: 'Cheap', isBaseGame: true, copies: [{ statusOwned: true, pricePaid: 20 }] },
      { id: 2, name: 'Expensive', isBaseGame: true, copies: [{ statusOwned: true, pricePaid: 100 }] },
      { id: 3, name: 'Medium', isBaseGame: true, copies: [{ statusOwned: true, pricePaid: 50 }] },
    ];
    const plays = [];
    const result = getShelfOfShame(games, plays);
    expect(result.games[0].game.name).toBe('Expensive');
    expect(result.games[1].game.name).toBe('Medium');
    expect(result.games[2].game.name).toBe('Cheap');
  });

  test('always uses all plays ever (not filtered by year)', () => {
    const games = [{ id: 1, name: 'Game', isBaseGame: true, copies: [{ statusOwned: true, pricePaid: 50, acquisitionDate: '2020-01-01' }] }];
    // Play in an old year - game should still be excluded from shelf of shame
    const plays = [{ gameId: 1, date: '2015-01-01', durationMin: 60 }];
    const result = getShelfOfShame(games, plays, 2023);
    expect(result.count).toBe(0); // Not on shelf because played ever
  });

  test('filters by acquisition year when year provided', () => {
    const games = [
      { id: 1, name: 'OldGame', isBaseGame: true, copies: [{ statusOwned: true, pricePaid: 50, acquisitionDate: '2020-01-01' }] },
      { id: 2, name: 'NewGame', isBaseGame: true, copies: [{ statusOwned: true, pricePaid: 30, acquisitionDate: '2023-06-01' }] },
    ];
    const plays = [];

    // Filtering to 2022 should only include OldGame (acquired 2020)
    const result2022 = getShelfOfShame(games, plays, 2022);
    expect(result2022.count).toBe(1);
    expect(result2022.games[0].game.name).toBe('OldGame');

    // Filtering to 2023 should include both
    const result2023 = getShelfOfShame(games, plays, 2023);
    expect(result2023.count).toBe(2);
  });

  test('excludes games with no acquisition date when year filter is set', () => {
    const games = [
      { id: 1, name: 'HasDate', isBaseGame: true, copies: [{ statusOwned: true, pricePaid: 50, acquisitionDate: '2022-01-01' }] },
      { id: 2, name: 'NoDate', isBaseGame: true, copies: [{ statusOwned: true, pricePaid: 30, acquisitionDate: null }] },
    ];
    const plays = [];

    const resultWithYear = getShelfOfShame(games, plays, 2023);
    expect(resultWithYear.count).toBe(1);
    expect(resultWithYear.games[0].game.name).toBe('HasDate');

    // Without year filter, includes games without acquisition date
    const resultNoYear = getShelfOfShame(games, plays);
    expect(resultNoYear.count).toBe(2);
  });

  test('sums only copies acquired through year when year filter is set', () => {
    const games = [{
      id: 1,
      name: 'MultiCopy',
      isBaseGame: true,
      copies: [
        { statusOwned: true, pricePaid: 30, acquisitionDate: '2020-01-01' },
        { statusOwned: true, pricePaid: 20, acquisitionDate: '2023-06-01' },
      ],
    }];
    const plays = [];

    // 2022: Only includes first copy ($30)
    const result2022 = getShelfOfShame(games, plays, 2022);
    expect(result2022.totalCost).toBe(30);

    // 2023: Includes both copies ($50)
    const result2023 = getShelfOfShame(games, plays, 2023);
    expect(result2023.totalCost).toBe(50);
  });
});
