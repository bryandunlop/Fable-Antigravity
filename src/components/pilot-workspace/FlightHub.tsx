import React, { useEffect, useState } from 'react';
import { useSchedulingWorkspace } from '../scheduling-workspace/SchedulingWorkspaceContext';
import { useTechLog } from '../tech-log/TechLogContext';
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
      <PreflightLegsPanel trip={trip} userRole={userRole} />
      <MessagesPanel />
    </div>
  );
}
