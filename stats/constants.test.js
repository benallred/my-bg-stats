import { describe, test, expect } from 'vitest';
import { Metric, Milestone, CostClub } from './constants.js';

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

describe('CostClub Tier Collection', () => {
  test('exports tier values', () => {
    expect(CostClub.FIVE_DOLLAR).toBe(5);
    expect(CostClub.TWO_FIFTY).toBe(2.5);
  });

  test('has descending direction', () => {
    expect(CostClub.direction).toBe('descending');
  });

  test('has values sorted descending', () => {
    expect(CostClub.values).toEqual([5, 2.5]);
  });

  test('getThreshold returns threshold and nextThreshold', () => {
    expect(CostClub.getThreshold(5)).toEqual({ threshold: 5, nextThreshold: 2.5 });
    expect(CostClub.getThreshold(2.5)).toEqual({ threshold: 2.5, nextThreshold: null });
  });

  test('getThreshold returns null for unknown tier', () => {
    expect(CostClub.getThreshold(999)).toEqual({ threshold: null, nextThreshold: null });
  });

  test('isValueInTier works with descending direction', () => {
    // For descending: value <= threshold and value > nextThreshold (or >= 0 if last tier)
    // 5: value <= 5 and value > 2.5
    expect(CostClub.isValueInTier(5, 5)).toBe(true);
    expect(CostClub.isValueInTier(4, 5)).toBe(true);
    expect(CostClub.isValueInTier(2.51, 5)).toBe(true);
    expect(CostClub.isValueInTier(2.5, 5)).toBe(false); // boundary goes to next tier
    expect(CostClub.isValueInTier(6, 5)).toBe(false);

    // 2.5: value <= 2.5 (no lower bound since last tier)
    expect(CostClub.isValueInTier(2.5, 2.5)).toBe(true);
    expect(CostClub.isValueInTier(1, 2.5)).toBe(true);
    expect(CostClub.isValueInTier(0, 2.5)).toBe(true);
    expect(CostClub.isValueInTier(3, 2.5)).toBe(false);
  });

  test('isValueInTier returns false for unknown tier', () => {
    expect(CostClub.isValueInTier(3, 999)).toBe(false);
  });

  test('isValueAtOrBeyondTier returns true for values at or below threshold (descending)', () => {
    expect(CostClub.isValueAtOrBeyondTier(5, 5)).toBe(true);
    expect(CostClub.isValueAtOrBeyondTier(4, 5)).toBe(true);
    expect(CostClub.isValueAtOrBeyondTier(2.5, 5)).toBe(true);
    expect(CostClub.isValueAtOrBeyondTier(1, 5)).toBe(true);
    expect(CostClub.isValueAtOrBeyondTier(2.5, 2.5)).toBe(true);
    expect(CostClub.isValueAtOrBeyondTier(1, 2.5)).toBe(true);
  });

  test('isValueAtOrBeyondTier returns false for values above threshold (descending)', () => {
    expect(CostClub.isValueAtOrBeyondTier(6, 5)).toBe(false);
    expect(CostClub.isValueAtOrBeyondTier(10, 5)).toBe(false);
    expect(CostClub.isValueAtOrBeyondTier(3, 2.5)).toBe(false);
  });

  test('isValueAtOrBeyondTier returns false for unknown tier', () => {
    expect(CostClub.isValueAtOrBeyondTier(3, 999)).toBe(false);
  });

  test('getTierForValue works with descending direction', () => {
    expect(CostClub.getTierForValue(5)).toBe(5);
    expect(CostClub.getTierForValue(4)).toBe(5);
    expect(CostClub.getTierForValue(2.5)).toBe(2.5);
    expect(CostClub.getTierForValue(1)).toBe(2.5);
    expect(CostClub.getTierForValue(6)).toBeNull();
  });

  test('getNextTarget returns next lower tier value', () => {
    expect(CostClub.getNextTarget(10)).toBe(5);
    expect(CostClub.getNextTarget(6)).toBe(5);
    expect(CostClub.getNextTarget(5)).toBe(2.5);
    expect(CostClub.getNextTarget(4)).toBe(2.5);
  });

  test('getNextTarget returns null when at or below lowest tier', () => {
    expect(CostClub.getNextTarget(2.5)).toBeNull();
    expect(CostClub.getNextTarget(1)).toBeNull();
  });
});
