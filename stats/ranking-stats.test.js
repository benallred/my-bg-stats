import { describe, test, expect } from 'vitest';
import { getGameRankings } from './ranking-stats.js';

const games = [
    { id: 1, name: 'Game A', isBaseGame: true, rating: 10 },
    { id: 2, name: 'Game B', isBaseGame: true, rating: 8 },
    { id: 3, name: 'Game C', isBaseGame: true, rating: 10 },
    { id: 4, name: 'Game D', isBaseGame: true, rating: null },
    { id: 5, name: 'Game E', isBaseGame: false, rating: 10 }, // expansion, excluded
];

const plays = [
    // Game A: 120 min, 2 sessions, 3 plays
    { gameId: 1, date: '2024-01-01', durationMin: 60, players: [1], locationId: 1 },
    { gameId: 1, date: '2024-01-01', durationMin: 30, players: [1], locationId: 1 },
    { gameId: 1, date: '2024-01-02', durationMin: 30, players: [1], locationId: 1 },
    // Game B: 90 min, 1 session, 2 plays
    { gameId: 2, date: '2024-01-03', durationMin: 60, players: [1], locationId: 1 },
    { gameId: 2, date: '2024-01-03', durationMin: 30, players: [1], locationId: 1 },
    // Game C: 60 min, 1 session, 1 play
    { gameId: 3, date: '2024-01-04', durationMin: 60, players: [1], locationId: 1 },
    // Game D: 180 min, 3 sessions, 4 plays
    { gameId: 4, date: '2024-01-05', durationMin: 60, players: [1], locationId: 1 },
    { gameId: 4, date: '2024-01-06', durationMin: 60, players: [1], locationId: 1 },
    { gameId: 4, date: '2024-01-07', durationMin: 30, players: [1], locationId: 1 },
    { gameId: 4, date: '2024-01-07', durationMin: 30, players: [1], locationId: 1 },
];

describe('getGameRankings', () => {
    test('ranks by hours descending', () => {
        // D=180min, A=120min, B=90min, C=60min
        expect(getGameRankings(games, plays, 4).hoursRank).toBe(1);
        expect(getGameRankings(games, plays, 1).hoursRank).toBe(2);
        expect(getGameRankings(games, plays, 2).hoursRank).toBe(3);
        expect(getGameRankings(games, plays, 3).hoursRank).toBe(4);
    });

    test('ranks by sessions descending', () => {
        // D=3 sessions, A=2, B=1, C=1
        expect(getGameRankings(games, plays, 4).sessionsRank).toBe(1);
        expect(getGameRankings(games, plays, 1).sessionsRank).toBe(2);
    });

    test('ranks by plays descending', () => {
        // D=4 plays, A=3, B=2, C=1
        expect(getGameRankings(games, plays, 4).playsRank).toBe(1);
        expect(getGameRankings(games, plays, 1).playsRank).toBe(2);
        expect(getGameRankings(games, plays, 2).playsRank).toBe(3);
        expect(getGameRankings(games, plays, 3).playsRank).toBe(4);
    });

    test('ranks by rating descending', () => {
        // A=10, C=10, B=8 (D has null rating, excluded)
        const rankA = getGameRankings(games, plays, 1).ratingRank;
        const rankC = getGameRankings(games, plays, 3).ratingRank;
        const rankB = getGameRankings(games, plays, 2).ratingRank;
        expect(rankB).toBe(3);
        // A and C both rated 10, but A has more hours so ranks higher
        expect(rankA).toBe(1);
        expect(rankC).toBe(2);
    });

    test('returns 0 for unrated game in rating ranking', () => {
        expect(getGameRankings(games, plays, 4).ratingRank).toBe(0);
    });

    test('excludes non-base games from rankings', () => {
        expect(getGameRankings(games, plays, 5).hoursRank).toBe(0);
        expect(getGameRankings(games, plays, 5).ratingRank).toBe(0);
    });

    test('returns 0 for unknown game ID', () => {
        const result = getGameRankings(games, plays, 999);
        expect(result.ratingRank).toBe(0);
        expect(result.hoursRank).toBe(0);
        expect(result.sessionsRank).toBe(0);
        expect(result.playsRank).toBe(0);
    });

    test('sessions tiebreaker uses hours then plays', () => {
        // B and C both have 1 session, but B has 90min vs C's 60min
        expect(getGameRankings(games, plays, 2).sessionsRank).toBe(3);
        expect(getGameRankings(games, plays, 3).sessionsRank).toBe(4);
    });

    test('plays tiebreaker uses hours then sessions', () => {
        // All unique play counts, no ties in this dataset
        // Verify ordering is deterministic
        const ranks = [1, 2, 3, 4].map(id => getGameRankings(games, plays, id).playsRank);
        expect(new Set(ranks).size).toBe(4);
    });
});

describe('getGameRankings tiebreakers', () => {
    // Games with identical metrics to exercise all tiebreaker branches
    const tieGames = [
        { id: 10, name: 'Tie A', isBaseGame: true, rating: 9 },
        { id: 11, name: 'Tie B', isBaseGame: true, rating: 9 },
        { id: 12, name: 'Tie C', isBaseGame: true, rating: 9 },
    ];

    test('rating tie broken by hours', () => {
        // Same rating, different hours
        const tiePlays = [
            { gameId: 10, date: '2024-01-01', durationMin: 120, players: [1], locationId: 1 },
            { gameId: 11, date: '2024-01-01', durationMin: 60, players: [1], locationId: 1 },
            { gameId: 12, date: '2024-01-01', durationMin: 30, players: [1], locationId: 1 },
        ];
        expect(getGameRankings(tieGames, tiePlays, 10).ratingRank).toBe(1);
        expect(getGameRankings(tieGames, tiePlays, 11).ratingRank).toBe(2);
        expect(getGameRankings(tieGames, tiePlays, 12).ratingRank).toBe(3);
    });

    test('rating tie with hours tie broken by sessions', () => {
        // Same rating, same hours, different sessions
        const tiePlays = [
            { gameId: 10, date: '2024-01-01', durationMin: 60, players: [1], locationId: 1 },
            { gameId: 10, date: '2024-01-02', durationMin: 0, players: [1], locationId: 1 },
            { gameId: 11, date: '2024-01-01', durationMin: 60, players: [1], locationId: 1 },
            { gameId: 12, date: '2024-01-01', durationMin: 60, players: [1], locationId: 1 },
        ];
        // 10: 60min, 2 sessions, 2 plays; 11: 60min, 1 session, 1 play; 12: 60min, 1 session, 1 play
        expect(getGameRankings(tieGames, tiePlays, 10).ratingRank).toBe(1);
    });

    test('rating tie with hours and sessions tie broken by plays', () => {
        // Same rating, same hours, same sessions, different plays
        const tiePlays = [
            { gameId: 10, date: '2024-01-01', durationMin: 30, players: [1], locationId: 1 },
            { gameId: 10, date: '2024-01-01', durationMin: 30, players: [1], locationId: 1 },
            { gameId: 11, date: '2024-01-01', durationMin: 60, players: [1], locationId: 1 },
        ];
        // 10: 60min, 1 session, 2 plays; 11: 60min, 1 session, 1 play
        expect(getGameRankings(tieGames, tiePlays, 10).ratingRank).toBe(1);
        expect(getGameRankings(tieGames, tiePlays, 11).ratingRank).toBe(2);
    });

    test('hours tie broken by sessions', () => {
        const tiePlays = [
            { gameId: 10, date: '2024-01-01', durationMin: 30, players: [1], locationId: 1 },
            { gameId: 10, date: '2024-01-02', durationMin: 30, players: [1], locationId: 1 },
            { gameId: 11, date: '2024-01-01', durationMin: 60, players: [1], locationId: 1 },
        ];
        // 10: 60min, 2 sessions; 11: 60min, 1 session
        expect(getGameRankings(tieGames, tiePlays, 10).hoursRank).toBe(1);
        expect(getGameRankings(tieGames, tiePlays, 11).hoursRank).toBe(2);
    });

    test('hours tie with sessions tie broken by plays', () => {
        const tiePlays = [
            { gameId: 10, date: '2024-01-01', durationMin: 30, players: [1], locationId: 1 },
            { gameId: 10, date: '2024-01-01', durationMin: 30, players: [1], locationId: 1 },
            { gameId: 11, date: '2024-01-01', durationMin: 60, players: [1], locationId: 1 },
        ];
        // 10: 60min, 1 session, 2 plays; 11: 60min, 1 session, 1 play
        expect(getGameRankings(tieGames, tiePlays, 10).hoursRank).toBe(1);
        expect(getGameRankings(tieGames, tiePlays, 11).hoursRank).toBe(2);
    });

    test('sessions tie broken by hours', () => {
        const tiePlays = [
            { gameId: 10, date: '2024-01-01', durationMin: 120, players: [1], locationId: 1 },
            { gameId: 11, date: '2024-01-01', durationMin: 60, players: [1], locationId: 1 },
        ];
        // Both 1 session, but 10 has more hours
        expect(getGameRankings(tieGames, tiePlays, 10).sessionsRank).toBe(1);
        expect(getGameRankings(tieGames, tiePlays, 11).sessionsRank).toBe(2);
    });

    test('sessions tie with hours tie broken by plays', () => {
        const tiePlays = [
            { gameId: 10, date: '2024-01-01', durationMin: 30, players: [1], locationId: 1 },
            { gameId: 10, date: '2024-01-01', durationMin: 30, players: [1], locationId: 1 },
            { gameId: 11, date: '2024-01-01', durationMin: 60, players: [1], locationId: 1 },
        ];
        // Both 1 session, same hours (60min), 10 has 2 plays vs 11's 1
        expect(getGameRankings(tieGames, tiePlays, 10).sessionsRank).toBe(1);
        expect(getGameRankings(tieGames, tiePlays, 11).sessionsRank).toBe(2);
    });

    test('plays tie broken by hours', () => {
        const tiePlays = [
            { gameId: 10, date: '2024-01-01', durationMin: 120, players: [1], locationId: 1 },
            { gameId: 11, date: '2024-01-01', durationMin: 60, players: [1], locationId: 1 },
        ];
        // Both 1 play, but 10 has more hours
        expect(getGameRankings(tieGames, tiePlays, 10).playsRank).toBe(1);
        expect(getGameRankings(tieGames, tiePlays, 11).playsRank).toBe(2);
    });

    test('plays tie with hours tie broken by sessions', () => {
        const tiePlays = [
            { gameId: 10, date: '2024-01-01', durationMin: 60, players: [1], locationId: 1 },
            { gameId: 10, date: '2024-01-02', durationMin: 0, players: [1], locationId: 1 },
            { gameId: 11, date: '2024-01-01', durationMin: 60, players: [1], locationId: 1 },
            { gameId: 11, date: '2024-01-01', durationMin: 0, players: [1], locationId: 1 },
        ];
        // Both 2 plays, same hours (60min), 10 has 2 sessions vs 11's 1
        expect(getGameRankings(tieGames, tiePlays, 10).playsRank).toBe(1);
        expect(getGameRankings(tieGames, tiePlays, 11).playsRank).toBe(2);
    });

    test('handles games with no play data in tiebreakers', () => {
        const noPlayGames = [
            { id: 30, name: 'No Play A', isBaseGame: true, rating: 5 },
            { id: 31, name: 'No Play B', isBaseGame: true, rating: 5 },
        ];
        // No plays at all — all metrics are 0/missing
        const result = getGameRankings(noPlayGames, [], 30);
        expect(result.ratingRank).toBeGreaterThan(0);
        expect(result.hoursRank).toBe(0);
    });

    test('all three tiebreaker levels for each ranking', () => {
        // 3 games: force 3+ comparator calls so sort exercises all branches
        const deepTieGames = [
            { id: 20, name: 'Deep A', isBaseGame: true, rating: 7 },
            { id: 21, name: 'Deep B', isBaseGame: true, rating: 7 },
            { id: 22, name: 'Deep C', isBaseGame: true, rating: 7 },
        ];

        // All same hours (60), same sessions (1), different plays (3 vs 2 vs 1)
        const deepPlays = [
            { gameId: 20, date: '2024-01-01', durationMin: 20, players: [1], locationId: 1 },
            { gameId: 20, date: '2024-01-01', durationMin: 20, players: [1], locationId: 1 },
            { gameId: 20, date: '2024-01-01', durationMin: 20, players: [1], locationId: 1 },
            { gameId: 21, date: '2024-01-01', durationMin: 30, players: [1], locationId: 1 },
            { gameId: 21, date: '2024-01-01', durationMin: 30, players: [1], locationId: 1 },
            { gameId: 22, date: '2024-01-01', durationMin: 60, players: [1], locationId: 1 },
        ];
        // 20: 60min, 1 session, 3 plays; 21: 60min, 1 session, 2 plays; 22: 60min, 1 session, 1 play
        expect(getGameRankings(deepTieGames, deepPlays, 20).ratingRank).toBe(1);
        expect(getGameRankings(deepTieGames, deepPlays, 21).ratingRank).toBe(2);
        expect(getGameRankings(deepTieGames, deepPlays, 22).ratingRank).toBe(3);
        expect(getGameRankings(deepTieGames, deepPlays, 20).hoursRank).toBe(1);
        expect(getGameRankings(deepTieGames, deepPlays, 21).hoursRank).toBe(2);
        expect(getGameRankings(deepTieGames, deepPlays, 22).hoursRank).toBe(3);
        expect(getGameRankings(deepTieGames, deepPlays, 20).sessionsRank).toBe(1);
        expect(getGameRankings(deepTieGames, deepPlays, 21).sessionsRank).toBe(2);
        expect(getGameRankings(deepTieGames, deepPlays, 22).sessionsRank).toBe(3);

        // Plays: same plays (2), same hours (60), different sessions
        const playsDeepPlays = [
            { gameId: 20, date: '2024-01-01', durationMin: 30, players: [1], locationId: 1 },
            { gameId: 20, date: '2024-01-02', durationMin: 30, players: [1], locationId: 1 },
            { gameId: 21, date: '2024-01-01', durationMin: 60, players: [1], locationId: 1 },
            { gameId: 21, date: '2024-01-01', durationMin: 0, players: [1], locationId: 1 },
            { gameId: 22, date: '2024-01-01', durationMin: 60, players: [1], locationId: 1 },
            { gameId: 22, date: '2024-01-01', durationMin: 0, players: [1], locationId: 1 },
        ];
        // 20: 60min, 2 sessions, 2 plays; 21: 60min, 1 session, 2 plays; 22: 60min, 1 session, 2 plays
        expect(getGameRankings(deepTieGames, playsDeepPlays, 20).playsRank).toBe(1);
    });
});
