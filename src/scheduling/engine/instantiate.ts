import { parseISO } from 'date-fns';
import { computeDueAtUtc } from './dueDates';
import { evaluateCondition } from './conditions';
import { matchAirport, expandEndpoints } from './airports';
import type {
  ChecklistTemplate, TaskDefinition, TaskInstance, TripContext, DueContext, IdFactory, LegContext, PersonContext, BoundTo,
} from './types';

/** Per-airport provenance stamped on a per-leg instance. */
interface AirportExtra { legId: string; airportIcao: string; airportRole: 'departure' | 'arrival'; sequence: number }
/** Per-person provenance stamped on a person-bound instance (D110 slice 2). */
interface PersonExtra { person: PersonContext }

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
  extra?: AirportExtra, person?: PersonExtra,
): TaskInstance {
  // Per-airport instances MUST include leg + endpoint in the seed, or the same airport on two
  // legs (out-and-back, tech stop) collides to one id and the store silently drops one. Per-person
  // instances include the person for the same reason.
  const suffix = extra ? `:${extra.legId}:${extra.airportRole}` : person ? `:person:${person.person.id}` : '';
  const seed = `${template.id}:${template.version}:${def.id}:${tripId ?? runDate}${suffix}`;
  // What the item is about (D110 slice 2). A per-airport task is about its leg; a fanned-out task
  // is about its person; a crew task is about the crew; anything else is about the whole trip.
  const boundTo: BoundTo | undefined = extra
    ? { kind: 'leg', id: extra.legId, label: `Leg ${extra.sequence} · ${extra.airportIcao}` }
    : person
      ? { kind: 'person', id: person.person.id, label: person.person.name }
      : def.bindTo === 'crew'
        ? { kind: 'crew', id: 'crew', label: 'Crew' }
        : undefined;
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
    etdUtc: ctx.etdUtc,
    status: 'open',
    ownerRole: def.ownerRole,
    dueAtUtc: computeDueAtUtc(def.dueRule, ctx),
    requiresAck: def.requiresAck,
    ackState: def.requiresAck ? 'pending' : 'n_a',
    handoffTarget: def.handoffTarget,
    escalation: def.escalation,
    ...(extra ? { legId: extra.legId, airportIcao: extra.airportIcao, airportRole: extra.airportRole } : {}),
    ...(person ? { personId: person.person.id } : {}),
    ...(boundTo ? { boundTo } : {}),
    auditTrail: [{ atUtc: ctx.nowUtc, actor: 'system', action: 'created' }],
  };
}

/** Fan a per-airport task out to one instance per matching leg-endpoint, each due-anchored to
 *  that endpoint's own time (arrival tasks anchor to arrival, not the leg's departure). */
function instantiatePerAirport(
  def: TaskDefinition, template: ChecklistTemplate, ctx: DueContext,
  tripId: string | null, legs: LegContext[], idFactory: IdFactory,
): TaskInstance[] {
  const at = def.appliesTo!;
  const out: TaskInstance[] = [];
  for (const leg of legs) {
    for (const endpoint of expandEndpoints(at.endpoint)) {
      const icao = endpoint === 'departure' ? leg.departureIcao : leg.arrivalIcao;
      if (!matchAirport(icao, at.airport)) continue;
      const anchorEtd = endpoint === 'departure' ? leg.departureTimeUtc : (leg.arrivalTimeUtc ?? leg.departureTimeUtc);
      out.push(buildInstance(def, template, { ...ctx, etdUtc: anchorEtd }, tripId, null, idFactory, {
        legId: leg.legId, airportIcao: icao.toUpperCase(), airportRole: endpoint, sequence: leg.sequence,
      }));
    }
  }
  return out;
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
  const legs = trip.legs ?? [];
  return templates
    .filter((t) => t.triggerType === 'per_trip' && t.status === 'published' && t.scope === trip.tripType)
    .flatMap((template) =>
      template.taskDefinitions
        .slice()
        .sort((a, b) => a.order - b.order)
        .filter((def) => (def.condition ? evaluateCondition(def.condition, trip) : true))
        .flatMap((def) => (def.appliesTo
          ? instantiatePerAirport(def, template, ctx, trip.tripId, legs, idFactory)
          // A person-bound task fans out per person aboard. With nobody named yet it falls back to
          // one trip-level item, so a pack whose people are not known still works (the hinge of D110).
          : def.bindTo === 'person' && (trip.people?.length ?? 0) > 0
            ? trip.people!.map((person) => buildInstance(def, template, dueCtx, trip.tripId, null, idFactory, undefined, { person }))
            : [buildInstance(def, template, dueCtx, trip.tripId, null, idFactory)])),
    );
}
