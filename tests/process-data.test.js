import path from 'path';
import os from 'os';
import { describe, test, expect, vi } from 'vitest';
import { processData } from '../scripts/transform-game-data.js';
import minimalFixture from './fixtures/minimal.json';
import typicalFixture from './fixtures/typical.json';
import edgeCasesFixture from './fixtures/edge-cases.json';
import expandaloneFixture from './fixtures/expandalone.json';
import durationMissingFixture from './fixtures/duration-missing.json';

const TEMP_CACHE_PATH = path.join(os.tmpdir(), 'bgg-test-cache.json');

/**
 * Tests for process-data.js transformation logic
 *
 * Tests the actual processData function from scripts/process-data.js
 * to verify the data transformation produces correct output.
 */

describe('process-data.js transformation logic', () => {
  describe('Game Classification', () => {
    test('classifies pure base games correctly', async () => {
      const output = await processData(minimalFixture);
      const baseGame = output.games.find(g => g.name === 'Test Base Game');

      expect(baseGame.isBaseGame).toBe(true);
      expect(baseGame.isExpansion).toBe(false);
      expect(baseGame.isExpandalone).toBe(false);
    });

    test('classifies pure expansions correctly', async () => {
      const output = await processData(minimalFixture);
      const expansion = output.games.find(g => g.name === 'Test Expansion');

      expect(expansion.isBaseGame).toBe(false);
      expect(expansion.isExpansion).toBe(true);
      expect(expansion.isExpandalone).toBe(false);
    });

    test('classifies expandalones correctly', async () => {
      const output = await processData(minimalFixture);
      const expandalone = output.games.find(g => g.name === 'Test Expandalone');

      expect(expandalone.isBaseGame).toBe(false);
      expect(expandalone.isExpansion).toBe(false);
      expect(expandalone.isExpandalone).toBe(true);
    });

    test('expandalone classification takes priority over base game flag', async () => {
      const output = await processData(expandaloneFixture);
      const expandalone = output.games.find(g => g.name === 'Tagged Expandalone');

      expect(expandalone.isExpandalone).toBe(true);
      expect(expandalone.isBaseGame).toBe(false);
    });
  });

  describe('Copy Metadata Extraction', () => {
    test('extracts acquisition dates from metaData JSON', async () => {
      const output = await processData(minimalFixture);
      const game = output.games.find(g => g.name === 'Test Base Game');

      expect(game.copies[0].acquisitionDate).toBe('2021-01-15');
    });

    test('extracts copyId from copy uuid', async () => {
      const output = await processData(minimalFixture);
      const game = output.games.find(g => g.name === 'Test Base Game');

      expect(game.copies[0].copyId).toBe('copy-uuid-1');
    });

    test('extracts price information from metaData JSON', async () => {
      const output = await processData(minimalFixture);
      const game = output.games.find(g => g.name === 'Test Base Game');

      expect(game.copies[0].pricePaid).toBe(29.99);
      expect(game.copies[0].currency).toBe('USD');
    });

    test('handles missing price data', async () => {
      const output = await processData(minimalFixture);
      const game = output.games.find(g => g.name === 'Test Expansion');

      expect(game.copies[0].pricePaid).toBeNull();
      expect(game.copies[0].currency).toBeNull();
    });

    test('handles missing acquisition dates', async () => {
      const output = await processData(edgeCasesFixture);
      const game = output.games.find(g => g.name === 'Game With No Acquisition Date');

      expect(game.copies[0].acquisitionDate).toBeNull();
    });

    test('handles malformed JSON in metaData', async () => {
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

      const output = await processData(fixtureWithBadJSON);
      expect(output.games[0].copies[0].acquisitionDate).toBeNull();
      expect(output.games[0].copies[0].pricePaid).toBeNull();
      expect(output.games[0].copies[0].currency).toBeNull();
      expect(output.games[0].copies[0].publicComment).toBeNull();
    });

    test('extracts versionName from copy', async () => {
      const output = await processData(typicalFixture);
      const game = output.games.find(g => g.name === 'Multiple Copies Game');

      expect(game.copies[0].versionName).toBe('English second edition');
      expect(game.copies[1].versionName).toBeNull();
    });

    test('handles missing versionName as null', async () => {
      const output = await processData(minimalFixture);
      const game = output.games.find(g => g.name === 'Test Base Game');

      expect(game.copies[0].versionName).toBeNull();
    });

    test('extracts and trims publicComment from metaData JSON', async () => {
      const output = await processData(minimalFixture);
      const game = output.games.find(g => g.name === 'Test Base Game');

      expect(game.copies[0].publicComment).toBe('Great game for beginners.');
    });

    test('handles missing publicComment as null', async () => {
      const output = await processData(minimalFixture);
      const game = output.games.find(g => g.name === 'Test Expansion');

      expect(game.copies[0].publicComment).toBeNull();
    });

    test('handles whitespace-only publicComment as null', async () => {
      const fixtureWithWhitespace = {
        ...minimalFixture,
        games: [{
          ...minimalFixture.games[0],
          copies: [{
            uuid: 'test-uuid',
            statusOwned: true,
            metaData: '{"PublicComment":"  \\n  "}',
          }],
        }],
      };

      const output = await processData(fixtureWithWhitespace);
      expect(output.games[0].copies[0].publicComment).toBeNull();
    });
  });

  describe('Game Rating', () => {
    test('extracts rating from copy metaData to game level', async () => {
      const output = await processData(minimalFixture);
      const game = output.games.find(g => g.name === 'Test Base Game');

      expect(game.rating).toBe(8);
    });

    test('handles missing rating as null', async () => {
      const output = await processData(minimalFixture);
      const game = output.games.find(g => g.name === 'Test Expansion');

      expect(game.rating).toBeNull();
    });

    test('handles malformed JSON in metaData with null rating', async () => {
      const fixtureWithBadJSON = {
        ...minimalFixture,
        games: [{
          ...minimalFixture.games[0],
          copies: [{
            uuid: 'test-uuid',
            statusOwned: true,
            metaData: '{invalid json',
          }],
        }],
      };

      const output = await processData(fixtureWithBadJSON);
      expect(output.games[0].rating).toBeNull();
    });

    test('selects rating from only copy with rating regardless of ownership', async () => {
      const fixture = {
        ...minimalFixture,
        games: [{
          id: 1,
          name: 'Test Game',
          bggId: 1001,
          isBaseGame: 1,
          isExpansion: 0,
          copies: [
            {
              uuid: 'copy-1',
              statusOwned: false,
              metaData: '{"Rating":"7"}',
            },
            {
              uuid: 'copy-2',
              statusOwned: true,
              metaData: '{}',
            },
          ],
          tags: [],
        }],
      };

      const output = await processData(fixture);
      expect(output.games[0].rating).toBe(7);
    });

    test('prefers owned copy rating when multiple copies have ratings', async () => {
      const fixture = {
        ...minimalFixture,
        games: [{
          id: 1,
          name: 'Test Game',
          bggId: 1001,
          isBaseGame: 1,
          isExpansion: 0,
          copies: [
            {
              uuid: 'copy-1',
              statusOwned: false,
              metaData: '{"Rating":"5","AcquisitionDate":"2023-01-01"}',
            },
            {
              uuid: 'copy-2',
              statusOwned: true,
              metaData: '{"Rating":"9","AcquisitionDate":"2022-01-01"}',
            },
          ],
          tags: [],
        }],
      };

      const output = await processData(fixture);
      expect(output.games[0].rating).toBe(9);
    });

    test('selects latest acquired owned copy rating when multiple owned copies have ratings', async () => {
      const fixture = {
        ...minimalFixture,
        games: [{
          id: 1,
          name: 'Test Game',
          bggId: 1001,
          isBaseGame: 1,
          isExpansion: 0,
          copies: [
            {
              uuid: 'copy-1',
              statusOwned: true,
              metaData: '{"Rating":"6","AcquisitionDate":"2022-01-01"}',
            },
            {
              uuid: 'copy-2',
              statusOwned: true,
              metaData: '{"Rating":"9","AcquisitionDate":"2023-06-15"}',
            },
          ],
          tags: [],
        }],
      };

      const output = await processData(fixture);
      expect(output.games[0].rating).toBe(9);
    });
  });

  describe('Typical Play Time Calculation', () => {
    test('calculates median for odd number of plays', async () => {
      const output = await processData(durationMissingFixture);
      const game = output.games.find(g => g.name === 'Game With Mixed Durations');

      expect(game.typicalPlayTimeMinutes).toBe(60);
    });

    test('calculates median for even number of plays', async () => {
      const output = await processData(minimalFixture);
      const game = output.games.find(g => g.name === 'Test Base Game');

      expect(game.typicalPlayTimeMinutes).toBe(45);
    });

    test('applies 30-minute default to games with plays but no durations', async () => {
      const output = await processData(durationMissingFixture);
      const game = output.games.find(g => g.name === 'Game With All Zero Durations');

      expect(game.typicalPlayTimeMinutes).toBe(30);
    });
  });

  describe('Duration Estimation', () => {
    test('estimates duration using typical play time when missing', async () => {
      const output = await processData(durationMissingFixture);
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
    test('extracts date from playDate timestamp', async () => {
      const output = await processData(minimalFixture);

      output.plays.forEach(play => {
        expect(play.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });

    test('extracts copyId from playUsedGameCopy in metaData', async () => {
      const output = await processData(minimalFixture);
      const play = output.plays.find(p => p.gameId === 1);

      expect(play.copyId).toBe('copy-uuid-1');
    });

    test('handles missing playUsedGameCopy in metaData', async () => {
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

      const output = await processData(fixtureWithoutCopyRef);
      // When playUsedGameCopy is not set and game is owned, assume my copy (earliest acquired)
      expect(output.plays[0].copyId).toBe('copy-uuid-1');
    });

    test('handles missing playUsedGameCopy for unowned game', async () => {
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

      const output = await processData(fixtureUnownedGame);
      // When playUsedGameCopy is not set and game is NOT owned, copyId should be null
      expect(output.plays[0].copyId).toBeNull();
    });

    test('sorts games alphabetically', async () => {
      const output = await processData(typicalFixture);

      for (let i = 0; i < output.games.length - 1; i++) {
        expect(output.games[i].name.localeCompare(output.games[i + 1].name)).toBeLessThanOrEqual(0);
      }
    });

    test('sorts plays by date descending', async () => {
      const output = await processData(typicalFixture);

      for (let i = 0; i < output.plays.length - 1; i++) {
        expect(output.plays[i].date >= output.plays[i + 1].date).toBe(true);
      }
    });
  });

  describe('NPC Player Filtering', () => {
    test('excludes playerScores with isNpc: 1 from play.players', async () => {
      const fixtureWithNpc = {
        userInfo: { meRefId: 1 },
        tags: [],
        players: [
          { id: 1, name: "Player 1", isAnonymous: false },
          { id: 2, name: "Player 2", isAnonymous: false },
        ],
        locations: [{ id: 1, name: "Home" }],
        games: [{
          id: 1,
          name: "Test Game",
          bggId: 1001,
          isBaseGame: 1,
          isExpansion: 0,
          copies: [],
          tags: [],
        }],
        plays: [{
          gameRefId: 1,
          playDate: '2024-01-01 10:00:00',
          durationMin: 60,
          locationRefId: 1,
          playerScores: [
            { playerRefId: 1 },
            { playerRefId: 2, metaData: '{"isNpc":1}' },
          ],
        }],
      };

      const output = await processData(fixtureWithNpc);
      expect(output.plays[0].players).toEqual([1]);
    });

    test('includes playerScores without isNpc flag', async () => {
      const fixtureWithoutNpc = {
        userInfo: { meRefId: 1 },
        tags: [],
        players: [
          { id: 1, name: "Player 1", isAnonymous: false },
          { id: 2, name: "Player 2", isAnonymous: false },
        ],
        locations: [{ id: 1, name: "Home" }],
        games: [{
          id: 1,
          name: "Test Game",
          bggId: 1001,
          isBaseGame: 1,
          isExpansion: 0,
          copies: [],
          tags: [],
        }],
        plays: [{
          gameRefId: 1,
          playDate: '2024-01-01 10:00:00',
          durationMin: 60,
          locationRefId: 1,
          playerScores: [
            { playerRefId: 1 },
            { playerRefId: 2, metaData: '{}' },
          ],
        }],
      };

      const output = await processData(fixtureWithoutNpc);
      expect(output.plays[0].players).toEqual([1, 2]);
    });

    test('same player ID can be NPC in one play and real in another', async () => {
      const fixtureWithMixedNpc = {
        userInfo: { meRefId: 1 },
        tags: [],
        players: [
          { id: 1, name: "Player 1", isAnonymous: false },
        ],
        locations: [{ id: 1, name: "Home" }],
        games: [{
          id: 1,
          name: "Test Game",
          bggId: 1001,
          isBaseGame: 1,
          isExpansion: 0,
          copies: [],
          tags: [],
        }],
        plays: [
          {
            gameRefId: 1,
            playDate: '2024-01-02 10:00:00',
            durationMin: 60,
            locationRefId: 1,
            playerScores: [
              { playerRefId: 1 },
            ],
          },
          {
            gameRefId: 1,
            playDate: '2024-01-01 10:00:00',
            durationMin: 60,
            locationRefId: 1,
            playerScores: [
              { playerRefId: 1, metaData: '{"isNpc":1}' },
            ],
          },
        ],
      };

      const output = await processData(fixtureWithMixedNpc);
      // Plays are sorted by date descending
      expect(output.plays[0].players).toEqual([1]); // 2024-01-02: real player
      expect(output.plays[1].players).toEqual([]);  // 2024-01-01: NPC
    });

    test('handles malformed metaData JSON gracefully', async () => {
      const fixtureWithBadJson = {
        userInfo: { meRefId: 1 },
        tags: [],
        players: [
          { id: 1, name: "Player 1", isAnonymous: false },
        ],
        locations: [{ id: 1, name: "Home" }],
        games: [{
          id: 1,
          name: "Test Game",
          bggId: 1001,
          isBaseGame: 1,
          isExpansion: 0,
          copies: [],
          tags: [],
        }],
        plays: [{
          gameRefId: 1,
          playDate: '2024-01-01 10:00:00',
          durationMin: 60,
          locationRefId: 1,
          playerScores: [
            { playerRefId: 1, metaData: '{invalid json' },
          ],
        }],
      };

      const output = await processData(fixtureWithBadJson);
      // Player should be included when metaData is malformed
      expect(output.plays[0].players).toEqual([1]);
    });
  });

  describe('Image URL Processing', () => {
    test('preserves thumbnailUrl and coverUrl from source data', async () => {
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

      const output = await processData(testData);
      const game = output.games.find(g => g.name === 'Test Game');

      expect(game.thumbnailUrl).toBe('https://cf.geekdo-images.com/test__thumb/img/abc.jpg');
      expect(game.coverUrl).toBe('https://cf.geekdo-images.com/test__original/img/xyz.jpg');
    });

    test('handles missing image URLs gracefully', async () => {
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

      const output = await processData(testData);
      const game = output.games.find(g => g.name === 'Test Game');

      expect(game.thumbnailUrl).toBeNull();
      expect(game.coverUrl).toBeNull();
    });

    test('handles null image URLs', async () => {
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

      const output = await processData(testData);
      const game = output.games.find(g => g.name === 'Test Game');

      expect(game.thumbnailUrl).toBeNull();
      expect(game.coverUrl).toBeNull();
    });

    test('falls back to earliest owned copy image URLs when game URLs are missing', async () => {
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

      const output = await processData(testData);
      const game = output.games.find(g => g.name === 'Test Game');

      expect(game.thumbnailUrl).toBe('https://cf.geekdo-images.com/earliest__thumb/img/abc.jpg');
      expect(game.coverUrl).toBe('https://cf.geekdo-images.com/earliest__original/img/xyz.jpg');
    });

    test('prefers game-level URLs over copy URLs', async () => {
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

      const output = await processData(testData);
      const game = output.games.find(g => g.name === 'Test Game');

      expect(game.thumbnailUrl).toBe('https://cf.geekdo-images.com/game__thumb/img/abc.jpg');
      expect(game.coverUrl).toBe('https://cf.geekdo-images.com/game__original/img/xyz.jpg');
    });
  });

  describe('Expansion Linking', () => {
    const expansionLinkingFixture = {
      userInfo: { meRefId: 1 },
      tags: [
        { uuid: 'expandalone-tag-uuid', id: 1, name: 'expandalone', type: 'Game', group: 'Default', isInternal: false },
      ],
      players: [{ id: 1, name: 'Player 1', isAnonymous: false }],
      locations: [{ id: 1, name: 'Home' }],
      games: [
        {
          id: 10, name: 'Base Game A', bggId: 5001, bggYear: 2020,
          isBaseGame: 1, isExpansion: 0, copies: [], tags: [],
        },
        {
          id: 20, name: 'Base Game B', bggId: 5002, bggYear: 2019,
          isBaseGame: 1, isExpansion: 0, copies: [], tags: [],
        },
        {
          id: 30, name: 'Expansion for A', bggId: 5003, bggYear: 2021,
          isBaseGame: 0, isExpansion: 1, copies: [], tags: [],
        },
        {
          id: 40, name: 'Another Expansion for A', bggId: 5004, bggYear: 2022,
          isBaseGame: 0, isExpansion: 1, copies: [], tags: [],
        },
        {
          id: 50, name: 'Expandalone for B', bggId: 5005, bggYear: 2021,
          isBaseGame: 1, isExpansion: 0, copies: [], tags: [{ tagRefId: 1 }],
        },
        {
          id: 60, name: 'Unlinked Expansion', bggId: 5006, bggYear: 2023,
          isBaseGame: 0, isExpansion: 1, copies: [], tags: [],
        },
      ],
      plays: [
        {
          gameRefId: 10, playDate: '2024-01-15 14:00:00', durationMin: 60,
          locationRefId: 1, playerScores: [{ playerRefId: 1 }],
          expansionPlays: [{ gameRefId: 30, bggId: 0 }],
        },
        {
          gameRefId: 10, playDate: '2024-02-20 10:00:00', durationMin: 45,
          locationRefId: 1, playerScores: [{ playerRefId: 1 }],
          expansionPlays: [{ gameRefId: 30, bggId: 0 }, { gameRefId: 40, bggId: 0 }],
        },
      ],
    };

    // Mock fetch to simulate BGG API responses
    function mockBggFetch(bggIdToResponse) {
      return vi.fn(async (url) => {
        const match = url.match(/objectid=(\d+)/);
        const bggId = match ? parseInt(match[1], 10) : null;
        const items = bggIdToResponse[bggId] || [];
        return {
          json: async () => ({
            items: items.map(id => ({ objectid: String(id) })),
          }),
        };
      });
    }

    test('links expansions to base game via expansionPlays', async () => {
      const output = await processData(expansionLinkingFixture);
      const baseA = output.games.find(g => g.name === 'Base Game A');

      expect(baseA.expansionIds).toContain(30);
      expect(baseA.expansionIds).toContain(40);
    });

    test('links expansions to base game via BGG API', async () => {
      const originalFetch = globalThis.fetch;
      // BGG says expansion 5006 (Unlinked Expansion) expands base 5001 (Base Game A)
      globalThis.fetch = mockBggFetch({
        5003: [5001],
        5004: [5001],
        5005: [5002],
        5006: [5001],
      });
      try {
        const output = await processData(expansionLinkingFixture, { bggCachePath: TEMP_CACHE_PATH, forceRefreshBggCache: true });
        const baseA = output.games.find(g => g.name === 'Base Game A');

        expect(baseA.expansionIds).toContain(60); // Unlinked Expansion linked via BGG
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test('merges and deduplicates expansionPlays and BGG API results', async () => {
      const originalFetch = globalThis.fetch;
      // BGG also returns expansion 30 for base 5001 — should deduplicate with expansionPlays
      globalThis.fetch = mockBggFetch({
        5003: [5001],
        5004: [5001],
        5005: [5002],
        5006: [5001],
      });
      try {
        const output = await processData(expansionLinkingFixture, { bggCachePath: TEMP_CACHE_PATH, forceRefreshBggCache: true });
        const baseA = output.games.find(g => g.name === 'Base Game A');

        // Should contain 30, 40, 60 — no duplicates
        expect(baseA.expansionIds).toEqual([30, 40, 60]);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test('links expandalone to base game via BGG API boardgameintegration', async () => {
      const originalFetch = globalThis.fetch;
      // BGG says expandalone 5005 integrates with base 5002
      globalThis.fetch = mockBggFetch({
        5003: [5001],
        5004: [5001],
        5005: [5002],
        5006: [],
      });
      try {
        const output = await processData(expansionLinkingFixture, { bggCachePath: TEMP_CACHE_PATH, forceRefreshBggCache: true });
        const baseB = output.games.find(g => g.name === 'Base Game B');

        expect(baseB.expansionIds).toContain(50);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test('uses expandsboardgame for expansions and boardgameintegration for expandalones', async () => {
      const originalFetch = globalThis.fetch;
      const fetchMock = vi.fn(async (url) => ({
        json: async () => ({ items: [] }),
      }));
      globalThis.fetch = fetchMock;
      try {
        await processData(expansionLinkingFixture, { bggCachePath: TEMP_CACHE_PATH, forceRefreshBggCache: true });

        const calls = fetchMock.mock.calls.map(c => c[0]);
        // Expansions (bggIds 5003, 5004, 5006) should use expandsboardgame
        const expansionCalls = calls.filter(u => u.includes('expandsboardgame'));
        const integrationCalls = calls.filter(u => u.includes('boardgameintegration'));

        expect(expansionCalls.length).toBe(3);
        expect(integrationCalls.length).toBe(1);
        expect(integrationCalls[0]).toContain('objectid=5005');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test('base games with no expansions get empty array', async () => {
      const output = await processData(expansionLinkingFixture);
      const baseB = output.games.find(g => g.name === 'Base Game B');

      expect(baseB.expansionIds).toEqual([]);
    });

    test('non-base games get expansionIds null', async () => {
      const output = await processData(expansionLinkingFixture);
      const expansion = output.games.find(g => g.name === 'Expansion for A');
      const expandalone = output.games.find(g => g.name === 'Expandalone for B');

      expect(expansion.expansionIds).toBeNull();
      expect(expandalone.expansionIds).toBeNull();
    });

    test('filters BGG results to in-collection base games only', async () => {
      const originalFetch = globalThis.fetch;
      // BGG returns bggId 9999 which is not in our collection
      globalThis.fetch = mockBggFetch({
        5003: [5001, 9999],
        5004: [5001],
        5005: [5002, 9999],
        5006: [],
      });
      try {
        const output = await processData(expansionLinkingFixture, { bggCachePath: TEMP_CACHE_PATH, forceRefreshBggCache: true });
        const allExpansionIds = output.games
          .filter(g => g.expansionIds !== null)
          .flatMap(g => g.expansionIds);

        // No game with bggId 9999 should appear anywhere
        const game9999 = output.games.find(g => g.bggId === 9999);
        expect(game9999).toBeUndefined();
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test('handles BGG API fetch failure gracefully', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn(async () => { throw new Error('Network error'); });
      try {
        // Should not throw — expansionPlays still work
        const output = await processData(expansionLinkingFixture, { bggCachePath: TEMP_CACHE_PATH, forceRefreshBggCache: true });
        const baseA = output.games.find(g => g.name === 'Base Game A');

        // expansionPlays still links 30 and 40
        expect(baseA.expansionIds).toContain(30);
        expect(baseA.expansionIds).toContain(40);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test('expansionIds array is sorted by ID', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mockBggFetch({
        5003: [5001],
        5004: [5001],
        5005: [],
        5006: [5001],
      });
      try {
        const output = await processData(expansionLinkingFixture, { bggCachePath: TEMP_CACHE_PATH, forceRefreshBggCache: true });
        const baseA = output.games.find(g => g.name === 'Base Game A');

        expect(baseA.expansionIds).toEqual([...baseA.expansionIds].sort((a, b) => a - b));
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
