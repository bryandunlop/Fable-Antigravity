import { parseISO } from 'date-fns';
import { computeDueAtUtc } from './dueDates';
import type { TaskInstance } from './types';

const ACTIVE = new Set(['open', 'in_progress', 'blocked']);

export interface TriggerBuckets {
  overdue: TaskInstance[];
  dueSoon: TaskInstance[];
  upcoming: TaskInstance[];
}

export function evaluateTriggers(
  instances: TaskInstance[], nowUtc: string, dueSoonWindowMinutes = 120,
): TriggerBuckets {
  const now = parseISO(nowUtc).getTime();
  const windowMs = dueSoonWindowMinutes * 60_000;
  const out: TriggerBuckets = { overdue: [], dueSoon: [], upcoming: [] };
  for (const t of instances) {
    if (!ACTIVE.has(t.status)) continue;
    const due = parseISO(t.dueAtUtc).getTime();
    if (due < now) out.overdue.push(t);
    else if (due - now <= windowMs) out.dueSoon.push(t);
    else out.upcoming.push(t);
  }
  return out;
}

export interface EscalationFiring {
  taskInstanceId: string;
  notifyRole: string;
  reason: string;
}

export function computeEscalations(
  instances: TaskInstance[], nowUtc: string, officeTzOffsetMinutes: number,
): EscalationFiring[] {
  const now = parseISO(nowUtc).getTime();
  const fired: EscalationFiring[] = [];
  for (const t of instances) {
    if (!t.requiresAck || t.ackState !== 'pending' || !t.escalation) continue;
    const deadline = parseISO(
      computeDueAtUtc(t.escalation.deadline, { nowUtc, officeTzOffsetMinutes }),
    ).getTime();
    if (now >= deadline) {
      fired.push({ taskInstanceId: t.id, notifyRole: t.escalation.notifyRole, reason: 'unacked_past_deadline' });
    }
  }
  return fired;
}
