import { describe, it, expect } from 'vitest';
import { deriveTripStatus, TRIP_STATUS_STYLES } from './tripStatus';

const NOW = new Date('2026-07-03T12:00:00Z').getTime();
const DAY = 86400000;
const dep = (daysFromNow: number) => new Date(NOW + daysFromNow * DAY).toISOString();
const trip = (p: { readinessScore: number; criticalBlocker?: string; departureDate: string; durationDays?: number }) =>
  ({ durationDays: 2, ...p });

describe('deriveTripStatus', () => {
  it('blocked outranks everything', () => {
    expect(deriveTripStatus(trip({ readinessScore: 100, criticalBlocker: 'Slot Unconfirmed', departureDate: dep(0.5) }), NOW)).toBe('blocked');
  });

  it('airborne: fully ready and departed, through the trip duration', () => {
    expect(deriveTripStatus(trip({ readinessScore: 100, departureDate: dep(-1) }), NOW)).toBe('airborne');
  });

  it('a fully-ready trip past its arrival reads ready (completed), not airborne', () => {
    expect(deriveTripStatus(trip({ readinessScore: 100, departureDate: dep(-5), durationDays: 2 }), NOW)).toBe('ready');
  });

  it('ready: 100% before departure', () => {
    expect(deriveTripStatus(trip({ readinessScore: 100, departureDate: dep(3) }), NOW)).toBe('ready');
  });

  it('behind: under 90% inside a day of departure', () => {
    expect(deriveTripStatus(trip({ readinessScore: 85, departureDate: dep(0.5) }), NOW)).toBe('behind');
  });

  it('behind: under 50% inside three days', () => {
    expect(deriveTripStatus(trip({ readinessScore: 40, departureDate: dep(2) }), NOW)).toBe('behind');
  });

  it('attention: the 6–14-day window with readiness under 80', () => {
    expect(deriveTripStatus(trip({ readinessScore: 60, departureDate: dep(10) }), NOW)).toBe('attention');
  });

  it('attention outranks uninteracted inside the two-week window (matches the pill logic)', () => {
    expect(deriveTripStatus(trip({ readinessScore: 0, departureDate: dep(10) }), NOW)).toBe('attention');
  });

  it('uninteracted: untouched and far out', () => {
    expect(deriveTripStatus(trip({ readinessScore: 0, departureDate: dep(30) }), NOW)).toBe('uninteracted');
  });

  it('on-track: partially worked, no pressure', () => {
    expect(deriveTripStatus(trip({ readinessScore: 82, departureDate: dep(10) }), NOW)).toBe('on-track');
    expect(deriveTripStatus(trip({ readinessScore: 50, departureDate: dep(30) }), NOW)).toBe('on-track');
  });

  it('has a style entry for every status', () => {
    for (const s of ['blocked', 'airborne', 'ready', 'behind', 'attention', 'uninteracted', 'on-track'] as const) {
      expect(TRIP_STATUS_STYLES[s].label).toBeTruthy();
      expect(TRIP_STATUS_STYLES[s].bar).toBeTruthy();
      expect(TRIP_STATUS_STYLES[s].pill).toBeTruthy();
      expect(TRIP_STATUS_STYLES[s].badge).toBeTruthy();
    }
  });
});
