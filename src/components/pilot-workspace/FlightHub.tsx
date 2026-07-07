import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSchedulingWorkspace } from '../scheduling-workspace/SchedulingWorkspaceContext';
import { useTechLog } from '../tech-log/TechLogContext';
import { ReportDefectDialog } from '../tech-log/components/panels/ReportDefectDialog';
import { deriveTripReadiness } from '../tech-log/engine/readiness';
import { deriveSchedulingReadiness } from '../../scheduling/engine/readiness';
import { composePilotReadiness, type PilotReadiness } from './selectors';
import { currentLegIndex, defaultPhase } from './legContext';
import ReadinessBar from './ReadinessBar';
import TripBriefPanel from './panels/TripBriefPanel';
import AircraftAcceptancePanel from './panels/AircraftAcceptancePanel';
import MessagesPanel from './panels/MessagesPanel';
import { LegStepper } from './panels/LegStepper';
import { LegFuelSection } from './panels/LegFuelSection';
import { LegDayOfSection } from './panels/LegDayOfSection';
import type { TripRecord } from '../../scheduling/store/types';

export default function FlightHub({ trip, userRole }: { trip: TripRecord; userRole: string }) {
  const { store, tick, nowUtc, officeTzOffsetMinutes } = useSchedulingWorkspace();
  const { state } = useTechLog();
  const [readiness, setReadiness] = useState<PilotReadiness | null>(null);
  const [squawkOpen, setSquawkOpen] = useState(false);
  const tlTrip = state.trips.find((x) => x.tripNumber === trip.tripNumber) ?? null;
  const tlAc = state.aircraft.find((a) => a.tailNumber === trip.tail);
  const legs = tlTrip?.legs ?? [];

  const now = nowUtc();
  const currentIdx = currentLegIndex(legs, now);
  // Auto-follow the current leg as legs depart, unless the pilot has manually pinned one via the stepper.
  const [pinnedIdx, setPinnedIdx] = useState<number | null>(null);
  const selectedIdx = Math.min(pinnedIdx ?? (currentIdx < 0 ? 0 : currentIdx), Math.max(0, legs.length - 1));
  const [phase, setPhase] = useState<'prep' | 'day-of'>(
    defaultPhase(trip.status, legs[currentIdx]?.departureTimeUtc, now),
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sched = deriveSchedulingReadiness(await store.listInstancesForTrip(trip.id));
      const pf = tlTrip ? deriveTripReadiness(tlTrip, state, now) : null;
      if (!cancelled) setReadiness(composePilotReadiness(sched, pf));
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, tick, state, trip]);

  const selectedLeg = legs[selectedIdx];

  return (
    <div className="space-y-4">
      {/* Always-visible header */}
      <div className="rounded-lg border p-4 space-y-3">
        <div>
          <div className="font-semibold">{trip.tripNumber} · {trip.tail} · {trip.aircraftType}</div>
          <div className="text-sm text-muted-foreground">{trip.tripType} · {legs.length} legs</div>
        </div>
        {readiness && <ReadinessBar readiness={readiness} />}
        <div className="flex gap-2">
          {(['prep', 'day-of'] as const).map((p) => (
            <button key={p} onClick={() => setPhase(p)}
              className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium min-h-[44px] transition-colors ${
                phase === p ? 'border-primary bg-accent text-foreground' : 'bg-background text-muted-foreground hover:bg-accent'}`}>
              {p === 'prep' ? 'Prep' : 'Day-of'}
            </button>
          ))}
        </div>
      </div>

      {tlTrip && legs.length > 1 && (
        <LegStepper legs={legs} currentIndex={currentIdx < 0 ? 0 : currentIdx} selectedIndex={selectedIdx}
          officeTzOffsetMinutes={officeTzOffsetMinutes} onSelect={(i) => setPinnedIdx(i === currentIdx ? null : i)} />
      )}

      {/* landscape: two columns; portrait: one */}
      <div className="grid grid-cols-1 landscape:grid-cols-2 gap-3">
        {phase === 'prep' ? (
          <>
            {tlTrip && selectedLeg && <LegFuelSection tlTrip={tlTrip} leg={selectedLeg} />}
            <TripBriefPanel trip={trip} userRole={userRole} />
          </>
        ) : (
          <>
            {tlTrip && selectedLeg && <LegDayOfSection tlTrip={tlTrip} leg={selectedLeg} tripNumber={trip.tripNumber} />}
            <AircraftAcceptancePanel trip={trip} />
          </>
        )}
      </div>

      {/* Always-visible footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
        <div className="flex gap-2">
          {tlAc && <button onClick={() => setSquawkOpen(true)} className="text-sm rounded border px-3 py-2 min-h-[44px] hover:bg-accent">Report a squawk</button>}
          {tlAc && <Link to="/tech-log/intermittent" className="text-sm rounded border px-3 py-2 min-h-[44px] hover:bg-accent">Log nuisance item ↗</Link>}
        </div>
      </div>
      <MessagesPanel />

      {tlAc && <ReportDefectDialog open={squawkOpen} onOpenChange={setSquawkOpen} lockTail={tlAc.tailNumber} />}
    </div>
  );
}
