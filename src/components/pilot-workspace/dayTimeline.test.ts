import { describe, it, expect } from 'vitest';
import { deriveDayTimeline, legsRemaining, dayOutstanding } from './dayTimeline';
import type { Trip, TripLeg, Aircraft } from '../tech-log/types';

const leg = (over: Partial<TripLeg> & Pick<TripLeg, 'id' | 'sequence' | 'departureIcao' | 'arrivalIcao' | 'departureTimeUtc' | 'arrivalTimeUtc'>): TripLeg => ({
  fratStatus: 'COMPLETED', airportReviewed: true, ...over,
});

// KLUK is the aircraft's home base, so only a KLUK departure raises a fuel item.
const AC = { id: 'ac-1', tailNumber: 'N2PG', homeBase: 'KLUK' } as unknown as Aircraft;

const TRIP = (legs: TripLeg[]) => ({ id: 't', tripNumber: 'MAO-7315', aircraftId: 'ac-1', status: 'OPEN', legs } as unknown as Trip);

const DAY = [
  leg({ id: 'l1', sequence: 1, departureIcao: 'KLUK', arrivalIcao: 'KTEB', departureTimeUtc: '2026-08-21T14:00:00.000Z', arrivalTimeUtc: '2026-08-21T16:00:00.000Z', fuelRequestId: 'fr-1' }),
  leg({ id: 'l2', sequence: 2, departureIcao: 'KTEB', arrivalIcao: 'KBOS', departureTimeUtc: '2026-08-21T21:00:00.000Z', arrivalTimeUtc: '2026-08-21T21:55:00.000Z', fratStatus: 'IN_PROGRESS', airportReviewed: false }),
  leg({ id: 'l3', sequence: 3, departureIcao: 'KBOS', arrivalIcao: 'KLUK', departureTimeUtc: '2026-08-21T23:30:00.000Z', arrivalTimeUtc: '2026-08-22T01:05:00.000Z' }),
];

describe('deriveDayTimeline', () => {
  it('interleaves legs with the ground time between them and ends the day', () => {
    const t = deriveDayTimeline(TRIP(DAY), AC, '2026-08-21T18:00:00.000Z');
    expect(t.map((e) => e.kind)).toEqual(['leg', 'ground', 'leg', 'ground', 'leg', 'end']);
  });

  it('marks exactly one entry current — the turn you are sitting in', () => {
    const t = deriveDayTimeline(TRIP(DAY), AC, '2026-08-21T18:00:00.000Z');
    const current = t.filter((e) => e.state === 'current');
    expect(current).toHaveLength(1);
    expect(current[0]).toMatchObject({ kind: 'ground', icao: 'KTEB', nextLegSequence: 2 });
    expect((current[0] as { durationMs: number }).durationMs).toBe(5 * 60 * 60 * 1000);
  });

  it('marks the leg current, and only that one, while it is airborne', () => {
    const t = deriveDayTimeline(TRIP(DAY), AC, '2026-08-21T15:00:00.000Z');
    const current = t.filter((e) => e.state === 'current');
    expect(current).toHaveLength(1);
    expect(current[0]).toMatchObject({ kind: 'leg', airborne: true });
    // Airborne is not "next": the countdown band is about the leg you have not left on yet.
    expect((current[0] as { next: boolean }).next).toBe(false);
  });

  it('attaches each outstanding item to its own leg rather than one flat list', () => {
    const t = deriveDayTimeline(TRIP(DAY), AC, '2026-08-21T18:00:00.000Z');
    const byLeg = Object.fromEntries(
      t.filter((e) => e.kind === 'leg').map((e) => [(e as { leg: TripLeg }).leg.id, (e as { items: unknown[] }).items.length]),
    );
    expect(byLeg).toEqual({ l1: 0, l2: 2, l3: 0 });   // l2 owes a FRAT draft + an airport review
    expect(dayOutstanding(t)).toBe(2);
  });

  it('counts legs still to fly, treating an airborne leg as unflown', () => {
    expect(legsRemaining(deriveDayTimeline(TRIP(DAY), AC, '2026-08-21T18:00:00.000Z'))).toBe(2);
    expect(legsRemaining(deriveDayTimeline(TRIP(DAY), AC, '2026-08-21T15:00:00.000Z'))).toBe(3);
    expect(legsRemaining(deriveDayTimeline(TRIP(DAY), AC, '2026-08-22T02:00:00.000Z'))).toBe(0);
  });

  it('never reports a negative turn when a schedule has been edited into an overlap', () => {
    const overlapping = [
      DAY[0],
      leg({ id: 'l2', sequence: 2, departureIcao: 'KTEB', arrivalIcao: 'KBOS', departureTimeUtc: '2026-08-21T15:00:00.000Z', arrivalTimeUtc: '2026-08-21T15:55:00.000Z' }),
    ];
    const ground = deriveDayTimeline(TRIP(overlapping), AC, '2026-08-21T18:00:00.000Z').find((e) => e.kind === 'ground');
    expect((ground as { durationMs: number }).durationMs).toBe(0);
  });

  it('returns nothing at all for a trip with no legs', () => {
    expect(deriveDayTimeline(TRIP([]), AC, '2026-08-21T18:00:00.000Z')).toEqual([]);
    expect(deriveDayTimeline(null, AC, '2026-08-21T18:00:00.000Z')).toEqual([]);
  });
});
