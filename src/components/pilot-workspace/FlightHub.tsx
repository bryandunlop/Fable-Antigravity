import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSchedulingWorkspace } from '../scheduling-workspace/SchedulingWorkspaceContext';
import { useTechLog } from '../tech-log/TechLogContext';
import { ReportDefectDialog } from '../tech-log/components/panels/ReportDefectDialog';
import { deriveTripReadiness } from '../tech-log/engine/readiness';
import { deriveSchedulingReadiness } from '../../scheduling/engine/readiness';
import { deriveCustody, type CustodyState } from '../tech-log/engine/custody';
import { composePilotReadiness, type PilotReadiness } from './selectors';
import { deriveTripModules, totalOutstanding } from './moduleStatus';
import { currentLegIndex } from './legContext';
import ReadinessBar from './ReadinessBar';
import MessagesPanel from './panels/MessagesPanel';
import { ModuleCard } from './panels/ModuleCard';
import { HandoverCard } from './panels/HandoverCard';
import TripBriefPanel from './panels/TripBriefPanel';
import { LegStepper } from './panels/LegStepper';
import { LegFuelSection } from './panels/LegFuelSection';
import { LegDayOfSection } from './panels/LegDayOfSection';
import type { TripRecord } from '../../scheduling/store/types';

// Pilot-framed custody chip (first person) on the P&G-blue axis, for the trip header.
const CUSTODY: Record<CustodyState, { dot: string; label: string }> = {
  WITH_CREW: { dot: 'gfo-dot-crew', label: 'In your custody' },
  OFFERED: { dot: 'gfo-dot-maint-offered', label: 'Released to you' },
  IN_MAINTENANCE: { dot: 'gfo-dot-maint', label: 'With maintenance' },
};
function PilotCustodyChip({ state }: { state: CustodyState }) {
  const c = CUSTODY[state];
  return <span className="gfo-chip shrink-0"><span className={`gfo-chip-dot ${c.dot}`} aria-hidden /> {c.label}</span>;
}

/** The pilot trip workspace: one four-module board (FRAT & airport · Fuel · Maintenance handover ·
 *  Scheduling), all visible at once — no Prep/Day-of toggle. The leg stepper drives the per-leg
 *  modules (FRAT, fuel); handover and scheduling are per-trip. */
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
  // Auto-follow the current leg as legs depart, unless the pilot has pinned one via the stepper.
  const [pinnedIdx, setPinnedIdx] = useState<number | null>(null);
  const selectedIdx = Math.min(pinnedIdx ?? (currentIdx < 0 ? 0 : currentIdx), Math.max(0, legs.length - 1));
  const selectedLeg = legs[selectedIdx];

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

  const modules = deriveTripModules(tlTrip, tlAc, state, readiness?.scheduling, now);
  const [fratStatus, fuelStatus, handoverStatus, schedulingStatus] = modules;
  // Custody is aircraft-keyed (by tail) — shown whenever the trip's aircraft is known, matching the
  // handover card and pill, which reflect real custody even before the trip is released to preflight.
  const custody = tlAc ? deriveCustody(tlAc.id, state, now).state : undefined;
  const outstanding = totalOutstanding(modules);

  return (
    <div className="space-y-4">
      {/* Trip header — identity, custody, one readiness verdict */}
      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-semibold">{trip.tripNumber} · {trip.tail} · {trip.aircraftType}</div>
            <div className="text-sm text-muted-foreground">
              {trip.tripType} · {legs.length} legs{outstanding > 0 ? ` · ${outstanding} to prep` : ''}
            </div>
          </div>
          {custody && <PilotCustodyChip state={custody} />}
        </div>
        {readiness && <ReadinessBar readiness={readiness} />}
      </div>

      {tlTrip && legs.length > 1 && (
        <LegStepper legs={legs} currentIndex={currentIdx < 0 ? 0 : currentIdx} selectedIndex={selectedIdx}
          officeTzOffsetMinutes={officeTzOffsetMinutes} onSelect={(i) => setPinnedIdx(i === currentIdx ? null : i)} />
      )}

      {/* Four-module board — landscape: 2×2; portrait: stacked */}
      <div className="grid grid-cols-1 gap-3 landscape:grid-cols-2">
        <ModuleCard status={fratStatus}>
          {tlTrip && selectedLeg
            ? <LegDayOfSection tlTrip={tlTrip} leg={selectedLeg} tripNumber={trip.tripNumber} />
            : <p className="text-sm text-muted-foreground">Not released to preflight yet.</p>}
        </ModuleCard>
        <ModuleCard status={fuelStatus}>
          {tlTrip && selectedLeg
            ? <LegFuelSection tlTrip={tlTrip} leg={selectedLeg} />
            : <p className="text-sm text-muted-foreground">Not released to preflight yet.</p>}
        </ModuleCard>
        <ModuleCard status={handoverStatus}>
          <HandoverCard trip={trip} />
        </ModuleCard>
        <ModuleCard status={schedulingStatus}>
          <TripBriefPanel trip={trip} userRole={userRole} />
        </ModuleCard>
      </div>

      {/* Footer — always-available reporting */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
        {tlAc && <button onClick={() => setSquawkOpen(true)} className="min-h-[44px] rounded border px-3 py-2 text-sm hover:bg-accent">Report a squawk</button>}
        {tlAc && <Link to="/tech-log/intermittent" className="min-h-[44px] rounded border px-3 py-2 text-sm hover:bg-accent">Log nuisance item ↗</Link>}
      </div>
      <MessagesPanel />

      {tlAc && <ReportDefectDialog open={squawkOpen} onOpenChange={setSquawkOpen} lockTail={tlAc.tailNumber} />}
    </div>
  );
}
