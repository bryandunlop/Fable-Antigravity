// Drizzle schema for the scheduling-workspace Postgres adapter.
//
// New, clean tables — independent of the inventory schema (src/server/db/schema.ts).
// Do NOT touch the inventory `trips`/`aircraft_type` enum from that file; scheduling's
// `schedulingTrips` is a separate mirror keyed by its own id space (see mapping.ts / types.ts).
//
// Nested engine structures (TaskDefinition[], AuditEntry[], HandoffTarget, EscalationRule,
// SchedulingEvent payload) are stored as jsonb so the typed objects round-trip without a
// relational explosion. See postgres.ts for the row <-> DTO/engine mapping and
// POSTGRES-RUNBOOK.md for how to provision these tables against a live database.

import { pgTable, text, integer, boolean, timestamp, jsonb, primaryKey } from 'drizzle-orm/pg-core';

export const checklistTemplates = pgTable('checklist_templates', {
  id: text('id').notNull(),
  version: integer('version').notNull(),
  name: text('name').notNull(),
  triggerType: text('trigger_type').notNull(),
  scope: text('scope').notNull(),
  status: text('status').notNull(),
  effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull(),
  taskDefinitions: jsonb('task_definitions').notNull(), // TaskDefinition[]
}, (t) => ({ pk: primaryKey({ columns: [t.id, t.version] }) }));

export const schedulingTrips = pgTable('scheduling_trips', {
  id: text('id').primaryKey(),
  tripNumber: text('trip_number').notNull(),
  sourceSystem: text('source_system').notNull(),
  sourceTripRef: text('source_trip_ref'),
  tail: text('tail').notNull(),
  aircraftType: text('aircraft_type').notNull(), // free text (NOT the inventory G650/G500 enum)
  tripType: text('trip_type').notNull(),
  priority: text('priority').notNull(),
  status: text('status').notNull(),
  startDate: timestamp('start_date', { withTimezone: true }).notNull(),
  endDate: timestamp('end_date', { withTimezone: true }).notNull(),
  createdBy: text('created_by').notNull(),
  createdAtUtc: timestamp('created_at_utc', { withTimezone: true }).notNull(),
  lastEditedBy: text('last_edited_by'),
  lastEditedAtUtc: timestamp('last_edited_at_utc', { withTimezone: true }),
});

export const schedulingTripLegs = pgTable('scheduling_trip_legs', {
  id: text('id').primaryKey(),
  tripId: text('trip_id').notNull(),
  sequence: integer('sequence').notNull(),
  departureIcao: text('departure_icao').notNull(),
  arrivalIcao: text('arrival_icao').notNull(),
  departureTimeUtc: timestamp('departure_time_utc', { withTimezone: true }).notNull(),
  departureTimeLocal: text('departure_time_local'),
  arrivalTimeUtc: timestamp('arrival_time_utc', { withTimezone: true }),
  paxCount: integer('pax_count').notNull(),
  filedStatus: text('filed_status'),
});

export const taskInstances = pgTable('task_instances', {
  id: text('id').primaryKey(),
  templateId: text('template_id').notNull(),
  templateVersion: integer('template_version').notNull(),
  taskDefId: text('task_def_id').notNull(),
  title: text('title').notNull(),
  category: text('category').notNull(),
  order: integer('task_order').notNull(),
  description: text('description'),
  tripId: text('trip_id'),
  runDate: text('run_date'),
  etdUtc: timestamp('etd_utc', { withTimezone: true }),
  status: text('status').notNull(),
  ownerRole: text('owner_role').notNull(),
  dueAtUtc: timestamp('due_at_utc', { withTimezone: true }).notNull(),
  requiresAck: boolean('requires_ack').notNull(),
  ackState: text('ack_state').notNull(),
  ackedBy: text('acked_by'),
  ackedAtUtc: timestamp('acked_at_utc', { withTimezone: true }),
  completedBy: text('completed_by'),
  completedAtUtc: timestamp('completed_at_utc', { withTimezone: true }),
  notes: text('notes'),
  handoffTarget: jsonb('handoff_target'),
  escalation: jsonb('escalation'),
  auditTrail: jsonb('audit_trail').notNull(),
});

export const schedulingEvents = pgTable('scheduling_events', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  sourceDept: text('source_dept').notNull(),
  targetKind: text('target_kind').notNull(),
  targetValue: text('target_value').notNull(),
  entityRefKind: text('entity_ref_kind').notNull(),
  entityRefId: text('entity_ref_id').notNull(),
  payload: jsonb('payload').notNull(),
  actionUrl: text('action_url'),
  channel: text('channel'),
  ackable: boolean('ackable').notNull(),
  createdAtUtc: timestamp('created_at_utc', { withTimezone: true }).notNull(),
  deliveredAtUtc: timestamp('delivered_at_utc', { withTimezone: true }),
  ackState: text('ack_state').notNull(),
  ackedBy: text('acked_by'),
  ackedAtUtc: timestamp('acked_at_utc', { withTimezone: true }),
});
