// Engine-wide types. Pure declarations, no logic. Extended (append-only) by later tasks.

export type Weekday = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

export type DueRule =
  | { kind: 'dayOfTimeLocal'; time: string /* 'HH:MM' 24h, office-local */ }
  | { kind: 'weekday'; day: Weekday; period?: 'AM' | 'PM' }
  | { kind: 'dayOfMonth'; day: number; when: 'before' | 'onOrBefore' | 'around' }
  | { kind: 'quarterWeek'; week: number /* 1 = first week of the quarter */ }
  | { kind: 'annualDate'; month: number /* 1-12 */; day: number }
  | { kind: 'hoursBeforeEtd'; hours: number }
  | { kind: 'daysBeforeEtd'; days: number /* calendar days, weekends included */ }
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

/** Per-leg / exact-airport instantiation (Phase 2). */
export type AirportEndpoint = 'departure' | 'arrival' | 'both';
export type AirportMatch =
  | { kind: 'exact'; icao: string }
  | { kind: 'prefix'; prefix: string; except?: string[] };
export interface AppliesTo {
  endpoint: AirportEndpoint;
  airport: AirportMatch;
}
/** What kind of trip change re-flags a completed task (Phase 2). */
export type ReTrigger = 'legScheduleChange' | 'aircraftChange' | 'passengerChange';

export interface LegContext {
  legId: string;
  sequence: number;
  departureIcao: string;
  arrivalIcao: string;
  departureTimeUtc: string;
  arrivalTimeUtc?: string;
  paxCount: number;
}

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
  /** Per-leg context for per-airport instantiation + reconcile (Phase 2). Optional for
   *  back-compat with trip-level-only callers; toTripContext populates it for real trips. */
  legs?: LegContext[];
  /** Who is aboard, as records (D110 slice 2) — a person-bound task fans out one per entry. */
  people?: PersonContext[];
}

export interface PersonContext { id: string; name: string }

/** What an item is about — the leg, person or crew it verifies (D110 slice 2). Absent = the whole trip. */
export type BindKind = 'leg' | 'person' | 'crew';
export interface BoundTo { kind: BindKind; id: string; label: string }

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
  /** Per-airport instantiation (Phase 2). undefined = trip-level (one instance per trip). */
  appliesTo?: AppliesTo;
  /** Which trip changes re-flag a completed instance (Phase 2). undefined/empty = never. */
  reTriggerOn?: ReTrigger[];
  /** Fan out per person aboard, or bind to the crew (D110 slice 2). Per-airport tasks bind to their leg via `appliesTo`. */
  bindTo?: 'person' | 'crew';
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

export type TaskStatus = 'open' | 'in_progress' | 'blocked' | 'done' | 'n_a' | 'cancelled';
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
  /** Per-airport instance provenance (Phase 2): which leg + endpoint this instance is for. */
  legId?: string;
  airportIcao?: string;
  airportRole?: 'departure' | 'arrival';
  /** Per-person instance provenance (D110 slice 2): which person this instance is for. */
  personId?: string;
  /** The booking fact this item verifies; the People tab, the board mark and the Checklist row all read it. */
  boundTo?: BoundTo;
  /** Set when a completed task was re-opened by a trip change; cleared on re-completion. */
  reflag?: { change: ReTrigger };
  auditTrail: AuditEntry[];
}

export type IdFactory = (seed: string) => string;
