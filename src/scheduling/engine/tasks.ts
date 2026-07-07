import type { TaskInstance, AuditEntry, TaskStatus, ReTrigger } from './types';

export type TaskAction =
  | { kind: 'start' }
  | { kind: 'complete' }
  | { kind: 'block'; reason: string }
  | { kind: 'unblock' }
  | { kind: 'ack' }
  | { kind: 'markNa' }
  | { kind: 'note'; text: string }
  | { kind: 'reopen'; change: ReTrigger; detail?: string; newEtdUtc?: string; newDueAtUtc?: string };

function withAudit(inst: TaskInstance, entry: AuditEntry): TaskInstance {
  return { ...inst, auditTrail: [...inst.auditTrail, entry] };
}

export function applyTaskAction(
  instance: TaskInstance, action: TaskAction, actor: string, nowUtc: string,
): TaskInstance {
  const audit = (act: string, detail?: string): AuditEntry => ({ atUtc: nowUtc, actor, action: act, detail });

  switch (action.kind) {
    case 'start':
      return withAudit({ ...instance, status: 'in_progress' as TaskStatus }, audit('status:in_progress'));
    case 'complete':
      if (instance.requiresAck && instance.ackState !== 'acked') {
        throw new Error('Cannot complete: task requires ack and is not acked');
      }
      return withAudit(
        { ...instance, status: 'done', completedBy: actor, completedAtUtc: nowUtc, reflag: undefined },
        audit('status:done'),
      );
    case 'block':
      return withAudit({ ...instance, status: 'blocked' }, audit('status:blocked', action.reason));
    case 'unblock':
      return withAudit({ ...instance, status: 'open' }, audit('status:open'));
    case 'ack':
      if (!instance.requiresAck) throw new Error('Task does not require ack');
      return withAudit(
        { ...instance, ackState: 'acked', ackedBy: actor, ackedAtUtc: nowUtc },
        audit('ack'),
      );
    case 'markNa':
      return withAudit({ ...instance, status: 'n_a' }, audit('status:n_a'));
    case 'note':
      return withAudit({ ...instance, notes: action.text }, audit('note', action.text));
    case 'reopen':
      // A completed/acked task whose trip changed underneath it. Reset completion + ack (which
      // re-arms computeEscalations), refresh the ETD/due anchor, and flag it for the badge.
      return withAudit(
        {
          ...instance,
          status: 'open',
          ackState: instance.requiresAck ? 'pending' : 'n_a',
          ackedBy: undefined,
          ackedAtUtc: undefined,
          completedBy: undefined,
          completedAtUtc: undefined,
          etdUtc: action.newEtdUtc ?? instance.etdUtc,
          dueAtUtc: action.newDueAtUtc ?? instance.dueAtUtc,
          reflag: { change: action.change },
        },
        audit(`reopened:${action.change}`, action.detail),
      );
    default: {
      const _exhaustive: never = action;
      throw new Error(`Unknown TaskAction kind: ${String((action as { kind?: unknown }).kind)}`);
    }
  }
}
