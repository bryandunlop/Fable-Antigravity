import React from 'react';
import { Button } from '../ui/button';
import { Play, Check, Ban, Unlock, ThumbsUp, MinusCircle } from 'lucide-react';
import type { TaskInstance, TaskAction } from '../../scheduling/engine';

// Status -> badge classes. Uses the app's semantic status-* tokens (see src/index.css) rather
// than raw Tailwind palette colors, so dark mode + theming stay centralized. Rendered as a
// plain <span className="status-badge ..."> rather than through the shadcn Badge component:
// Badge's cva variants (e.g. bg-primary/text-foreground) live in Tailwind's utilities layer,
// which beats status-*'s @layer base rules regardless of class order, so Badge would silently
// override the token colors. This matches the existing status-* usage elsewhere in the app
// (see src/components/inventory-v2/shared/ItemCard.tsx and friends).
export function statusBadgeClassName(status: TaskInstance['status']): string {
  switch (status) {
    case 'done': return 'status-success';
    case 'in_progress': return 'status-info';
    case 'blocked': return 'status-error';
    case 'n_a': return 'bg-muted text-muted-foreground border-transparent';
    case 'cancelled': return 'bg-muted text-muted-foreground border-transparent line-through';
    case 'open':
    default: return 'bg-secondary text-secondary-foreground border-transparent';
  }
}

export function statusLabel(status: TaskInstance['status']): string {
  switch (status) {
    case 'open': return 'Open';
    case 'in_progress': return 'In Progress';
    case 'blocked': return 'Blocked';
    case 'done': return 'Done';
    case 'n_a': return 'N/A';
    case 'cancelled': return 'Cancelled';
    default: return status;
  }
}

export function StatusBadge({ status }: { status: TaskInstance['status'] }) {
  return <span className={`status-badge ${statusBadgeClassName(status)}`}>{statusLabel(status)}</span>;
}

/** For a per-airport instance, a short "KBOS arrival" suffix; null for trip-level tasks. */
export function airportLabel(inst: Pick<TaskInstance, 'airportIcao' | 'airportRole'>): string | null {
  if (!inst.airportIcao) return null;
  return inst.airportRole ? `${inst.airportIcao} ${inst.airportRole}` : inst.airportIcao;
}

export function AckBadge({ ackState }: { ackState: TaskInstance['ackState'] }) {
  if (ackState === 'n_a') return null;
  if (ackState === 'acked') {
    return <span className="status-badge status-success">Acked</span>;
  }
  return <span className="status-badge status-warning">Ack pending</span>;
}

export function formatDueTime(dueAtUtc: string): string {
  try {
    return new Date(dueAtUtc).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  } catch {
    return dueAtUtc;
  }
}

// Row urgency (matches evaluateTriggers buckets): overdue (red), dueSoon (amber), else neutral.
export type RowUrgency = 'overdue' | 'dueSoon' | 'upcoming' | 'settled';

// Note: overdue/dueSoon reuse the .status-error/.status-warning tokens (bg+text+border) even
// though this is applied to a plain text line rather than a badge — there's no bare
// text-only warning/error token in the design system today, and the instruction is to avoid
// raw palette colors here. Rendered inline (px-1.5 rounded) it still reads as a subtle chip.
export function urgencyTextClassName(urgency: RowUrgency): string {
  switch (urgency) {
    case 'overdue': return 'status-error font-medium px-1.5 py-0.5 rounded inline-block';
    case 'dueSoon': return 'status-warning font-medium px-1.5 py-0.5 rounded inline-block';
    default: return 'text-muted-foreground';
  }
}

interface TaskActionButtonsProps {
  // Structural Pick so both full TaskInstances and the command-center's BoardTask projection fit.
  instance: Pick<TaskInstance, 'status' | 'requiresAck' | 'ackState'>;
  onAction: (action: TaskAction) => void;
  disabled?: boolean;
}

// Shared action-button row for a TaskInstance. Buttons are contextual to status/ackState so
// invalid actions (e.g. complete before ack, ack when not requiresAck) are never offered.
// The engine (applyTaskAction()) only throws on two cases: (1) `complete` while an
// ack-required task isn't yet acked, and (2) `ack` on a task that doesn't requireAck — it does
// not validate every status transition. This button gating is therefore the primary guard for
// all other transitions (e.g. blocking an already-done task), not a defense against an engine
// that rejects everything invalid.
export function TaskActionButtons({ instance, onAction, disabled }: TaskActionButtonsProps) {
  const settled = instance.status === 'done' || instance.status === 'n_a' || instance.status === 'cancelled';
  if (settled) return null;

  const canAck = instance.requiresAck && instance.ackState === 'pending';
  const canComplete = instance.status !== 'blocked' && (!instance.requiresAck || instance.ackState === 'acked');

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {instance.status === 'open' && (
        <Button size="sm" variant="outline" disabled={disabled} onClick={() => onAction({ kind: 'start' })}>
          <Play className="h-3.5 w-3.5 mr-1" /> Start
        </Button>
      )}
      {canAck && (
        <Button size="sm" variant="outline" disabled={disabled} onClick={() => onAction({ kind: 'ack' })}>
          <ThumbsUp className="h-3.5 w-3.5 mr-1" /> Ack
        </Button>
      )}
      {canComplete && (
        <Button size="sm" disabled={disabled} onClick={() => onAction({ kind: 'complete' })}>
          <Check className="h-3.5 w-3.5 mr-1" /> Complete
        </Button>
      )}
      {instance.status === 'blocked' ? (
        <Button size="sm" variant="outline" disabled={disabled} onClick={() => onAction({ kind: 'unblock' })}>
          <Unlock className="h-3.5 w-3.5 mr-1" /> Unblock
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => onAction({ kind: 'block', reason: 'Blocked from workspace' })}
        >
          <Ban className="h-3.5 w-3.5 mr-1" /> Block
        </Button>
      )}
      <Button size="sm" variant="ghost" disabled={disabled} onClick={() => onAction({ kind: 'markNa' })}>
        <MinusCircle className="h-3.5 w-3.5 mr-1" /> N/A
      </Button>
    </div>
  );
}

