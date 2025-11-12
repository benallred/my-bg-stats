const fs = require('fs');
const path = require('path');
const { processData } = require('./transform-game-data');

// File paths
const BG_STATS_FILE = path.join(__dirname, '..', 'BGStatsExport.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'data.json');

console.log('Starting data preprocessing...');

// Read BG Stats JSON
console.log('Reading BGStatsExport.json...');
const bgStatsData = JSON.parse(fs.readFileSync(BG_STATS_FILE, 'utf-8'));

// Process data
console.log('Processing data...');
const outputData = processData(bgStatsData);

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
const { games, plays } = outputData;
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
