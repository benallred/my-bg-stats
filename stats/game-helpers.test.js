import { describe, test, expect } from 'vitest';
import { isGameOwned, wasGameAcquiredInYear } from './game-helpers.js';
import { processData } from '../scripts/transform-game-data.js';
import minimalFixture from '../tests/fixtures/minimal.json';

const minimalData = processData(minimalFixture);

describe('isGameOwned', () => {
  test('returns true when game has owned copy', () => {
    const ownedGame = minimalData.games.find(g => g.name === 'Test Base Game');
    expect(isGameOwned(ownedGame)).toBe(true);
  });

  test('returns false when game has no owned copies', () => {
    const unownedGame = minimalData.games.find(g => g.name === 'Test Expandalone');
    expect(isGameOwned(unownedGame)).toBe(false);
  });

  test('returns false when game has empty copies array', () => {
    const game = { copies: [] };
    expect(isGameOwned(game)).toBe(false);
  });

  test('returns false when game has no copies property', () => {
    const game = {};
    expect(isGameOwned(game)).toBe(false);
  });
});

describe('wasGameAcquiredInYear', () => {
  test('returns true when game acquired in specified year', () => {
    const game = minimalData.games[0];
    expect(wasGameAcquiredInYear(game, 2021)).toBe(true);
  });

  test('returns false when game acquired in different year', () => {
    const game = minimalData.games[0];
    expect(wasGameAcquiredInYear(game, 2020)).toBe(false);
  });

  test('returns false when game has no acquisition date', () => {
    const game = minimalData.games[1];
    expect(wasGameAcquiredInYear(game, 2021)).toBe(false);
  });

  test('returns false when game has empty copies array', () => {
    const game = { copies: [] };
    expect(wasGameAcquiredInYear(game, 2021)).toBe(false);
  });

  test('returns false when game has no copies property', () => {
    const game = {};
    expect(wasGameAcquiredInYear(game, 2021)).toBe(false);
  });
});
