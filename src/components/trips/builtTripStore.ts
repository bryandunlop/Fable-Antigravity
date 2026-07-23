// Built-trip store (LG-19 / D37 Wave 1).
//
// The trip builder's Save button was wired to an empty function in the route
// table, so an admin-assistant could assemble a whole trip — legs, passengers,
// itinerary — click Save, and lose all of it with no toast, no navigation, and no
// error. "Submit for Review" had no handler at all.
//
// Same house pattern as vacation/store.ts and utils/quickLinks.ts.
import { useSyncExternalStore } from 'react';

export type BuiltTripStatus = 'draft' | 'submitted';

export interface BuiltTrip {
  id: string;
  tripName: string;
  clientName: string;
  status: BuiltTripStatus;
  /** Opaque builder payload — the builder owns its own shape. */
  tripData: unknown;
  passengers: unknown;
  itinerary: unknown;
  savedAt: Date;
  submittedAt?: Date;
}

export const STORAGE_KEY = 'built-trips';

type Listener = () => void;
const listeners = new Set<Listener>();
let snapshot: BuiltTrip[] | null = null;

function storage(): Storage | null {
  return typeof localStorage === 'undefined' ? null : localStorage;
}

export function loadTrips(): BuiltTrip[] {
  const raw = storage()?.getItem(STORAGE_KEY) ?? null;
  if (raw === null) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((t) => {
      const trip = t as BuiltTrip;
      return {
        ...trip,
        savedAt: new Date(trip.savedAt),
        submittedAt: trip.submittedAt ? new Date(trip.submittedAt) : undefined,
      };
    });
  } catch {
    return [];
  }
}

function persist(trips: BuiltTrip[]): void {
  storage()?.setItem(STORAGE_KEY, JSON.stringify(trips));
  snapshot = null;
  listeners.forEach((l) => l());
}

/**
 * Save a built trip. Saving the same trip id twice updates it in place rather
 * than stacking duplicates — a builder that appends on every Save leaves the user
 * unable to tell which copy is current.
 */
export function saveTrip(trip: Omit<BuiltTrip, 'savedAt'> & { savedAt?: Date }): BuiltTrip {
  const record: BuiltTrip = { ...trip, savedAt: trip.savedAt ?? new Date() };
  const existing = loadTrips();
  const at = existing.findIndex((t) => t.id === record.id);
  const next = at === -1 ? [...existing, record] : existing.map((t, i) => (i === at ? record : t));
  persist(next);
  return record;
}

/** A submitted trip keeps its draft content and gains a submission time. */
export function submitTrip(id: string, now: Date = new Date()): BuiltTrip | undefined {
  const trips = loadTrips();
  const trip = trips.find((t) => t.id === id);
  if (!trip) return undefined;
  const updated: BuiltTrip = { ...trip, status: 'submitted', submittedAt: now };
  persist(trips.map((t) => (t.id === id ? updated : t)));
  return updated;
}

export function deleteTrip(id: string): void {
  persist(loadTrips().filter((t) => t.id !== id));
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useBuiltTrips(): BuiltTrip[] {
  return useSyncExternalStore(
    subscribe,
    () => {
      if (snapshot === null) snapshot = loadTrips();
      return snapshot;
    },
    () => [],
  );
}

export function resetTrips(): void {
  storage()?.removeItem(STORAGE_KEY);
  snapshot = null;
  listeners.forEach((l) => l());
}
