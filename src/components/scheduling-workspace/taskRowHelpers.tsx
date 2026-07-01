import React from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Play, Check, Ban, Unlock, ThumbsUp, MinusCircle } from 'lucide-react';
import type { TaskInstance, TaskAction } from '../../scheduling/engine';

// Status -> Badge classes (theme tokens only, no raw hex).
export function statusBadgeClassName(status: TaskInstance['status']): string {
  switch (status) {
    case 'done': return 'bg-green-600 text-white border-transparent';
    case 'in_progress': return 'bg-blue-600 text-white border-transparent';
    case 'blocked': return 'bg-destructive text-white border-transparent';
    case 'n_a': return 'bg-muted text-muted-foreground border-transparent';
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
    default: return status;
  }
}

export function StatusBadge({ status }: { status: TaskInstance['status'] }) {
  return <Badge className={statusBadgeClassName(status)}>{statusLabel(status)}</Badge>;
}

export function AckBadge({ ackState }: { ackState: TaskInstance['ackState'] }) {
  if (ackState === 'n_a') return null;
  if (ackState === 'acked') {
    return <Badge variant="outline" className="border-green-600 text-green-700 dark:text-green-400">Acked</Badge>;
  }
  return <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-400">Ack pending</Badge>;
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

export function urgencyTextClassName(urgency: RowUrgency): string {
  switch (urgency) {
    case 'overdue': return 'text-destructive font-medium';
    case 'dueSoon': return 'text-amber-600 dark:text-amber-400 font-medium';
    default: return 'text-muted-foreground';
  }
}

interface TaskActionButtonsProps {
  instance: TaskInstance;
  onAction: (action: TaskAction) => void;
  disabled?: boolean;
}

// Shared action-button row for a TaskInstance. Buttons are contextual to status/ackState so
// invalid actions (e.g. complete before ack, ack when not requiresAck) are never offered —
// applyTaskAction() throws on those, so we gate here rather than surface a runtime error.
export function TaskActionButtons({ instance, onAction, disabled }: TaskActionButtonsProps) {
  const settled = instance.status === 'done' || instance.status === 'n_a';
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
