import { useMemo, useState } from 'react';
import { AlertTriangle, CalendarPlus, Lock } from 'lucide-react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../ui/hover-card';
import { Button } from '../ui/button';
import { GfoPanel } from '../gfo';
import { RAG_DOT } from '../ops-wall/ragColors';
import { categoryLabel, discloseCell } from '../../availability/engine/disclosure';
import type { FleetAvailability, MaintenanceDowntimeBlock, ReleaseSuggestion, SchedulerOverlay, TailDayAvailability } from '../../availability/types';
import type { FleetServiceability } from '../tech-log/bridge';
import { groupConflicts, summarizeAvailability } from './availabilitySelectors';
import { DowntimeDialog } from './DowntimeDialog';
import { HoldDialog } from './HoldDialog';
import { ReleaseSuggestions } from './ReleaseSuggestions';

const CELL_CLASS: Record<TailDayAvailability['state'], string> = {
  available: 'border border-dashed border-border text-muted-foreground/60',
  held: 'bg-amber-500/15 text-amber-700 dark:text-amber-500',
  reserved: 'bg-amber-500/10 text-amber-800 dark:text-amber-400',
  committed: 'bg-primary/10 text-primary',
  unavailable: 'bg-destructive/10 text-destructive',
};

function cellText(cell: TailDayAvailability): string {
  switch (cell.reason.category) {
    case 'none': return 'open';
    case 'maintenance': return cell.reason.untilUtc ? 'maint' : 'maint ?';
    case 'not-in-service': return 'not in svc';
    case 'committed': return cell.openLeg ? `trip · empty ${cell.openLeg.from}→${cell.openLeg.to}` : 'trip';
    case 'held': return 'held';
    case 'reserved': return 'reserved · principal';
    case 'no-crew': return 'no crew';
    // Not a block — the roster for that day does not exist yet. Reads open, says why.
    case 'not-yet-rostered': return 'open · unrostered';
  }
}

/**
 * Scheduling's availability board — the surface that MANAGES the picture the executive view only
 * reads. Three things it does that no other surface can:
 *
 *   1. Books a maintenance window with a return date, which is what stops a grounded tail reading
 *      down-forever everywhere else.
 *   2. Places holds, with the exec-facing sentence written next to the private reason.
 *   3. Works the engine's release suggestions.
 *
 * Every cell shows the FULL ranked reason stack on hover, plus the same cell as an executive would
 * see it — so whoever writes a public label can see what it produces without switching persona.
 */
export function AvailabilityBoard({
  fleet,
  serviceability,
  nowUtc,
  suggestions,
  actor,
  canManage,
  onSaveBlock,
  onAppendOverlay,
}: {
  fleet: FleetAvailability;
  serviceability?: FleetServiceability;
  nowUtc: string;
  suggestions: ReleaseSuggestion[];
  actor: { name: string; role: string };
  /** Scheduling owns downtime, holds and releases (Bryan, 2026-08-31). Lead reads. */
  canManage: boolean;
  onSaveBlock: (block: MaintenanceDowntimeBlock) => void;
  onAppendOverlay: (overlay: SchedulerOverlay) => void;
}) {
  const [downtimeFor, setDowntimeFor] = useState<string | null | undefined>(undefined);
  const [holdFor, setHoldFor] = useState<{ tail: string; dateUtc: string } | null>(null);

  const summary = useMemo(() => summarizeAvailability(fleet), [fleet]);
  const conflictGroups = useMemo(() => groupConflicts(fleet), [fleet]);
  const tails = useMemo(() => fleet.rows.map(r => r.tail), [fleet]);

  return (
    <div className="space-y-4">
      <GfoPanel
        title="Availability"
        action={canManage && (
          <Button size="sm" variant="outline" onClick={() => setDowntimeFor(null)}>
            <CalendarPlus className="mr-1.5 h-4 w-4" /> Book maintenance
          </Button>
        )}
      >
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="grid gap-1" style={{ gridTemplateColumns: `88px repeat(${fleet.days.length}, minmax(0, 1fr))` }}>
              <span />
              {fleet.days.map(d => (
                <span key={d.dateUtc} className="gfo-eyebrow text-center text-muted-foreground">{d.dateLabel}</span>
              ))}

              {fleet.rows.map(row => (
                <BoardRow
                  key={row.tail}
                  tail={row.tail}
                  ragColor={serviceability?.[row.tail] ? RAG_DOT[serviceability[row.tail]] : undefined}
                  cells={row.cells}
                  canManage={canManage}
                  onHold={(tail, dateUtc) => setHoldFor({ tail, dateUtc })}
                  onBookDowntime={tail => setDowntimeFor(tail)}
                />
              ))}
            </div>
          </div>
        </div>

        <p className="mt-3 border-t border-border pt-3 text-sm text-muted-foreground">
          {summary.openTailDays} of {summary.totalTailDays} tail-days open
          {' · '}{summary.tailsDown} tail{summary.tailsDown === 1 ? '' : 's'} down
          {' · '}{summary.heldTailDays} held
          {' · '}{summary.daysWithNoCrew} day{summary.daysWithNoCrew === 1 ? '' : 's'} with no crew
        </p>

        {summary.tailsDownWithoutEtr.length > 0 && (
          <p className="mt-2 flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            <span>
              {summary.tailsDownWithoutEtr.join(', ')} {summary.tailsDownWithoutEtr.length === 1 ? 'is' : 'are'} grounded
              with no booked return — every executive sees “no return date” until a window is booked.
            </span>
          </p>
        )}
      </GfoPanel>

      <GfoPanel title="Release suggestions">
        <ReleaseSuggestions
          suggestions={suggestions}
          nowUtc={nowUtc}
          actor={actor}
          canApprove={canManage}
          onDecide={onAppendOverlay}
        />
      </GfoPanel>

      {conflictGroups.length > 0 && (
        <GfoPanel title={`Conflicts to resolve (${summary.conflictCount})`}>
          <div className="space-y-3">
            {conflictGroups.map(group => (
              <div key={group.kind}>
                <p className="text-sm font-medium text-primary">{group.label}</p>
                <ul className="mt-1 space-y-0.5">
                  {group.items.slice(0, 6).map((c, i) => (
                    <li key={`${c.tail}-${c.dateUtc}-${i}`} className="text-sm text-muted-foreground">
                      {c.tail} · {c.dateUtc} — {c.detail}
                    </li>
                  ))}
                  {group.items.length > 6 && (
                    <li className="text-xs text-muted-foreground">
                      + {group.items.length - 6} more
                    </li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        </GfoPanel>
      )}

      {downtimeFor !== undefined && (
        <DowntimeDialog
          open
          tail={downtimeFor}
          tails={tails}
          nowUtc={nowUtc}
          onClose={() => setDowntimeFor(undefined)}
          onSave={onSaveBlock}
        />
      )}

      {holdFor && (
        <HoldDialog
          open
          tail={holdFor.tail}
          fromDateUtc={holdFor.dateUtc}
          nowUtc={nowUtc}
          actor={actor}
          onClose={() => setHoldFor(null)}
          onSave={onAppendOverlay}
        />
      )}
    </div>
  );
}

function BoardRow({
  tail,
  ragColor,
  cells,
  canManage,
  onHold,
  onBookDowntime,
}: {
  tail: string;
  ragColor?: string;
  cells: TailDayAvailability[];
  canManage: boolean;
  onHold: (tail: string, dateUtc: string) => void;
  onBookDowntime: (tail: string) => void;
}) {
  return (
    <>
      <span className="flex items-center gap-1.5 py-1 text-sm font-medium text-primary">
        {ragColor && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ragColor }} />}
        {tail}
      </span>
      {cells.map(cell => {
        const execView = discloseCell(cell, 'executive');
        return (
          <HoverCard key={cell.dateUtc} openDelay={120}>
            <HoverCardTrigger asChild>
              <button
                type="button"
                onClick={() => canManage && cell.state === 'available' && onHold(tail, cell.dateUtc)}
                className={`flex min-h-9 items-center justify-center truncate rounded-md px-1 text-[11px] font-medium ${CELL_CLASS[cell.state]} ${
                  canManage && cell.state === 'available' ? 'transition-colors hover:border-primary hover:text-primary' : ''
                }`}
              >
                {cellText(cell)}
              </button>
            </HoverCardTrigger>
            <HoverCardContent className="w-80 space-y-2 text-sm">
              <p className="font-medium text-primary">{tail} · {cell.dateUtc}</p>

              <div>
                <p className="gfo-eyebrow text-muted-foreground">Why</p>
                <ul className="mt-0.5 space-y-0.5">
                  {cell.reasons.map((r, i) => (
                    <li key={`${r.category}-${i}`} className={i === 0 ? 'text-primary' : 'text-muted-foreground'}>
                      {i === 0 ? '▸ ' : '· '}{r.category}{r.detail ? ` — ${r.detail}` : ''}
                    </li>
                  ))}
                </ul>
              </div>

              <p className="text-xs text-muted-foreground">
                {cell.crew.rostered
                  ? `Crew: ${cell.crew.crewsFormable} formable · ${cell.crew.crewsCommitted} committed`
                  : 'Crew: roster not published this far ahead'}
              </p>

              {cell.overlay && (
                <p className="text-xs text-muted-foreground">
                  {cell.overlay.kind} by {cell.overlay.by} ({cell.overlay.byRole})
                  {cell.overlay.note ? ` — ${cell.overlay.note}` : ''}
                </p>
              )}

              {cell.conflicts.length > 0 && (
                <p className="flex items-start gap-1.5 text-xs text-destructive">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                  <span>{cell.conflicts.map(c => c.detail).join(' · ')}</span>
                </p>
              )}

              <div className="border-t border-border pt-2">
                <p className="gfo-eyebrow text-muted-foreground">What the executive sees</p>
                <p className="text-sm">
                  {execView.label ?? categoryLabel('none', null) ?? 'Open — available to request'}
                </p>
              </div>

              {canManage && cell.reason.category === 'maintenance' && !cell.reason.untilUtc && (
                <Button size="sm" variant="outline" className="w-full" onClick={() => onBookDowntime(tail)}>
                  <CalendarPlus className="mr-1.5 h-3.5 w-3.5" /> Book a return date
                </Button>
              )}
              {canManage && cell.state === 'available' && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Lock className="h-3 w-3" aria-hidden /> Click the cell to hold this day.
                </p>
              )}
            </HoverCardContent>
          </HoverCard>
        );
      })}
    </>
  );
}
