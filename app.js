/**
 * Main Application Logic
 * Handles data loading, UI updates, and user interactions
 */

// Import all functions from stats.js
import {
  isGameOwned,
  wasGameAcquiredInYear,
  getAvailableYears,
  calculateHourHIndex,
  calculateTraditionalHIndex,
  calculatePlaySessionHIndex,
  calculateAllTimeHIndexThroughYear,
  calculateHIndexIncrease,
  getNewHIndexGames,
  getTotalBGGEntries,
  getTotalGamesOwned,
  getTotalExpansions,
  getTotalPlays,
  getTotalDaysPlayed,
  getDailySessionStats,
  getTotalGamesPlayed,
  getTotalPlayTime,
  getMilestones,
  getCumulativeMilestoneCount,
  getGamesWithUnknownAcquisitionDate,
  getOwnedGamesNeverPlayed,
  getSuggestedGames,
  getHIndexBreakdown,
  getHourHIndexBreakdown,
  getPlayTimeByGame
} from './stats.js';

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

// Global data
let gameData = null;
let currentYear = null;
let currentBaseMetric = 'hours'; // Default to hours
let currentlyOpenStatType = null;
let currentlyOpenDiagnosticType = null;
let yearDataCache = null;
let isLoadingFromPermalink = false;

// Cache for calculated statistics (refreshed when year changes)
let statsCache = null;

// Theme management
let currentTheme = 'system'; // 'system', 'light', or 'dark'

/**
 * Initialize theme on page load
 */
function initTheme() {
    // Disable transitions temporarily for initial load
    document.documentElement.classList.add('no-transition');

    // Load saved theme preference from localStorage
    const savedTheme = localStorage.getItem('themePreference');
    if (savedTheme && ['system', 'light', 'dark'].includes(savedTheme)) {
        currentTheme = savedTheme;
    }

    // Apply theme
    applyTheme();

    // Re-enable transitions after a brief delay
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            document.documentElement.classList.remove('no-transition');
        });
    });

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => {
        if (currentTheme === 'system') {
            applyTheme();
        }
    });
}

/**
 * Apply current theme to document
 */
function applyTheme() {
    const root = document.documentElement;

    if (currentTheme === 'system') {
        // Detect system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
        // Apply explicit theme
        root.setAttribute('data-theme', currentTheme);
    }

    // Update theme toggle button if it exists
    updateThemeToggleButton();
}

/**
 * Toggle theme to next state: system -> light -> dark -> system
 */
function toggleTheme() {
    if (currentTheme === 'system') {
        currentTheme = 'light';
    } else if (currentTheme === 'light') {
        currentTheme = 'dark';
    } else {
        currentTheme = 'system';
    }

    // Save preference
    localStorage.setItem('themePreference', currentTheme);

    // Apply theme
    applyTheme();
}

/**
 * Update theme toggle button appearance
 */
function updateThemeToggleButton() {
    const button = document.getElementById('theme-toggle');
    if (!button) return;

    const icons = {
        'system': '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a8 8 0 108 8 8 8 0 00-8-8zm0 14V4a6 6 0 010 12z"/></svg>',
        'light': '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10" cy="10" r="4"/><line x1="10" y1="1" x2="10" y2="3"/><line x1="10" y1="17" x2="10" y2="19"/><line x1="1" y1="10" x2="3" y2="10"/><line x1="17" y1="10" x2="19" y2="10"/><line x1="3.5" y1="3.5" x2="5" y2="5"/><line x1="15" y1="15" x2="16.5" y2="16.5"/><line x1="3.5" y1="16.5" x2="5" y2="15"/><line x1="15" y1="5" x2="16.5" y2="3.5"/></svg>',
        'dark': '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/></svg>'
    };

    const labels = {
        'system': 'System theme',
        'light': 'Light mode',
        'dark': 'Dark mode'
    };

    button.innerHTML = icons[currentTheme];
    button.setAttribute('aria-label', labels[currentTheme]);
    button.setAttribute('title', labels[currentTheme]);
}

// Helper function to get current h-index based on selected base metric
function getCurrentHIndex() {
    if (!statsCache) return 0;

    switch (currentBaseMetric) {
        case 'hours':
            return statsCache.hourHIndex;
        case 'sessions':
            return statsCache.playSessionHIndex;
        case 'plays':
            return statsCache.traditionalHIndex;
        default:
            return statsCache.hourHIndex;
    }
}

// Helper function to get current milestones based on selected base metric
function getCurrentMilestones() {
    if (!statsCache) return { fives: [], dimes: [], quarters: [], centuries: [] };

    switch (currentBaseMetric) {
        case 'hours':
            return statsCache.milestonesHours;
        case 'sessions':
            return statsCache.milestonesSessions;
        case 'plays':
            return statsCache.milestonesPlays;
        default:
            return statsCache.milestonesHours;
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize theme first (before any content loads)
        initTheme();

        // Load data
        await loadData();

        // Setup year filter
        setupYearFilter();

        // Setup base metric filter
        setupBaseMetricFilter();

        // Check for permalink parameters and restore state
        loadFromPermalink();

        // Update all stats
        updateAllStats();

        // Setup event listeners
        setupEventListeners();

        // Setup sticky header
        setupStickyHeader();

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
            // Determine if the new year is pre-logging
            const isNewYearPreLogging = currentYear && yearDataCache
                && yearDataCache.find(y => y.year === currentYear)?.isPreLogging;

            // Check if currently open stat is play-related (unavailable in pre-logging years)
            const playRelatedStats = [
                'h-index',
                'total-plays',
                'total-days-played',
                'unique-games-played',
                'total-play-time',
                'fives',
                'dimes',
                'quarters',
                'centuries'
            ];

            // Close detail section only if it's a play-related stat and year is pre-logging
            if (currentlyOpenStatType && isNewYearPreLogging && playRelatedStats.includes(currentlyOpenStatType)) {
                closeDetailSection();
            } else if (currentlyOpenStatType) {
                // Refresh the detail section with updated data for the new year
                showDetailSection(currentlyOpenStatType);
            }

            // Refresh diagnostic detail section if open
            if (currentlyOpenDiagnosticType) {
                showDiagnosticDetail(currentlyOpenDiagnosticType);
            }
        }

        // Update URL when year changes
        updateURL();
    });
}

/**
 * Setup base metric filter dropdown
 */
function setupBaseMetricFilter() {
    const baseMetricSelect = document.getElementById('base-metric-select');

    baseMetricSelect.addEventListener('change', (e) => {
        currentBaseMetric = e.target.value;

        updateHIndexStats();
        updateHIndexCardLabels();
        updateMilestoneStats();
        updateMilestoneCardLabels();
        updateMilestoneCumulativeSubstats();

        // Only refresh sections if not loading from permalink
        if (!isLoadingFromPermalink) {
            // Refresh h-index detail section if open
            if (currentlyOpenStatType === 'h-index') {
                showDetailSection('h-index');
            }

            // Refresh milestone detail sections if open
            const milestoneStats = ['fives', 'dimes', 'quarters', 'centuries'];
            if (milestoneStats.includes(currentlyOpenStatType)) {
                showDetailSection(currentlyOpenStatType);
            }
        }

        // Update URL when base metric changes
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
    // Calculate all stats once and cache them
    statsCache = {
        hourHIndex: calculateHourHIndex(gameData.plays, currentYear),
        traditionalHIndex: calculateTraditionalHIndex(gameData.games, gameData.plays, currentYear),
        playSessionHIndex: calculatePlaySessionHIndex(gameData.games, gameData.plays, currentYear),
        totalBGGEntries: getTotalBGGEntries(gameData.games, currentYear),
        totalGamesOwned: getTotalGamesOwned(gameData.games, currentYear),
        expansionsData: getTotalExpansions(gameData.games, currentYear),
        gamesPlayedData: getTotalGamesPlayed(gameData.games, gameData.plays, currentYear),
        playTimeData: getTotalPlayTime(gameData.plays, currentYear),
        milestonesHours: getMilestones(gameData.games, gameData.plays, currentYear, 'hours'),
        milestonesSessions: getMilestones(gameData.games, gameData.plays, currentYear, 'sessions'),
        milestonesPlays: getMilestones(gameData.games, gameData.plays, currentYear, 'plays'),
        cumulativeFivesHours: getCumulativeMilestoneCount(gameData.games, gameData.plays, currentYear, 'hours', 5),
        cumulativeDimesHours: getCumulativeMilestoneCount(gameData.games, gameData.plays, currentYear, 'hours', 10),
        cumulativeQuartersHours: getCumulativeMilestoneCount(gameData.games, gameData.plays, currentYear, 'hours', 25),
        cumulativeCenturiesHours: getCumulativeMilestoneCount(gameData.games, gameData.plays, currentYear, 'hours', 100),
        cumulativeFivesSessions: getCumulativeMilestoneCount(gameData.games, gameData.plays, currentYear, 'sessions', 5),
        cumulativeDimesSessions: getCumulativeMilestoneCount(gameData.games, gameData.plays, currentYear, 'sessions', 10),
        cumulativeQuartersSessions: getCumulativeMilestoneCount(gameData.games, gameData.plays, currentYear, 'sessions', 25),
        cumulativeCenturiesSessions: getCumulativeMilestoneCount(gameData.games, gameData.plays, currentYear, 'sessions', 100),
        cumulativeFivesPlays: getCumulativeMilestoneCount(gameData.games, gameData.plays, currentYear, 'plays', 5),
        cumulativeDimesPlays: getCumulativeMilestoneCount(gameData.games, gameData.plays, currentYear, 'plays', 10),
        cumulativeQuartersPlays: getCumulativeMilestoneCount(gameData.games, gameData.plays, currentYear, 'plays', 25),
        cumulativeCenturiesPlays: getCumulativeMilestoneCount(gameData.games, gameData.plays, currentYear, 'plays', 100),
        unknownGames: getGamesWithUnknownAcquisitionDate(gameData.games, currentYear),
        neverPlayedGames: getOwnedGamesNeverPlayed(gameData.games, gameData.plays, currentYear),
        suggestedGames: getSuggestedGames(gameData.games, gameData.plays),
        dailySessionStats: getDailySessionStats(gameData.plays, currentYear)
    };

    // Calculate year-in-review stats when year filter is active
    if (currentYear !== null) {
        statsCache.yearReview = {
            hoursHIndexIncrease: calculateHIndexIncrease(gameData.games, gameData.plays, currentYear, 'hours'),
            sessionsHIndexIncrease: calculateHIndexIncrease(gameData.games, gameData.plays, currentYear, 'sessions'),
            playsHIndexIncrease: calculateHIndexIncrease(gameData.games, gameData.plays, currentYear, 'plays'),
            hoursHIndexCurrent: calculateAllTimeHIndexThroughYear(gameData.games, gameData.plays, currentYear, 'hours'),
            sessionsHIndexCurrent: calculateAllTimeHIndexThroughYear(gameData.games, gameData.plays, currentYear, 'sessions'),
            playsHIndexCurrent: calculateAllTimeHIndexThroughYear(gameData.games, gameData.plays, currentYear, 'plays'),
            hoursHIndexPrevious: calculateAllTimeHIndexThroughYear(gameData.games, gameData.plays, currentYear - 1, 'hours'),
            sessionsHIndexPrevious: calculateAllTimeHIndexThroughYear(gameData.games, gameData.plays, currentYear - 1, 'sessions'),
            playsHIndexPrevious: calculateAllTimeHIndexThroughYear(gameData.games, gameData.plays, currentYear - 1, 'plays')
        };
    }

    updateHIndexStats();
    updateHIndexCardLabels();
    updateCollectionStats();
    updatePlayStats();
    updateMilestoneStats();
    updateMilestoneCardLabels();
    updateMilestoneCumulativeSubstats();
    updateDiagnosticsSection();
    updateYearInReview();
}

/**
 * Update H-Index statistics
 */
function updateHIndexStats() {
    const hIndexValue = getCurrentHIndex();
    document.querySelector('#h-index .stat-value').textContent = hIndexValue;
}

/**
 * Update H-Index card title and description based on current metric
 */
function updateHIndexCardLabels() {
    const titleElement = document.getElementById('h-index-title');
    const descriptionElement = document.getElementById('h-index-description');

    const labels = {
        hours: {
            title: 'Hour H-Index',
            description: 'Games ranked by total hours'
        },
        sessions: {
            title: 'Play Session H-Index',
            description: 'Games ranked by days played'
        },
        plays: {
            title: 'Traditional H-Index',
            description: 'Games ranked by play count'
        }
    };

    const label = labels[currentBaseMetric] || labels.hours;
    titleElement.textContent = label.title;
    descriptionElement.textContent = label.description;
}

/**
 * Update milestone card labels based on current base metric
 */
function updateMilestoneCardLabels() {
    const labels = {
        hours: {
            fives: 'Games played 5-9 hours total',
            dimes: 'Games played 10-24 hours total',
            quarters: 'Games played 25-99 hours total',
            centuries: 'Games played 100 or more hours total'
        },
        sessions: {
            fives: 'Games played 5-9 days total',
            dimes: 'Games played 10-24 days total',
            quarters: 'Games played 25-99 days total',
            centuries: 'Games played 100 or more days total'
        },
        plays: {
            fives: 'Games played 5-9 times',
            dimes: 'Games played 10-24 times',
            quarters: 'Games played 25-99 times',
            centuries: 'Games played 100 or more times'
        }
    };

    const currentLabels = labels[currentBaseMetric] || labels.hours;

    document.querySelector('#fives .stat-description').textContent = currentLabels.fives;
    document.querySelector('#dimes .stat-description').textContent = currentLabels.dimes;
    document.querySelector('#quarters .stat-description').textContent = currentLabels.quarters;
    document.querySelector('#centuries .stat-description').textContent = currentLabels.centuries;
}

/**
 * Update cumulative substats for milestone cards based on current base metric
 */
function updateMilestoneCumulativeSubstats() {
    if (!statsCache) return;

    const metricNames = {
        hours: 'hours',
        sessions: 'sessions',
        plays: 'plays'
    };

    const metricName = metricNames[currentBaseMetric] || 'hours';

    // Get cumulative counts based on current metric
    let cumulativeFives, cumulativeDimes, cumulativeQuarters;

    switch (currentBaseMetric) {
        case 'sessions':
            cumulativeFives = statsCache.cumulativeFivesSessions;
            cumulativeDimes = statsCache.cumulativeDimesSessions;
            cumulativeQuarters = statsCache.cumulativeQuartersSessions;
            break;
        case 'plays':
            cumulativeFives = statsCache.cumulativeFivesPlays;
            cumulativeDimes = statsCache.cumulativeDimesPlays;
            cumulativeQuarters = statsCache.cumulativeQuartersPlays;
            break;
        case 'hours':
        default:
            cumulativeFives = statsCache.cumulativeFivesHours;
            cumulativeDimes = statsCache.cumulativeDimesHours;
            cumulativeQuarters = statsCache.cumulativeQuartersHours;
            break;
    }

    // Update labels
    document.getElementById('fives-cumulative-label').textContent = `All games with 5+ ${metricName}:`;
    document.getElementById('dimes-cumulative-label').textContent = `All games with 10+ ${metricName}:`;
    document.getElementById('quarters-cumulative-label').textContent = `All games with 25+ ${metricName}:`;

    // Update values
    document.getElementById('fives-cumulative').textContent = cumulativeFives;
    document.getElementById('dimes-cumulative').textContent = cumulativeDimes;
    document.getElementById('quarters-cumulative').textContent = cumulativeQuarters;
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
    document.querySelector('#total-bgg-entries .stat-value').textContent = statsCache.totalBGGEntries;

    // Total Games Owned
    document.querySelector('#total-games-owned .stat-value').textContent = statsCache.totalGamesOwned;

    // Total Expansions
    document.querySelector('#total-expansions .stat-value').textContent = statsCache.expansionsData.total;
    document.getElementById('expandalones-count').textContent = statsCache.expansionsData.expandalones;
    document.getElementById('expansion-only-count').textContent = statsCache.expansionsData.expansionOnly;
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

    // Daily Session Stats
    const dailySessionMedian = document.getElementById('daily-session-median');
    const dailySessionAverage = document.getElementById('daily-session-average');
    if (statsCache.dailySessionStats.medianHours !== null) {
        dailySessionMedian.textContent = `${statsCache.dailySessionStats.medianHours.toFixed(1)} hours per gaming day`;
        dailySessionAverage.textContent = `${statsCache.dailySessionStats.averageHours.toFixed(1)} hours per gaming day`;
    } else {
        dailySessionMedian.textContent = '--';
        dailySessionAverage.textContent = '--';
    }

    // Unique Games Played
    document.querySelector('#unique-games-played .stat-value').textContent = statsCache.gamesPlayedData.total;

    // Show/hide new-to-me substat
    const newToMeContainer = document.getElementById('new-to-me-container');
    if (currentYear && statsCache.gamesPlayedData.newToMe !== null) {
        newToMeContainer.style.display = 'block';
        document.getElementById('new-to-me-count').textContent = statsCache.gamesPlayedData.newToMe;
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
    const hours = statsCache.playTimeData.totalHours.toFixed(1);
    const days = (statsCache.playTimeData.totalHours / 24).toFixed(1);

    // Add tilde prefix if any durations are estimated
    const prefix = statsCache.playTimeData.playsWithEstimatedDuration > 0 ? '~' : '';
    document.querySelector('#total-play-time .stat-value').textContent = `${prefix}${hours} hours`;
    document.getElementById('play-time-days').textContent = `${prefix}${days}`;
}

/**
 * Update milestone statistics
 */
function updateMilestoneStats() {
    const milestones = getCurrentMilestones();
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
    const unknownCard = document.querySelector('[data-stat="unknown-acquisition-dates"]');
    unknownCard.querySelector('.stat-value').textContent = statsCache.unknownGames.length;

    // Update never played games card
    const neverPlayedCard = document.querySelector('[data-stat="never-played"]');
    neverPlayedCard.querySelector('.stat-value').textContent = statsCache.neverPlayedGames.length;
}

/**
 * Update Gaming Year in Review card visibility
 */
function updateYearInReview() {
    const yearReviewCard = document.getElementById('year-review-card');

    // Only show card when year filter is active and not a pre-logging year
    if (currentYear !== null && statsCache.yearReview) {
        // Check if this is a pre-logging year
        const yearInfo = yearDataCache && yearDataCache.find(y => y.year === currentYear);
        const isPreLogging = yearInfo && yearInfo.isPreLogging;

        if (!isPreLogging) {
            yearReviewCard.style.display = 'block';
        } else {
            yearReviewCard.style.display = 'none';
        }
    } else {
        yearReviewCard.style.display = 'none';
    }
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

    // Theme toggle button
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
}

/**
 * Helper function to populate stat summary in detail header
 */
function populateStatSummary(summaryElement, mainValue, substats = []) {
    if (!mainValue && (!substats || substats.length === 0)) {
        summaryElement.style.display = 'none';
        return;
    }

    summaryElement.innerHTML = '';
    summaryElement.style.display = 'flex';

    // Add main stat value
    if (mainValue) {
        const mainDiv = document.createElement('div');
        mainDiv.className = 'detail-stat-main';
        mainDiv.textContent = mainValue;
        summaryElement.appendChild(mainDiv);
    }

    // Add substats if present
    if (substats && substats.length > 0) {
        const substatsDiv = document.createElement('div');
        substatsDiv.className = 'detail-stat-substats';

        substats.forEach(substat => {
            const substatDiv = document.createElement('div');
            substatDiv.className = 'detail-substat';

            const label = document.createElement('span');
            label.className = 'detail-substat-label';
            label.textContent = substat.label;

            const value = document.createElement('span');
            value.className = 'detail-substat-value';
            value.textContent = substat.value;

            substatDiv.appendChild(label);
            substatDiv.appendChild(value);
            substatsDiv.appendChild(substatDiv);
        });

        summaryElement.appendChild(substatsDiv);
    }
}

/**
 * Configuration map for stat detail handlers
 * Each handler defines how to display title, summary, and content for a stat type
 */
const statDetailHandlers = {
    'h-index': {
        getTitle: (currentYear) => {
            const metricTitles = {
                hours: 'Hour H-Index',
                sessions: 'Play Session H-Index',
                plays: 'Traditional H-Index'
            };
            const title = metricTitles[currentBaseMetric] || 'H-Index';
            return `${title} Breakdown${currentYear ? ` (${currentYear})` : ' (All Time)'}`;
        },
        getSummary: (statsCache) => ({
            mainValue: getCurrentHIndex()
        }),
        render: (detailContent, statsCache) => {
            const hIndexValue = getCurrentHIndex();
            showHIndexBreakdown(detailContent, currentBaseMetric, hIndexValue);
        }
    },
    'total-bgg-entries': {
        getTitle: (currentYear) => currentYear ? `BGG Entries Acquired in ${currentYear}` : 'BGG Entries (All Time)',
        getSummary: (statsCache) => ({
            mainValue: statsCache.totalBGGEntries
        }),
        render: (detailContent) => {
            showBGGEntries(detailContent);
        }
    },
    'total-games-owned': {
        getTitle: (currentYear) => currentYear ? `Games Acquired in ${currentYear}` : 'Games Owned (All Time)',
        getSummary: (statsCache) => ({
            mainValue: statsCache.totalGamesOwned
        }),
        render: (detailContent) => {
            showGamesOwned(detailContent);
        }
    },
    'total-expansions': {
        getTitle: (currentYear) => currentYear ? `Expansions Acquired in ${currentYear}` : 'Expansions (All Time)',
        getSummary: (statsCache) => ({
            mainValue: statsCache.expansionsData.total,
            substats: [
                { label: 'Expandalones:', value: statsCache.expansionsData.expandalones },
                { label: 'Expansion-only:', value: statsCache.expansionsData.expansionOnly }
            ]
        }),
        render: (detailContent) => {
            showExpansions(detailContent);
        }
    },
    'unique-games-played': {
        getTitle: (currentYear) => currentYear ? `Unique Games Played in ${currentYear}` : 'Unique Games Played (All Time)',
        getSummary: (statsCache, currentYear) => {
            const substats = [];
            if (currentYear && statsCache.gamesPlayedData.newToMe !== null) {
                substats.push({ label: 'New-to-me:', value: statsCache.gamesPlayedData.newToMe });
            }
            return {
                mainValue: statsCache.gamesPlayedData.total,
                substats: substats
            };
        },
        render: (detailContent) => {
            showGamesPlayed(detailContent);
        }
    },
    'total-play-time': {
        getTitle: (currentYear) => currentYear ? `Play Time by Game in ${currentYear}` : 'Play Time by Game (All Time)',
        getSummary: (statsCache) => {
            const hours = statsCache.playTimeData.totalHours.toFixed(1);
            const days = (statsCache.playTimeData.totalHours / 24).toFixed(1);
            const prefix = statsCache.playTimeData.playsWithEstimatedDuration > 0 ? '~' : '';
            return {
                mainValue: `${prefix}${hours} hours`,
                substats: [
                    { label: 'In days:', value: `${prefix}${days}` }
                ]
            };
        },
        render: (detailContent) => {
            showPlayTimeBreakdown(detailContent);
        }
    },
    'fives': {
        getTitle: (currentYear) => {
            const metricLabels = {
                hours: 'Fives (5-9 Hours)',
                sessions: 'Fives (5-9 Days)',
                plays: 'Fives (5-9 Plays)'
            };
            const label = metricLabels[currentBaseMetric] || metricLabels.hours;
            return `${label}${currentYear ? ` (${currentYear})` : ' (All Time)'}`;
        },
        getSummary: () => {
            const milestones = getCurrentMilestones();
            return { mainValue: milestones.fives.length };
        },
        render: (detailContent) => {
            const milestones = getCurrentMilestones();
            showMilestoneGames(detailContent, 'fives', milestones);
        }
    },
    'dimes': {
        getTitle: (currentYear) => {
            const metricLabels = {
                hours: 'Dimes (10-24 Hours)',
                sessions: 'Dimes (10-24 Days)',
                plays: 'Dimes (10-24 Plays)'
            };
            const label = metricLabels[currentBaseMetric] || metricLabels.hours;
            return `${label}${currentYear ? ` (${currentYear})` : ' (All Time)'}`;
        },
        getSummary: () => {
            const milestones = getCurrentMilestones();
            return { mainValue: milestones.dimes.length };
        },
        render: (detailContent) => {
            const milestones = getCurrentMilestones();
            showMilestoneGames(detailContent, 'dimes', milestones);
        }
    },
    'quarters': {
        getTitle: (currentYear) => {
            const metricLabels = {
                hours: 'Quarters (25-99 Hours)',
                sessions: 'Quarters (25-99 Days)',
                plays: 'Quarters (25-99 Plays)'
            };
            const label = metricLabels[currentBaseMetric] || metricLabels.hours;
            return `${label}${currentYear ? ` (${currentYear})` : ' (All Time)'}`;
        },
        getSummary: () => {
            const milestones = getCurrentMilestones();
            return { mainValue: milestones.quarters.length };
        },
        render: (detailContent) => {
            const milestones = getCurrentMilestones();
            showMilestoneGames(detailContent, 'quarters', milestones);
        }
    },
    'centuries': {
        getTitle: (currentYear) => {
            const metricLabels = {
                hours: 'Centuries (100+ Hours)',
                sessions: 'Centuries (100+ Days)',
                plays: 'Centuries (100+ Plays)'
            };
            const label = metricLabels[currentBaseMetric] || metricLabels.hours;
            return `${label}${currentYear ? ` (${currentYear})` : ' (All Time)'}`;
        },
        getSummary: () => {
            const milestones = getCurrentMilestones();
            return { mainValue: milestones.centuries.length };
        },
        render: (detailContent) => {
            const milestones = getCurrentMilestones();
            showMilestoneGames(detailContent, 'centuries', milestones);
        }
    },
    'play-next-suggestions': {
        getTitle: () => 'Play Next Suggestions',
        getSummary: (statsCache) => ({
            mainValue: `${statsCache.suggestedGames.length} game${statsCache.suggestedGames.length === 1 ? '' : 's'}`
        }),
        render: (detailContent) => {
            showSuggestedGames(detailContent);
        }
    },
    'year-review': {
        getTitle: (currentYear) => `Gaming Year in Review (${currentYear})`,
        getSummary: () => ({
            mainValue: ''
        }),
        render: (detailContent, statsCache) => {
            showYearReviewDetail(detailContent, statsCache);
        }
    }
};

/**
 * Show detail section for a specific stat
 */
function showDetailSection(statType) {
    const detailSection = document.getElementById('detail-section');
    const detailTitle = document.getElementById('detail-title');
    const detailContent = document.getElementById('detail-content');
    const detailStatSummary = document.getElementById('detail-stat-summary');

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
    detailStatSummary.innerHTML = '';
    detailStatSummary.style.display = 'none';

    // Get handler for this stat type
    const handler = statDetailHandlers[statType];
    if (!handler) {
        console.error(`No handler found for stat type: ${statType}`);
        return;
    }

    // Set title using handler
    detailTitle.textContent = handler.getTitle(currentYear);

    // Get summary data and populate
    const summary = handler.getSummary(statsCache, currentYear);
    populateStatSummary(detailStatSummary, summary.mainValue, summary.substats);

    // Render content using handler
    handler.render(detailContent, statsCache, currentYear);

    // Show section
    detailSection.style.display = 'block';

    // Calculate scroll position to show detail section optimally
    requestAnimationFrame(() => {
        // Wait another frame to ensure layout is complete
        requestAnimationFrame(() => {
            const detailSectionRect = detailSection.getBoundingClientRect();
            const sectionStyles = getComputedStyle(detailSection);
            const marginBottom = parseFloat(sectionStyles.marginBottom);

            // Position the visual bottom of the section at the viewport bottom
            // The visual bottom excludes the margin-bottom
            const targetBottom = detailSectionRect.bottom - marginBottom;
            const viewportHeight = window.innerHeight;

            // Calculate how much to scroll to align bottom with viewport bottom
            const scrollAmount = targetBottom - viewportHeight;

            // Only skip scrolling if we're already at the exact position
            if (Math.abs(scrollAmount) < 1) {
                return;
            }

            // Scroll to position (can be positive to scroll down or negative to scroll up)
            window.scrollTo({
                top: window.pageYOffset + scrollAmount,
                behavior: 'smooth'
            });
        });
    });

    // Track currently open stat
    currentlyOpenStatType = statType;

    // Update detail header height for sticky table headers
    updateDetailHeaderHeight();

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
 * @param {HTMLElement} container - Container element
 * @param {string} metric - Metric type: 'hours', 'sessions', or 'plays'
 * @param {number} hIndex - H-index value
 */
function showHIndexBreakdown(container, metric, hIndex) {
    let breakdown, columnHeader, valueKey;

    if (metric === 'hours') {
        breakdown = getHourHIndexBreakdown(gameData.games, gameData.plays, currentYear);
        columnHeader = 'Hours';
        valueKey = 'hours';
    } else if (metric === 'sessions') {
        breakdown = getHIndexBreakdown(gameData.games, gameData.plays, currentYear, true);
        columnHeader = 'Days Played';
        valueKey = 'count';
    } else { // metric === 'plays'
        breakdown = getHIndexBreakdown(gameData.games, gameData.plays, currentYear, false);
        columnHeader = 'Play Count';
        valueKey = 'count';
    }

    const table = document.createElement('table');
    table.className = 'h-index-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>Rank</th>
                <th>Game</th>
                <th>${columnHeader}</th>
                <th>Contributes to H-Index?</th>
            </tr>
        </thead>
        <tbody>
            ${breakdown.map((item, index) => {
                const rank = index + 1;
                const value = item[valueKey];
                const contributesToHIndex = rank <= value && rank <= hIndex;
                const displayValue = metric === 'hours' ? value.toFixed(1) : value;
                return `
                    <tr${contributesToHIndex ? ' class="h-index-contributor"' : ''}>
                        <td>${rank}</td>
                        <td>${item.game.name}</td>
                        <td>${displayValue}</td>
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
function showMilestoneGames(container, milestone, milestonesData) {
    const games = milestonesData[milestone];

    // Determine column header based on current base metric
    const columnHeaders = {
        hours: 'Total Hours',
        sessions: 'Days Played',
        plays: 'Play Count'
    };
    const columnHeader = columnHeaders[currentBaseMetric] || 'Total Hours';

    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Game</th>
                <th>${columnHeader}</th>
            </tr>
        </thead>
        <tbody>
            ${games.map(item => {
                // Format count based on metric
                let formattedCount;
                if (currentBaseMetric === 'hours') {
                    formattedCount = item.count.toFixed(1);
                } else {
                    formattedCount = Math.floor(item.count);
                }
                return `
                <tr>
                    <td>${item.game.name}</td>
                    <td>${formattedCount}</td>
                </tr>
                `;
            }).join('')}
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
                <th>Min/Max Play Time</th>
                <th>Median/Avg Play Time</th>
                <th>Play Durations</th>
            </tr>
        </thead>
        <tbody>
            ${breakdown.map(item => {
                const hours = item.totalHours.toFixed(1);
                let dataSource = '';
                if (item.actualCount > 0 && item.estimatedCount > 0) {
                    dataSource = `${item.actualCount}&nbsp;actual, ${item.estimatedCount}&nbsp;estimated`;
                } else if (item.actualCount > 0) {
                    dataSource = `${item.actualCount}&nbsp;actual`;
                } else if (item.estimatedCount > 0) {
                    dataSource = `${item.estimatedCount}&nbsp;estimated`;
                } else {
                    dataSource = 'No duration data';
                }

                // Format play time values
                const formatMinutes = (minutes) => {
                    if (minutes === null) return '-';
                    const hrs = Math.floor(minutes / 60);
                    const mins = Math.round(minutes % 60);
                    if (hrs > 0) {
                        return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
                    }
                    return `${mins}m`;
                };

                const minMax = `${formatMinutes(item.minMinutes)}<br>${formatMinutes(item.maxMinutes)}`;
                const medianAvg = `${formatMinutes(item.medianMinutes)}<br>${formatMinutes(item.avgMinutes)}`;

                return `
                    <tr>
                        <td>${item.game.name}</td>
                        <td>${hours} hours</td>
                        <td>${item.playCount}</td>
                        <td class="no-wrap">${minMax}</td>
                        <td class="no-wrap">${medianAvg}</td>
                        <td>${dataSource}</td>
                    </tr>
                `;
            }).join('')}
        </tbody>
    `;
    container.appendChild(table);
}

/**
 * Show suggested games to play next
 */
function showSuggestedGames(container) {
    const suggestions = statsCache.suggestedGames;

    if (suggestions.length === 0) {
        container.innerHTML = '<p>No suggestions available. This could mean all your owned base games are well-played!</p>';
        return;
    }

    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Game</th>
                <th>Recommendation Reason</th>
                <th>Details</th>
            </tr>
        </thead>
        <tbody>
            ${suggestions.map(suggestion => {
                const reasonsDisplay = suggestion.reasons.join('<br/>');
                const statsDisplay = suggestion.stats.join('<br/>');

                return `
                    <tr>
                        <td>${suggestion.game.name}</td>
                        <td>${reasonsDisplay}</td>
                        <td>${statsDisplay}</td>
                    </tr>
                `;
            }).join('')}
        </tbody>
    `;
    container.appendChild(table);
}

/**
 * Show Gaming Year in Review detail
 */
function showYearReviewDetail(container, statsCache) {
    if (!statsCache.yearReview) {
        container.innerHTML = '<p>No year-in-review data available.</p>';
        return;
    }

    const formatIncrease = (increase, previous, current) => {
        const sign = increase > 0 ? '+' : '';
        return `${sign}${increase} (from ${previous} to ${current})`;
    };

    // Get new h-index games for each metric
    const newHoursGames = getNewHIndexGames(gameData.games, gameData.plays, currentYear, 'hours');
    const newSessionsGames = getNewHIndexGames(gameData.games, gameData.plays, currentYear, 'sessions');
    const newPlaysGames = getNewHIndexGames(gameData.games, gameData.plays, currentYear, 'plays');

    const detailDiv = document.createElement('div');
    detailDiv.className = 'year-review-detail';
    detailDiv.innerHTML = `
        <div class="year-review-subsection">
            <h3 class="year-review-subsection-heading">Engagement & Milestones</h3>
            <table class="year-review-table">
                <tbody>
                    <tr class="year-review-row-clickable" data-metric="hours">
                        <td class="year-review-label-detail">
                            <span class="year-review-expand-icon">▶</span>
                            Increase in all-time hours h-index:
                        </td>
                        <td class="year-review-value-detail">${formatIncrease(
                            statsCache.yearReview.hoursHIndexIncrease,
                            statsCache.yearReview.hoursHIndexPrevious,
                            statsCache.yearReview.hoursHIndexCurrent
                        )}</td>
                    </tr>
                    <tr class="year-review-expanded-content" data-metric="hours" style="display: none;">
                        <td colspan="2">
                            <div class="year-review-games-list">
                                ${newHoursGames.length > 0
                                    ? newHoursGames.map(item => `
                                        <div class="year-review-game-item">
                                            <span class="year-review-game-name">${item.game.name}</span>
                                            <span class="year-review-game-value">${item.value.toFixed(1)} hours (${item.thisYearValue.toFixed(1)} this year)</span>
                                        </div>
                                    `).join('')
                                    : '<div class="year-review-no-games">No new games added to h-index</div>'
                                }
                            </div>
                        </td>
                    </tr>
                    <tr class="year-review-row-clickable" data-metric="sessions">
                        <td class="year-review-label-detail">
                            <span class="year-review-expand-icon">▶</span>
                            Increase in all-time sessions h-index:
                        </td>
                        <td class="year-review-value-detail">${formatIncrease(
                            statsCache.yearReview.sessionsHIndexIncrease,
                            statsCache.yearReview.sessionsHIndexPrevious,
                            statsCache.yearReview.sessionsHIndexCurrent
                        )}</td>
                    </tr>
                    <tr class="year-review-expanded-content" data-metric="sessions" style="display: none;">
                        <td colspan="2">
                            <div class="year-review-games-list">
                                ${newSessionsGames.length > 0
                                    ? newSessionsGames.map(item => `
                                        <div class="year-review-game-item">
                                            <span class="year-review-game-name">${item.game.name}</span>
                                            <span class="year-review-game-value">${item.value} days (${item.thisYearValue} this year)</span>
                                        </div>
                                    `).join('')
                                    : '<div class="year-review-no-games">No new games added to h-index</div>'
                                }
                            </div>
                        </td>
                    </tr>
                    <tr class="year-review-row-clickable" data-metric="plays">
                        <td class="year-review-label-detail">
                            <span class="year-review-expand-icon">▶</span>
                            Increase in all-time plays h-index:
                        </td>
                        <td class="year-review-value-detail">${formatIncrease(
                            statsCache.yearReview.playsHIndexIncrease,
                            statsCache.yearReview.playsHIndexPrevious,
                            statsCache.yearReview.playsHIndexCurrent
                        )}</td>
                    </tr>
                    <tr class="year-review-expanded-content" data-metric="plays" style="display: none;">
                        <td colspan="2">
                            <div class="year-review-games-list">
                                ${newPlaysGames.length > 0
                                    ? newPlaysGames.map(item => `
                                        <div class="year-review-game-item">
                                            <span class="year-review-game-name">${item.game.name}</span>
                                            <span class="year-review-game-value">${item.value} plays (${item.thisYearValue} this year)</span>
                                        </div>
                                    `).join('')
                                    : '<div class="year-review-no-games">No new games added to h-index</div>'
                                }
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;

    // Add click handlers for expandable rows
    const clickableRows = detailDiv.querySelectorAll('.year-review-row-clickable');
    clickableRows.forEach(row => {
        row.addEventListener('click', () => {
            const metric = row.dataset.metric;
            const expandedRow = detailDiv.querySelector(`.year-review-expanded-content[data-metric="${metric}"]`);
            const icon = row.querySelector('.year-review-expand-icon');

            if (expandedRow.style.display === 'none') {
                expandedRow.style.display = 'table-row';
                icon.textContent = '▼';
            } else {
                expandedRow.style.display = 'none';
                icon.textContent = '▶';
            }
        });
    });

    container.appendChild(detailDiv);
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
 * Configuration map for diagnostic detail handlers
 * Each handler defines how to display title, summary, and content for a diagnostic type
 */
const diagnosticDetailHandlers = {
    'unknown-acquisition-dates': {
        getTitle: () => 'Games with Unknown Acquisition Dates',
        getSummary: (statsCache) => ({
            mainValue: statsCache.unknownGames.length
        }),
        render: (detailContent, statsCache) => {
            createGameTable(detailContent, statsCache.unknownGames, ['Name', 'Type', 'Year']);
        }
    },
    'never-played': {
        getTitle: (currentYear) => currentYear ? `Never Played (Acquired in ${currentYear})` : 'Never Played Games (All Time)',
        getSummary: (statsCache) => ({
            mainValue: statsCache.neverPlayedGames.length
        }),
        render: (detailContent, statsCache) => {
            createGameTable(detailContent, statsCache.neverPlayedGames, ['Name', 'Type', 'Year', 'Acquisition Date']);
        }
    }
};

/**
 * Show diagnostic detail section
 */
function showDiagnosticDetail(statType) {
    const detailSection = document.getElementById('diagnostic-detail-section');
    const detailTitle = document.getElementById('diagnostic-detail-title');
    const detailContent = document.getElementById('diagnostic-detail-content');
    const detailStatSummary = document.getElementById('diagnostic-stat-summary');

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
    detailStatSummary.innerHTML = '';
    detailStatSummary.style.display = 'none';

    // Get handler for this diagnostic type
    const handler = diagnosticDetailHandlers[statType];
    if (!handler) {
        console.error(`No handler found for diagnostic type: ${statType}`);
        return;
    }

    // Set title using handler
    detailTitle.textContent = handler.getTitle(currentYear);

    // Get summary data and populate
    const summary = handler.getSummary(statsCache);
    populateStatSummary(detailStatSummary, summary.mainValue, summary.substats);

    // Render content using handler
    handler.render(detailContent, statsCache, currentYear);

    // Show section
    detailSection.style.display = 'block';

    // Track currently open diagnostic
    currentlyOpenDiagnosticType = statType;

    // Update detail header height for sticky table headers
    updateDiagnosticHeaderHeight();

    // Update URL when diagnostic changes
    updateURL();
}

/**
 * Update diagnostic header height CSS variable when diagnostic detail section is shown
 */
function updateDiagnosticHeaderHeight() {
    const detailHeader = document.querySelector('#diagnostic-detail-section .detail-header');
    if (detailHeader) {
        requestAnimationFrame(() => {
            const detailHeaderHeight = detailHeader.offsetHeight;
            document.documentElement.style.setProperty('--detail-header-height', `${detailHeaderHeight}px`);
        });
    }
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
    const baseMetricParam = urlParams.get('baseMetric');
    const statParam = urlParams.get('stat');

    if (!yearParam && !baseMetricParam && !statParam) {
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

    // Set base metric if specified
    if (baseMetricParam && ['hours', 'sessions', 'plays'].includes(baseMetricParam)) {
        const baseMetricSelect = document.getElementById('base-metric-select');
        if (baseMetricSelect) {
            baseMetricSelect.value = baseMetricParam;
            currentBaseMetric = baseMetricParam;
            updateHIndexCardLabels();
        }
    }

    // Open the specified stat after a short delay to ensure stats are loaded
    if (statParam) {
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
    } else {
        isLoadingFromPermalink = false;
    }
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

    // Add base metric parameter if not default
    if (currentBaseMetric !== 'hours') {
        params.set('baseMetric', currentBaseMetric);
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

/**
 * Setup sticky header that compacts on scroll
 */
function setupStickyHeader() {
    const header = document.querySelector('header');
    const h1 = header.querySelector('h1');

    // Capture initial values
    let initialHeight = 0;
    requestAnimationFrame(() => {
        initialHeight = header.offsetHeight;
    });

    window.addEventListener('scroll', () => {
        if (initialHeight === 0) return;

        const scrollY = window.scrollY;
        const scrollProgress = Math.min(scrollY / initialHeight, 1); // 0 to 1

        // Calculate values based on scroll progress
        const padding = 2 - (scrollProgress * 1); // 2rem to 1rem
        const h1MarginBottom = 1 - scrollProgress; // 1rem to 0
        const h1FontSize = 2 - (scrollProgress * 0.5); // 2rem to 1.5rem (default is 2rem via browser)
        const shadowBlur = 2 + (scrollProgress * 2); // 2px to 4px
        const shadowAlpha = 0.1 + (scrollProgress * 0.05); // 0.1 to 0.15

        // Apply styles directly
        header.style.paddingTop = `${padding}rem`;
        header.style.paddingBottom = `${padding}rem`;
        header.style.boxShadow = `0 ${shadowBlur}px ${shadowBlur * 2}px rgba(0,0,0,${shadowAlpha})`;

        h1.style.marginBottom = `${h1MarginBottom}rem`;
        h1.style.fontSize = `${h1FontSize}rem`;

        // Handle sticky state class
        if (scrollProgress >= 1) {
            header.classList.add('sticky-scrolled');
        } else {
            header.classList.remove('sticky-scrolled');
        }

        // Update CSS variable for detail header sticky positioning
        const currentHeaderHeight = header.offsetHeight;
        document.documentElement.style.setProperty('--main-header-height', `${currentHeaderHeight}px`);

        // Also update detail header height if it exists
        const detailHeader = document.querySelector('.detail-header');
        if (detailHeader) {
            const detailHeaderHeight = detailHeader.offsetHeight;
            document.documentElement.style.setProperty('--detail-header-height', `${detailHeaderHeight}px`);
        }
    }, { passive: true });
}

/**
 * Update detail header height CSS variable when detail section is shown
 */
function updateDetailHeaderHeight() {
    const detailHeader = document.querySelector('.detail-header');
    if (detailHeader) {
        requestAnimationFrame(() => {
            const detailHeaderHeight = detailHeader.offsetHeight;
            document.documentElement.style.setProperty('--detail-header-height', `${detailHeaderHeight}px`);
        });
    }
}
