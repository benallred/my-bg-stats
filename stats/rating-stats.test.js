import { describe, test, expect } from 'vitest';
import {
  getPlayedRatingBreakdown,
  getCollectionRatingBreakdown,
} from './rating-stats.js';

describe('getPlayedRatingBreakdown', () => {
  const games = [
    { id: 1, name: 'Game A', rating: 8 },
    { id: 2, name: 'Game B', rating: 6 },
    { id: 3, name: 'Game C', rating: null },
    { id: 4, name: 'Game D', rating: 10 },
  ];

  test('calculates average rating of played games', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', durationMin: 60, copyId: 'copy1' },
      { gameId: 2, date: '2024-01-16', durationMin: 45, copyId: 'copy2' },
      { gameId: 4, date: '2024-01-17', durationMin: 90, copyId: null },
    ];

    const result = getPlayedRatingBreakdown(games, plays);

    expect(result.average).toBe(8); // (8 + 6 + 10) / 3
    expect(result.ratedCount).toBe(3);
    expect(result.totalCount).toBe(3);
  });

  test('excludes unrated games from average but counts in totalCount', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', durationMin: 60, copyId: 'copy1' },
      { gameId: 3, date: '2024-01-16', durationMin: 45, copyId: 'copy3' }, // null rating
    ];

    const result = getPlayedRatingBreakdown(games, plays);

    expect(result.average).toBe(8); // only Game A with rating 8
    expect(result.ratedCount).toBe(1);
    expect(result.totalCount).toBe(2);
  });

  test('filters plays by year when specified', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', durationMin: 60, copyId: 'copy1' },
      { gameId: 2, date: '2023-12-31', durationMin: 45, copyId: 'copy2' }, // wrong year
      { gameId: 4, date: '2024-06-01', durationMin: 90, copyId: null },
    ];

    const result = getPlayedRatingBreakdown(games, plays, 2024);

    expect(result.average).toBe(9); // (8 + 10) / 2
    expect(result.ratedCount).toBe(2);
    expect(result.totalCount).toBe(2);
  });

  test('returns null average when no plays', () => {
    const result = getPlayedRatingBreakdown(games, []);

    expect(result.average).toBeNull();
    expect(result.ratedCount).toBe(0);
    expect(result.totalCount).toBe(0);
    expect(result.gameRatings).toEqual([]);
  });

  test('returns gameRatings array with play data', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', durationMin: 60, copyId: 'copy1' },
      { gameId: 1, date: '2024-01-15', durationMin: 30, copyId: 'copy1' }, // same day
      { gameId: 1, date: '2024-01-20', durationMin: 45, copyId: 'copy1' }, // different day
    ];

    const result = getPlayedRatingBreakdown(games, plays);

    expect(result.gameRatings).toHaveLength(1);
    expect(result.gameRatings[0].game.id).toBe(1);
    expect(result.gameRatings[0].rating).toBe(8);
    expect(result.gameRatings[0].playData.totalMinutes).toBe(135); // 60 + 30 + 45
    expect(result.gameRatings[0].playData.playCount).toBe(3);
    expect(result.gameRatings[0].playData.uniqueDates).toBe(2); // 2 unique dates
    expect(result.gameRatings[0].playData.owned).toBe(true);
  });

  test('tracks owned status correctly in gameRatings', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', durationMin: 60, copyId: 'copy1' }, // owned
      { gameId: 2, date: '2024-01-16', durationMin: 45, copyId: null }, // not owned
    ];

    const result = getPlayedRatingBreakdown(games, plays);

    const gameAData = result.gameRatings.find(g => g.game.id === 1);
    const gameBData = result.gameRatings.find(g => g.game.id === 2);

    expect(gameAData.playData.owned).toBe(true);
    expect(gameBData.playData.owned).toBe(false);
  });

  test('counts each game only once even with multiple plays', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', durationMin: 60, copyId: 'copy1' },
      { gameId: 1, date: '2024-01-16', durationMin: 30, copyId: 'copy1' },
      { gameId: 1, date: '2024-01-17', durationMin: 45, copyId: 'copy1' },
    ];

    const result = getPlayedRatingBreakdown(games, plays);

    expect(result.average).toBe(8); // Game A rated 8, counted once
    expect(result.ratedCount).toBe(1);
    expect(result.totalCount).toBe(1);
  });

  test('handles unknown game IDs gracefully', () => {
    const plays = [
      { gameId: 999, date: '2024-01-15', durationMin: 60, copyId: 'copy1' }, // unknown
      { gameId: 1, date: '2024-01-16', durationMin: 45, copyId: 'copy1' },
    ];

    const result = getPlayedRatingBreakdown(games, plays);

    // Unknown game excluded from gameRatings
    expect(result.totalCount).toBe(2); // Map counts both
    expect(result.gameRatings).toHaveLength(1); // Only known game in array
    expect(result.average).toBe(8);
    expect(result.ratedCount).toBe(1);
  });

  test('handles plays with missing durationMin', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', durationMin: null, copyId: 'copy1' },
      { gameId: 1, date: '2024-01-16', durationMin: undefined, copyId: 'copy1' },
      { gameId: 1, date: '2024-01-17', durationMin: 60, copyId: 'copy1' },
    ];

    const result = getPlayedRatingBreakdown(games, plays);

    expect(result.gameRatings[0].playData.totalMinutes).toBe(60); // Only valid duration counted
    expect(result.gameRatings[0].playData.playCount).toBe(3);
  });
});

describe('getCollectionRatingBreakdown', () => {
  test('returns average rating of owned base games', () => {
    const games = [
      { id: 1, name: 'Game A', rating: 8, isBaseGame: true, copies: [{ statusOwned: true, acquisitionDate: '2021-05-15' }] },
      { id: 2, name: 'Game B', rating: 6, isBaseGame: true, copies: [{ statusOwned: true, acquisitionDate: '2022-03-01' }] },
      { id: 3, name: 'Game C', rating: 10, isBaseGame: true, copies: [{ statusOwned: true, acquisitionDate: '2020-01-10' }] },
    ];

    const result = getCollectionRatingBreakdown(games);

    expect(result.average).toBe(8); // (8 + 6 + 10) / 3
    expect(result.ratedCount).toBe(3);
    expect(result.totalCount).toBe(3);
    expect(result.gameRatings).toHaveLength(3);
  });

  test('includes acquisition date in gameRatings', () => {
    const games = [
      { id: 1, name: 'Game A', rating: 8, isBaseGame: true, copies: [{ statusOwned: true, acquisitionDate: '2021-05-15' }] },
    ];

    const result = getCollectionRatingBreakdown(games);

    expect(result.gameRatings[0].acquisitionDate).toBe('2021-05-15');
  });

  test('excludes non-base games', () => {
    const games = [
      { id: 1, name: 'Base Game', rating: 8, isBaseGame: true, copies: [{ statusOwned: true }] },
      { id: 2, name: 'Expansion', rating: 9, isBaseGame: false, copies: [{ statusOwned: true }] },
    ];

    const result = getCollectionRatingBreakdown(games);

    expect(result.totalCount).toBe(1);
    expect(result.gameRatings).toHaveLength(1);
  });

  test('excludes unowned games when year is null', () => {
    const games = [
      { id: 1, name: 'Owned', rating: 8, isBaseGame: true, copies: [{ statusOwned: true }] },
      { id: 2, name: 'Not Owned', rating: 6, isBaseGame: true, copies: [{ statusOwned: false }] },
    ];

    const result = getCollectionRatingBreakdown(games, null);

    expect(result.totalCount).toBe(1);
    expect(result.average).toBe(8);
  });

  test('includes only games acquired in year when year filter active', () => {
    const games = [
      { id: 1, name: 'Acquired 2020', rating: 8, isBaseGame: true, copies: [{ acquisitionDate: '2020-05-15' }] },
      { id: 2, name: 'Acquired 2021', rating: 6, isBaseGame: true, copies: [{ acquisitionDate: '2021-03-01' }] },
      { id: 3, name: 'Also Acquired 2021', rating: 10, isBaseGame: true, copies: [{ acquisitionDate: '2021-06-10' }] },
      { id: 4, name: 'Acquired 2022', rating: 9, isBaseGame: true, copies: [{ acquisitionDate: '2022-01-10' }] },
    ];

    const result = getCollectionRatingBreakdown(games, 2021);

    expect(result.totalCount).toBe(2); // Only 2021 games
    expect(result.average).toBe(8); // (6 + 10) / 2
  });

  test('handles games without ratings', () => {
    const games = [
      { id: 1, name: 'Rated', rating: 8, isBaseGame: true, copies: [{ statusOwned: true }] },
      { id: 2, name: 'Unrated', rating: null, isBaseGame: true, copies: [{ statusOwned: true }] },
    ];

    const result = getCollectionRatingBreakdown(games);

    expect(result.average).toBe(8);
    expect(result.ratedCount).toBe(1);
    expect(result.totalCount).toBe(2);
  });

  test('returns null average when no rated games', () => {
    const games = [
      { id: 1, name: 'Unrated', rating: null, isBaseGame: true, copies: [{ statusOwned: true }] },
    ];

    const result = getCollectionRatingBreakdown(games);

    expect(result.average).toBeNull();
    expect(result.ratedCount).toBe(0);
    expect(result.totalCount).toBe(1);
  });

  test('handles empty games array', () => {
    const result = getCollectionRatingBreakdown([]);

    expect(result.average).toBeNull();
    expect(result.ratedCount).toBe(0);
    expect(result.totalCount).toBe(0);
    expect(result.gameRatings).toEqual([]);
  });

  test('returns earliest acquisition date for games with multiple copies', () => {
    const games = [
      {
        id: 1,
        name: 'Game',
        rating: 8,
        isBaseGame: true,
        copies: [
          { statusOwned: true, acquisitionDate: '2022-06-15' },
          { statusOwned: true, acquisitionDate: '2021-03-10' },
        ],
      },
    ];

    const result = getCollectionRatingBreakdown(games, null);

    // acquisitionDate should be earliest
    expect(result.gameRatings[0].acquisitionDate).toBe('2021-03-10');
  });
});
