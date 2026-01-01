/**
 * Main Application Logic
 * Handles data loading, UI updates, and user interactions
 */

// Import all functions from stats.js
import {
  Metric,
  Milestone,
  isGameOwned,
  wasGameAcquiredInYear,
  isPlayInYear,
  getAvailableYears,
  calculateHourHIndex,
  calculateTraditionalHIndex,
  calculatePlaySessionHIndex,
  calculateAllTimeHIndexThroughYear,
  calculateHIndexIncrease,
  getNewHIndexGames,
  calculatePeopleHIndex,
  calculateAllTimePeopleHIndexThroughYear,
  calculatePeopleHIndexIncrease,
  getPeopleHIndexBreakdown,
  getNewPeopleHIndexGames,
  calculateMilestoneIncrease,
  getNewMilestoneGames,
  getSkippedMilestoneCount,
  getTotalBGGEntries,
  getTotalGamesOwned,
  getTotalExpansions,
  getTotalPlays,
  getTotalDaysPlayed,
  getDailySessionStats,
  getTotalGamesPlayed,
  getTotalPlayTime,
  getMilestones,
  getMilestoneCountThroughYear,
  getGamesWithUnknownAcquisitionDate,
  getOwnedGamesNeverPlayed,
  getOwnedBaseGamesMissingPricePaid,
  getSuggestedGames,
  getHIndexBreakdown,
  getHourHIndexBreakdown,
  getPlayTimeByGame,
  getDaysPlayedByGame,
  getTopGamesByMetric,
  getTopNewToMeGame,
  getTopReturningGame,
  getTimeAndActivityStats,
  getLoggingAchievements,
  getSoloStats,
  getPlayerStats,
  getLocationStats,
  getSoloGameStats,
  getTopPlayerByMetric,
  getTopLocationByMetric,
  getTopSoloGameByHours,
  getLongestSinglePlays,
  getTopGamesByUniquePlayers,
  getTopGamesByUniqueLocations,
  getAllLocationsBySession,
  ValueClub,
  getTotalCost,
  getValueClubGames,
  calculateValueClubIncrease,
  getNewValueClubGames,
  getSkippedValueClubCount,
  getCostPerMetricStats,
  getShelfOfShame,
  getShelfOfShameChanges,
} from './stats.js';

import { formatApproximateHours, formatCostLabel, formatDateShort, formatDateWithWeekday, formatLargeNumber } from './formatting.js';

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
 * Helper: Get all initials from game name for placeholder
 * @param {string} name - Game name
 * @returns {string} Initials string
 */
function getGameInitials(name) {
  const words = name.split(/\s+/);

  // Filter out first word if it's a common article
  const filteredWords = words[0] && ['the', 'a', 'an', 'of', 'and'].includes(words[0].toLowerCase())
    ? words.slice(1)
    : words;

  if (filteredWords.length === 0) {
    return name.substring(0, 2).toUpperCase();
  }

  // Get first letter of each word
  return filteredWords.map(word => word[0]).join('').toUpperCase();
}

/**
 * Helper: Render game name with thumbnail image
 * Progressive enhancement: text-first, image enhances
 * @param {Object} game - Game object with name, thumbnailUrl, coverUrl
 * @returns {string} HTML string for table cell content
 */
function renderGameNameWithThumbnail(game) {
  // Determine if we have an image or need placeholder
  const hasImage = !!game.thumbnailUrl;
  const modalClass = game.coverUrl ? ' game-image-clickable' : '';
  const fullImageAttr = game.coverUrl
    ? ` data-full-image="${game.coverUrl}"`
    : '';

  const initials = getGameInitials(game.name);

  let imageHTML;
  if (hasImage) {
    imageHTML = `
      <img
        src="${game.thumbnailUrl}"
        alt="${game.name} cover"
        class="game-thumbnail${modalClass}"${fullImageAttr}
        onerror="this.classList.add('game-thumbnail-error'); this.style.display='none'; this.nextElementSibling.classList.remove('game-thumbnail-placeholder-hidden');"
      />
      <div class="game-thumbnail-placeholder game-thumbnail-placeholder-hidden">
        ${initials}
      </div>
    `;
  } else {
    imageHTML = `
      <div class="game-thumbnail-placeholder">
        ${initials}
      </div>
    `;
  }

  return `
    <div class="game-name-with-image">
      ${imageHTML}
      <span class="game-name">${game.name}</span>
    </div>
  `;
}

/**
 * Helper: Render just the game cover thumbnail (no name)
 * Used for compact displays like top games row values
 * @param {Object} game - Game object with name, thumbnailUrl, coverUrl
 * @returns {string} HTML string for thumbnail only
 */
function renderGameThumbnailOnly(game) {
  const hasImage = !!game.thumbnailUrl;
  const modalClass = game.coverUrl ? ' game-image-clickable' : '';
  const fullImageAttr = game.coverUrl
    ? ` data-full-image="${game.coverUrl}"`
    : '';

  const initials = getGameInitials(game.name);

  if (hasImage) {
    return `
      <img
        src="${game.thumbnailUrl}"
        alt="${game.name} cover"
        title="${game.name}"
        class="game-thumbnail${modalClass}"${fullImageAttr}
        onerror="this.classList.add('game-thumbnail-error'); this.style.display='none'; this.nextElementSibling.classList.remove('game-thumbnail-placeholder-hidden');"
      />
      <div class="game-thumbnail-placeholder game-thumbnail-placeholder-hidden" title="${game.name}">
        ${initials}
      </div>
    `;
  } else {
    return `
      <div class="game-thumbnail-placeholder" title="${game.name}">
        ${initials}
      </div>
    `;
  }
}

/**
 * Initialize image modal for click-to-enlarge functionality
 * Creates modal element and sets up event listeners
 */
function initializeImageModal() {
  // Create modal element
  const modal = document.createElement('div');
  modal.id = 'image-modal';
  modal.className = 'image-modal';
  modal.innerHTML = `
    <img src="" alt="" class="image-modal-content" />
  `;
  document.body.appendChild(modal);

  const modalImg = modal.querySelector('.image-modal-content');

  // Close on click
  modal.addEventListener('click', () => {
    modal.classList.remove('active');
    setTimeout(() => {
      modalImg.src = '';
    }, 200); // Clear after fade-out
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      modal.classList.remove('active');
      setTimeout(() => {
        modalImg.src = '';
      }, 200);
    }
  });

  // Event delegation for thumbnail clicks
  document.addEventListener('click', (e) => {
    const thumbnail = e.target.closest('.game-image-clickable');
    if (thumbnail) {
      e.stopPropagation(); // Prevent click from bubbling to parent row handlers
      const fullImageUrl = thumbnail.dataset.fullImage;
      if (fullImageUrl) {
        modalImg.src = fullImageUrl;
        modalImg.alt = thumbnail.alt;
        modal.classList.add('active');
      }
    }
  });
}

// Global data
let gameData = null;
let currentYear = null;
let currentBaseMetric = 'hours'; // Default to hours
let currentlyOpenStatType = null;
let yearDataCache = null;
let isLoadingFromPermalink = false;
let showAllYearReviewMetrics = false;

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

        // Initialize image modal
        initializeImageModal();

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
        updateHeaderScrollMargin();
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

            // Close detail section if:
            // - It's a play-related stat and year is pre-logging, OR
            // - It's the year-review stat and switching to All Time (or pre-logging year)
            if (currentlyOpenStatType) {
                const shouldCloseYearReview = currentlyOpenStatType === 'year-review' &&
                    (currentYear === null || isNewYearPreLogging);
                const shouldClosePlayRelated = isNewYearPreLogging &&
                    playRelatedStats.includes(currentlyOpenStatType);

                if (shouldCloseYearReview || shouldClosePlayRelated) {
                    closeDetailSection();
                } else {
                    // Refresh the detail section with updated data for the new year
                    showDetailSection(currentlyOpenStatType);
                }
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

        // Recalculate cost/value club data for new metric and update UI
        statsCache.costPerMetricData = getCostPerMetricStats(gameData.games, gameData.plays, currentBaseMetric, currentYear);
        statsCache.fiveDollarClubData = getValueClubGames(gameData.games, gameData.plays, currentBaseMetric, ValueClub.FIVE_DOLLAR, currentYear);
        statsCache.twoFiftyClubData = getValueClubGames(gameData.games, gameData.plays, currentBaseMetric, ValueClub.TWO_FIFTY, currentYear);
        statsCache.oneDollarClubData = getValueClubGames(gameData.games, gameData.plays, currentBaseMetric, ValueClub.ONE_DOLLAR, currentYear);
        statsCache.fiftyCentClubData = getValueClubGames(gameData.games, gameData.plays, currentBaseMetric, ValueClub.FIFTY_CENTS, currentYear);
        updateCostAnalysisStats();
        updateValueClubsStats();
        updateSocialLocationStats();

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

            // Refresh value club detail sections if open
            const valueClubStats = ['five-dollar-club', 'two-fifty-club', 'one-dollar-club', 'fifty-cent-club'];
            if (valueClubStats.includes(currentlyOpenStatType)) {
                showDetailSection(currentlyOpenStatType);
            }

            // Refresh solo detail section if open
            if (currentlyOpenStatType === 'solo') {
                showDetailSection('solo');
            }

            // Update year-review filter if open and toggle is not checked
            if (currentlyOpenStatType === 'year-review') {
                const toggleCheckbox = document.getElementById('year-review-show-all-metrics');
                const detailDiv = document.querySelector('.year-review-detail');
                if (toggleCheckbox && detailDiv && !toggleCheckbox.checked) {
                    applyYearReviewMetricFilter(detailDiv, false);
                }
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
    const socialLocationsSection = document.getElementById('social-locations-section');

    // Check if current year is pre-logging
    const isPreLogging = currentYear && yearDataCache
        && yearDataCache.find(y => y.year === currentYear)?.isPreLogging;

    // Hide play-related sections in pre-logging years
    const displayValue = isPreLogging ? 'none' : 'block';

    if (hIndexSection) hIndexSection.style.display = displayValue;
    if (playStatsSection) playStatsSection.style.display = displayValue;
    if (milestoneSection) milestoneSection.style.display = displayValue;
    if (socialLocationsSection) socialLocationsSection.style.display = displayValue;
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
        peopleHIndex: calculatePeopleHIndex(gameData.games, gameData.plays, gameData.selfPlayerId, gameData.anonymousPlayerId, currentYear),
        totalBGGEntries: getTotalBGGEntries(gameData.games, currentYear),
        totalGamesOwned: getTotalGamesOwned(gameData.games, currentYear),
        expansionsData: getTotalExpansions(gameData.games, currentYear),
        gamesPlayedData: getTotalGamesPlayed(gameData.games, gameData.plays, currentYear),
        totalDaysPlayed: getTotalDaysPlayed(gameData.plays, currentYear),
        playTimeData: getTotalPlayTime(gameData.plays, currentYear),
        milestonesHours: getMilestones(gameData.games, gameData.plays, currentYear, Metric.HOURS),
        milestonesSessions: getMilestones(gameData.games, gameData.plays, currentYear, Metric.SESSIONS),
        milestonesPlays: getMilestones(gameData.games, gameData.plays, currentYear, Metric.PLAYS),
        unknownGames: getGamesWithUnknownAcquisitionDate(gameData.games, currentYear),
        neverPlayedGames: getOwnedGamesNeverPlayed(gameData.games, gameData.plays, currentYear),
        missingPricePaidGames: getOwnedBaseGamesMissingPricePaid(gameData.games),
        suggestedGames: getSuggestedGames(gameData.games, gameData.plays),
        dailySessionStats: getDailySessionStats(gameData.plays, currentYear),
        // Social & Locations stats
        playerStats: getPlayerStats(gameData.plays, gameData.players, gameData.selfPlayerId, gameData.anonymousPlayerId, currentYear),
        locationStats: getLocationStats(gameData.plays, gameData.locations, currentYear),
        soloGameStats: getSoloGameStats(gameData.plays, gameData.games, gameData.selfPlayerId, currentYear),
        // Cost Analysis stats (hidden)
        totalCostData: getTotalCost(gameData.games, currentYear),
        costPerMetricData: getCostPerMetricStats(gameData.games, gameData.plays, currentBaseMetric, currentYear),
        shelfOfShameData: getShelfOfShame(gameData.games, gameData.plays, currentYear),
        fiveDollarClubData: getValueClubGames(gameData.games, gameData.plays, currentBaseMetric, ValueClub.FIVE_DOLLAR, currentYear),
        twoFiftyClubData: getValueClubGames(gameData.games, gameData.plays, currentBaseMetric, ValueClub.TWO_FIFTY, currentYear),
        oneDollarClubData: getValueClubGames(gameData.games, gameData.plays, currentBaseMetric, ValueClub.ONE_DOLLAR, currentYear),
        fiftyCentClubData: getValueClubGames(gameData.games, gameData.plays, currentBaseMetric, ValueClub.FIFTY_CENTS, currentYear),
    };

    // Calculate year-in-review stats when year filter is active
    if (currentYear !== null) {
        statsCache.yearReview = {
            hoursHIndexIncrease: calculateHIndexIncrease(gameData.games, gameData.plays, currentYear, Metric.HOURS),
            sessionsHIndexIncrease: calculateHIndexIncrease(gameData.games, gameData.plays, currentYear, Metric.SESSIONS),
            playsHIndexIncrease: calculateHIndexIncrease(gameData.games, gameData.plays, currentYear, Metric.PLAYS),
            peopleHIndexIncrease: calculatePeopleHIndexIncrease(gameData.games, gameData.plays, gameData.selfPlayerId, gameData.anonymousPlayerId, currentYear),
            hoursHIndexCurrent: calculateAllTimeHIndexThroughYear(gameData.games, gameData.plays, currentYear, Metric.HOURS),
            sessionsHIndexCurrent: calculateAllTimeHIndexThroughYear(gameData.games, gameData.plays, currentYear, Metric.SESSIONS),
            playsHIndexCurrent: calculateAllTimeHIndexThroughYear(gameData.games, gameData.plays, currentYear, Metric.PLAYS),
            peopleHIndexCurrent: calculateAllTimePeopleHIndexThroughYear(gameData.games, gameData.plays, gameData.selfPlayerId, gameData.anonymousPlayerId, currentYear),
            hoursHIndexPrevious: calculateAllTimeHIndexThroughYear(gameData.games, gameData.plays, currentYear - 1, Metric.HOURS),
            sessionsHIndexPrevious: calculateAllTimeHIndexThroughYear(gameData.games, gameData.plays, currentYear - 1, Metric.SESSIONS),
            playsHIndexPrevious: calculateAllTimeHIndexThroughYear(gameData.games, gameData.plays, currentYear - 1, Metric.PLAYS),
            peopleHIndexPrevious: calculateAllTimePeopleHIndexThroughYear(gameData.games, gameData.plays, gameData.selfPlayerId, gameData.anonymousPlayerId, currentYear - 1),

            // Milestone increases - hours
            fivesHoursIncrease: calculateMilestoneIncrease(gameData.games, gameData.plays, currentYear, Metric.HOURS, Milestone.FIVES),
            dimesHoursIncrease: calculateMilestoneIncrease(gameData.games, gameData.plays, currentYear, Metric.HOURS, Milestone.DIMES),
            quartersHoursIncrease: calculateMilestoneIncrease(gameData.games, gameData.plays, currentYear, Metric.HOURS, Milestone.QUARTERS),
            centuriesHoursIncrease: calculateMilestoneIncrease(gameData.games, gameData.plays, currentYear, Metric.HOURS, Milestone.CENTURIES),
            fivesHoursCurrent: getMilestoneCountThroughYear(gameData.games, gameData.plays, currentYear, Metric.HOURS, Milestone.FIVES),
            dimesHoursCurrent: getMilestoneCountThroughYear(gameData.games, gameData.plays, currentYear, Metric.HOURS, Milestone.DIMES),
            quartersHoursCurrent: getMilestoneCountThroughYear(gameData.games, gameData.plays, currentYear, Metric.HOURS, Milestone.QUARTERS),
            centuriesHoursCurrent: getMilestoneCountThroughYear(gameData.games, gameData.plays, currentYear, Metric.HOURS, Milestone.CENTURIES),
            fivesHoursPrevious: getMilestoneCountThroughYear(gameData.games, gameData.plays, currentYear - 1, Metric.HOURS, Milestone.FIVES),
            dimesHoursPrevious: getMilestoneCountThroughYear(gameData.games, gameData.plays, currentYear - 1, Metric.HOURS, Milestone.DIMES),
            quartersHoursPrevious: getMilestoneCountThroughYear(gameData.games, gameData.plays, currentYear - 1, Metric.HOURS, Milestone.QUARTERS),
            centuriesHoursPrevious: getMilestoneCountThroughYear(gameData.games, gameData.plays, currentYear - 1, Metric.HOURS, Milestone.CENTURIES),

            // Milestone increases - sessions
            fivesSessionsIncrease: calculateMilestoneIncrease(gameData.games, gameData.plays, currentYear, Metric.SESSIONS, Milestone.FIVES),
            dimesSessionsIncrease: calculateMilestoneIncrease(gameData.games, gameData.plays, currentYear, Metric.SESSIONS, Milestone.DIMES),
            quartersSessionsIncrease: calculateMilestoneIncrease(gameData.games, gameData.plays, currentYear, Metric.SESSIONS, Milestone.QUARTERS),
            centuriesSessionsIncrease: calculateMilestoneIncrease(gameData.games, gameData.plays, currentYear, Metric.SESSIONS, Milestone.CENTURIES),
            fivesSessionsCurrent: getMilestoneCountThroughYear(gameData.games, gameData.plays, currentYear, Metric.SESSIONS, Milestone.FIVES),
            dimesSessionsCurrent: getMilestoneCountThroughYear(gameData.games, gameData.plays, currentYear, Metric.SESSIONS, Milestone.DIMES),
            quartersSessionsCurrent: getMilestoneCountThroughYear(gameData.games, gameData.plays, currentYear, Metric.SESSIONS, Milestone.QUARTERS),
            centuriesSessionsCurrent: getMilestoneCountThroughYear(gameData.games, gameData.plays, currentYear, Metric.SESSIONS, Milestone.CENTURIES),
            fivesSessionsPrevious: getMilestoneCountThroughYear(gameData.games, gameData.plays, currentYear - 1, Metric.SESSIONS, Milestone.FIVES),
            dimesSessionsPrevious: getMilestoneCountThroughYear(gameData.games, gameData.plays, currentYear - 1, Metric.SESSIONS, Milestone.DIMES),
            quartersSessionsPrevious: getMilestoneCountThroughYear(gameData.games, gameData.plays, currentYear - 1, Metric.SESSIONS, Milestone.QUARTERS),
            centuriesSessionsPrevious: getMilestoneCountThroughYear(gameData.games, gameData.plays, currentYear - 1, Metric.SESSIONS, Milestone.CENTURIES),

            // Milestone increases - plays
            fivesPlaysIncrease: calculateMilestoneIncrease(gameData.games, gameData.plays, currentYear, Metric.PLAYS, Milestone.FIVES),
            dimesPlaysIncrease: calculateMilestoneIncrease(gameData.games, gameData.plays, currentYear, Metric.PLAYS, Milestone.DIMES),
            quartersPlaysIncrease: calculateMilestoneIncrease(gameData.games, gameData.plays, currentYear, Metric.PLAYS, Milestone.QUARTERS),
            centuriesPlaysIncrease: calculateMilestoneIncrease(gameData.games, gameData.plays, currentYear, Metric.PLAYS, Milestone.CENTURIES),
            fivesPlaysCurrent: getMilestoneCountThroughYear(gameData.games, gameData.plays, currentYear, Metric.PLAYS, Milestone.FIVES),
            dimesPlaysCurrent: getMilestoneCountThroughYear(gameData.games, gameData.plays, currentYear, Metric.PLAYS, Milestone.DIMES),
            quartersPlaysCurrent: getMilestoneCountThroughYear(gameData.games, gameData.plays, currentYear, Metric.PLAYS, Milestone.QUARTERS),
            centuriesPlaysCurrent: getMilestoneCountThroughYear(gameData.games, gameData.plays, currentYear, Metric.PLAYS, Milestone.CENTURIES),
            fivesPlaysPrevious: getMilestoneCountThroughYear(gameData.games, gameData.plays, currentYear - 1, Metric.PLAYS, Milestone.FIVES),
            dimesPlaysPrevious: getMilestoneCountThroughYear(gameData.games, gameData.plays, currentYear - 1, Metric.PLAYS, Milestone.DIMES),
            quartersPlaysPrevious: getMilestoneCountThroughYear(gameData.games, gameData.plays, currentYear - 1, Metric.PLAYS, Milestone.QUARTERS),
            centuriesPlaysPrevious: getMilestoneCountThroughYear(gameData.games, gameData.plays, currentYear - 1, Metric.PLAYS, Milestone.CENTURIES),

            // Time and Activity stats
            timeAndActivity: getTimeAndActivityStats(gameData.plays, currentYear),

            // Top games by metric (for Game Highlights section)
            topGamesByHours: getTopGamesByMetric(gameData.games, gameData.plays, currentYear, Metric.HOURS, 3),
            topGamesBySessions: getTopGamesByMetric(gameData.games, gameData.plays, currentYear, Metric.SESSIONS, 3),
            topGamesByPlays: getTopGamesByMetric(gameData.games, gameData.plays, currentYear, Metric.PLAYS, 3),

            // Longest single plays
            longestSinglePlays: getLongestSinglePlays(gameData.games, gameData.plays, currentYear, 3),

            // Top games by unique players (most shared)
            topGamesByUniquePlayers: getTopGamesByUniquePlayers(gameData.games, gameData.plays, currentYear, 3, gameData.anonymousPlayerId),

            // Top games by unique locations (most traveled)
            topGamesByUniqueLocations: getTopGamesByUniqueLocations(gameData.games, gameData.plays, currentYear, 3),

            // Logging achievements (cumulative thresholds crossed)
            loggingAchievements: getLoggingAchievements(gameData.plays, currentYear),

            // Solo gaming stats
            soloStats: getSoloStats(gameData.plays, gameData.selfPlayerId, currentYear),

            // Top locations by session count
            allLocations: getAllLocationsBySession(gameData.plays, gameData.locations, currentYear),

            // Top player by hours (for summary)
            topPlayerByHours: getTopPlayerByMetric(gameData.plays, gameData.players, gameData.selfPlayerId, gameData.anonymousPlayerId, currentYear, 'hours'),

            // Top location by hours excluding home (for summary)
            topLocationByHours: getTopLocationByMetric(gameData.plays, gameData.locations, gameData.homeLocationId, currentYear, 'hours'),

            // Top solo game by hours (for summary)
            topSoloGameByHours: getTopSoloGameByHours(gameData.plays, gameData.games, gameData.selfPlayerId, currentYear),

            // Top new-to-me game by sessions (for summary)
            topNewToMeGameBySessions: getTopNewToMeGame(gameData.games, gameData.plays, currentYear, Metric.SESSIONS),

            // Top returning game by sessions (for summary)
            topReturningGameBySessions: getTopReturningGame(gameData.games, gameData.plays, currentYear, Metric.SESSIONS),
        };
        // Populate value club cache dynamically for each tier and metric
        ValueClub.values.forEach(tierValue => {
            [Metric.HOURS, Metric.SESSIONS, Metric.PLAYS].forEach(metric => {
                statsCache.yearReview[`valueClub_${tierValue}_${metric}_increase`] = calculateValueClubIncrease(gameData.games, gameData.plays, currentYear, metric, tierValue);
                statsCache.yearReview[`valueClub_${tierValue}_${metric}_current`] = getValueClubGames(gameData.games, gameData.plays, metric, tierValue, currentYear).count;
                statsCache.yearReview[`valueClub_${tierValue}_${metric}_previous`] = getValueClubGames(gameData.games, gameData.plays, metric, tierValue, currentYear - 1).count;
            });
        });
        // Shelf of shame changes
        statsCache.yearReview.shelfOfShameChanges = getShelfOfShameChanges(gameData.games, gameData.plays, currentYear);
    }

    updateHIndexStats();
    updateHIndexCardLabels();
    updateCollectionStats();
    updatePlayStats();
    updateMilestoneStats();
    updateMilestoneCardLabels();
    updateMilestoneCumulativeSubstats();
    updateSocialLocationStats();
    updateDiagnosticsSection();
    updateCostAnalysisStats();
    updateValueClubsStats();
    updateYearInReview();
}

/**
 * Update H-Index statistics
 */
function updateHIndexStats() {
    const hIndexValue = getCurrentHIndex();
    document.querySelector('#h-index .widget__value').textContent = hIndexValue;

    // Update People H-Index
    document.querySelector('#people-h-index .widget__value').textContent = statsCache.peopleHIndex;
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

    // Preserve the info icon when updating title
    const infoIcon = titleElement.querySelector('.info-icon');
    titleElement.textContent = label.title;
    if (infoIcon) {
        titleElement.appendChild(infoIcon);
    }

    descriptionElement.textContent = label.description;
}

/**
 * Update milestone card labels based on current base metric and year
 */
function updateMilestoneCardLabels() {
    const yearSuffix = currentYear ? ` in ${currentYear}` : ' total';
    const labels = {
        hours: {
            fives: `Games played 5-9 hours${yearSuffix}`,
            dimes: `Games played 10-24 hours${yearSuffix}`,
            quarters: `Games played 25-99 hours${yearSuffix}`,
            centuries: `Games played 100 or more hours${yearSuffix}`,
        },
        sessions: {
            fives: `Games played 5-9 sessions${yearSuffix}`,
            dimes: `Games played 10-24 sessions${yearSuffix}`,
            quarters: `Games played 25-99 sessions${yearSuffix}`,
            centuries: `Games played 100 or more sessions${yearSuffix}`,
        },
        plays: {
            fives: `Games played 5-9 times${yearSuffix}`,
            dimes: `Games played 10-24 times${yearSuffix}`,
            quarters: `Games played 25-99 times${yearSuffix}`,
            centuries: `Games played 100 or more times${yearSuffix}`,
        },
    };

    const currentLabels = labels[currentBaseMetric] || labels.hours;

    document.querySelector('#fives .widget__description').textContent = currentLabels.fives;
    document.querySelector('#dimes .widget__description').textContent = currentLabels.dimes;
    document.querySelector('#quarters .widget__description').textContent = currentLabels.quarters;
    document.querySelector('#centuries .widget__description').textContent = currentLabels.centuries;
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

    // Get milestones based on current metric
    let milestones;
    switch (currentBaseMetric) {
        case 'sessions':
            milestones = statsCache.milestonesSessions;
            break;
        case 'plays':
            milestones = statsCache.milestonesPlays;
            break;
        case 'hours':
        default:
            milestones = statsCache.milestonesHours;
            break;
    }

    // Derive cumulative counts by summing all milestones at or above each threshold
    const cumulativeFives = milestones[Milestone.FIVES].length + milestones[Milestone.DIMES].length + milestones[Milestone.QUARTERS].length + milestones[Milestone.CENTURIES].length;
    const cumulativeDimes = milestones[Milestone.DIMES].length + milestones[Milestone.QUARTERS].length + milestones[Milestone.CENTURIES].length;
    const cumulativeQuarters = milestones[Milestone.QUARTERS].length + milestones[Milestone.CENTURIES].length;

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
    document.querySelector('#total-bgg-entries .widget__value').textContent = statsCache.totalBGGEntries;

    // Total Games Owned
    document.querySelector('#total-games-owned .widget__value').textContent = statsCache.totalGamesOwned;

    // Total Expansions
    document.querySelector('#total-expansions .widget__value').textContent = statsCache.expansionsData.total;
    document.getElementById('expandalones-count').textContent = statsCache.expansionsData.expandalones;
    document.getElementById('expansion-only-count').textContent = statsCache.expansionsData.expansionOnly;
}

/**
 * Update play statistics
 */
function updatePlayStats() {
    // Total Plays
    const totalPlays = getTotalPlays(gameData.plays, currentYear);
    document.querySelector('#total-plays .widget__value').textContent = totalPlays.toLocaleString();

    // Total Days Played
    const totalDays = getTotalDaysPlayed(gameData.plays, currentYear);
    document.querySelector('#total-days-played .widget__value').textContent = totalDays.toLocaleString();

    // Daily Session Stats
    const dailySessionMedian = document.getElementById('daily-session-median');
    const dailySessionAverage = document.getElementById('daily-session-average');
    if (statsCache.dailySessionStats.medianMinutes !== null) {
        const formatTimePerDay = (minutes) => {
            if (minutes < 60) {
                return `${Math.round(minutes)} minutes per gaming day`;
            }
            return `${(minutes / 60).toFixed(1)} hours per gaming day`;
        };
        dailySessionMedian.textContent = formatTimePerDay(statsCache.dailySessionStats.medianMinutes);
        dailySessionAverage.textContent = formatTimePerDay(statsCache.dailySessionStats.averageMinutes);
    } else {
        dailySessionMedian.textContent = '--';
        dailySessionAverage.textContent = '--';
    }

    // Unique Games Played
    document.querySelector('#unique-games-played .widget__value').textContent = statsCache.gamesPlayedData.total;
    document.getElementById('my-games-count').textContent = statsCache.gamesPlayedData.myGames;
    document.getElementById('others-games-count').textContent = statsCache.gamesPlayedData.othersGames;

    // Show/hide new-to-me substat
    const newToMeContainer = document.getElementById('new-to-me-container');
    if (currentYear && statsCache.gamesPlayedData.newToMe !== null) {
        newToMeContainer.classList.remove('hidden');
        document.getElementById('new-to-me-count').textContent = statsCache.gamesPlayedData.newToMe;
    } else {
        newToMeContainer.classList.add('hidden');
    }

    // Total Play Time
    updatePlayTimeStats();
}

/**
 * Update play time statistics
 */
function updatePlayTimeStats() {
    const hours = formatLargeNumber(statsCache.playTimeData.totalHours);
    const days = formatLargeNumber(statsCache.playTimeData.totalHours / 24);

    // Add tilde prefix if any durations are estimated
    const prefix = statsCache.playTimeData.playsWithEstimatedDuration > 0 ? '~' : '';
    document.querySelector('#total-play-time .widget__value').textContent = `${prefix}${hours} hours`;
    document.getElementById('play-time-days').textContent = `${prefix}${days}`;
}

/**
 * Update milestone statistics
 */
function updateMilestoneStats() {
    const milestones = getCurrentMilestones();
    document.querySelector('#fives .widget__value').textContent = milestones[Milestone.FIVES].length;
    document.querySelector('#dimes .widget__value').textContent = milestones[Milestone.DIMES].length;
    document.querySelector('#quarters .widget__value').textContent = milestones[Milestone.QUARTERS].length;
    document.querySelector('#centuries .widget__value').textContent = milestones[Milestone.CENTURIES].length;
}

/**
 * Update Social & Locations section
 */
function updateSocialLocationStats() {
    const playerStats = statsCache.playerStats;
    const locationStats = statsCache.locationStats;
    const soloGameStats = statsCache.soloGameStats;

    // Update Players card
    document.querySelector('#players-card .widget__value').textContent = `> ${playerStats.uniquePlayerCount}`;

    // Update Solo card based on current metric
    const soloCard = document.getElementById('solo-card');
    const soloValue = soloCard.querySelector('.widget__value');
    const soloPercent = document.getElementById('solo-percent');
    const soloOnlyDaysContainer = document.getElementById('solo-only-days-container');
    const soloOnlyDays = document.getElementById('solo-only-days');

    let mainValue, percentValue;
    switch (currentBaseMetric) {
        case Metric.SESSIONS:
            mainValue = `${soloGameStats.totalSoloSessions.toLocaleString()} sessions`;
            percentValue = soloGameStats.totalSessions > 0
                ? ((soloGameStats.totalSoloSessions / soloGameStats.totalSessions) * 100).toFixed(1) + '%'
                : '0%';
            // Show solo-only days substat for sessions
            soloOnlyDaysContainer.style.display = '';
            const soloOnlyPercent = soloGameStats.totalSessions > 0
                ? ((soloGameStats.soloOnlyDays / soloGameStats.totalSessions) * 100).toFixed(1) + '%'
                : '0%';
            soloOnlyDays.textContent = `${soloGameStats.soloOnlyDays} (${soloOnlyPercent})`;
            break;
        case Metric.PLAYS:
            mainValue = `${soloGameStats.totalSoloPlays.toLocaleString()} plays`;
            percentValue = soloGameStats.totalPlays > 0
                ? ((soloGameStats.totalSoloPlays / soloGameStats.totalPlays) * 100).toFixed(1) + '%'
                : '0%';
            soloOnlyDaysContainer.style.display = 'none';
            break;
        case Metric.HOURS:
        default:
            const soloHours = soloGameStats.totalSoloMinutes / 60;
            mainValue = `${soloHours.toFixed(1)} hours`;
            percentValue = soloGameStats.totalMinutes > 0
                ? ((soloGameStats.totalSoloMinutes / soloGameStats.totalMinutes) * 100).toFixed(1) + '%'
                : '0%';
            soloOnlyDaysContainer.style.display = 'none';
            break;
    }

    soloValue.textContent = mainValue;
    soloPercent.textContent = percentValue;

    // Update Locations card
    document.querySelector('#locations-card .widget__value').textContent = locationStats.locationCount;
}

/**
 * Update diagnostics section visibility and values
 */
function updateDiagnosticsSection() {
    const section = document.getElementById('diagnostics-section');
    const unknownCard = document.getElementById('unknown-acquisition-dates');
    const neverPlayedCard = document.getElementById('never-played');
    const missingPriceCard = document.getElementById('missing-price-paid');

    // Show/hide section based on hidden flag
    if (!isHiddenEnabled()) {
        section.style.display = 'none';
        unknownCard.style.display = 'none';
        neverPlayedCard.style.display = 'none';
        missingPriceCard.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    unknownCard.style.display = 'flex';
    neverPlayedCard.style.display = 'flex';
    missingPriceCard.style.display = 'flex';

    // Update card values
    unknownCard.querySelector('.widget__value').textContent = statsCache.unknownGames.length;
    neverPlayedCard.querySelector('.widget__value').textContent = statsCache.neverPlayedGames.length;
    missingPriceCard.querySelector('.widget__value').textContent = statsCache.missingPricePaidGames.length;
}

/**
 * Update Cost Analysis section (hidden)
 */
function updateCostAnalysisStats() {
    const section = document.getElementById('cost-analysis-section');
    if (!section) return;

    // Show/hide section based on hidden flag
    if (!isHiddenEnabled()) {
        section.style.display = 'none';
        return;
    }
    section.style.display = 'block';

    // Check if current year is pre-logging
    const isPreLogging = currentYear && yearDataCache
        && yearDataCache.find(y => y.year === currentYear)?.isPreLogging;

    // Update Total Cost card
    const totalCostValue = statsCache.totalCostData.totalCost;
    const prefix = statsCache.totalCostData.gamesWithoutPrice > 0 ? '> ' : '';
    document.querySelector('#total-cost .widget__value').textContent =
        `${prefix}$${totalCostValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

    // Update Total Cost description based on year filter
    const totalCostDescription = currentYear
        ? `Sum of copies acquired in ${currentYear}`
        : 'Sum of all owned copies';
    document.getElementById('total-cost-description').textContent = totalCostDescription;

    // Show/hide cards based on pre-logging status
    const totalCostCard = document.getElementById('total-cost');
    const avgCostCard = document.getElementById('avg-cost-per-metric');
    const shelfOfShameCard = document.getElementById('shelf-of-shame');
    totalCostCard.style.display = '';
    avgCostCard.style.display = isPreLogging ? 'none' : '';
    shelfOfShameCard.style.display = isPreLogging ? 'none' : '';

    if (!isPreLogging) {
        // Update Average Cost Per Metric card
        updateAvgCostPerMetricCard();

        // Update Shelf of Shame card
        updateShelfOfShameCard();
    }
}

/**
 * Update Average Cost Per Metric card
 */
function updateAvgCostPerMetricCard() {
    const data = statsCache.costPerMetricData;

    // Update label based on current metric
    const metricLabels = {
        hours: 'Cost Per Hour',
        sessions: 'Cost Per Session',
        plays: 'Cost Per Play',
    };
    const metricUnits = {
        hours: 'hour',
        sessions: 'session',
        plays: 'play',
    };

    document.getElementById('avg-cost-label').textContent = metricLabels[currentBaseMetric] || metricLabels.hours;

    // Update main value (median) with < prefix
    const mainValueEl = document.querySelector('#avg-cost-per-metric .widget__value');
    if (data.median !== null) {
        mainValueEl.textContent = `< $${data.median.toFixed(2)}`;
    } else {
        mainValueEl.textContent = '--';
    }

    // Update description
    const yearSuffix = currentYear ? ` through ${currentYear}` : '';
    const unit = metricUnits[currentBaseMetric] || 'hour';
    document.getElementById('avg-cost-description').textContent =
        `Median cost per ${unit} (of ${data.gameCount} owned games${yearSuffix})`;

    // Update substats with < prefix
    const gameAvgEl = document.getElementById('avg-cost-game-average');
    const overallRateEl = document.getElementById('avg-cost-overall-rate');

    gameAvgEl.textContent = data.gameAverage !== null ? `< $${data.gameAverage.toFixed(2)}` : '--';
    overallRateEl.textContent = data.overallRate !== null ? `< $${data.overallRate.toFixed(2)}` : '--';
}

/**
 * Update Shelf of Shame card
 */
function updateShelfOfShameCard() {
    const data = statsCache.shelfOfShameData;

    // Main value: total cost with < prefix
    const mainValueEl = document.querySelector('#shelf-of-shame .widget__value');
    mainValueEl.textContent = data.totalCost > 0
        ? `< $${data.totalCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
        : '$0';

    // Substat: game count
    document.getElementById('shelf-of-shame-count').textContent =
        `${data.count} game${data.count === 1 ? '' : 's'}`;

    // Update description based on year filter
    const yearSuffix = currentYear ? ` through ${currentYear}` : '';
    document.getElementById('shelf-of-shame-description').textContent =
        `Owned games never played${yearSuffix} (since logging began)`;
}

/**
 * Update Value Clubs section (hidden)
 */
function updateValueClubsStats() {
    const section = document.getElementById('value-clubs-section');
    if (!section) return;

    // Show/hide section based on hidden flag
    if (!isHiddenEnabled()) {
        section.style.display = 'none';
        return;
    }
    section.style.display = 'block';

    // Update cost club cards
    const clubData = [
        { id: 'five-dollar-club', data: statsCache.fiveDollarClubData },
        { id: 'two-fifty-club', data: statsCache.twoFiftyClubData },
        { id: 'one-dollar-club', data: statsCache.oneDollarClubData },
        { id: 'fifty-cent-club', data: statsCache.fiftyCentClubData },
    ];

    clubData.forEach(({ id, data }) => {
        const card = document.getElementById(id);
        if (card) {
            card.style.display = '';
            const count = data.count;
            card.querySelector('.widget__value').textContent =
                `${count} game${count === 1 ? '' : 's'}`;
        }
    });

    // Update card descriptions and cumulative substats
    updateValueClubCardLabels();
    updateValueClubCumulativeSubstats();
}

/**
 * Update value club card descriptions based on current metric
 */
function updateValueClubCardLabels() {
    const yearSuffix = currentYear ? ` through ${currentYear}` : '';
    const metricUnits = {
        hours: 'hour',
        sessions: 'session',
        plays: 'play',
    };
    const unit = metricUnits[currentBaseMetric] || 'hour';

    // Generate labels dynamically from ValueClub.values with ranges
    ValueClub.values.forEach((tierValue) => {
        const label = formatCostLabel(tierValue);
        const { nextThreshold } = ValueClub.getThreshold(tierValue);

        // Build element ID from tier value
        let elementId;
        if (tierValue === 5) elementId = 'five-dollar-club-description';
        else if (tierValue === 2.5) elementId = 'two-fifty-club-description';
        else if (tierValue === 1) elementId = 'one-dollar-club-description';
        else if (tierValue === 0.5) elementId = 'fifty-cent-club-description';

        // Build range description (descending: show nextThreshold-threshold range, or "threshold or less" for last tier)
        let rangeText;
        if (nextThreshold !== null) {
            const nextLabel = formatCostLabel(nextThreshold);
            rangeText = `${nextLabel}-${label}`;
        } else {
            rangeText = `${label} or less`;
        }

        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = `Games at ${rangeText} per ${unit}${yearSuffix}`;
        }
    });
}

/**
 * Update cumulative substats for value club cards based on current metric
 */
function updateValueClubCumulativeSubstats() {
    if (!statsCache) return;

    const metricUnits = {
        hours: 'hour',
        sessions: 'session',
        plays: 'play',
    };
    const unit = metricUnits[currentBaseMetric] || 'hour';

    // Cumulative counts: each tier includes all better (lower) tiers
    const fiveDollarCount = statsCache.fiveDollarClubData.count;
    const twoFiftyCount = statsCache.twoFiftyClubData.count;
    const oneDollarCount = statsCache.oneDollarClubData.count;
    const fiftyCentCount = statsCache.fiftyCentClubData.count;

    // Cumulative = this tier's games + all games in better tiers
    // For descending tiers: $5 cumulative = all games at $5 or less = $5 in-range + $2.50 cumulative
    const cumulativeFiveDollar = fiveDollarCount + twoFiftyCount + oneDollarCount + fiftyCentCount;
    const cumulativeTwoFifty = twoFiftyCount + oneDollarCount + fiftyCentCount;
    const cumulativeOneDollar = oneDollarCount + fiftyCentCount;

    // Update labels
    document.getElementById('five-dollar-cumulative-label').textContent = `All games at $5 or less per ${unit}:`;
    document.getElementById('two-fifty-cumulative-label').textContent = `All games at $2.50 or less per ${unit}:`;
    document.getElementById('one-dollar-cumulative-label').textContent = `All games at $1 or less per ${unit}:`;

    // Update values
    document.getElementById('five-dollar-cumulative').textContent = cumulativeFiveDollar;
    document.getElementById('two-fifty-cumulative').textContent = cumulativeTwoFifty;
    document.getElementById('one-dollar-cumulative').textContent = cumulativeOneDollar;
}

/**
 * Update Gaming Year in Review card visibility and quick link
 */
function updateYearInReview() {
    const yearReviewCard = document.getElementById('year-review-card');
    const yearReviewLink = document.getElementById('year-review-link');
    const yearReviewLinkYear = document.getElementById('year-review-link-year');

    // Only show card and link when year filter is active and not a pre-logging year
    if (currentYear !== null && statsCache.yearReview) {
        // Check if this is a pre-logging year
        const yearInfo = yearDataCache && yearDataCache.find(y => y.year === currentYear);
        const isPreLogging = yearInfo && yearInfo.isPreLogging;

        if (!isPreLogging) {
            yearReviewCard.style.display = 'block';
            yearReviewLink.style.display = 'block';
            yearReviewLinkYear.textContent = currentYear;
        } else {
            yearReviewCard.style.display = 'none';
            yearReviewLink.style.display = 'none';
        }
    } else {
        yearReviewCard.style.display = 'none';
        yearReviewLink.style.display = 'none';
    }
}

/**
 * Setup event listeners for clickable stat cards
 */
function setupEventListeners() {
    // Main stat cards
    const clickableCards = document.querySelectorAll('.widget.clickable');
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

    // Detail section close button
    document.getElementById('close-detail').addEventListener('click', closeDetailSection);

    // Year in Review quick link
    document.getElementById('year-review-link').addEventListener('click', (e) => {
        e.preventDefault();
        showDetailSection('year-review');
    });

    // Permalink button
    document.getElementById('permalink-btn').addEventListener('click', () => copyPermalink());

    // Theme toggle button
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // H-Index info icon
    const hIndexInfoIcon = document.getElementById('h-index-info-icon');
    if (hIndexInfoIcon) {
        hIndexInfoIcon.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent card click from triggering
            showHIndexModal();
        });
    }

    // H-Index modal close handlers
    const modal = document.getElementById('h-index-modal');
    const modalBackdrop = modal?.querySelector('.modal-backdrop');
    const modalClose = modal?.querySelector('.modal-close');

    if (modalBackdrop) {
        modalBackdrop.addEventListener('click', hideHIndexModal);
    }

    if (modalClose) {
        modalClose.addEventListener('click', hideHIndexModal);
    }

    // People H-Index info icon
    const peopleHIndexInfoIcon = document.getElementById('people-h-index-info-icon');
    if (peopleHIndexInfoIcon) {
        peopleHIndexInfoIcon.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent card click from triggering
            showPeopleHIndexModal();
        });
    }

    // People H-Index modal close handlers
    const peopleModal = document.getElementById('people-h-index-modal');
    const peopleModalBackdrop = peopleModal?.querySelector('.modal-backdrop');
    const peopleModalClose = peopleModal?.querySelector('.modal-close');

    if (peopleModalBackdrop) {
        peopleModalBackdrop.addEventListener('click', hidePeopleHIndexModal);
    }

    if (peopleModalClose) {
        peopleModalClose.addEventListener('click', hidePeopleHIndexModal);
    }

    // ESC key to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const hIndexModal = document.getElementById('h-index-modal');
            if (hIndexModal && hIndexModal.style.display === 'flex') {
                hideHIndexModal();
            }
            const peopleHIndexModal = document.getElementById('people-h-index-modal');
            if (peopleHIndexModal && peopleHIndexModal.style.display === 'flex') {
                hidePeopleHIndexModal();
            }
        }
    });
}

/**
 * Show h-index info modal
 * Updates content based on current base metric selection
 */
function showHIndexModal() {
    const modal = document.getElementById('h-index-modal');
    const exampleDiv = document.getElementById('h-index-modal-example');

    // Get current base metric and actual h-index value
    const baseMetric = document.getElementById('base-metric-select').value;
    const n = getCurrentHIndex();
    const next = n + 1;

    // Generate metric-specific example text using actual h-index value
    let exampleText = '';
    let improveText = '';
    switch (baseMetric) {
        case 'sessions':
            exampleText = `For example, if your sessions h-index is <strong>${n}</strong>, you have at least <strong>${n} games</strong> that you've played on <strong>${n} or more different days</strong>.`;
            improveText = `To increase it to <strong>${next}</strong>, you need <strong>1 more game</strong> with ${next}+ sessions (breadth) AND <strong>1 more session each</strong> for your existing ${n} games (depth).`;
            break;
        case 'plays':
            exampleText = `For example, if your plays h-index is <strong>${n}</strong>, you have at least <strong>${n} games</strong> that you've played <strong>${n} or more times</strong>.`;
            improveText = `To increase it to <strong>${next}</strong>, you need <strong>1 more game</strong> with ${next}+ plays (breadth) AND <strong>1 more play each</strong> for your existing ${n} games (depth).`;
            break;
        case 'hours':
        default:
            exampleText = `For example, if your hours h-index is <strong>${n}</strong>, you have at least <strong>${n} games</strong> that you've played for <strong>${n} or more hours</strong> each.`;
            improveText = `To increase it to <strong>${next}</strong>, you need <strong>1 more game</strong> with ${next}+ hours (breadth) AND <strong>1 more hour each</strong> for your existing ${n} games (depth).`;
            break;
    }

    exampleDiv.innerHTML = `<p>${exampleText}</p><p>${improveText}</p>`;

    // Show modal
    modal.style.display = 'flex';

    // Update URL to include modal state
    updateURL();
}

// Make showHIndexModal globally accessible for inline onclick handlers
window.showHIndexModal = showHIndexModal;

/**
 * Hide h-index info modal
 */
function hideHIndexModal() {
    const modal = document.getElementById('h-index-modal');
    modal.style.display = 'none';

    // Update URL to remove modal state
    updateURL();
}

/**
 * Show People H-Index info modal
 */
function showPeopleHIndexModal() {
    const modal = document.getElementById('people-h-index-modal');
    const exampleDiv = document.getElementById('people-h-index-modal-example');

    // Get actual People H-Index value
    const n = statsCache?.peopleHIndex || 0;
    const next = n + 1;

    // Generate example text using actual value
    exampleDiv.innerHTML = `
        <p>For example, if your People H-Index is <strong>${n}</strong>, you have at least <strong>${n} games</strong> where you've played with <strong>${n} or more different people</strong> each.</p>
        <p>To increase it to <strong>${next}</strong>, you need <strong>1 more game</strong> with ${next}+ unique players AND <strong>1 more unique player each</strong> for your existing ${n} games.</p>
    `;

    modal.style.display = 'flex';

    // Update URL to include modal state
    updateURL();
}

// Make showPeopleHIndexModal globally accessible for inline onclick handlers
window.showPeopleHIndexModal = showPeopleHIndexModal;

/**
 * Hide People H-Index info modal
 */
function hidePeopleHIndexModal() {
    const modal = document.getElementById('people-h-index-modal');
    modal.style.display = 'none';

    // Update URL to remove modal state
    updateURL();
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
            const infoIcon = '<svg class="info-icon" style="margin-left: 0.5rem; cursor: pointer;" width="16" height="16" viewBox="0 0 16 16" aria-label="Show h-index information" onclick="window.showHIndexModal(); event.stopPropagation();"><circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="8" y="11.5" font-size="10" font-weight="bold" text-anchor="middle" fill="currentColor">i</text></svg>';
            const yearText = currentYear ? `<span style="white-space: nowrap">(${currentYear})</span>` : '<span style="white-space: nowrap">(All Time)</span>';
            return `${title} Breakdown ${yearText}${infoIcon}`;
        },
        render: (detailContent, statsCache) => {
            const hIndexValue = getCurrentHIndex();
            showHIndexBreakdown(detailContent, currentBaseMetric, hIndexValue);
        }
    },
    'people-h-index': {
        getTitle: (currentYear) => {
            const experimentalIcon = '<span class="experimental-badge" data-tooltip="Experimental: This metric is under evaluation and may be modified or removed." onclick="event.stopPropagation();"><svg class="experimental-icon" width="16" height="16" viewBox="0 0 16 16" aria-label="Experimental feature"><path d="M6 2.5V6L3.5 12.5C3.2 13.3 3.8 14 4.5 14H11.5C12.2 14 12.8 13.3 12.5 12.5L10 6V2.5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 2.5H11" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><circle cx="6.5" cy="10.5" r="1" fill="currentColor"/><circle cx="9" cy="11.5" r="0.7" fill="currentColor"/></svg></span>';
            const infoIcon = '<svg class="info-icon" style="margin-left: 0.5rem; cursor: pointer;" width="16" height="16" viewBox="0 0 16 16" aria-label="Show People H-Index information" onclick="window.showPeopleHIndexModal(); event.stopPropagation();"><circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="8" y="11.5" font-size="10" font-weight="bold" text-anchor="middle" fill="currentColor">i</text></svg>';
            const yearText = currentYear ? `<span style="white-space: nowrap">(${currentYear})</span>` : '<span style="white-space: nowrap">(All Time)</span>';
            return `People H-Index Breakdown ${yearText}${experimentalIcon}${infoIcon}`;
        },
        render: (detailContent, statsCache) => {
            showPeopleHIndexBreakdown(detailContent, statsCache.peopleHIndex);
        }
    },
    'total-bgg-entries': {
        getTitle: (currentYear) => currentYear ? `BGG Entries Acquired in <span style="white-space: nowrap">${currentYear}</span>` : 'BGG Entries <span style="white-space: nowrap">(All Time)</span>',
        render: (detailContent) => {
            showBGGEntries(detailContent);
        }
    },
    'total-games-owned': {
        getTitle: (currentYear) => currentYear ? `Games Acquired in <span style="white-space: nowrap">${currentYear}</span>` : 'Games Owned <span style="white-space: nowrap">(All Time)</span>',
        render: (detailContent) => {
            showGamesOwned(detailContent);
        }
    },
    'total-expansions': {
        getTitle: (currentYear) => currentYear ? `Expansions Acquired in <span style="white-space: nowrap">${currentYear}</span>` : 'Expansions <span style="white-space: nowrap">(All Time)</span>',
        render: (detailContent) => {
            showExpansions(detailContent);
        }
    },
    'unique-games-played': {
        getTitle: (currentYear) => currentYear ? `Unique Games Played in <span style="white-space: nowrap">${currentYear}</span>` : 'Unique Games Played <span style="white-space: nowrap">(All Time)</span>',
        render: (detailContent) => {
            showGamesPlayed(detailContent);
        }
    },
    'total-play-time': {
        getTitle: (currentYear) => currentYear ? `Play Time by Game in <span style="white-space: nowrap">${currentYear}</span>` : 'Play Time by Game <span style="white-space: nowrap">(All Time)</span>',
        render: (detailContent) => {
            showPlayTimeBreakdown(detailContent);
        }
    },
    'total-days-played': {
        getTitle: (currentYear) => currentYear ? `Days Played by Game in <span style="white-space: nowrap">${currentYear}</span>` : 'Days Played by Game <span style="white-space: nowrap">(All Time)</span>',
        render: (detailContent) => {
            showDaysPlayedBreakdown(detailContent);
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
            const yearText = currentYear ? `<span style="white-space: nowrap">(${currentYear})</span>` : '<span style="white-space: nowrap">(All Time)</span>';
            return `${label} ${yearText}`;
        },
        render: (detailContent) => {
            const milestones = getCurrentMilestones();
            showMilestoneGames(detailContent, Milestone.FIVES, milestones);
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
            const yearText = currentYear ? `<span style="white-space: nowrap">(${currentYear})</span>` : '<span style="white-space: nowrap">(All Time)</span>';
            return `${label} ${yearText}`;
        },
        render: (detailContent) => {
            const milestones = getCurrentMilestones();
            showMilestoneGames(detailContent, Milestone.DIMES, milestones);
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
            const yearText = currentYear ? `<span style="white-space: nowrap">(${currentYear})</span>` : '<span style="white-space: nowrap">(All Time)</span>';
            return `${label} ${yearText}`;
        },
        render: (detailContent) => {
            const milestones = getCurrentMilestones();
            showMilestoneGames(detailContent, Milestone.QUARTERS, milestones);
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
            const yearText = currentYear ? `<span style="white-space: nowrap">(${currentYear})</span>` : '<span style="white-space: nowrap">(All Time)</span>';
            return `${label} ${yearText}`;
        },
        render: (detailContent) => {
            const milestones = getCurrentMilestones();
            showMilestoneGames(detailContent, Milestone.CENTURIES, milestones);
        }
    },
    'play-next-suggestions': {
        getTitle: () => 'Play Next Suggestions',
        render: (detailContent) => {
            showSuggestedGames(detailContent);
        }
    },
    'players': {
        getTitle: (currentYear) => currentYear ? `Players <span style="white-space: nowrap">(${currentYear})</span>` : 'Players <span style="white-space: nowrap">(All Time)</span>',
        render: (detailContent) => {
            showPlayersBreakdown(detailContent);
        }
    },
    'solo': {
        getTitle: (currentYear) => currentYear ? `Solo <span style="white-space: nowrap">(${currentYear})</span>` : 'Solo <span style="white-space: nowrap">(All Time)</span>',
        render: (detailContent) => {
            showSoloBreakdown(detailContent);
        }
    },
    'locations': {
        getTitle: (currentYear) => currentYear ? `Locations <span style="white-space: nowrap">(${currentYear})</span>` : 'Locations <span style="white-space: nowrap">(All Time)</span>',
        render: (detailContent) => {
            showLocationsBreakdown(detailContent);
        }
    },
    'year-review': {
        getTitle: (currentYear) => `Gaming Year in Review <span style="white-space: nowrap">(${currentYear})</span>`,
        renderSummary: (summaryElement, detailContent) => {
            summaryElement.innerHTML = `
                <div class="year-review-filter-toggle">
                    <label class="toggle-switch">
                        <input type="checkbox" id="year-review-show-all-metrics" ${showAllYearReviewMetrics ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                    <span class="toggle-label">Show all base metrics</span>
                </div>
            `;
            summaryElement.style.display = 'block';

            // Add toggle event handler
            const toggleCheckbox = document.getElementById('year-review-show-all-metrics');
            const detailDiv = detailContent.querySelector('.year-review-detail');
            if (toggleCheckbox && detailDiv) {
                toggleCheckbox.addEventListener('change', () => {
                    showAllYearReviewMetrics = toggleCheckbox.checked;
                    applyYearReviewMetricFilter(detailDiv, toggleCheckbox.checked);
                    updateURL();
                });

                // Apply initial filter
                applyYearReviewMetricFilter(detailDiv, showAllYearReviewMetrics);
            }
        },
        render: (detailContent, statsCache) => {
            showYearReviewDetail(detailContent, statsCache);
        }
    },
    'total-cost': {
        getTitle: (currentYear) => {
            const yearText = currentYear
                ? `<span style="white-space: nowrap">(${currentYear})</span>`
                : '<span style="white-space: nowrap">(All Time)</span>';
            return `Total Cost ${yearText}`;
        },
        render: (detailContent) => {
            showTotalCostBreakdown(detailContent);
        },
    },
    'five-dollar-club': {
        getTitle: (currentYear) => {
            const metricLabels = {
                hours: '$5 Club (Per Hour)',
                sessions: '$5 Club (Per Session)',
                plays: '$5 Club (Per Play)',
            };
            const label = metricLabels[currentBaseMetric] || metricLabels.hours;
            const yearText = currentYear
                ? `<span style="white-space: nowrap">(${currentYear})</span>`
                : '<span style="white-space: nowrap">(All Time)</span>';
            return `${label} ${yearText}`;
        },
        render: (detailContent, statsCache) => {
            showValueClubBreakdown(detailContent, statsCache.fiveDollarClubData, '$5');
        },
    },
    'two-fifty-club': {
        getTitle: (currentYear) => {
            const metricLabels = {
                hours: '$2.50 Club (Per Hour)',
                sessions: '$2.50 Club (Per Session)',
                plays: '$2.50 Club (Per Play)',
            };
            const label = metricLabels[currentBaseMetric] || metricLabels.hours;
            const yearText = currentYear
                ? `<span style="white-space: nowrap">(${currentYear})</span>`
                : '<span style="white-space: nowrap">(All Time)</span>';
            return `${label} ${yearText}`;
        },
        render: (detailContent, statsCache) => {
            showValueClubBreakdown(detailContent, statsCache.twoFiftyClubData, '$2.50');
        },
    },
    'one-dollar-club': {
        getTitle: (currentYear) => {
            const metricLabels = {
                hours: '$1 Club (Per Hour)',
                sessions: '$1 Club (Per Session)',
                plays: '$1 Club (Per Play)',
            };
            const label = metricLabels[currentBaseMetric] || metricLabels.hours;
            const yearText = currentYear
                ? `<span style="white-space: nowrap">(${currentYear})</span>`
                : '<span style="white-space: nowrap">(All Time)</span>';
            return `${label} ${yearText}`;
        },
        render: (detailContent, statsCache) => {
            showValueClubBreakdown(detailContent, statsCache.oneDollarClubData, '$1');
        },
    },
    'fifty-cent-club': {
        getTitle: (currentYear) => {
            const metricLabels = {
                hours: '50¢ Club (Per Hour)',
                sessions: '50¢ Club (Per Session)',
                plays: '50¢ Club (Per Play)',
            };
            const label = metricLabels[currentBaseMetric] || metricLabels.hours;
            const yearText = currentYear
                ? `<span style="white-space: nowrap">(${currentYear})</span>`
                : '<span style="white-space: nowrap">(All Time)</span>';
            return `${label} ${yearText}`;
        },
        render: (detailContent, statsCache) => {
            showValueClubBreakdown(detailContent, statsCache.fiftyCentClubData, '50¢');
        },
    },
    'avg-cost-per-metric': {
        getTitle: (currentYear) => {
            const experimentalIcon = '<span class="experimental-badge" data-tooltip="Experimental: This metric is under evaluation and may be modified or removed." onclick="event.stopPropagation();"><svg class="experimental-icon" width="16" height="16" viewBox="0 0 16 16" aria-label="Experimental feature"><path d="M6 2.5V6L3.5 12.5C3.2 13.3 3.8 14 4.5 14H11.5C12.2 14 12.8 13.3 12.5 12.5L10 6V2.5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 2.5H11" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><circle cx="6.5" cy="10.5" r="1" fill="currentColor"/><circle cx="9" cy="11.5" r="0.7" fill="currentColor"/></svg></span>';
            const metricLabels = {
                hours: 'Cost Per Hour',
                sessions: 'Cost Per Session',
                plays: 'Cost Per Play',
            };
            const label = metricLabels[currentBaseMetric] || metricLabels.hours;
            const yearText = currentYear
                ? `<span style="white-space: nowrap">(through ${currentYear})</span>`
                : '<span style="white-space: nowrap">(All Time)</span>';
            return `${label} ${yearText}${experimentalIcon}`;
        },
        render: (detailContent) => {
            showCostPerMetricBreakdown(detailContent);
        },
    },
    'shelf-of-shame': {
        getTitle: () => 'Shelf of Shame',
        render: (detailContent) => {
            showShelfOfShameBreakdown(detailContent);
        },
    },
    'unknown-acquisition-dates': {
        getTitle: () => 'Unknown Acquisition Dates',
        render: (detailContent, statsCache) => {
            createGameTable(detailContent, statsCache.unknownGames, ['Name', 'Type', 'Year']);
        },
    },
    'never-played': {
        getTitle: (currentYear) => currentYear
            ? `Never Played <span style="white-space: nowrap">(Acquired ${currentYear})</span>`
            : 'Never Played',
        render: (detailContent, statsCache) => {
            createGameTable(detailContent, statsCache.neverPlayedGames, ['Name', 'Type', 'Year', 'Acquisition Date']);
        },
    },
    'missing-price-paid': {
        getTitle: () => 'Missing Price Paid',
        render: (detailContent, statsCache) => {
            createGameTable(detailContent, statsCache.missingPricePaidGames, ['Name', 'Year', 'Acquisition Date']);
        },
    },
};

/**
 * Show detail section for a specific stat - inline below the clicked widget
 */
function showDetailSection(statType) {
    const detailSection = document.getElementById('detail-section');
    const detailTitle = document.getElementById('detail-title');
    const detailContent = document.getElementById('detail-content');
    const detailStatSummary = document.getElementById('detail-stat-summary');
    const dashboardGrid = document.querySelector('.dashboard-grid');

    // Remove active class from all stat cards
    document.querySelectorAll('.widget.clickable').forEach(card => {
        card.classList.remove('active');
    });

    // Add active class to the clicked card
    const clickedCard = document.querySelector(`.widget[data-stat="${statType}"]`);
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
    detailTitle.innerHTML = handler.getTitle(currentYear);

    // Render content using handler
    handler.render(detailContent, statsCache, currentYear);

    // Call renderSummary if handler provides custom summary rendering (e.g., year-review toggle)
    if (handler.renderSummary) {
        handler.renderSummary(detailStatSummary, detailContent);
    }

    // Move detail section into the grid, right after the clicked widget
    if (clickedCard && dashboardGrid) {
        clickedCard.after(detailSection);
    }

    // Show section
    detailSection.style.display = 'block';

    // Dynamically set detail content max-height based on available space
    const detailContentEl = document.getElementById('detail-content');
    if (clickedCard) {
        const header = document.querySelector('header');
        const detailHeader = detailSection.querySelector('.detail-header');
        const headerHeight = header?.offsetHeight || 0;
        const cardHeight = clickedCard.offsetHeight;
        const detailHeaderHeight = detailHeader?.offsetHeight || 0;
        const buffer = 24; // Small buffer for spacing
        const availableHeight = window.innerHeight - headerHeight - cardHeight - detailHeaderHeight - buffer;
        detailContentEl.style.maxHeight = `${Math.max(availableHeight, 200)}px`;
    }

    // Scroll the clicked card into view after the expand animation completes (250ms)
    setTimeout(() => {
        clickedCard?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 250);

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
    document.getElementById('detail-content').style.maxHeight = '';
    currentlyOpenStatType = null;

    // Remove active class from all stat cards
    document.querySelectorAll('.widget.clickable').forEach(card => {
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
                <th class="sorted-desc">${columnHeader}</th>
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
                        <td>${renderGameNameWithThumbnail(item.game)}</td>
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
 * Show People H-Index breakdown table
 * @param {HTMLElement} container - Container element
 * @param {number} hIndex - People H-Index value
 */
function showPeopleHIndexBreakdown(container, hIndex) {
    const breakdown = getPeopleHIndexBreakdown(
        gameData.games,
        gameData.plays,
        gameData.selfPlayerId,
        gameData.anonymousPlayerId,
        currentYear,
    );

    const table = document.createElement('table');
    table.className = 'h-index-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>Rank</th>
                <th>Game</th>
                <th class="sorted-desc">Unique Players</th>
                <th>Contributes to H-Index?</th>
            </tr>
        </thead>
        <tbody>
            ${breakdown.map((item, index) => {
                const rank = index + 1;
                const contributesToHIndex = rank <= item.uniquePlayers && rank <= hIndex;
                return `
                    <tr${contributesToHIndex ? ' class="h-index-contributor"' : ''}>
                        <td>${rank}</td>
                        <td>${renderGameNameWithThumbnail(item.game)}</td>
                        <td>${item.uniquePlayers}</td>
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
            game.copies.forEach((copy) => {
                if (currentYear) {
                    if (copy.acquisitionDate && copy.acquisitionDate.startsWith(currentYear.toString())) {
                        entries.push({
                            gameId: game.id,
                            game,
                            copy
                        });
                    }
                } else {
                    if (copy.statusOwned === true) {
                        entries.push({
                            gameId: game.id,
                            game,
                            copy
                        });
                    }
                }
            });
        }
    });

    // Count how many entries per game
    const entriesPerGame = new Map();
    entries.forEach(entry => {
        const count = entriesPerGame.get(entry.gameId) || 0;
        entriesPerGame.set(entry.gameId, count + 1);
    });

    // Track versionName usage per game to add disambiguators
    const versionNameCounts = new Map();
    entries.forEach(entry => {
        const gameId = entry.gameId;
        const versionName = entry.copy.versionName || 'no version set';
        const key = `${gameId}:${versionName}`;
        const count = versionNameCounts.get(key) || 0;
        versionNameCounts.set(key, count + 1);
    });

    // Track which version name occurrence we're on for each game
    const versionNameIndexes = new Map();

    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th class="sorted-asc">Name</th>
                <th>Type</th>
                <th>Acquisition Date</th>
            </tr>
        </thead>
        <tbody>
            ${entries.map(entry => {
                const game = entry.game;
                const copy = entry.copy;
                const gameId = entry.gameId;
                const hasMutipleCopies = entriesPerGame.get(gameId) > 1;

                let name = game.name;
                if (hasMutipleCopies) {
                    const versionName = copy.versionName || 'no version set';
                    const key = `${gameId}:${versionName}`;
                    const versionCount = versionNameCounts.get(key);

                    if (versionCount > 1) {
                        // Multiple copies with same versionName, add disambiguator
                        const currentIndex = versionNameIndexes.get(key) || 1;
                        versionNameIndexes.set(key, currentIndex + 1);
                        name += ` (${versionName} - ${currentIndex})`;
                    } else {
                        // Single copy with this versionName
                        name += ` (${versionName})`;
                    }
                }

                const type = game.isBaseGame ? 'Base Game' :
                            game.isExpandalone ? 'Expandalone' :
                            game.isExpansion ? 'Expansion' : 'Unknown';
                const acquisitionDate = copy ? (copy.acquisitionDate || 'Unknown') : 'Unknown';

                // Create a temporary game object with modified name for rendering
                const displayGame = { ...game, name: name };

                return `
                    <tr>
                        <td>${renderGameNameWithThumbnail(displayGame)}</td>
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
                <th class="sorted-asc">Name</th>
                <th>Type</th>
                <th>Acquisition Date</th>
            </tr>
        </thead>
        <tbody>
            ${expansions.map(game => `
                <tr>
                    <td>${renderGameNameWithThumbnail(game)}</td>
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
    const ownedGamesInYear = new Set();

    gameData.plays.forEach(play => {
        if (!isPlayInYear(play, currentYear)) return;
        const count = playCountsPerGame.get(play.gameId) || 0;
        playCountsPerGame.set(play.gameId, count + 1);

        // Track if this game was played with user's copy in the filtered year
        if (play.copyId !== null) {
            ownedGamesInYear.add(play.gameId);
        }
    });

    const gamesWithPlays = Array.from(playCountsPerGame.entries()).map(([gameId, count]) => {
        const game = gameData.games.find(g => g.id === gameId);
        const owned = ownedGamesInYear.has(gameId);
        return { game, count, owned };
    });

    gamesWithPlays.sort((a, b) => b.count - a.count);

    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Game</th>
                <th class="sorted-desc">Plays</th>
                <th>Owned</th>
            </tr>
        </thead>
        <tbody>
            ${gamesWithPlays.map(item => `
                <tr>
                    <td>${item.game ? renderGameNameWithThumbnail(item.game) : 'Unknown Game'}</td>
                    <td>${item.count}</td>
                    <td>${item.owned ? '✓' : ''}</td>
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
                <th class="sorted-desc">${columnHeader}</th>
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
                    <td>${renderGameNameWithThumbnail(item.game)}</td>
                    <td>${formattedCount}</td>
                </tr>
                `;
            }).join('')}
        </tbody>
    `;
    container.appendChild(table);
}

/**
 * Show days played breakdown by game
 */
function showDaysPlayedBreakdown(container) {
    const breakdown = getDaysPlayedByGame(gameData.games, gameData.plays, currentYear);

    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Game</th>
                <th class="sorted-desc">Days Played</th>
                <th>Median/Avg Plays Per Day</th>
                <th>Min/Max Time Per Day</th>
                <th>Median/Avg Time Per Day</th>
            </tr>
        </thead>
        <tbody>
            ${breakdown.map(item => {
                // Format minutes as hours per day values
                const formatMinutes = (minutes) => {
                    if (minutes === null) return '-';
                    const hrs = Math.floor(minutes / 60);
                    const mins = Math.round(minutes % 60);
                    if (hrs > 0) {
                        return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
                    }
                    return `${mins}m`;
                };

                // Format plays per day values
                const formatPlays = (plays) => {
                    if (plays === null) return '-';
                    return plays % 1 === 0 ? plays.toString() : plays.toFixed(1);
                };

                const minMaxHours = `${formatMinutes(item.minMinutes)}<br>${formatMinutes(item.maxMinutes)}`;
                const medianAvgHours = `${formatMinutes(item.medianMinutes)}<br>${formatMinutes(item.avgMinutes)}`;
                const medianAvgPlays = `${formatPlays(item.medianPlays)}<br>${formatPlays(item.avgPlays)}`;

                return `
                    <tr>
                        <td>${renderGameNameWithThumbnail(item.game)}</td>
                        <td>${item.uniqueDays}</td>
                        <td class="no-wrap">${medianAvgPlays}</td>
                        <td class="no-wrap">${minMaxHours}</td>
                        <td class="no-wrap">${medianAvgHours}</td>
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
                <th class="sorted-desc">Time Played</th>
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
                        <td>${renderGameNameWithThumbnail(item.game)}</td>
                        <td>${hours} hours</td>
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
                        <td>${renderGameNameWithThumbnail(suggestion.game)}</td>
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
 * Show total cost breakdown
 */
function showTotalCostBreakdown(container) {
    const { games, gamesWithoutPrice } = statsCache.totalCostData;

    if (games.length === 0) {
        container.innerHTML = '<p>No owned games found.</p>';
        return;
    }

    // Sort by price descending (null/unknown sorts as 0)
    const sortedGames = [...games].sort((a, b) => (b.totalPricePaid ?? 0) - (a.totalPricePaid ?? 0));

    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Game</th>
                <th class="sorted-desc">Price Paid</th>
            </tr>
        </thead>
        <tbody>
            ${sortedGames.map(item => {
                const priceDisplay = item.totalPricePaid !== null
                    ? `$${item.totalPricePaid.toFixed(2)}`
                    : 'unknown';
                return `
                    <tr>
                        <td>${renderGameNameWithThumbnail(item.game)}</td>
                        <td>${priceDisplay}</td>
                    </tr>
                `;
            }).join('')}
        </tbody>
    `;
    container.appendChild(table);

    if (gamesWithoutPrice > 0) {
        const note = document.createElement('p');
        note.className = 'detail-note';
        note.textContent = `Note: ${gamesWithoutPrice} game${gamesWithoutPrice === 1 ? '' : 's'} with unknown price not included in total.`;
        container.appendChild(note);
    }
}

/**
 * Show value club breakdown for any tier
 */
function showValueClubBreakdown(container, clubData, clubLabel) {
    const { games } = clubData;

    if (games.length === 0) {
        container.innerHTML = `<p>No games in the ${clubLabel} club yet. Keep playing to get your cost per game down!</p>`;
        return;
    }

    const metricLabel = currentBaseMetric === 'hours' ? 'Hours'
        : currentBaseMetric === 'sessions' ? 'Sessions' : 'Plays';
    const metricLabelSingular = currentBaseMetric === 'hours' ? 'Hour'
        : currentBaseMetric === 'sessions' ? 'Session' : 'Play';

    // Sort by costPerMetric ascending (best value games at top)
    const sortedGames = [...games].sort((a, b) => a.costPerMetric - b.costPerMetric);

    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Game</th>
                <th>${metricLabel}</th>
                <th class="sorted-asc">Cost/${metricLabelSingular}</th>
                <th>Price Paid</th>
            </tr>
        </thead>
        <tbody>
            ${sortedGames.map(item => {
                const metricDisplay = currentBaseMetric === 'hours'
                    ? item.metricValue.toFixed(1)
                    : Math.floor(item.metricValue);
                return `
                    <tr>
                        <td>${renderGameNameWithThumbnail(item.game)}</td>
                        <td>${metricDisplay}</td>
                        <td>$${item.costPerMetric.toFixed(2)}</td>
                        <td>$${item.pricePaid.toFixed(2)}</td>
                    </tr>
                `;
            }).join('')}
        </tbody>
    `;
    container.appendChild(table);
}

/**
 * Show cost per metric breakdown
 */
function showCostPerMetricBreakdown(container) {
    const { games } = statsCache.costPerMetricData;

    if (games.length === 0) {
        container.innerHTML = '<p>No owned games with price data found.</p>';
        return;
    }

    const metricLabel = currentBaseMetric === 'hours' ? 'Hours'
        : currentBaseMetric === 'sessions' ? 'Sessions' : 'Plays';
    const metricLabelSingular = currentBaseMetric === 'hours' ? 'Hour'
        : currentBaseMetric === 'sessions' ? 'Session' : 'Play';
    const metricLabelLower = metricLabelSingular.toLowerCase();

    // Explanation section
    const explanationDiv = document.createElement('div');
    explanationDiv.className = 'detail-explanation';
    explanationDiv.innerHTML = `
        <p><strong>Game Average:</strong> Average of each game's cost-per-${metricLabelLower}. Every game weighted equally.</p>
        <p><strong>Overall Rate:</strong> Total cost ÷ total ${metricLabel.toLowerCase()}. High-activity games weighted more heavily.</p>
    `;
    container.appendChild(explanationDiv);

    // Games already sorted by costPerMetric ascending
    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Game</th>
                <th>${metricLabel}</th>
                <th class="sorted-asc">Cost/${metricLabelSingular}</th>
                <th>Price Paid</th>
            </tr>
        </thead>
        <tbody>
            ${games.map(item => {
                const metricDisplay = currentBaseMetric === 'hours'
                    ? item.metricValue.toFixed(1)
                    : Math.floor(item.metricValue);
                return `
                    <tr>
                        <td>${renderGameNameWithThumbnail(item.game)}</td>
                        <td>${metricDisplay}</td>
                        <td>$${item.costPerMetric.toFixed(2)}</td>
                        <td>$${item.pricePaid.toFixed(2)}</td>
                    </tr>
                `;
            }).join('')}
        </tbody>
    `;
    container.appendChild(table);
}

/**
 * Show shelf of shame breakdown
 */
function showShelfOfShameBreakdown(container) {
    const { games, totalCost, count } = statsCache.shelfOfShameData;

    if (games.length === 0) {
        container.innerHTML = '<p>Yay! No unplayed games with known prices. The shelf of shame is empty!</p>';
        return;
    }

    // Explanation note
    const explanationDiv = document.createElement('div');
    explanationDiv.className = 'detail-explanation';
    explanationDiv.innerHTML = `
        <p><strong>Note:</strong> These are owned base games that have never been played since logging began.
        Some may have been played before logging began, so the actual "shelf of shame" could be smaller.</p>
    `;
    container.appendChild(explanationDiv);

    // Games already sorted by price descending
    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Game</th>
                <th class="sorted-desc">Price Paid</th>
            </tr>
        </thead>
        <tbody>
            ${games.map(item => `
                <tr>
                    <td>${renderGameNameWithThumbnail(item.game)}</td>
                    <td>$${item.pricePaid.toFixed(2)}</td>
                </tr>
            `).join('')}
        </tbody>
    `;
    container.appendChild(table);

    const summaryNote = document.createElement('p');
    summaryNote.className = 'detail-note';
    summaryNote.innerHTML = `<strong>${count} game${count === 1 ? '' : 's'}</strong> totaling <strong>< $${totalCost.toFixed(2)}</strong> waiting to be played.`;
    container.appendChild(summaryNote);
}

/**
 * Show players breakdown
 */
function showPlayersBreakdown(container) {
    const playerStats = statsCache.playerStats;

    if (playerStats.playerDetails.length === 0) {
        container.innerHTML = '<p>No players found for this period.</p>';
        return;
    }

    // Sort by current metric
    const sortedPlayers = [...playerStats.playerDetails].sort((a, b) => {
        switch (currentBaseMetric) {
            case Metric.SESSIONS:
                return b.sessions - a.sessions;
            case Metric.PLAYS:
                return b.plays - a.plays;
            case Metric.HOURS:
            default:
                return b.minutes - a.minutes;
        }
    });

    const hoursClass = currentBaseMetric === Metric.HOURS ? ' class="sorted-desc"' : '';
    const sessionsClass = currentBaseMetric === Metric.SESSIONS ? ' class="sorted-desc"' : '';
    const playsClass = currentBaseMetric === Metric.PLAYS ? ' class="sorted-desc"' : '';

    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Player</th>
                <th${hoursClass}>Hours</th>
                <th${sessionsClass}>Sessions</th>
                <th${playsClass}>Plays</th>
            </tr>
        </thead>
        <tbody>
            ${sortedPlayers.map(player => `
                <tr>
                    <td>${player.name}</td>
                    <td>${(player.minutes / 60).toFixed(1)} (${player.minutesPercent.toFixed(1)}%)</td>
                    <td>${player.sessions} (${player.sessionsPercent.toFixed(1)}%)</td>
                    <td>${player.plays} (${player.playsPercent.toFixed(1)}%)</td>
                </tr>
            `).join('')}
        </tbody>
    `;
    container.appendChild(table);
}

/**
 * Show solo games breakdown
 */
function showSoloBreakdown(container) {
    const soloGameStats = statsCache.soloGameStats;

    if (soloGameStats.gameDetails.length === 0) {
        container.innerHTML = '<p>No solo plays found for this period.</p>';
        return;
    }

    // Sort by current metric
    const sortedGames = [...soloGameStats.gameDetails].sort((a, b) => {
        switch (currentBaseMetric) {
            case Metric.SESSIONS:
                return b.sessions - a.sessions;
            case Metric.PLAYS:
                return b.plays - a.plays;
            case Metric.HOURS:
            default:
                return b.minutes - a.minutes;
        }
    });

    const hoursClass = currentBaseMetric === Metric.HOURS ? ' class="sorted-desc"' : '';
    const sessionsClass = currentBaseMetric === Metric.SESSIONS ? ' class="sorted-desc"' : '';
    const playsClass = currentBaseMetric === Metric.PLAYS ? ' class="sorted-desc"' : '';

    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Game</th>
                <th${hoursClass}>Hours</th>
                <th${sessionsClass}>Sessions</th>
                <th${playsClass}>Plays</th>
            </tr>
        </thead>
        <tbody>
            ${sortedGames.map(item => `
                <tr>
                    <td>${renderGameNameWithThumbnail(item.game)}</td>
                    <td>${(item.minutes / 60).toFixed(1)}</td>
                    <td>${item.sessions}</td>
                    <td>${item.plays}</td>
                </tr>
            `).join('')}
        </tbody>
    `;
    container.appendChild(table);
}

/**
 * Show locations breakdown
 */
function showLocationsBreakdown(container) {
    const locationStats = statsCache.locationStats;

    if (locationStats.locationDetails.length === 0) {
        container.innerHTML = '<p>No locations found for this period.</p>';
        return;
    }

    // Sort by current metric
    const sortedLocations = [...locationStats.locationDetails].sort((a, b) => {
        switch (currentBaseMetric) {
            case Metric.SESSIONS:
                return b.sessions - a.sessions;
            case Metric.PLAYS:
                return b.plays - a.plays;
            case Metric.HOURS:
            default:
                return b.minutes - a.minutes;
        }
    });

    const hoursClass = currentBaseMetric === Metric.HOURS ? ' class="sorted-desc"' : '';
    const sessionsClass = currentBaseMetric === Metric.SESSIONS ? ' class="sorted-desc"' : '';
    const playsClass = currentBaseMetric === Metric.PLAYS ? ' class="sorted-desc"' : '';

    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Location</th>
                <th${hoursClass}>Hours</th>
                <th${sessionsClass}>Sessions</th>
                <th${playsClass}>Plays</th>
            </tr>
        </thead>
        <tbody>
            ${sortedLocations.map(loc => `
                <tr>
                    <td>${loc.name}</td>
                    <td>${(loc.minutes / 60).toFixed(1)} (${loc.minutesPercent.toFixed(1)}%)</td>
                    <td>${loc.sessions} (${loc.sessionsPercent.toFixed(1)}%)</td>
                    <td>${loc.plays} (${loc.playsPercent.toFixed(1)}%)</td>
                </tr>
            `).join('')}
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
    const newPeopleGames = getNewPeopleHIndexGames(gameData.games, gameData.plays, gameData.selfPlayerId, gameData.anonymousPlayerId, currentYear);

    // Helper function to format natural language lists ("A, B, and C")
    const formatNaturalList = (items) => {
        if (items.length === 0) return '';
        if (items.length === 1) return items[0];
        if (items.length === 2) return `${items[0]} and ${items[1]}`;
        return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
    };

    // Build Summary section bullet points
    const summaryBullets = [];

    // Unique games played summary
    const gamesPlayedData = statsCache.gamesPlayedData;
    if (gamesPlayedData && gamesPlayedData.total > 0) {
        let uniqueGamesBullet = `Played ${gamesPlayedData.total} unique game${gamesPlayedData.total === 1 ? '' : 's'}`;
        if (gamesPlayedData.newToMe > 0) {
            uniqueGamesBullet += `, ${gamesPlayedData.newToMe} of which ${gamesPlayedData.newToMe === 1 ? 'was' : 'were'} new to me`;
        }
        summaryBullets.push(uniqueGamesBullet);
    }

    // Time & Activity summary
    const timeAndActivityData = statsCache.yearReview.timeAndActivity;
    const allLocationsData = statsCache.yearReview.allLocations;
    if (timeAndActivityData && timeAndActivityData.totalDays > 0) {
        let activityBullet = `Played ${timeAndActivityData.totalDays} days totaling ${formatApproximateHours(timeAndActivityData.totalMinutes)} hours`;
        if (timeAndActivityData.longestStreak > 1) {
            activityBullet += ` with a ${timeAndActivityData.longestStreak}-day streak`;
        }
        summaryBullets.push(activityBullet);
    }

    // Players summary (count + top by hours)
    const topPlayerHours = statsCache.yearReview.topPlayerByHours;
    const playerCount = statsCache.playerStats?.uniquePlayerCount || 0;
    if (playerCount > 0) {
        let playerBullet = `Played with more than ${playerCount} player${playerCount === 1 ? '' : 's'}`;
        if (topPlayerHours) {
            playerBullet += ` with the top being ${topPlayerHours.name} (${formatApproximateHours(topPlayerHours.value)} <span class="metric-name hours">hours</span>)`;
        }
        summaryBullets.push(playerBullet);
    }

    // Locations summary (count + top outside home by hours)
    const topLocationHours = statsCache.yearReview.topLocationByHours;
    if (allLocationsData && allLocationsData.length > 0) {
        let locationBullet = `Played at ${allLocationsData.length} location${allLocationsData.length === 1 ? '' : 's'}`;
        if (topLocationHours) {
            locationBullet += ` with the top outside home being ${topLocationHours.name} (${formatApproximateHours(topLocationHours.value)} <span class="metric-name hours">hours</span>)`;
        }
        summaryBullets.push(locationBullet);
    }

    // Game Highlights summary
    const topHoursGame = statsCache.yearReview.topGamesByHours[0];
    const topSessionsGame = statsCache.yearReview.topGamesBySessions[0];
    const topPlaysGame = statsCache.yearReview.topGamesByPlays[0];
    if (topHoursGame || topSessionsGame || topPlaysGame) {
        // Group metrics by game name to consolidate duplicates
        const gameToMetrics = new Map();
        const metricOrder = ['hours', 'sessions', 'plays'];
        const games = [
            { game: topHoursGame, metric: 'hours' },
            { game: topSessionsGame, metric: 'sessions' },
            { game: topPlaysGame, metric: 'plays' },
        ];
        games.forEach(({ game, metric }) => {
            if (game) {
                const name = game.game.name;
                if (!gameToMetrics.has(name)) {
                    gameToMetrics.set(name, []);
                }
                gameToMetrics.get(name).push(metric);
            }
        });

        // Build parts in metric order (by first metric each game appears in)
        const gameHighlightParts = [];
        const processedGames = new Set();
        metricOrder.forEach(metric => {
            games.filter(g => g.metric === metric && g.game).forEach(({ game }) => {
                const name = game.game.name;
                if (!processedGames.has(name)) {
                    processedGames.add(name);
                    const metrics = gameToMetrics.get(name);
                    const metricSpans = metrics.map(m =>
                        `<span class="metric-name ${m}">${m}</span>`
                    );
                    gameHighlightParts.push(`by ${formatNaturalList(metricSpans)} was <strong><em>${name}</em></strong>`);
                }
            });
        });

        if (gameHighlightParts.length > 0) {
            summaryBullets.push(`Top game ${formatNaturalList(gameHighlightParts)}`);
        }
    }

    // Longest single play summary
    const longestPlay = statsCache.yearReview.longestSinglePlays[0];
    if (longestPlay) {
        summaryBullets.push(`Longest single play was ${formatApproximateHours(longestPlay.durationMin)} hours of <strong><em>${longestPlay.game.name}</em></strong>`);
    }

    // Biggest hit among new games (by sessions)
    const topNewGame = statsCache.yearReview.topNewToMeGameBySessions;
    if (topNewGame) {
        summaryBullets.push(`Biggest hit among new games was <strong><em>${topNewGame.game.name}</em></strong> (${topNewGame.sessions} <span class="metric-name sessions">sessions</span>)`);
    }

    // Returning favorite (top returning game by sessions)
    const topReturningGame = statsCache.yearReview.topReturningGameBySessions;
    if (topReturningGame) {
        summaryBullets.push(`Returning favorite was <strong><em>${topReturningGame.game.name}</em></strong> (${topReturningGame.sessions} <span class="metric-name sessions">sessions</span>)`);
    }

    // Solo stats summary (show hours or sessions, whichever is greater)
    const soloStatsData = statsCache.yearReview.soloStats;
    const topSoloGame = statsCache.yearReview.topSoloGameByHours;
    if (soloStatsData) {
        const soloHoursExact = soloStatsData.totalSoloMinutes / 60;
        const soloSessions = soloStatsData.totalSoloSessions;
        if (soloHoursExact > 0 || soloSessions > 0) {
            let soloBullet;
            if (soloHoursExact >= soloSessions) {
                soloBullet = `Logged ${formatApproximateHours(soloStatsData.totalSoloMinutes)} solo <span class="metric-name hours">hours</span>`;
            } else {
                soloBullet = `Logged ${soloSessions} solo <span class="metric-name sessions">sessions</span>`;
            }
            if (topSoloGame) {
                soloBullet += ` with the top solo game being <strong><em>${topSoloGame.game.name}</em></strong>`;
            }
            summaryBullets.push(soloBullet);
        }
    }

    // H-Index Growth summary
    const hIndexParts = [];
    if (statsCache.yearReview.hoursHIndexIncrease > 0) {
        hIndexParts.push(`<span class="metric-name hours">hours</span> h-index by ${statsCache.yearReview.hoursHIndexIncrease} (to ${statsCache.yearReview.hoursHIndexCurrent})`);
    }
    if (statsCache.yearReview.sessionsHIndexIncrease > 0) {
        hIndexParts.push(`<span class="metric-name sessions">sessions</span> h-index by ${statsCache.yearReview.sessionsHIndexIncrease} (to ${statsCache.yearReview.sessionsHIndexCurrent})`);
    }
    if (statsCache.yearReview.playsHIndexIncrease > 0) {
        hIndexParts.push(`<span class="metric-name plays">plays</span> h-index by ${statsCache.yearReview.playsHIndexIncrease} (to ${statsCache.yearReview.playsHIndexCurrent})`);
    }
    if (hIndexParts.length > 0) {
        summaryBullets.push(`Increased ${formatNaturalList(hIndexParts)}`);
    }

    // Logging Achievements summary (highest threshold per metric)
    const loggingAchievementsData = statsCache.yearReview.loggingAchievements;
    if (loggingAchievementsData && loggingAchievementsData.length > 0) {
        // Find highest threshold for each metric
        const highestByMetric = {};
        loggingAchievementsData.forEach(a => {
            if (!highestByMetric[a.metric] || a.threshold > highestByMetric[a.metric]) {
                highestByMetric[a.metric] = a.threshold;
            }
        });
        const achievementParts = [];
        if (highestByMetric.hours) {
            achievementParts.push(`${highestByMetric.hours.toLocaleString()}th <span class="metric-name hours">hour</span>`);
        }
        if (highestByMetric.sessions) {
            achievementParts.push(`${highestByMetric.sessions.toLocaleString()}th <span class="metric-name sessions">session</span>`);
        }
        if (highestByMetric.plays) {
            achievementParts.push(`${highestByMetric.plays.toLocaleString()}th <span class="metric-name plays">play</span>`);
        }
        if (achievementParts.length > 0) {
            summaryBullets.push(`Logged ${formatNaturalList(achievementParts)}`);
        }
    }

    // Milestones summary (highest milestone type with increase > 0 per metric)
    const milestoneTypes = ['centuries', 'quarters', 'dimes', 'fives']; // highest to lowest
    const findHighestMilestone = (metric) => {
        for (const type of milestoneTypes) {
            const increaseKey = `${type}${metric.charAt(0).toUpperCase() + metric.slice(1)}Increase`;
            const currentKey = `${type}${metric.charAt(0).toUpperCase() + metric.slice(1)}Current`;
            if (statsCache.yearReview[increaseKey] > 0) {
                return { type, increase: statsCache.yearReview[increaseKey], current: statsCache.yearReview[currentKey] };
            }
        }
        return null;
    };
    const hoursMilestone = findHighestMilestone('hours');
    const sessionsMilestone = findHighestMilestone('sessions');
    const playsMilestone = findHighestMilestone('plays');
    const milestoneParts = [];
    if (hoursMilestone) {
        milestoneParts.push(`<span class="metric-name hours">hour</span> ${hoursMilestone.type} by ${hoursMilestone.increase} (to ${hoursMilestone.current})`);
    }
    if (sessionsMilestone) {
        milestoneParts.push(`<span class="metric-name sessions">session</span> ${sessionsMilestone.type} by ${sessionsMilestone.increase} (to ${sessionsMilestone.current})`);
    }
    if (playsMilestone) {
        milestoneParts.push(`<span class="metric-name plays">play</span> ${playsMilestone.type} by ${playsMilestone.increase} (to ${playsMilestone.current})`);
    }
    if (milestoneParts.length > 0) {
        summaryBullets.push(`Increased ${formatNaturalList(milestoneParts)}`);
    }

    // Shelf of Shame summary
    const shameChanges = statsCache.yearReview.shelfOfShameChanges;
    if (shameChanges) {
        const added = shameChanges.newShameGames.length;
        const removed = shameChanges.exitedShameGames.length;

        let shameBullet;
        if (removed > 0 && added > 0) {
            shameBullet = `Cleared ${removed} game${removed !== 1 ? 's' : ''} from the shelf of shame but added ${added} more`;
        } else if (removed > 0) {
            shameBullet = `Cleared ${removed} game${removed !== 1 ? 's' : ''} from the shelf of shame!`;
        } else if (added > 0) {
            shameBullet = `Added ${added} game${added !== 1 ? 's' : ''} to the shelf of shame`;
        }

        if (shameBullet) {
            summaryBullets.push(shameBullet);
        }
    }

    // Build Summary HTML
    const summaryHtml = summaryBullets.length > 0
        ? `<div class="year-review-summary year-review-subsection">
            <h3 class="year-review-subsection-heading">Summary</h3>
            <ul>
                ${summaryBullets.map(bullet => `<li>${bullet}</li>`).join('')}
            </ul>
        </div>`
        : '';

    const detailDiv = document.createElement('div');
    detailDiv.className = 'year-review-detail';
    detailDiv.innerHTML = `
        ${summaryHtml}
        <div class="year-review-subsection">
            <h3 class="year-review-subsection-heading">H-Index Growth</h3>
            <table class="year-review-table">
                <tbody>
                    <tr class="year-review-row year-review-row-clickable" data-metric="hours">
                        <td class="year-review-label-detail">
                            <span class="year-review-expand-icon">▶</span>
                            Increase in all-time <span class="metric-name hours">hours</span> h-index:
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
                                            <span class="year-review-game-name">${renderGameNameWithThumbnail(item.game)}</span>
                                            <span class="year-review-game-value">${item.value.toFixed(1)} hours (${item.thisYearValue.toFixed(1)} this year)</span>
                                        </div>
                                    `).join('')
                                    : '<div class="year-review-no-games">No new games added to h-index</div>'
                                }
                            </div>
                        </td>
                    </tr>
                    <tr class="year-review-row year-review-row-clickable" data-metric="sessions">
                        <td class="year-review-label-detail">
                            <span class="year-review-expand-icon">▶</span>
                            Increase in all-time <span class="metric-name sessions">sessions</span> h-index:
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
                                            <span class="year-review-game-name">${renderGameNameWithThumbnail(item.game)}</span>
                                            <span class="year-review-game-value">${item.value} days (${item.thisYearValue} this year)</span>
                                        </div>
                                    `).join('')
                                    : '<div class="year-review-no-games">No new games added to h-index</div>'
                                }
                            </div>
                        </td>
                    </tr>
                    <tr class="year-review-row year-review-row-clickable" data-metric="plays">
                        <td class="year-review-label-detail">
                            <span class="year-review-expand-icon">▶</span>
                            Increase in all-time <span class="metric-name plays">plays</span> h-index:
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
                                            <span class="year-review-game-name">${renderGameNameWithThumbnail(item.game)}</span>
                                            <span class="year-review-game-value">${item.value} plays (${item.thisYearValue} this year)</span>
                                        </div>
                                    `).join('')
                                    : '<div class="year-review-no-games">No new games added to h-index</div>'
                                }
                            </div>
                        </td>
                    </tr>
                    <tr class="year-review-row year-review-row-clickable" data-metric="people">
                        <td class="year-review-label-detail">
                            <span class="year-review-expand-icon">▶</span>
                            Increase in all-time people h-index:
                        </td>
                        <td class="year-review-value-detail">${formatIncrease(
                            statsCache.yearReview.peopleHIndexIncrease,
                            statsCache.yearReview.peopleHIndexPrevious,
                            statsCache.yearReview.peopleHIndexCurrent
                        )}</td>
                    </tr>
                    <tr class="year-review-expanded-content" data-metric="people" style="display: none;">
                        <td colspan="2">
                            <div class="year-review-games-list">
                                ${newPeopleGames.length > 0
                                    ? newPeopleGames.map(item => `
                                        <div class="year-review-game-item">
                                            <span class="year-review-game-name">${renderGameNameWithThumbnail(item.game)}</span>
                                            <span class="year-review-game-value">${item.value} players (${item.thisYearValue} this year)</span>
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

    // Add Game Highlights subsection
    const topHours = statsCache.yearReview.topGamesByHours;
    const topSessions = statsCache.yearReview.topGamesBySessions;
    const topPlays = statsCache.yearReview.topGamesByPlays;
    const longestSinglePlays = statsCache.yearReview.longestSinglePlays;
    const topSharedGames = statsCache.yearReview.topGamesByUniquePlayers;
    const topTraveledGames = statsCache.yearReview.topGamesByUniqueLocations;

    if (topHours.length > 0 || topSessions.length > 0 || topPlays.length > 0 || longestSinglePlays.length > 0 || topSharedGames.length > 0 || topTraveledGames.length > 0) {
        const formatHoursValue = (minutes) => {
            const hours = minutes / 60;
            return `${hours.toFixed(1)} hours this year`;
        };

        const formatSessionsValue = (days) => {
            return `${days} ${days === 1 ? 'day' : 'days'} this year`;
        };

        const formatPlaysValue = (plays) => {
            return `${plays} ${plays === 1 ? 'play' : 'plays'} this year`;
        };

        const renderTopGamesRow = (metric, topGames, formatValue) => {
            if (topGames.length === 0) return '';

            const thumbnails = topGames.map(item => renderGameThumbnailOnly(item.game)).join('');
            const rankLabels = ['1st', '2nd', '3rd'];

            return `
                <tr class="year-review-row year-review-row-clickable" data-detail="top-${metric}" data-metric="${metric}">
                    <td class="year-review-label-detail">
                        <span class="year-review-expand-icon">▶</span>
                        Top ${topGames.length} games played by <span class="metric-name ${metric}">${metric}</span>:
                    </td>
                    <td class="year-review-value-detail">
                        <span class="top-games-thumbnails">${thumbnails}</span>
                    </td>
                </tr>
                <tr class="year-review-expanded-content" data-detail="top-${metric}" data-metric="${metric}" style="display: none;">
                    <td colspan="2">
                        <div class="year-review-games-list">
                            ${topGames.map((item, index) => `
                                <div class="year-review-game-item">
                                    <span class="year-review-game-rank">${rankLabels[index]}</span>
                                    <span class="year-review-game-name">${renderGameNameWithThumbnail(item.game)}</span>
                                    <span class="year-review-game-value">${formatValue(item.value)}</span>
                                </div>
                            `).join('')}
                        </div>
                    </td>
                </tr>
            `;
        };

        const renderLongestPlaysRow = () => {
            if (longestSinglePlays.length === 0) return '';

            const thumbnails = longestSinglePlays.map(item => renderGameThumbnailOnly(item.game)).join('');
            const rankLabels = ['1st', '2nd', '3rd'];

            return `
                <tr class="year-review-row year-review-row-clickable" data-detail="longest-plays">
                    <td class="year-review-label-detail">
                        <span class="year-review-expand-icon">▶</span>
                        Top ${longestSinglePlays.length} longest single plays:
                    </td>
                    <td class="year-review-value-detail">
                        <span class="top-games-thumbnails">${thumbnails}</span>
                    </td>
                </tr>
                <tr class="year-review-expanded-content" data-detail="longest-plays" style="display: none;">
                    <td colspan="2">
                        <div class="year-review-games-list">
                            ${longestSinglePlays.map((item, index) => `
                                <div class="year-review-game-item">
                                    <span class="year-review-game-rank">${rankLabels[index]}</span>
                                    <span class="year-review-game-name">${renderGameNameWithThumbnail(item.game)}</span>
                                    <span class="year-review-game-value">${(item.durationMin / 60).toFixed(1)} hours on ${formatDateWithWeekday(item.date)}</span>
                                </div>
                            `).join('')}
                        </div>
                    </td>
                </tr>
            `;
        };

        const renderMostSharedGamesRow = () => {
            if (topSharedGames.length === 0) return '';

            const thumbnails = topSharedGames.map(item => renderGameThumbnailOnly(item.game)).join('');
            const rankLabels = ['1st', '2nd', '3rd'];

            return `
                <tr class="year-review-row year-review-row-clickable" data-detail="most-shared">
                    <td class="year-review-label-detail">
                        <span class="year-review-expand-icon">▶</span>
                        Top ${topSharedGames.length} most shared games:
                    </td>
                    <td class="year-review-value-detail">
                        <span class="top-games-thumbnails">${thumbnails}</span>
                    </td>
                </tr>
                <tr class="year-review-expanded-content" data-detail="most-shared" style="display: none;">
                    <td colspan="2">
                        <div class="year-review-games-list">
                            ${topSharedGames.map((item, index) => `
                                <div class="year-review-game-item">
                                    <span class="year-review-game-rank">${rankLabels[index]}</span>
                                    <span class="year-review-game-name">${renderGameNameWithThumbnail(item.game)}</span>
                                    <span class="year-review-game-value">${item.value} unique player${item.value !== 1 ? 's' : ''}</span>
                                </div>
                            `).join('')}
                        </div>
                    </td>
                </tr>
            `;
        };

        const renderMostTraveledGamesRow = () => {
            if (topTraveledGames.length === 0) return '';

            const thumbnails = topTraveledGames.map(item => renderGameThumbnailOnly(item.game)).join('');
            const rankLabels = ['1st', '2nd', '3rd'];

            return `
                <tr class="year-review-row year-review-row-clickable" data-detail="most-traveled">
                    <td class="year-review-label-detail">
                        <span class="year-review-expand-icon">▶</span>
                        Top ${topTraveledGames.length} most traveled games:
                    </td>
                    <td class="year-review-value-detail">
                        <span class="top-games-thumbnails">${thumbnails}</span>
                    </td>
                </tr>
                <tr class="year-review-expanded-content" data-detail="most-traveled" style="display: none;">
                    <td colspan="2">
                        <div class="year-review-games-list">
                            ${topTraveledGames.map((item, index) => `
                                <div class="year-review-game-item">
                                    <span class="year-review-game-rank">${rankLabels[index]}</span>
                                    <span class="year-review-game-name">${renderGameNameWithThumbnail(item.game)}</span>
                                    <span class="year-review-game-value">${item.value} location${item.value !== 1 ? 's' : ''}</span>
                                </div>
                            `).join('')}
                        </div>
                    </td>
                </tr>
            `;
        };

        const gameHighlightsSubsection = document.createElement('div');
        gameHighlightsSubsection.className = 'year-review-subsection';
        gameHighlightsSubsection.innerHTML = `
            <h3 class="year-review-subsection-heading">Game Highlights</h3>
            <table class="year-review-table">
                <tbody>
                    ${renderTopGamesRow('hours', topHours, formatHoursValue)}
                    ${renderTopGamesRow('sessions', topSessions, formatSessionsValue)}
                    ${renderTopGamesRow('plays', topPlays, formatPlaysValue)}
                    ${renderLongestPlaysRow()}
                    ${renderMostSharedGamesRow()}
                    ${renderMostTraveledGamesRow()}
                </tbody>
            </table>
        `;
        detailDiv.appendChild(gameHighlightsSubsection);
    }

    // Add Time & Activity subsection
    const timeAndActivity = statsCache.yearReview.timeAndActivity;
    if (timeAndActivity) {
        const formatMinutes = (minutes) => {
            if (minutes === null) return '-';
            const hrs = Math.floor(minutes / 60);
            const mins = Math.round(minutes % 60);
            if (hrs > 0) {
                return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
            }
            return `${mins}m`;
        };

        const timeActivitySubsection = document.createElement('div');
        timeActivitySubsection.className = 'year-review-subsection';

        let timeActivityRows = [];

        // Total days played
        timeActivityRows.push(`
            <tr class="year-review-row">
                <td class="year-review-label-detail">Total days played:</td>
                <td class="year-review-value-detail">${timeAndActivity.totalDays}</td>
            </tr>
        `);

        // Total play time
        timeActivityRows.push(`
            <tr class="year-review-row">
                <td class="year-review-label-detail">Total play time:</td>
                <td class="year-review-value-detail">${formatMinutes(timeAndActivity.totalMinutes)}</td>
            </tr>
        `);

        // Most unique games in one day
        if (timeAndActivity.mostGamesDay > 0) {
            // Get game names and play counts for the most games day
            const gamesPlayedThatDay = timeAndActivity.mostGamesDayGamesList
                .map(gameInfo => {
                    const game = gameData.games.find(g => g.id === gameInfo.gameId);
                    return {
                        game: game || null,
                        plays: gameInfo.playCount
                    };
                })
                .sort((a, b) => (a.game?.name || 'Unknown').localeCompare(b.game?.name || 'Unknown'));

            timeActivityRows.push(`
                <tr class="year-review-row year-review-row-clickable" data-detail="most-games-day">
                    <td class="year-review-label-detail">
                        <span class="year-review-expand-icon">▶</span>
                        Most unique games in one day:
                    </td>
                    <td class="year-review-value-detail">${timeAndActivity.mostGamesDay} games on <span class="nowrap-date">${formatDateWithWeekday(timeAndActivity.mostGamesDayDate)}</span></td>
                </tr>
                <tr class="year-review-expanded-content" data-detail="most-games-day" style="display: none;">
                    <td colspan="2">
                        <div class="year-review-games-list">
                            ${gamesPlayedThatDay.map(gameInfo => `
                                <div class="year-review-game-item">
                                    <span class="year-review-game-name">${gameInfo.game ? renderGameNameWithThumbnail(gameInfo.game) : 'Unknown'}</span>
                                    <span class="year-review-game-value">${gameInfo.plays} ${gameInfo.plays === 1 ? 'play' : 'plays'}</span>
                                </div>
                            `).join('')}
                        </div>
                    </td>
                </tr>
            `);
        }

        // Longest day
        if (timeAndActivity.longestDayMinutes !== null) {
            const longestDayGames = timeAndActivity.longestDayGamesList
                .map(gameInfo => {
                    const game = gameData.games.find(g => g.id === gameInfo.gameId);
                    return {
                        game: game || null,
                        minutes: gameInfo.minutes
                    };
                })
                .sort((a, b) => (a.game?.name || 'Unknown').localeCompare(b.game?.name || 'Unknown'));

            timeActivityRows.push(`
                <tr class="year-review-row year-review-row-clickable" data-detail="longest-day">
                    <td class="year-review-label-detail">
                        <span class="year-review-expand-icon">▶</span>
                        Longest total playtime in one day:
                    </td>
                    <td class="year-review-value-detail">${formatMinutes(timeAndActivity.longestDayMinutes)} on <span class="nowrap-date">${formatDateWithWeekday(timeAndActivity.longestDayDate)}</span></td>
                </tr>
                <tr class="year-review-expanded-content" data-detail="longest-day" style="display: none;">
                    <td colspan="2">
                        <div class="year-review-games-list">
                            ${longestDayGames.map(gameInfo => `
                                <div class="year-review-game-item">
                                    <span class="year-review-game-name">${gameInfo.game ? renderGameNameWithThumbnail(gameInfo.game) : 'Unknown'}</span>
                                    <span class="year-review-game-value">${formatMinutes(gameInfo.minutes)}</span>
                                </div>
                            `).join('')}
                        </div>
                    </td>
                </tr>
            `);
        }

        // Shortest day
        if (timeAndActivity.shortestDayMinutes !== null) {
            const shortestDayGames = timeAndActivity.shortestDayGamesList
                .map(gameInfo => {
                    const game = gameData.games.find(g => g.id === gameInfo.gameId);
                    return {
                        game: game || null,
                        minutes: gameInfo.minutes
                    };
                })
                .sort((a, b) => (a.game?.name || 'Unknown').localeCompare(b.game?.name || 'Unknown'));

            timeActivityRows.push(`
                <tr class="year-review-row year-review-row-clickable" data-detail="shortest-day">
                    <td class="year-review-label-detail">
                        <span class="year-review-expand-icon">▶</span>
                        Shortest total playtime in one day:
                    </td>
                    <td class="year-review-value-detail">${formatMinutes(timeAndActivity.shortestDayMinutes)} on <span class="nowrap-date">${formatDateWithWeekday(timeAndActivity.shortestDayDate)}</span></td>
                </tr>
                <tr class="year-review-expanded-content" data-detail="shortest-day" style="display: none;">
                    <td colspan="2">
                        <div class="year-review-games-list">
                            ${shortestDayGames.map(gameInfo => `
                                <div class="year-review-game-item">
                                    <span class="year-review-game-name">${gameInfo.game ? renderGameNameWithThumbnail(gameInfo.game) : 'Unknown'}</span>
                                    <span class="year-review-game-value">${formatMinutes(gameInfo.minutes)}</span>
                                </div>
                            `).join('')}
                        </div>
                    </td>
                </tr>
            `);
        }

        // Longest streak
        if (timeAndActivity.longestStreak > 0) {
            let streakValue;
            if (timeAndActivity.longestStreak === 1) {
                streakValue = `1 day (${formatDateShort(timeAndActivity.longestStreakStart)})`;
            } else {
                streakValue = `${timeAndActivity.longestStreak} days (${formatDateShort(timeAndActivity.longestStreakStart)} to ${formatDateShort(timeAndActivity.longestStreakEnd)})`;
            }
            timeActivityRows.push(`
                <tr class="year-review-row">
                    <td class="year-review-label-detail">Longest play streak (consecutive days):</td>
                    <td class="year-review-value-detail">${streakValue}</td>
                </tr>
            `);
        }

        // Longest dry spell
        if (timeAndActivity.longestDrySpell > 0) {
            let drySpellValue;
            if (timeAndActivity.longestDrySpell === 1) {
                drySpellValue = `1 day (${formatDateShort(timeAndActivity.longestDrySpellStart)})`;
            } else {
                drySpellValue = `${timeAndActivity.longestDrySpell} days (${formatDateShort(timeAndActivity.longestDrySpellStart)} to ${formatDateShort(timeAndActivity.longestDrySpellEnd)})`;
            }
            timeActivityRows.push(`
                <tr class="year-review-row">
                    <td class="year-review-label-detail">Longest dry spell (days between sessions):</td>
                    <td class="year-review-value-detail">${drySpellValue}</td>
                </tr>
            `);
        }

        timeActivitySubsection.innerHTML = `
            <h3 class="year-review-subsection-heading">Time & Activity</h3>
            <table class="year-review-table">
                <tbody>
                    ${timeActivityRows.join('')}
                </tbody>
            </table>
        `;

        detailDiv.appendChild(timeActivitySubsection);
    }

    // Add Logging Achievements subsection
    const loggingAchievements = statsCache.yearReview.loggingAchievements;
    if (loggingAchievements && loggingAchievements.length > 0) {
        const formatThreshold = (threshold) => {
            return threshold.toLocaleString();
        };

        const getMetricLabel = (metric) => {
            switch (metric) {
                case 'hours': return 'Hour';
                case 'sessions': return 'Session';
                case 'plays': return 'Play';
                default: return metric;
            }
        };

        const achievementRows = loggingAchievements.map(achievement => {
            const metricLabel = getMetricLabel(achievement.metric);
            const formattedThreshold = formatThreshold(achievement.threshold);
            const formattedDate = formatDateWithWeekday(achievement.date);

            return `
                <tr class="year-review-row" data-metric="${achievement.metric}">
                    <td class="year-review-label-detail">
                        Logged ${formattedThreshold}th <span class="metric-name ${achievement.metric}">${metricLabel}</span>
                    </td>
                    <td class="year-review-value-detail">${formattedDate}</td>
                </tr>
            `;
        }).join('');

        const loggingAchievementsSubsection = document.createElement('div');
        loggingAchievementsSubsection.className = 'year-review-subsection';
        loggingAchievementsSubsection.innerHTML = `
            <h3 class="year-review-subsection-heading">Logging Achievements</h3>
            <table class="year-review-table">
                <tbody>
                    ${achievementRows}
                </tbody>
            </table>
        `;
        detailDiv.appendChild(loggingAchievementsSubsection);
    }

    // Build milestone rows dynamically - only show rows with increase > 0
    const milestoneRows = [];
    const milestoneDefinitions = [
        { type: Milestone.FIVES, label: 'fives', range: '5-9', metric: 'hours', unit: 'hours' },
        { type: Milestone.DIMES, label: 'dimes', range: '10-24', metric: 'hours', unit: 'hours' },
        { type: Milestone.QUARTERS, label: 'quarters', range: '25-99', metric: 'hours', unit: 'hours' },
        { type: Milestone.CENTURIES, label: 'centuries', range: '100 or more', metric: 'hours', unit: 'hours' },
        { type: Milestone.FIVES, label: 'fives', range: '5-9', metric: 'sessions', unit: 'days' },
        { type: Milestone.DIMES, label: 'dimes', range: '10-24', metric: 'sessions', unit: 'days' },
        { type: Milestone.QUARTERS, label: 'quarters', range: '25-99', metric: 'sessions', unit: 'days' },
        { type: Milestone.CENTURIES, label: 'centuries', range: '100 or more', metric: 'sessions', unit: 'days' },
        { type: Milestone.FIVES, label: 'fives', range: '5-9', metric: 'plays', unit: 'times' },
        { type: Milestone.DIMES, label: 'dimes', range: '10-24', metric: 'plays', unit: 'times' },
        { type: Milestone.QUARTERS, label: 'quarters', range: '25-99', metric: 'plays', unit: 'times' },
        { type: Milestone.CENTURIES, label: 'centuries', range: '100 or more', metric: 'plays', unit: 'times' },
    ];

    milestoneDefinitions.forEach((def) => {
        const increaseKey = `${def.label}${def.metric.charAt(0).toUpperCase() + def.metric.slice(1)}Increase`;
        const currentKey = `${def.label}${def.metric.charAt(0).toUpperCase() + def.metric.slice(1)}Current`;
        const previousKey = `${def.label}${def.metric.charAt(0).toUpperCase() + def.metric.slice(1)}Previous`;

        const increase = statsCache.yearReview[increaseKey];
        const current = statsCache.yearReview[currentKey];
        const previous = statsCache.yearReview[previousKey];

        // Only show rows where increase > 0
        if (increase > 0) {
            const rowId = `milestone-${def.label}-${def.metric}`;
            const displayValue = increase === 0
                ? `+0 (stayed at ${current})`
                : `+${increase} (from ${previous} to ${current})`;

            // Get new milestone games
            const newGames = getNewMilestoneGames(gameData.games, gameData.plays, currentYear, def.metric, def.type);

            // Calculate graduated count (games that entered but left the range)
            const entered = newGames.length;
            const graduated = entered - increase;

            // Calculate skipped count (games that jumped over this milestone entirely)
            const skipped = getSkippedMilestoneCount(gameData.games, gameData.plays, currentYear, def.metric, def.type);

            // Build summary text for the expanded section
            let summaryText = '';
            if (newGames.length > 0 || skipped > 0) {
                const parts = [];
                if (entered > 0) parts.push(`${entered} entered`);
                if (graduated > 0) parts.push(`${graduated} graduated`);
                if (skipped > 0) parts.push(`${skipped} skipped`);
                summaryText = `<div class="year-review-milestone-summary">${parts.join(' • ')}</div>`;
            }

            milestoneRows.push(`
                <tr class="year-review-row year-review-row-clickable" data-milestone="${rowId}" data-metric="${def.metric}">
                    <td class="year-review-label-detail">
                        <span class="year-review-expand-icon">▶</span>
                        Increase in ${def.label} by <span class="metric-name ${def.metric}">${def.metric}</span> (played ${def.range} ${def.unit} total):
                    </td>
                    <td class="year-review-value-detail">${displayValue}</td>
                </tr>
                <tr class="year-review-expanded-content" data-milestone="${rowId}" data-metric="${def.metric}" style="display: none;">
                    <td colspan="2">
                        <div class="year-review-games-list">
                            ${summaryText}
                            ${newGames.length > 0
                                ? newGames.map(item => {
                                    const totalValue = def.metric === 'hours' ? item.value.toFixed(1) : item.value;
                                    const thisYearValue = def.metric === 'hours' ? item.thisYearValue.toFixed(1) : item.thisYearValue;
                                    return `
                                        <div class="year-review-game-item">
                                            <span class="year-review-game-name">${renderGameNameWithThumbnail(item.game)}</span>
                                            <span class="year-review-game-value">${totalValue} ${def.unit} total (${thisYearValue} this year)</span>
                                        </div>
                                    `;
                                }).join('')
                                : '<div class="year-review-no-games">No new games reached this milestone</div>'
                            }
                        </div>
                    </td>
                </tr>
            `);
        }
    });

    // Add milestones subsection if there are any rows to show
    if (milestoneRows.length > 0) {
        const milestonesSubsection = document.createElement('div');
        milestonesSubsection.className = 'year-review-subsection';
        milestonesSubsection.innerHTML = `
            <h3 class="year-review-subsection-heading">New Milestones Reached</h3>
            <table class="year-review-table">
                <tbody>
                    ${milestoneRows.join('')}
                </tbody>
            </table>
        `;
        detailDiv.appendChild(milestonesSubsection);
    }

    // Build value club rows (only if hidden features enabled)
    if (isHiddenEnabled()) {
        const valueClubRows = [];
        const metricUnits = { hours: 'hour', sessions: 'session', plays: 'play' };

        // Generate definitions dynamically from ValueClub.values
        ValueClub.values.forEach(tierValue => {
            [Metric.HOURS, Metric.SESSIONS, Metric.PLAYS].forEach(metric => {
                const label = formatCostLabel(tierValue);
                const unit = metricUnits[metric];

                const increase = statsCache.yearReview[`valueClub_${tierValue}_${metric}_increase`];
                const current = statsCache.yearReview[`valueClub_${tierValue}_${metric}_current`];
                const previous = statsCache.yearReview[`valueClub_${tierValue}_${metric}_previous`];

                // Only show rows where increase > 0
                if (increase > 0) {
                    const rowId = `value-club-${tierValue}-${metric}`;
                    const displayValue = `+${increase} (from ${previous} to ${current})`;

                    // Get new value club games
                    const newGames = getNewValueClubGames(gameData.games, gameData.plays, currentYear, metric, tierValue);

                    // Calculate graduated count (games that entered but went to a lower threshold)
                    const entered = newGames.length;
                    const graduated = entered - increase;

                    // Calculate skipped count using tier collection's next threshold
                    const { nextThreshold } = ValueClub.getThreshold(tierValue);
                    const skipped = getSkippedValueClubCount(gameData.games, gameData.plays, currentYear, metric, tierValue, nextThreshold);

                    // Build summary text for the expanded section
                    let summaryText = '';
                    if (newGames.length > 0 || skipped > 0) {
                        const parts = [];
                        if (entered > 0) parts.push(`${entered} entered`);
                        if (graduated > 0) parts.push(`${graduated} graduated`);
                        if (skipped > 0) parts.push(`${skipped} skipped`);
                        summaryText = `<div class="year-review-milestone-summary">${parts.join(' • ')}</div>`;
                    }

                    valueClubRows.push(`
                        <tr class="year-review-row year-review-row-clickable" data-value-club="${rowId}" data-metric="${metric}">
                            <td class="year-review-label-detail">
                                <span class="year-review-expand-icon">▶</span>
                                Increase in ${label}/<span class="metric-name ${metric}">${unit}</span> club:
                            </td>
                            <td class="year-review-value-detail">${displayValue}</td>
                        </tr>
                        <tr class="year-review-expanded-content" data-value-club="${rowId}" data-metric="${metric}" style="display: none;">
                            <td colspan="2">
                                <div class="year-review-games-list">
                                    ${summaryText}
                                    ${newGames.length > 0
                                        ? newGames.map(item => {
                                            const metricValue = metric === 'hours' ? item.metricValue.toFixed(1) : item.metricValue;
                                            const thisYearValue = metric === 'hours' ? item.thisYearMetricValue.toFixed(1) : item.thisYearMetricValue;
                                            return `
                                                <div class="year-review-game-item">
                                                    <span class="year-review-game-name">${renderGameNameWithThumbnail(item.game)}</span>
                                                    <span class="year-review-game-value">$${item.costPerMetric.toFixed(2)}/${unit} (${metricValue} ${unit}s total, ${thisYearValue} this year)</span>
                                                </div>
                                            `;
                                        }).join('')
                                        : '<div class="year-review-no-games">No new games joined this value club</div>'
                                    }
                                </div>
                            </td>
                        </tr>
                    `);
                }
            });
        });

        // Add value club subsection if there are any rows to show
        if (valueClubRows.length > 0) {
            const valueClubSubsection = document.createElement('div');
            valueClubSubsection.className = 'year-review-subsection';
            valueClubSubsection.innerHTML = `
                <h3 class="year-review-subsection-heading">Increasing Value Club Membership</h3>
                <table class="year-review-table">
                    <tbody>
                        ${valueClubRows.join('')}
                    </tbody>
                </table>
            `;
            detailDiv.appendChild(valueClubSubsection);
        }
    }

    // Add Shelf of Shame subsection
    const shameChangesForSubsection = statsCache.yearReview.shelfOfShameChanges;
    if (shameChangesForSubsection && (shameChangesForSubsection.exitedShameGames.length > 0 || shameChangesForSubsection.newShameGames.length > 0)) {
        const shelfOfShameSubsection = document.createElement('div');
        shelfOfShameSubsection.className = 'year-review-subsection';

        let shameRows = '';

        // "Games cleared from the shelf" row (show positive first)
        if (shameChangesForSubsection.exitedShameGames.length > 0) {
            const formatClearedGameValue = (item) => {
                switch (currentBaseMetric) {
                    case Metric.SESSIONS:
                        return `${item.sessions} session${item.sessions !== 1 ? 's' : ''}`;
                    case Metric.PLAYS:
                        return `${item.plays} play${item.plays !== 1 ? 's' : ''}`;
                    case Metric.HOURS:
                    default:
                        return `${item.hours.toFixed(1)} hours`;
                }
            };
            shameRows += `
                <tr class="year-review-row year-review-row-clickable" data-shame="exited">
                    <td class="year-review-label-detail">
                        <span class="year-review-expand-icon">▶</span>
                        Games cleared from the shelf:
                    </td>
                    <td class="year-review-value-detail">${shameChangesForSubsection.exitedShameGames.length}</td>
                </tr>
                <tr class="year-review-expanded-content" data-shame="exited" style="display: none;">
                    <td colspan="2">
                        <div class="year-review-games-list">
                            ${shameChangesForSubsection.exitedShameGames.map(item => `
                                <div class="year-review-game-item">
                                    <span class="year-review-game-name">${renderGameNameWithThumbnail(item.game)}</span>
                                    <span class="year-review-game-value">${formatClearedGameValue(item)}</span>
                                </div>
                            `).join('')}
                        </div>
                    </td>
                </tr>
            `;
        }

        // "Games added to the shelf" row
        if (shameChangesForSubsection.newShameGames.length > 0) {
            shameRows += `
                <tr class="year-review-row year-review-row-clickable" data-shame="new">
                    <td class="year-review-label-detail">
                        <span class="year-review-expand-icon">▶</span>
                        Games added to the shelf:
                    </td>
                    <td class="year-review-value-detail">${shameChangesForSubsection.newShameGames.length}</td>
                </tr>
                <tr class="year-review-expanded-content" data-shame="new" style="display: none;">
                    <td colspan="2">
                        <div class="year-review-games-list">
                            ${shameChangesForSubsection.newShameGames.map(item => `
                                <div class="year-review-game-item">
                                    <span class="year-review-game-name">${renderGameNameWithThumbnail(item.game)}</span>
                                </div>
                            `).join('')}
                        </div>
                    </td>
                </tr>
            `;
        }

        shelfOfShameSubsection.innerHTML = `
            <h3 class="year-review-subsection-heading">Shelf of Shame</h3>
            <table class="year-review-table">
                <tbody>
                    ${shameRows}
                </tbody>
            </table>
        `;
        detailDiv.appendChild(shelfOfShameSubsection);
    }

    // Add click handlers for expandable rows
    const clickableRows = detailDiv.querySelectorAll('.year-review-row-clickable');
    clickableRows.forEach(row => {
        row.addEventListener('click', (e) => {
            // Ignore clicks on thumbnails (they open the image modal)
            if (e.target.closest('.top-games-thumbnails')) {
                return;
            }

            // The expanded content row always immediately follows the clickable row
            const expandedRow = row.nextElementSibling;
            if (!expandedRow || !expandedRow.classList.contains('year-review-expanded-content')) {
                return;
            }

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
 * Apply metric filter to Year in Review rows
 * @param {HTMLElement} detailDiv - The year review detail container
 * @param {boolean} showAll - If true, show all metrics; if false, filter to currentBaseMetric
 */
function applyYearReviewMetricFilter(detailDiv, showAll) {
    const metricRows = detailDiv.querySelectorAll('[data-metric]');
    metricRows.forEach(row => {
        const rowMetric = row.dataset.metric;
        const shouldShow = showAll || rowMetric === currentBaseMetric;
        const isExpandedContent = row.classList.contains('year-review-expanded-content');

        if (shouldShow) {
            // Expanded content rows should stay hidden until clicked
            // Regular rows should be visible
            if (!isExpandedContent) {
                row.style.display = '';
            }
        } else {
            row.style.display = 'none';

            // If hiding a clickable row, also collapse its icon
            if (row.classList.contains('year-review-row-clickable')) {
                const icon = row.querySelector('.year-review-expand-icon');
                if (icon) {
                    icon.textContent = '▶';
                }
            }
        }
    });
}

/**
 * Helper function to create a game table
 */
function createGameTable(container, games, columns, filterYear = null) {
    const table = document.createElement('table');

    const headerRow = columns.map(col => {
        const sortClass = col === 'Name' ? ' class="sorted-asc"' : '';
        return `<th${sortClass}>${col}</th>`;
    }).join('');

    const rows = games.map(game => {
        const cells = [];
        columns.forEach(col => {
            switch(col) {
                case 'Name':
                    cells.push(`<td>${renderGameNameWithThumbnail(game)}</td>`);
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
 * Load state from URL parameters (permalink)
 */
function loadFromPermalink() {
    const urlParams = new URLSearchParams(window.location.search);
    const yearParam = urlParams.get('year');
    const baseMetricParam = urlParams.get('baseMetric');
    const statParam = urlParams.get('stat');
    const modalParam = urlParams.get('modal');
    const showAllMetricsParam = urlParams.get('showAllMetrics');

    // Initialize showAllYearReviewMetrics from URL before early return check
    if (showAllMetricsParam === 'true') {
        showAllYearReviewMetrics = true;
    }

    if (!yearParam && !baseMetricParam && !statParam && !modalParam) {
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

    // Open the specified stat or modal after a short delay to ensure stats are loaded
    if (statParam || modalParam) {
        setTimeout(() => {
            // Open modal if specified
            if (modalParam === 'h-index') {
                showHIndexModal();
            } else if (modalParam === 'people-h-index') {
                showPeopleHIndexModal();
            }

            // Open stat detail if specified
            if (statParam) {
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
async function copyPermalink() {
    const permalink = window.location.href;
    const button = document.getElementById('permalink-btn');

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
    }

    // Add showAllMetrics param if toggle is enabled (persists even when section is closed)
    if (showAllYearReviewMetrics) {
        params.set('showAllMetrics', 'true');
    }

    // Add modal parameter if h-index modal is open
    const modal = document.getElementById('h-index-modal');
    if (modal && modal.style.display === 'flex') {
        params.set('modal', 'h-index');
    }

    // Add modal parameter if people-h-index modal is open
    const peopleModal = document.getElementById('people-h-index-modal');
    if (peopleModal && peopleModal.style.display === 'flex') {
        params.set('modal', 'people-h-index');
    }

    // Update the URL without reloading the page
    const newURL = params.toString() ? `${url.pathname}?${params.toString()}` : url.pathname;
    window.history.replaceState({}, '', newURL);
}

/**
 * Toggle hidden features flag in localStorage with visual feedback
 * @param {HTMLElement} element - Element to color based on flag state
 */
function toggleHiddenFeatures(element) {
    const current = localStorage.getItem('hiddenFeatures') === 'true';
    const newValue = !current;
    localStorage.setItem('hiddenFeatures', newValue);

    // Persistent color indicates flag state
    element.style.color = newValue ? 'var(--color-primary)' : '';
}

/**
 * Check if hidden features are enabled
 * @returns {boolean} True if hidden features are enabled
 */
function isHiddenEnabled() {
    return localStorage.getItem('hiddenFeatures') === 'true';
}

/**
 * Update footer with generation timestamp
 */
function updateFooter() {
    if (gameData && gameData.generatedAt) {
        const date = new Date(gameData.generatedAt);
        const lastUpdatedEl = document.getElementById('last-updated');
        lastUpdatedEl.textContent =
            `Last updated: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;

        // Set initial color if hidden features already enabled
        if (isHiddenEnabled()) {
            lastUpdatedEl.style.color = 'var(--color-primary)';
        }

        // Hidden feature flag activation - 5 taps to toggle
        let tapCount = 0;
        let tapTimeout;
        lastUpdatedEl.addEventListener('click', () => {
            tapCount++;
            clearTimeout(tapTimeout);
            if (tapCount >= 5) {
                toggleHiddenFeatures(lastUpdatedEl);
                tapCount = 0;
            } else {
                tapTimeout = setTimeout(() => tapCount = 0, 1500);
            }
        });
    }
}

/**
 * Update the scroll margin CSS variable based on current header height
 */
function updateHeaderScrollMargin() {
    const header = document.querySelector('header');
    requestAnimationFrame(() => {
        const height = header.offsetHeight;
        document.documentElement.style.setProperty('--header-scroll-margin', `${height + 4}px`);
    });
}

/**
 * Setup sticky header shadow effect on scroll
 */
function setupStickyHeader() {
    const header = document.querySelector('header');

    // Capture initial height for scroll progress calculation and scroll margin
    let initialHeight = 0;
    requestAnimationFrame(() => {
        initialHeight = header.offsetHeight;
        updateHeaderScrollMargin();
    });

    window.addEventListener('scroll', () => {
        if (initialHeight === 0) return;

        const scrollY = window.scrollY;
        const scrollProgress = Math.min(scrollY / initialHeight, 1); // 0 to 1

        // Only animate shadow on scroll (header is already compact)
        const shadowBlur = 2 + (scrollProgress * 2); // 2px to 4px
        const shadowAlpha = 0.1 + (scrollProgress * 0.05); // 0.1 to 0.15

        header.style.boxShadow = `0 ${shadowBlur}px ${shadowBlur * 2}px rgba(0,0,0,${shadowAlpha})`;
    }, { passive: true });
}
