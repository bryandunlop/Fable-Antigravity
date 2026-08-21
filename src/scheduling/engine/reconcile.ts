// Pure reconcile (Phase 2): given the live instances, the freshly-desired instance set, and a
// trip diff, decide what to create / cancel / re-flag / re-time. The desired set is a KEY / SHAPE /
// TIMING source only — a surviving instance is never persisted from the fresh build (that would
// reset status/ack/audit), it is loaded live and mutated in place.
import { applyTaskAction } from './tasks';
import type { TaskInstance, TaskDefinition, ReTrigger } from './types';
import type { TripDiff } from './diff';

export interface ReconcilePlan {
  toCreate: TaskInstance[];
  toUpdate: TaskInstance[];
}

/** Identity of a task within a trip: def + (for per-airport) which leg-endpoint. */
export function instanceKey(i: Pick<TaskInstance, 'taskDefId' | 'legId' | 'airportRole'>): string {
  return `${i.taskDefId}|${i.legId ?? ''}|${i.airportRole ?? ''}`;
}

function matchesChange(rt: ReTrigger, live: TaskInstance, diff: TripDiff): boolean {
  if (rt === 'aircraftChange') return diff.aircraftChanged;
  if (rt === 'legScheduleChange') {
    return live.legId
      ? !!diff.legChanges[live.legId]?.rescheduled
      : Object.values(diff.legChanges).some((c) => c.rescheduled);
  }
  // passengerChange
  return live.legId
    ? (diff.legChanges[live.legId]?.paxDelta ?? 0) > 0
    : Object.values(diff.legChanges).some((c) => c.paxDelta > 0);
}

function firedChange(reTriggers: ReTrigger[], live: TaskInstance, diff: TripDiff): ReTrigger | undefined {
  return reTriggers.find((rt) => matchesChange(rt, live, diff));
}

function reopenDetail(change: ReTrigger): string {
  if (change === 'passengerChange') return 'passenger count increased';
  if (change === 'aircraftChange') return 'aircraft changed';
  return 'leg schedule changed';
}

const ACTIONABLE = new Set<TaskInstance['status']>(['open', 'in_progress', 'blocked']);

export function reconcileTrip(
  existing: TaskInstance[],
  desired: TaskInstance[],
  diff: TripDiff,
  defsById: Map<string, TaskDefinition>,
  actor: string,
  nowUtc: string,
): ReconcilePlan {
  const existingByKey = new Map(existing.map((i) => [instanceKey(i), i]));
  const desiredByKey = new Map(desired.map((i) => [instanceKey(i), i]));
  const toCreate: TaskInstance[] = [];
  const toUpdate: TaskInstance[] = [];

  // NEW — a key that should exist now but does not (added leg, or a condition that flipped true).
  for (const [k, d] of desiredByKey) {
    if (!existingByKey.has(k)) toCreate.push(d);
  }

  for (const [k, live] of existingByKey) {
    const desiredInst = desiredByKey.get(k);

    // REMOVED — no longer applies (leg/airport gone, or a condition flipped false).
    if (!desiredInst) {
      if (live.status === 'cancelled') continue; // idempotent
      toUpdate.push({
        ...live,
        status: 'cancelled',
        reflag: undefined, // a dead task carries no advisory — nothing left to dismiss or redo
        auditTrail: [...live.auditTrail, { atUtc: nowUtc, actor, action: 'cancelled', detail: 'no longer applies' }],
      });
      continue;
    }

    // RESTORED — a previously-cancelled task whose leg/airport key is back in the desired set
    // (a removed leg re-added under the same id). The deterministic instance id collides with the
    // cancelled row, so it cannot be re-created via toCreate; reopen it in place, clearing
    // completion/ack and refreshing timing, so the airport is not left with no live task. (Audit #4.)
    if (live.status === 'cancelled') {
      toUpdate.push({
        ...live,
        status: 'open',
        ackState: live.requiresAck ? 'pending' : 'n_a',
        ackedBy: undefined,
        ackedAtUtc: undefined,
        completedBy: undefined,
        completedAtUtc: undefined,
        reflag: undefined,
        etdUtc: desiredInst.etdUtc,
        dueAtUtc: desiredInst.dueAtUtc,
        auditTrail: [...live.auditTrail, { atUtc: nowUtc, actor, action: 'restored', detail: 'leg re-added' }],
      });
      continue;
    }

    // SURVIVING — start from the LIVE instance, never the fresh build.
    const reTriggers = defsById.get(live.taskDefId)?.reTriggerOn ?? [];
    const change = firedChange(reTriggers, live, diff);
    const completed = live.status === 'done' || live.ackState === 'acked';

    if (change && completed) {
      // ADVISORY reflag (D89): a trip change never un-completes cleared work. Stamp the flag,
      // refresh the timing anchors so the badge states the truth, and leave completion (and the
      // escalation ladder) alone — the scheduler dismisses or re-does at their judgment. The
      // explicit human 'reopen' action still exists; reconcile just no longer wields it.
      toUpdate.push({
        ...live,
        etdUtc: desiredInst.etdUtc,
        dueAtUtc: desiredInst.dueAtUtc,
        reflag: { change },
        auditTrail: [...live.auditTrail, { atUtc: nowUtc, actor, action: `reflagged:${change}`, detail: reopenDetail(change) }],
      });
    } else if (
      ACTIONABLE.has(live.status)
      && (live.etdUtc !== desiredInst.etdUtc || live.dueAtUtc !== desiredInst.dueAtUtc)
    ) {
      // Still-actionable task whose schedule moved: keep all live state, refresh only the timing.
      toUpdate.push({ ...live, etdUtc: desiredInst.etdUtc, dueAtUtc: desiredInst.dueAtUtc });
    }
    // otherwise: leave the live instance untouched (survivor preserved byte-for-byte)
  }

  return { toCreate, toUpdate };
}
