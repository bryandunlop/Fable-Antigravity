import type { ChecklistTemplate, TaskInstance, TripType, HandoffTarget } from '../engine';

export interface TripLegRecord {
  id: string;
  sequence: number;
  departureIcao: string;
  arrivalIcao: string;
  departureTimeUtc: string;   // ISO
  departureTimeLocal?: string;
  arrivalTimeUtc?: string;
  paxCount: number;
  filedStatus?: 'unfiled' | 'filed'; // for the inside-24h ForeFlight-lock logic (Plan 3)
}

export interface TripRecord {
  id: string;
  tripNumber: string;
  sourceSystem: 'manual' | 'myairops'; // 'manual' = stand-in until the Phase-2 pull
  sourceTripRef: string | null;        // the MAO trip number — reconciliation key; never written back
  tail: string;
  aircraftType: string;
  tripType: TripType;
  priority: 'standard' | 'vip' | 'urgent';
  status: 'planning' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  startDate: string; // ISO
  endDate: string;   // ISO
  legs: TripLegRecord[];
  /** Who is aboard, as records (D110 slice 2). Set by the booking projection; absent on fixtures. */
  people?: Array<{ id: string; name: string }>;
  /** Who is flying it (D110 slice 3) — the board's crew row. Set by the booking projection; absent on fixtures. */
  crew?: { pic: string; sic: string; fa: string | null } | null;
  createdBy: string;
  createdAtUtc: string;
  lastEditedBy?: string;
  lastEditedAtUtc?: string;
}

export interface EventTarget {
  kind: 'role' | 'dept' | 'person';
  value: string;
}

export interface SchedulingEvent {
  id: string;
  type: string;                 // e.g. 'crew_brief' | 'trip_sheet' | 'escalation'
  sourceDept: string;
  target: EventTarget;
  entityRef: { kind: 'trip' | 'leg' | 'task'; id: string };
  payload: Record<string, unknown>;
  actionUrl?: string;
  channel: HandoffTarget['channel'];   // 'inbox' (prototype) | 'teams' | 'email' (productionize via Graph)
  ackable: boolean;
  createdAtUtc: string;
  deliveredAtUtc?: string;
  ackState: 'n_a' | 'pending' | 'acked';
  ackedBy?: string;
  ackedAtUtc?: string;
}

/**
 * Storage seam. Every method is async so the Postgres adapter fits; the
 * in-memory adapter resolves immediately. Implementations return already-typed
 * engine/DTO objects (untyped input is validated upstream via validate.ts).
 */
export interface SchedulingStore {
  // Templates (versioned). saveTemplate upserts one (id, version).
  saveTemplate(t: ChecklistTemplate): Promise<ChecklistTemplate>;
  getTemplate(id: string, version?: number): Promise<ChecklistTemplate | null>; // omit version => latest published
  listPublishedTemplates(): Promise<ChecklistTemplate[]>; // latest published version of each id

  // Trip mirrors.
  saveTrip(t: TripRecord): Promise<TripRecord>;
  getTrip(id: string): Promise<TripRecord | null>;
  listTrips(): Promise<TripRecord[]>;

  // Task instances.
  saveInstances(xs: TaskInstance[]): Promise<void>;
  getInstance(id: string): Promise<TaskInstance | null>;
  updateInstance(x: TaskInstance): Promise<void>;
  listInstancesForTrip(tripId: string): Promise<TaskInstance[]>;
  listRecurringInstances(runDate: string): Promise<TaskInstance[]>;
  /** Drop rows outright — only for restored rows superseded by a re-minted id (D110 slice 2); a live task is cancelled, never removed. */
  removeInstances(ids: string[]): Promise<void>;

  // Events.
  saveEvent(e: SchedulingEvent): Promise<SchedulingEvent>;
  getEvent(id: string): Promise<SchedulingEvent | null>;
  updateEvent(e: SchedulingEvent): Promise<void>;
  listEventsForTarget(target: EventTarget): Promise<SchedulingEvent[]>;
  removeEvent(id: string): Promise<void>; // clears a stale event (e.g. escalation on task reopen)

  // Pilot-visibility config — which per-trip checklist items pilots see as completed.
  getPilotVisibility(): Promise<string[]>;                          // visible taskDefIds
  setPilotVisible(taskDefId: string, visible: boolean): Promise<void>;
}
