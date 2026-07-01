import { describe, it, expect } from 'vitest';
import { toTripContext } from './mapping';
import type { TripRecord } from './types';

const trip = (over: Partial<TripRecord> = {}): TripRecord => ({
  id: 'T1', tripNumber: 'TRIP-1', sourceSystem: 'manual', sourceTripRef: 'MAO-9',
  tail: 'N1PG', aircraftType: 'G650ER', tripType: 'domestic', priority: 'standard',
  status: 'planning', startDate: '2026-07-10T00:00:00.000Z', endDate: '2026-07-12T00:00:00.000Z',
  legs: [
    { id: 'l2', sequence: 2, departureIcao: 'KASE', arrivalIcao: 'KLUK', departureTimeUtc: '2026-07-11T15:00:00.000Z', paxCount: 3 },
    { id: 'l1', sequence: 1, departureIcao: 'KLUK', arrivalIcao: 'KASE', departureTimeUtc: '2026-07-10T14:00:00.000Z', paxCount: 7 },
  ],
  createdBy: 'u', createdAtUtc: '2026-06-30T12:00:00.000Z', ...over,
});

describe('toTripContext', () => {
  it('derives etd from the earliest leg, max pax, and weekday flag', () => {
    const ctx = toTripContext(trip());
    expect(ctx).toMatchObject({
      tripId: 'T1', tripType: 'domestic', tail: 'N1PG', aircraftType: 'G650ER',
      etdUtc: '2026-07-10T14:00:00.000Z', maxPaxCount: 7, isWeekendDeparture: false,
    });
  });
  it('flags a weekend departure (Sat/Sun earliest leg)', () => {
    // 2026-07-11 is a Saturday
    const ctx = toTripContext(trip({ legs: [
      { id: 'l1', sequence: 1, departureIcao: 'KLUK', arrivalIcao: 'KASE', departureTimeUtc: '2026-07-11T14:00:00.000Z', paxCount: 2 },
    ]}));
    expect(ctx.isWeekendDeparture).toBe(true);
    expect(ctx.etdUtc).toBe('2026-07-11T14:00:00.000Z');
  });
  it('falls back to startDate and 0 pax when there are no legs', () => {
    const ctx = toTripContext(trip({ legs: [] }));
    expect(ctx.etdUtc).toBe('2026-07-10T00:00:00.000Z');
    expect(ctx.maxPaxCount).toBe(0);
  });
});
