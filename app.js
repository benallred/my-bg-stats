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
  getCumulativeMilestoneCount,
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
} from './stats.js';

import { formatApproximateHours, formatDateShort, formatDateWithWeekday, formatLargeNumber } from './formatting.js';

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
let currentlyOpenDiagnosticType = null;
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
            fivesHoursCurrent: getCumulativeMilestoneCount(gameData.games, gameData.plays, currentYear, Metric.HOURS, Milestone.FIVES),
            dimesHoursCurrent: getCumulativeMilestoneCount(gameData.games, gameData.plays, currentYear, Metric.HOURS, Milestone.DIMES),
            quartersHoursCurrent: getCumulativeMilestoneCount(gameData.games, gameData.plays, currentYear, Metric.HOURS, Milestone.QUARTERS),
            centuriesHoursCurrent: getCumulativeMilestoneCount(gameData.games, gameData.plays, currentYear, Metric.HOURS, Milestone.CENTURIES),
            fivesHoursPrevious: getCumulativeMilestoneCount(gameData.games, gameData.plays, currentYear - 1, Metric.HOURS, Milestone.FIVES),
            dimesHoursPrevious: getCumulativeMilestoneCount(gameData.games, gameData.plays, currentYear - 1, Metric.HOURS, Milestone.DIMES),
            quartersHoursPrevious: getCumulativeMilestoneCount(gameData.games, gameData.plays, currentYear - 1, Metric.HOURS, Milestone.QUARTERS),
            centuriesHoursPrevious: getCumulativeMilestoneCount(gameData.games, gameData.plays, currentYear - 1, Metric.HOURS, Milestone.CENTURIES),

            // Milestone increases - sessions
            fivesSessionsIncrease: calculateMilestoneIncrease(gameData.games, gameData.plays, currentYear, Metric.SESSIONS, Milestone.FIVES),
            dimesSessionsIncrease: calculateMilestoneIncrease(gameData.games, gameData.plays, currentYear, Metric.SESSIONS, Milestone.DIMES),
            quartersSessionsIncrease: calculateMilestoneIncrease(gameData.games, gameData.plays, currentYear, Metric.SESSIONS, Milestone.QUARTERS),
            centuriesSessionsIncrease: calculateMilestoneIncrease(gameData.games, gameData.plays, currentYear, Metric.SESSIONS, Milestone.CENTURIES),
            fivesSessionsCurrent: getCumulativeMilestoneCount(gameData.games, gameData.plays, currentYear, Metric.SESSIONS, Milestone.FIVES),
            dimesSessionsCurrent: getCumulativeMilestoneCount(gameData.games, gameData.plays, currentYear, Metric.SESSIONS, Milestone.DIMES),
            quartersSessionsCurrent: getCumulativeMilestoneCount(gameData.games, gameData.plays, currentYear, Metric.SESSIONS, Milestone.QUARTERS),
            centuriesSessionsCurrent: getCumulativeMilestoneCount(gameData.games, gameData.plays, currentYear, Metric.SESSIONS, Milestone.CENTURIES),
            fivesSessionsPrevious: getCumulativeMilestoneCount(gameData.games, gameData.plays, currentYear - 1, Metric.SESSIONS, Milestone.FIVES),
            dimesSessionsPrevious: getCumulativeMilestoneCount(gameData.games, gameData.plays, currentYear - 1, Metric.SESSIONS, Milestone.DIMES),
            quartersSessionsPrevious: getCumulativeMilestoneCount(gameData.games, gameData.plays, currentYear - 1, Metric.SESSIONS, Milestone.QUARTERS),
            centuriesSessionsPrevious: getCumulativeMilestoneCount(gameData.games, gameData.plays, currentYear - 1, Metric.SESSIONS, Milestone.CENTURIES),

            // Milestone increases - plays
            fivesPlaysIncrease: calculateMilestoneIncrease(gameData.games, gameData.plays, currentYear, Metric.PLAYS, Milestone.FIVES),
            dimesPlaysIncrease: calculateMilestoneIncrease(gameData.games, gameData.plays, currentYear, Metric.PLAYS, Milestone.DIMES),
            quartersPlaysIncrease: calculateMilestoneIncrease(gameData.games, gameData.plays, currentYear, Metric.PLAYS, Milestone.QUARTERS),
            centuriesPlaysIncrease: calculateMilestoneIncrease(gameData.games, gameData.plays, currentYear, Metric.PLAYS, Milestone.CENTURIES),
            fivesPlaysCurrent: getCumulativeMilestoneCount(gameData.games, gameData.plays, currentYear, Metric.PLAYS, Milestone.FIVES),
            dimesPlaysCurrent: getCumulativeMilestoneCount(gameData.games, gameData.plays, currentYear, Metric.PLAYS, Milestone.DIMES),
            quartersPlaysCurrent: getCumulativeMilestoneCount(gameData.games, gameData.plays, currentYear, Metric.PLAYS, Milestone.QUARTERS),
            centuriesPlaysCurrent: getCumulativeMilestoneCount(gameData.games, gameData.plays, currentYear, Metric.PLAYS, Milestone.CENTURIES),
            fivesPlaysPrevious: getCumulativeMilestoneCount(gameData.games, gameData.plays, currentYear - 1, Metric.PLAYS, Milestone.FIVES),
            dimesPlaysPrevious: getCumulativeMilestoneCount(gameData.games, gameData.plays, currentYear - 1, Metric.PLAYS, Milestone.DIMES),
            quartersPlaysPrevious: getCumulativeMilestoneCount(gameData.games, gameData.plays, currentYear - 1, Metric.PLAYS, Milestone.QUARTERS),
            centuriesPlaysPrevious: getCumulativeMilestoneCount(gameData.games, gameData.plays, currentYear - 1, Metric.PLAYS, Milestone.CENTURIES),

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

            // Top games by unique locations (most travelled)
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
    updateYearInReview();
}

/**
 * Update H-Index statistics
 */
function updateHIndexStats() {
    const hIndexValue = getCurrentHIndex();
    document.querySelector('#h-index .stat-value').textContent = hIndexValue;

    // Update People H-Index
    document.querySelector('#people-h-index .stat-value').textContent = statsCache.peopleHIndex;
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
    const cumulativeFives = milestones.fives.length + milestones.dimes.length + milestones.quarters.length + milestones.centuries.length;
    const cumulativeDimes = milestones.dimes.length + milestones.quarters.length + milestones.centuries.length;
    const cumulativeQuarters = milestones.quarters.length + milestones.centuries.length;

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
    document.querySelector('#unique-games-played .stat-value').textContent = statsCache.gamesPlayedData.total;
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
 * Update Social & Locations section
 */
function updateSocialLocationStats() {
    const playerStats = statsCache.playerStats;
    const locationStats = statsCache.locationStats;
    const soloGameStats = statsCache.soloGameStats;

    // Update Players card
    document.querySelector('#players-card .stat-value').textContent = `> ${playerStats.uniquePlayerCount}`;

    // Update Solo card based on current metric
    const soloCard = document.getElementById('solo-card');
    const soloValue = soloCard.querySelector('.stat-value');
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
    document.querySelector('#locations-card .stat-value').textContent = locationStats.locationCount;
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

    // Update missing price paid card
    const missingPriceCard = document.querySelector('[data-stat="missing-price-paid"]');
    missingPriceCard.querySelector('.stat-value').textContent = statsCache.missingPricePaidGames.length;
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
 * Show h-index info modal
 * Updates content based on current base metric selection
 */
function showHIndexModal() {
    const modal = document.getElementById('h-index-modal');
    const exampleDiv = document.getElementById('h-index-modal-example');

    // Get current base metric
    const baseMetric = document.getElementById('base-metric-select').value;

    // Generate metric-specific example text
    let exampleText = '';
    let improveText = '';
    switch (baseMetric) {
        case 'sessions':
            exampleText = 'For example, if your sessions h-index is <strong>8</strong>, you have at least <strong>8 games</strong> that you\'ve played on <strong>8 or more different days</strong>.';
            improveText = 'To increase it to <strong>9</strong>, you need <strong>1 more game</strong> with 9+ sessions (breadth) AND <strong>1 more session each</strong> for your existing 8 games (depth).';
            break;
        case 'plays':
            exampleText = 'For example, if your plays h-index is <strong>12</strong>, you have at least <strong>12 games</strong> that you\'ve played <strong>12 or more times</strong>.';
            improveText = 'To increase it to <strong>13</strong>, you need <strong>1 more game</strong> with 13+ plays (breadth) AND <strong>1 more play each</strong> for your existing 12 games (depth).';
            break;
        case 'hours':
        default:
            exampleText = 'For example, if your hours h-index is <strong>5</strong>, you have at least <strong>5 games</strong> that you\'ve played for <strong>5 or more hours</strong> each.';
            improveText = 'To increase it to <strong>6</strong>, you need <strong>1 more game</strong> with 6+ hours (breadth) AND <strong>1 more hour each</strong> for your existing 5 games (depth).';
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
        getSummary: (statsCache) => ({
            mainValue: getCurrentHIndex()
        }),
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
        getSummary: (statsCache) => ({
            mainValue: statsCache.peopleHIndex
        }),
        render: (detailContent, statsCache) => {
            showPeopleHIndexBreakdown(detailContent, statsCache.peopleHIndex);
        }
    },
    'total-bgg-entries': {
        getTitle: (currentYear) => currentYear ? `BGG Entries Acquired in <span style="white-space: nowrap">(${currentYear})</span>` : 'BGG Entries <span style="white-space: nowrap">(All Time)</span>',
        getSummary: (statsCache) => ({
            mainValue: statsCache.totalBGGEntries
        }),
        render: (detailContent) => {
            showBGGEntries(detailContent);
        }
    },
    'total-games-owned': {
        getTitle: (currentYear) => currentYear ? `Games Acquired in <span style="white-space: nowrap">(${currentYear})</span>` : 'Games Owned <span style="white-space: nowrap">(All Time)</span>',
        getSummary: (statsCache) => ({
            mainValue: statsCache.totalGamesOwned
        }),
        render: (detailContent) => {
            showGamesOwned(detailContent);
        }
    },
    'total-expansions': {
        getTitle: (currentYear) => currentYear ? `Expansions Acquired in <span style="white-space: nowrap">(${currentYear})</span>` : 'Expansions <span style="white-space: nowrap">(All Time)</span>',
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
        getTitle: (currentYear) => currentYear ? `Unique Games Played in <span style="white-space: nowrap">(${currentYear})</span>` : 'Unique Games Played <span style="white-space: nowrap">(All Time)</span>',
        getSummary: (statsCache, currentYear) => {
            const substats = [
                { label: 'My games:', value: statsCache.gamesPlayedData.myGames },
                { label: 'Others\' games:', value: statsCache.gamesPlayedData.othersGames }
            ];
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
        getTitle: (currentYear) => currentYear ? `Play Time by Game in <span style="white-space: nowrap">(${currentYear})</span>` : 'Play Time by Game <span style="white-space: nowrap">(All Time)</span>',
        getSummary: (statsCache) => {
            const hours = formatLargeNumber(statsCache.playTimeData.totalHours);
            const days = formatLargeNumber(statsCache.playTimeData.totalHours / 24);
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
    'total-days-played': {
        getTitle: (currentYear) => currentYear ? `Days Played by Game in <span style="white-space: nowrap">(${currentYear})</span>` : 'Days Played by Game <span style="white-space: nowrap">(All Time)</span>',
        getSummary: (statsCache) => {
            const totalDays = statsCache.totalDaysPlayed;
            const dailyStats = statsCache.dailySessionStats;

            const formatTimePerDay = (minutes) => {
                if (minutes === null) return '-';
                if (minutes < 60) {
                    return `${Math.round(minutes)} minutes per gaming day`;
                }
                return `${(minutes / 60).toFixed(1)} hours per gaming day`;
            };

            return {
                mainValue: `${totalDays.toLocaleString()} days`,
                substats: [
                    { label: 'Median:', value: formatTimePerDay(dailyStats.medianMinutes) },
                    { label: 'Average:', value: formatTimePerDay(dailyStats.averageMinutes) }
                ]
            };
        },
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
            const yearText = currentYear ? `<span style="white-space: nowrap">(${currentYear})</span>` : '<span style="white-space: nowrap">(All Time)</span>';
            return `${label} ${yearText}`;
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
            const yearText = currentYear ? `<span style="white-space: nowrap">(${currentYear})</span>` : '<span style="white-space: nowrap">(All Time)</span>';
            return `${label} ${yearText}`;
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
            const yearText = currentYear ? `<span style="white-space: nowrap">(${currentYear})</span>` : '<span style="white-space: nowrap">(All Time)</span>';
            return `${label} ${yearText}`;
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
    'players': {
        getTitle: (currentYear) => currentYear ? `Players <span style="white-space: nowrap">(${currentYear})</span>` : 'Players <span style="white-space: nowrap">(All Time)</span>',
        getSummary: (statsCache) => ({
            mainValue: `> ${statsCache.playerStats.uniquePlayerCount}`
        }),
        render: (detailContent) => {
            showPlayersBreakdown(detailContent);
        }
    },
    'solo': {
        getTitle: (currentYear) => currentYear ? `Solo <span style="white-space: nowrap">(${currentYear})</span>` : 'Solo <span style="white-space: nowrap">(All Time)</span>',
        getSummary: (statsCache) => {
            const soloGameStats = statsCache.soloGameStats;
            let mainValue, percentValue;
            switch (currentBaseMetric) {
                case Metric.SESSIONS:
                    mainValue = soloGameStats.totalSoloSessions.toLocaleString() + ' sessions';
                    percentValue = soloGameStats.totalSessions > 0
                        ? ((soloGameStats.totalSoloSessions / soloGameStats.totalSessions) * 100).toFixed(1) + '%'
                        : '0%';
                    break;
                case Metric.PLAYS:
                    mainValue = soloGameStats.totalSoloPlays.toLocaleString() + ' plays';
                    percentValue = soloGameStats.totalPlays > 0
                        ? ((soloGameStats.totalSoloPlays / soloGameStats.totalPlays) * 100).toFixed(1) + '%'
                        : '0%';
                    break;
                case Metric.HOURS:
                default:
                    const soloHours = soloGameStats.totalSoloMinutes / 60;
                    mainValue = soloHours.toFixed(1) + ' hours';
                    percentValue = soloGameStats.totalMinutes > 0
                        ? ((soloGameStats.totalSoloMinutes / soloGameStats.totalMinutes) * 100).toFixed(1) + '%'
                        : '0%';
                    break;
            }
            return {
                mainValue: mainValue,
                substats: [
                    { label: '% of total:', value: percentValue },
                ]
            };
        },
        render: (detailContent) => {
            showSoloBreakdown(detailContent);
        }
    },
    'locations': {
        getTitle: (currentYear) => currentYear ? `Locations <span style="white-space: nowrap">(${currentYear})</span>` : 'Locations <span style="white-space: nowrap">(All Time)</span>',
        getSummary: (statsCache) => ({
            mainValue: statsCache.locationStats.locationCount
        }),
        render: (detailContent) => {
            showLocationsBreakdown(detailContent);
        }
    },
    'year-review': {
        getTitle: (currentYear) => `Gaming Year in Review <span style="white-space: nowrap">(${currentYear})</span>`,
        getSummary: () => ({
            mainValue: ''
        }),
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
    detailTitle.innerHTML = handler.getTitle(currentYear);

    // Get summary data and populate
    const summary = handler.getSummary(statsCache, currentYear);
    populateStatSummary(detailStatSummary, summary.mainValue, summary.substats);

    // Render content using handler
    handler.render(detailContent, statsCache, currentYear);

    // Call renderSummary if handler provides custom summary rendering
    if (handler.renderSummary) {
        handler.renderSummary(detailStatSummary, detailContent);
    }

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
                <th>Unique Players</th>
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
                <th>Name</th>
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
                <th>Name</th>
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
                <th>Plays</th>
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
                <th>Days Played</th>
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
                <th>Time Played</th>
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

    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Player</th>
                <th>Hours</th>
                <th>Sessions</th>
                <th>Plays</th>
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

    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Game</th>
                <th>Hours</th>
                <th>Sessions</th>
                <th>Plays</th>
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

    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Location</th>
                <th>Hours</th>
                <th>Sessions</th>
                <th>Plays</th>
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
                    gameHighlightParts.push(`by ${formatNaturalList(metricSpans)} was <em>${name}</em>`);
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
        summaryBullets.push(`Longest single play was ${formatApproximateHours(longestPlay.durationMin)} hours of <em>${longestPlay.game.name}</em>`);
    }

    // Biggest hit among new games (by sessions)
    const topNewGame = statsCache.yearReview.topNewToMeGameBySessions;
    if (topNewGame) {
        summaryBullets.push(`Biggest hit among new games was <em>${topNewGame.game.name}</em> (${topNewGame.sessions} <span class="metric-name sessions">sessions</span>)`);
    }

    // Returning favorite (top returning game by sessions)
    const topReturningGame = statsCache.yearReview.topReturningGameBySessions;
    if (topReturningGame) {
        summaryBullets.push(`Returning favorite was <em>${topReturningGame.game.name}</em> (${topReturningGame.sessions} <span class="metric-name sessions">sessions</span>)`);
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
                soloBullet += ` with the top solo game being <em>${topSoloGame.game.name}</em>`;
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
    const topTravelledGames = statsCache.yearReview.topGamesByUniqueLocations;

    if (topHours.length > 0 || topSessions.length > 0 || topPlays.length > 0 || longestSinglePlays.length > 0 || topSharedGames.length > 0 || topTravelledGames.length > 0) {
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

        const renderMostTravelledGamesRow = () => {
            if (topTravelledGames.length === 0) return '';

            const thumbnails = topTravelledGames.map(item => renderGameThumbnailOnly(item.game)).join('');
            const rankLabels = ['1st', '2nd', '3rd'];

            return `
                <tr class="year-review-row year-review-row-clickable" data-detail="most-travelled">
                    <td class="year-review-label-detail">
                        <span class="year-review-expand-icon">▶</span>
                        Top ${topTravelledGames.length} most travelled games:
                    </td>
                    <td class="year-review-value-detail">
                        <span class="top-games-thumbnails">${thumbnails}</span>
                    </td>
                </tr>
                <tr class="year-review-expanded-content" data-detail="most-travelled" style="display: none;">
                    <td colspan="2">
                        <div class="year-review-games-list">
                            ${topTravelledGames.map((item, index) => `
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
                    ${renderMostTravelledGamesRow()}
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
        { type: 'fives', label: 'fives', range: '5-9', metric: 'hours', unit: 'hours' },
        { type: 'dimes', label: 'dimes', range: '10-24', metric: 'hours', unit: 'hours' },
        { type: 'quarters', label: 'quarters', range: '25-99', metric: 'hours', unit: 'hours' },
        { type: 'centuries', label: 'centuries', range: '100 or more', metric: 'hours', unit: 'hours' },
        { type: 'fives', label: 'fives', range: '5-9', metric: 'sessions', unit: 'days' },
        { type: 'dimes', label: 'dimes', range: '10-24', metric: 'sessions', unit: 'days' },
        { type: 'quarters', label: 'quarters', range: '25-99', metric: 'sessions', unit: 'days' },
        { type: 'centuries', label: 'centuries', range: '100 or more', metric: 'sessions', unit: 'days' },
        { type: 'fives', label: 'fives', range: '5-9', metric: 'plays', unit: 'times' },
        { type: 'dimes', label: 'dimes', range: '10-24', metric: 'plays', unit: 'times' },
        { type: 'quarters', label: 'quarters', range: '25-99', metric: 'plays', unit: 'times' },
        { type: 'centuries', label: 'centuries', range: '100 or more', metric: 'plays', unit: 'times' }
    ];

    milestoneDefinitions.forEach((def) => {
        const increaseKey = `${def.type}${def.metric.charAt(0).toUpperCase() + def.metric.slice(1)}Increase`;
        const currentKey = `${def.type}${def.metric.charAt(0).toUpperCase() + def.metric.slice(1)}Current`;
        const previousKey = `${def.type}${def.metric.charAt(0).toUpperCase() + def.metric.slice(1)}Previous`;

        const increase = statsCache.yearReview[increaseKey];
        const current = statsCache.yearReview[currentKey];
        const previous = statsCache.yearReview[previousKey];

        // Only show rows where increase > 0
        if (increase > 0) {
            const rowId = `milestone-${def.type}-${def.metric}`;
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

    const headerRow = columns.map(col => `<th>${col}</th>`).join('');

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
        getTitle: (currentYear) => currentYear ? `Never Played (Acquired in <span style="white-space: nowrap">${currentYear}</span>)` : 'Never Played Games <span style="white-space: nowrap">(All Time)</span>',
        getSummary: (statsCache) => ({
            mainValue: statsCache.neverPlayedGames.length
        }),
        render: (detailContent, statsCache) => {
            createGameTable(detailContent, statsCache.neverPlayedGames, ['Name', 'Type', 'Year', 'Acquisition Date']);
        }
    },
    'missing-price-paid': {
        getTitle: () => 'Owned Base Games Missing Price Paid',
        getSummary: (statsCache) => ({
            mainValue: statsCache.missingPricePaidGames.length
        }),
        render: (detailContent, statsCache) => {
            createGameTable(detailContent, statsCache.missingPricePaidGames, ['Name', 'Year', 'Acquisition Date']);
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
    detailTitle.innerHTML = handler.getTitle(currentYear);

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
                // Check if it's a diagnostic stat
                const isDiagnostic = statParam === 'unknown-acquisition-dates' || statParam === 'never-played';

                if (isDiagnostic) {
                    showDiagnosticDetail(statParam);
                } else {
                    showDetailSection(statParam);
                }
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
