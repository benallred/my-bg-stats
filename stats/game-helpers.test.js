import { describe, test, expect } from 'vitest';
import {
  isGameOwned,
  wasGameAcquiredInYear,
  wasGameAcquiredInOrBeforeYear,
  getGameAcquisitionDate,
} from './game-helpers.js';
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

describe('wasGameAcquiredInOrBeforeYear', () => {
  test('returns true when game acquired in specified year', () => {
    const game = { copies: [{ acquisitionDate: '2021-06-15' }] };
    expect(wasGameAcquiredInOrBeforeYear(game, 2021)).toBe(true);
  });

  test('returns true when game acquired before specified year', () => {
    const game = { copies: [{ acquisitionDate: '2020-03-10' }] };
    expect(wasGameAcquiredInOrBeforeYear(game, 2021)).toBe(true);
  });

  test('returns false when game acquired after specified year', () => {
    const game = { copies: [{ acquisitionDate: '2022-01-01' }] };
    expect(wasGameAcquiredInOrBeforeYear(game, 2021)).toBe(false);
  });

  test('returns false when game has no acquisition date', () => {
    const game = { copies: [{ statusOwned: true }] };
    expect(wasGameAcquiredInOrBeforeYear(game, 2021)).toBe(false);
  });

  test('returns false when game has empty copies array', () => {
    const game = { copies: [] };
    expect(wasGameAcquiredInOrBeforeYear(game, 2021)).toBe(false);
  });

  test('returns false when game has no copies property', () => {
    const game = {};
    expect(wasGameAcquiredInOrBeforeYear(game, 2021)).toBe(false);
  });

  test('returns true if any copy was acquired in or before year', () => {
    const game = {
      copies: [
        { acquisitionDate: '2023-01-01' },
        { acquisitionDate: '2020-05-01' },
      ],
    };
    expect(wasGameAcquiredInOrBeforeYear(game, 2021)).toBe(true);
  });
});

describe('getGameAcquisitionDate', () => {
  test('returns earliest acquisition date from copies', () => {
    const game = {
      copies: [
        { acquisitionDate: '2022-06-15' },
        { acquisitionDate: '2021-03-10' },
        { acquisitionDate: '2023-01-01' },
      ],
    };
    expect(getGameAcquisitionDate(game)).toBe('2021-03-10');
  });

  test('returns single acquisition date when one copy', () => {
    const game = { copies: [{ acquisitionDate: '2021-06-15' }] };
    expect(getGameAcquisitionDate(game)).toBe('2021-06-15');
  });

  test('returns null when no copies have acquisition date', () => {
    const game = { copies: [{ statusOwned: true }, { statusOwned: false }] };
    expect(getGameAcquisitionDate(game)).toBeNull();
  });

  test('returns null when copies array is empty', () => {
    const game = { copies: [] };
    expect(getGameAcquisitionDate(game)).toBeNull();
  });

  test('returns null when game has no copies property', () => {
    const game = {};
    expect(getGameAcquisitionDate(game)).toBeNull();
  });

  test('ignores copies without acquisition dates', () => {
    const game = {
      copies: [
        { statusOwned: true },
        { acquisitionDate: '2021-06-15' },
        { statusOwned: false },
      ],
    };
    expect(getGameAcquisitionDate(game)).toBe('2021-06-15');
  });
});
