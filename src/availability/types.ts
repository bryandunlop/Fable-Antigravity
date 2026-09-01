// The fleet availability model — one verdict per tail per day, with a ranked reason.
//
// Why this lives outside src/components: scheduling, lead, the executive fleet week and
// the booking portal all need the same answer to "can this tail fly on this day, and why
// not". Putting it in the executive view would force the booking portal to import the
// executive view. Everything here is pure — no React, no storage, no clock reads.
//
// Availability is DERIVED, never stored. Scheduling's holds and releases are an
// append-only overlay ON TOP of the derivation, never an edit to it.

/** What the day is, once the ladder in engine/availability.ts has run. */
export type AvailabilityState = 'available' | 'held' | 'committed' | 'unavailable';

/**
 * The only thing an executive or EA ever learns about a blocked day.
 * Deliberately coarse: the disclosure boundary is enforced by building labels from
 * (category, untilUtc) rather than by passing a model string through.
 */
export type ReasonCategory =
  | 'maintenance'
  | 'not-in-service'
  | 'no-crew'
  | 'not-yet-rostered'
  | 'committed'
  | 'held'
  | 'none';

export interface AvailabilityReason {
  category: ReasonCategory;
  /** Rank 0 = most blocking. The ladder is total, so ties are impossible. */
  rank: number;
  /** OPERATOR-ONLY. Defect text, WO number, vendor, crew name, hold note. Never disclosed. */
  detail: string;
  /** The bounding date — the ETR. null means genuinely open-ended (see LG-308). */
  untilUtc: string | null;
  sourceRef?: { kind: 'downtime' | 'defect' | 'deferral' | 'trip' | 'hold' | 'crew'; id: string };
}

export type ConflictKind =
  | 'trip-in-downtime'
  | 'trip-on-red-tail'
  | 'trip-without-crew'
  | 'hold-over-confirmed-trip'
  | 'deferral-expires-mid-trip';

/**
 * A collision the scheduler must resolve. NOT a verdict: a trip sitting inside a
 * downtime window still reads unavailable/maintenance — the collision surfaces here.
 */
export interface AvailabilityConflict {
  kind: ConflictKind;
  tail: string;
  dateUtc: string;
  tripId?: string;
  blockId?: string;
  overlayId?: string;
  /** OPERATOR-ONLY. */
  detail: string;
}

export interface AppliedOverlay {
  id: string;
  kind: SchedulerOverlay['kind'];
  by: string;
  byRole: string;
  atUtc: string;
  /** OPERATOR-ONLY. */
  note: string;
  /** The declared-inventory sentence — exec-safe, author-written. */
  publicLabel: string | null;
}

export interface CrewDaySummary {
  crewsFormable: number;
  crewsCommitted: number;
  crewsFree: number;
}

export interface TailDayAvailability {
  tail: string;
  dateUtc: string;
  state: AvailabilityState;
  /** The winning reason (reasons[0]). */
  reason: AvailabilityReason;
  /** The full ranked stack — scheduling sees all of it. */
  reasons: AvailabilityReason[];
  conflicts: AvailabilityConflict[];
  overlay: AppliedOverlay | null;
  /** OPERATOR-ONLY. */
  crew: CrewDaySummary;
  /** The trip holding this day, when one does. */
  tripId: string | null;
}

export interface AvailabilityDay {
  /** 'YYYY-MM-DD' (UTC) — stable key. */
  dateUtc: string;
  /** e.g. 'Wed 19' */
  dateLabel: string;
}

export interface AvailabilityRow {
  tail: string;
  type: string;
  cells: TailDayAvailability[];
}

export interface FleetAvailability {
  days: AvailabilityDay[];
  rows: AvailabilityRow[];
  generatedAtUtc: string;
}

/**
 * A scheduled maintenance window with a return-to-service date.
 *
 * Every field mirrors myairops `MaintenanceEntryModel` (confirmed authoritative — see
 * ref-myairops-maintenance-api; generated types at src/integration/myairops/gen/maintenance.ts),
 * so the Phase-2 pull is an adapter swap and not a redesign. `scheduledEndUtc` is THE ETR,
 * which is why it is non-nullable here even though the vendor allows null: a block with no
 * end date is exactly the down-forever problem this entity exists to fix (LG-308).
 *
 * This is an ops-board downtime event, NOT a CRS record. `released` is a reversible flag with
 * no signer and no immutable record — it must never be treated as a maintenance release.
 */
export interface MaintenanceDowntimeBlock {
  id: string;
  /** Vendor `.aircraft` — the tail, matched exactly (hyphens and case). */
  tail: string;
  maintenanceType: string;
  category: string | null;
  /** OPERATOR-ONLY. */
  description: string | null;
  airportIcao: string | null;
  /** OPERATOR-ONLY. */
  vendorName: string | null;
  /** OPERATOR-ONLY. */
  woNumber: string | null;
  scheduledStartUtc: string;
  /** THE ETR. */
  scheduledEndUtc: string;
  actualStartUtc: string | null;
  actualEndUtc: string | null;
  cancelled: boolean;
  released: boolean;
  createdBy: string | null;
  createdAtUtc: string | null;
  modifiedBy: string | null;
  modifiedAtUtc: string | null;
  source: 'local' | 'myairops';
  /** Vendor id, for reconciliation on pull. Never written back — myairops is pull-only. */
  sourceRef: string | null;
}

/**
 * Scheduling's overlay on the derived baseline. APPEND-ONLY: releasing a hold appends a
 * `release` row, it never edits the hold. Same supersede discipline as the ledger tables.
 */
export interface SchedulerOverlay {
  id: string;
  kind: 'hold' | 'release' | 'note' | 'dismissal';
  tail: string;
  /** Inclusive UTC day range, 'YYYY-MM-DD'. */
  fromDateUtc: string;
  toDateUtc: string;
  /** OPERATOR-ONLY. */
  reasonNote: string;
  /** Exec-safe sentence, e.g. 'Held by scheduling — board week'. */
  publicLabel: string | null;
  createdBy: string;
  createdByRole: string;
  createdAtUtc: string;
  /** Set on the row this one supersedes, when a release retires a hold. */
  supersedesOverlayId?: string;
  /** The suggestion this overlay came from, when the engine proposed it. */
  fromSuggestionId?: string;
}

export type ReleaseSuggestionTrigger =
  | 'downtime-ended-early'
  | 'hold-unclaimed'
  | 'crew-resolvable'
  | 'trip-cancelled';

/** Computed, never stored. Scheduling approves or dismisses; nothing applies itself. */
export interface ReleaseSuggestion {
  /** Deterministic from (trigger, tail, range) so a dismissal keeps matching it. */
  id: string;
  tail: string;
  fromDateUtc: string;
  toDateUtc: string;
  trigger: ReleaseSuggestionTrigger;
  /** Plain English, shown to scheduling. OPERATOR-ONLY. */
  rationale: string;
  /** Pre-fills the public label on approval, so an approved release publishes as inventory. */
  proposedPublicLabel: string;
}

/** Who is reading. See engine/disclosure.ts. */
export type Audience = 'executive' | 'executive-full' | 'operator';

export interface AvailabilityData {
  downtimeBlocks: MaintenanceDowntimeBlock[];
  overlays: SchedulerOverlay[];
}
