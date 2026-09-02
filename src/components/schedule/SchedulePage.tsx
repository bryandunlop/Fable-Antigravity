// The schedule page — the first thing an executive gets before the booking portal exists (D104).
//
// One month calendar, two views, one engine:
//   Open days  — one number per day: how many of the four are free. Never which ones.
//   Fleet      — the same days with the four tails drawn in, so the CEO and the people who
//                oversee the department can see where the aeroplanes are going.
// Both are the availability engine at a disclosure level; what a chip is allowed to say is
// decided in src/availability/engine/disclosure.ts, not here. A plain executive's "away" chip
// carries no route; the full-schedule grant and operators see it.
//
// Scheduling gets the same page as the operator audience plus one verb — block a day — which
// places an append-only hold through the same store the scheduling command board uses. Releasing
// stays where the engine proposes it (the command board), so a release always carries a reason.
//
// Bryan, 2026-09-01: "we deliver both and see what ends up being used."

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Eye, Send } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../ui/utils';
import { GfoPageHeader, GfoPanel } from '../gfo';
import { monthGrid, addMonths, dayKey } from '../inflight/tripCalendar';
import { useSchedulingWorkspace } from '../scheduling-workspace/SchedulingWorkspaceContext';
import { audienceFor, useTrips } from '../hooks/useFleetAvailability';
import { actingUser } from '../safety-center/actingUser';
import { HoldDialog } from '../scheduling-command/HoldDialog';
import { appendOverlay, readFleetAvailability } from '../../availability/source';
import { freeCountByDay, averageFreePerDay, type DayFreeCount } from '../../availability/engine/freeCount';
import { coreFleetByDay, chipWord } from '../../availability/engine/monthView';
import { CORE_FLEET_SIZE } from '../../fleet/registry';
import type { Audience, SchedulerOverlay } from '../../availability/types';
import type { DisclosedCell } from '../../availability/engine/disclosure';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** EAs plan from two days out to fifteen months out. The strip has to reach the far end. */
const STRIP_MONTHS = 15;
const DAY_MS = 86_400_000;
const MAX_HORIZON_DAYS = 500;

type View = 'open-days' | 'fleet';

function horizonThrough(nowUtc: string, last: { year: number; month: number }): number {
  const from = Date.parse(`${nowUtc.slice(0, 10)}T00:00:00.000Z`);
  // Six weeks past the final month's start covers the trailing days a six-week grid borrows.
  const to = Date.UTC(last.year, last.month + 1, 7);
  return Math.min(MAX_HORIZON_DAYS, Math.max(1, Math.floor((to - from) / DAY_MS) + 1));
}

const monthKey = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, '0')}`;

export default function SchedulePage({
  userRole = 'executive',
  additionalRoles = [],
}: { userRole?: string; additionalRoles?: string[] }) {
  const navigate = useNavigate();
  const { nowUtc } = useSchedulingWorkspace();
  const trips = useTrips();
  const now = nowUtc();
  const today = useMemo(() => new Date(), []);
  const actor = actingUser(userRole);

  const realAudience = useMemo(() => audienceFor(userRole, additionalRoles), [userRole, additionalRoles]);
  const canBlock = realAudience === 'operator' && ['scheduling', 'admin'].includes(userRole);
  // Scheduling can look at the page the way an executive does, to check what a hold's public
  // sentence produces without switching persona.
  const [previewAsExecutive, setPreviewAsExecutive] = useState(false);
  const audience: Audience = previewAsExecutive ? 'executive' : realAudience;

  const [view, setView] = useState<View>(realAudience === 'executive' ? 'open-days' : 'fleet');
  const [cursor, setCursor] = useState(() => ({ year: today.getFullYear(), month: today.getMonth() }));
  const [holdFor, setHoldFor] = useState<{ tail: string; dateUtc: string } | null>(null);
  // Bumped after a hold is appended so the derived picture recomputes from the store.
  const [version, setVersion] = useState(0);

  const months = useMemo(
    () => Array.from({ length: STRIP_MONTHS }, (_, i) => addMonths(today.getFullYear(), today.getMonth(), i)),
    [today],
  );

  const fleet = useMemo(
    () => readFleetAvailability({ trips }, now, horizonThrough(now, months[months.length - 1])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trips, now, months, version],
  );
  const counts = useMemo(() => freeCountByDay(fleet), [fleet]);
  const countByDate = useMemo(() => Object.fromEntries(counts.map(c => [c.dateUtc, c])), [counts]);
  const tailsByDate = useMemo(() => coreFleetByDay(fleet, audience), [fleet, audience]);
  const stripAverages = useMemo(() => {
    const out: Record<string, number> = {};
    for (const m of months) {
      const k = monthKey(m.year, m.month);
      out[k] = averageFreePerDay(counts.filter(c => c.dateUtc.startsWith(k)));
    }
    return out;
  }, [counts, months]);

  const weeks = useMemo(() => monthGrid(cursor.year, cursor.month, today), [cursor, today]);
  const cursorKey = monthKey(cursor.year, cursor.month);
  const monthCounts = counts.filter(c => c.dateUtc.startsWith(cursorKey));
  const monthAverage = averageFreePerDay(monthCounts);
  const monthProvisional = monthCounts.some(c => c.confidence === 'provisional');

  function step(delta: number) {
    const idx = months.findIndex(m => m.year === cursor.year && m.month === cursor.month);
    const next = months[Math.min(months.length - 1, Math.max(0, idx + delta))];
    if (next) setCursor(next);
  }

  function askEa(dateUtc: string, tail?: string) {
    navigate('/booking-portal/requests/new', {
      state: { dates: [dateUtc], fromExecutive: tail ? { tail, dateUtc } : undefined },
    });
  }

  function saveHold(overlay: SchedulerOverlay) {
    appendOverlay(overlay, now);
    setVersion(v => v + 1);
  }

  const firstName = actor.name.split(' ')[0];

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 p-6">
      <GfoPageHeader
        eyebrow={canBlock ? 'Scheduling · fleet schedule' : `Schedule · ${firstName}`}
        title={`${MONTH_NAMES[cursor.month]} ${cursor.year}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canBlock && (
              <Button
                size="sm"
                variant={previewAsExecutive ? 'default' : 'outline'}
                onClick={() => setPreviewAsExecutive(p => !p)}
                title="See this month the way a plain executive does"
              >
                <Eye className="mr-1.5 h-4 w-4" />
                {previewAsExecutive ? 'Viewing as executive' : 'View as executive'}
              </Button>
            )}
            <div className="flex rounded-md border border-border p-0.5" role="tablist" aria-label="View">
              {(['open-days', 'fleet'] as View[]).map(v => (
                <button
                  key={v}
                  role="tab"
                  aria-selected={view === v}
                  onClick={() => setView(v)}
                  className={cn(
                    'rounded px-3 py-1 text-sm transition-colors',
                    view === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-primary',
                  )}
                >
                  {v === 'open-days' ? 'Open days' : 'Fleet'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" onClick={() => step(-1)} aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></Button>
              <Button size="sm" variant="outline" onClick={() => setCursor({ year: today.getFullYear(), month: today.getMonth() })}>Today</Button>
              <Button size="sm" variant="outline" onClick={() => step(1)} aria-label="Next month"><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        }
      />

      {/* Month strip — aim at a month before arriving in it */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {months.map(m => {
          const k = monthKey(m.year, m.month);
          const active = k === cursorKey;
          return (
            <button
              key={k}
              onClick={() => setCursor(m)}
              className={cn(
                'min-w-[84px] shrink-0 rounded-md border px-2 py-1.5 text-left transition-colors',
                active ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
              )}
            >
              <span className="block text-xs font-medium text-primary">
                {MONTH_NAMES[m.month].slice(0, 3)}{m.year !== today.getFullYear() ? ` '${String(m.year).slice(2)}` : ''}
              </span>
              <span className="block text-[11px] tabular-nums text-muted-foreground">
                {stripAverages[k]} free/day
              </span>
            </button>
          );
        })}
      </div>

      <GfoPanel className="p-0">
        <div className="grid grid-cols-7 border-b border-border">
          {DAY_LABELS.map(d => (
            <span key={d} className="gfo-eyebrow px-2 py-1.5 text-muted-foreground">{d}</span>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-border last:border-b-0">
            {week.map(day => {
              const count = countByDate[day.key];
              const tails = tailsByDate[day.key];
              const past = day.date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
              return (
                <DayCell
                  key={day.key}
                  dayNumber={day.day}
                  inMonth={day.inMonth}
                  isToday={day.isToday}
                  past={past}
                  view={view}
                  count={count}
                  tails={tails}
                  audience={audience}
                  canBlock={canBlock && !previewAsExecutive}
                  onAskEa={() => askEa(day.key, tails?.find(t => t.state === 'available')?.tail)}
                  onBlock={tail => setHoldFor({ tail, dateUtc: day.key })}
                />
              );
            })}
          </div>
        ))}
        <p className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
          {MONTH_NAMES[cursor.month]} averages {monthAverage} of {CORE_FLEET_SIZE} aircraft free per day
          {monthProvisional && ' · the crew roster is not published this far ahead, so far-out days are a plan, not a promise'}
          {' · '}open means airworthy, unscheduled, and a crew is free.
          {audience === 'executive' && ' Tap a day and your EA takes it from there.'}
          {canBlock && !previewAsExecutive && ' Tap an open tail to block it; releases are approved on the scheduling board.'}
        </p>
      </GfoPanel>

      {holdFor && (
        <HoldDialog
          open
          tail={holdFor.tail}
          fromDateUtc={holdFor.dateUtc}
          nowUtc={now}
          actor={{ name: actor.name, role: userRole }}
          onClose={() => setHoldFor(null)}
          onSave={saveHold}
        />
      )}
    </div>
  );
}

function DayCell({
  dayNumber, inMonth, isToday, past, view, count, tails, audience, canBlock, onAskEa, onBlock,
}: {
  dayNumber: number;
  inMonth: boolean;
  isToday: boolean;
  past: boolean;
  view: View;
  count: DayFreeCount | undefined;
  tails: DisclosedCell[] | undefined;
  audience: Audience;
  canBlock: boolean;
  onAskEa: () => void;
  onBlock: (tail: string) => void;
}) {
  const free = count?.free ?? 0;
  const known = Boolean(count) && !past;
  const askable = audience !== 'operator' && known && free > 0;

  return (
    <div
      className={cn(
        'min-h-[92px] border-r border-border p-1.5 last:border-r-0',
        !inMonth && 'bg-muted/30',
        past && 'opacity-50',
      )}
    >
      <div className="flex items-baseline justify-between">
        <span
          className={cn(
            'text-xs tabular-nums',
            isToday ? 'rounded-full bg-primary px-1.5 font-medium text-primary-foreground' : 'text-muted-foreground',
            !inMonth && 'text-muted-foreground/50',
          )}
        >
          {dayNumber}
        </span>
        {view === 'fleet' && known && (
          <span className="text-[10px] tabular-nums text-muted-foreground">{free}/{count!.fleetSize}</span>
        )}
      </div>

      {view === 'open-days' && known && (
        <button
          type="button"
          disabled={!askable}
          onClick={onAskEa}
          title={askable ? 'Ask your EA to request this day' : undefined}
          className={cn(
            'mt-2 w-full rounded-md py-2 text-center transition-colors',
            free === 0 && 'bg-destructive/10 text-destructive',
            free > 0 && free < count!.fleetSize && 'bg-amber-500/10 text-amber-800 dark:text-amber-400',
            free === count!.fleetSize && 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-400',
            askable && 'hover:ring-1 hover:ring-primary',
            count!.confidence === 'provisional' && 'opacity-70',
          )}
        >
          <span className="block text-lg font-medium leading-none tabular-nums">{free === 0 ? 'none' : free}</span>
          <span className="block text-[10px]">{free === 0 ? 'open' : free === 1 ? 'aircraft open' : 'open'}</span>
        </button>
      )}

      {view === 'fleet' && known && tails && (
        <div className="mt-1.5 space-y-0.5">
          {tails.map(cell => (
            <TailChip
              key={cell.tail}
              cell={cell}
              showRoute={audience !== 'executive'}
              action={
                canBlock && cell.state === 'available'
                  ? () => onBlock(cell.tail)
                  : audience !== 'operator' && cell.state === 'available'
                    ? onAskEa
                    : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Route abbreviation for an executive-full/operator "away" chip: 'TRP-002 · KCVG → KTEB' → 'KTEB'. */
function destinationOf(scheduleLabel: string | null | undefined): string | null {
  if (!scheduleLabel) return null;
  const arrow = scheduleLabel.split('→');
  return arrow.length > 1 ? arrow[arrow.length - 1].trim().slice(0, 4) : null;
}

function TailChip({ cell, showRoute, action }: { cell: DisclosedCell; showRoute: boolean; action?: () => void }) {
  // Every string here comes from the DISCLOSED cell. Nothing reaches the model.
  const word = chipWord(cell);
  const dest = showRoute && cell.category === 'committed' ? destinationOf(cell.scheduleLabel) : null;
  const title = cell.publicLabel ?? cell.label ?? undefined;
  const tone =
    cell.state === 'available'
      ? 'border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary'
      : cell.category === 'maintenance'
        ? 'bg-destructive/10 text-destructive'
        : cell.category === 'held'
          ? 'bg-amber-500/10 text-amber-800 dark:text-amber-400'
          : cell.category === 'committed'
            ? 'bg-muted text-foreground/80'
            : 'bg-muted text-muted-foreground/70';

  const body = (
    <>
      <span className="font-medium">{cell.tail.replace(/^N/, '')}</span>
      <span className="truncate">{dest ?? word}</span>
    </>
  );

  if (action) {
    return (
      <button type="button" onClick={action} title={title} className={cn('flex w-full items-center justify-between rounded px-1.5 py-0.5 text-[11px] leading-tight transition-colors', tone)}>
        {body}
      </button>
    );
  }
  return (
    <span title={title} className={cn('flex w-full items-center justify-between rounded px-1.5 py-0.5 text-[11px] leading-tight', tone)}>
      {body}
    </span>
  );
}
