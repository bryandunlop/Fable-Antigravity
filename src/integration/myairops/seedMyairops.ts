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
    const { instances } = await service.createTripMirror(record, nowUtcIso);

    // MAO-7315 is mid-turn, so it pins to the top of the pilot's Flight Hub and is the first thing
    // anyone opens in a demo. A trip that is already flying with an untouched coordination checklist
    // is not a state that occurs — left all-open, the front door read "No trip prep completed yet".
    //
    // Worked to COMPLETION, not near-completion: the pilot's Scheduling card lists only the
    // pilot-VISIBLE task defs (handoffTarget role=pilot), and on the domestic per-trip template that
    // is `send-crew-brief` alone, which sits last at order 99. Leaving "just the last one" open
    // therefore leaves the pilot's card empty however much of the rest is done.
    if (record.tripNumber !== 'MAO-7315') continue;
    for (const inst of instances) {
      if (inst.requiresAck) await service.applyAction(inst.id, { kind: 'ack' }, 'myairops-seed', nowUtcIso);
      await service.applyAction(inst.id, { kind: 'complete' }, 'myairops-seed', nowUtcIso);
    }
  }
}
