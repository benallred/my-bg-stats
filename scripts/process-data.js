const fs = require('fs');
const path = require('path');

// File paths
const BG_STATS_FILE = path.join(__dirname, '..', 'BGStatsExport.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'data.json');

console.log('Starting data preprocessing...');

// Read BG Stats JSON
console.log('Reading BGStatsExport.json...');
const bgStatsData = JSON.parse(fs.readFileSync(BG_STATS_FILE, 'utf-8'));

// Build games map from BG Stats
console.log('Processing games...');
const gamesMap = new Map();

bgStatsData.games.forEach(game => {
  // Check if game has expandalone tag
  const isExpandalone = game.tags?.some(tag =>
    bgStatsData.tags.find(t => t.id === tag.tagRefId && t.name.toLowerCase() === 'expandalone')
  ) || false;

  // Extract copies metadata
  const copies = [];

  if (game.copies && game.copies.length > 0) {
    // Store copies array with acquisition date and ownership status
    game.copies.forEach(copy => {
      let copyAcquisitionDate = null;
      if (copy.metaData) {
        try {
          const metadata = JSON.parse(copy.metaData);
          if (metadata.AcquisitionDate) {
            copyAcquisitionDate = metadata.AcquisitionDate; // Already in YYYY-MM-DD format
          }
        } catch (e) {
          // Invalid JSON in metaData, skip
        }
      }
      copies.push({
        acquisitionDate: copyAcquisitionDate,
        statusOwned: copy.statusOwned === true
      });
    });
  }

  // Enforce mutually exclusive classification
  // Priority: expandalone > base game > expansion
  let finalIsBaseGame = false;
  let finalIsExpansion = false;
  let finalIsExpandalone = false;

  if (isExpandalone) {
    // Has expandalone tag - classify as expandalone
    finalIsExpandalone = true;
  } else if (game.isBaseGame === 1) {
    // Is base game (with or without expansion flag) - classify as base game
    finalIsBaseGame = true;
  } else if (game.isExpansion === 1) {
    // Pure expansion only
    finalIsExpansion = true;
  }
  // If none are set, all remain false (unknown type)

  gamesMap.set(game.id, {
    id: game.id,
    name: game.name,
    bggId: game.bggId,
    year: game.bggYear || null,
    isBaseGame: finalIsBaseGame,
    isExpansion: finalIsExpansion,
    isExpandalone: finalIsExpandalone,
    copies: copies,
    playCount: 0,
    uniquePlayDays: new Set()
  });
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

// Helper functions for statistics
function isGameOwned(game) {
  return game.copies && game.copies.length > 0 && game.copies.some(copy => copy.statusOwned === true);
}

function hasUnknownAcquisitionDate(game) {
  if (!game.copies || game.copies.length === 0) return false;
  const ownedCopies = game.copies.filter(copy => copy.statusOwned === true);
  if (ownedCopies.length === 0) return false;
  return ownedCopies.some(copy => !copy.acquisitionDate);
}

// Print statistics
console.log('\n=== Processing Complete ===');
console.log(`Total games: ${games.length}`);
console.log(`Games currently owned: ${games.filter(isGameOwned).length}`);
console.log(`Total plays: ${plays.length}`);
console.log(`Base games: ${games.filter(g => g.isBaseGame).length}`);
console.log(`  - Owned: ${games.filter(g => g.isBaseGame && isGameOwned(g)).length}`);
console.log(`Expandalones: ${games.filter(g => g.isExpandalone).length}`);
console.log(`  - Owned: ${games.filter(g => g.isExpandalone && isGameOwned(g)).length}`);
console.log(`Expansions: ${games.filter(g => g.isExpansion).length}`);
console.log(`  - Owned: ${games.filter(g => g.isExpansion && isGameOwned(g)).length}`);
console.log(`Games with unknown acquisition date: ${games.filter(hasUnknownAcquisitionDate).length}`);
console.log(`\nOutput written to: ${OUTPUT_FILE}`);
