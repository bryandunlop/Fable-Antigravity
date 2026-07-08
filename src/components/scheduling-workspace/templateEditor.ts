import type { ChecklistTemplate, Condition, DueRule, TaskDefinition, TripType, AppliesTo, ReTrigger } from '../../scheduling/engine';

// Pure state helpers for the no-code template editor. The UI edits a flat, form-friendly builder
// model; these functions translate to/from the engine's Condition/DueRule unions and produce the
// publish payload (validated downstream by parseTemplate — the same gate the seed data passes).

// ─── Condition builder ─────────────────────────────────────────────────────────────────────────
// Covers the vocabulary a scheduler actually writes: ALL-of / ANY-of a flat list of (optionally
// negated) leaf conditions. Deeper nesting (a group inside a group) is preserved untouched as
// 'custom' rather than lossily flattened.

export type LeafKind =
  | 'tripType' | 'paxCountAtLeast' | 'tailEquals' | 'aircraftTypeEquals'
  | 'isWeekendDeparture' | 'routeTouchesCountry' | 'routeTouchesIcaoPrefix';

export const LEAF_KINDS: { kind: LeafKind; label: string; param: 'none' | 'text' | 'number' | 'tripType'; paramLabel?: string }[] = [
  { kind: 'tripType', label: 'Trip type is', param: 'tripType' },
  { kind: 'paxCountAtLeast', label: 'Pax count at least', param: 'number', paramLabel: 'count' },
  { kind: 'tailEquals', label: 'Tail is', param: 'text', paramLabel: 'e.g. N2PG' },
  { kind: 'aircraftTypeEquals', label: 'Aircraft type is', param: 'text', paramLabel: 'e.g. G650ER' },
  { kind: 'isWeekendDeparture', label: 'Departs on a weekend', param: 'none' },
  { kind: 'routeTouchesCountry', label: 'Route touches country', param: 'text', paramLabel: 'ISO code, e.g. GB' },
  { kind: 'routeTouchesIcaoPrefix', label: 'Route touches ICAO prefix', param: 'text', paramLabel: 'e.g. K, EG' },
];

export interface LeafCondition {
  kind: LeafKind;
  value: string; // stringified param ('' for none-param kinds); paxCountAtLeast parses to number
  negate: boolean;
}

export type ConditionBuilder =
  | { mode: 'always' }
  | { mode: 'allOf' | 'anyOf'; leaves: LeafCondition[] }
  | { mode: 'custom'; original: Condition };

function leafOf(cond: Condition): LeafCondition | null {
  const negated = cond.kind === 'not';
  const inner = negated ? (cond as Extract<Condition, { kind: 'not' }>).condition : cond;
  switch (inner.kind) {
    case 'tripType': return { kind: 'tripType', value: inner.equals, negate: negated };
    case 'paxCountAtLeast': return { kind: 'paxCountAtLeast', value: String(inner.value), negate: negated };
    case 'tailEquals': return { kind: 'tailEquals', value: inner.value, negate: negated };
    case 'aircraftTypeEquals': return { kind: 'aircraftTypeEquals', value: inner.value, negate: negated };
    case 'isWeekendDeparture': return { kind: 'isWeekendDeparture', value: '', negate: negated };
    case 'routeTouchesCountry': return { kind: 'routeTouchesCountry', value: inner.country, negate: negated };
    case 'routeTouchesIcaoPrefix': return { kind: 'routeTouchesIcaoPrefix', value: inner.prefix, negate: negated };
    default: return null;
  }
}

function conditionOfLeaf(leaf: LeafCondition): Condition {
  let cond: Condition;
  switch (leaf.kind) {
    case 'tripType': cond = { kind: 'tripType', equals: leaf.value as TripType }; break;
    case 'paxCountAtLeast': cond = { kind: 'paxCountAtLeast', value: Number(leaf.value) }; break;
    case 'tailEquals': cond = { kind: 'tailEquals', value: leaf.value }; break;
    case 'aircraftTypeEquals': cond = { kind: 'aircraftTypeEquals', value: leaf.value }; break;
    case 'isWeekendDeparture': cond = { kind: 'isWeekendDeparture' }; break;
    case 'routeTouchesCountry': cond = { kind: 'routeTouchesCountry', country: leaf.value }; break;
    case 'routeTouchesIcaoPrefix': cond = { kind: 'routeTouchesIcaoPrefix', prefix: leaf.value }; break;
  }
  return leaf.negate ? { kind: 'not', condition: cond } : cond;
}

export function conditionToBuilder(cond: Condition | undefined): ConditionBuilder {
  if (!cond || cond.kind === 'always') return { mode: 'always' };
  if (cond.kind === 'allOf' || cond.kind === 'anyOf') {
    const leaves = cond.conditions.map(leafOf);
    if (leaves.every((l): l is LeafCondition => l !== null)) return { mode: cond.kind, leaves };
    return { mode: 'custom', original: cond };
  }
  const leaf = leafOf(cond);
  return leaf ? { mode: 'allOf', leaves: [leaf] } : { mode: 'custom', original: cond };
}

export function builderToCondition(b: ConditionBuilder): Condition | undefined {
  if (b.mode === 'always') return undefined;
  if (b.mode === 'custom') return b.original;
  if (b.leaves.length === 0) return undefined;
  if (b.leaves.length === 1 && b.mode === 'allOf') return conditionOfLeaf(b.leaves[0]);
  return { kind: b.mode, conditions: b.leaves.map(conditionOfLeaf) };
}

// ─── Due rules ─────────────────────────────────────────────────────────────────────────────────

export const DUE_RULE_KINDS: { kind: DueRule['kind']; label: string; scope: 'recurring' | 'per_trip' | 'both' }[] = [
  { kind: 'hoursBeforeEtd', label: 'Hours before departure', scope: 'per_trip' },
  { kind: 'businessDaysBeforeEtd', label: 'Business days before departure', scope: 'per_trip' },
  { kind: 'monthsBeforeEtd', label: 'Months before departure', scope: 'per_trip' },
  { kind: 'dayOfTimeLocal', label: 'Day-of at time (office local)', scope: 'both' },
  { kind: 'weekday', label: 'On a weekday', scope: 'recurring' },
  { kind: 'dayOfMonth', label: 'Day of the month', scope: 'recurring' },
  { kind: 'quarterWeek', label: 'Week of the quarter', scope: 'recurring' },
  { kind: 'annualDate', label: 'Annual date', scope: 'recurring' },
];

export function defaultDueRule(kind: DueRule['kind']): DueRule {
  switch (kind) {
    case 'dayOfTimeLocal': return { kind, time: '09:00' };
    case 'weekday': return { kind, day: 'MON' };
    case 'dayOfMonth': return { kind, day: 15, when: 'onOrBefore' };
    case 'quarterWeek': return { kind, week: 1 };
    case 'annualDate': return { kind, month: 1, day: 31 };
    case 'hoursBeforeEtd': return { kind, hours: 48 };
    case 'businessDaysBeforeEtd': return { kind, days: 1 };
    case 'monthsBeforeEtd': return { kind, months: 1 };
  }
}

// ─── Task ids + publish payload ────────────────────────────────────────────────────────────────

export function slugifyTaskId(title: string, existing: Set<string>): string {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'task';
  if (!existing.has(base)) return base;
  let n = 2;
  while (existing.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/** Ids for the publish payload: existing tasks keep their stable id across versions; new tasks
 *  (draft `new-task*` placeholders) are slugified from their final title. Stable ids are reserved
 *  up front so a new task can never collide with an existing id regardless of list order — a
 *  duplicate id would collide instance ids downstream and silently drop a checklist item. */
export function publishTaskIds(tasks: { id: string; title: string }[]): string[] {
  const isNew = (t: { id: string }) => !t.id || t.id.startsWith('new-task');
  const usedIds = new Set(tasks.filter(t => !isNew(t)).map(t => t.id));
  return tasks.map(t => {
    if (!isNew(t)) return t.id;
    const id = slugifyTaskId(t.title, usedIds);
    usedIds.add(id);
    return id;
  });
}

/** New published version: same id/name/trigger/scope, version+1, re-sequenced order. The result
 *  goes through parseTemplate before saving — the same validation gate the seed data passes. */
export function bumpedTemplatePayload(template: ChecklistTemplate, taskDefinitions: TaskDefinition[]): ChecklistTemplate {
  return {
    ...template,
    version: template.version + 1,
    status: 'published',
    taskDefinitions: taskDefinitions.map((d, i) => ({ ...d, order: i + 1 })),
  };
}

// ─── Draft task model (form-friendly) ────────────────────────────────────────────────────────────
// Pure transforms between a TaskDefinition and the flat form model the editor dialog edits. Kept
// here (not in the .tsx) so they carry no UI imports and stay unit-testable.

export interface DraftTask {
  id: string;
  title: string;
  description: string;
  ownerRole: string;
  category: string;
  requiresAck: boolean;
  dueRule: DueRule;
  condition: ConditionBuilder;
  handoffEnabled: boolean;
  handoffKind: 'role' | 'dept' | 'person';
  handoffValue: string;
  handoffChannel: 'inbox' | 'teams' | 'email';
  escalationEnabled: boolean;
  escalationDeadline: DueRule;
  escalationNotifyRole: string;
  escalationReason: string;
  dependsOn?: string;
  appliesTo?: AppliesTo;       // per-airport fan-out (per-trip templates only)
  reTriggerOn: ReTrigger[];    // which trip changes re-flag a completed item
}

export function draftFromDef(def: TaskDefinition): DraftTask {
  return {
    id: def.id,
    title: def.title,
    description: def.description ?? '',
    ownerRole: def.ownerRole,
    category: def.category,
    requiresAck: def.requiresAck,
    dueRule: def.dueRule,
    condition: conditionToBuilder(def.condition),
    handoffEnabled: !!def.handoffTarget,
    handoffKind: def.handoffTarget?.kind ?? 'role',
    handoffValue: def.handoffTarget?.value ?? '',
    handoffChannel: def.handoffTarget?.channel ?? 'inbox',
    escalationEnabled: !!def.escalation,
    escalationDeadline: def.escalation?.deadline ?? defaultDueRule('dayOfTimeLocal'),
    escalationNotifyRole: def.escalation?.notifyRole ?? 'scheduling',
    escalationReason: def.escalation?.reason ?? '',
    dependsOn: def.dependsOn,
    appliesTo: def.appliesTo,
    reTriggerOn: def.reTriggerOn ?? [],
  };
}

export function defFromDraft(d: DraftTask, order: number): TaskDefinition {
  const def: TaskDefinition = {
    id: d.id,
    title: d.title.trim(),
    ownerRole: d.ownerRole.trim() || 'scheduling',
    category: d.category.trim() || 'ops',
    order,
    dueRule: d.dueRule,
    requiresAck: d.requiresAck,
  };
  if (d.description.trim()) def.description = d.description.trim();
  const condition = builderToCondition(d.condition);
  if (condition) def.condition = condition;
  if (d.handoffEnabled && d.handoffValue.trim()) {
    def.handoffTarget = { kind: d.handoffKind, value: d.handoffValue.trim(), channel: d.handoffChannel };
  }
  if (d.escalationEnabled && d.escalationNotifyRole.trim()) {
    def.escalation = {
      deadline: d.escalationDeadline,
      notifyRole: d.escalationNotifyRole.trim(),
      ...(d.escalationReason.trim() ? { reason: d.escalationReason.trim() } : {}),
    };
  }
  if (d.dependsOn) def.dependsOn = d.dependsOn;
  if (d.appliesTo) def.appliesTo = d.appliesTo;
  if (d.reTriggerOn.length) def.reTriggerOn = d.reTriggerOn;
  return def;
}
