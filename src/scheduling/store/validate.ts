import type {
  DueRule, Condition, ChecklistTemplate, TaskDefinition, RecurringScope, TripType,
  HandoffTarget, HandoffChannel, AppliesTo, AirportEndpoint, AirportMatch, ReTrigger,
} from '../engine';

function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}
function reqNum(o: Record<string, unknown>, k: string, ctx: string): number {
  if (typeof o[k] !== 'number') throw new Error(`${ctx}: missing/invalid number '${k}'`);
  return o[k] as number;
}
function reqStr(o: Record<string, unknown>, k: string, ctx: string): string {
  if (typeof o[k] !== 'string') throw new Error(`${ctx}: missing/invalid string '${k}'`);
  return o[k] as string;
}
function reqBool(o: Record<string, unknown>, k: string, ctx: string): boolean {
  if (typeof o[k] !== 'boolean') throw new Error(`${ctx}: missing/invalid boolean '${k}'`);
  return o[k] as boolean;
}

const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const RECURRING_SCOPES: RecurringScope[] = ['daily', 'monthly', 'quarterly'];
const TRIP_TYPES: TripType[] = ['domestic', 'international', 'dca_dassp'];
const HANDOFF_KINDS = ['role', 'dept', 'person'];
const HANDOFF_CHANNELS = ['inbox', 'teams', 'email'];
const AIRPORT_ENDPOINTS = ['departure', 'arrival', 'both'];
const RE_TRIGGERS = ['legScheduleChange', 'aircraftChange', 'passengerChange'];

export function parseDueRule(raw: unknown): DueRule {
  if (!isObj(raw)) throw new Error('dueRule: not an object');
  const kind = raw.kind;
  switch (kind) {
    case 'dayOfTimeLocal': return { kind, time: reqStr(raw, 'time', 'dueRule.dayOfTimeLocal') };
    case 'weekday': {
      const day = reqStr(raw, 'day', 'dueRule.weekday');
      if (!WEEKDAYS.includes(day)) throw new Error(`dueRule.weekday: invalid day '${day}'`);
      const period = raw.period;
      if (period !== undefined && period !== 'AM' && period !== 'PM') throw new Error('dueRule.weekday: invalid period');
      return { kind: 'weekday', day, ...(period ? { period } : {}) } as DueRule;
    }
    case 'dayOfMonth': {
      const when = reqStr(raw, 'when', 'dueRule.dayOfMonth');
      if (!['before', 'onOrBefore', 'around'].includes(when)) throw new Error('dueRule.dayOfMonth: invalid when');
      return { kind, day: reqNum(raw, 'day', 'dueRule.dayOfMonth'), when } as DueRule;
    }
    case 'quarterWeek': return { kind, week: reqNum(raw, 'week', 'dueRule.quarterWeek') };
    case 'annualDate': return { kind, month: reqNum(raw, 'month', 'dueRule.annualDate'), day: reqNum(raw, 'day', 'dueRule.annualDate') };
    case 'hoursBeforeEtd': return { kind, hours: reqNum(raw, 'hours', 'dueRule.hoursBeforeEtd') };
    case 'daysBeforeEtd': return { kind, days: reqNum(raw, 'days', 'dueRule.daysBeforeEtd') };
    case 'businessDaysBeforeEtd': return { kind, days: reqNum(raw, 'days', 'dueRule.businessDaysBeforeEtd') };
    case 'monthsBeforeEtd': return { kind, months: reqNum(raw, 'months', 'dueRule.monthsBeforeEtd') };
    default: throw new Error(`dueRule: unknown kind '${String(kind)}'`);
  }
}

export function parseCondition(raw: unknown): Condition {
  if (!isObj(raw)) throw new Error('condition: not an object');
  const kind = raw.kind;
  switch (kind) {
    case 'always': return { kind };
    case 'tripType': {
      const equals = reqStr(raw, 'equals', 'condition.tripType');
      if (!TRIP_TYPES.includes(equals as TripType)) throw new Error(`condition.tripType: invalid tripType '${equals}'`);
      return { kind, equals: equals as TripType };
    }
    case 'paxCountAtLeast': return { kind, value: reqNum(raw, 'value', 'condition.paxCountAtLeast') };
    case 'tailEquals': return { kind, value: reqStr(raw, 'value', 'condition.tailEquals') };
    case 'aircraftTypeEquals': return { kind, value: reqStr(raw, 'value', 'condition.aircraftTypeEquals') };
    case 'isWeekendDeparture': return { kind };
    case 'routeTouchesCountry': return { kind, country: reqStr(raw, 'country', 'condition.routeTouchesCountry') };
    case 'routeTouchesIcaoPrefix': return { kind, prefix: reqStr(raw, 'prefix', 'condition.routeTouchesIcaoPrefix') };
    case 'allOf': case 'anyOf': {
      if (!Array.isArray(raw.conditions)) throw new Error(`condition.${kind}: conditions not an array`);
      return { kind, conditions: raw.conditions.map(parseCondition) };
    }
    case 'not': return { kind, condition: parseCondition(raw.condition) };
    default: throw new Error(`condition: unknown kind '${String(kind)}'`);
  }
}

function parseAppliesTo(raw: unknown): AppliesTo {
  if (!isObj(raw)) throw new Error('appliesTo: not an object');
  const endpoint = reqStr(raw, 'endpoint', 'appliesTo');
  if (!AIRPORT_ENDPOINTS.includes(endpoint)) throw new Error(`appliesTo: invalid endpoint '${endpoint}'`);
  const a = raw.airport;
  if (!isObj(a)) throw new Error('appliesTo.airport: not an object');
  if (a.kind === 'exact') {
    const icao = reqStr(a, 'icao', 'appliesTo.airport');
    // An empty icao matches no airport, so the task would silently never instantiate.
    if (!icao.trim()) throw new Error('appliesTo.airport: empty icao matches no airport');
    return { endpoint: endpoint as AirportEndpoint, airport: { kind: 'exact', icao } };
  }
  if (a.kind === 'prefix') {
    const prefix = reqStr(a, 'prefix', 'appliesTo.airport');
    // An empty prefix matches EVERY airport — almost never intended, and un-reviewable. Reject it.
    if (!prefix.trim()) throw new Error('appliesTo.airport: empty prefix matches every airport');
    const airport: AirportMatch = { kind: 'prefix', prefix };
    if (a.except !== undefined) {
      if (!Array.isArray(a.except) || !a.except.every((x) => typeof x === 'string')) {
        throw new Error('appliesTo.airport.except: not a string[]');
      }
      airport.except = a.except as string[];
    }
    return { endpoint: endpoint as AirportEndpoint, airport };
  }
  throw new Error(`appliesTo.airport: invalid kind '${String(a.kind)}'`);
}

function parseReTriggerOn(raw: unknown): ReTrigger[] {
  if (!Array.isArray(raw)) throw new Error('reTriggerOn: not an array');
  return raw.map((r) => {
    if (typeof r !== 'string' || !RE_TRIGGERS.includes(r)) throw new Error(`reTriggerOn: invalid value '${String(r)}'`);
    return r as ReTrigger;
  });
}

function parseTaskDef(raw: unknown): TaskDefinition {
  if (!isObj(raw)) throw new Error('taskDefinition: not an object');
  const def: TaskDefinition = {
    id: reqStr(raw, 'id', 'taskDefinition'),
    title: reqStr(raw, 'title', 'taskDefinition'),
    ownerRole: reqStr(raw, 'ownerRole', 'taskDefinition'),
    category: reqStr(raw, 'category', 'taskDefinition'),
    order: reqNum(raw, 'order', 'taskDefinition'),
    dueRule: parseDueRule(raw.dueRule),
    requiresAck: reqBool(raw, 'requiresAck', 'taskDefinition'),
  };
  if (typeof raw.description === 'string') def.description = raw.description;
  if (raw.condition !== undefined) def.condition = parseCondition(raw.condition);
  if (raw.escalation !== undefined) {
    if (!isObj(raw.escalation)) throw new Error('taskDefinition.escalation: not an object');
    def.escalation = {
      deadline: parseDueRule(raw.escalation.deadline),
      notifyRole: reqStr(raw.escalation, 'notifyRole', 'escalation'),
      ...(typeof raw.escalation.reason === 'string' ? { reason: raw.escalation.reason } : {}),
    };
  }
  if (raw.handoffTarget !== undefined) {
    const h = raw.handoffTarget;
    if (!isObj(h)) throw new Error('taskDefinition.handoffTarget: not an object');
    const hkind = reqStr(h, 'kind', 'handoffTarget');
    if (!HANDOFF_KINDS.includes(hkind)) throw new Error(`handoffTarget: invalid kind '${hkind}'`);
    const target: HandoffTarget = { kind: hkind as HandoffTarget['kind'], value: reqStr(h, 'value', 'handoffTarget') };
    if (h.channel !== undefined) {
      if (typeof h.channel !== 'string' || !HANDOFF_CHANNELS.includes(h.channel)) {
        throw new Error(`handoffTarget: invalid channel '${String(h.channel)}'`);
      }
      target.channel = h.channel as HandoffChannel;
    }
    def.handoffTarget = target;
  }
  if (typeof raw.dependsOn === 'string') def.dependsOn = raw.dependsOn;
  if (raw.appliesTo !== undefined) def.appliesTo = parseAppliesTo(raw.appliesTo);
  if (raw.reTriggerOn !== undefined) def.reTriggerOn = parseReTriggerOn(raw.reTriggerOn);
  return def;
}

export function parseTemplate(raw: unknown): ChecklistTemplate {
  if (!isObj(raw)) throw new Error('template: not an object');
  const triggerType = raw.triggerType;
  if (triggerType !== 'recurring' && triggerType !== 'per_trip') throw new Error(`template: invalid triggerType '${String(triggerType)}'`);
  const scope = reqStr(raw, 'scope', 'template');
  // T3: scope family must match triggerType.
  if (triggerType === 'recurring' && !RECURRING_SCOPES.includes(scope as RecurringScope)) {
    throw new Error(`template: recurring scope must be one of ${RECURRING_SCOPES.join('|')}, got '${scope}'`);
  }
  if (triggerType === 'per_trip' && !TRIP_TYPES.includes(scope as TripType)) {
    throw new Error(`template: per_trip scope must be one of ${TRIP_TYPES.join('|')}, got '${scope}'`);
  }
  const status = reqStr(raw, 'status', 'template');
  if (!['draft', 'published', 'archived'].includes(status)) throw new Error(`template: invalid status '${status}'`);
  if (!Array.isArray(raw.taskDefinitions)) throw new Error('template: taskDefinitions not an array');
  const taskDefinitions = raw.taskDefinitions.map(parseTaskDef);
  // Duplicate ids collide instance ids downstream (deterministic seed = template:version:defId:trip)
  // and would silently drop a checklist item on save — reject at the gate.
  const seenIds = new Set<string>();
  for (const d of taskDefinitions) {
    if (seenIds.has(d.id)) throw new Error(`template: duplicate task id '${d.id}'`);
    seenIds.add(d.id);
  }
  // appliesTo (per-airport fan-out) and reTriggerOn (reconcile re-flag) only take effect for
  // per_trip templates — instantiateRecurring ignores both and reconcile never runs for recurring.
  // Reject them on a recurring template rather than let a department author set a silent no-op.
  if (triggerType === 'recurring') {
    for (const d of taskDefinitions) {
      if (d.appliesTo) throw new Error(`template: task '${d.id}' sets appliesTo on a recurring template (only valid on per_trip)`);
      if (d.reTriggerOn) throw new Error(`template: task '${d.id}' sets reTriggerOn on a recurring template (only valid on per_trip)`);
    }
  }
  return {
    id: reqStr(raw, 'id', 'template'),
    name: reqStr(raw, 'name', 'template'),
    triggerType,
    scope: scope as RecurringScope | TripType,
    version: reqNum(raw, 'version', 'template'),
    status: status as ChecklistTemplate['status'],
    effectiveFrom: reqStr(raw, 'effectiveFrom', 'template'),
    taskDefinitions,
  };
}
