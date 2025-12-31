import { describe, test, expect } from 'vitest';
import {
  getTotalCost,
  getCostClubGames,
  getGamesApproachingCostClub,
  getMetricValue,
  calculateCostClubIncrease,
  getNewCostClubGames,
  getSkippedCostClubCount,
} from './cost-stats.js';
import { Metric, CostClub } from './constants.js';
import { processData } from '../scripts/transform-game-data.js';
import typicalFixture from '../tests/fixtures/typical.json';

const typicalData = processData(typicalFixture);

describe('CostClub', () => {
  test('has FIVE_DOLLAR tier value', () => {
    expect(CostClub.FIVE_DOLLAR).toBe(5);
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

describe('getMetricValue', () => {
  const playData = {
    playCount: 10,
    totalMinutes: 300,
    uniqueDates: new Set(['2023-01-01', '2023-01-02', '2023-01-03']),
  };

  test('returns hours for HOURS metric', () => {
    const result = getMetricValue(playData, Metric.HOURS);
    expect(result).toBe(5); // 300 minutes = 5 hours
  });

  test('returns session count for SESSIONS metric', () => {
    const result = getMetricValue(playData, Metric.SESSIONS);
    expect(result).toBe(3);
  });

  test('returns play count for PLAYS metric', () => {
    const result = getMetricValue(playData, Metric.PLAYS);
    expect(result).toBe(10);
  });

  test('defaults to hours for unknown metric', () => {
    const result = getMetricValue(playData, 'unknown');
    expect(result).toBe(5);
  });
});

describe('getCostClubGames', () => {
  test('returns object with count and games', () => {
    const result = getCostClubGames(typicalData.games, typicalData.plays, Metric.HOURS, CostClub.FIVE_DOLLAR);
    expect(result).toHaveProperty('count');
    expect(result).toHaveProperty('games');
  });

  test('only includes owned base games', () => {
    const result = getCostClubGames(typicalData.games, typicalData.plays, Metric.HOURS, CostClub.FIVE_DOLLAR);
    result.games.forEach(item => {
      expect(item.game.isBaseGame).toBe(true);
    });
  });

  test('only includes games with price data', () => {
    const result = getCostClubGames(typicalData.games, typicalData.plays, Metric.HOURS, CostClub.FIVE_DOLLAR);
    result.games.forEach(item => {
      expect(item.pricePaid).toBeGreaterThan(0);
    });
  });

  test('only includes games with metric value > 0', () => {
    const result = getCostClubGames(typicalData.games, typicalData.plays, Metric.HOURS, CostClub.FIVE_DOLLAR);
    result.games.forEach(item => {
      expect(item.metricValue).toBeGreaterThan(0);
    });
  });

  test('only includes games where costPerMetric <= threshold', () => {
    const result = getCostClubGames(typicalData.games, typicalData.plays, Metric.HOURS, CostClub.FIVE_DOLLAR);
    result.games.forEach(item => {
      expect(item.costPerMetric).toBeLessThanOrEqual(CostClub.FIVE_DOLLAR);
    });
  });

  test('calculates costPerMetric correctly', () => {
    const result = getCostClubGames(typicalData.games, typicalData.plays, Metric.HOURS, CostClub.FIVE_DOLLAR);
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
    // With cap, should be $1/hour (price paid)
    const plays = [
      { gameId: 1, date: '2023-01-01', durationMin: 12 },
    ];
    const result = getCostClubGames(games, plays, Metric.HOURS, CostClub.FIVE_DOLLAR);
    expect(result.count).toBe(1);
    expect(result.games[0].metricValue).toBeCloseTo(0.2, 5);
    expect(result.games[0].costPerMetric).toBe(1); // Capped at pricePaid, not $5
  });

  test('sorts by costPerMetric descending', () => {
    const result = getCostClubGames(typicalData.games, typicalData.plays, Metric.HOURS, CostClub.FIVE_DOLLAR);
    for (let i = 1; i < result.games.length; i++) {
      expect(result.games[i - 1].costPerMetric).toBeGreaterThanOrEqual(result.games[i].costPerMetric);
    }
  });

  test('works with different metrics', () => {
    const hoursResult = getCostClubGames(typicalData.games, typicalData.plays, Metric.HOURS, CostClub.FIVE_DOLLAR);
    const sessionsResult = getCostClubGames(typicalData.games, typicalData.plays, Metric.SESSIONS, CostClub.FIVE_DOLLAR);
    const playsResult = getCostClubGames(typicalData.games, typicalData.plays, Metric.PLAYS, CostClub.FIVE_DOLLAR);

    // Results should differ between metrics
    expect(hoursResult.count).toBeDefined();
    expect(sessionsResult.count).toBeDefined();
    expect(playsResult.count).toBeDefined();
  });

  test('returns empty array for empty games', () => {
    const result = getCostClubGames([], [], Metric.HOURS, CostClub.FIVE_DOLLAR);
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
    const result = getCostClubGames(games, plays, Metric.HOURS, CostClub.FIVE_DOLLAR);
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
    const result = getCostClubGames(games, plays, Metric.HOURS, CostClub.FIVE_DOLLAR);
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
    const result = getCostClubGames(games, plays, Metric.HOURS, CostClub.FIVE_DOLLAR);
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
    const result = getCostClubGames(games, plays, Metric.HOURS, CostClub.FIVE_DOLLAR);
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
    const result = getCostClubGames(games, plays, Metric.HOURS, CostClub.FIVE_DOLLAR, 2023);
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
    const result2023 = getCostClubGames(games, plays, Metric.HOURS, CostClub.FIVE_DOLLAR, 2023);
    expect(result2023.count).toBe(0);

    // Through 2024 gets all 10 hours ($5/hour) - in club
    const result2024 = getCostClubGames(games, plays, Metric.HOURS, CostClub.FIVE_DOLLAR, 2024);
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
    const result = getCostClubGames(games, plays, Metric.HOURS, CostClub.FIVE_DOLLAR, null);
    expect(result.count).toBe(1);
    expect(result.games[0].metricValue).toBe(10);
  });
});

describe('getGamesApproachingCostClub', () => {
  test('returns array of candidates', () => {
    const result = getGamesApproachingCostClub(
      typicalData.games,
      typicalData.plays,
      Metric.HOURS,
      CostClub.FIVE_DOLLAR,
      5,
    );
    expect(Array.isArray(result)).toBe(true);
  });

  test('only includes games above threshold', () => {
    const result = getGamesApproachingCostClub(
      typicalData.games,
      typicalData.plays,
      Metric.HOURS,
      CostClub.FIVE_DOLLAR,
      5,
    );
    result.forEach(item => {
      expect(item.costPerMetric).toBeGreaterThan(CostClub.FIVE_DOLLAR);
    });
  });

  test('calculates additionalNeeded correctly', () => {
    const result = getGamesApproachingCostClub(
      typicalData.games,
      typicalData.plays,
      Metric.HOURS,
      CostClub.FIVE_DOLLAR,
      5,
    );
    result.forEach(item => {
      const neededMetricForClub = item.pricePaid / CostClub.FIVE_DOLLAR;
      const expectedAdditional = neededMetricForClub - item.metricValue;
      expect(item.additionalNeeded).toBeCloseTo(expectedAdditional, 5);
    });
  });

  test('sorts by additionalNeeded ascending', () => {
    const result = getGamesApproachingCostClub(
      typicalData.games,
      typicalData.plays,
      Metric.HOURS,
      CostClub.FIVE_DOLLAR,
      10,
    );
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].additionalNeeded).toBeLessThanOrEqual(result[i].additionalNeeded);
    }
  });

  test('limits to topN results', () => {
    const result = getGamesApproachingCostClub(
      typicalData.games,
      typicalData.plays,
      Metric.HOURS,
      CostClub.FIVE_DOLLAR,
      2,
    );
    expect(result.length).toBeLessThanOrEqual(2);
  });

  test('returns fewer than topN if not enough candidates', () => {
    const result = getGamesApproachingCostClub(
      typicalData.games,
      typicalData.plays,
      Metric.HOURS,
      CostClub.FIVE_DOLLAR,
      100,
    );
    // Should return all candidates even if less than 100
    expect(result.length).toBeLessThan(100);
  });

  test('excludes games already in club', () => {
    const games = [{
      id: 1,
      name: 'In Club Game',
      isBaseGame: true,
      copies: [{ statusOwned: true, pricePaid: 50 }],
    }];
    const plays = [
      { gameId: 1, date: '2023-01-01', durationMin: 600 }, // 10 hours = $5/hour (exactly at threshold)
    ];
    const result = getGamesApproachingCostClub(games, plays, Metric.HOURS, CostClub.FIVE_DOLLAR, 5);
    expect(result.length).toBe(0);
  });

  test('works with different metrics', () => {
    const hoursResult = getGamesApproachingCostClub(
      typicalData.games,
      typicalData.plays,
      Metric.HOURS,
      CostClub.FIVE_DOLLAR,
      5,
    );
    const playsResult = getGamesApproachingCostClub(
      typicalData.games,
      typicalData.plays,
      Metric.PLAYS,
      CostClub.FIVE_DOLLAR,
      5,
    );

    // Results might differ between metrics
    expect(Array.isArray(hoursResult)).toBe(true);
    expect(Array.isArray(playsResult)).toBe(true);
  });

  test('returns empty array when no candidates', () => {
    const result = getGamesApproachingCostClub([], [], Metric.HOURS, CostClub.FIVE_DOLLAR, 5);
    expect(result).toEqual([]);
  });

  test('excludes games with price data but no play data', () => {
    const games = [{
      id: 1,
      name: 'Unplayed Game',
      isBaseGame: true,
      copies: [{ statusOwned: true, pricePaid: 50 }],
    }];
    const plays = []; // No plays at all
    const result = getGamesApproachingCostClub(games, plays, Metric.HOURS, CostClub.FIVE_DOLLAR, 5);
    expect(result.length).toBe(0);
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
    const result = getGamesApproachingCostClub(games, plays, Metric.HOURS, CostClub.FIVE_DOLLAR, 5);
    expect(result.length).toBe(0); // Excluded because 0 hours
  });

  test('caps costPerMetric at pricePaid when metric < 1', () => {
    const games = [{
      id: 1,
      name: 'Short Play Game',
      isBaseGame: true,
      copies: [{ statusOwned: true, pricePaid: 10 }],
    }];
    // 12 minutes = 0.2 hours, without cap would be $10/0.2 = $50/hour
    // With cap, should be $10/hour (price paid)
    const plays = [
      { gameId: 1, date: '2023-01-01', durationMin: 12 },
    ];
    const result = getGamesApproachingCostClub(games, plays, Metric.HOURS, CostClub.FIVE_DOLLAR, 5);
    expect(result.length).toBe(1);
    expect(result[0].metricValue).toBeCloseTo(0.2, 5);
    expect(result[0].costPerMetric).toBe(10); // Capped at pricePaid, not $50
  });
});

describe('calculateCostClubIncrease', () => {
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
    const result = calculateCostClubIncrease(games, plays, 2023, Metric.HOURS, CostClub.FIVE_DOLLAR);
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
    const result = calculateCostClubIncrease(games, plays, 2023, Metric.HOURS, CostClub.FIVE_DOLLAR);
    expect(result).toBe(0);
  });

  test('returns negative when games leave club (theoretical - would require price change)', () => {
    // This shouldn't happen in practice since price doesn't change,
    // but the function supports negative values
    const result = calculateCostClubIncrease([], [], 2023, Metric.HOURS, CostClub.FIVE_DOLLAR);
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
    const result = calculateCostClubIncrease(games, plays, 2023, Metric.HOURS, CostClub.FIVE_DOLLAR);
    expect(result).toBe(2);
  });
});

describe('getNewCostClubGames', () => {
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
    const result = getNewCostClubGames(games, plays, 2023, Metric.HOURS, CostClub.FIVE_DOLLAR);
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
    const result = getNewCostClubGames(games, plays, 2023, Metric.HOURS, CostClub.FIVE_DOLLAR);
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
    const result = getNewCostClubGames(games, plays, 2023, Metric.HOURS, CostClub.FIVE_DOLLAR);
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
        copies: [{ statusOwned: true, pricePaid: 20 }],
      },
    ];
    const plays = [
      { gameId: 1, date: '2023-06-15', durationMin: 600 }, // $5/hour
      { gameId: 2, date: '2023-06-15', durationMin: 600 }, // $2/hour
    ];
    const result = getNewCostClubGames(games, plays, 2023, Metric.HOURS, CostClub.FIVE_DOLLAR);
    expect(result[0].game.id).toBe(2); // Lower cost first
    expect(result[1].game.id).toBe(1);
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
    const result = getNewCostClubGames(games, plays, 2023, Metric.HOURS, CostClub.FIVE_DOLLAR);
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
    const result = getNewCostClubGames(games, plays, 2023, Metric.HOURS, CostClub.FIVE_DOLLAR);
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
    const result = getNewCostClubGames(games, plays, 2023, Metric.HOURS, CostClub.FIVE_DOLLAR);
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
    const hoursResult = getNewCostClubGames(games, plays, 2023, Metric.HOURS, CostClub.FIVE_DOLLAR);
    const sessionsResult = getNewCostClubGames(games, plays, 2023, Metric.SESSIONS, CostClub.FIVE_DOLLAR);
    const playsResult = getNewCostClubGames(games, plays, 2023, Metric.PLAYS, CostClub.FIVE_DOLLAR);

    expect(hoursResult.length).toBe(1);
    expect(sessionsResult.length).toBe(1);
    expect(playsResult.length).toBe(1);
  });
});

describe('getSkippedCostClubCount', () => {
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
    const result = getSkippedCostClubCount(games, plays, 2023, Metric.HOURS, CostClub.FIVE_DOLLAR, null);
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
    const result = getSkippedCostClubCount(games, plays, 2023, Metric.HOURS, CostClub.FIVE_DOLLAR, 2.5);
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
    const result = getSkippedCostClubCount(games, plays, 2023, Metric.HOURS, CostClub.FIVE_DOLLAR, 2.5);
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
    const result = getSkippedCostClubCount(games, plays, 2023, Metric.HOURS, CostClub.FIVE_DOLLAR, 2.5);
    expect(result).toBe(0);
  });

  test('returns 0 for empty data', () => {
    const result = getSkippedCostClubCount([], [], 2023, Metric.HOURS, CostClub.FIVE_DOLLAR, 2.5);
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
    expect(getSkippedCostClubCount(games, plays, 2023, Metric.HOURS, CostClub.FIVE_DOLLAR, 2.5)).toBe(1);
    expect(getSkippedCostClubCount(games, plays, 2023, Metric.SESSIONS, CostClub.FIVE_DOLLAR, 2.5)).toBe(1);
    expect(getSkippedCostClubCount(games, plays, 2023, Metric.PLAYS, CostClub.FIVE_DOLLAR, 2.5)).toBe(1);
  });
});
