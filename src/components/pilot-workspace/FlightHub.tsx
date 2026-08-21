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
import { deriveServiceability } from '../tech-log/engine/serviceability';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../ui/sheet';
import { Bell, CalendarRange, Timer } from 'lucide-react';
import { composePilotReadiness, type PilotReadiness } from './selectors';
import { deriveTripModules, totalOutstanding } from './moduleStatus';
import ReadinessPill from './ReadinessPill';
import MessagesPanel from './panels/MessagesPanel';
import { ModuleCard } from './panels/ModuleCard';
import { HandoverCard } from './panels/HandoverCard';
import TripBriefPanel from './panels/TripBriefPanel';
import { LegFuelSection } from './panels/LegFuelSection';
import { LegFratSection } from './panels/LegFratSection';
import { DayOfPane } from './panels/DayOfPane';
import { deriveDayOfQueue, beforePushProgress, type QueueItem } from './dayOfQueue';
import { PrepMatrix } from './panels/PrepMatrix';
import { derivePrepRows, prepOutstanding, prepLocked } from './prepMatrix';
import { derivePaneMode, nextDepartureUtc, type PaneMode } from './paneMode';
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

/**
 * Which pane you are in, when the other one opens, and a way into it (D84).
 *
 * The mode is allowed to change under the pilot — that is the point — so it must always be legible
 * and always reversible. A silent switch is a trap; a switch with no way back is a worse one.
 */
function PaneModeChip({ mode, onSet }: { mode: ReturnType<typeof derivePaneMode>; onSet: (m: PaneMode) => void }) {
  const isPrep = mode.mode === 'prep';
  const other: PaneMode = isPrep ? 'day-of' : 'prep';
  return (
    <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-muted py-1 pl-3 pr-1 text-xs text-muted-foreground">
      {isPrep ? <CalendarRange className="h-3.5 w-3.5" aria-hidden /> : <Timer className="h-3.5 w-3.5" aria-hidden />}
      <span className="font-semibold text-foreground">{isPrep ? 'Prep' : 'Day-of'}</span>
      {mode.overridden
        ? <span>· your choice</span>
        : isPrep && mode.opensAtUtc
          ? <span className="hidden xl:inline">· day-of opens {mode.opensAtUtc.slice(11, 16)}Z</span>
          : null}
      <button type="button" onClick={() => onSet(other)}
        className="rounded-full border border-border bg-card px-2.5 py-1 font-medium text-primary duration-fast hover:bg-accent">
        {isPrep ? 'Day-of' : 'Prep'}
      </button>
    </span>
  );
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
  // The preflight legs and the SCHEDULING legs are not the same list: scheduling has the itinerary
  // from the moment the trip is mirrored, preflight only once it is released to the crew. The header
  // counts what the trip actually has, so a not-yet-released trip reads "2 legs · not released"
  // rather than "0 legs", which looked like the itinerary had been lost.
  const scheduledLegCount = trip.legs?.length ?? 0;
  const legCount = legs.length || scheduledLegCount;

  const now = nowUtc();
  // `?leg` is gone with the leg stepper (D84 slice 3): neither pane has a "selected leg" any more.
  // The prep matrix addresses every leg at once, and the day-of queue is ordered by clock across
  // legs — so the thing the URL used to remember no longer exists. Every panel that DOES open for a
  // single leg names it in its own param (?frat, ?fuel, ?airport), which is what actually survives
  // navigating away and back.
  const airportLeg = legs.find((l) => l.id === searchParams.get('airport'));
  // Maintenance handover accept lives in the URL too (?handover), so the pilot's place — including a
  // half-completed accept — survives navigating away and back, exactly like the airport drawer.
  const handoverOpen = !!searchParams.get('handover');
  // Messages joins the same URL-driven family (?airport, ?handover). It used to be a permanent
  // panel at the bottom of the page, which on a 1194x834 iPad meant it was permanently below the
  // fold — a section nobody could see, costing the layout its whole tail (D84).
  const messagesOpen = !!searchParams.get('messages');
  // FRAT and fuel join the family too, because the prep matrix has to open them for ANY leg without
  // walking the stepper — the whole point of prep being worked by item rather than by leg.
  const fratLeg = legs.find((l) => l.id === searchParams.get('frat'));
  const fuelLeg = legs.find((l) => l.id === searchParams.get('fuel'));

  // Which instrument this trip gets (D84). The clock decides; ?mode is the pilot's override and
  // lives in the URL like everything else here, so a shared link opens on what they were looking at.
  const rawMode = searchParams.get('mode');
  const paneMode = derivePaneMode(legs, now, rawMode === 'prep' || rawMode === 'day-of' ? rawMode : undefined);
  const prepRows = derivePrepRows(tlTrip, tlAc, now);
  const queue = deriveDayOfQueue(tlTrip, tlAc, now);
  const progress = beforePushProgress(tlTrip, tlAc, now);
  const nextDepUtc = nextDepartureUtc(legs, now);
  const nextLeg = legs.find((l) => l.departureTimeUtc === nextDepUtc);
  const openQueueItem = (i: QueueItem) =>
    setParam(i.kind === 'airport' ? 'airport' : i.kind, i.legId);

  const setParam = (key: string, value: string | null) =>
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (value === null) p.delete(key); else p.set(key, value);
      return p;
    }, { replace: true });

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
  const [, , handoverStatus, schedulingStatus] = modules;
  // Custody is aircraft-keyed (by tail) — shown whenever the trip's aircraft is known, matching the
  // handover card and pill, which reflect real custody even before the trip is released to preflight.
  const custody = tlAc ? deriveCustody(tlAc.id, state, now).state : undefined;
  const svStatus = tlAc ? deriveServiceability(tlAc.id, state, now).status : 'GREEN';
  const activeDeferrals = tlAc ? state.deferrals.filter((d) => d.aircraftId === tlAc.id && d.status === 'ACTIVE').length : 0;
  const outstanding = totalOutstanding(modules);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Trip header — identity, custody and the readiness verdict on ONE row. This is the only
          heading the workspace has now: the page title and lede it used to sit under said nothing
          this line does not, and cost ~80pt above the fold. */}
      <div className="flex flex-none flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border bg-card px-5 py-3">
        <div className="min-w-0">
          <div className="text-lg font-semibold leading-tight">{trip.tripNumber} · {trip.tail} · {trip.aircraftType}</div>
          <div className="text-xs text-muted-foreground">
            {trip.tripType} · {legCount} {legCount === 1 ? 'leg' : 'legs'}
            {/* In prep the matrix IS the work, so its own count is the honest one — the day-of
                module roll-up counts things the prep pane does not show. */}
            {paneMode.mode === 'prep'
              ? (prepOutstanding(prepRows) > 0 ? ` · ${prepOutstanding(prepRows)} to prep` : '')
              : (outstanding > 0 ? ` · ${outstanding} to prep` : '')}
            {prepLocked(prepRows) > 0 && (
              <span className="text-[var(--gfo-error-ink)]"> · {prepLocked(prepRows)} locked</span>
            )}
          </div>
        </div>
        {/* Wraps rather than clipping: custody + a long BLOCKED reason + the mode chip overflow
            1194pt, and the right-most chip is the one that disappears. */}
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
          {custody && <PilotCustodyChip state={custody} />}
          {readiness && <ReadinessPill readiness={readiness} />}
          <PaneModeChip mode={paneMode} onSet={(m) => setParam('mode', m)} />
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">

      {/* PREP PANE — the matrix replaces the leg stepper AND the two per-leg module cards, because
          days out the job is one pass down each column rather than four walks through the trip.
          Aircraft and Scheduling stay: they are per-trip, not per-leg, so a matrix cannot hold them. */}
      {paneMode.mode === 'prep' ? (
        <>
          <PrepMatrix
            rows={prepRows}
            scheduledLegCount={scheduledLegCount}
            onOpenFrat={(id) => setParam('frat', id)}
            onOpenAirport={(id) => setParam('airport', id)}
            onOpenFuel={(id) => setParam('fuel', id)}
          />
          <div className="grid grid-cols-1 gap-3 landscape:grid-cols-2">
            <ModuleCard status={handoverStatus}>
              <HandoverCard trip={trip} onOpenHandover={() => setParam('handover', '1')} />
            </ModuleCard>
            <ModuleCard status={schedulingStatus}>
              <TripBriefPanel trip={trip} userRole={userRole} />
            </ModuleCard>
          </div>
        </>
      ) : (
      <>
        {/* DAY-OF PANE — the four-module board is gone. Inside T-4h the only useful ordering is
            time, and four equal boxes left the pilot to work out which mattered next. */}
        <DayOfPane
          nowUtc={now}
          nextDepartureUtc={nextDepUtc}
          route={nextLeg ? { from: nextLeg.departureIcao, to: nextLeg.arrivalIcao } : undefined}
          legSequence={nextLeg?.sequence}
          legCount={legs.length}
          progress={progress}
          queue={queue}
          serviceability={svStatus}
          custody={custody}
          deferralCount={activeDeferrals}
          onOpenHandover={() => setParam('handover', '1')}
          onOpenItem={openQueueItem}
        />
        {/* Scheduling survives the board as a single card. The queue is pilot-ACTIONABLE items, and
            an operator item still in progress (customs, a permit) is neither actionable nor
            droppable — losing a whole information source silently is the worse error. */}
        <ModuleCard status={schedulingStatus}>
          <TripBriefPanel trip={trip} userRole={userRole} />
        </ModuleCard>
      </>
      )}

      </div>

      {/* Bottom bar — always-available reporting, pinned rather than scrolled past.
          LG-211: these were twin grey buttons, so the airworthiness-relevant act and the nuisance
          capture looked like the same size of decision. Reporting a defect can ground the aircraft;
          logging a nuisance item cannot. The primary treatment says which one that is. */}
      <div className="flex flex-none flex-wrap items-center gap-2 border-t border-border bg-card px-5 py-2.5">
        {tlAc && <button onClick={() => setSquawkOpen(true)} className="min-h-[44px] rounded bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 duration-fast">Report defect</button>}
        {tlAc && <button onClick={() => setNuisanceOpen(true)} className="min-h-[44px] rounded px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground duration-fast">Log nuisance item</button>}
        <span className="flex-1" />
        <button onClick={() => setParam('messages', '1')}
          className="inline-flex min-h-[44px] items-center gap-2 rounded px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground duration-fast">
          <Bell className="h-4 w-4" aria-hidden /> Messages
        </button>
      </div>

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

      {/* FRAT for any leg, opened from the prep matrix. Renders the SAME panel the day-of board
          uses, so the early-submit warning and the draft path cannot diverge between the two. */}
      <Sheet open={!!fratLeg && !!tlTrip} onOpenChange={(o: boolean) => { if (!o) setParam('frat', null); }}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          {fratLeg && tlTrip && (
            <>
              <SheetHeader>
                <SheetTitle>FRAT · leg {fratLeg.sequence}</SheetTitle>
                <SheetDescription>{fratLeg.departureIcao} → {fratLeg.arrivalIcao} · {trip.tripNumber}</SheetDescription>
              </SheetHeader>
              <div className="mt-4">
                <LegFratSection tlTrip={tlTrip} leg={fratLeg} tripNumber={trip.tripNumber} autoOpen
                  onDone={() => setParam('frat', null)} />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Home-base fuel request for any leg, likewise. */}
      <Sheet open={!!fuelLeg && !!tlTrip} onOpenChange={(o: boolean) => { if (!o) setParam('fuel', null); }}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          {fuelLeg && tlTrip && (
            <>
              <SheetHeader>
                <SheetTitle>Fuel · leg {fuelLeg.sequence}</SheetTitle>
                <SheetDescription>{fuelLeg.departureIcao} fuel farm · {trip.tripNumber}</SheetDescription>
              </SheetHeader>
              <div className="mt-4"><LegFuelSection tlTrip={tlTrip} leg={fuelLeg} /></div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Messages — the same slide-over treatment as airport review and handover, so the pilot's
          place survives navigating away and back. */}
      <Sheet open={messagesOpen} onOpenChange={(o: boolean) => { if (!o) setParam('messages', null); }}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Messages</SheetTitle>
            <SheetDescription>Scheduling and operations items addressed to the crew.</SheetDescription>
          </SheetHeader>
          <div className="mt-4"><MessagesPanel /></div>
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
