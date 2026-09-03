import React, { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { InMemorySchedulingStore, SchedulingService, seedTemplates } from '../../scheduling/store';
import { syncBookingsIntoStore, persistBookingInstances, restoreBookingInstances } from '../../scheduling/bridge/projectBookings';
import { loadTrips, TRIPS_CHANGED_EVENT } from '../trips/data/tripsStore';
import { defaultPilotVisibleDefs } from '../../scheduling/engine';
import { seedMyairopsBookingTrips } from '../../integration/myairops/seedMyairops';

interface SchedulingWorkspaceContextValue {
  service: SchedulingService;
  store: InMemorySchedulingStore;
  ready: boolean;
  tick: number; // bumped after every mutation so panels re-query the mutable store
  bump: () => void;
  nowUtc: () => string; // the UI is the outer clock; the engine stays pure
  officeTzOffsetMinutes: number;
}

const SchedulingWorkspaceContext = createContext<SchedulingWorkspaceContextValue | undefined>(undefined);

// Eastern (Lunken) office. TODO(dev): derive from a real DST-aware TZ source; fixed offset
// carries the same caveat as the engine's date math (see the spec's productionize notes).
const OFFICE_TZ_OFFSET_MINUTES = -240;

// Shared across every SchedulingWorkspaceProvider mount so the scheduling and pilot
// workspaces read/write the SAME trips + events in-session (one canonical trip + event bus).
const store = new InMemorySchedulingStore();
const service = new SchedulingService({
  store,
  idFactory: (seed) => seed, // MUST be deterministic — generateRunBoard/escalation idempotency depends on stable ids per seed
  officeTzOffsetMinutes: OFFICE_TZ_OFFSET_MINUTES,
});

// Seed exactly once behind a module-level promise guard — idempotent across StrictMode
// double-mount AND across route navigations. Never re-seeds, never clears the store.
let seedPromise: Promise<void> | null = null;
function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = (async () => {
      await seedTemplates(store);
      // Default pilot-visible set = the per-trip items that already hand off to the pilot.
      for (const id of defaultPilotVisibleDefs(await store.listPublishedTemplates())) {
        await store.setPilotVisible(id, true);
      }
      // Booking-API fixture trips through the real myairops adapter — the exact
      // path a Phase-2 pull takes. These carry the serviceability-alert and
      // passenger-currency demo scenarios (MAO-7301/7305/7310).
      await seedMyairopsBookingTrips(service, new Date().toISOString());
      // D110 slice 2: cleared checklist work on bookings survives a reload — put it back before
      // the first sync, or the mirror would hand every booking a fresh open checklist.
      await restoreBookingInstances(store);
      // D110 slice 1: the booking is the only trip. The command-center fixtures
      // (seedDemoTrips / seedVolumeTrips) are gone; every record the boards show is a
      // projection of a booking in the trips module, kept in step by resyncBookings().
      await resyncBookings();
    })();
  }
  return seedPromise;
}

/**
 * Project every scheduling-visible booking into the store (idempotent). Runs at seed time and
 * whenever the trips module writes (TRIPS_CHANGED_EVENT / a storage event from another tab).
 */
export async function resyncBookings(): Promise<void> {
  const bookings = loadTrips().filter(t => t.visibleToScheduling);
  await syncBookingsIntoStore(bookings, service, store, new Date().toISOString());
  await persistBookingInstances(store);
}

export function SchedulingWorkspaceProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [tick, setTick] = useState(0);
  // Every mutation bumps; every bump persists the bookings' checklist state (D110 slice 2).
  const bump = useCallback(() => { setTick((t) => t + 1); void persistBookingInstances(store); }, []);

  useEffect(() => {
    let cancelled = false;
    ensureSeeded().then(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, []);

  // Keep the store in step with the bookings: same tab (the trips module writes) or another tab.
  useEffect(() => {
    // One sync at a time; a change that lands mid-sync is queued and runs once the current one
    // finishes (fresh review: without the trailing run, the second of two edits in the same
    // minute was silently dropped until an unrelated event happened along).
    let inFlight: Promise<void> | null = null;
    let queued = false;
    let disposed = false;
    const run = () => {
      inFlight = ensureSeeded().then(resyncBookings).finally(() => {
        inFlight = null;
        if (disposed) return;
        bump();
        if (queued) { queued = false; run(); }
      });
    };
    const onChange = () => {
      if (inFlight) { queued = true; return; }
      run();
    };
    window.addEventListener(TRIPS_CHANGED_EVENT, onChange);
    window.addEventListener('storage', onChange);
    return () => {
      disposed = true;
      window.removeEventListener(TRIPS_CHANGED_EVENT, onChange);
      window.removeEventListener('storage', onChange);
    };
  }, [bump]);

  const nowUtc = useCallback(() => new Date().toISOString(), []);

  return (
    <SchedulingWorkspaceContext.Provider
      value={{ service, store, ready, tick, bump, nowUtc, officeTzOffsetMinutes: OFFICE_TZ_OFFSET_MINUTES }}
    >
      {children}
    </SchedulingWorkspaceContext.Provider>
  );
}

export function useSchedulingWorkspace() {
  const ctx = useContext(SchedulingWorkspaceContext);
  if (!ctx) throw new Error('useSchedulingWorkspace must be used within a SchedulingWorkspaceProvider');
  return ctx;
}
