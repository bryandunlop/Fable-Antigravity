import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send } from 'lucide-react';
import { Button } from '../ui/button';
import { GfoPageHeader, GfoPanel } from '../gfo';
import { useOpsClock } from '../hooks/useOpsClock';
import { useUnifiedFleetStatus } from '../hooks/useUnifiedFleetStatus';
import { RAG_DOT } from '../ops-wall/ragColors';
import { useSchedulingWorkspace } from '../scheduling-workspace/SchedulingWorkspaceContext';
import { actingUser } from '../safety-center/actingUser';
import type { TripRecord } from '../../scheduling/store/types';
import { tripsFlownThisMonth } from '../lead/leadSelectors';
import { getOnTimeLegStats } from '../lead/bookingQueueSeed';
import {
  buildFleetWeek,
  tailDayStats,
  firstOpenSlot,
  DEMO_CREW_CAPACITY,
  type FleetWeekCell,
} from './execSelectors';

function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function dayLabelLong(dateUtc: string): string {
  return new Date(`${dateUtc}T00:00:00.000Z`).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC',
  });
}

/**
 * The Executive fleet week view (D99): a read-only per-tail timeline where the
 * trip blocks are "where they're going" and the white space is the
 * availability, with metrics inline under the grid. The one action is the
 * ask-my-EA handoff — an open day deep-links into the booking portal's
 * new-request form pre-filled with that date; the request's completion work
 * then flows to the EA/admin through the D77 task rails. No chargeback dollar
 * figures appear here while Q21 is open with counsel.
 */
export default function ExecutiveDashboard({ userRole = 'executive' }: { userRole?: string }) {
  const navigate = useNavigate();
  const clock = useOpsClock();
  const { fleet, dispatchable, inFlight } = useUnifiedFleetStatus();
  const { store, ready, tick, nowUtc } = useSchedulingWorkspace();
  const { name: viewerName } = actingUser(userRole);

  const [trips, setTrips] = useState<TripRecord[]>([]);
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    store.listTrips().then(rows => { if (!cancelled) setTrips(rows); });
    return () => { cancelled = true; };
  }, [store, ready, tick]);

  const now = nowUtc();
  const tails = useMemo(() => fleet.map(a => a.tailNumber), [fleet]);
  const week = useMemo(
    () =>
      buildFleetWeek(trips, tails, now, 14, {
        tailStatus: Object.fromEntries(fleet.map(a => [a.tailNumber, a.airworthiness.status])),
        tailHeadline: Object.fromEntries(fleet.map(a => [a.tailNumber, a.airworthiness.headline ?? null])),
        crewCapacity: DEMO_CREW_CAPACITY,
      }),
    [trips, tails, now, fleet],
  );
  const stats = useMemo(() => tailDayStats(week), [week]);
  const nextOpen = useMemo(() => firstOpenSlot(week), [week]);
  const flownThisMonth = useMemo(() => tripsFlownThisMonth(trips, now), [trips, now]);
  const onTime = getOnTimeLegStats();
  const monthName = new Date(Date.parse(now)).toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' });

  function askEa(dateUtc: string, tail: string) {
    navigate('/booking-portal/requests/new', {
      state: { dates: [dateUtc], fromExecutive: { tail, dateUtc } },
    });
  }

  const dateLine = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const firstName = viewerName.split(' ')[0];

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 p-6">
      <GfoPageHeader
        eyebrow={`Executive · ${dateLine}`}
        title={`${greetingFor(new Date().getHours())}, ${firstName}`}
        actions={
          <>
            <span className="font-mono text-xs text-muted-foreground">{clock}</span>
            {nextOpen && (
              <Button size="sm" onClick={() => askEa(nextOpen.dateUtc, nextOpen.tail)}>
                <Send className="mr-1.5 h-4 w-4" />
                Ask my EA — {nextOpen.tail} open {dayLabelLong(nextOpen.dateUtc)}
              </Button>
            )}
          </>
        }
      />

      {/* ── Fleet strip ── */}
      <GfoPanel className="py-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <div className="flex flex-wrap items-center gap-4">
            {fleet.map(ac => (
              <span key={ac.tailNumber} className="flex items-center gap-1.5 text-sm font-medium text-primary">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: RAG_DOT[ac.airworthiness.status] }}
                  aria-label={ac.airworthiness.status}
                />
                {ac.tailNumber}
                <span className="font-normal text-muted-foreground">
                  {ac.model}{ac.location ? ` · ${ac.location}` : ''}
                </span>
              </span>
            ))}
          </div>
          <span className="ml-auto text-xs text-muted-foreground">
            {dispatchable} of {fleet.length} available · {inFlight} in flight
          </span>
        </div>
      </GfoPanel>

      {/* ── Fleet week: the next 14 days per tail ── */}
      <GfoPanel title="The next two weeks">
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div
              className="grid gap-1"
              style={{ gridTemplateColumns: `88px repeat(${week.days.length}, minmax(0, 1fr))` }}
            >
              <span />
              {week.days.map(d => (
                <span key={d.dateUtc} className="gfo-eyebrow text-center text-muted-foreground">
                  {d.dateLabel}
                </span>
              ))}
              {week.rows.map(row => {
                const ac = fleet.find(a => a.tailNumber === row.tail);
                return (
                  <FleetWeekRowCells
                    key={row.tail}
                    tail={row.tail}
                    ragColor={ac ? RAG_DOT[ac.airworthiness.status] : undefined}
                    cells={row.cells}
                    onOpenDay={askEa}
                  />
                );
              })}
            </div>
          </div>
        </div>
        <p className="mt-3 border-t border-border pt-3 text-sm text-muted-foreground">
          {stats.openTailDays} of {stats.totalTailDays} tail-days open in the next two weeks
          {' · '}{flownThisMonth} trips flown in {monthName}
          {' · '}{onTime.onTimeLegs}/{onTime.totalLegs} legs on time
          {' · '}open means airworthy, unscheduled, and a crew is free — tap one and your EA takes it from there.
        </p>
      </GfoPanel>
    </div>
  );
}

function FleetWeekRowCells({
  tail,
  ragColor,
  cells,
  onOpenDay,
}: {
  tail: string;
  ragColor?: string;
  cells: FleetWeekCell[];
  onOpenDay: (dateUtc: string, tail: string) => void;
}) {
  return (
    <>
      <span className="flex items-center gap-1.5 py-1 text-sm font-medium text-primary">
        {ragColor && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ragColor }} />}
        {tail}
      </span>
      {cells.map(cell => {
        if (cell.kind === 'open') {
          return (
            <button
              key={cell.dateUtc}
              onClick={() => onOpenDay(cell.dateUtc, tail)}
              title={`Open — ask your EA to request ${tail} on ${cell.dateUtc}`}
              className="min-h-9 rounded-md border border-dashed border-border text-[11px] text-muted-foreground/60 transition-colors hover:border-primary hover:text-primary"
            >
              open
            </button>
          );
        }
        if (cell.kind === 'down') {
          return (
            <span
              key={cell.dateUtc}
              title={cell.label ? `Grounded — ${cell.label}` : 'Grounded — down for maintenance'}
              className="flex min-h-9 items-center justify-center truncate rounded-md bg-destructive/10 px-1 text-[11px] font-medium text-destructive"
            >
              down · maint
            </span>
          );
        }
        if (cell.kind === 'no-crew') {
          return (
            <span
              key={cell.dateUtc}
              title="No crew free — the day's flying already commits every crew"
              className="flex min-h-9 items-center justify-center truncate rounded-md border border-dashed border-border/60 px-1 text-[11px] text-muted-foreground/50"
            >
              no crew
            </span>
          );
        }
        return (
          <span
            key={cell.dateUtc}
            title={cell.label ?? undefined}
            className={`flex min-h-9 items-center justify-center truncate rounded-md px-1 text-[11px] font-medium ${
              cell.kind === 'trip' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            }`}
          >
            {cell.label}
          </span>
        );
      })}
    </>
  );
}
