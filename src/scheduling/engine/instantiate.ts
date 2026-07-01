import { parseISO } from 'date-fns';
import { computeDueAtUtc } from './dueDates';
import { evaluateCondition } from './conditions';
import type {
  ChecklistTemplate, TaskDefinition, TaskInstance, TripContext, DueContext, IdFactory,
} from './types';

/** Office-local YYYY-MM-DD for a UTC instant + offset. */
function officeLocalDate(iso: string, offsetMinutes: number): string {
  const local = new Date(parseISO(iso).getTime() + offsetMinutes * 60_000);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const d = String(local.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function buildInstance(
  def: TaskDefinition, template: ChecklistTemplate, ctx: DueContext,
  tripId: string | null, runDate: string | null, idFactory: IdFactory,
): TaskInstance {
  const seed = `${template.id}:${template.version}:${def.id}:${tripId ?? runDate}`;
  return {
    id: idFactory(seed),
    templateId: template.id,
    templateVersion: template.version,
    taskDefId: def.id,
    title: def.title,
    category: def.category,
    order: def.order,
    description: def.description,
    tripId,
    runDate,
    status: 'open',
    ownerRole: def.ownerRole,
    dueAtUtc: computeDueAtUtc(def.dueRule, ctx),
    requiresAck: def.requiresAck,
    ackState: def.requiresAck ? 'pending' : 'n_a',
    handoffTarget: def.handoffTarget,
    escalation: def.escalation,
    auditTrail: [{ atUtc: ctx.nowUtc, actor: 'system', action: 'created' }],
  };
}

export function instantiateRecurring(
  template: ChecklistTemplate, ctx: DueContext, idFactory: IdFactory,
): TaskInstance[] {
  if (template.triggerType !== 'recurring' || template.status !== 'published') return [];
  const runDate = officeLocalDate(ctx.nowUtc, ctx.officeTzOffsetMinutes);
  return template.taskDefinitions
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((def) => buildInstance(def, template, ctx, null, runDate, idFactory));
}

export function instantiatePerTrip(
  templates: ChecklistTemplate[], trip: TripContext, ctx: DueContext, idFactory: IdFactory,
): TaskInstance[] {
  const dueCtx: DueContext = { ...ctx, etdUtc: ctx.etdUtc ?? trip.etdUtc };
  return templates
    .filter((t) => t.triggerType === 'per_trip' && t.status === 'published' && t.scope === trip.tripType)
    .flatMap((template) =>
      template.taskDefinitions
        .slice()
        .sort((a, b) => a.order - b.order)
        .filter((def) => (def.condition ? evaluateCondition(def.condition, trip) : true))
        .map((def) => buildInstance(def, template, dueCtx, trip.tripId, null, idFactory)),
    );
}
