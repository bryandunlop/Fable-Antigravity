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
import type { TaskInstance } from '../engine';
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
  for (const booking of bookings) {
    const desired = tripToRecord(booking);
    const existing = await store.getTrip(booking.id);
    if (!desired) {
      // Stopped projecting. Only a record that came from this booking is ours to cancel.
      if (existing && existing.sourceSystem === 'manual' && existing.status !== 'cancelled') {
        await store.saveTrip({ ...existing, status: 'cancelled', lastEditedBy: 'bookings-sync', lastEditedAtUtc: nowUtc });
        // Its open work goes with it, so nothing sits open on a record the boards no longer show.
        // Cleared work stays cleared: if the booking comes back (a bump, then a new tail) the
        // reconcile restores the cancelled items and the done ones are still done.
        for (const inst of await store.listInstancesForTrip(booking.id)) {
          if (inst.status !== 'open' && inst.status !== 'in_progress' && inst.status !== 'blocked') continue;
          await store.updateInstance({ ...inst, status: 'cancelled', reflag: undefined, auditTrail: [...inst.auditTrail, { atUtc: nowUtc, actor: 'bookings-sync', action: 'cancelled', detail: 'booking no longer occupies a tail' }] });
        }
        result.cancelled += 1;
      }
      continue;
    }
    if (!existing) {
      // Restored instances for this booking (a reload) must survive the mirror: createTripMirror
      // writes a fresh open set by the same deterministic ids, so mirror first, then put the live
      // state back over it and reconcile once for anything the booking changed meanwhile.
      const kept = await store.listInstancesForTrip(booking.id);
      await service.createTripMirror(desired, nowUtc);
      if (kept.length) {
        await store.saveInstances(kept);
        await service.updateTrip(desired, nowUtc);
      }
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

// ── Persistence (D110 slice 2) ─────────────────────────────────────────────────────────────────
// The scheduling store is in-memory; the bookings persist. Without this, a reload re-mirrored every
// booking with a fresh checklist and cleared work vanished — the TL-38 class of bug. Only instances
// of booking-derived records are kept; fixtures re-seed themselves.

export const BOOKING_INSTANCES_KEY = 'scheduling-booking-instances';
const BOOKING_INSTANCES_VERSION = '1';

export async function snapshotBookingInstances(store: SchedulingStore): Promise<TaskInstance[]> {
  const out: TaskInstance[] = [];
  for (const t of await store.listTrips()) {
    if (t.sourceSystem !== 'manual') continue;
    out.push(...await store.listInstancesForTrip(t.id));
  }
  return out;
}

export async function persistBookingInstances(store: SchedulingStore, storage: Pick<Storage, 'setItem'> | null = typeof localStorage === 'undefined' ? null : localStorage): Promise<void> {
  if (!storage) return;
  const xs = await snapshotBookingInstances(store);
  storage.setItem(BOOKING_INSTANCES_KEY, JSON.stringify({ version: BOOKING_INSTANCES_VERSION, instances: xs }));
}

/** Put persisted instances back before the first sync, so createTripMirror never overwrites cleared work. */
export async function restoreBookingInstances(store: SchedulingStore, storage: Pick<Storage, 'getItem'> | null = typeof localStorage === 'undefined' ? null : localStorage): Promise<number> {
  if (!storage) return 0;
  try {
    const raw = storage.getItem(BOOKING_INSTANCES_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { version: string; instances: TaskInstance[] };
    if (parsed.version !== BOOKING_INSTANCES_VERSION || !Array.isArray(parsed.instances)) return 0;
    await store.saveInstances(parsed.instances);
    return parsed.instances.length;
  } catch {
    return 0;
  }
}
