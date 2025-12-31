import { describe, test, expect } from 'vitest';
import { Metric, Milestone, ValueClub } from './constants.js';

describe('Metric Constants', () => {
  test('exports HOURS, SESSIONS, PLAYS', () => {
    expect(Metric.HOURS).toBe('hours');
    expect(Metric.SESSIONS).toBe('sessions');
    expect(Metric.PLAYS).toBe('plays');
  });
});

describe('Milestone Tier Collection', () => {
  test('exports FIVES, DIMES, QUARTERS, CENTURIES as numeric values', () => {
    expect(Milestone.FIVES).toBe(5);
    expect(Milestone.DIMES).toBe(10);
    expect(Milestone.QUARTERS).toBe(25);
    expect(Milestone.CENTURIES).toBe(100);
  });

  test('has ascending direction', () => {
    expect(Milestone.direction).toBe('ascending');
  });

  test('has values sorted ascending', () => {
    expect(Milestone.values).toEqual([5, 10, 25, 100]);
  });

  test('getThreshold returns threshold and nextThreshold', () => {
    expect(Milestone.getThreshold(5)).toEqual({ threshold: 5, nextThreshold: 10 });
    expect(Milestone.getThreshold(10)).toEqual({ threshold: 10, nextThreshold: 25 });
    expect(Milestone.getThreshold(25)).toEqual({ threshold: 25, nextThreshold: 100 });
    expect(Milestone.getThreshold(100)).toEqual({ threshold: 100, nextThreshold: null });
  });

  test('getThreshold returns null for unknown tier', () => {
    expect(Milestone.getThreshold(999)).toEqual({ threshold: null, nextThreshold: null });
  });

  test('isValueInTier returns true for values in range', () => {
    expect(Milestone.isValueInTier(5, 5)).toBe(true);
    expect(Milestone.isValueInTier(9, 5)).toBe(true);
    expect(Milestone.isValueInTier(10, 10)).toBe(true);
    expect(Milestone.isValueInTier(24, 10)).toBe(true);
    expect(Milestone.isValueInTier(100, 100)).toBe(true);
    expect(Milestone.isValueInTier(500, 100)).toBe(true);
  });

  test('isValueInTier returns false for values outside range', () => {
    expect(Milestone.isValueInTier(4, 5)).toBe(false);
    expect(Milestone.isValueInTier(10, 5)).toBe(false);
    expect(Milestone.isValueInTier(9, 10)).toBe(false);
    expect(Milestone.isValueInTier(25, 10)).toBe(false);
  });

  test('isValueInTier returns false for unknown tier', () => {
    expect(Milestone.isValueInTier(10, 999)).toBe(false);
  });

  test('isValueAtOrBeyondTier returns true for values at or above threshold (ascending)', () => {
    expect(Milestone.isValueAtOrBeyondTier(5, 5)).toBe(true);
    expect(Milestone.isValueAtOrBeyondTier(10, 5)).toBe(true);
    expect(Milestone.isValueAtOrBeyondTier(100, 5)).toBe(true);
    expect(Milestone.isValueAtOrBeyondTier(10, 10)).toBe(true);
    expect(Milestone.isValueAtOrBeyondTier(25, 10)).toBe(true);
  });

  test('isValueAtOrBeyondTier returns false for values below threshold (ascending)', () => {
    expect(Milestone.isValueAtOrBeyondTier(4, 5)).toBe(false);
    expect(Milestone.isValueAtOrBeyondTier(9, 10)).toBe(false);
  });

  test('isValueAtOrBeyondTier returns false for unknown tier', () => {
    expect(Milestone.isValueAtOrBeyondTier(10, 999)).toBe(false);
  });

  test('getTierForValue returns correct tier', () => {
    expect(Milestone.getTierForValue(5)).toBe(5);
    expect(Milestone.getTierForValue(9)).toBe(5);
    expect(Milestone.getTierForValue(10)).toBe(10);
    expect(Milestone.getTierForValue(24)).toBe(10);
    expect(Milestone.getTierForValue(25)).toBe(25);
    expect(Milestone.getTierForValue(99)).toBe(25);
    expect(Milestone.getTierForValue(100)).toBe(100);
    expect(Milestone.getTierForValue(1000)).toBe(100);
  });

  test('getTierForValue returns null for values below first tier', () => {
    expect(Milestone.getTierForValue(0)).toBeNull();
    expect(Milestone.getTierForValue(4)).toBeNull();
  });

  test('getNextTarget returns next tier value', () => {
    expect(Milestone.getNextTarget(0)).toBe(5);
    expect(Milestone.getNextTarget(4)).toBe(5);
    expect(Milestone.getNextTarget(5)).toBe(10);
    expect(Milestone.getNextTarget(9)).toBe(10);
    expect(Milestone.getNextTarget(10)).toBe(25);
    expect(Milestone.getNextTarget(99)).toBe(100);
  });

  test('getNextTarget returns null when past highest tier', () => {
    expect(Milestone.getNextTarget(100)).toBeNull();
    expect(Milestone.getNextTarget(500)).toBeNull();
  });
});

describe('ValueClub Tier Collection', () => {
  test('has descending direction', () => {
    expect(ValueClub.direction).toBe('descending');
  });

  test('has values sorted descending', () => {
    const values = ValueClub.values;
    for (let i = 0; i < values.length - 1; i++) {
      expect(values[i]).toBeGreaterThan(values[i + 1]);
    }
  });

  test('getThreshold returns threshold and nextThreshold for each tier', () => {
    ValueClub.values.forEach((tier, index) => {
      const result = ValueClub.getThreshold(tier);
      expect(result.threshold).toBe(tier);
      if (index < ValueClub.values.length - 1) {
        expect(result.nextThreshold).toBe(ValueClub.values[index + 1]);
      } else {
        expect(result.nextThreshold).toBeNull();
      }
    });
  });

  test('getThreshold returns null for unknown tier', () => {
    expect(ValueClub.getThreshold(999)).toEqual({ threshold: null, nextThreshold: null });
  });

  test('isValueInTier returns true for value at threshold', () => {
    ValueClub.values.forEach(tier => {
      expect(ValueClub.isValueInTier(tier, tier)).toBe(true);
    });
  });

  test('isValueInTier respects tier boundaries (descending)', () => {
    // For each tier (except last), values at next threshold belong to next tier
    ValueClub.values.forEach((tier) => {
      const { nextThreshold } = ValueClub.getThreshold(tier);
      if (nextThreshold !== null) {
        // Value exactly at nextThreshold belongs to next tier, not current
        expect(ValueClub.isValueInTier(nextThreshold, tier)).toBe(false);
        // Value just above nextThreshold belongs to current tier
        expect(ValueClub.isValueInTier(nextThreshold + 0.01, tier)).toBe(true);
      }
    });
  });

  test('isValueInTier returns false for values above first threshold', () => {
    const firstTier = ValueClub.values[0];
    expect(ValueClub.isValueInTier(firstTier + 1, firstTier)).toBe(false);
  });

  test('isValueInTier returns false for unknown tier', () => {
    expect(ValueClub.isValueInTier(3, 999)).toBe(false);
  });

  test('isValueAtOrBeyondTier returns true for values at or below threshold (descending)', () => {
    ValueClub.values.forEach(tier => {
      expect(ValueClub.isValueAtOrBeyondTier(tier, tier)).toBe(true);
      expect(ValueClub.isValueAtOrBeyondTier(tier - 0.1, tier)).toBe(true);
    });
  });

  test('isValueAtOrBeyondTier returns false for values above threshold (descending)', () => {
    ValueClub.values.forEach(tier => {
      expect(ValueClub.isValueAtOrBeyondTier(tier + 1, tier)).toBe(false);
    });
  });

  test('isValueAtOrBeyondTier returns false for unknown tier', () => {
    expect(ValueClub.isValueAtOrBeyondTier(3, 999)).toBe(false);
  });

  test('getTierForValue assigns values to correct tiers (descending)', () => {
    // Value at each threshold belongs to that tier
    ValueClub.values.forEach(tier => {
      expect(ValueClub.getTierForValue(tier)).toBe(tier);
    });
    // Value above first threshold returns null
    expect(ValueClub.getTierForValue(ValueClub.values[0] + 1)).toBeNull();
  });

  test('getNextTarget returns next lower tier value', () => {
    // Value above first tier targets first tier
    expect(ValueClub.getNextTarget(ValueClub.values[0] + 5)).toBe(ValueClub.values[0]);
    // Each tier targets the next tier
    ValueClub.values.forEach((tier, index) => {
      if (index < ValueClub.values.length - 1) {
        expect(ValueClub.getNextTarget(tier)).toBe(ValueClub.values[index + 1]);
      }
    });
  });

  test('getNextTarget returns null when at or below lowest tier', () => {
    const lastTier = ValueClub.values[ValueClub.values.length - 1];
    expect(ValueClub.getNextTarget(lastTier)).toBeNull();
    expect(ValueClub.getNextTarget(lastTier / 2)).toBeNull();
  });
});
