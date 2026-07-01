import { describe, it, expect } from 'vitest';
import { findFlightForLeg } from './flightMatcher';
import { FakeForeFlightDispatchClient } from './foreflightClient';
import type { TripRecord } from '../store/types';

const trip = (over: Partial<TripRecord> = {}): TripRecord => ({
  id: 'T1', tripNumber: 'TRIP-1', sourceSystem: 'manual', sourceTripRef: 'MAO-9',
  tail: 'N1PG', aircraftType: 'G650ER', tripType: 'domestic', priority: 'standard',
  status: 'confirmed', startDate: '2026-07-10T00:00:00.000Z', endDate: '2026-07-10T00:00:00.000Z',
  legs: [
    { id: 'l1', sequence: 1, departureIcao: 'KLUK', arrivalIcao: 'KASE', departureTimeUtc: '2026-07-10T14:00:00.000Z', paxCount: 4 },
  ],
  createdBy: 'u', createdAtUtc: '2026-06-30T12:00:00.000Z', ...over,
});

describe('findFlightForLeg', () => {
  it('returns null when ForeFlight has no flights for that day', async () => {
    const client = new FakeForeFlightDispatchClient();
    const t = trip();
    const result = await findFlightForLeg(t.legs[0], t, client);
    expect(result).toBeNull();
  });

  it('matches a seeded flight on tail + departure + destination within the day window', async () => {
    const client = new FakeForeFlightDispatchClient();
    const t = trip();
    await client.seedFlightsFromTrip(t);
    const result = await findFlightForLeg(t.legs[0], t, client);
    expect(result).toMatchObject({ aircraftRegistration: 'N1PG', departure: 'KLUK', destination: 'KASE' });
  });

  it('does not match a flight with the same tail but a different route', async () => {
    const client = new FakeForeFlightDispatchClient();
    const t = trip();
    await client.seedFlightsFromTrip(t);
    const otherLeg = { ...t.legs[0], id: 'l2', departureIcao: 'KASE', arrivalIcao: 'KLUK' };
    const result = await findFlightForLeg(otherLeg, t, client);
    expect(result).toBeNull();
  });
});
