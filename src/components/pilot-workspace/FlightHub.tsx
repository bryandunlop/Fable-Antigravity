import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSchedulingWorkspace } from '../scheduling-workspace/SchedulingWorkspaceContext';
import { useTechLog, useCurrentUser } from '../tech-log/TechLogContext';
import { ReportDefectDialog } from '../tech-log/components/panels/ReportDefectDialog';
import { AirportInfoPanel } from '../tech-log/components/AirportInfoPanel';
import { BriefingPanel } from '../tech-log/components/BriefingPanel';
import { markAirportReviewedOnLeg } from '../tech-log/preflightActions';
import { newId } from '../tech-log/util/id';
import { deriveTripReadiness } from '../tech-log/engine/readiness';
import { deriveSchedulingReadiness } from '../../scheduling/engine/readiness';
import { deriveCustody, type CustodyState } from '../tech-log/engine/custody';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../ui/sheet';
import { composePilotReadiness, type PilotReadiness } from './selectors';
import { deriveTripModules, totalOutstanding } from './moduleStatus';
import { currentLegIndex, selectedLegIndex } from './legContext';
import ReadinessBar from './ReadinessBar';
import MessagesPanel from './panels/MessagesPanel';
import { ModuleCard } from './panels/ModuleCard';
import { HandoverCard } from './panels/HandoverCard';
import TripBriefPanel from './panels/TripBriefPanel';
import { LegStepper } from './panels/LegStepper';
import { LegFuelSection } from './panels/LegFuelSection';
import { LegDayOfSection } from './panels/LegDayOfSection';
import { LogNuisanceItemDialog } from './panels/LogNuisanceItemDialog';
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
  const { state, dispatch } = useTechLog();
  const user = useCurrentUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const [readiness, setReadiness] = useState<PilotReadiness | null>(null);
  const [squawkOpen, setSquawkOpen] = useState(false);
  const [nuisanceOpen, setNuisanceOpen] = useState(false);
  const tlTrip = state.trips.find((x) => x.tripNumber === trip.tripNumber) ?? null;
  const tlAc = state.aircraft.find((a) => a.tailNumber === trip.tail);
  const legs = tlTrip?.legs ?? [];

  const now = nowUtc();
  const currentIdx = currentLegIndex(legs, now);
  // Selected leg + airport drawer live in the URL (?leg, ?airport) so the pilot's place survives any
  // navigation away and back. Absent ?leg auto-follows the current (first-not-departed) leg.
  const selectedIdx = selectedLegIndex(legs, searchParams.get('leg'), currentIdx);
  const selectedLeg = legs[selectedIdx];
  const airportLeg = legs.find((l) => l.id === searchParams.get('airport'));
  // Maintenance handover accept lives in the URL too (?handover), so the pilot's place — including a
  // half-completed accept — survives navigating away and back, exactly like the airport drawer.
  const handoverOpen = !!searchParams.get('handover');

  const setParam = (key: string, value: string | null) =>
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (value === null) p.delete(key); else p.set(key, value);
      return p;
    }, { replace: true });
  // Pinning the current leg clears the param so day-of auto-follow resumes.
  const selectLeg = (i: number) => setParam('leg', i === currentIdx ? null : legs[i]?.id ?? null);

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
          officeTzOffsetMinutes={officeTzOffsetMinutes} onSelect={selectLeg} />
      )}

      {/* Four-module board — landscape: 2×2; portrait: stacked */}
      <div className="grid grid-cols-1 gap-3 landscape:grid-cols-2">
        <ModuleCard status={fratStatus}>
          {tlTrip && selectedLeg
            ? <LegDayOfSection tlTrip={tlTrip} leg={selectedLeg} tripNumber={trip.tripNumber}
                onOpenAirport={() => setParam('airport', selectedLeg.id)} />
            : <p className="text-sm text-muted-foreground">Not released to preflight yet.</p>}
        </ModuleCard>
        <ModuleCard status={fuelStatus}>
          {tlTrip && selectedLeg
            ? <LegFuelSection tlTrip={tlTrip} leg={selectedLeg} />
            : <p className="text-sm text-muted-foreground">Not released to preflight yet.</p>}
        </ModuleCard>
        <ModuleCard status={handoverStatus}>
          <HandoverCard trip={trip} onOpenHandover={() => setParam('handover', '1')} />
        </ModuleCard>
        <ModuleCard status={schedulingStatus}>
          <TripBriefPanel trip={trip} userRole={userRole} />
        </ModuleCard>
      </div>

      {/* Footer — always-available reporting */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
        {tlAc && <button onClick={() => setSquawkOpen(true)} className="min-h-[44px] rounded border px-3 py-2 text-sm hover:bg-accent">Report a squawk</button>}
        {tlAc && <button onClick={() => setNuisanceOpen(true)} className="min-h-[44px] rounded border px-3 py-2 text-sm hover:bg-accent">Log nuisance item</button>}
      </div>
      <MessagesPanel />

      {tlAc && <ReportDefectDialog open={squawkOpen} onOpenChange={setSquawkOpen} lockTail={tlAc.tailNumber} />}
      {tlAc && <LogNuisanceItemDialog open={nuisanceOpen} onOpenChange={setNuisanceOpen} aircraft={tlAc} />}

      {/* Airport review — slide-over drawer; stays in the pilot workspace, no environment switch. */}
      <Sheet open={!!airportLeg} onOpenChange={(o: boolean) => { if (!o) setParam('airport', null); }}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          {/* `open` tracks airportLeg alone, but the body also needs tlTrip — a deep link
              to ?airport=… for a trip absent from tech-log state mounts this sheet with
              no Title, which Radix reports as an accessibility error (LG-30). */}
          {airportLeg && !tlTrip && <SheetTitle className="sr-only">Airport review</SheetTitle>}
          {airportLeg && tlTrip && (
            <>
              <SheetHeader>
                <SheetTitle>Airport review · leg {airportLeg.sequence}</SheetTitle>
                <SheetDescription>{airportLeg.departureIcao} → {airportLeg.arrivalIcao} · {trip.tripNumber}</SheetDescription>
              </SheetHeader>
              <div className="mt-4 overflow-hidden rounded-lg border">
                <AirportInfoPanel
                  departureIcao={airportLeg.departureIcao}
                  arrivalIcao={airportLeg.arrivalIcao}
                  reviewed={airportLeg.airportReviewed}
                  onMarkReviewed={() => markAirportReviewedOnLeg({ dispatch, newId, trip: tlTrip, leg: airportLeg, actorOid: user.oid })}
                />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Maintenance handover accept — the same signed PIC ceremony as the tech-log trip page
          (BriefingPanel), rendered in a slide-over so custody accept stays in the pilot workspace. */}
      <Sheet open={handoverOpen && !!tlAc} onOpenChange={(o: boolean) => { if (!o) setParam('handover', null); }}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          {tlAc && (
            <>
              <SheetHeader>
                <SheetTitle>Maintenance handover</SheetTitle>
                <SheetDescription>{tlAc.tailNumber} · {trip.tripNumber} — accept &amp; sign as PIC</SheetDescription>
              </SheetHeader>
              <div className="mt-4">
                <BriefingPanel aircraft={tlAc} />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
