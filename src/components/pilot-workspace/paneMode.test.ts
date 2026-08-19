import { describe, it, expect } from 'vitest';
import { DAY_OF_THRESHOLD_HOURS, derivePaneMode, nextDepartureUtc } from './paneMode';
import { FUEL_LOCK_HOURS_BEFORE_ETD } from '../tech-log/preflightActions';
import type { TripLeg } from '../tech-log/types';

const leg = (sequence: number, departureTimeUtc: string): TripLeg =>
  ({ id: `leg-${sequence}`, sequence, departureTimeUtc, departureIcao: 'KLUK', arrivalIcao: 'KTEB' } as TripLeg);

// A four-leg day: 14:20Z and 19:05Z on the 18th, 15:30Z and 21:00Z on the 19th.
const LEGS = [
  leg(1, '2026-08-18T14:20:00Z'),
  leg(2, '2026-08-18T19:05:00Z'),
  leg(3, '2026-08-19T15:30:00Z'),
  leg(4, '2026-08-19T21:00:00Z'),
];

describe('next departure', () => {
  it('is the first leg that has not departed', () => {
    expect(nextDepartureUtc(LEGS, '2026-08-18T08:33:00Z')).toBe('2026-08-18T14:20:00Z');
    expect(nextDepartureUtc(LEGS, '2026-08-18T16:00:00Z')).toBe('2026-08-18T19:05:00Z');
  });

  it('is undefined once every leg has departed', () => {
    expect(nextDepartureUtc(LEGS, '2026-08-20T00:00:00Z')).toBeUndefined();
  });

  it('does not assume the legs arrive in order', () => {
    const shuffled = [LEGS[2], LEGS[0], LEGS[3], LEGS[1]];
    expect(nextDepartureUtc(shuffled, '2026-08-18T08:33:00Z')).toBe('2026-08-18T14:20:00Z');
  });
});

describe('pane mode (D84)', () => {
  it('is prep while the next departure is further out than the threshold', () => {
    // 3 days out — the pass where a pilot requests fuel, fills FRATs and checks airports.
    const m = derivePaneMode(LEGS, '2026-08-15T09:12:00Z');
    expect(m.mode).toBe('prep');
    expect(m.opensAtUtc).toBe('2026-08-18T10:20:00.000Z'); // 14:20 minus 4h — the same instant fuel locks
  });

  it('flips to day-of exactly AT the threshold, not after it', () => {
    expect(derivePaneMode(LEGS, '2026-08-18T10:20:00Z').mode).toBe('day-of');
    expect(derivePaneMode(LEGS, '2026-08-18T10:19:59Z').mode).toBe('prep');
  });

  it('flips at the same instant the home-base fuel request locks — one boundary, not two', () => {
    // The whole point of aligning them: prep is "everything is still actionable" and day-of is
    // "the last reversible thing has closed". If these two drift apart that sentence stops being
    // true, so this test fails on ANY divergence rather than on a particular number.
    const etd = new Date(LEGS[0].departureTimeUtc).getTime();
    const fuelLocksAt = new Date(etd - FUEL_LOCK_HOURS_BEFORE_ETD * 3_600_000).toISOString();
    expect(derivePaneMode(LEGS, '2026-08-15T09:12:00Z').opensAtUtc).toBe(fuelLocksAt);
  });

  it('stays day-of once the last leg has departed — you are flying, not planning', () => {
    expect(derivePaneMode(LEGS, '2026-08-19T22:00:00Z').mode).toBe('day-of');
  });

  it('is prep for a trip with no legs, because nothing is imminent', () => {
    const m = derivePaneMode([], '2026-08-18T08:33:00Z');
    expect(m.mode).toBe('prep');
    expect(m.opensAtUtc).toBeUndefined();
  });

  it('lets the pilot override in both directions, and says the choice was theirs', () => {
    const early = derivePaneMode(LEGS, '2026-08-15T09:12:00Z', 'day-of');
    expect(early.mode).toBe('day-of');
    expect(early.auto).toBe('prep');
    expect(early.overridden).toBe(true);

    // 12:00Z is 2h20 before the 14:20 departure — inside the T-4h window, so the clock says day-of.
    const late = derivePaneMode(LEGS, '2026-08-18T12:00:00Z', 'prep');
    expect(late.mode).toBe('prep');
    expect(late.auto).toBe('day-of');
    expect(late.overridden).toBe(true);
  });

  it('does not report an override when the choice agrees with the clock', () => {
    const m = derivePaneMode(LEGS, '2026-08-18T12:00:00Z', 'day-of');
    expect(m.overridden).toBe(false);
  });

  it('measures the threshold in elapsed hours, so no DST discontinuity can move it', () => {
    // US DST ends 2026-11-01T06:00Z. A departure the morning after, with "now" the evening
    // before, spans the transition: a calendar-day or local-hour reading would be an hour out.
    // This clock is a fixed offset from an instant — deliberately NOT the PL-25 calendar-day
    // clock of D24, which IS timezone-anchored. Do not "fix" this into calendar math.
    const dstLegs = [leg(1, '2026-11-01T09:00:00Z')];
    expect(derivePaneMode(dstLegs, '2026-11-01T05:00:00Z').mode).toBe('day-of'); // T-4h exactly
    expect(derivePaneMode(dstLegs, '2026-11-01T04:59:00Z').mode).toBe('prep');
    expect(DAY_OF_THRESHOLD_HOURS).toBe(4);
  });
});
