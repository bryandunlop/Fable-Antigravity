import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSchedulingWorkspace } from '../scheduling-workspace/SchedulingWorkspaceContext';
import { useTechLog } from '../tech-log/TechLogContext';
import { ReportDefectDialog } from '../tech-log/components/panels/ReportDefectDialog';
import { deriveTripReadiness } from '../tech-log/engine/readiness';
import { deriveSchedulingReadiness } from '../../scheduling/engine/readiness';
import { composePilotReadiness, type PilotReadiness } from './selectors';
import ReadinessBar from './ReadinessBar';
import TripBriefPanel from './panels/TripBriefPanel';
import AircraftAcceptancePanel from './panels/AircraftAcceptancePanel';
import PreflightLegsPanel from './panels/PreflightLegsPanel';
import MessagesPanel from './panels/MessagesPanel';
import type { TripRecord } from '../../scheduling/store/types';

export default function FlightHub({ trip, userRole }: { trip: TripRecord; userRole: string }) {
  const { store, tick, nowUtc } = useSchedulingWorkspace();
  const { state } = useTechLog();
  const [readiness, setReadiness] = useState<PilotReadiness | null>(null);
  const [squawkOpen, setSquawkOpen] = useState(false);
  const tlAc = state.aircraft.find((a) => a.tailNumber === trip.tail);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const now = nowUtc();
      const sched = deriveSchedulingReadiness(await store.listInstancesForTrip(trip.id));
      const tlTrip = state.trips.find((x) => x.tripNumber === trip.tripNumber) ?? null;
      const pf = tlTrip ? deriveTripReadiness(tlTrip, state, now) : null;
      if (!cancelled) setReadiness(composePilotReadiness(sched, pf));
    })();
    return () => { cancelled = true; };
  }, [store, tick, state, nowUtc, trip]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4">
        <div className="font-semibold">{trip.tripNumber} · {trip.tail} · {trip.aircraftType}</div>
        <div className="text-sm text-muted-foreground">{trip.tripType} · {trip.legs?.length ?? 0} legs</div>
      </div>
      {readiness && <ReadinessBar readiness={readiness} />}
      <TripBriefPanel trip={trip} />
      <AircraftAcceptancePanel trip={trip} />
      {tlAc && (
        <section className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Squawks <span className="text-xs text-muted-foreground">to maintenance</span></h2>
            <div className="flex gap-2">
              <button onClick={() => setSquawkOpen(true)} className="text-xs rounded border px-2 py-1 hover:bg-accent">Report squawk</button>
              <Link to="/tech-log/intermittent" className="text-xs rounded border px-2 py-1 hover:bg-accent">Log nuisance item ↗</Link>
            </div>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Anything wrong with {tlAc.tailNumber} — squawk it here and maintenance picks it up in their work queue.
            Intermittent oddities (a nuisance CAS that self-clears) go on the nuisance watch-list instead.
          </p>
          <ReportDefectDialog open={squawkOpen} onOpenChange={setSquawkOpen} lockTail={tlAc.tailNumber} />
        </section>
      )}
      <PreflightLegsPanel trip={trip} userRole={userRole} />
      <MessagesPanel />
    </div>
  );
}
