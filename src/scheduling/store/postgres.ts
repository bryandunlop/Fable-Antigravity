// Drizzle/Postgres adapter for SchedulingStore.
//
// Behavioral reference: InMemorySchedulingStore (memory.ts) — this adapter must implement
// the SAME semantics (esp. template versioning: getTemplate(id) => highest *published*
// version; listPublishedTemplates => latest published per id). See memory.test.ts for the
// pinned contract.
//
// NOT executed in this environment (no DATABASE_URL / live Postgres here). Written and
// tsc-checked only; integration verification is the developer's db:push step — see
// POSTGRES-RUNBOOK.md.
//
// Only this file and drizzle-schema.ts import drizzle-orm / the server db client.

import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import type { Db } from '../../server/db';
import {
  checklistTemplates,
  schedulingTrips,
  schedulingTripLegs,
  taskInstances,
  schedulingEvents,
  pilotVisibility,
} from './drizzle-schema';
import type {
  ChecklistTemplate,
  TaskDefinition,
  TaskInstance,
  AuditEntry,
  HandoffTarget,
  EscalationRule,
  TripType,
  RecurringScope,
} from '../engine';
import type { SchedulingStore, TripRecord, TripLegRecord, SchedulingEvent, EventTarget } from './types';

export class DrizzleSchedulingStore implements SchedulingStore {
  constructor(private db: Db) {}

  // ─── Templates ────────────────────────────────────────────────────────

  async saveTemplate(t: ChecklistTemplate): Promise<ChecklistTemplate> {
    const row = templateToRow(t);
    await this.db
      .insert(checklistTemplates)
      .values(row)
      .onConflictDoUpdate({
        target: [checklistTemplates.id, checklistTemplates.version],
        set: row,
      });
    return t;
  }

  async getTemplate(id: string, version?: number): Promise<ChecklistTemplate | null> {
    if (version === undefined) return this.latestPublished(id);
    const rows = await this.db
      .select()
      .from(checklistTemplates)
      .where(and(eq(checklistTemplates.id, id), eq(checklistTemplates.version, version)))
      .limit(1);
    return rows[0] ? rowToTemplate(rows[0]) : null;
  }

  async listPublishedTemplates(): Promise<ChecklistTemplate[]> {
    const rows = await this.db
      .select()
      .from(checklistTemplates)
      .where(eq(checklistTemplates.status, 'published'))
      .orderBy(checklistTemplates.id, desc(checklistTemplates.version));
    // rows are ordered per-id by version desc; keep only the first (highest) per id.
    const seen = new Set<string>();
    const out: ChecklistTemplate[] = [];
    for (const row of rows) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      out.push(rowToTemplate(row));
    }
    return out;
  }

  private async latestPublished(id: string): Promise<ChecklistTemplate | null> {
    const rows = await this.db
      .select()
      .from(checklistTemplates)
      .where(and(eq(checklistTemplates.id, id), eq(checklistTemplates.status, 'published')))
      .orderBy(desc(checklistTemplates.version))
      .limit(1);
    return rows[0] ? rowToTemplate(rows[0]) : null;
  }

  // ─── Trips ────────────────────────────────────────────────────────────

  async saveTrip(t: TripRecord): Promise<TripRecord> {
    const row = tripToRow(t);
    await this.db
      .insert(schedulingTrips)
      .values(row)
      .onConflictDoUpdate({ target: schedulingTrips.id, set: row });

    // Replace legs wholesale — simplest correct semantics for a prototype adapter
    // (mirrors "save the whole TripRecord" the way the in-memory store does).
    await this.db.delete(schedulingTripLegs).where(eq(schedulingTripLegs.tripId, t.id));
    if (t.legs.length) {
      await this.db.insert(schedulingTripLegs).values(t.legs.map((leg) => legToRow(t.id, leg)));
    }
    return t;
  }

  async getTrip(id: string): Promise<TripRecord | null> {
    const rows = await this.db.select().from(schedulingTrips).where(eq(schedulingTrips.id, id)).limit(1);
    if (!rows[0]) return null;
    const legRows = await this.db
      .select()
      .from(schedulingTripLegs)
      .where(eq(schedulingTripLegs.tripId, id));
    return rowToTrip(rows[0], legRows);
  }

  async listTrips(): Promise<TripRecord[]> {
    const rows = await this.db.select().from(schedulingTrips);
    if (rows.length === 0) return [];
    const legRows = await this.db
      .select()
      .from(schedulingTripLegs)
      .where(inArray(schedulingTripLegs.tripId, rows.map((r) => r.id)));
    const legsByTrip = new Map<string, typeof legRows>();
    for (const leg of legRows) {
      const list = legsByTrip.get(leg.tripId) ?? [];
      list.push(leg);
      legsByTrip.set(leg.tripId, list);
    }
    return rows.map((r) => rowToTrip(r, legsByTrip.get(r.id) ?? []));
  }

  // ─── Task instances ───────────────────────────────────────────────────

  async saveInstances(xs: TaskInstance[]): Promise<void> {
    if (xs.length === 0) return;
    for (const x of xs) {
      const row = instanceToRow(x);
      await this.db
        .insert(taskInstances)
        .values(row)
        .onConflictDoUpdate({ target: taskInstances.id, set: row });
    }
  }

  async getInstance(id: string): Promise<TaskInstance | null> {
    const rows = await this.db.select().from(taskInstances).where(eq(taskInstances.id, id)).limit(1);
    return rows[0] ? rowToInstance(rows[0]) : null;
  }

  async updateInstance(x: TaskInstance): Promise<void> {
    const row = instanceToRow(x);
    await this.db
      .insert(taskInstances)
      .values(row)
      .onConflictDoUpdate({ target: taskInstances.id, set: row });
  }

  async removeInstances(ids: string[]): Promise<void> {
    for (const id of ids) await this.db.delete(taskInstances).where(eq(taskInstances.id, id));
  }

  async listInstancesForTrip(tripId: string): Promise<TaskInstance[]> {
    const rows = await this.db.select().from(taskInstances).where(eq(taskInstances.tripId, tripId));
    return rows.map(rowToInstance);
  }

  async listRecurringInstances(runDate: string): Promise<TaskInstance[]> {
    // tripId is null for recurring instances; the in-memory store filters on both
    // tripId === null and runDate === runDate, so mirror that exactly here.
    const rows = await this.db
      .select()
      .from(taskInstances)
      .where(and(eq(taskInstances.runDate, runDate), isNullTripId()));
    return rows.map(rowToInstance).filter((x) => x.tripId === null);
  }

  // ─── Events ───────────────────────────────────────────────────────────

  async saveEvent(e: SchedulingEvent): Promise<SchedulingEvent> {
    const row = eventToRow(e);
    await this.db
      .insert(schedulingEvents)
      .values(row)
      .onConflictDoUpdate({ target: schedulingEvents.id, set: row });
    return e;
  }

  async getEvent(id: string): Promise<SchedulingEvent | null> {
    const rows = await this.db.select().from(schedulingEvents).where(eq(schedulingEvents.id, id)).limit(1);
    return rows[0] ? rowToEvent(rows[0]) : null;
  }

  async updateEvent(e: SchedulingEvent): Promise<void> {
    const row = eventToRow(e);
    await this.db
      .insert(schedulingEvents)
      .values(row)
      .onConflictDoUpdate({ target: schedulingEvents.id, set: row });
  }

  async listEventsForTarget(target: EventTarget): Promise<SchedulingEvent[]> {
    const rows = await this.db
      .select()
      .from(schedulingEvents)
      .where(and(eq(schedulingEvents.targetKind, target.kind), eq(schedulingEvents.targetValue, target.value)));
    return rows.map(rowToEvent);
  }

  async removeEvent(id: string): Promise<void> {
    await this.db.delete(schedulingEvents).where(eq(schedulingEvents.id, id));
  }

  // ─── Pilot visibility ─────────────────────────────────────────────────

  async getPilotVisibility(): Promise<string[]> {
    const rows = await this.db
      .select()
      .from(pilotVisibility)
      .where(eq(pilotVisibility.visible, true));
    return rows.map((r) => r.taskDefId);
  }

  async setPilotVisible(taskDefId: string, visible: boolean): Promise<void> {
    await this.db
      .insert(pilotVisibility)
      .values({ taskDefId, visible })
      .onConflictDoUpdate({ target: pilotVisibility.taskDefId, set: { visible } });
  }
}

// ─── Row <-> DTO/engine mapping helpers ────────────────────────────────

function isNullTripId() {
  return isNull(taskInstances.tripId);
}

function templateToRow(t: ChecklistTemplate) {
  return {
    id: t.id,
    version: t.version,
    name: t.name,
    triggerType: t.triggerType,
    scope: t.scope,
    status: t.status,
    effectiveFrom: new Date(t.effectiveFrom),
    taskDefinitions: t.taskDefinitions,
  };
}

function rowToTemplate(row: typeof checklistTemplates.$inferSelect): ChecklistTemplate {
  return {
    id: row.id,
    version: row.version,
    name: row.name,
    triggerType: row.triggerType as ChecklistTemplate['triggerType'],
    scope: row.scope as RecurringScope | TripType,
    status: row.status as ChecklistTemplate['status'],
    effectiveFrom: row.effectiveFrom.toISOString(),
    taskDefinitions: row.taskDefinitions as TaskDefinition[],
  };
}

function tripToRow(t: TripRecord) {
  return {
    id: t.id,
    tripNumber: t.tripNumber,
    sourceSystem: t.sourceSystem,
    sourceTripRef: t.sourceTripRef,
    tail: t.tail,
    aircraftType: t.aircraftType,
    tripType: t.tripType,
    priority: t.priority,
    status: t.status,
    startDate: new Date(t.startDate),
    endDate: new Date(t.endDate),
    createdBy: t.createdBy,
    createdAtUtc: new Date(t.createdAtUtc),
    lastEditedBy: t.lastEditedBy ?? null,
    lastEditedAtUtc: t.lastEditedAtUtc ? new Date(t.lastEditedAtUtc) : null,
  };
}

function rowToTrip(
  row: typeof schedulingTrips.$inferSelect,
  legRows: (typeof schedulingTripLegs.$inferSelect)[],
): TripRecord {
  return {
    id: row.id,
    tripNumber: row.tripNumber,
    sourceSystem: row.sourceSystem as TripRecord['sourceSystem'],
    sourceTripRef: row.sourceTripRef,
    tail: row.tail,
    aircraftType: row.aircraftType,
    tripType: row.tripType as TripType,
    priority: row.priority as TripRecord['priority'],
    status: row.status as TripRecord['status'],
    startDate: row.startDate.toISOString(),
    endDate: row.endDate.toISOString(),
    legs: legRows
      .slice()
      .sort((a, b) => a.sequence - b.sequence)
      .map(rowToLeg),
    createdBy: row.createdBy,
    createdAtUtc: row.createdAtUtc.toISOString(),
    lastEditedBy: row.lastEditedBy ?? undefined,
    lastEditedAtUtc: row.lastEditedAtUtc ? row.lastEditedAtUtc.toISOString() : undefined,
  };
}

function legToRow(tripId: string, leg: TripLegRecord) {
  return {
    id: leg.id,
    tripId,
    sequence: leg.sequence,
    departureIcao: leg.departureIcao,
    arrivalIcao: leg.arrivalIcao,
    departureTimeUtc: new Date(leg.departureTimeUtc),
    departureTimeLocal: leg.departureTimeLocal ?? null,
    arrivalTimeUtc: leg.arrivalTimeUtc ? new Date(leg.arrivalTimeUtc) : null,
    paxCount: leg.paxCount,
    filedStatus: leg.filedStatus ?? null,
  };
}

function rowToLeg(row: typeof schedulingTripLegs.$inferSelect): TripLegRecord {
  return {
    id: row.id,
    sequence: row.sequence,
    departureIcao: row.departureIcao,
    arrivalIcao: row.arrivalIcao,
    departureTimeUtc: row.departureTimeUtc.toISOString(),
    departureTimeLocal: row.departureTimeLocal ?? undefined,
    arrivalTimeUtc: row.arrivalTimeUtc ? row.arrivalTimeUtc.toISOString() : undefined,
    paxCount: row.paxCount,
    filedStatus: (row.filedStatus as TripLegRecord['filedStatus']) ?? undefined,
  };
}

function instanceToRow(x: TaskInstance) {
  return {
    id: x.id,
    templateId: x.templateId,
    templateVersion: x.templateVersion,
    taskDefId: x.taskDefId,
    title: x.title,
    category: x.category,
    order: x.order,
    description: x.description ?? null,
    tripId: x.tripId,
    runDate: x.runDate,
    etdUtc: x.etdUtc ? new Date(x.etdUtc) : null,
    status: x.status,
    ownerRole: x.ownerRole,
    dueAtUtc: new Date(x.dueAtUtc),
    requiresAck: x.requiresAck,
    ackState: x.ackState,
    ackedBy: x.ackedBy ?? null,
    ackedAtUtc: x.ackedAtUtc ? new Date(x.ackedAtUtc) : null,
    completedBy: x.completedBy ?? null,
    completedAtUtc: x.completedAtUtc ? new Date(x.completedAtUtc) : null,
    notes: x.notes ?? null,
    handoffTarget: x.handoffTarget ?? null,
    escalation: x.escalation ?? null,
    legId: x.legId ?? null,
    airportIcao: x.airportIcao ?? null,
    airportRole: x.airportRole ?? null,
    reflag: x.reflag ?? null,
    auditTrail: x.auditTrail,
  };
}

function rowToInstance(row: typeof taskInstances.$inferSelect): TaskInstance {
  return {
    id: row.id,
    templateId: row.templateId,
    templateVersion: row.templateVersion,
    taskDefId: row.taskDefId,
    title: row.title,
    category: row.category,
    order: row.order,
    description: row.description ?? undefined,
    tripId: row.tripId,
    runDate: row.runDate,
    etdUtc: row.etdUtc ? row.etdUtc.toISOString() : undefined,
    status: row.status as TaskInstance['status'],
    ownerRole: row.ownerRole,
    dueAtUtc: row.dueAtUtc.toISOString(),
    requiresAck: row.requiresAck,
    ackState: row.ackState as TaskInstance['ackState'],
    ackedBy: row.ackedBy ?? undefined,
    ackedAtUtc: row.ackedAtUtc ? row.ackedAtUtc.toISOString() : undefined,
    completedBy: row.completedBy ?? undefined,
    completedAtUtc: row.completedAtUtc ? row.completedAtUtc.toISOString() : undefined,
    notes: row.notes ?? undefined,
    handoffTarget: (row.handoffTarget as HandoffTarget | null) ?? undefined,
    escalation: (row.escalation as EscalationRule | null) ?? undefined,
    legId: row.legId ?? undefined,
    airportIcao: row.airportIcao ?? undefined,
    airportRole: (row.airportRole as TaskInstance['airportRole']) ?? undefined,
    reflag: (row.reflag as TaskInstance['reflag']) ?? undefined,
    auditTrail: row.auditTrail as AuditEntry[],
  };
}

function eventToRow(e: SchedulingEvent) {
  return {
    id: e.id,
    type: e.type,
    sourceDept: e.sourceDept,
    targetKind: e.target.kind,
    targetValue: e.target.value,
    entityRefKind: e.entityRef.kind,
    entityRefId: e.entityRef.id,
    payload: e.payload,
    actionUrl: e.actionUrl ?? null,
    channel: e.channel ?? null,
    ackable: e.ackable,
    createdAtUtc: new Date(e.createdAtUtc),
    deliveredAtUtc: e.deliveredAtUtc ? new Date(e.deliveredAtUtc) : null,
    ackState: e.ackState,
    ackedBy: e.ackedBy ?? null,
    ackedAtUtc: e.ackedAtUtc ? new Date(e.ackedAtUtc) : null,
  };
}

function rowToEvent(row: typeof schedulingEvents.$inferSelect): SchedulingEvent {
  return {
    id: row.id,
    type: row.type,
    sourceDept: row.sourceDept,
    target: {
      kind: row.targetKind as EventTarget['kind'],
      value: row.targetValue,
    },
    entityRef: {
      kind: row.entityRefKind as SchedulingEvent['entityRef']['kind'],
      id: row.entityRefId,
    },
    payload: row.payload as Record<string, unknown>,
    actionUrl: row.actionUrl ?? undefined,
    channel: (row.channel as SchedulingEvent['channel']) ?? undefined,
    ackable: row.ackable,
    createdAtUtc: row.createdAtUtc.toISOString(),
    deliveredAtUtc: row.deliveredAtUtc ? row.deliveredAtUtc.toISOString() : undefined,
    ackState: row.ackState as SchedulingEvent['ackState'],
    ackedBy: row.ackedBy ?? undefined,
    ackedAtUtc: row.ackedAtUtc ? row.ackedAtUtc.toISOString() : undefined,
  };
}
