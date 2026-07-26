import { describe, test, expect } from 'vitest';
import { getTopGamesByTag } from './tag-stats.js';
import { Metric } from './constants.js';

describe('getTopGamesByTag', () => {
  const games = [
    { id: 1, name: 'Alpha', rating: 8, isBaseGame: true, tags: ['Classic', 'Two Player'] },
    { id: 2, name: 'Bravo', rating: 10, isBaseGame: true, tags: ['Classic'] },
    { id: 3, name: 'Charlie', rating: null, isBaseGame: true, tags: ['Classic'] },
    { id: 4, name: 'Delta', rating: 9, isBaseGame: true, tags: ['Two Player'] },
    { id: 5, name: 'Echo Expansion', rating: 10, isBaseGame: false, tags: ['Classic'] },
    { id: 6, name: 'Foxtrot', rating: 7, isBaseGame: true, tags: [] },
  ];

  const plays = [
    { gameId: 1, date: '2024-01-01', durationMin: 60 },
    { gameId: 1, date: '2024-01-02', durationMin: 60 },
    { gameId: 2, date: '2023-05-01', durationMin: 120 },
    { gameId: 4, date: '2024-03-01', durationMin: 30 },
  ];

  test('groups base games by tag, sorted by tag name', () => {
    const result = getTopGamesByTag(games, plays, Metric.PLAYS);
    expect(result.map(g => g.tag)).toEqual(['Classic', 'Two Player']);
  });

  test('ranks games by rating descending with unrated last', () => {
    const result = getTopGamesByTag(games, plays, Metric.PLAYS);
    const classic = result.find(g => g.tag === 'Classic');

    // Bravo (10), Alpha (8), then unrated Charlie
    expect(classic.games.map(g => g.game.name)).toEqual(['Bravo', 'Alpha', 'Charlie']);
    expect(classic.games[2].rating).toBeNull();
  });

  test('excludes expansions and games without tags', () => {
    const result = getTopGamesByTag(games, plays, Metric.PLAYS);
    const allGameIds = result.flatMap(g => g.games.map(x => x.game.id));

    expect(allGameIds).not.toContain(5); // expansion
    expect(allGameIds).not.toContain(6); // no tags
  });

  test('computes the requested metric value (all time)', () => {
    const result = getTopGamesByTag(games, plays, Metric.PLAYS);
    const twoPlayer = result.find(g => g.tag === 'Two Player');
    const alpha = twoPlayer.games.find(g => g.game.id === 1);

    expect(alpha.metricValue).toBe(2); // two plays
  });

  test('all time includes tagged base games that were never played', () => {
    const result = getTopGamesByTag(games, plays, Metric.PLAYS, null);
    const classic = result.find(g => g.tag === 'Classic');
    // Charlie has no plays at all but still appears in the all-time list
    expect(classic.games.map(g => g.game.id)).toContain(3);
  });

  test('when filtered by year, only includes games played that year', () => {
    const result = getTopGamesByTag(games, plays, Metric.PLAYS, 2024);

    // Classic keeps only Alpha (played 2024); Bravo (2023) and Charlie (never) drop out
    const classic = result.find(g => g.tag === 'Classic');
    expect(classic.games.map(g => g.game.name)).toEqual(['Alpha']);

    // Two Player keeps Alpha and Delta, both played in 2024
    const twoPlayer = result.find(g => g.tag === 'Two Player');
    expect(twoPlayer.games.map(g => g.game.name).sort()).toEqual(['Alpha', 'Delta']);
  });

  test('metric value reflects only the selected year', () => {
    // Alpha was played twice in 2024; the year metric value counts those plays
    const result = getTopGamesByTag(games, plays, Metric.PLAYS, 2024);
    const twoPlayer = result.find(g => g.tag === 'Two Player');
    const alpha = twoPlayer.games.find(g => g.game.id === 1);

    expect(alpha.metricValue).toBe(2);
  });

  test('reports hours as fractional metric values', () => {
    const result = getTopGamesByTag(games, plays, Metric.HOURS);
    const twoPlayer = result.find(g => g.tag === 'Two Player');
    const alpha = twoPlayer.games.find(g => g.game.id === 1);

    expect(alpha.metricValue).toBe(2); // 120 minutes / 60
  });

  test('breaks rating ties by metric value descending, then name', () => {
    const tiedGames = [
      { id: 1, name: 'Zeta', rating: 8, isBaseGame: true, tags: ['Party'] },
      { id: 2, name: 'Yankee', rating: 8, isBaseGame: true, tags: ['Party'] },
    ];
    const tiedPlays = [
      { gameId: 2, date: '2024-01-01', durationMin: 60 },
    ];

    const result = getTopGamesByTag(tiedGames, tiedPlays, Metric.PLAYS);
    // Yankee has a play (metric 1) so it outranks Zeta despite the later name
    expect(result[0].games.map(g => g.game.name)).toEqual(['Yankee', 'Zeta']);
  });

  test('breaks full ties (rating and metric equal) by game name', () => {
    const tiedGames = [
      { id: 1, name: 'Zeta', rating: 8, isBaseGame: true, tags: ['Party'] },
      { id: 2, name: 'Yankee', rating: 8, isBaseGame: true, tags: ['Party'] },
    ];

    // No plays: both have metric value 0, so ordering falls through to name
    const result = getTopGamesByTag(tiedGames, [], Metric.PLAYS);
    expect(result[0].games.map(g => g.game.name)).toEqual(['Yankee', 'Zeta']);
  });

  test('treats plays with missing duration as zero minutes', () => {
    const durationGames = [
      { id: 1, name: 'Alpha', rating: 8, isBaseGame: true, tags: ['Party'] },
    ];
    const durationPlays = [
      { gameId: 1, date: '2024-01-01', durationMin: 90 },
      { gameId: 1, date: '2024-01-02' }, // missing durationMin
    ];

    const result = getTopGamesByTag(durationGames, durationPlays, Metric.HOURS);
    expect(result[0].games[0].metricValue).toBe(1.5); // 90 minutes only
  });

  test('orders multiple unrated games by name', () => {
    const unratedGames = [
      { id: 1, name: 'Yankee', rating: null, isBaseGame: true, tags: ['Party'] },
      { id: 2, name: 'Xray', rating: null, isBaseGame: true, tags: ['Party'] },
      { id: 3, name: 'Zulu', rating: 6, isBaseGame: true, tags: ['Party'] },
    ];

    const result = getTopGamesByTag(unratedGames, [], Metric.PLAYS);
    // Rated Zulu first, then unrated Xray/Yankee alphabetically
    expect(result[0].games.map(g => g.game.name)).toEqual(['Zulu', 'Xray', 'Yankee']);
  });

  test('returns an empty array when no base games have tags', () => {
    const result = getTopGamesByTag([{ id: 1, name: 'X', rating: 5, isBaseGame: true, tags: [] }], [], Metric.PLAYS);
    expect(result).toEqual([]);
  });
});
