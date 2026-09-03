// Bookings → the scheduling store (D110 slice 1: the booking is the only trip).
//
// The command center, the checklist engine and the fleet picture all read the scheduling
// store. Bookings live in the trips module. This keeps the store's records in step with the
// bookings, idempotently: a new booking is mirrored (which instantiates its checklist — the
// checklist hangs off the booking), a changed booking is reconciled, an unchanged one is left
// alone, and a booking that stops projecting (cancelled, tail taken away) has its record
// cancelled so the tail is released. Records that did not come from a booking (the myairops
// fixtures) are never touched. Pure apart from the store it is handed.

import type { SchedulingService } from '../store/service';
import type { SchedulingStore, TripRecord } from '../store/types';
import { tripToRecord } from '../../components/trips/engine/projection';
import type { Trip } from '../../components/trips/engine/trip';

export interface SyncResult { created: number; updated: number; unchanged: number; cancelled: number }

/** The fields a booking owns; anything else on the record is the store's business. */
function fingerprint(r: TripRecord): string {
  const { lastEditedBy: _a, lastEditedAtUtc: _b, ...owned } = r;
  return JSON.stringify(owned);
}

export async function syncBookingsIntoStore(bookings: Trip[], service: SchedulingService, store: SchedulingStore, nowUtc: string): Promise<SyncResult> {
  const result: SyncResult = { created: 0, updated: 0, unchanged: 0, cancelled: 0 };
  const seen = new Set<string>();
  for (const booking of bookings) {
    const desired = tripToRecord(booking);
    const existing = await store.getTrip(booking.id);
    if (!desired) {
      // Stopped projecting. Only a record that came from this booking is ours to cancel.
      if (existing && existing.sourceSystem === 'manual' && existing.status !== 'cancelled') {
        await store.saveTrip({ ...existing, status: 'cancelled', lastEditedBy: 'bookings-sync', lastEditedAtUtc: nowUtc });
        result.cancelled += 1;
      }
      continue;
    }
    seen.add(booking.id);
    if (!existing) {
      await service.createTripMirror(desired, nowUtc);
      result.created += 1;
    } else if (fingerprint(existing) === fingerprint(desired)) {
      result.unchanged += 1;
    } else {
      await service.updateTrip({ ...desired, lastEditedBy: 'bookings-sync', lastEditedAtUtc: nowUtc }, nowUtc);
      result.updated += 1;
    }
  }
  return result;
}
