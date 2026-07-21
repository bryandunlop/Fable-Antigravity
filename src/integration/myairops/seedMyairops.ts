// Seeds the scheduling workspace with adapter-mapped Booking-API fixture trips —
// the same path a real Phase-2 pull would take: vendor shape -> bookingAdapter ->
// TripRecord -> service.createTripMirror (checklists instantiate exactly as if a
// scheduler had mirrored the trip). Stable vendor ids keep re-seeding idempotent.

import type { SchedulingService } from '../../scheduling/store/service';
import { mapBookingTripToTripRecord } from './bookingAdapter';
import { buildMyairopsBookingFixtures } from './fixtures/bookingTrips';

export async function seedMyairopsBookingTrips(service: SchedulingService, nowUtcIso: string): Promise<void> {
  for (const fixture of buildMyairopsBookingFixtures(nowUtcIso)) {
    const record = mapBookingTripToTripRecord(fixture.trip, { nowUtc: nowUtcIso });
    await service.createTripMirror(record, nowUtcIso);
  }
}
