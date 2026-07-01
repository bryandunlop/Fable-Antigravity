// Engine-wide types. Pure declarations, no logic. Extended (append-only) by later tasks.

export type Weekday = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

export type DueRule =
  | { kind: 'dayOfTimeLocal'; time: string /* 'HH:MM' 24h, office-local */ }
  | { kind: 'weekday'; day: Weekday; period?: 'AM' | 'PM' }
  | { kind: 'dayOfMonth'; day: number; when: 'before' | 'onOrBefore' | 'around' }
  | { kind: 'quarterWeek'; week: number /* 1 = first week of the quarter */ }
  | { kind: 'annualDate'; month: number /* 1-12 */; day: number }
  | { kind: 'hoursBeforeEtd'; hours: number }
  | { kind: 'businessDaysBeforeEtd'; days: number }
  | { kind: 'monthsBeforeEtd'; months: number };

export interface DueContext {
  /** Reference "now" (ISO UTC). For recurring tasks this is the duty day being generated. */
  nowUtc: string;
  /** Earliest departure / ETD (ISO UTC). Required for *BeforeEtd rules. */
  etdUtc?: string;
  /** Scheduling office local offset in minutes vs UTC for the reference date (e.g. -240 for EDT). */
  officeTzOffsetMinutes: number;
}

export type TripType = 'domestic' | 'international' | 'dca_dassp';

export interface TripContext {
  tripId: string;
  tripType: TripType;
  tail: string;
  aircraftType: string;
  etdUtc: string;
  maxPaxCount: number;
  isWeekendDeparture: boolean;
  /** Every leg's departure + arrival ICAO, upper-cased and deduped. */
  routeIcaos: string[];
}

export type Condition =
  | { kind: 'always' }
  | { kind: 'tripType'; equals: TripType }
  | { kind: 'paxCountAtLeast'; value: number }
  | { kind: 'tailEquals'; value: string }
  | { kind: 'aircraftTypeEquals'; value: string }
  | { kind: 'isWeekendDeparture' }
  | { kind: 'routeTouchesCountry'; country: string }
  | { kind: 'routeTouchesIcaoPrefix'; prefix: string }
  | { kind: 'allOf'; conditions: Condition[] }
  | { kind: 'anyOf'; conditions: Condition[] }
  | { kind: 'not'; condition: Condition };

export type RecurringScope = 'daily' | 'monthly' | 'quarterly';
export type OwnerRole = string;
export type HandoffChannel = 'inbox' | 'teams' | 'email';

export interface HandoffTarget {
  kind: 'role' | 'dept' | 'person';
  value: string;
  channel?: HandoffChannel; // prototype delivers to 'inbox'; teams/email are productionize (Graph)
}

export interface EscalationRule {
  deadline: DueRule;      // when the unacked task escalates (e.g. 17:00 local)
  notifyRole: OwnerRole;  // who gets notified (e.g. scheduling, who then phones crew)
  reason?: string;
}

export interface TaskDefinition {
  id: string;
  title: string;
  description?: string;
  ownerRole: OwnerRole;
  category: string;
  order: number;
  dueRule: DueRule;
  requiresAck: boolean;
  escalation?: EscalationRule;
  condition?: Condition;      // undefined == always
  handoffTarget?: HandoffTarget;
  dependsOn?: string; // task-def id — NOTE: declared for future dependency gating; the engine does NOT enforce it (instantiate ignores it; readiness never derives BLOCKED from it). A later Plan 2/3 store/UI concern.
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  triggerType: 'recurring' | 'per_trip';
  scope: RecurringScope | TripType; // recurring uses RecurringScope; per_trip uses TripType
  version: number;
  status: 'draft' | 'published' | 'archived';
  effectiveFrom: string; // ISO UTC
  taskDefinitions: TaskDefinition[];
}

export type TaskStatus = 'open' | 'in_progress' | 'blocked' | 'done' | 'n_a';
export type AckState = 'n_a' | 'pending' | 'acked';

export interface AuditEntry {
  atUtc: string;
  actor: string;   // person/role id; 'system' for engine-generated
  action: string;  // 'created' | 'status:done' | 'ack' | ...
  detail?: string;
}

export interface TaskInstance {
  id: string;
  templateId: string;
  templateVersion: number; // PINNED at instantiation — never mutated on template change
  taskDefId: string;
  // Point-in-time display snapshot, copied from the TaskDefinition at instantiation so a
  // run-board / checklist / inbox renders without re-joining to the pinned template version.
  title: string;
  category: string;
  order: number;
  description?: string;
  tripId: string | null;   // null for recurring
  runDate: string | null;  // office-local YYYY-MM-DD for recurring; null for per-trip
  etdUtc?: string; // the ETD this instance was scheduled against; set for per-trip instances, undefined for recurring
  status: TaskStatus;
  ownerRole: OwnerRole;
  dueAtUtc: string;
  requiresAck: boolean;
  ackState: AckState;
  ackedBy?: string;
  ackedAtUtc?: string;
  completedBy?: string;
  completedAtUtc?: string;
  notes?: string;
  handoffTarget?: HandoffTarget;
  escalation?: EscalationRule;
  auditTrail: AuditEntry[];
}

export type IdFactory = (seed: string) => string;
