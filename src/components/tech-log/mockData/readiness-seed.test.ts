import { describe, it, expect } from 'vitest';
import { getDefaultState } from './scenarios';
import { deriveTripReadiness } from '../engine/readiness';

describe('seeded trips derive the intended readiness', () => {
  const s = getDefaultState();
  const now = new Date().toISOString();
  const readinessOf = (tripNumber: string) => {
    const t = s.trips.find(tr => tr.tripNumber === tripNumber)!;
    return deriveTripReadiness(t, s, now);
  };

  it('TRIP-2050 is NOT_READY — a home-base (KLUK) departure with no fuel submission', () => {
    const r = readinessOf('TRIP-2050');
    expect(r.state).toBe('NOT_READY');
    expect(r.blocker).toMatch(/fuel/i);
  });
  it('TRIP-2055 is READY — outstation origin, all FRATs complete, airports reviewed', () => {
    expect(readinessOf('TRIP-2055').state).toBe('READY');
  });
});
