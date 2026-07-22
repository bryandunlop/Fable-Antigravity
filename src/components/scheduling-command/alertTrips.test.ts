import { describe, it, expect } from 'vitest';
import { toTripsForAlerts } from './alertTrips';
import type { TripRecord } from '../../scheduling/store/types';

function trip(overrides: Partial<TripRecord>): TripRecord {
  return {
    id: 't1', tripNumber: 'T-1', sourceSystem: 'manual', sourceTripRef: null,
    tail: 'N5PG', aircraftType: 'G500', tripType: 'domestic', priority: 'standard',
    status: 'confirmed', startDate: '2026-07-22T10:00:00.000Z', endDate: '2026-07-22T14:00:00.000Z',
    legs: [{
      id: 'l1', sequence: 1, departureIcao: 'KLUK', arrivalIcao: 'KTEB',
      departureTimeUtc: '2026-07-22T10:00:00.000Z', paxCount: 2,
    }],
    createdBy: 'test', createdAtUtc: '2026-07-21T00:00:00.000Z',
    ...overrides,
  };
}

describe('toTripsForAlerts', () => {
  it('keeps planning/confirmed/in_progress trips and drops cancelled + completed', () => {
    const rows = [
      trip({ id: 'a', status: 'planning' }),
      trip({ id: 'b', status: 'confirmed' }),
      trip({ id: 'c', status: 'in_progress' }),
      trip({ id: 'd', status: 'cancelled' }),
      trip({ id: 'e', status: 'completed' }),
    ];
    expect(toTripsForAlerts(rows).map(t => t.tripId)).toEqual(['a', 'b', 'c']);
  });

  it('passes arrival times through when present and omits the key when absent', () => {
    const withArrival = trip({
      legs: [{
        id: 'l1', sequence: 1, departureIcao: 'KLUK', arrivalIcao: 'KTEB',
        departureTimeUtc: '2026-07-22T10:00:00.000Z',
        arrivalTimeUtc: '2026-07-22T11:40:00.000Z', paxCount: 2,
      }],
    });
    const noArrival = trip({ id: 't2' }); // NewTripDialog-style leg: departure only
    const [a, b] = toTripsForAlerts([withArrival, noArrival]);
    expect(a.legs[0].arrivalTimeUtc).toBe('2026-07-22T11:40:00.000Z');
    expect('arrivalTimeUtc' in b.legs[0]).toBe(false);
  });
});
