import { describe, test, expect } from 'vitest';
import {
  countGamesInTier,
  calculateTierIncrease,
  getNewTierGames,
  getSkippedTierCount,
} from './tier-helpers.js';
import { Milestone, CostClub, Metric } from './constants.js';
import { getMetricValueFromPlayData } from './play-helpers.js';

// getGamePricePaid helper for CostClub tests (mirrors cost-stats.js implementation)
// Note: Assumes game passes costClubGameFilter (has owned copies)
function getGamePricePaid(game) {
  const ownedCopies = game.copies.filter(copy => copy.statusOwned === true);
  let totalPricePaid = 0;
  let hasPriceData = false;
  ownedCopies.forEach(copy => {
    if (copy.pricePaid !== null && copy.pricePaid !== undefined && copy.pricePaid !== '') {
      totalPricePaid += copy.pricePaid;
      hasPriceData = true;
    }
  });
  return hasPriceData ? totalPricePaid : null;
}

describe('countGamesInTier', () => {
  // Helper to get milestone value
  const getMilestoneValue = (game, playData, metric) => {
    if (!playData) return null;
    return getMetricValueFromPlayData(playData, metric);
  };

  test('counts games in milestone tier (ascending)', () => {
    const games = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const plays = [
      // Game 1: 5 plays (in FIVES)
      { gameId: 1, date: '2023-01-01', durationMin: 60 },
      { gameId: 1, date: '2023-01-02', durationMin: 60 },
      { gameId: 1, date: '2023-01-03', durationMin: 60 },
      { gameId: 1, date: '2023-01-04', durationMin: 60 },
      { gameId: 1, date: '2023-01-05', durationMin: 60 },
      // Game 2: 1 play (not in any tier)
      { gameId: 2, date: '2023-01-01', durationMin: 60 },
      // Game 3: 10 plays (in DIMES, not FIVES)
      { gameId: 3, date: '2023-01-01', durationMin: 60 },
      { gameId: 3, date: '2023-01-02', durationMin: 60 },
      { gameId: 3, date: '2023-01-03', durationMin: 60 },
      { gameId: 3, date: '2023-01-04', durationMin: 60 },
      { gameId: 3, date: '2023-01-05', durationMin: 60 },
      { gameId: 3, date: '2023-01-06', durationMin: 60 },
      { gameId: 3, date: '2023-01-07', durationMin: 60 },
      { gameId: 3, date: '2023-01-08', durationMin: 60 },
      { gameId: 3, date: '2023-01-09', durationMin: 60 },
      { gameId: 3, date: '2023-01-10', durationMin: 60 },
    ];

    const count = countGamesInTier({
      games,
      plays,
      year: 2023,
      metric: Metric.PLAYS,
      tierCollection: Milestone,
      tier: Milestone.FIVES,
      getGameValue: getMilestoneValue,
    });

    expect(count).toBe(1); // Only game 1 has exactly 5-9 plays
  });

  test('counts games in dimes tier', () => {
    const games = [{ id: 1 }, { id: 2 }];
    const plays = [
      // Game 1: 10 plays
      ...Array(10).fill(null).map((_, i) => ({ gameId: 1, date: `2023-01-${String(i + 1).padStart(2, '0')}`, durationMin: 60 })),
      // Game 2: 15 plays
      ...Array(15).fill(null).map((_, i) => ({ gameId: 2, date: `2023-01-${String(i + 1).padStart(2, '0')}`, durationMin: 60 })),
    ];

    const count = countGamesInTier({
      games,
      plays,
      year: 2023,
      metric: Metric.PLAYS,
      tierCollection: Milestone,
      tier: Milestone.DIMES,
      getGameValue: getMilestoneValue,
    });

    expect(count).toBe(2); // Both have 10-24 plays
  });

  test('applies gameFilter correctly', () => {
    const games = [
      { id: 1, isBaseGame: true },
      { id: 2, isBaseGame: false },
    ];
    const plays = [
      ...Array(5).fill(null).map((_, i) => ({ gameId: 1, date: `2023-01-${String(i + 1).padStart(2, '0')}`, durationMin: 60 })),
      ...Array(5).fill(null).map((_, i) => ({ gameId: 2, date: `2023-01-${String(i + 1).padStart(2, '0')}`, durationMin: 60 })),
    ];

    const count = countGamesInTier({
      games,
      plays,
      year: 2023,
      metric: Metric.PLAYS,
      tierCollection: Milestone,
      tier: Milestone.FIVES,
      getGameValue: getMilestoneValue,
      gameFilter: (game) => game.isBaseGame,
    });

    expect(count).toBe(1); // Only game 1 passes filter
  });

  test('returns 0 when no games match', () => {
    const games = [{ id: 1 }];
    const plays = [{ gameId: 1, date: '2023-01-01', durationMin: 60 }];

    const count = countGamesInTier({
      games,
      plays,
      year: 2023,
      metric: Metric.PLAYS,
      tierCollection: Milestone,
      tier: Milestone.FIVES,
      getGameValue: getMilestoneValue,
    });

    expect(count).toBe(0);
  });

  test('handles null year (all time)', () => {
    const games = [{ id: 1 }];
    const plays = [
      { gameId: 1, date: '2022-01-01', durationMin: 60 },
      { gameId: 1, date: '2022-01-02', durationMin: 60 },
      { gameId: 1, date: '2023-01-01', durationMin: 60 },
      { gameId: 1, date: '2023-01-02', durationMin: 60 },
      { gameId: 1, date: '2023-01-03', durationMin: 60 },
    ];

    const count = countGamesInTier({
      games,
      plays,
      year: null,
      metric: Metric.PLAYS,
      tierCollection: Milestone,
      tier: Milestone.FIVES,
      getGameValue: getMilestoneValue,
    });

    expect(count).toBe(1); // 5 plays total
  });
});

describe('calculateTierIncrease', () => {
  const getMilestoneValue = (game, playData, metric) => {
    if (!playData) return null;
    return getMetricValueFromPlayData(playData, metric);
  };

  test('calculates positive increase when games enter tier', () => {
    const games = [{ id: 1 }];
    const plays = [
      // 2 plays in 2022
      { gameId: 1, date: '2022-01-01', durationMin: 60 },
      { gameId: 1, date: '2022-01-02', durationMin: 60 },
      // 3 more plays in 2023 (total 5)
      { gameId: 1, date: '2023-01-01', durationMin: 60 },
      { gameId: 1, date: '2023-01-02', durationMin: 60 },
      { gameId: 1, date: '2023-01-03', durationMin: 60 },
    ];

    const increase = calculateTierIncrease({
      games,
      plays,
      year: 2023,
      metric: Metric.PLAYS,
      tierCollection: Milestone,
      tier: Milestone.FIVES,
      getGameValue: getMilestoneValue,
    });

    expect(increase).toBe(1); // 0 in 2022, 1 in 2023
  });

  test('calculates negative increase when games leave tier', () => {
    const games = [{ id: 1 }];
    const plays = [
      // 5 plays in 2022 (in FIVES)
      ...Array(5).fill(null).map((_, i) => ({ gameId: 1, date: `2022-01-${String(i + 1).padStart(2, '0')}`, durationMin: 60 })),
      // 5 more plays in 2023 (total 10, now in DIMES)
      ...Array(5).fill(null).map((_, i) => ({ gameId: 1, date: `2023-01-${String(i + 1).padStart(2, '0')}`, durationMin: 60 })),
    ];

    const increase = calculateTierIncrease({
      games,
      plays,
      year: 2023,
      metric: Metric.PLAYS,
      tierCollection: Milestone,
      tier: Milestone.FIVES,
      getGameValue: getMilestoneValue,
    });

    expect(increase).toBe(-1); // 1 in 2022, 0 in 2023
  });

  test('returns 0 when no change', () => {
    const games = [{ id: 1 }];
    const plays = [
      ...Array(5).fill(null).map((_, i) => ({ gameId: 1, date: `2022-01-${String(i + 1).padStart(2, '0')}`, durationMin: 60 })),
    ];

    const increase = calculateTierIncrease({
      games,
      plays,
      year: 2023,
      metric: Metric.PLAYS,
      tierCollection: Milestone,
      tier: Milestone.FIVES,
      getGameValue: getMilestoneValue,
    });

    expect(increase).toBe(0); // 1 in both years
  });
});

describe('getNewTierGames', () => {
  const getMilestoneValue = (game, playData, metric) => {
    if (!playData) return null;
    return getMetricValueFromPlayData(playData, metric);
  };

  const getMilestoneThisYearValue = (game, currentPlayData, previousPlayData, metric) => {
    const current = currentPlayData ? getMetricValueFromPlayData(currentPlayData, metric) : 0;
    const previous = previousPlayData ? getMetricValueFromPlayData(previousPlayData, metric) : 0;
    return current - previous;
  };

  test('applies gameFilter to exclude games', () => {
    const games = [
      { id: 1, isBaseGame: true },
      { id: 2, isBaseGame: false },
    ];
    const plays = [
      // Both games have 5 plays in 2023
      ...Array(5).fill(null).map((_, i) => ({ gameId: 1, date: `2023-01-${String(i + 1).padStart(2, '0')}`, durationMin: 60 })),
      ...Array(5).fill(null).map((_, i) => ({ gameId: 2, date: `2023-01-${String(i + 1).padStart(2, '0')}`, durationMin: 60 })),
    ];

    const newGames = getNewTierGames({
      games,
      plays,
      year: 2023,
      metric: Metric.PLAYS,
      tierCollection: Milestone,
      tier: Milestone.FIVES,
      getGameValue: getMilestoneValue,
      getThisYearValue: getMilestoneThisYearValue,
      gameFilter: (game) => game.isBaseGame,
    });

    expect(newGames).toHaveLength(1);
    expect(newGames[0].game.id).toBe(1);
  });

  test('skips games where getGameValue returns null', () => {
    const games = [{ id: 1 }, { id: 2 }];
    const plays = [
      // Only game 1 has plays - game 2 will return null from getGameValue
      ...Array(5).fill(null).map((_, i) => ({ gameId: 1, date: `2023-01-${String(i + 1).padStart(2, '0')}`, durationMin: 60 })),
    ];

    const newGames = getNewTierGames({
      games,
      plays,
      year: 2023,
      metric: Metric.PLAYS,
      tierCollection: Milestone,
      tier: Milestone.FIVES,
      getGameValue: getMilestoneValue,
      getThisYearValue: getMilestoneThisYearValue,
    });

    expect(newGames).toHaveLength(1);
    expect(newGames[0].game.id).toBe(1);
  });

  test('finds games newly entering tier', () => {
    const games = [{ id: 1, name: 'Game 1' }, { id: 2, name: 'Game 2' }];
    const plays = [
      // Game 1: 2 plays in 2022, 3 more in 2023 (total 5, enters FIVES)
      { gameId: 1, date: '2022-01-01', durationMin: 60 },
      { gameId: 1, date: '2022-01-02', durationMin: 60 },
      { gameId: 1, date: '2023-01-01', durationMin: 60 },
      { gameId: 1, date: '2023-01-02', durationMin: 60 },
      { gameId: 1, date: '2023-01-03', durationMin: 60 },
      // Game 2: Already had 5 plays in 2022
      ...Array(5).fill(null).map((_, i) => ({ gameId: 2, date: `2022-01-${String(i + 1).padStart(2, '0')}`, durationMin: 60 })),
    ];

    const newGames = getNewTierGames({
      games,
      plays,
      year: 2023,
      metric: Metric.PLAYS,
      tierCollection: Milestone,
      tier: Milestone.FIVES,
      getGameValue: getMilestoneValue,
      getThisYearValue: getMilestoneThisYearValue,
    });

    expect(newGames).toHaveLength(1);
    expect(newGames[0].game.id).toBe(1);
    expect(newGames[0].value).toBe(5);
    expect(newGames[0].thisYearValue).toBe(3);
  });

  test('excludes games already in tier', () => {
    const games = [{ id: 1 }];
    const plays = [
      ...Array(5).fill(null).map((_, i) => ({ gameId: 1, date: `2022-01-${String(i + 1).padStart(2, '0')}`, durationMin: 60 })),
      { gameId: 1, date: '2023-01-01', durationMin: 60 },
    ];

    const newGames = getNewTierGames({
      games,
      plays,
      year: 2023,
      metric: Metric.PLAYS,
      tierCollection: Milestone,
      tier: Milestone.FIVES,
      getGameValue: getMilestoneValue,
      getThisYearValue: getMilestoneThisYearValue,
    });

    expect(newGames).toHaveLength(0); // Already was in FIVES
  });

  test('sorts by value descending for ascending tiers', () => {
    const games = [{ id: 1 }, { id: 2 }];
    const plays = [
      // Game 1: 5 plays in 2023
      ...Array(5).fill(null).map((_, i) => ({ gameId: 1, date: `2023-01-${String(i + 1).padStart(2, '0')}`, durationMin: 60 })),
      // Game 2: 7 plays in 2023
      ...Array(7).fill(null).map((_, i) => ({ gameId: 2, date: `2023-01-${String(i + 1).padStart(2, '0')}`, durationMin: 60 })),
    ];

    const newGames = getNewTierGames({
      games,
      plays,
      year: 2023,
      metric: Metric.PLAYS,
      tierCollection: Milestone,
      tier: Milestone.FIVES,
      getGameValue: getMilestoneValue,
      getThisYearValue: getMilestoneThisYearValue,
    });

    expect(newGames).toHaveLength(2);
    expect(newGames[0].game.id).toBe(2); // Higher value first
    expect(newGames[1].game.id).toBe(1);
  });

  test('returns empty array when no new games', () => {
    const games = [{ id: 1 }];
    const plays = [{ gameId: 1, date: '2023-01-01', durationMin: 60 }];

    const newGames = getNewTierGames({
      games,
      plays,
      year: 2023,
      metric: Metric.PLAYS,
      tierCollection: Milestone,
      tier: Milestone.FIVES,
      getGameValue: getMilestoneValue,
      getThisYearValue: getMilestoneThisYearValue,
    });

    expect(newGames).toHaveLength(0);
  });
});

describe('getSkippedTierCount', () => {
  const getMilestoneValue = (game, playData, metric) => {
    if (!playData) return null;
    return getMetricValueFromPlayData(playData, metric);
  };

  test('applies gameFilter to exclude games', () => {
    const games = [
      { id: 1, isBaseGame: true },
      { id: 2, isBaseGame: false },
    ];
    const plays = [
      // Both games skip FIVES (go from 0 to 12 plays in 2023)
      ...Array(12).fill(null).map((_, i) => ({ gameId: 1, date: `2023-01-${String(i + 1).padStart(2, '0')}`, durationMin: 60 })),
      ...Array(12).fill(null).map((_, i) => ({ gameId: 2, date: `2023-01-${String(i + 1).padStart(2, '0')}`, durationMin: 60 })),
    ];

    const skipped = getSkippedTierCount({
      games,
      plays,
      year: 2023,
      metric: Metric.PLAYS,
      tierCollection: Milestone,
      tier: Milestone.FIVES,
      getGameValue: getMilestoneValue,
      gameFilter: (game) => game.isBaseGame,
    });

    expect(skipped).toBe(1); // Only game 1 passes filter
  });

  test('skips games where getGameValue returns null', () => {
    const games = [{ id: 1 }, { id: 2 }];
    const plays = [
      // Only game 1 has plays - game 2 will return null from getGameValue
      ...Array(12).fill(null).map((_, i) => ({ gameId: 1, date: `2023-01-${String(i + 1).padStart(2, '0')}`, durationMin: 60 })),
    ];

    const skipped = getSkippedTierCount({
      games,
      plays,
      year: 2023,
      metric: Metric.PLAYS,
      tierCollection: Milestone,
      tier: Milestone.FIVES,
      getGameValue: getMilestoneValue,
    });

    expect(skipped).toBe(1); // Only game 1 is counted
  });

  test('counts games that skipped a tier', () => {
    const games = [{ id: 1 }];
    const plays = [
      // Game had 2 plays in 2022 (below FIVES)
      { gameId: 1, date: '2022-01-01', durationMin: 60 },
      { gameId: 1, date: '2022-01-02', durationMin: 60 },
      // Game got 10 more plays in 2023 (total 12, in DIMES, skipped FIVES)
      ...Array(10).fill(null).map((_, i) => ({ gameId: 1, date: `2023-01-${String(i + 1).padStart(2, '0')}`, durationMin: 60 })),
    ];

    const skipped = getSkippedTierCount({
      games,
      plays,
      year: 2023,
      metric: Metric.PLAYS,
      tierCollection: Milestone,
      tier: Milestone.FIVES,
      getGameValue: getMilestoneValue,
    });

    expect(skipped).toBe(1);
  });

  test('returns 0 when no games skipped', () => {
    const games = [{ id: 1 }];
    const plays = [
      // Game had 2 plays in 2022
      { gameId: 1, date: '2022-01-01', durationMin: 60 },
      { gameId: 1, date: '2022-01-02', durationMin: 60 },
      // Game got 3 more in 2023 (total 5, in FIVES, not skipped)
      { gameId: 1, date: '2023-01-01', durationMin: 60 },
      { gameId: 1, date: '2023-01-02', durationMin: 60 },
      { gameId: 1, date: '2023-01-03', durationMin: 60 },
    ];

    const skipped = getSkippedTierCount({
      games,
      plays,
      year: 2023,
      metric: Metric.PLAYS,
      tierCollection: Milestone,
      tier: Milestone.FIVES,
      getGameValue: getMilestoneValue,
    });

    expect(skipped).toBe(0);
  });

  test('returns 0 for last tier (cannot be skipped)', () => {
    const games = [{ id: 1 }];
    const plays = [
      ...Array(150).fill(null).map((_, i) => ({ gameId: 1, date: `2023-01-01`, durationMin: 60 })),
    ];

    const skipped = getSkippedTierCount({
      games,
      plays,
      year: 2023,
      metric: Metric.PLAYS,
      tierCollection: Milestone,
      tier: Milestone.CENTURIES,
      getGameValue: getMilestoneValue,
    });

    expect(skipped).toBe(0);
  });

  test('does not count games that were already in tier', () => {
    const games = [{ id: 1 }];
    const plays = [
      // Game had 6 plays in 2022 (in FIVES)
      ...Array(6).fill(null).map((_, i) => ({ gameId: 1, date: `2022-01-${String(i + 1).padStart(2, '0')}`, durationMin: 60 })),
      // Game got 6 more in 2023 (total 12, in DIMES)
      ...Array(6).fill(null).map((_, i) => ({ gameId: 1, date: `2023-01-${String(i + 1).padStart(2, '0')}`, durationMin: 60 })),
    ];

    const skipped = getSkippedTierCount({
      games,
      plays,
      year: 2023,
      metric: Metric.PLAYS,
      tierCollection: Milestone,
      tier: Milestone.FIVES,
      getGameValue: getMilestoneValue,
    });

    expect(skipped).toBe(0); // Was in FIVES, moved to DIMES normally
  });

  test('handles game with no previous plays', () => {
    const games = [{ id: 1 }];
    const plays = [
      // Game got 12 plays in 2023 only (skipped FIVES)
      ...Array(12).fill(null).map((_, i) => ({ gameId: 1, date: `2023-01-${String(i + 1).padStart(2, '0')}`, durationMin: 60 })),
    ];

    const skipped = getSkippedTierCount({
      games,
      plays,
      year: 2023,
      metric: Metric.PLAYS,
      tierCollection: Milestone,
      tier: Milestone.FIVES,
      getGameValue: getMilestoneValue,
    });

    expect(skipped).toBe(1);
  });
});

describe('tier helpers with CostClub (descending)', () => {
  // Helper for cost club value calculation
  const getCostClubValue = (game, playData, metric) => {
    if (!game.copies) return null;
    const ownedCopies = game.copies.filter(c => c.statusOwned === true);
    if (ownedCopies.length === 0) return null;

    let totalPrice = 0;
    let hasPrice = false;
    ownedCopies.forEach(c => {
      if (c.pricePaid !== null && c.pricePaid !== undefined && c.pricePaid !== '') {
        totalPrice += c.pricePaid;
        hasPrice = true;
      }
    });
    if (!hasPrice) return null;

    if (!playData) return null;
    const metricValue = getMetricValueFromPlayData(playData, metric);
    if (metricValue === 0) return null;

    return Math.min(totalPrice / metricValue, totalPrice);
  };

  test('countGamesInTier works with descending tiers', () => {
    const games = [
      { id: 1, copies: [{ statusOwned: true, pricePaid: 50 }] },
      { id: 2, copies: [{ statusOwned: true, pricePaid: 100 }] },
    ];
    const plays = [
      // Game 1: 10 plays = $5/play (in $5 club)
      ...Array(10).fill(null).map((_, i) => ({ gameId: 1, date: `2023-01-${String(i + 1).padStart(2, '0')}`, durationMin: 60 })),
      // Game 2: 10 plays = $10/play (not in $5 club)
      ...Array(10).fill(null).map((_, i) => ({ gameId: 2, date: `2023-01-${String(i + 1).padStart(2, '0')}`, durationMin: 60 })),
    ];

    const count = countGamesInTier({
      games,
      plays,
      year: 2023,
      metric: Metric.PLAYS,
      tierCollection: CostClub,
      tier: CostClub.FIVE_DOLLAR,
      getGameValue: getCostClubValue,
    });

    expect(count).toBe(1); // Only game 1 at $5/play
  });

  test('getNewTierGames sorts ascending for descending tiers', () => {
    const games = [
      { id: 1, copies: [{ statusOwned: true, pricePaid: 40 }] },
      { id: 2, copies: [{ statusOwned: true, pricePaid: 45 }] },
    ];
    const plays = [
      // Game 1: 10 plays = $4/play
      ...Array(10).fill(null).map((_, i) => ({ gameId: 1, date: `2023-01-${String(i + 1).padStart(2, '0')}`, durationMin: 60 })),
      // Game 2: 10 plays = $4.50/play
      ...Array(10).fill(null).map((_, i) => ({ gameId: 2, date: `2023-01-${String(i + 1).padStart(2, '0')}`, durationMin: 60 })),
    ];

    const newGames = getNewTierGames({
      games,
      plays,
      year: 2023,
      metric: Metric.PLAYS,
      tierCollection: CostClub,
      tier: CostClub.FIVE_DOLLAR,
      getGameValue: getCostClubValue,
      getThisYearValue: () => 10,
    });

    expect(newGames).toHaveLength(2);
    // Lower cost/play should come first for descending tiers
    expect(newGames[0].game.id).toBe(1); // $4/play
    expect(newGames[1].game.id).toBe(2); // $4.50/play
  });

  test('getSkippedTierCount works with descending tiers', () => {
    const games = [
      { id: 1, copies: [{ statusOwned: true, pricePaid: 25 }] },
    ];
    const plays = [
      // Game had 2 plays in 2022 ($12.50/play, above $5 club)
      { gameId: 1, date: '2022-01-01', durationMin: 60 },
      { gameId: 1, date: '2022-01-02', durationMin: 60 },
      // Game got 8 more in 2023 (total 10, $2.50/play, skipped $5 club)
      ...Array(8).fill(null).map((_, i) => ({ gameId: 1, date: `2023-01-${String(i + 1).padStart(2, '0')}`, durationMin: 60 })),
    ];

    const skipped = getSkippedTierCount({
      games,
      plays,
      year: 2023,
      metric: Metric.PLAYS,
      tierCollection: CostClub,
      tier: CostClub.FIVE_DOLLAR,
      getGameValue: getCostClubValue,
    });

    expect(skipped).toBe(1);
  });
});
