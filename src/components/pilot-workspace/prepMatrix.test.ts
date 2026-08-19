import { describe, it, expect } from 'vitest';
import { derivePrepRows, prepOutstanding, prepLocked } from './prepMatrix';
import type { Trip, TripLeg, Aircraft } from '../tech-log/types';

const leg = (over: Partial<TripLeg> & { sequence: number }): TripLeg => ({
  id: `leg-${over.sequence}`,
  departureIcao: 'KLUK',
  arrivalIcao: 'KTEB',
  departureTimeUtc: '2026-08-18T14:20:00.000Z',
  arrivalTimeUtc: '2026-08-18T16:00:00.000Z',
  fratStatus: 'NOT_STARTED',
  airportReviewed: false,
  ...over,
} as TripLeg);

const AC = { id: 'ac-1', tailNumber: 'N6PG', homeBase: 'KLUK' } as Aircraft;
const trip = (legs: TripLeg[]) => ({ id: 't1', tripNumber: 'T-2026-0718', legs } as Trip);

// Well before the T-4h fuel lock at 10:20Z.
const NOW = '2026-08-18T08:33:00.000Z';

describe('prep matrix rows (D84)', () => {
  it('reads FRAT as start / resume / done, and carries the submitted score', () => {
    const rows = derivePrepRows(
      trip([
        leg({ sequence: 1 }),
        leg({ sequence: 2, fratStatus: 'IN_PROGRESS' }),
        leg({ sequence: 3, fratStatus: 'COMPLETED', fratScore: 11 }),
      ]),
      AC,
      NOW,
    );
    expect(rows.map((r) => r.frat.state)).toEqual(['todo', 'draft', 'done']);
    expect(rows[2].frat.score).toBe(11);
  });

  it('names the airports a leg still needs reviewed, and none once it is', () => {
    const rows = derivePrepRows(
      trip([leg({ sequence: 1 }), leg({ sequence: 2, airportReviewed: true })]),
      AC,
      NOW,
    );
    expect(rows[0].airport.state).toBe('todo');
    expect(rows[0].airport.icaos).toEqual(['KLUK', 'KTEB']);
    expect(rows[1].airport.state).toBe('done');
  });

  it('is not-applicable for fuel on a leg that does not depart home base', () => {
    const rows = derivePrepRows(trip([leg({ sequence: 1, departureIcao: 'KTEB' })]), AC, NOW);
    expect(rows[0].fuel.state).toBe('na');
  });

  it('offers a home-base uplift and says when it locks', () => {
    const rows = derivePrepRows(trip([leg({ sequence: 1 })]), AC, NOW);
    expect(rows[0].fuel.state).toBe('todo');
    expect(rows[0].fuel.lockAtUtc).toBe('2026-08-18T10:20:00.000Z'); // ETD 14:20 minus 4h
  });

  it('reads LOCKED once the boundary has passed, rather than offering a button that gets refused', () => {
    // The old fuel card rendered the same Submit button either way and surfaced the refusal as a
    // toast after the pilot had already typed a quantity.
    const rows = derivePrepRows(trip([leg({ sequence: 1 })]), AC, '2026-08-18T10:20:00.000Z');
    expect(rows[0].fuel.state).toBe('locked');
  });

  it('reads DONE once a request exists, even past the lock', () => {
    const rows = derivePrepRows(
      trip([leg({ sequence: 1, fuelRequestId: 'fr-1' })]),
      AC,
      '2026-08-18T13:00:00.000Z',
    );
    expect(rows[0].fuel.state).toBe('done');
  });

  it('falls back to not-applicable when the trip has no aircraft yet', () => {
    const rows = derivePrepRows(trip([leg({ sequence: 1 })]), undefined, NOW);
    expect(rows[0].fuel.state).toBe('na');
  });

  it('orders rows by leg sequence regardless of how the trip stored them', () => {
    const rows = derivePrepRows(trip([leg({ sequence: 3 }), leg({ sequence: 1 }), leg({ sequence: 2 })]), AC, NOW);
    expect(rows.map((r) => r.leg.sequence)).toEqual([1, 2, 3]);
  });

  it('counts what the pilot can still act on, and reports the locked ones separately', () => {
    const rows = derivePrepRows(
      trip([
        leg({ sequence: 1 }),                                                   // frat todo, airport todo, fuel todo
        leg({ sequence: 2, fratStatus: 'COMPLETED', airportReviewed: true }),   // fuel todo only
      ]),
      AC,
      NOW,
    );
    expect(prepOutstanding(rows)).toBe(4);
    expect(prepLocked(rows)).toBe(0);

    const late = derivePrepRows(trip([leg({ sequence: 1 })]), AC, '2026-08-18T12:00:00.000Z');
    expect(prepLocked(late)).toBe(1);
    expect(prepOutstanding(late)).toBe(2); // frat + airport; the locked fuel is not actionable
  });
});
