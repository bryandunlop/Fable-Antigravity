/**
 * The checklist as a rail (LG-259 leg rail + NOW marker), shared by the command center's drawer and
 * the trip workspace's Checklist tab (D110 slice 2). A row can carry what it is bound to (leg,
 * person, crew), the document gates that ride on it, and the booking's cutoffs sit on the rail as
 * markers among the whole-trip items.
 */
import type { ReactNode } from 'react';
import { CheckCheck, ChevronDown, ChevronRight, Flag, Milestone, RotateCcw } from 'lucide-react';
import { Button } from '../ui/button';
import { StatusBadge, AckBadge, TaskActionButtons, formatDueTime } from '../scheduling-workspace/taskRowHelpers';
import type { TaskInstance, TaskAction, ReTrigger } from '../../scheduling/engine';
import { railEntries, type JourneySection, type RailMarker } from './checklistJourney';

const REFLAG_LABEL: Record<ReTrigger, string> = {
  legScheduleChange: 'Schedule moved since cleared',
  aircraftChange: 'Tail changed since cleared',
  passengerChange: 'Pax changed since cleared',
};

export function CategoryChip({ category }: { category: string }) {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted rounded-full px-2 py-0.5">
      {category.replace(/-/g, ' ')}
    </span>
  );
}

/** A binding chip — what the item is about. */
export function BoundChip({ inst, onOpen }: { inst: TaskInstance; onOpen?: (b: NonNullable<TaskInstance['boundTo']>) => void }) {
  const b = inst.boundTo;
  if (!b) return null;
  const cls = 'text-[10px] font-semibold rounded px-1.5 py-0.5 bg-[var(--gfo-daylight,#0096FC)]/10 text-[var(--gfo-midnight,#142D7E)] dark:text-[var(--gfo-daylight-light,#7FCCFE)]';
  return onOpen
    ? <button type="button" className={`${cls} hover:underline`} onClick={() => onOpen(b)}>{b.label}</button>
    : <span className={cls}>{b.label}</span>;
}

export type RowDecoration = (inst: TaskInstance) => ReactNode;

function TaskRow({ inst, onAction, decorate }: { inst: TaskInstance; onAction: (id: string, a: TaskAction) => void; decorate?: RowDecoration }) {
  const blocked = inst.status === 'blocked';
  return (
    <div
      id={`drawer-task-${inst.id}`}
      className={`flex items-center justify-between gap-4 border rounded-md p-3 transition-shadow ${blocked ? 'border-[var(--gfo-error,#EF3340)]/40 bg-[var(--gfo-error,#EF3340)]/5' : ''}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-foreground">{inst.title}</span>
          <CategoryChip category={inst.category} />
          <StatusBadge status={inst.status} />
          {inst.requiresAck && <AckBadge ackState={inst.ackState} />}
          {decorate?.(inst)}
        </div>
        <div className="text-xs mt-1 text-muted-foreground">
          Owner: {inst.ownerRole} · Due {formatDueTime(inst.dueAtUtc)}
          {inst.handoffTarget && ` · Hands off to ${inst.handoffTarget.value}`}
          {inst.notes && ` · "${inst.notes}"`}
        </div>
      </div>
      <TaskActionButtons instance={inst} onAction={a => onAction(inst.id, a)} />
    </div>
  );
}

/** A settled task carrying a D89 ADVISORY flag: visible, amber, never demanding. The scheduler
 * dismisses it (the clear still stands) or explicitly redoes the task — their judgment. */
function FlaggedRow({ inst, onAction }: { inst: TaskInstance; onAction: (id: string, a: TaskAction) => void }) {
  const change = inst.reflag!.change;
  return (
    <div
      id={`drawer-task-${inst.id}`}
      className="flex items-center justify-between gap-4 border rounded-md p-3 border-[var(--gfo-warning,#F1B434)]/60 bg-[var(--gfo-warning,#F1B434)]/5"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-foreground">{inst.title}</span>
          <CategoryChip category={inst.category} />
          <StatusBadge status={inst.status} />
          <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wide uppercase text-[#92650a] bg-[var(--gfo-warning,#F1B434)]/20 rounded-full px-2 py-0.5">
            <Flag className="h-2.5 w-2.5" /> {REFLAG_LABEL[change]}
          </span>
        </div>
        <div className="text-xs mt-1 text-muted-foreground">
          Cleared {inst.completedAtUtc ? formatDueTime(inst.completedAtUtc) : 'earlier'} · advisory — the clear stands unless you say otherwise
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <Button size="sm" variant="outline" onClick={() => onAction(inst.id, { kind: 'clearReflag' })}>
          <CheckCheck className="h-3.5 w-3.5 mr-1" /> Dismiss
        </Button>
        <Button size="sm" variant="outline" onClick={() => onAction(inst.id, { kind: 'reopen', change, detail: 'scheduler chose to redo' })}>
          <RotateCcw className="h-3.5 w-3.5 mr-1" /> Redo
        </Button>
      </div>
    </div>
  );
}

function MarkerRow({ marker }: { marker: RailMarker }) {
  const passed = marker.state === 'passed';
  return (
    <div className={`flex items-center gap-2 rounded-md border border-dashed px-3 py-1.5 text-xs ${passed ? 'border-border text-muted-foreground' : 'border-[var(--gfo-sunrise,#D1AC6B)] text-[var(--gfo-sunrise-deep,#B8913D)]'}`} aria-label={`${marker.label} cutoff`}>
      <Milestone className="h-3.5 w-3.5 shrink-0" />
      <span className="font-semibold">{marker.label}</span>
      <span className={passed ? '' : 'text-foreground'}>{formatDueTime(marker.atUtc)}</span>
      <span className="text-muted-foreground">· a booking cutoff, not an item{passed ? ' · passed' : ''}{marker.note ? ` · ${marker.note}` : ''}</span>
    </div>
  );
}

export function JourneySectionBlock({ section, ledgeOpen, onToggleLedge, onAction, decorate }: {
  section: JourneySection;
  ledgeOpen: boolean;
  onToggleLedge: () => void;
  onAction: (id: string, a: TaskAction) => void;
  /** Extra chips on an open row — the binding, a gate badge. */
  decorate?: RowDecoration;
}) {
  const done = section.cleared.length;
  const allSettled = section.open.length === 0 && section.flagged.length === 0;
  return (
    <div className="relative pl-6">
      {/* the rail */}
      <div className="absolute left-[7px] top-1 bottom-1 w-0.5 bg-muted rounded" />
      <span className={`absolute left-0 top-0.5 w-3.5 h-3.5 rounded-full border-2 box-border bg-background ${allSettled ? 'border-[var(--gfo-success,#00B140)] bg-[var(--gfo-success,#00B140)]' : 'border-[var(--gfo-midnight,#142D7E)]'}`} />
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-sm font-semibold">
          {section.kind === 'trip' ? 'Whole trip' : `Leg ${section.sequence} · ${section.departureIcao} → ${section.arrivalIcao}`}
        </span>
        {section.kind === 'leg' && section.departureTimeUtc && (
          <span className="text-xs text-muted-foreground">
            dep {formatDueTime(section.departureTimeUtc)}{typeof section.paxCount === 'number' ? ` · ${section.paxCount} pax` : ''}
          </span>
        )}
      </div>
      <div className="space-y-2">
        {done > 0 && (
          <button
            onClick={onToggleLedge}
            className="w-full flex items-center gap-2 border border-dashed rounded-md px-3 py-1.5 text-left hover:bg-accent transition-colors"
          >
            <CheckCheck className="h-3.5 w-3.5 text-[var(--gfo-success,#00B140)] shrink-0" />
            <span className="text-xs text-muted-foreground truncate">
              {done} cleared — {section.cleared.slice(0, 3).map(t => t.title).join(', ')}{done > 3 ? `, +${done - 3} more` : ''}
            </span>
            {ledgeOpen
              ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-auto shrink-0" />
              : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-auto shrink-0" />}
          </button>
        )}
        {ledgeOpen && section.cleared.map(inst => <TaskRow key={inst.id} inst={inst} onAction={onAction} />)}
        {section.flagged.map(inst => <FlaggedRow key={inst.id} inst={inst} onAction={onAction} />)}
        {railEntries(section).map(e => e.kind === 'item'
          ? <TaskRow key={e.item.id} inst={e.item} onAction={onAction} decorate={decorate} />
          : <MarkerRow key={`marker-${e.marker.key}`} marker={e.marker} />)}
      </div>
    </div>
  );
}
