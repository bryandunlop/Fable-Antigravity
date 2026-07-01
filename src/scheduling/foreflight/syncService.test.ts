import { describe, it, expect } from 'vitest';
import { ForeFlightSyncService } from './syncService';
import { FakeForeFlightDispatchClient } from './foreflightClient';
import { FakeMyAirOpsClient } from './myairopsClient';
import type { TripRecord } from '../store/types';

const trip = (over: Partial<TripRecord> = {}): TripRecord => ({
  id: 'T1', tripNumber: 'TRIP-1', sourceSystem: 'manual', sourceTripRef: 'MAO-9',
  tail: 'N1PG', aircraftType: 'G650ER', tripType: 'domestic', priority: 'standard',
  status: 'confirmed', startDate: '2026-07-10T00:00:00.000Z', endDate: '2026-07-10T00:00:00.000Z',
  legs: [
    { id: 'l1', sequence: 1, departureIcao: 'KLUK', arrivalIcao: 'KASE', departureTimeUtc: '2026-07-10T14:00:00.000Z', paxCount: 2 },
  ],
  createdBy: 'u', createdAtUtc: '2026-06-30T12:00:00.000Z', ...over,
});

function makeService() {
  return new ForeFlightSyncService({
    foreFlight: new FakeForeFlightDispatchClient(),
    myAirOps: new FakeMyAirOpsClient(),
  });
}

describe('ForeFlightSyncService.pushTripDocuments', () => {
  it('uploads the trip sheet and travel documents for every leg on first push', async () => {
    const service = makeService();
    const t = trip();
    const report = await service.pushTripDocuments(t, '2026-07-01T00:00:00.000Z');

    expect(report.tripId).toBe('T1');
    expect(report.total).toBeGreaterThan(0);
    expect(report.failed).toBe(0);
    expect(report.updated).toBe(0);
    expect(report.details.every((d) => d.status === 'uploaded')).toBe(true);
    // one trip sheet + one itinerary + one passport per passenger (2 pax on this leg)
    expect(report.details.filter((d) => d.docType === 'trip_sheet')).toHaveLength(1);
    expect(report.details.filter((d) => d.docType === 'travel_document')).toHaveLength(3);
  });

  it('reports unchanged (no re-upload) when pushing again with no data changes', async () => {
    const service = makeService();
    const t = trip();
    await service.pushTripDocuments(t, '2026-07-01T00:00:00.000Z');
    const second = await service.pushTripDocuments(t, '2026-07-01T01:00:00.000Z');

    expect(second.updated).toBe(0);
    expect(second.details.every((d) => d.status === 'unchanged')).toBe(true);
  });

  it('replaces (delete + reupload) the trip sheet when the underlying trip data changes', async () => {
    const service = makeService();
    const t = trip();
    await service.pushTripDocuments(t, '2026-07-01T00:00:00.000Z');

    const changed = trip({ tripNumber: 'TRIP-2' });
    const report = await service.pushTripDocuments(changed, '2026-07-02T00:00:00.000Z');

    const tripSheetResult = report.details.find((d) => d.docType === 'trip_sheet');
    expect(tripSheetResult?.status).toBe('replaced');
    expect(report.updated).toBe(1);
  });

  // The "no matching flight" branch (myairops hasn't synced a leg yet) is exercised
  // directly against flightMatcher in flightMatcher.test.ts — pushTripDocuments always
  // seeds flights for the trip it's given first, so that branch can't organically occur
  // through this entry point (see the seedFlightsFromTrip comment above).

  it('listDeliveredFiles reflects what was pushed', async () => {
    const service = makeService();
    const t = trip();
    await service.pushTripDocuments(t, '2026-07-01T00:00:00.000Z');
    const files = await service.listDeliveredFiles(t);
    expect(files.l1).toHaveLength(4); // trip sheet + itinerary + 2 passenger passports
  });
});
