import React, { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { InMemorySchedulingStore, SchedulingService, seedTemplates, seedDemoTrips, seedVolumeTrips } from '../../scheduling/store';
import { defaultPilotVisibleDefs } from '../../scheduling/engine';

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
      // Demo trips so every role lands on a populated Trips tab + ForeFlight push list.
      // Stable trip ids make this idempotent across StrictMode remounts. Remove this
      // one call for a clean/empty workspace.
      await seedDemoTrips(service, new Date().toISOString());
      // Month-scale deterministic volume (real checklists, proximity-worked) so the
      // command-center plan/run boards demonstrate dozens-of-trips scale.
      await seedVolumeTrips(service, new Date().toISOString());
    })();
  }
  return seedPromise;
}

export function SchedulingWorkspaceProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [tick, setTick] = useState(0);
  const bump = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    ensureSeeded().then(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, []);

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
