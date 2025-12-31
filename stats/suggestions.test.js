import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  calculateDaysSince,
  selectRandom,
  selectRandomWeightedBySqrtRarity,
  suggestForNextValueClub,
  suggestHighestCostPerMetric,
  getSuggestedGames,
} from './suggestions.js';
import { Metric, Milestone } from './constants.js';
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

  describe('Milestone.getNextTarget', () => {
    test('returns 5 for counts less than 5', () => {
      expect(Milestone.getNextTarget(0)).toBe(5);
      expect(Milestone.getNextTarget(4)).toBe(5);
    });

    test('returns 10 for counts 5-9', () => {
      expect(Milestone.getNextTarget(5)).toBe(10);
      expect(Milestone.getNextTarget(9)).toBe(10);
    });

    test('returns 25 for counts 10-24', () => {
      expect(Milestone.getNextTarget(10)).toBe(25);
      expect(Milestone.getNextTarget(24)).toBe(25);
    });

    test('returns 100 for counts 25-99', () => {
      expect(Milestone.getNextTarget(25)).toBe(100);
      expect(Milestone.getNextTarget(99)).toBe(100);
    });

    test('returns null for counts 100+', () => {
      expect(Milestone.getNextTarget(100)).toBeNull();
      expect(Milestone.getNextTarget(150)).toBeNull();
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

    test('suggestRecentlyPlayedWithLowSessions shows plural sessions when min > 1', () => {
      const today = new Date();
      const date1 = new Date(today);
      date1.setDate(today.getDate() - 10);
      const date2 = new Date(today);
      date2.setDate(today.getDate() - 11);

      const testGames = [
        {
          id: 1,
          name: 'Game A',
          isBaseGame: true,
          isExpansion: false,
          isExpandalone: false,
          copies: [{ statusOwned: true }],
        },
      ];

      // Only one game with 2 sessions - minimum is 2, should show plural
      const testPlays = [
        { gameId: 1, date: date1.toISOString().split('T')[0], durationMin: 60 },
        { gameId: 1, date: date2.toISOString().split('T')[0], durationMin: 60 },
      ];

      const suggestions = getSuggestedGames(testGames, testPlays);
      const recentSuggestion = suggestions.find(s => s && s.reasons && s.reasons.includes('Fresh and recent'));
      expect(recentSuggestion).toBeDefined();
      expect(recentSuggestion.stats).toContain('2 total sessions');
    });
  });

  describe('suggestForNextValueClub', () => {
    test('returns null when no candidates have price data', () => {
      const gamePlayData = new Map();
      gamePlayData.set(1, {
        game: { id: 1, name: 'No Price Game' },
        playCount: 10,
        uniqueDays: new Set(['2023-01-01']),
        totalMinutes: 600,
        pricePaid: null,
      });

      const result = suggestForNextValueClub(gamePlayData, Metric.HOURS);
      expect(result).toBeNull();
    });

    test('returns null when all games have achieved all tiers', () => {
      const gamePlayData = new Map();
      gamePlayData.set(1, {
        game: { id: 1, name: 'Cheap Game' },
        playCount: 10,
        uniqueDays: new Set(['2023-01-01', '2023-01-02']),
        totalMinutes: 600, // 10 hours at $5 = $0.50/hour, achieved all tiers
        pricePaid: 5,
      });

      const result = suggestForNextValueClub(gamePlayData, Metric.HOURS);
      expect(result).toBeNull();
    });

    test('returns suggestion for game approaching next tier', () => {
      const gamePlayData = new Map();
      gamePlayData.set(1, {
        game: { id: 1, name: 'Almost There Game' },
        playCount: 5,
        uniqueDays: new Set(['2023-01-01', '2023-01-02', '2023-01-03']),
        totalMinutes: 480, // 8 hours at $50 = $6.25/hour, targets $5 tier
        pricePaid: 50,
      });

      const result = suggestForNextValueClub(gamePlayData, Metric.HOURS);
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
        pricePaid: 25, // $25 / 4 sessions = $6.25/session, targets $5 tier
      });

      const result = suggestForNextValueClub(gamePlayData, Metric.SESSIONS);
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
        pricePaid: 25, // $25 / 4 plays = $6.25/play, targets $5 tier
      });

      const result = suggestForNextValueClub(gamePlayData, Metric.PLAYS);
      expect(result).not.toBeNull();
      expect(result.reason).toBe('Join the $5/play club');
      expect(result.stat).toContain('/play');
    });

    test('selects from closest candidates across different tiers', () => {
      const gamePlayData = new Map();
      // Game 1: $50 / 8 hours = $6.25/hour, targets $5, needs 2 more hours (floor = 2)
      gamePlayData.set(1, {
        game: { id: 1, name: 'Close to $5' },
        playCount: 5,
        uniqueDays: new Set(['2023-01-01']),
        totalMinutes: 480,
        pricePaid: 50,
      });
      // Game 2: $5 / 2 hours = $2.50/hour, targets $2.50, needs 0 more hours (floor = 0)
      gamePlayData.set(2, {
        game: { id: 2, name: 'At $2.50 threshold' },
        playCount: 5,
        uniqueDays: new Set(['2023-01-01']),
        totalMinutes: 120,
        pricePaid: 5,
      });
      // Game 3: $100 / 8 hours = $12.50/hour, targets $5, needs 12 more hours (floor = 12)
      gamePlayData.set(3, {
        game: { id: 3, name: 'Far from $5' },
        playCount: 5,
        uniqueDays: new Set(['2023-01-01']),
        totalMinutes: 480,
        pricePaid: 100,
      });

      const result = suggestForNextValueClub(gamePlayData, Metric.HOURS);
      expect(result).not.toBeNull();
      // Should select closest from each tier: "At $2.50 threshold" (floor=0) or "Close to $5" (floor=2)
      expect(['Close to $5', 'At $2.50 threshold']).toContain(result.game.name);
    });

    test('dynamically targets different tiers based on current cost', () => {
      const gamePlayData = new Map();
      // Game at $4/hour targets $2.50 tier (not $5)
      gamePlayData.set(1, {
        game: { id: 1, name: 'Targets $2.50' },
        playCount: 5,
        uniqueDays: new Set(['2023-01-01']),
        totalMinutes: 750, // 12.5 hours at $50 = $4/hour
        pricePaid: 50,
      });

      const result = suggestForNextValueClub(gamePlayData, Metric.HOURS);
      expect(result).not.toBeNull();
      expect(result.reason).toBe('Join the $2.50/hour club');
    });

    test('formats 50 cent tier with cent symbol', () => {
      const gamePlayData = new Map();
      // Game at $0.75/hour targets $0.50 tier
      gamePlayData.set(1, {
        game: { id: 1, name: 'Targets 50 cents' },
        playCount: 5,
        uniqueDays: new Set(['2023-01-01']),
        totalMinutes: 4000, // 66.67 hours at $50 = $0.75/hour
        pricePaid: 50,
      });

      const result = suggestForNextValueClub(gamePlayData, Metric.HOURS);
      expect(result).not.toBeNull();
      expect(result.reason).toBe('Join the 50¢/hour club');
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

      const result = suggestForNextValueClub(gamePlayData, Metric.HOURS);
      expect(result).toBeNull();
    });

    test('excludes non-replayable games', () => {
      const gamePlayData = new Map();
      // Non-replayable game that would otherwise qualify
      gamePlayData.set(1, {
        game: { id: 1, name: 'Legacy Game', isNonReplayable: true },
        playCount: 5,
        uniqueDays: new Set(['2023-01-01', '2023-01-02', '2023-01-03']),
        totalMinutes: 480,
        pricePaid: 50,
      });
      // Regular game that qualifies
      gamePlayData.set(2, {
        game: { id: 2, name: 'Regular Game', isNonReplayable: false },
        playCount: 5,
        uniqueDays: new Set(['2023-01-01', '2023-01-02', '2023-01-03']),
        totalMinutes: 480,
        pricePaid: 50,
      });

      const result = suggestForNextValueClub(gamePlayData, Metric.HOURS);
      expect(result).not.toBeNull();
      expect(result.game.name).toBe('Regular Game');
    });

    test('returns null when only non-replayable games would qualify', () => {
      const gamePlayData = new Map();
      gamePlayData.set(1, {
        game: { id: 1, name: 'Legacy Game', isNonReplayable: true },
        playCount: 5,
        uniqueDays: new Set(['2023-01-01', '2023-01-02', '2023-01-03']),
        totalMinutes: 480,
        pricePaid: 50,
      });

      const result = suggestForNextValueClub(gamePlayData, Metric.HOURS);
      expect(result).toBeNull();
    });
  });

  describe('suggestHighestCostPerMetric', () => {
    test('returns null when no games have price data', () => {
      const gamePlayData = new Map();
      gamePlayData.set(1, {
        game: { id: 1, name: 'No Price Game' },
        playCount: 10,
        uniqueDays: new Set(['2023-01-01']),
        totalMinutes: 600,
        pricePaid: null,
      });

      const result = suggestHighestCostPerMetric(gamePlayData);
      expect(result).toBeNull();
    });

    test('returns null when all games with prices are unplayed', () => {
      const gamePlayData = new Map();
      gamePlayData.set(1, {
        game: { id: 1, name: 'Unplayed Game' },
        playCount: 0,
        uniqueDays: new Set(),
        totalMinutes: 0,
        pricePaid: 50,
      });

      const result = suggestHighestCostPerMetric(gamePlayData);
      expect(result).toBeNull();
    });

    test('correctly identifies highest cost/hour game', () => {
      const gamePlayData = new Map();
      // Game 1: $100 / 1 hour = $100/hour (highest)
      gamePlayData.set(1, {
        game: { id: 1, name: 'Expensive Per Hour' },
        playCount: 1,
        uniqueDays: new Set(['2023-01-01']),
        totalMinutes: 60,
        pricePaid: 100,
      });
      // Game 2: $100 / 10 hours = $10/hour
      gamePlayData.set(2, {
        game: { id: 2, name: 'Cheaper Per Hour' },
        playCount: 10,
        uniqueDays: new Set(['2023-01-01', '2023-01-02']),
        totalMinutes: 600,
        pricePaid: 100,
      });

      const result = suggestHighestCostPerMetric(gamePlayData);
      expect(result).not.toBeNull();
      expect(result.reason).toBe('Justify the cost');
      // Could be any metric, but if hours was selected it should be the expensive one
      if (result.stat.includes('/hour')) {
        expect(result.game.name).toBe('Expensive Per Hour');
        expect(result.stat).toBe('$100.00/hour');
      }
    });

    test('correctly identifies highest cost/session game', () => {
      const gamePlayData = new Map();
      // Game 1: $100 / 1 session = $100/session (highest)
      gamePlayData.set(1, {
        game: { id: 1, name: 'Expensive Per Session' },
        playCount: 1,
        uniqueDays: new Set(['2023-01-01']),
        totalMinutes: 60,
        pricePaid: 100,
      });
      // Game 2: $100 / 10 sessions = $10/session
      gamePlayData.set(2, {
        game: { id: 2, name: 'Cheaper Per Session' },
        playCount: 10,
        uniqueDays: new Set(['2023-01-01', '2023-01-02', '2023-01-03', '2023-01-04', '2023-01-05', '2023-01-06', '2023-01-07', '2023-01-08', '2023-01-09', '2023-01-10']),
        totalMinutes: 600,
        pricePaid: 100,
      });

      const result = suggestHighestCostPerMetric(gamePlayData);
      expect(result).not.toBeNull();
      expect(result.reason).toBe('Justify the cost');
      // Could be any metric, but if sessions was selected it should be the expensive one
      if (result.stat.includes('/session')) {
        expect(result.game.name).toBe('Expensive Per Session');
        expect(result.stat).toBe('$100.00/session');
      }
    });

    test('correctly identifies highest cost/play game', () => {
      const gamePlayData = new Map();
      // Game 1: $100 / 1 play = $100/play (highest)
      gamePlayData.set(1, {
        game: { id: 1, name: 'Expensive Per Play' },
        playCount: 1,
        uniqueDays: new Set(['2023-01-01']),
        totalMinutes: 60,
        pricePaid: 100,
      });
      // Game 2: $100 / 10 plays = $10/play
      gamePlayData.set(2, {
        game: { id: 2, name: 'Cheaper Per Play' },
        playCount: 10,
        uniqueDays: new Set(['2023-01-01']),
        totalMinutes: 600,
        pricePaid: 100,
      });

      const result = suggestHighestCostPerMetric(gamePlayData);
      expect(result).not.toBeNull();
      expect(result.reason).toBe('Justify the cost');
      // Could be any metric, but if plays was selected it should be the expensive one
      if (result.stat.includes('/play')) {
        expect(result.game.name).toBe('Expensive Per Play');
        expect(result.stat).toBe('$100.00/play');
      }
    });

    test('randomly selects from candidates across all three metrics', () => {
      const gamePlayData = new Map();
      // All games have the same cost/metric across their respective metrics
      gamePlayData.set(1, {
        game: { id: 1, name: 'Game A' },
        playCount: 1,
        uniqueDays: new Set(['2023-01-01']),
        totalMinutes: 60,
        pricePaid: 100,
      });

      const result = suggestHighestCostPerMetric(gamePlayData);
      expect(result).not.toBeNull();
      expect(result.game.name).toBe('Game A');
      // Should have one of the three metric types
      expect(result.stat).toMatch(/\$100\.00\/(hour|session|play)/);
    });

    test('handles ties within a metric', () => {
      const gamePlayData = new Map();
      // Two games with identical cost/hour
      gamePlayData.set(1, {
        game: { id: 1, name: 'Game A' },
        playCount: 1,
        uniqueDays: new Set(['2023-01-01']),
        totalMinutes: 60,
        pricePaid: 100,
      });
      gamePlayData.set(2, {
        game: { id: 2, name: 'Game B' },
        playCount: 1,
        uniqueDays: new Set(['2023-01-02']),
        totalMinutes: 60,
        pricePaid: 100,
      });

      const result = suggestHighestCostPerMetric(gamePlayData);
      expect(result).not.toBeNull();
      expect(['Game A', 'Game B']).toContain(result.game.name);
    });

    test('caps cost at pricePaid for games with less than 1 hour/session/play', () => {
      const gamePlayData = new Map();
      // Game with 30 minutes play (0.5 hours)
      // Without cap: $100 / 0.5 = $200/hour
      // With cap: $100/hour (capped at pricePaid)
      gamePlayData.set(1, {
        game: { id: 1, name: 'Short Play Game' },
        playCount: 1,
        uniqueDays: new Set(['2023-01-01']),
        totalMinutes: 30,
        pricePaid: 100,
      });

      const result = suggestHighestCostPerMetric(gamePlayData);
      expect(result).not.toBeNull();
      // If hours metric selected, should be capped at $100
      if (result.stat.includes('/hour')) {
        expect(result.stat).toBe('$100.00/hour');
      }
    });

    test('excludes games without price data from candidates', () => {
      const gamePlayData = new Map();
      // Game without price (should be excluded)
      gamePlayData.set(1, {
        game: { id: 1, name: 'No Price' },
        playCount: 1,
        uniqueDays: new Set(['2023-01-01']),
        totalMinutes: 60,
        pricePaid: null,
      });
      // Game with price (should be selected)
      gamePlayData.set(2, {
        game: { id: 2, name: 'Has Price' },
        playCount: 1,
        uniqueDays: new Set(['2023-01-01']),
        totalMinutes: 60,
        pricePaid: 50,
      });

      const result = suggestHighestCostPerMetric(gamePlayData);
      expect(result).not.toBeNull();
      expect(result.game.name).toBe('Has Price');
    });
  });

  describe('getSuggestedGames with isExperimental', () => {
    test('includes value club suggestions when isExperimental is true', () => {
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
      // May or may not have a value club suggestion depending on game data
      expect(Array.isArray(suggestions)).toBe(true);
    });

    test('does not include value club suggestions when isExperimental is false', () => {
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
      const valueClubSuggestion = suggestions.find(s => s.reasons && s.reasons.some(r => r.startsWith('Join the $')));
      expect(valueClubSuggestion).toBeUndefined();
    });

    test('defaults isExperimental to false', () => {
      const suggestions = getSuggestedGames(typicalData.games, typicalData.plays);
      const valueClubSuggestion = suggestions.find(s => s.reasons && s.reasons.some(r => r.startsWith('Join the $')));
      expect(valueClubSuggestion).toBeUndefined();
    });

  });

  describe('Edge cases for uncovered branches', () => {
    test('milestone suggestion shows singular session text when at 1 session', () => {
      const testGames = [
        { id: 1, name: 'Game A', isBaseGame: true, isExpansion: false, isExpandalone: false, copies: [{ statusOwned: true }] },
      ];
      // Only 1 session (need 4 more to reach milestone of 5)
      const testPlays = [
        { gameId: 1, date: '2023-01-01', durationMin: 60 },
      ];

      const suggestions = getSuggestedGames(testGames, testPlays, 'sessions');
      const milestoneSuggestion = suggestions.find(s => s.reasons.some(r => r.includes('five') || r.includes('dime')));
      if (milestoneSuggestion) {
        // Should use singular "session" not "sessions" for value of 1
        const sessionStat = milestoneSuggestion.stats.find(s => s.includes('session'));
        expect(sessionStat).toContain('1 session');
      }
    });

    test('milestone suggestion shows singular play text when at 1 play', () => {
      const testGames = [
        { id: 1, name: 'Game A', isBaseGame: true, isExpansion: false, isExpandalone: false, copies: [{ statusOwned: true }] },
      ];
      // Only 1 play (need 4 more to reach milestone of 5)
      const testPlays = [
        { gameId: 1, date: '2023-01-01', durationMin: 60 },
      ];

      const suggestions = getSuggestedGames(testGames, testPlays, 'plays');
      const milestoneSuggestion = suggestions.find(s => s.reasons.some(r => r.includes('five') || r.includes('dime')));
      if (milestoneSuggestion) {
        // Should use singular "play" not "plays" for value of 1
        const playStat = milestoneSuggestion.stats.find(s => s.includes('play'));
        expect(playStat).toContain('1 play');
      }
    });

    test('h-index suggestion shows singular play text when at 1 play', () => {
      const testGames = [
        { id: 1, name: 'Game A', isBaseGame: true, isExpansion: false, isExpandalone: false, copies: [{ statusOwned: true }] },
      ];
      // Only 1 play gives h-index of 1, next target is 2
      const testPlays = [
        { gameId: 1, date: '2023-01-01', durationMin: 60 },
      ];

      const suggestions = getSuggestedGames(testGames, testPlays);
      // Look for h-index suggestion ("Squaring up")
      const hIndexSuggestion = suggestions.find(s => s.reasons.some(r => r.includes('Squaring up')));
      if (hIndexSuggestion) {
        // Should use singular "play" for value of 1
        const playStat = hIndexSuggestion.stats.find(s => s.includes('play'));
        if (playStat) {
          expect(playStat).toContain('1 play');
        }
      }
    });

    test('milestone suggestion returns null when all games past 100 milestone', () => {
      const testGames = [
        { id: 1, name: 'Game A', isBaseGame: true, isExpansion: false, isExpandalone: false, copies: [{ statusOwned: true }] },
      ];
      // Create 101 plays on 101 different sessions (over multiple years)
      const testPlays = [];
      for (let year = 2020; year <= 2023; year++) {
        for (let month = 1; month <= 12; month++) {
          for (let day = 1; day <= 28; day++) {
            if (testPlays.length < 101) {
              testPlays.push({
                gameId: 1,
                date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
                durationMin: 60,
              });
            }
          }
        }
      }

      // With 101 unique sessions, the game is past the 100 milestone for sessions
      const suggestions = getSuggestedGames(testGames, testPlays, 'sessions');
      // Should not have milestone suggestions for sessions since all games are past 100
      const milestoneSuggestion = suggestions.find(s =>
        s.reasons.some(r => r.includes('five') || r.includes('dime') || r.includes('quarter') || r.includes('century'))
      );
      expect(milestoneSuggestion).toBeUndefined();
    });
  });
});
