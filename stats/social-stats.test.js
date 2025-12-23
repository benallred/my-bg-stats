import { describe, test, expect } from 'vitest';
import {
  getPlayerStats,
  getLocationStats,
  getSoloGameStats,
} from './social-stats.js';

describe('getPlayerStats', () => {
  const players = [
    { playerId: 1, name: 'Anonymous player' },
    { playerId: 2, name: 'Alice' },
    { playerId: 3, name: 'Ben' },
    { playerId: 4, name: 'Charlie' },
    { playerId: 5, name: 'Diana' },
  ];
  const selfPlayerId = 3;
  const anonymousPlayerId = 1;

  test('counts unique players excluding self and anonymous', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', durationMin: 60, players: [2, 3, 4] },
      { gameId: 1, date: '2024-01-16', durationMin: 60, players: [2, 3, 5] },
      { gameId: 1, date: '2024-01-17', durationMin: 60, players: [1, 3] },
    ];

    const result = getPlayerStats(plays, players, selfPlayerId, anonymousPlayerId);

    expect(result.uniquePlayerCount).toBe(3); // Alice, Charlie, Diana (excludes Ben and Anonymous)
  });

  test('calculates hours, sessions, and plays per player', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', durationMin: 60, players: [2, 3] },
      { gameId: 1, date: '2024-01-15', durationMin: 30, players: [2, 3] },
      { gameId: 1, date: '2024-01-16', durationMin: 120, players: [2, 3] },
    ];

    const result = getPlayerStats(plays, players, selfPlayerId, anonymousPlayerId);

    expect(result.uniquePlayerCount).toBe(1);
    const alice = result.playerDetails.find(p => p.name === 'Alice');
    expect(alice.minutes).toBe(210); // 60 + 30 + 120
    expect(alice.sessions).toBe(2); // 2 unique dates
    expect(alice.plays).toBe(3); // 3 plays
    // Percentages - Alice was in all plays
    expect(alice.minutesPercent).toBe(100);
    expect(alice.sessionsPercent).toBe(100);
    expect(alice.playsPercent).toBe(100);
  });

  test('filters by year when specified', () => {
    const plays = [
      { gameId: 1, date: '2023-12-31', durationMin: 60, players: [2, 3] },
      { gameId: 1, date: '2024-01-15', durationMin: 60, players: [4, 3] },
    ];

    const result = getPlayerStats(plays, players, selfPlayerId, anonymousPlayerId, 2024);

    expect(result.uniquePlayerCount).toBe(1);
    expect(result.playerDetails[0].name).toBe('Charlie');
  });

  test('returns all-time stats when year is null', () => {
    const plays = [
      { gameId: 1, date: '2023-12-31', durationMin: 60, players: [2, 3] },
      { gameId: 1, date: '2024-01-15', durationMin: 60, players: [4, 3] },
    ];

    const result = getPlayerStats(plays, players, selfPlayerId, anonymousPlayerId, null);

    expect(result.uniquePlayerCount).toBe(2); // Alice and Charlie
  });

  test('handles empty plays array', () => {
    const result = getPlayerStats([], players, selfPlayerId, anonymousPlayerId);

    expect(result.uniquePlayerCount).toBe(0);
    expect(result.playerDetails).toEqual([]);
  });

  test('handles solo plays (no other players)', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', durationMin: 60, players: [3] },
    ];

    const result = getPlayerStats(plays, players, selfPlayerId, anonymousPlayerId);

    expect(result.uniquePlayerCount).toBe(0);
    expect(result.playerDetails).toEqual([]);
  });

  test('handles unknown player IDs gracefully', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', durationMin: 60, players: [3, 999] },
    ];

    const result = getPlayerStats(plays, players, selfPlayerId, anonymousPlayerId);

    expect(result.uniquePlayerCount).toBe(1);
    expect(result.playerDetails[0].name).toBe('Player 999');
  });

  test('excludes multiple anonymous player occurrences', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', durationMin: 60, players: [1, 1, 1, 2, 3] },
    ];

    const result = getPlayerStats(plays, players, selfPlayerId, anonymousPlayerId);

    expect(result.uniquePlayerCount).toBe(1); // Only Alice
    expect(result.playerDetails[0].name).toBe('Alice');
  });
});

describe('getLocationStats', () => {
  const locations = [
    { locationId: 1, name: 'Home' },
    { locationId: 2, name: 'Church' },
    { locationId: 3, name: 'Work' },
  ];

  test('counts locations and calculates stats per location', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', durationMin: 60, locationId: 1 },
      { gameId: 1, date: '2024-01-16', durationMin: 120, locationId: 1 },
      { gameId: 1, date: '2024-01-17', durationMin: 60, locationId: 2 },
    ];

    const result = getLocationStats(plays, locations);

    expect(result.locationCount).toBe(2);
  });

  test('calculates hours, sessions, and plays per location', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', durationMin: 60, locationId: 1 },
      { gameId: 2, date: '2024-01-15', durationMin: 60, locationId: 1 },
      { gameId: 1, date: '2024-01-16', durationMin: 120, locationId: 1 },
    ];

    const result = getLocationStats(plays, locations);

    expect(result.locationCount).toBe(1);
    const home = result.locationDetails.find(l => l.name === 'Home');
    expect(home.minutes).toBe(240); // 60 + 60 + 120
    expect(home.sessions).toBe(2); // 2 unique dates
    expect(home.plays).toBe(3); // 3 plays
  });

  test('calculates percentages correctly', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', durationMin: 60, locationId: 1 },
      { gameId: 1, date: '2024-01-16', durationMin: 60, locationId: 1 },
      { gameId: 1, date: '2024-01-17', durationMin: 60, locationId: 2 },
      { gameId: 1, date: '2024-01-18', durationMin: 60, locationId: 2 },
    ];

    const result = getLocationStats(plays, locations);

    const home = result.locationDetails.find(l => l.name === 'Home');
    const church = result.locationDetails.find(l => l.name === 'Church');

    expect(home.minutesPercent).toBe(50);
    expect(home.sessionsPercent).toBe(50);
    expect(home.playsPercent).toBe(50);
    expect(church.minutesPercent).toBe(50);
    expect(church.sessionsPercent).toBe(50);
    expect(church.playsPercent).toBe(50);
  });

  test('filters by year when specified', () => {
    const plays = [
      { gameId: 1, date: '2023-12-31', durationMin: 60, locationId: 1 },
      { gameId: 1, date: '2024-01-15', durationMin: 60, locationId: 2 },
    ];

    const result = getLocationStats(plays, locations, 2024);

    expect(result.locationCount).toBe(1);
    expect(result.locationDetails[0].name).toBe('Church');
  });

  test('returns all-time stats when year is null', () => {
    const plays = [
      { gameId: 1, date: '2023-12-31', durationMin: 60, locationId: 1 },
      { gameId: 1, date: '2024-01-15', durationMin: 60, locationId: 2 },
    ];

    const result = getLocationStats(plays, locations, null);

    expect(result.locationCount).toBe(2);
  });

  test('handles empty plays array', () => {
    const result = getLocationStats([], locations);

    expect(result.locationCount).toBe(0);
    expect(result.locationDetails).toEqual([]);
  });

  test('handles unknown location IDs gracefully', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', durationMin: 60, locationId: 999 },
    ];

    const result = getLocationStats(plays, locations);

    expect(result.locationCount).toBe(1);
    expect(result.locationDetails[0].name).toBe('Location 999');
  });
});

describe('getSoloGameStats', () => {
  const games = [
    { id: 1, name: 'Wingspan' },
    { id: 2, name: 'Catan' },
    { id: 3, name: 'Azul' },
  ];
  const selfPlayerId = 3;

  test('calculates solo totals correctly', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', durationMin: 60, players: [3] },
      { gameId: 1, date: '2024-01-16', durationMin: 30, players: [3] },
      { gameId: 2, date: '2024-01-17', durationMin: 60, players: [2, 3] },
    ];

    const result = getSoloGameStats(plays, games, selfPlayerId);

    expect(result.totalSoloMinutes).toBe(90);
    expect(result.totalSoloSessions).toBe(2);
    expect(result.totalSoloPlays).toBe(2);
  });

  test('calculates total stats for percentage calculation', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', durationMin: 60, players: [3] },
      { gameId: 2, date: '2024-01-16', durationMin: 60, players: [2, 3] },
    ];

    const result = getSoloGameStats(plays, games, selfPlayerId);

    expect(result.totalMinutes).toBe(120);
    expect(result.totalSessions).toBe(2);
    expect(result.totalPlays).toBe(2);
  });

  test('calculates solo-only days correctly', () => {
    const plays = [
      // Day 1: solo only
      { gameId: 1, date: '2024-01-15', durationMin: 60, players: [3] },
      // Day 2: solo and multiplayer (not solo-only)
      { gameId: 1, date: '2024-01-16', durationMin: 30, players: [3] },
      { gameId: 2, date: '2024-01-16', durationMin: 60, players: [2, 3] },
      // Day 3: multiplayer only
      { gameId: 2, date: '2024-01-17', durationMin: 60, players: [2, 3] },
      // Day 4: solo only
      { gameId: 1, date: '2024-01-18', durationMin: 45, players: [3] },
    ];

    const result = getSoloGameStats(plays, games, selfPlayerId);

    expect(result.soloOnlyDays).toBe(2); // Day 1 and Day 4
    expect(result.totalSoloSessions).toBe(3); // Day 1, 2, 4
  });

  test('returns game breakdown with minutes, sessions, plays', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', durationMin: 60, players: [3] },
      { gameId: 1, date: '2024-01-15', durationMin: 30, players: [3] },
      { gameId: 1, date: '2024-01-16', durationMin: 60, players: [3] },
      { gameId: 2, date: '2024-01-17', durationMin: 45, players: [3] },
    ];

    const result = getSoloGameStats(plays, games, selfPlayerId);

    expect(result.gameDetails).toHaveLength(2);

    const wingspan = result.gameDetails.find(g => g.game.name === 'Wingspan');
    expect(wingspan.minutes).toBe(150); // 60 + 30 + 60
    expect(wingspan.sessions).toBe(2); // 2 unique dates
    expect(wingspan.plays).toBe(3);

    const catan = result.gameDetails.find(g => g.game.name === 'Catan');
    expect(catan.minutes).toBe(45);
    expect(catan.sessions).toBe(1);
    expect(catan.plays).toBe(1);
  });

  test('filters by year when specified', () => {
    const plays = [
      { gameId: 1, date: '2023-12-31', durationMin: 60, players: [3] },
      { gameId: 1, date: '2024-01-15', durationMin: 30, players: [3] },
    ];

    const result = getSoloGameStats(plays, games, selfPlayerId, 2024);

    expect(result.totalSoloPlays).toBe(1);
    expect(result.totalSoloMinutes).toBe(30);
  });

  test('returns all-time stats when year is null', () => {
    const plays = [
      { gameId: 1, date: '2023-12-31', durationMin: 60, players: [3] },
      { gameId: 1, date: '2024-01-15', durationMin: 30, players: [3] },
    ];

    const result = getSoloGameStats(plays, games, selfPlayerId, null);

    expect(result.totalSoloPlays).toBe(2);
    expect(result.totalSoloMinutes).toBe(90);
  });

  test('handles empty plays array', () => {
    const result = getSoloGameStats([], games, selfPlayerId);

    expect(result.totalSoloMinutes).toBe(0);
    expect(result.totalSoloSessions).toBe(0);
    expect(result.totalSoloPlays).toBe(0);
    expect(result.soloOnlyDays).toBe(0);
    expect(result.gameDetails).toEqual([]);
  });

  test('handles no solo plays', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', durationMin: 60, players: [2, 3] },
      { gameId: 2, date: '2024-01-16', durationMin: 60, players: [2, 3, 4] },
    ];

    const result = getSoloGameStats(plays, games, selfPlayerId);

    expect(result.totalSoloMinutes).toBe(0);
    expect(result.totalSoloSessions).toBe(0);
    expect(result.totalSoloPlays).toBe(0);
    expect(result.soloOnlyDays).toBe(0);
    expect(result.gameDetails).toEqual([]);
    expect(result.totalMinutes).toBe(120);
    expect(result.totalSessions).toBe(2);
    expect(result.totalPlays).toBe(2);
  });

  test('filters out unknown games from game details', () => {
    const plays = [
      { gameId: 999, date: '2024-01-15', durationMin: 60, players: [3] },
      { gameId: 1, date: '2024-01-16', durationMin: 30, players: [3] },
    ];

    const result = getSoloGameStats(plays, games, selfPlayerId);

    expect(result.totalSoloPlays).toBe(2); // Both counted in totals
    expect(result.gameDetails).toHaveLength(1); // Only Wingspan in details
    expect(result.gameDetails[0].game.name).toBe('Wingspan');
  });

  test('does not count single-player games with different player as solo', () => {
    const plays = [
      { gameId: 1, date: '2024-01-15', durationMin: 60, players: [2] },
      { gameId: 1, date: '2024-01-16', durationMin: 30, players: [3] },
    ];

    const result = getSoloGameStats(plays, games, selfPlayerId);

    expect(result.totalSoloPlays).toBe(1);
    expect(result.totalSoloMinutes).toBe(30);
  });
});
