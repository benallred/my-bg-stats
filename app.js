/**
 * Main Application Logic
 * Handles data loading, UI updates, and user interactions
 */

/**
 * Helper: Check if a game is currently owned
 * @param {Object} game - Game object
 * @returns {boolean} true if any copy is currently owned
 */
function isGameOwned(game) {
  if (!game.copies || game.copies.length === 0) return false;
  return game.copies.some(copy => copy.statusOwned === true);
}

/**
 * Helper: Get acquisition date for a game (from first owned or first copy)
 * @param {Object} game - Game object
 * @returns {string|null} acquisition date in YYYY-MM-DD format or null
 */
function getGameAcquisitionDate(game) {
  if (!game.copies || game.copies.length === 0) return null;

  // Prefer first owned copy, fallback to first copy
  const ownedCopy = game.copies.find(copy => copy.statusOwned === true);
  if (ownedCopy) {
    return ownedCopy.acquisitionDate || null;
  }

  // If no owned copies, return first copy's date
  return game.copies[0]?.acquisitionDate || null;
}

/**
 * Helper: Check if a game was acquired in a specific year
 * @param {Object} game - Game object
 * @param {number} year - Year to check
 * @returns {boolean} true if any copy was acquired in the year
 */
function wasGameAcquiredInYear(game, year) {
  if (!game.copies || game.copies.length === 0) return false;
  return game.copies.some(copy =>
    copy.acquisitionDate && copy.acquisitionDate.startsWith(year.toString())
  );
}

// Global data
let gameData = null;
let currentYear = null;
let currentlyOpenStatType = null;
let currentlyOpenDiagnosticType = null;
let yearDataCache = null;
let isLoadingFromPermalink = false;

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Load data
        await loadData();

        // Setup year filter
        setupYearFilter();

        // Check for permalink parameters and restore state
        loadFromPermalink();

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
    yearDataCache = getAvailableYears(gameData.plays, gameData.games);

    // Group years by pre/post-logging
    const preLoggingYears = yearDataCache.filter(y => y.isPreLogging);
    const postLoggingYears = yearDataCache.filter(y => !y.isPreLogging);

    // Add post-logging years (most recent first)
    postLoggingYears.forEach(yearObj => {
        const option = document.createElement('option');
        option.value = yearObj.year;
        option.textContent = yearObj.year;
        yearSelect.appendChild(option);
    });

    // Add separator if there are pre-logging years
    if (preLoggingYears.length > 0) {
        const separator = document.createElement('option');
        separator.disabled = true;
        separator.textContent = '─────────';
        yearSelect.appendChild(separator);

        // Add pre-logging years (most recent first)
        preLoggingYears.forEach(yearObj => {
            const option = document.createElement('option');
            option.value = yearObj.year;
            option.textContent = yearObj.year;
            yearSelect.appendChild(option);
        });
    }

    yearSelect.addEventListener('change', (e) => {
        currentYear = e.target.value === 'all' ? null : parseInt(e.target.value);
        updateYearInfoBadge();
        updateSectionVisibility();
        updateAllStats();

        // Only close sections if not loading from permalink
        if (!isLoadingFromPermalink) {
            closeDetailSection();
            closeDiagnosticDetail();
        }

        // Update URL when year changes
        updateURL();
    });
}

/**
 * Update year info badge visibility and text
 */
function updateYearInfoBadge() {
    const yearInfoBadge = document.getElementById('year-info-badge');

    if (!yearInfoBadge || !yearDataCache || !currentYear) {
        yearInfoBadge.style.display = 'none';
        return;
    }

    const yearInfo = yearDataCache.find(y => y.year === currentYear);

    if (yearInfo && yearInfo.isPreLogging) {
        yearInfoBadge.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="margin-right: 0.25rem; vertical-align: text-bottom;"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" fill="none"/><text x="8" y="12" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">i</text></svg>Pre-logging era (acquisition data only)';
        yearInfoBadge.style.display = 'inline-flex';
    } else {
        yearInfoBadge.style.display = 'none';
    }
}

/**
 * Update section visibility based on year type
 */
function updateSectionVisibility() {
    const hIndexSection = document.getElementById('h-index-section');
    const playStatsSection = document.getElementById('play-statistics-section');
    const milestoneSection = document.getElementById('milestone-section');

    // Check if current year is pre-logging
    const isPreLogging = currentYear && yearDataCache
        && yearDataCache.find(y => y.year === currentYear)?.isPreLogging;

    // Hide play-related sections in pre-logging years
    const displayValue = isPreLogging ? 'none' : 'block';

    if (hIndexSection) hIndexSection.style.display = displayValue;
    if (playStatsSection) playStatsSection.style.display = displayValue;
    if (milestoneSection) milestoneSection.style.display = displayValue;
}

/**
 * Update all statistics on the page
 */
function updateAllStats() {
    updateHIndexStats();
    updateCollectionStats();
    updatePlayStats();
    updateMilestoneStats();
    updateDiagnosticsSection();
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
    const expansionsLabel = document.querySelector('#total-expansions .stat-label');

    if (currentYear) {
        gamesOwnedLabel.textContent = 'Total Games Acquired';
        bggEntriesLabel.textContent = 'Total BGG Entries Acquired';
        expansionsLabel.textContent = 'Total Expansions Acquired';
    } else {
        gamesOwnedLabel.textContent = 'Total Games Owned';
        bggEntriesLabel.textContent = 'Total BGG Entries Owned';
        expansionsLabel.textContent = 'Total Expansions Owned';
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

    // Total Play Time
    updatePlayTimeStats();
}

/**
 * Update play time statistics
 */
function updatePlayTimeStats() {
    const playTimeData = getTotalPlayTime(gameData.plays, currentYear);
    const hours = playTimeData.totalHours.toFixed(1);
    const days = (playTimeData.totalHours / 24).toFixed(1);

    // Add tilde prefix if any durations are estimated
    const prefix = playTimeData.playsWithEstimatedDuration > 0 ? '~' : '';
    document.querySelector('#total-play-time .stat-value').textContent = `${prefix}${hours} hours`;
    document.getElementById('play-time-days').textContent = `${prefix}${days}`;
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
 * Update diagnostics section
 */
function updateDiagnosticsSection() {
    // Update unknown acquisition dates card
    const unknownGames = getGamesWithUnknownAcquisitionDate(gameData.games, currentYear);
    const unknownCard = document.querySelector('[data-stat="unknown-acquisition-dates"]');
    unknownCard.querySelector('.stat-value').textContent = unknownGames.length;

    // Update never played games card
    const neverPlayedGames = getOwnedGamesNeverPlayed(gameData.games, gameData.plays, currentYear);
    const neverPlayedCard = document.querySelector('[data-stat="never-played"]');
    neverPlayedCard.querySelector('.stat-value').textContent = neverPlayedGames.length;
}

/**
 * Setup event listeners for clickable stat cards
 */
function setupEventListeners() {
    // Main stat cards
    const clickableCards = document.querySelectorAll('.stat-card.clickable');
    clickableCards.forEach(card => {
        card.addEventListener('click', () => {
            const statType = card.dataset.stat;
            // Toggle: if clicking the already-open card, close it
            if (statType === currentlyOpenStatType) {
                closeDetailSection();
            } else {
                showDetailSection(statType);
            }
        });
    });

    // Diagnostic cards
    const diagnosticCards = document.querySelectorAll('.diagnostic-card.clickable');
    diagnosticCards.forEach(card => {
        card.addEventListener('click', () => {
            const statType = card.dataset.stat;
            // Toggle: if clicking the already-open card, close it
            if (statType === currentlyOpenDiagnosticType) {
                closeDiagnosticDetail();
            } else {
                showDiagnosticDetail(statType);
            }
        });
    });

    // Detail section close button
    document.getElementById('close-detail').addEventListener('click', closeDetailSection);

    // Diagnostic detail section close button
    document.getElementById('close-diagnostic-detail').addEventListener('click', closeDiagnosticDetail);

    // Permalink buttons
    document.getElementById('permalink-btn').addEventListener('click', () => copyPermalink(false));
    document.getElementById('diagnostic-permalink-btn').addEventListener('click', () => copyPermalink(true));

    // Diagnostics toggle button
    setupDiagnosticsToggle();
}

/**
 * Show detail section for a specific stat
 */
function showDetailSection(statType) {
    const detailSection = document.getElementById('detail-section');
    const detailTitle = document.getElementById('detail-title');
    const detailContent = document.getElementById('detail-content');

    // Remove active class from all stat cards
    document.querySelectorAll('.stat-card.clickable').forEach(card => {
        card.classList.remove('active');
    });

    // Add active class to the clicked card
    const clickedCard = document.querySelector(`.stat-card[data-stat="${statType}"]`);
    if (clickedCard) {
        clickedCard.classList.add('active');
    }

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
        case 'total-play-time':
            detailTitle.textContent = currentYear ? `Play Time by Game in ${currentYear}` : 'Play Time by Game';
            showPlayTimeBreakdown(detailContent);
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

    // Track currently open stat
    currentlyOpenStatType = statType;

    // Update URL when stat changes
    updateURL();
}

/**
 * Close detail section
 */
function closeDetailSection() {
    document.getElementById('detail-section').style.display = 'none';
    currentlyOpenStatType = null;

    // Remove active class from all stat cards
    document.querySelectorAll('.stat-card.clickable').forEach(card => {
        card.classList.remove('active');
    });

    // Update URL when detail is closed
    updateURL();
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
    // Build list of all owned copies (may include multiple copies of same game)
    const entries = [];

    gameData.games.forEach(game => {
        if (game.copies && game.copies.length > 0) {
            // Show each copy that matches the filter
            game.copies.forEach((copy, index) => {
                if (currentYear) {
                    if (copy.acquisitionDate && copy.acquisitionDate.startsWith(currentYear.toString())) {
                        entries.push({
                            game,
                            copy,
                            copyNumber: game.copies.length > 1 ? index + 1 : null
                        });
                    }
                } else {
                    if (copy.statusOwned === true) {
                        entries.push({
                            game,
                            copy,
                            copyNumber: game.copies.length > 1 ? index + 1 : null
                        });
                    }
                }
            });
        }
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
            ${entries.map(entry => {
                const game = entry.game;
                const copy = entry.copy;
                const copyNumber = entry.copyNumber;
                const name = game.name + (copyNumber ? ` (Copy ${copyNumber})` : '');
                const type = game.isBaseGame ? 'Base Game' :
                            game.isExpandalone ? 'Expandalone' :
                            game.isExpansion ? 'Expansion' : 'Unknown';
                const acquisitionDate = copy ? (copy.acquisitionDate || 'Unknown') : 'Unknown';

                return `
                    <tr>
                        <td>${name}</td>
                        <td>${type}</td>
                        <td>${acquisitionDate}</td>
                    </tr>
                `;
            }).join('')}
        </tbody>
    `;
    container.appendChild(table);
}

/**
 * Show games owned table
 */
function showGamesOwned(container) {
    const games = gameData.games.filter(game => {
        if (!game.isBaseGame) return false;
        if (currentYear) {
            // Check if ANY copy was acquired in the target year
            return wasGameAcquiredInYear(game, currentYear);
        }
        // No year: only show currently owned games
        return isGameOwned(game);
    });

    createGameTable(container, games, ['Name', 'Year', 'Acquisition Date', 'Plays'], currentYear);
}

/**
 * Show expansions table
 */
function showExpansions(container) {
    const expansions = gameData.games.filter(game => {
        // Include both expansions and expandalones
        if (!game.isExpansion && !game.isExpandalone) return false;
        if (currentYear) {
            // Check if ANY copy was acquired in the target year
            return wasGameAcquiredInYear(game, currentYear);
        }
        // No year: only show currently owned expansions/expandalones
        return isGameOwned(game);
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
                    <td>${getGameAcquisitionDate(game) || 'Unknown'}</td>
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
 * Show play time breakdown by game
 */
function showPlayTimeBreakdown(container) {
    const breakdown = getPlayTimeByGame(gameData.games, gameData.plays, currentYear);

    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Game</th>
                <th>Time Played</th>
                <th>Play Count</th>
                <th>Data Source</th>
            </tr>
        </thead>
        <tbody>
            ${breakdown.map(item => {
                const hours = item.totalHours.toFixed(1);
                let dataSource = '';
                if (item.actualCount > 0 && item.estimatedCount > 0) {
                    dataSource = `${item.actualCount} actual, ${item.estimatedCount} estimated`;
                } else if (item.actualCount > 0) {
                    dataSource = `${item.actualCount} actual`;
                } else if (item.estimatedCount > 0) {
                    dataSource = `${item.estimatedCount} estimated`;
                } else {
                    dataSource = 'No duration data';
                }

                return `
                    <tr>
                        <td>${item.game.name}</td>
                        <td>${hours} hours</td>
                        <td>${item.playCount}</td>
                        <td>${dataSource}</td>
                    </tr>
                `;
            }).join('')}
        </tbody>
    `;
    container.appendChild(table);
}

/**
 * Helper function to create a game table
 */
function createGameTable(container, games, columns, filterYear = null) {
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
                    const type = game.isBaseGame ? 'Base Game' :
                                game.isExpandalone ? 'Expandalone' :
                                game.isExpansion ? 'Expansion' : 'Unknown';
                    cells.push(`<td>${type}</td>`);
                    break;
                case 'Year':
                    cells.push(`<td>${game.year || 'N/A'}</td>`);
                    break;
                case 'Acquisition Date':
                    let acqDate = getGameAcquisitionDate(game) || 'Unknown';
                    // If year filter is active and game has copies, show the matching copy's date
                    if (filterYear && game.copies && game.copies.length > 0) {
                        const matchingCopy = game.copies.find(copy =>
                            copy.acquisitionDate && copy.acquisitionDate.startsWith(filterYear.toString())
                        );
                        if (matchingCopy) {
                            acqDate = matchingCopy.acquisitionDate;
                        }
                    }
                    cells.push(`<td>${acqDate}</td>`);
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
 * Show diagnostic detail section
 */
function showDiagnosticDetail(statType) {
    const detailSection = document.getElementById('diagnostic-detail-section');
    const detailTitle = document.getElementById('diagnostic-detail-title');
    const detailContent = document.getElementById('diagnostic-detail-content');

    // Remove active class from all diagnostic cards
    document.querySelectorAll('.diagnostic-card.clickable').forEach(card => {
        card.classList.remove('active');
    });

    // Add active class to the clicked card
    const clickedCard = document.querySelector(`.diagnostic-card[data-stat="${statType}"]`);
    if (clickedCard) {
        clickedCard.classList.add('active');
    }

    // Clear previous content
    detailContent.innerHTML = '';

    // Set title and content based on stat type
    switch (statType) {
        case 'unknown-acquisition-dates':
            detailTitle.textContent = 'Games with Unknown Acquisition Dates';
            const unknownGames = getGamesWithUnknownAcquisitionDate(gameData.games, currentYear);
            createGameTable(detailContent, unknownGames, ['Name', 'Type', 'Year']);
            break;
        case 'never-played':
            detailTitle.textContent = currentYear ? `Never Played (Acquired in ${currentYear})` : 'Never Played Games';
            const neverPlayedGames = getOwnedGamesNeverPlayed(gameData.games, gameData.plays, currentYear);
            createGameTable(detailContent, neverPlayedGames, ['Name', 'Type', 'Year', 'Acquisition Date']);
            break;
    }

    // Show section
    detailSection.style.display = 'block';

    // Track currently open diagnostic
    currentlyOpenDiagnosticType = statType;

    // Update URL when diagnostic changes
    updateURL();
}

/**
 * Close diagnostic detail section
 */
function closeDiagnosticDetail() {
    const detailSection = document.getElementById('diagnostic-detail-section');
    detailSection.style.display = 'none';
    currentlyOpenDiagnosticType = null;

    // Remove active class from all diagnostic cards
    document.querySelectorAll('.diagnostic-card.clickable').forEach(card => {
        card.classList.remove('active');
    });

    // Update URL when diagnostic is closed
    updateURL();
}

/**
 * Setup diagnostics section toggle functionality
 */
function setupDiagnosticsToggle() {
    const header = document.getElementById('diagnostics-header');
    const content = document.getElementById('diagnostics-content');

    // Load saved state from localStorage
    const isCollapsed = localStorage.getItem('diagnosticsCollapsed') === 'true';

    if (isCollapsed) {
        content.classList.add('collapsed');
    }

    // Toggle on click
    header.addEventListener('click', () => {
        const isCurrentlyCollapsed = content.classList.contains('collapsed');

        if (isCurrentlyCollapsed) {
            content.classList.remove('collapsed');
            localStorage.setItem('diagnosticsCollapsed', 'false');
        } else {
            content.classList.add('collapsed');
            localStorage.setItem('diagnosticsCollapsed', 'true');
        }
    });
}

/**
 * Load state from URL parameters (permalink)
 */
function loadFromPermalink() {
    const urlParams = new URLSearchParams(window.location.search);
    const yearParam = urlParams.get('year');
    const statParam = urlParams.get('stat');

    if (!statParam) {
        return; // No permalink parameters
    }

    isLoadingFromPermalink = true;

    // Set year if specified
    if (yearParam) {
        const year = parseInt(yearParam);
        const yearSelect = document.getElementById('year-select');
        if (yearSelect) {
            yearSelect.value = year.toString();
            currentYear = year;
            updateYearInfoBadge();
            updateSectionVisibility();
        }
    }

    // Open the specified stat after a short delay to ensure stats are loaded
    setTimeout(() => {
        // Check if it's a diagnostic stat
        const isDiagnostic = statParam === 'unknown-acquisition-dates' || statParam === 'never-played';

        if (isDiagnostic) {
            showDiagnosticDetail(statParam);
        } else {
            showDetailSection(statParam);
        }

        isLoadingFromPermalink = false;
    }, 100);
}

/**
 * Copy permalink to clipboard
 */
async function copyPermalink(isDiagnostic = false) {
    const permalink = window.location.href;
    const buttonId = isDiagnostic ? 'diagnostic-permalink-btn' : 'permalink-btn';
    const button = document.getElementById(buttonId);

    try {
        await navigator.clipboard.writeText(permalink);

        // Visual feedback: change button to show success
        if (button) {
            const originalContent = button.textContent;
            button.textContent = '✓';
            button.classList.add('copied');

            // Reset after 2 seconds
            setTimeout(() => {
                button.textContent = originalContent;
                button.classList.remove('copied');
            }, 2000);
        }
    } catch (err) {
        console.error('Failed to copy permalink:', err);
        alert('Failed to copy permalink to clipboard');
    }
}

/**
 * Update URL to reflect current state
 */
function updateURL() {
    // Skip URL updates during permalink loading
    if (isLoadingFromPermalink) {
        return;
    }

    const url = new URL(window.location.href);
    const params = new URLSearchParams();

    // Add year parameter if a specific year is selected
    if (currentYear) {
        params.set('year', currentYear.toString());
    }

    // Add stat parameter if a section is open
    if (currentlyOpenStatType) {
        params.set('stat', currentlyOpenStatType);
    } else if (currentlyOpenDiagnosticType) {
        params.set('stat', currentlyOpenDiagnosticType);
    }

    // Update the URL without reloading the page
    const newURL = params.toString() ? `${url.pathname}?${params.toString()}` : url.pathname;
    window.history.replaceState({}, '', newURL);
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
