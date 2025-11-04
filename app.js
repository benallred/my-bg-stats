/**
 * Main Application Logic
 * Handles data loading, UI updates, and user interactions
 */

// Global data
let gameData = null;
let currentYear = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Load data
        await loadData();

        // Setup year filter
        setupYearFilter();

        // Update all stats
        updateAllStats();

        // Setup event listeners
        setupEventListeners();

        // Update footer
        updateFooter();
    } catch (error) {
        console.error('Error initializing app:', error);
        alert('Failed to load data. Please make sure data.json exists.');
    }
});

/**
 * Load data from data.json
 */
async function loadData() {
    const response = await fetch('data.json');
    if (!response.ok) {
        throw new Error('Failed to load data.json');
    }
    gameData = await response.json();
    console.log('Data loaded:', gameData);
}

/**
 * Setup year filter dropdown
 */
function setupYearFilter() {
    const yearSelect = document.getElementById('year-select');
    const years = getAvailableYears(gameData.plays);

    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    });

    yearSelect.addEventListener('change', (e) => {
        currentYear = e.target.value === 'all' ? null : parseInt(e.target.value);
        updateAllStats();
        closeDetailSection();
    });
}

/**
 * Update all statistics on the page
 */
function updateAllStats() {
    updateHIndexStats();
    updateCollectionStats();
    updatePlayStats();
    updateMilestoneStats();
    updateUnknownDatesSection();
}

/**
 * Update H-Index statistics
 */
function updateHIndexStats() {
    // Traditional H-Index
    const traditionalHIndex = calculateTraditionalHIndex(gameData.games, gameData.plays, currentYear);
    document.querySelector('#traditional-h-index .stat-value').textContent = traditionalHIndex;

    // Play Session H-Index
    const playSessionHIndex = calculatePlaySessionHIndex(gameData.games, gameData.plays, currentYear);
    document.querySelector('#play-session-h-index .stat-value').textContent = playSessionHIndex;
}

/**
 * Update collection statistics
 */
function updateCollectionStats() {
    // Update labels based on year filter
    const gamesOwnedLabel = document.querySelector('#total-games-owned .stat-label');
    const bggEntriesLabel = document.querySelector('#total-bgg-entries .stat-label');

    if (currentYear) {
        gamesOwnedLabel.textContent = 'Total Games Acquired';
        bggEntriesLabel.textContent = 'Total BGG Entries Acquired';
    } else {
        gamesOwnedLabel.textContent = 'Total Games Owned';
        bggEntriesLabel.textContent = 'Total BGG Entries';
    }

    // Total BGG Entries
    const totalBGGEntries = getTotalBGGEntries(gameData.games, currentYear);
    document.querySelector('#total-bgg-entries .stat-value').textContent = totalBGGEntries;

    // Total Games Owned
    const totalGamesOwned = getTotalGamesOwned(gameData.games, currentYear);
    document.querySelector('#total-games-owned .stat-value').textContent = totalGamesOwned;

    // Total Expansions
    const expansionsData = getTotalExpansions(gameData.games, currentYear);
    document.querySelector('#total-expansions .stat-value').textContent = expansionsData.total;
    document.getElementById('expandalones-count').textContent = expansionsData.expandalones;
    document.getElementById('expansion-only-count').textContent = expansionsData.expansionOnly;
}

/**
 * Update play statistics
 */
function updatePlayStats() {
    // Total Plays
    const totalPlays = getTotalPlays(gameData.plays, currentYear);
    document.querySelector('#total-plays .stat-value').textContent = totalPlays.toLocaleString();

    // Total Days Played
    const totalDays = getTotalDaysPlayed(gameData.plays, currentYear);
    document.querySelector('#total-days-played .stat-value').textContent = totalDays.toLocaleString();

    // Total Games Played
    const gamesPlayedData = getTotalGamesPlayed(gameData.games, gameData.plays, currentYear);
    document.querySelector('#total-games-played .stat-value').textContent = gamesPlayedData.total;

    // Show/hide new-to-me substat
    const newToMeContainer = document.getElementById('new-to-me-container');
    if (currentYear && gamesPlayedData.newToMe !== null) {
        newToMeContainer.style.display = 'block';
        document.getElementById('new-to-me-count').textContent = gamesPlayedData.newToMe;
    } else {
        newToMeContainer.style.display = 'none';
    }
}

/**
 * Update milestone statistics
 */
function updateMilestoneStats() {
    const milestones = getPlayMilestones(gameData.games, gameData.plays, currentYear);

    document.querySelector('#fives .stat-value').textContent = milestones.fives.length;
    document.querySelector('#dimes .stat-value').textContent = milestones.dimes.length;
    document.querySelector('#quarters .stat-value').textContent = milestones.quarters.length;
    document.querySelector('#centuries .stat-value').textContent = milestones.centuries.length;
}

/**
 * Update unknown acquisition dates section
 */
function updateUnknownDatesSection() {
    const section = document.getElementById('unknown-dates-section');

    if (currentYear) {
        const unknownGames = getGamesWithUnknownAcquisitionDate(gameData.games);
        if (unknownGames.length > 0) {
            section.style.display = 'block';
            const content = document.getElementById('unknown-dates-content');
            const list = document.createElement('ul');
            unknownGames.forEach(game => {
                const li = document.createElement('li');
                li.textContent = `${game.name} (BGG: ${game.bggId})`;
                list.appendChild(li);
            });
            content.innerHTML = '';
            content.appendChild(list);
        } else {
            section.style.display = 'none';
        }
    } else {
        section.style.display = 'none';
    }
}

/**
 * Setup event listeners for clickable stat cards
 */
function setupEventListeners() {
    const clickableCards = document.querySelectorAll('.stat-card.clickable');

    clickableCards.forEach(card => {
        card.addEventListener('click', () => {
            const statType = card.dataset.stat;
            showDetailSection(statType);
        });
    });

    document.getElementById('close-detail').addEventListener('click', closeDetailSection);
}

/**
 * Show detail section for a specific stat
 */
function showDetailSection(statType) {
    const detailSection = document.getElementById('detail-section');
    const detailTitle = document.getElementById('detail-title');
    const detailContent = document.getElementById('detail-content');

    // Clear previous content
    detailContent.innerHTML = '';

    // Set title and content based on stat type
    switch (statType) {
        case 'traditional-h-index':
            detailTitle.textContent = 'Traditional H-Index Breakdown';
            showHIndexBreakdown(detailContent, false);
            break;
        case 'play-session-h-index':
            detailTitle.textContent = 'Play Session H-Index Breakdown';
            showHIndexBreakdown(detailContent, true);
            break;
        case 'total-bgg-entries':
            detailTitle.textContent = currentYear ? `BGG Entries Acquired in ${currentYear}` : 'All BGG Entries';
            showBGGEntries(detailContent);
            break;
        case 'total-games-owned':
            detailTitle.textContent = currentYear ? `Games Acquired in ${currentYear}` : 'All Games Owned';
            showGamesOwned(detailContent);
            break;
        case 'total-expansions':
            detailTitle.textContent = currentYear ? `Expansions Acquired in ${currentYear}` : 'All Expansions';
            showExpansions(detailContent);
            break;
        case 'total-games-played':
            detailTitle.textContent = currentYear ? `Games Played in ${currentYear}` : 'All Games Played';
            showGamesPlayed(detailContent);
            break;
        case 'fives':
            detailTitle.textContent = 'Fives (5+ Plays)';
            showMilestoneGames(detailContent, 'fives');
            break;
        case 'dimes':
            detailTitle.textContent = 'Dimes (10+ Plays)';
            showMilestoneGames(detailContent, 'dimes');
            break;
        case 'quarters':
            detailTitle.textContent = 'Quarters (25+ Plays)';
            showMilestoneGames(detailContent, 'quarters');
            break;
        case 'centuries':
            detailTitle.textContent = 'Centuries (100+ Plays)';
            showMilestoneGames(detailContent, 'centuries');
            break;
    }

    // Show section
    detailSection.style.display = 'block';
    detailSection.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Close detail section
 */
function closeDetailSection() {
    document.getElementById('detail-section').style.display = 'none';
}

/**
 * Show H-Index breakdown table
 */
function showHIndexBreakdown(container, usePlaySessions) {
    const breakdown = getHIndexBreakdown(gameData.games, gameData.plays, currentYear, usePlaySessions);
    const hIndex = usePlaySessions
        ? calculatePlaySessionHIndex(gameData.games, gameData.plays, currentYear)
        : calculateTraditionalHIndex(gameData.games, gameData.plays, currentYear);

    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Rank</th>
                <th>Game</th>
                <th>${usePlaySessions ? 'Days Played' : 'Play Count'}</th>
                <th>Contributes to H-Index?</th>
            </tr>
        </thead>
        <tbody>
            ${breakdown.map((item, index) => {
                const rank = index + 1;
                const contributesToHIndex = rank <= item.count && rank <= hIndex;
                return `
                    <tr style="${contributesToHIndex ? 'background-color: #e3f2fd;' : ''}">
                        <td>${rank}</td>
                        <td>${item.game.name}</td>
                        <td>${item.count}</td>
                        <td>${contributesToHIndex ? '✓' : ''}</td>
                    </tr>
                `;
            }).join('')}
        </tbody>
    `;
    container.appendChild(table);
}

/**
 * Show BGG entries table
 */
function showBGGEntries(container) {
    const games = gameData.games.filter(game => {
        if (currentYear) {
            return game.acquisitionDate && game.acquisitionDate.startsWith(currentYear.toString());
        }
        return true;
    });

    createGameTable(container, games, ['Name', 'Type', 'Acquisition Date']);
}

/**
 * Show games owned table
 */
function showGamesOwned(container) {
    const games = gameData.games.filter(game => {
        if (!game.isBaseGame || game.isExpandalone) return false;
        if (currentYear) {
            return game.acquisitionDate && game.acquisitionDate.startsWith(currentYear.toString());
        }
        return true;
    });

    createGameTable(container, games, ['Name', 'Year', 'Acquisition Date', 'Plays']);
}

/**
 * Show expansions table
 */
function showExpansions(container) {
    const expansions = gameData.games.filter(game => {
        if (!game.isExpansion) return false;
        if (currentYear) {
            return game.acquisitionDate && game.acquisitionDate.startsWith(currentYear.toString());
        }
        return true;
    });

    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Acquisition Date</th>
            </tr>
        </thead>
        <tbody>
            ${expansions.map(game => `
                <tr>
                    <td>${game.name}</td>
                    <td>${game.isExpandalone ? 'Expandalone' : 'Expansion'}</td>
                    <td>${game.acquisitionDate || 'Unknown'}</td>
                </tr>
            `).join('')}
        </tbody>
    `;
    container.appendChild(table);
}

/**
 * Show games played table
 */
function showGamesPlayed(container) {
    const playCountsPerGame = new Map();

    gameData.plays.forEach(play => {
        if (currentYear && !play.date.startsWith(currentYear.toString())) return;
        const count = playCountsPerGame.get(play.gameId) || 0;
        playCountsPerGame.set(play.gameId, count + 1);
    });

    const gamesWithPlays = Array.from(playCountsPerGame.entries()).map(([gameId, count]) => {
        const game = gameData.games.find(g => g.id === gameId);
        return { game, count };
    });

    gamesWithPlays.sort((a, b) => b.count - a.count);

    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Game</th>
                <th>Plays</th>
            </tr>
        </thead>
        <tbody>
            ${gamesWithPlays.map(item => `
                <tr>
                    <td>${item.game ? item.game.name : 'Unknown Game'}</td>
                    <td>${item.count}</td>
                </tr>
            `).join('')}
        </tbody>
    `;
    container.appendChild(table);
}

/**
 * Show milestone games table
 */
function showMilestoneGames(container, milestone) {
    const milestones = getPlayMilestones(gameData.games, gameData.plays, currentYear);
    const games = milestones[milestone];

    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Game</th>
                <th>Play Count</th>
            </tr>
        </thead>
        <tbody>
            ${games.map(item => `
                <tr>
                    <td>${item.game.name}</td>
                    <td>${item.count}</td>
                </tr>
            `).join('')}
        </tbody>
    `;
    container.appendChild(table);
}

/**
 * Helper function to create a game table
 */
function createGameTable(container, games, columns) {
    const table = document.createElement('table');

    const headerRow = columns.map(col => `<th>${col}</th>`).join('');

    const rows = games.map(game => {
        const cells = [];
        columns.forEach(col => {
            switch(col) {
                case 'Name':
                    cells.push(`<td>${game.name}</td>`);
                    break;
                case 'Type':
                    let type = '';
                    if (game.isBaseGame) type = 'Base Game';
                    if (game.isExpansion) type = game.isExpandalone ? 'Expandalone' : 'Expansion';
                    cells.push(`<td>${type}</td>`);
                    break;
                case 'Year':
                    cells.push(`<td>${game.year || 'N/A'}</td>`);
                    break;
                case 'Acquisition Date':
                    cells.push(`<td>${game.acquisitionDate || 'Unknown'}</td>`);
                    break;
                case 'Plays':
                    cells.push(`<td>${game.playCount}</td>`);
                    break;
            }
        });
        return `<tr>${cells.join('')}</tr>`;
    }).join('');

    table.innerHTML = `
        <thead>
            <tr>${headerRow}</tr>
        </thead>
        <tbody>
            ${rows}
        </tbody>
    `;

    container.appendChild(table);
}

/**
 * Update footer with generation timestamp
 */
function updateFooter() {
    if (gameData && gameData.generatedAt) {
        const date = new Date(gameData.generatedAt);
        document.getElementById('last-updated').textContent =
            `Last updated: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    }
}
