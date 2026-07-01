import { describe, it, expect } from 'vitest';
import { renderTripSheetHtml } from './tripSheetDocument';
import { FakeMyAirOpsClient } from './myairopsClient';
import type { TripRecord } from '../store/types';

const trip = (over: Partial<TripRecord> = {}): TripRecord => ({
  id: 'T1', tripNumber: 'TRIP-1', sourceSystem: 'manual', sourceTripRef: 'MAO-9',
  tail: 'N1PG', aircraftType: 'G650ER', tripType: 'domestic', priority: 'standard',
  status: 'confirmed', startDate: '2026-07-10T00:00:00.000Z', endDate: '2026-07-11T00:00:00.000Z',
  legs: [
    { id: 'l1', sequence: 1, departureIcao: 'KLUK', arrivalIcao: 'KASE', departureTimeUtc: '2026-07-10T14:00:00.000Z', paxCount: 2 },
  ],
  createdBy: 'u', createdAtUtc: '2026-06-30T12:00:00.000Z', ...over,
});

describe('renderTripSheetHtml', () => {
  it('includes trip header, leg route, crew, passengers, and operational messages', async () => {
    const sheet = await new FakeMyAirOpsClient().getTripSheet(trip());
    const html = renderTripSheetHtml(sheet);

    expect(html).toContain('TRIP-1');
    expect(html).toContain('N1PG');
    expect(html).toContain('KLUK');
    expect(html).toContain('KASE');
    expect(html).toContain(sheet.crew[0].name);
    expect(html).toContain(sheet.passengers[0].name);
    expect(html).toContain(sheet.passengers[0].employeeNumber);
    expect(html).toContain(sheet.operationalMessages[0].icao);
  });

  it('is deterministic for the same trip (needed for idempotent sync)', async () => {
    const client = new FakeMyAirOpsClient();
    const t = trip();
    const first = renderTripSheetHtml(await client.getTripSheet(t));
    const second = renderTripSheetHtml(await client.getTripSheet(t));
    expect(first).toBe(second);
  });
});
