import { describe, test, expect } from 'vitest';
import { processData } from '../scripts/transform-game-data.js';
import minimalFixture from './fixtures/minimal.json';
import typicalFixture from './fixtures/typical.json';
import edgeCasesFixture from './fixtures/edge-cases.json';
import expandaloneFixture from './fixtures/expandalone.json';
import durationMissingFixture from './fixtures/duration-missing.json';

/**
 * Tests for process-data.js transformation logic
 *
 * Tests the actual processData function from scripts/process-data.js
 * to verify the data transformation produces correct output.
 */

describe('process-data.js transformation logic', () => {
  describe('Game Classification', () => {
    test('classifies pure base games correctly', () => {
      const output = processData(minimalFixture);
      const baseGame = output.games.find(g => g.name === 'Test Base Game');

      expect(baseGame.isBaseGame).toBe(true);
      expect(baseGame.isExpansion).toBe(false);
      expect(baseGame.isExpandalone).toBe(false);
    });

    test('classifies pure expansions correctly', () => {
      const output = processData(minimalFixture);
      const expansion = output.games.find(g => g.name === 'Test Expansion');

      expect(expansion.isBaseGame).toBe(false);
      expect(expansion.isExpansion).toBe(true);
      expect(expansion.isExpandalone).toBe(false);
    });

    test('classifies expandalones correctly', () => {
      const output = processData(minimalFixture);
      const expandalone = output.games.find(g => g.name === 'Test Expandalone');

      expect(expandalone.isBaseGame).toBe(false);
      expect(expandalone.isExpansion).toBe(false);
      expect(expandalone.isExpandalone).toBe(true);
    });

    test('expandalone classification takes priority over base game flag', () => {
      const output = processData(expandaloneFixture);
      const expandalone = output.games.find(g => g.name === 'Tagged Expandalone');

      expect(expandalone.isExpandalone).toBe(true);
      expect(expandalone.isBaseGame).toBe(false);
    });
  });

  describe('Copy Metadata Extraction', () => {
    test('extracts acquisition dates from metaData JSON', () => {
      const output = processData(minimalFixture);
      const game = output.games.find(g => g.name === 'Test Base Game');

      expect(game.copies[0].acquisitionDate).toBe('2021-01-15');
    });

    test('handles missing acquisition dates', () => {
      const output = processData(edgeCasesFixture);
      const game = output.games.find(g => g.name === 'Game With No Acquisition Date');

      expect(game.copies[0].acquisitionDate).toBeNull();
    });

    test('handles malformed JSON in metaData', () => {
      const fixtureWithBadJSON = {
        ...minimalFixture,
        games: [{
          ...minimalFixture.games[0],
          copies: [{
            statusOwned: true,
            metaData: '{invalid json'
          }]
        }]
      };

      const output = processData(fixtureWithBadJSON);
      expect(output.games[0].copies[0].acquisitionDate).toBeNull();
    });
  });

  describe('Typical Play Time Calculation', () => {
    test('calculates median for odd number of plays', () => {
      const output = processData(durationMissingFixture);
      const game = output.games.find(g => g.name === 'Game With Mixed Durations');

      expect(game.typicalPlayTimeMinutes).toBe(60);
    });

    test('calculates median for even number of plays', () => {
      const output = processData(minimalFixture);
      const game = output.games.find(g => g.name === 'Test Base Game');

      expect(game.typicalPlayTimeMinutes).toBe(45);
    });

    test('applies 30-minute default to games with plays but no durations', () => {
      const output = processData(durationMissingFixture);
      const game = output.games.find(g => g.name === 'Game With All Zero Durations');

      expect(game.typicalPlayTimeMinutes).toBe(30);
    });
  });

  describe('Duration Estimation', () => {
    test('estimates duration using typical play time when missing', () => {
      const output = processData(durationMissingFixture);
      const game = output.games.find(g => g.name === 'Game With All Zero Durations');
      const playsForGame = output.plays.filter(p => p.gameId === game.id);

      playsForGame.forEach(play => {
        if (play.durationMin > 0) {
          expect(play.durationEstimated).toBe(true);
          expect(play.durationMin).toBe(30);
        }
      });
    });
  });

  describe('Data Processing', () => {
    test('extracts date from playDate timestamp', () => {
      const output = processData(minimalFixture);

      output.plays.forEach(play => {
        expect(play.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });

    test('sorts games alphabetically', () => {
      const output = processData(typicalFixture);

      for (let i = 0; i < output.games.length - 1; i++) {
        expect(output.games[i].name.localeCompare(output.games[i + 1].name)).toBeLessThanOrEqual(0);
      }
    });

    test('sorts plays by date descending', () => {
      const output = processData(typicalFixture);

      for (let i = 0; i < output.plays.length - 1; i++) {
        expect(output.plays[i].date >= output.plays[i + 1].date).toBe(true);
      }
    });
  });
});
