import { describe, test, expect } from 'vitest';
import { Metric, Milestone } from './constants.js';

describe('Metric Constants', () => {
  test('exports HOURS, SESSIONS, PLAYS', () => {
    expect(Metric.HOURS).toBe('hours');
    expect(Metric.SESSIONS).toBe('sessions');
    expect(Metric.PLAYS).toBe('plays');
  });
});

describe('Milestone Constants', () => {
  test('exports FIVES, DIMES, QUARTERS, CENTURIES', () => {
    expect(Milestone.FIVES).toBe('fives');
    expect(Milestone.DIMES).toBe('dimes');
    expect(Milestone.QUARTERS).toBe('quarters');
    expect(Milestone.CENTURIES).toBe('centuries');
  });
});
