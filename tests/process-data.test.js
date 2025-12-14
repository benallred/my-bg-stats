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

    test('extracts copyId from copy uuid', () => {
      const output = processData(minimalFixture);
      const game = output.games.find(g => g.name === 'Test Base Game');

      expect(game.copies[0].copyId).toBe('copy-uuid-1');
    });

    test('extracts price information from metaData JSON', () => {
      const output = processData(minimalFixture);
      const game = output.games.find(g => g.name === 'Test Base Game');

      expect(game.copies[0].pricePaid).toBe(29.99);
      expect(game.copies[0].currency).toBe('USD');
    });

    test('handles missing price data', () => {
      const output = processData(minimalFixture);
      const game = output.games.find(g => g.name === 'Test Expansion');

      expect(game.copies[0].pricePaid).toBeNull();
      expect(game.copies[0].currency).toBeNull();
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
            uuid: 'test-uuid',
            statusOwned: true,
            metaData: '{invalid json'
          }]
        }]
      };

      const output = processData(fixtureWithBadJSON);
      expect(output.games[0].copies[0].acquisitionDate).toBeNull();
      expect(output.games[0].copies[0].pricePaid).toBeNull();
      expect(output.games[0].copies[0].currency).toBeNull();
    });

    test('extracts versionName from copy', () => {
      const output = processData(typicalFixture);
      const game = output.games.find(g => g.name === 'Multiple Copies Game');

      expect(game.copies[0].versionName).toBe('English second edition');
      expect(game.copies[1].versionName).toBeNull();
    });

    test('handles missing versionName as null', () => {
      const output = processData(minimalFixture);
      const game = output.games.find(g => g.name === 'Test Base Game');

      expect(game.copies[0].versionName).toBeNull();
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

    test('extracts copyId from playUsedGameCopy in metaData', () => {
      const output = processData(minimalFixture);
      const play = output.plays.find(p => p.gameId === 1);

      expect(play.copyId).toBe('copy-uuid-1');
    });

    test('handles missing playUsedGameCopy in metaData', () => {
      const fixtureWithoutCopyRef = {
        ...minimalFixture,
        games: minimalFixture.games,
        plays: [{
          gameRefId: 1,
          playDate: '2024-01-01 10:00:00',
          durationMin: 60,
          metaData: "{}"
        }]
      };

      const output = processData(fixtureWithoutCopyRef);
      // When playUsedGameCopy is not set and game is owned, assume my copy (earliest acquired)
      expect(output.plays[0].copyId).toBe('copy-uuid-1');
    });

    test('handles missing playUsedGameCopy for unowned game', () => {
      const fixtureUnownedGame = {
        userInfo: { meRefId: 1 },
        tags: [],
        players: [{ id: 1, name: "Player 1", isAnonymous: false }],
        locations: [{ id: 1, name: "Home" }],
        games: [{
          id: 1,
          name: "Unowned Game",
          bggId: 9001,
          bggYear: 2020,
          isBaseGame: 1,
          isExpansion: 0,
          copies: [{
            uuid: "unowned-copy-1",
            statusOwned: false,
            metaData: "{}"
          }],
          tags: []
        }],
        plays: [{
          gameRefId: 1,
          playDate: '2024-01-01 10:00:00',
          durationMin: 60,
          locationRefId: 1,
          playerScores: [{ playerRefId: 1 }],
          metaData: "{}"
        }]
      };

      const output = processData(fixtureUnownedGame);
      // When playUsedGameCopy is not set and game is NOT owned, copyId should be null
      expect(output.plays[0].copyId).toBeNull();
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

  describe('Image URL Processing', () => {
    test('preserves thumbnailUrl and coverUrl from source data', () => {
      const testData = {
        userInfo: { meRefId: 1 },
        tags: [],
        players: [],
        locations: [],
        games: [{
          id: 1,
          name: 'Test Game',
          isBaseGame: 1,
          bggId: 12345,
          copies: [],
          tags: [],
          urlThumb: 'https://cf.geekdo-images.com/test__thumb/img/abc.jpg',
          urlImage: 'https://cf.geekdo-images.com/test__original/img/xyz.jpg'
        }],
        plays: []
      };

      const output = processData(testData);
      const game = output.games.find(g => g.name === 'Test Game');

      expect(game.thumbnailUrl).toBe('https://cf.geekdo-images.com/test__thumb/img/abc.jpg');
      expect(game.coverUrl).toBe('https://cf.geekdo-images.com/test__original/img/xyz.jpg');
    });

    test('handles missing image URLs gracefully', () => {
      const testData = {
        userInfo: { meRefId: 1 },
        tags: [],
        players: [],
        locations: [],
        games: [{
          id: 1,
          name: 'Test Game',
          isBaseGame: 1,
          bggId: 12345,
          copies: [],
          tags: []
          // No urlThumb or urlImage
        }],
        plays: []
      };

      const output = processData(testData);
      const game = output.games.find(g => g.name === 'Test Game');

      expect(game.thumbnailUrl).toBeNull();
      expect(game.coverUrl).toBeNull();
    });

    test('handles null image URLs', () => {
      const testData = {
        userInfo: { meRefId: 1 },
        tags: [],
        players: [],
        locations: [],
        games: [{
          id: 1,
          name: 'Test Game',
          isBaseGame: 1,
          bggId: 12345,
          copies: [],
          tags: [],
          urlThumb: null,
          urlImage: null
        }],
        plays: []
      };

      const output = processData(testData);
      const game = output.games.find(g => g.name === 'Test Game');

      expect(game.thumbnailUrl).toBeNull();
      expect(game.coverUrl).toBeNull();
    });

    test('falls back to earliest owned copy image URLs when game URLs are missing', () => {
      const testData = {
        userInfo: { meRefId: 1 },
        tags: [],
        players: [],
        locations: [],
        games: [{
          id: 1,
          name: 'Test Game',
          isBaseGame: 1,
          bggId: 12345,
          copies: [
            {
              uuid: 'copy-2',
              statusOwned: true,
              metaData: '{"AcquisitionDate":"2024-06-01"}',
              urlThumb: 'https://cf.geekdo-images.com/later__thumb/img/wrong.jpg',
              urlImage: 'https://cf.geekdo-images.com/later__original/img/wrong.jpg'
            },
            {
              uuid: 'copy-1',
              statusOwned: true,
              metaData: '{"AcquisitionDate":"2024-01-01"}',
              urlThumb: 'https://cf.geekdo-images.com/earliest__thumb/img/abc.jpg',
              urlImage: 'https://cf.geekdo-images.com/earliest__original/img/xyz.jpg'
            }
          ],
          tags: []
          // No game-level urlThumb or urlImage
        }],
        plays: []
      };

      const output = processData(testData);
      const game = output.games.find(g => g.name === 'Test Game');

      expect(game.thumbnailUrl).toBe('https://cf.geekdo-images.com/earliest__thumb/img/abc.jpg');
      expect(game.coverUrl).toBe('https://cf.geekdo-images.com/earliest__original/img/xyz.jpg');
    });

    test('prefers game-level URLs over copy URLs', () => {
      const testData = {
        userInfo: { meRefId: 1 },
        tags: [],
        players: [],
        locations: [],
        games: [{
          id: 1,
          name: 'Test Game',
          isBaseGame: 1,
          bggId: 12345,
          urlThumb: 'https://cf.geekdo-images.com/game__thumb/img/abc.jpg',
          urlImage: 'https://cf.geekdo-images.com/game__original/img/xyz.jpg',
          copies: [{
            uuid: 'copy-1',
            statusOwned: true,
            urlThumb: 'https://cf.geekdo-images.com/copy__thumb/img/different.jpg',
            urlImage: 'https://cf.geekdo-images.com/copy__original/img/different.jpg'
          }],
          tags: []
        }],
        plays: []
      };

      const output = processData(testData);
      const game = output.games.find(g => g.name === 'Test Game');

      expect(game.thumbnailUrl).toBe('https://cf.geekdo-images.com/game__thumb/img/abc.jpg');
      expect(game.coverUrl).toBe('https://cf.geekdo-images.com/game__original/img/xyz.jpg');
    });
  });
});
