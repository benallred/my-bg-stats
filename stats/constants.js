/**
 * Constants for statistics calculations
 */

/**
 * Metric types for statistics calculations
 */
const Metric = {
  HOURS: 'hours',
  SESSIONS: 'sessions',
  PLAYS: 'plays',
};

/**
 * Create a tier collection with computed thresholds
 * @param {Object} tiers - Object mapping TIER_KEY to value (e.g., { FIVES: 5, DIMES: 10 })
 * @param {Object} options - { direction: 'ascending' | 'descending' }
 * @returns {Object} Tier collection with tier values and helper methods
 */
function createTierCollection(tiers, { direction }) {
  const entries = Object.entries(tiers);

  // Sort values by direction
  const values = entries.map(([, value]) => value)
    .sort((a, b) => direction === 'ascending' ? a - b : b - a);

  // Build the collection object
  const collection = {
    direction,
    values,
  };

  // Add named properties (e.g., collection.FIVES = 5)
  entries.forEach(([key, value]) => {
    collection[key] = value;
  });

  // getThreshold: get threshold and next threshold for a tier value
  collection.getThreshold = (tier) => {
    const idx = values.indexOf(tier);
    if (idx === -1) return { threshold: null, nextThreshold: null };
    return {
      threshold: tier,
      nextThreshold: values[idx + 1] ?? null,
    };
  };

  // isValueInTier: check if a value falls within a tier's range
  collection.isValueInTier = (value, tier) => {
    const { threshold, nextThreshold } = collection.getThreshold(tier);
    if (threshold === null) return false;

    if (direction === 'ascending') {
      return value >= threshold && (nextThreshold === null || value < nextThreshold);
    } else {
      return value <= threshold && (nextThreshold === null || value > nextThreshold);
    }
  };

  // isValueAtOrBeyondTier: check if value is at or beyond tier threshold (cumulative membership)
  collection.isValueAtOrBeyondTier = (value, tier) => {
    const { threshold } = collection.getThreshold(tier);
    if (threshold === null) return false;

    if (direction === 'ascending') {
      return value >= threshold;
    } else {
      return value <= threshold;
    }
  };

  // getTierForValue: find which tier a value falls into
  collection.getTierForValue = (value) => {
    for (const tier of values) {
      if (collection.isValueInTier(value, tier)) {
        return tier;
      }
    }
    return null;
  };

  // getNextTarget: find next tier value for a given current value
  collection.getNextTarget = (currentValue) => {
    for (const tier of values) {
      if (direction === 'ascending' ? tier > currentValue : tier < currentValue) {
        return tier;
      }
    }
    return null;
  };

  return collection;
}

/**
 * Milestone tiers for achievement tracking (ascending: higher values = higher tiers)
 */
const Milestone = createTierCollection({
  FIVES: 5,
  DIMES: 10,
  QUARTERS: 25,
  CENTURIES: 100,
}, { direction: 'ascending' });

/**
 * Cost club tiers (descending: lower cost per metric = better tier)
 */
const CostClub = createTierCollection({
  FIVE_DOLLAR: 5,
  TWO_FIFTY: 2.5,
  ONE_DOLLAR: 1,
  FIFTY_CENTS: 0.5,
}, { direction: 'descending' });

export { Metric, Milestone, CostClub };
