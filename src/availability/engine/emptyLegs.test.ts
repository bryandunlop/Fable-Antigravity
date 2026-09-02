import { describe, expect, it } from 'vitest';
import { emptyLegsFor } from './emptyLegs';
import type { TripRecord } from '../../scheduling/store/types';

const NOW = '2026-09-01T12:00:00.000Z';
function trip(id: string, tail: string, legs: Array<[string, string, string]>): TripRecord {
  return {
    id, tripNumber: id, sourceSystem: 'manual', sourceTripRef: null, tail, aircraftType: 'G500', tripType: 'domestic', priority: 'standard', status: 'confirmed',
    startDate: legs[0][2], endDate: legs[legs.length - 1][2],
    legs: legs.map(([dep, arr, at], i) => ({ id: `${id}-l${i}`, sequence: i + 1, departureIcao: dep, arrivalIcao: arr, departureTimeUtc: at, arrivalTimeUtc: new Date(Date.parse(at) + 2 * 3_600_000).toISOString(), paxCount: 2 })),
    createdBy: 't', createdAtUtc: NOW,
  };
}

describe('empty legs — what a one-way trip leaves behind', () => {
  it('lead 1 flies to A, lead 2 returns from B: the ferry A → B is an empty leg on the day lead 2 departs', () => {
    const t1 = trip('t1', 'N5PG', [['KLUK', 'KTEB', '2026-09-10T13:00:00.000Z']]);
    const t2 = trip('t2', 'N5PG', [['KBED', 'KLUK', '2026-09-12T20:00:00.000Z']]);
    expect(emptyLegsFor([t1, t2], 'N5PG', NOW)).toEqual([
      { tail: 'N5PG', dateUtc: '2026-09-12', from: 'KTEB', to: 'KBED', kind: 'ferry', afterTripId: 't1', beforeTripId: 't2' },
    ]);
  });
  it('lead 2 comes back from the same airport: no empty leg, the aircraft just waits', () => {
    const t1 = trip('t1', 'N5PG', [['KLUK', 'KTEB', '2026-09-10T13:00:00.000Z']]);
    const t2 = trip('t2', 'N5PG', [['KTEB', 'KLUK', '2026-09-12T20:00:00.000Z']]);
    expect(emptyLegsFor([t1, t2], 'N5PG', NOW)).toEqual([]);
  });
  it('a one-way that ends away with nothing booked after it implies a return home the next day', () => {
    const t1 = trip('t1', 'N5PG', [['KLUK', 'KTEB', '2026-09-10T13:00:00.000Z']]);
    expect(emptyLegsFor([t1], 'N5PG', NOW)).toEqual([
      { tail: 'N5PG', dateUtc: '2026-09-11', from: 'KTEB', to: 'KLUK', kind: 'return', afterTripId: 't1', beforeTripId: null },
    ]);
  });
  it('a round trip that ends at home leaves nothing', () => {
    const t1 = trip('t1', 'N5PG', [['KLUK', 'KTEB', '2026-09-10T13:00:00.000Z'], ['KTEB', 'KLUK', '2026-09-12T20:00:00.000Z']]);
    expect(emptyLegsFor([t1], 'N5PG', NOW)).toEqual([]);
  });
  it('landing at CVG counts as home when the caller says so — no phantom return', () => {
    const t1 = trip('t1', 'N5PG', [['KCVG', 'KTEB', '2026-09-10T13:00:00.000Z'], ['KTEB', 'KCVG', '2026-09-11T20:00:00.000Z']]);
    expect(emptyLegsFor([t1], 'N5PG', NOW)).toHaveLength(1);
    expect(emptyLegsFor([t1], 'N5PG', NOW, ['KCVG'])).toEqual([]);
  });
  it('other tails and cancelled trips are ignored', () => {
    const t1 = trip('t1', 'N6PG', [['KLUK', 'KTEB', '2026-09-10T13:00:00.000Z']]);
    const t2 = { ...trip('t2', 'N5PG', [['KLUK', 'KTEB', '2026-09-10T13:00:00.000Z']]), status: 'cancelled' as const };
    expect(emptyLegsFor([t1, t2], 'N5PG', NOW)).toEqual([]);
  });
});
