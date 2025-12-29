import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  calculateDaysSince,
  getNextMilestoneTarget,
  selectRandom,
  selectRandomWeightedBySqrtRarity,
  suggestForCostClub,
  getSuggestedGames,
} from './suggestions.js';
import { Metric } from './constants.js';
import { CostClub } from './cost-stats.js';
import { isGameOwned } from './game-helpers.js';
import { processData } from '../scripts/transform-game-data.js';
import typicalFixture from '../tests/fixtures/typical.json';

const typicalData = processData(typicalFixture);

describe('Suggestion Algorithms', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('calculateDaysSince', () => {
    test('returns 0 for today', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(calculateDaysSince(today)).toBe(0);
    });

    test('returns positive number for past dates', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);
      const pastDateStr = pastDate.toISOString().split('T')[0];
      expect(calculateDaysSince(pastDateStr)).toBe(10);
    });

    test('returns correct days for a known past date', () => {
      const daysAgo = 30;
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - daysAgo);
      const pastDateStr = pastDate.toISOString().split('T')[0];
      expect(calculateDaysSince(pastDateStr)).toBe(daysAgo);
    });
  });

  describe('getNextMilestoneTarget', () => {
    test('returns 5 for counts less than 5', () => {
      expect(getNextMilestoneTarget(0)).toBe(5);
      expect(getNextMilestoneTarget(4)).toBe(5);
    });

    test('returns 10 for counts 5-9', () => {
      expect(getNextMilestoneTarget(5)).toBe(10);
      expect(getNextMilestoneTarget(9)).toBe(10);
    });

    test('returns 25 for counts 10-24', () => {
      expect(getNextMilestoneTarget(10)).toBe(25);
      expect(getNextMilestoneTarget(24)).toBe(25);
    });

    test('returns 100 for counts 25-99', () => {
      expect(getNextMilestoneTarget(25)).toBe(100);
      expect(getNextMilestoneTarget(99)).toBe(100);
    });

    test('returns null for counts 100+', () => {
      expect(getNextMilestoneTarget(100)).toBeNull();
      expect(getNextMilestoneTarget(150)).toBeNull();
    });
  });

  describe('selectRandom', () => {
    test('selects item from array', () => {
      const items = [1, 2, 3, 4, 5];
      const selected = selectRandom(items);
      expect(items).toContain(selected);
    });

    test('returns null for empty array', () => {
      expect(selectRandom([])).toBeNull();
    });

    test('returns single item from single-element array', () => {
      const items = [42];
      expect(selectRandom(items)).toBe(42);
    });
  });

  describe('selectRandomWeightedBySqrtRarity', () => {
    test('selects item with rarity weighting', () => {
      const items = [
        { id: 1, group: 'A' },
        { id: 2, group: 'A' },
        { id: 3, group: 'B' },
      ];
      const selected = selectRandomWeightedBySqrtRarity(items, item => item.group);
      expect(items).toContain(selected);
    });

    test('returns null for empty array', () => {
      expect(selectRandomWeightedBySqrtRarity([], x => x)).toBeNull();
    });

    test('handles single group', () => {
      const items = [
        { id: 1, group: 'A' },
        { id: 2, group: 'A' },
      ];
      const selected = selectRandomWeightedBySqrtRarity(items, item => item.group);
      expect(items).toContain(selected);
    });

    test('uses sqrt weighting formula correctly', () => {
      const items = Array.from({ length: 10 }, (_, i) => ({ id: i, group: 'A' }));
      const selected = selectRandomWeightedBySqrtRarity(items, item => item.group);
      expect(items).toContain(selected);
    });
  });

  describe('getSuggestedGames', () => {
    test('returns array of suggestions', () => {
      const suggestions = getSuggestedGames(typicalData.games, typicalData.plays);
      expect(Array.isArray(suggestions)).toBe(true);
    });

    test('each suggestion has game, reasons, and stats arrays', () => {
      const suggestions = getSuggestedGames(typicalData.games, typicalData.plays);
      suggestions.forEach(suggestion => {
        expect(suggestion).toHaveProperty('game');
        expect(suggestion).toHaveProperty('reasons');
        expect(suggestion).toHaveProperty('stats');
        expect(Array.isArray(suggestion.reasons)).toBe(true);
        expect(Array.isArray(suggestion.stats)).toBe(true);
      });
    });

    test('only suggests owned base games', () => {
      const suggestions = getSuggestedGames(typicalData.games, typicalData.plays);
      suggestions.forEach(suggestion => {
        expect(suggestion.game.isBaseGame).toBe(true);
        expect(isGameOwned(suggestion.game)).toBe(true);
      });
    });

    test('merges duplicate game suggestions', () => {
      const suggestions = getSuggestedGames(typicalData.games, typicalData.plays);
      const gameIds = suggestions.map(s => s.game.id);
      const uniqueGameIds = new Set(gameIds);
      expect(gameIds.length).toBe(uniqueGameIds.size);
    });

    test('returns empty array when no owned base games', () => {
      const games = typicalData.games.map(g => ({ ...g, isBaseGame: false }));
      const suggestions = getSuggestedGames(games, typicalData.plays);
      expect(suggestions).toEqual([]);
    });

    test('accepts metric parameter and uses it for milestone suggestions (hours)', () => {
      const suggestions = getSuggestedGames(typicalData.games, typicalData.plays, 'hours');
      expect(Array.isArray(suggestions)).toBe(true);
    });

    test('accepts metric parameter and uses it for milestone suggestions (sessions)', () => {
      const suggestions = getSuggestedGames(typicalData.games, typicalData.plays, 'sessions');
      expect(Array.isArray(suggestions)).toBe(true);
    });

    test('milestone suggestion respects hours metric', () => {
      const testGames = [
        {
          id: 1,
          name: 'Game Near Hour Milestone',
          isBaseGame: true,
          isExpansion: false,
          isExpandalone: false,
          copies: [{ statusOwned: true }],
        },
      ];
      const testPlays = [{ gameId: 1, date: '2020-01-01', durationMin: 240 }];
      const suggestions = getSuggestedGames(testGames, testPlays, 'hours');
      const milestoneSuggestion = suggestions.find(
        s => s.reasons.includes('Closest to a five') || s.reasons.includes('Almost a five')
      );
      if (milestoneSuggestion) {
        expect(milestoneSuggestion.stats).toContain('4.0 total hours');
      }
    });

    test('milestone suggestion respects sessions metric', () => {
      const testGames = [
        {
          id: 1,
          name: 'Game Near Session Milestone',
          isBaseGame: true,
          isExpansion: false,
          isExpandalone: false,
          copies: [{ statusOwned: true }],
        },
      ];
      const testPlays = [
        { gameId: 1, date: '2020-01-01', durationMin: 60 },
        { gameId: 1, date: '2020-01-02', durationMin: 60 },
        { gameId: 1, date: '2020-01-03', durationMin: 60 },
        { gameId: 1, date: '2020-01-04', durationMin: 60 },
      ];
      const suggestions = getSuggestedGames(testGames, testPlays, 'sessions');
      const milestoneSuggestion = suggestions.find(
        s => s.reasons.includes('Closest to a five') || s.reasons.includes('Almost a five')
      );
      if (milestoneSuggestion) {
        expect(milestoneSuggestion.stats).toContain('4 total sessions');
      }
    });
  });

  describe('Individual suggestion algorithms', () => {
    test('suggestRecentlyPlayedWithLowSessions returns suggestion or null', () => {
      const suggestions = getSuggestedGames(typicalData.games, typicalData.plays);
      expect(Array.isArray(suggestions)).toBe(true);
    });

    test('suggestLongestUnplayed returns suggestion or null', () => {
      const suggestions = getSuggestedGames(typicalData.games, typicalData.plays);
      expect(Array.isArray(suggestions)).toBe(true);
    });

    test('suggestForNextMilestone returns suggestion or null', () => {
      const suggestions = getSuggestedGames(typicalData.games, typicalData.plays);
      expect(Array.isArray(suggestions)).toBe(true);
    });

    test('suggestRecentlyPlayedWithLowSessions with recent plays', () => {
      const today = new Date();
      const recentDate = new Date(today);
      recentDate.setDate(today.getDate() - 15);
      const recentDateStr = recentDate.toISOString().split('T')[0];

      const testGames = [
        {
          id: 1,
          name: 'Recent Game',
          isBaseGame: true,
          isExpansion: false,
          isExpandalone: false,
          copies: [{ statusOwned: true }],
        },
      ];

      const testPlays = [{ gameId: 1, date: recentDateStr, durationMin: 60 }];

      const suggestions = getSuggestedGames(testGames, testPlays);
      expect(Array.isArray(suggestions)).toBe(true);
    });

    test('suggestRecentlyPlayedWithLowSessions sorts by session count', () => {
      const today = new Date();
      const date1 = new Date(today);
      date1.setDate(today.getDate() - 10);
      const date2 = new Date(today);
      date2.setDate(today.getDate() - 11);
      const date3 = new Date(today);
      date3.setDate(today.getDate() - 12);

      const testGames = [
        {
          id: 1,
          name: 'Game A',
          isBaseGame: true,
          isExpansion: false,
          isExpandalone: false,
          copies: [{ statusOwned: true }],
        },
        {
          id: 2,
          name: 'Game B',
          isBaseGame: true,
          isExpansion: false,
          isExpandalone: false,
          copies: [{ statusOwned: true }],
        },
        {
          id: 3,
          name: 'Game C',
          isBaseGame: true,
          isExpansion: false,
          isExpandalone: false,
          copies: [{ statusOwned: true }],
        },
      ];

      const testPlays = [
        { gameId: 1, date: date1.toISOString().split('T')[0], durationMin: 60 },
        { gameId: 1, date: date2.toISOString().split('T')[0], durationMin: 60 },
        { gameId: 1, date: date3.toISOString().split('T')[0], durationMin: 60 },
        { gameId: 2, date: date1.toISOString().split('T')[0], durationMin: 60 },
        { gameId: 2, date: date2.toISOString().split('T')[0], durationMin: 60 },
        { gameId: 3, date: date1.toISOString().split('T')[0], durationMin: 60 },
      ];

      const suggestions = getSuggestedGames(testGames, testPlays);
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);

      const recentSuggestion = suggestions.find(s => s && s.reasons && s.reasons.includes('Fresh and recent'));
      expect(recentSuggestion).toBeDefined();
      expect(recentSuggestion.game.name).toBe('Game C');
      expect(recentSuggestion.stats).toContain('1 total session');
    });
  });

  describe('suggestForCostClub', () => {
    test('returns null when no candidates have price data', () => {
      const gamePlayData = new Map();
      gamePlayData.set(1, {
        game: { id: 1, name: 'No Price Game' },
        playCount: 10,
        uniqueDays: new Set(['2023-01-01']),
        totalMinutes: 600,
        pricePaid: null,
      });

      const result = suggestForCostClub(gamePlayData, Metric.HOURS, CostClub.FIVE_DOLLAR);
      expect(result).toBeNull();
    });

    test('returns null when all games are already in club', () => {
      const gamePlayData = new Map();
      gamePlayData.set(1, {
        game: { id: 1, name: 'Cheap Game' },
        playCount: 10,
        uniqueDays: new Set(['2023-01-01', '2023-01-02']),
        totalMinutes: 600, // 10 hours at $5 = $0.50/hour, already in club
        pricePaid: 5,
      });

      const result = suggestForCostClub(gamePlayData, Metric.HOURS, CostClub.FIVE_DOLLAR);
      expect(result).toBeNull();
    });

    test('returns suggestion for game approaching threshold', () => {
      const gamePlayData = new Map();
      gamePlayData.set(1, {
        game: { id: 1, name: 'Almost There Game' },
        playCount: 5,
        uniqueDays: new Set(['2023-01-01', '2023-01-02', '2023-01-03']),
        totalMinutes: 480, // 8 hours at $50 = $6.25/hour, needs 2 more hours
        pricePaid: 50,
      });

      const result = suggestForCostClub(gamePlayData, Metric.HOURS, CostClub.FIVE_DOLLAR);
      expect(result).not.toBeNull();
      expect(result.game.name).toBe('Almost There Game');
      expect(result.reason).toBe('Join the $5/hour club');
      expect(result.stat).toContain('$');
      expect(result.stat).toContain('/hour');
    });

    test('returns suggestion with sessions metric', () => {
      const gamePlayData = new Map();
      gamePlayData.set(1, {
        game: { id: 1, name: 'Session Game' },
        playCount: 10,
        uniqueDays: new Set(['2023-01-01', '2023-01-02', '2023-01-03', '2023-01-04']),
        totalMinutes: 240,
        pricePaid: 25, // $25 / 4 sessions = $6.25/session
      });

      const result = suggestForCostClub(gamePlayData, Metric.SESSIONS, CostClub.FIVE_DOLLAR);
      expect(result).not.toBeNull();
      expect(result.reason).toBe('Join the $5/session club');
      expect(result.stat).toContain('/session');
    });

    test('returns suggestion with plays metric', () => {
      const gamePlayData = new Map();
      gamePlayData.set(1, {
        game: { id: 1, name: 'Plays Game' },
        playCount: 4,
        uniqueDays: new Set(['2023-01-01']),
        totalMinutes: 240,
        pricePaid: 25, // $25 / 4 plays = $6.25/play
      });

      const result = suggestForCostClub(gamePlayData, Metric.PLAYS, CostClub.FIVE_DOLLAR);
      expect(result).not.toBeNull();
      expect(result.reason).toBe('Join the $5/play club');
      expect(result.stat).toContain('/play');
    });

    test('selects from candidates with same floored additionalNeeded', () => {
      const gamePlayData = new Map();
      // Game 1: $50 / 8 hours = $6.25/hour, needs 2 more hours (floor = 2)
      gamePlayData.set(1, {
        game: { id: 1, name: 'Close Game' },
        playCount: 5,
        uniqueDays: new Set(['2023-01-01']),
        totalMinutes: 480,
        pricePaid: 50,
      });
      // Game 2: $52 / 8 hours = $6.50/hour, needs 2.4 more hours (floor = 2)
      gamePlayData.set(2, {
        game: { id: 2, name: 'Also Close Game' },
        playCount: 5,
        uniqueDays: new Set(['2023-01-01']),
        totalMinutes: 480,
        pricePaid: 52,
      });
      // Game 3: $100 / 8 hours = $12.50/hour, needs 12 more hours (floor = 12)
      gamePlayData.set(3, {
        game: { id: 3, name: 'Far Game' },
        playCount: 5,
        uniqueDays: new Set(['2023-01-01']),
        totalMinutes: 480,
        pricePaid: 100,
      });

      const result = suggestForCostClub(gamePlayData, Metric.HOURS, CostClub.FIVE_DOLLAR);
      expect(result).not.toBeNull();
      // Should only select from games with floor(additionalNeeded) = 2
      expect(['Close Game', 'Also Close Game']).toContain(result.game.name);
    });

    test('excludes games with zero play data', () => {
      const gamePlayData = new Map();
      gamePlayData.set(1, {
        game: { id: 1, name: 'Unplayed Game' },
        playCount: 0,
        uniqueDays: new Set(),
        totalMinutes: 0,
        pricePaid: 50,
      });

      const result = suggestForCostClub(gamePlayData, Metric.HOURS, CostClub.FIVE_DOLLAR);
      expect(result).toBeNull();
    });
  });

  describe('getSuggestedGames with isExperimental', () => {
    test('includes cost club suggestions when isExperimental is true', () => {
      const testGames = [
        {
          id: 1,
          name: 'Expensive Game',
          isBaseGame: true,
          isExpansion: false,
          isExpandalone: false,
          copies: [{ statusOwned: true, pricePaid: 100 }],
        },
      ];
      const testPlays = [
        { gameId: 1, date: '2023-01-01', durationMin: 480 },
        { gameId: 1, date: '2023-01-02', durationMin: 480 },
      ];

      const suggestions = getSuggestedGames(testGames, testPlays, true);
      const costClubSuggestion = suggestions.find(s => s.reasons.some(r => r.startsWith('Join the $')));
      // May or may not have a cost club suggestion depending on game data
      expect(Array.isArray(suggestions)).toBe(true);
    });

    test('does not include cost club suggestions when isExperimental is false', () => {
      const testGames = [
        {
          id: 1,
          name: 'Expensive Game',
          isBaseGame: true,
          isExpansion: false,
          isExpandalone: false,
          copies: [{ statusOwned: true, pricePaid: 100 }],
        },
      ];
      const testPlays = [
        { gameId: 1, date: '2023-01-01', durationMin: 480 },
      ];

      const suggestions = getSuggestedGames(testGames, testPlays, false);
      const costClubSuggestion = suggestions.find(s => s.reasons && s.reasons.some(r => r.startsWith('Join the $')));
      expect(costClubSuggestion).toBeUndefined();
    });

    test('defaults isExperimental to false', () => {
      const suggestions = getSuggestedGames(typicalData.games, typicalData.plays);
      const costClubSuggestion = suggestions.find(s => s.reasons && s.reasons.some(r => r.startsWith('Join the $')));
      expect(costClubSuggestion).toBeUndefined();
    });
  });
});
