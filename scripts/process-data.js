const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

// File paths
const BG_STATS_FILE = path.join(__dirname, '..', 'BGStatsExport.json');
const COLLECTION_CSV_FILE = path.join(__dirname, '..', 'collection.csv');
const OUTPUT_FILE = path.join(__dirname, '..', 'data.json');

console.log('Starting data preprocessing...');

// Read BG Stats JSON
console.log('Reading BGStatsExport.json...');
const bgStatsData = JSON.parse(fs.readFileSync(BG_STATS_FILE, 'utf-8'));

// Read collection CSV
console.log('Reading collection.csv...');
const collectionCsv = fs.readFileSync(COLLECTION_CSV_FILE, 'utf-8');
const collectionRecords = parse(collectionCsv, {
  columns: true,
  skip_empty_lines: true
});

// Build games map from BG Stats
console.log('Processing games...');
const gamesMap = new Map();

bgStatsData.games.forEach(game => {
  // Check if game has expandalone tag
  const isExpandalone = game.tags?.some(tag =>
    bgStatsData.tags.find(t => t.id === tag && t.name.toLowerCase() === 'expandalone')
  ) || false;

  // Get acquisition date from copies metadata
  let acquisitionDate = null;
  if (game.copies && game.copies.length > 0) {
    const copy = game.copies[0];
    if (copy.acquisitionDate) {
      acquisitionDate = copy.acquisitionDate.split(' ')[0]; // Just the date part
    }
  }

  gamesMap.set(game.id, {
    id: game.id,
    name: game.name,
    bggId: game.bggId,
    year: game.bggYear || null,
    isBaseGame: game.isBaseGame === 1,
    isExpansion: game.isExpansion === 1,
    isExpandalone: isExpandalone,
    acquisitionDate: acquisitionDate,
    playCount: 0,
    uniquePlayDays: new Set()
  });
});

// Merge acquisition dates from CSV (CSV takes precedence if both exist)
console.log('Merging collection CSV data...');
collectionRecords.forEach(record => {
  const bggId = parseInt(record.objectid);

  // Find matching game by BGG ID
  for (let [gameId, game] of gamesMap.entries()) {
    if (game.bggId === bggId) {
      // Update acquisition date if available in CSV
      if (record.acquisitiondate && record.acquisitiondate.trim()) {
        game.acquisitionDate = record.acquisitiondate.trim();
      }

      // Update expandalone flag based on CSV privatecomment or tags
      if (record.privatecomment && record.privatecomment.toLowerCase().includes('expandalone')) {
        game.isExpandalone = true;
      }
      break;
    }
  }
});

// Process plays (only store date and game reference)
console.log('Processing plays...');
const plays = [];

bgStatsData.plays.forEach(play => {
  const gameId = play.gameRefId;
  const playDate = play.playDate.split(' ')[0]; // Just the date part (YYYY-MM-DD)

  plays.push({
    gameId: gameId,
    date: playDate
  });

  // Update game play statistics
  if (gamesMap.has(gameId)) {
    const game = gamesMap.get(gameId);
    game.playCount++;
    game.uniquePlayDays.add(playDate);
  }
});

// Convert games map to array and finalize
const games = Array.from(gamesMap.values()).map(game => ({
  ...game,
  uniquePlayDays: game.uniquePlayDays.size
}));

// Sort games by name for easier browsing
games.sort((a, b) => a.name.localeCompare(b.name));

// Sort plays by date (most recent first)
plays.sort((a, b) => b.date.localeCompare(a.date));

// Create output data
const outputData = {
  games: games,
  plays: plays,
  generatedAt: new Date().toISOString()
};

// Write output file
console.log('Writing data.json...');
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputData, null, 2));

// Print statistics
console.log('\n=== Processing Complete ===');
console.log(`Total games: ${games.length}`);
console.log(`Total plays: ${plays.length}`);
console.log(`Base games: ${games.filter(g => g.isBaseGame && !g.isExpandalone).length}`);
console.log(`Expansions: ${games.filter(g => g.isExpansion).length}`);
console.log(`  - Expandalones: ${games.filter(g => g.isExpandalone).length}`);
console.log(`  - Expansion-only: ${games.filter(g => g.isExpansion && !g.isExpandalone).length}`);
console.log(`Games with unknown acquisition date: ${games.filter(g => !g.acquisitionDate).length}`);
console.log(`\nOutput written to: ${OUTPUT_FILE}`);
