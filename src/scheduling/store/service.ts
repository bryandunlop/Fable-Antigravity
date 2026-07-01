import {
  instantiatePerTrip, instantiateRecurring, applyTaskAction, computeEscalations, deriveSchedulingReadiness,
} from '../engine';
import type { IdFactory, TaskInstance, TaskAction, Readiness } from '../engine';
import type { SchedulingStore, TripRecord, SchedulingEvent } from './types';
import { toTripContext } from './mapping';

export interface SchedulingServiceDeps {
  store: SchedulingStore;
  idFactory: IdFactory;
  officeTzOffsetMinutes: number;
}

export class SchedulingService {
  private store: SchedulingStore;
  private idFactory: IdFactory;
  private off: number;

  constructor(deps: SchedulingServiceDeps) {
    this.store = deps.store;
    this.idFactory = deps.idFactory;
    this.off = deps.officeTzOffsetMinutes;
  }

  async createTripMirror(trip: TripRecord, nowUtc: string): Promise<{ trip: TripRecord; instances: TaskInstance[] }> {
    await this.store.saveTrip(trip);
    const templates = await this.store.listPublishedTemplates();
    const tripCtx = toTripContext(trip);
    const instances = instantiatePerTrip(
      templates, tripCtx, { nowUtc, officeTzOffsetMinutes: this.off, etdUtc: tripCtx.etdUtc }, this.idFactory,
    );
    await this.store.saveInstances(instances);
    return { trip, instances };
  }

  async generateRunBoard(nowUtc: string): Promise<TaskInstance[]> {
    const templates = (await this.store.listPublishedTemplates()).filter((t) => t.triggerType === 'recurring');
    const created: TaskInstance[] = [];
    for (const t of templates) {
      const fresh = instantiateRecurring(t, { nowUtc, officeTzOffsetMinutes: this.off }, this.idFactory);
      if (fresh.length === 0) continue;
      const runDate = fresh[0].runDate!;
      const existing = await this.store.listRecurringInstances(runDate);
      const existingIds = new Set(existing.map((x) => x.id));
      const toSave = fresh.filter((x) => !existingIds.has(x.id)); // idempotent — stable ids per (template,version,def,runDate)
      if (toSave.length) { await this.store.saveInstances(toSave); created.push(...toSave); }
    }
    return created;
  }

  async applyAction(instanceId: string, action: TaskAction, actor: string, nowUtc: string): Promise<TaskInstance> {
    const current = await this.store.getInstance(instanceId);
    if (!current) throw new Error(`No task instance '${instanceId}'`);
    const next = applyTaskAction(current, action, actor, nowUtc);
    await this.store.updateInstance(next);
    if (action.kind === 'complete' && next.handoffTarget) {
      await this.store.saveEvent(this.handoffEvent(next, nowUtc));
    }
    return next;
  }

  async runEscalations(nowUtc: string): Promise<SchedulingEvent[]> {
    const all = await this.allActiveInstances();
    const firings = computeEscalations(all, nowUtc, this.off);
    const out: SchedulingEvent[] = [];
    for (const f of firings) {
      const existing = await this.store.listEventsForTarget({ kind: 'role', value: f.notifyRole });
      const already = existing.some((e) => e.type === 'escalation' && e.entityRef.id === f.taskInstanceId && e.ackState !== 'acked');
      if (already) continue; // idempotent
      const ev: SchedulingEvent = {
        id: this.idFactory(`escalation:${f.taskInstanceId}`),
        type: 'escalation', sourceDept: 'scheduling', target: { kind: 'role', value: f.notifyRole },
        entityRef: { kind: 'task', id: f.taskInstanceId }, payload: { reason: f.reason },
        channel: 'inbox', ackable: true, createdAtUtc: nowUtc, ackState: 'pending',
      };
      await this.store.saveEvent(ev);
      out.push(ev);
    }
    return out;
  }

  async tripReadiness(tripId: string): Promise<Readiness> {
    return deriveSchedulingReadiness(await this.store.listInstancesForTrip(tripId));
  }

  private handoffEvent(inst: TaskInstance, nowUtc: string): SchedulingEvent {
    const t = inst.handoffTarget!;
    return {
      id: this.idFactory(`handoff:${inst.id}`),
      type: `handoff:${inst.category}`, sourceDept: inst.ownerRole,
      target: { kind: t.kind, value: t.value }, entityRef: { kind: 'task', id: inst.id },
      payload: { title: inst.title, tripId: inst.tripId }, channel: t.channel ?? 'inbox',
      ackable: true, createdAtUtc: nowUtc, ackState: 'pending',
    };
  }

  private async allActiveInstances(): Promise<TaskInstance[]> {
    // In-memory-friendly: gather from all trips + all recurring runDates present.
    const trips = await this.store.listTrips();
    const perTrip = (await Promise.all(trips.map((t) => this.store.listInstancesForTrip(t.id)))).flat();
    // Recurring: collect distinct runDates from existing per-... not tracked here, so read via a wide net.
    // The store exposes listRecurringInstances(runDate); the service tracks no date index, so callers that
    // need recurring escalations pass through generateRunBoard first. For escalation we include any recurring
    // instances discoverable by the store's own iteration is not part of the interface — so we rely on per-trip
    // instances here. Recurring escalations are wired in Plan 3 when the run-board date is in scope.
    return perTrip;
  }
}
