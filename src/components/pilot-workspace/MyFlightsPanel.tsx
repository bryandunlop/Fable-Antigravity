import React, { useEffect, useMemo, useState } from 'react';
import { useSchedulingWorkspace } from '../scheduling-workspace/SchedulingWorkspaceContext';
import { useTechLog } from '../tech-log/TechLogContext';
import { deriveTripReadiness } from '../tech-log/engine/readiness';
import { deriveSchedulingReadiness } from '../../scheduling/engine/readiness';
import { selectPilotFlights, composePilotReadiness, type PilotReadiness } from './selectors';
import type { TripRecord } from '../../scheduling/store/types';

export default function MyFlightsPanel({ onOpen }: { onOpen: (trip: TripRecord) => void }) {
  const { store, tick, nowUtc } = useSchedulingWorkspace();
  const { state } = useTechLog();
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [readiness, setReadiness] = useState<Record<string, PilotReadiness>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all = await store.listTrips();
      const mine = selectPilotFlights(all, nowUtc());
      if (cancelled) return;
      setTrips(mine);
      const now = nowUtc();
      const entries = await Promise.all(mine.map(async (t) => {
        const sched = deriveSchedulingReadiness(await store.listInstancesForTrip(t.id));
        const tlTrip = state.trips.find((x) => x.tripNumber === t.tripNumber) ?? null;
        const pf = tlTrip ? deriveTripReadiness(tlTrip, state, now) : null;
        return [t.id, composePilotReadiness(sched, pf)] as const;
      }));
      if (!cancelled) setReadiness(Object.fromEntries(entries));
    })();
    return () => { cancelled = true; };
  }, [store, tick, state, nowUtc]);

  const empty = useMemo(() => trips.length === 0, [trips]);

  return (
    <div className="space-y-3">
      {empty && <p className="text-muted-foreground text-sm">No flights in your window.</p>}
      {trips.map((t) => {
        const r = readiness[t.id];
        const dep = t.legs?.[0];
        return (
          <button key={t.id} onClick={() => onOpen(t)}
            className="w-full text-left rounded-lg border p-4 hover:bg-accent transition-colors">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{t.tripNumber} · {t.tail}</span>
              {r && <span className="text-xs uppercase tracking-wide">{r.state.replace('_', ' ')}</span>}
            </div>
            <div className="text-sm text-muted-foreground">
              {dep ? `${dep.departureIcao} → ${t.legs[t.legs.length - 1].arrivalIcao} · ${dep.departureTimeUtc.slice(0, 16).replace('T', ' ')}Z` : 'No legs'}
            </div>
            {r?.blocker && <div className="text-xs mt-1">{r.blocker}</div>}
          </button>
        );
      })}
    </div>
  );
}
