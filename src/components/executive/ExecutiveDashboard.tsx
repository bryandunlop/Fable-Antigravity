import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send } from 'lucide-react';
import { Button } from '../ui/button';
import { GfoPageHeader, GfoPanel } from '../gfo';
import { useOpsClock } from '../hooks/useOpsClock';
import { useUnifiedFleetStatus } from '../hooks/useUnifiedFleetStatus';
import { RAG_DOT } from '../ops-wall/ragColors';
import { actingUser } from '../safety-center/actingUser';
import { tripsFlownThisMonth } from '../lead/leadSelectors';
import { getOnTimeLegStats } from '../lead/bookingQueueSeed';
import { useFleetAvailability } from '../hooks/useFleetAvailability';
import { shortDate, type DisclosedCell } from '../../availability/engine/disclosure';

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
export default function ExecutiveDashboard({
  userRole = 'executive',
  additionalRoles = [],
}: { userRole?: string; additionalRoles?: string[] }) {
  const navigate = useNavigate();
  const clock = useOpsClock();
  const { fleet, dispatchable, inFlight } = useUnifiedFleetStatus();
  const { name: viewerName } = actingUser(userRole);

  // The whole availability picture — maintenance windows with a return date, crew coverage,
  // committed trips and scheduling's holds — already disclosed for this viewer. An executive
  // without the full-schedule grant physically cannot receive the operator detail here.
  const { availability, audience, stats, nextOpen, nowUtc: now, trips } =
    useFleetAvailability(userRole, additionalRoles, 14);

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
              style={{ gridTemplateColumns: `88px repeat(${availability.days.length}, minmax(0, 1fr))` }}
            >
              <span />
              {availability.days.map(d => (
                <span key={d.dateUtc} className="gfo-eyebrow text-center text-muted-foreground">
                  {d.dateLabel}
                </span>
              ))}
              {availability.rows.map(row => {
                const ac = fleet.find(a => a.tailNumber === row.tail);
                return (
                  <FleetWeekRowCells
                    key={row.tail}
                    tail={row.tail}
                    ragColor={ac ? RAG_DOT[ac.airworthiness.status] : undefined}
                    cells={row.cells}
                    showSchedule={audience !== 'executive'}
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
          {audience === 'executive-full' && ' · You have full schedule visibility.'}
        </p>
      </GfoPanel>
    </div>
  );
}

function FleetWeekRowCells({
  tail,
  ragColor,
  cells,
  showSchedule,
  onOpenDay,
}: {
  tail: string;
  ragColor?: string;
  cells: DisclosedCell[];
  /** executive-full and operators see the route; a plain executive does not. */
  showSchedule: boolean;
  onOpenDay: (dateUtc: string, tail: string) => void;
}) {
  return (
    <>
      <span className="flex items-center gap-1.5 py-1 text-sm font-medium text-primary">
        {ragColor && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ragColor }} />}
        {tail}
      </span>
      {cells.map(cell => {
        // Every string below comes from the disclosed cell, which composed it from the reason
        // CATEGORY and the return date. Nothing here reaches into the model — that is what stops
        // a defect headline reaching an executive through a tooltip, which is exactly how the
        // previous version of this grid leaked one.
        const title = cell.label ?? undefined;

        if (cell.state === 'available') {
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

        if (cell.category === 'maintenance') {
          // The return date is the point of this cell. Without a block there is none, and saying
          // so is the honest answer (LG-308) — and the prompt for scheduling to book one.
          const hasEtr = Boolean(cell.untilUtc);
          return (
            <span
              key={cell.dateUtc}
              title={title}
              className={`flex min-h-9 flex-col items-center justify-center truncate rounded-md px-1 text-[11px] font-medium ${
                hasEtr ? 'bg-destructive/10 text-destructive' : 'bg-destructive/15 text-destructive'
              }`}
            >
              <span>maint</span>
              <span className="truncate text-[10px] font-normal opacity-80">
                {hasEtr ? `to ${shortDate(cell.untilUtc)}` : 'no return date'}
              </span>
            </span>
          );
        }

        if (cell.category === 'not-in-service') {
          return (
            <span
              key={cell.dateUtc}
              title={title}
              className="flex min-h-9 items-center justify-center truncate rounded-md bg-muted px-1 text-[11px] font-medium text-muted-foreground/70"
            >
              not in svc
            </span>
          );
        }

        if (cell.category === 'held') {
          return (
            <span
              key={cell.dateUtc}
              title={cell.publicLabel ?? title}
              className="flex min-h-9 items-center justify-center truncate rounded-md bg-amber-500/10 px-1 text-[11px] font-medium text-amber-700 dark:text-amber-500"
            >
              held
            </span>
          );
        }

        if (cell.category === 'no-crew') {
          return (
            <span
              key={cell.dateUtc}
              title={title}
              className="flex min-h-9 items-center justify-center truncate rounded-md border border-dashed border-border/60 px-1 text-[11px] text-muted-foreground/50"
            >
              no crew
            </span>
          );
        }

        // committed. The disclosed schedule label is 'TRP-001 · KCVG → KTEB'; at 14 columns only
        // the route half fits, and a truncated trip number reads as noise rather than as
        // information — so the route goes in the cell and the whole label in the tooltip.
        const schedule = showSchedule ? cell.scheduleLabel : null;
        const route = schedule ? (schedule.split(' · ').at(-1) ?? schedule) : null;
        return (
          <span
            key={cell.dateUtc}
            title={schedule ?? title}
            className={`flex min-h-9 items-center justify-center truncate rounded-md px-1 text-[11px] font-medium ${
              route ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            }`}
          >
            {route ?? 'committed'}
          </span>
        );
      })}
    </>
  );
}
