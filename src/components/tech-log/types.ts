// All IDs are strings; all enums are string unions; all dates are ISO-8601 UTC strings.

export type AircraftType = 'G650ER' | 'G500' | 'G800';
export type AircraftStatus = 'ACTIVE' | 'PROVISIONAL' | 'STORED' | 'SOLD';
export type Serviceability = 'GREEN' | 'AMBER' | 'RED';

export interface Aircraft {
  id: string;
  tailNumber: string;
  type: AircraftType;
  serialNumber: string;
  status: AircraftStatus;
  isProvisional: boolean;
  homeBase: string;
  airframeTotalHours: number;
  airframeTotalCycles: number;
  standbyFuelLoadLb?: number;
}

export type DefectSource = 'PIREP' | 'MAREP' | 'CABIN' | 'STRUCTURAL' | 'NEF';
export type DefectStatus = 'OPEN' | 'DEFERRED' | 'RECTIFIED' | 'CLOSED' | 'WATCHLISTED';
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

/** An attachment is part of the signed payload — its SHA-256 is folded into the content hash (AC 120-78B). */
export interface Attachment {
  id: string;
  filename: string;
  contentType: string;
  bytes: number;
  sha256: string;        // mock digest (display-only) — folded into the signed payload
  uri: string;           // mock object-store/data URI
  capturedAtUtc: string;
}

/** Where on the airframe a defect was found (§17.2 structured location; drag-drop schematic is later). */
export type DefectLocationKind = 'CABIN' | 'STRUCTURAL' | 'OTHER';

export interface Defect {
  id: string;
  aircraftId: string;
  flightLogId?: string;
  source: DefectSource;
  ataChapter: string;
  ataSubchapter?: string;
  description: string;
  symptom?: string;
  eicasMessage?: string;
  // ── structured location (§17.2) ──
  locationKind?: DefectLocationKind;
  cabinSeat?: string;          // LOPA seat, e.g. '12A'
  zoneCode?: string;           // structural zone, e.g. 'WING-L-STA-340'
  locationFreetext?: string;
  severity: Severity;
  airworthinessAffecting: boolean | null; // null => treated as grounding
  status: DefectStatus;
  reportedByOid: string;
  reportedAtUtc: string;
  attachments?: Attachment[];  // each attachment's SHA-256 is covered by the signature
  repetitiveDefectGroupId?: string; // §3.1 — set by the repetitive-defect detector
  rectificationText?: string;
  clearedByOid?: string;
  clearedTsUtc?: string;
  signatureId: string;
  supersedesId?: string;
}

export type MelCategory = 'A' | 'B' | 'C' | 'D';
export type RepairIntervalUnit = 'CALENDAR_DAY' | 'FLIGHT_DAY' | 'FLIGHT' | 'CYCLE' | 'HOUR';
export type ApprovalState = 'DRAFT' | 'PENDING_FSDO' | 'APPROVED' | 'SUPERSEDED';

export interface MelItem {
  id: string;
  aircraftType: AircraftType;
  mmelRevision: string;
  effectiveDate: string;
  approvalState: ApprovalState;
  ataReference: string;
  itemNumber: string;        // '24-02'
  subItemNumber: string;     // '24-02-02'
  title: string;
  category: MelCategory;
  numberInstalled: number | null;
  numberRequired: number | null;
  oProcedure?: string;
  mProcedure?: string;
  placardText?: string;
  placardLocation?: string;
  provisos?: string;
  flightCrewDeferral?: boolean | null;
  repairIntervalUnit?: RepairIntervalUnit; // Cat A usage-based
  repairIntervalValue?: number;
}

export type DeferralStatus = 'PROPOSED' | 'PENDING_PLACARD' | 'ACTIVE' | 'CLEARED' | 'EXPIRED';

export interface Deferral {
  id: string;
  defectId: string;
  aircraftId: string;
  melItemId: string;
  governingMmelRevision: string;
  governingEffectiveDate: string;
  // D36: the MEL's display identity, frozen at signing alongside the revision above. MelItem is an
  // updatable row (EDIT_MEL_ITEM replaces it in place under the same id), so resolving these through
  // melItemId at render time lets a later revision repaint a signed deferral — the point-in-time MEL
  // invariant's exact failure. Nullable per the ledger rule that added columns must be nullable, so
  // rows predating this snapshot read null rather than silently falling back to a join.
  melSubItemNumber?: string;
  melTitle?: string;
  category: MelCategory;
  dayOfDiscoveryUtc: string;
  clockStartDateUtc: string;
  governingTimezone: string;                 // D24: IANA zone the PL-25 clock is anchored to (default America/New_York)
  governingTimezoneOverrideReason?: string;  // D24: set only when overriding the Eastern default to the operating-local zone
  repairDueDateUtc?: string;       // calendar units
  usageDueThreshold?: number;      // usage units
  repairIntervalUnit: RepairIntervalUnit;
  repairIntervalValue: number;
  restrictionText?: string;
  placardRequired: boolean;
  mProcedureRequired: boolean;
  placardInstalled?: boolean;
  placardLocation?: string;
  extensionUsed: boolean;
  extensionTsUtc?: string;
  extensionJustification?: string;
  riiRequired: boolean;
  gatingReleaseId?: string;
  melReviewAcknowledged: boolean;
  signedByOid: string;
  signatureId: string;
  status: DeferralStatus;
  supersedesId?: string;
}

export type SignoffType = 'WORKCARD' | 'DEFECT_RECTIFICATION' | 'DEFERRAL' | 'MAINT_RELEASE';

export interface MaintenanceRelease {
  id: string;
  aircraftId: string;
  signoffType: SignoffType;
  linkedDefectId?: string;
  linkedDeferralId?: string;
  isGatingDischarge: boolean;
  workDescription: string;
  completionDateUtc: string;
  returnToServiceStatement: string;
  certifyingTechOid: string;
  apCertificateNumber: string;
  riiRequired: boolean;
  riiInspectorOid?: string;
  riiSignatureId?: string;
  linkedWorkCardId?: string;   // when the release certifies a completed work card (Phase 3)
  pdfBlobUri?: string;         // WORM PDF rendering (mock)
  signatureId: string;
  supersedesId?: string;
}

export type SignedEntity =
  | 'FLIGHT_LOG'
  | 'DEFECT'
  | 'DEFERRAL'
  | 'CRS'
  | 'ACCEPTANCE'
  | 'RECURRING_CHECK'
  | 'WORK_CARD'
  | 'BRIEFING'
  | 'POSTFLIGHT'
  | 'DOC_ACK'; // documents module: signature-level read-and-understood acknowledgment

// ── Phase 3: work-card execution + parts/labor (D10) ──
export type WorkCardStatus = 'OPEN' | 'IN_WORK' | 'COMPLETED';
export type WorkCardSource = 'CAMP' | 'MANUAL';

/** Task-level work/wait state (QM4/D27): what this card's elapsed time is currently being spent on.
 * The DOM's shop vocabulary: in work, waiting on parts ("POO" — parts on order), waiting on
 * inspection. Off-ledger WIP state on the card — wrench-vs-elapsed analytics derive from the
 * timestamped history, never from a timer. */
export type WorkCardStatusTag = 'IN_WORK' | 'WAITING_PARTS' | 'WAITING_INSPECTION';

export interface StatusTagEvent {
  tag: WorkCardStatusTag;
  atUtc: string;
  byOid: string;
  note?: string;   // required for WAITING_PARTS — what part, from whom (the POO record)
}

export interface WorkStep {
  id: string;
  seq: number;
  text: string;
  done: boolean;
  riiRequired?: boolean;
  riiInspectorOid?: string;   // independent inspector who signed THIS step (per-step RII)
  riiSignatureId?: string;    // the inspector's signature on this step
}

/** Expected part / tool / consumable mirrored from the CAMP WO detail (WRK 2_0_8: per-line part
 * numbers + Required Tools + Required Consumables). Read-only context on the pulled card — what
 * was actually installed is still captured as PartUsage under the signed CRS. */
export type CampExpectedKind = 'PART' | 'TOOL' | 'CONSUMABLE';
export interface CampExpectedItem {
  kind: CampExpectedKind;
  name: string;
  partNumber?: string;
  serialNumber?: string;
  qty?: number;
  calibrationDueUtc?: string;  // tools
}

/** A pulled CAMP work order / task card under execution. Updatable WIP until the completion sign-off. */
export interface WorkCard {
  id: string;
  cardNumber: string;          // myGFO card id, e.g. WC-1042
  woNumber?: string;           // CAMP work-order number (GetWODetails)
  aircraftId: string;
  title: string;
  ataChapter: string;
  description: string;
  steps: WorkStep[];
  status: WorkCardStatus;
  source: WorkCardSource;
  headerStatusCode: number;    // CAMP WO header status ladder (0=Complied With … 6=Planned)
  scheduled: boolean;          // scheduled task vs corrective (defect-driven)
  linkedDefectId?: string;
  linkedDeferralId?: string;   // the deferral this card is raised to clear (traceability; nullable)
  forecastRef?: string;        // CAMP due-list item this card complies with (CampForecastItem.ref)
  riiRequired: boolean;
  createdAtUtc: string;
  completedReleaseId?: string; // MaintenanceRelease produced on completion
  completedAtUtc?: string;
  statusTags?: StatusTagEvent[]; // QM4/D27 work/wait history (chronological; last entry is current)
  campExpected?: CampExpectedItem[]; // expected parts/tools/consumables mirrored from the CAMP WO
}

/** A part installed/removed under a work card. Removals feed MTBUR (§Phase 4). */
export interface PartUsage {
  id: string;
  workCardId: string;
  aircraftId: string;
  ataChapter: string;
  partNumber: string;
  description: string;
  serialNumber?: string;
  qty: number;
  isRotable?: boolean;
  removedPartNumber?: string;     // the part this one replaced (unscheduled removal → MTBUR event)
  removedSerialNumber?: string;
  removedReason?: string;
  installedAtUtc: string;
  addedByOid: string;
}

/** What the hours were spent on (QM1/D27) — man-hours must be answerable beyond wrench time:
 * troubleshooting, calls to tech ops, ordering parts. Legacy rows without a category read as WRENCH. */
export type LaborCategory = 'WRENCH' | 'TROUBLESHOOTING' | 'TECH_OPS_CALL' | 'PARTS_ORDERING' | 'INSPECTION' | 'OTHER';

export interface LaborEntry {
  id: string;
  workCardId: string;
  techOid: string;
  hours: number;
  dateUtc: string;
  description: string;
  category?: LaborCategory;  // default WRENCH for pre-existing rows
  note?: string;             // why-note — prompted (not buried) when the work ran long (QM1/QM5)
}

// ── D28: maintenance planners / project planning (DOM 2026-07-09). Operational workflow state,
//    OFF-ledger — a project organizes work, it is never itself a signed regulatory record. ──
export type ProjectStatus = 'PLANNING' | 'IN_WORK' | 'PAUSED' | 'CLOSED';
export type ProjectPauseReason = 'WAITING_PARTS' | 'WAITING_HANGAR' | 'WAITING_VENDOR' | 'AIRCRAFT_AWAY' | 'OTHER';

export interface ProjectPrepItem { id: string; text: string; done: boolean; }

/** A planned package of work per tail — a 12-month inspection package, a known upcoming
 * discrepancy (battery change) — assembled while the aircraft is away: parts ordered, task cards
 * and codes loaded, so it's ready to execute on arrival. "Our own layer filtered on top of CAMP." */
export interface MaintenanceProject {
  id: string;
  aircraftId: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  pauseReason?: ProjectPauseReason;
  pauseNote?: string;
  plannedStartUtc: string;      // planning window shown on the calendar
  plannedEndUtc: string;        // inclusive
  prepItems: ProjectPrepItem[]; // parts ordered / task cards loaded / job codes / tooling
  workCardIds: string[];        // execution cards raised under this project
  campWoRefs?: string[];        // CAMP work orders this project wraps
  createdByOid: string;
  createdAtUtc: string;
  statusHistory: { status: ProjectStatus; atUtc: string; byOid: string; note?: string }[];
  closedAtUtc?: string;
}

/** Technician vacation range for the planning-calendar overlay. Demo-local seed — production
 * reads the myGFO vacation module. */
export interface TechVacation {
  id: string;
  techOid: string;
  startUtc: string;
  endUtc: string;   // inclusive
  note?: string;
}

// ── §17.4: recurring dispatch-gating checks (Part-91 / IS-BAO). Expiry GROUNDS the aircraft. ──
export type RecurringIntervalUnit = 'CALENDAR_DAY' | 'MONTH' | 'FLIGHT_HOUR' | 'CYCLE';

/** Definition of a recurring check (updatable reference data). Last-accomplishment is DERIVED from the ledger. */
export interface RecurringCheck {
  id: string;
  aircraftId: string;
  name: string;
  description?: string;
  intervalUnit: RecurringIntervalUnit;
  intervalValue: number;
  ataChapter?: string;
  active: boolean;
  createdAtUtc: string;
}

/** A signed accomplishment of a recurring check (append-only ledger). */
export interface RecurringCheckAccomplishment {
  id: string;
  checkId: string;
  aircraftId: string;
  accomplishedAtUtc: string;
  accomplishedByOid: string;
  airframeHours: number;
  airframeCycles: number;
  note?: string;
  signatureId: string;
  supersedesId?: string;
}

// ── §17.1: intermittent faults (occurrence counter; NEVER affects serviceability). ──
export type IntermittentFaultStatus = 'MONITORING' | 'RESOLVED';

/** Updatable monitoring record; occurrenceCount is derived from the append-only occurrences. */
export interface IntermittentFault {
  id: string;
  aircraftId: string;
  ataChapter: string;
  title: string;
  description?: string;
  status: IntermittentFaultStatus;
  firstObservedUtc: string;
  createdByOid: string;
}

export interface IntermittentFaultOccurrence {
  id: string;
  faultId: string;
  aircraftId: string;
  observedAtUtc: string;
  observedByOid: string;
  note?: string;
  flightLogId?: string;
}

// ── §17.5: optional multi-leg trip aggregate over per-sector journey logs. ──
export type TripStatus = 'OPEN' | 'CLOSED';

export interface TripLeg {
  id: string;
  sequence: number;                 // 1-based order within the trip
  departureIcao: string;            // exact-match against Aircraft.homeBase for the fuel rule
  arrivalIcao: string;
  departureTimeUtc: string;
  arrivalTimeUtc: string;
  fratStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  fratScore?: number;               // the LATEST assessment's score; >= 25 is a no-go
  fratDraft?: FratDraft;            // saved-but-unsubmitted FRAT answers (mutable orchestration, not a signed record)
  fratRecords?: FratRecord[];       // submitted assessments, append-only per leg — latest is current
  airportReviewed: boolean;         // origin + destination airport info acknowledged
  fuelRequestId?: string;           // set when a home-base fuel-farm submission exists
  plannedFuelLb?: number;
  fuelFinalizedByOid?: string;
  fuelFinalizedAtUtc?: string;
}

// A FRAT saved mid-entry: just the selection matrix (by section/item index against the
// current FRAT template) + mitigation notes. Scores stay in the template — a draft never
// carries its own scoring.
export interface FratDraft {
  selections: boolean[][];
  mitigationNotes?: string;
  savedAtUtc: string;
}

/**
 * One FRAT item exactly as the pilot saw it, frozen at submission.
 *
 * Deliberately NOT an index into the live template. The FRAT template is editable in the
 * builder, so `selections[3][1]` means a later template edit silently changes what a
 * historical record says. Same discipline as `governingMmelRevision` on a deferral:
 * snapshot the meaningful value, never resolve it by live reference. (Bryan, 2026-07-14)
 */
export interface FratRecordItem {
  id: string;
  label: string;
  score: number;
  selected: boolean;
}

/** Title only — the template's `icon` is a React component reference, not a record. */
export interface FratRecordSection {
  title: string;
  items: FratRecordItem[];
}

/**
 * What a submitted FRAT retains. Before this existed, completion kept `fratScore` and
 * nothing else — `completeFratOnLeg` actively wiped `fratDraft`, erasing the ticked items
 * and the mitigation plan the form hard-requires at 20-24. The pilot was compelled to
 * write a plan that was then discarded at the moment of submission. (TL-17)
 *
 * Lives on the leg (mutable orchestration) — a FRAT is not one of CLAUDE.md's signed
 * append-only ledger records. But it is append-per-leg by intent: a resubmission adds an
 * entry and never replaces an earlier one, so "22 at 0600, 14 once the weather cleared"
 * stays answerable.
 */
export interface FratRecord {
  score: number;
  sections: FratRecordSection[];
  /** Mandatory at 20-24 per StandaloneFRATForm's submit gate. */
  mitigationNotes?: string;
  additionalNotes?: string;
  submittedAtUtc: string;
  submittedByOid: string;
}

export interface Trip {
  id: string;
  tripNumber: string;
  aircraftId: string;
  name: string;
  status: TripStatus;
  flightLogIds: string[];   // per-sector logs remain authoritative
  legs?: TripLeg[];         // planned legs + per-leg preflight enrichment (non-ledger working state)
  createdByOid: string;
  createdAtUtc: string;
}

// ── Preflight checklist → Flight Briefing (maintenance → pilot handoff) ──
export type BriefingStatus = 'DRAFT' | 'RELEASED' | 'ACKNOWLEDGED';

/**
 * A maintenance "release for flight" briefing sent to the crew. Fuel + notes are captured here;
 * the preflight checklist is a separate ChecklistInstance referenced by checklistInstanceId; the
 * airworthiness content (serviceability, MELs, defects, coming-due) is derived live for display,
 * with the headline serviceability snapshotted at release. Release + acknowledge are e-signed
 * events (not a CRS — this is a dispatch briefing).
 */
export interface FlightBriefing {
  id: string;
  aircraftId: string;
  preparedByOid: string;
  createdAtUtc: string;
  status: BriefingStatus;
  checklistInstanceId?: string;
  fuelPlannedLb?: number;
  notes?: string;
  // snapshot at release
  serviceabilityAtRelease?: Serviceability;
  releasedAtUtc?: string;
  releaseSignatureId?: string;
  // acknowledgement
  acknowledgedByOid?: string;
  acknowledgedAtUtc?: string;
  ackSignatureId?: string;
  acknowledgedDeferralIds?: string[]; // (O)/restriction/placard items the PIC ticked at acceptance
}

/**
 * Maintenance postflight on return. Signing this reclaims custody to maintenance (design §E) and
 * gathers the trip's still-open squawks into the work queue. Not a CRS, not a pilot handback.
 */
export interface Postflight {
  id: string;
  aircraftId: string;
  briefingId?: string;        // the dispatch this closes, if known
  performedByOid: string;     // maintenance
  performedAtUtc: string;
  checklistInstanceId?: string;
  notes?: string;
  gatheredDefectIds: string[]; // still-open squawks gathered for the work queue
  // WATCHLISTED items present at reclaim. Recorded separately so the signed postflight never asserts
  // a non-airworthiness cabin/NEF item is an open squawk. Optional: pre-existing records predate it.
  gatheredWatchItemIds?: string[];
  signatureId: string;
  supersedesId?: string;
}

// ── Maintenance servicing checklists (AOD preflight/postflight) ──
export type ChecklistPhase = 'PREFLIGHT' | 'POSTFLIGHT';
export type ChecklistItemKind = 'CHECK' | 'MEASUREMENT' | 'NOTE';
export type TemplateStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface MeasurementFieldDef {
  id: string;
  label: string;
  unit: string;
  target?: string;
}

export interface ChecklistItemDef {
  id: string;
  kind: ChecklistItemKind;
  label: string;
  reference?: string;
  requiredToRelease: boolean;
  fields?: MeasurementFieldDef[]; // MEASUREMENT only
}

export interface ChecklistSectionDef {
  id: string;
  title: string;
  items: ChecklistItemDef[];
}

/** Versioned/published reference data — an editing session never mutates a PUBLISHED row; publishing
 * always appends a new row (same id, version+1 for an edit; a new id, version 1 for a clone). */
export interface ChecklistTemplate {
  id: string;
  aircraftType: AircraftType;
  phase: ChecklistPhase;
  aodReference?: string;
  version: number;
  status: TemplateStatus;
  effectiveFrom?: string;
  clonedFromTemplateId?: string;
  clonedFromVersion?: number;
  sections: ChecklistSectionDef[];
  createdByOid: string;
  createdAtUtc: string;
}

export type ChecklistItemState = 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'NA';

export interface ChecklistItemEntry {
  itemDefId: string;
  state: ChecklistItemState;
  startedByOid?: string;
  startedAtUtc?: string;
  completedByOid?: string;
  completedAtUtc?: string;
  naReason?: string;
  values?: Record<string, string>;
  note?: string;
}

export type FuelLoadSource = 'NEXT_FLIGHT' | 'STANDBY';

export interface FuelLoadEntry {
  source: FuelLoadSource;
  targetLb: number;
  loadedLb?: number;
  loadedGal?: number;
  fuelRequestId?: string;
  recordedByOid: string;
}

/** Mutable working state until `signatureId` is set (mirrors a DRAFT FlightBriefing) — then frozen;
 * a post-signature correction is a superseding signed instance, never an in-place edit. */
export interface ChecklistInstance {
  id: string;
  aircraftId: string;
  phase: ChecklistPhase;
  templateId: string;
  templateVersion: number;
  briefingId?: string;
  postflightId?: string;
  entries: ChecklistItemEntry[];
  fuelLoad?: FuelLoadEntry; // POSTFLIGHT only
  signatureId?: string;
  createdAtUtc: string;
}

export type RecordNoteTarget = 'DEFECT' | 'DEFERRAL' | 'BRIEFING' | 'POSTFLIGHT';
export interface CoordinationMessage { id: string; aircraftId: string; authorOid: string; text: string; attachments?: Attachment[]; atUtc: string; editedAtUtc?: string; promotedToNoteId?: string; }
export interface RecordNote { id: string; aircraftId: string; targetType: RecordNoteTarget; targetId: string; authorOid: string; authorName: string; text: string; attachments?: Attachment[]; atUtc: string; sourceMessageId?: string; supersedesId?: string; }

export interface Signature {
  id: string;
  signedEntity: SignedEntity;
  signedEntityId: string;
  signerOid: string;
  signerName: string;
  signerRole: string;
  certNumber?: string;
  intentStatement: string;
  amr: string[];
  authTimeUtc: string;
  signedAtUtc: string;
  mockContentHash: string;  // display-only
}

/** Oil uplift in quarts, per engine + APU (§3.1). */
export interface OilUplift {
  eng1?: number;
  eng2?: number;
  apu?: number;
}

/** Ground de-/anti-ice application (§3.1): ISO 11075 fluid type + product + completion time. */
export interface DeIceRecord {
  fluidType: 'I' | 'II' | 'III' | 'IV';
  fluidName?: string;          // e.g. 'Type IV 100/0'
  startUtc?: string;           // holdover clock start (advisory)
}

export interface FlightLog {
  id: string;
  aircraftId: string;
  tripId?: string;             // optional multi-leg trip parent (§17.5)
  sectorSequence: number;
  flightDateUtc: string;
  outUtc: string; offUtc: string; onUtc: string; inUtc: string;
  blockTime: number; flightTime: number;
  landings: number; cycles: number;
  picOid: string; sicOid: string;
  fuelUplift?: number;
  oilUplift?: OilUplift;
  deIce?: DeIceRecord;
  delayCode?: string;          // IATA/ATA-style delay code
  delayMinutes?: number;
  delayAtaChapter?: string;    // chargeable system, if technical
  airframeTotalHours: number; airframeTotalCycles: number;
  pdfBlobUri?: string;         // WORM PDF rendering (mock)
  signatureId: string;
  supersedesId?: string;
}

export interface Personnel {
  oid: string;
  displayName: string;
  role: string;
  apCertificateNumber?: string;
  riiAuthorized: boolean;
  riiAuthorizedAta: string[];
  crewDeferralAuthorized?: boolean; // may defer flightCrewDeferral MEL items (en-route crew lane)
  placardAuthorized?: boolean;      // may sign a placard-only (non-(M)) discharge
  isSupervisor?: boolean;  // Chief Pilot / DOM / Chief Inspector — may file third-party corrections (SE-1)
  active: boolean;
}

export interface AuditEntry {
  id: string;
  actorOid: string;
  action: string;
  entityType: string;
  entityId: string;
  atUtc: string;
  summary: string;
}

export type SupersedeEntityType = 'Defect' | 'Deferral' | 'FlightLog' | 'Postflight' | 'RecordNote';

/** A rejected forked supersede attempt — DM-2: two superseding rows targeting the same parent.
 * Recorded for human reconciliation instead of silently creating two "current" rows. */
export interface SupersedeConflict {
  id: string;
  entityType: SupersedeEntityType;
  attemptedRowId: string;
  supersedesId: string;
  rejectedAtUtc: string;
  rejectedActorOid: string;
}

export type ReferenceChangeStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface PendingApprovalBase {
  id: string;
  summary: string;
  proposedByOid: string;
  proposedAtUtc: string;
  status: ReferenceChangeStatus;
  decidedByOid?: string;
  decidedAtUtc?: string;
  rejectionReason?: string;
}

/** Four-eyes gate (CLAUDE.md SE-2) for updatable reference data — Aircraft, Personnel, MEL-type
 * D195 activation. A proposed change never applies to live state until a SEPARATE maintenance user
 * approves it (enforced in the reducer via engine/approvals.isSelfApproval, not just hidden in the UI). */
export type PendingApproval = PendingApprovalBase &
  (
    | { kind: 'AIRCRAFT_EDIT'; before: Aircraft; after: Aircraft }
    | { kind: 'PERSONNEL_EDIT'; before: Personnel; after: Personnel }
    | { kind: 'MEL_TYPE_ACTIVATION'; aircraftId: string; aircraftType: AircraftType; melItemIds: string[]; evidenceRef: string }
    | { kind: 'MEL_ITEM_APPROVAL'; melItemId: string; evidenceRef: string }
  );

// ── Phase-2 integration correlation (OFF-ledger, per spec §18.1) ──
export type CampPushState = 'PENDING' | 'PUSHED' | 'FAILED';
export interface CampCorrelation {
  mygfoEntityId: string;
  entityType: 'DEFECT' | 'DEFERRAL';
  campDiscrepancyRef?: string;   // returned by CAMP IntegrateDiscrepancies
  pushState: CampPushState;
  lastPushedUtc?: string;
  lastError?: string;
}
export interface IntegrationEvent {
  id: string;
  system: 'CAMP' | 'MYAIROPS';
  op: string;
  summary: string;               // identifiers + outcome only (no payloads/PII)
  outcome: 'OK' | 'ERROR' | 'EMPTY' | 'BLOCKED';
  atUtc: string;
}

// OFF-ledger AOG acknowledgement — escalation/notification log, not a signed ledger record.
export interface AogAck {
  aircraftId: string;
  escalationAtAck: 'MONITOR' | 'ELEVATED' | 'CRITICAL';
  acknowledgedByOid: string;
  acknowledgedByName: string;
  atUtc: string;
  note?: string;
}

export interface TechLogState {
  aircraft: Aircraft[];
  melItems: MelItem[];
  personnel: Personnel[];
  flightLogs: FlightLog[];
  defects: Defect[];
  deferrals: Deferral[];
  releases: MaintenanceRelease[];
  signatures: Signature[];
  audit: AuditEntry[];
  workCards: WorkCard[];
  partUsages: PartUsage[];
  laborEntries: LaborEntry[];
  projects: MaintenanceProject[];   // D28 maintenance planners (off-ledger workflow state)
  techVacations: TechVacation[];    // calendar overlay data (demo-local seed)
  recurringChecks: RecurringCheck[];
  recurringAccomplishments: RecurringCheckAccomplishment[];
  intermittentFaults: IntermittentFault[];
  intermittentOccurrences: IntermittentFaultOccurrence[];
  trips: Trip[];
  briefings: FlightBriefing[];
  postflights: Postflight[];
  coordinationMessages: CoordinationMessage[];
  recordNotes: RecordNote[];
  supersedeConflicts: SupersedeConflict[]; // rejected forked supersede attempts (DM-2) — human reconciliation
  pendingApprovals: PendingApproval[]; // four-eyes queue (SE-2) — Aircraft/Personnel/MEL-activation proposals
  dismissedNotifications: string[];     // notification keys the user has cleared
  campCorrelation: CampCorrelation[];   // OFF-ledger integration state (§18.1)
  integrationEvents: IntegrationEvent[];
  aogAcks?: AogAck[];                    // OFF-ledger AOG acknowledgement / escalation log
  checklistTemplates: ChecklistTemplate[];
  checklistInstances: ChecklistInstance[];
  currentUserOid: string;
  nowOverrideUtc?: string; // optional demo clock
}

export type TechLogAction =
  | { type: 'ADD_DEFECT'; payload: Defect }
  | { type: 'SUPERSEDE_DEFECT'; payload: Defect }
  | { type: 'ADD_DEFERRAL'; payload: Deferral }
  | { type: 'SUPERSEDE_DEFERRAL'; payload: Deferral }
  | { type: 'ADD_RELEASE'; payload: MaintenanceRelease }
  | { type: 'ADD_FLIGHTLOG'; payload: FlightLog }
  | { type: 'SUPERSEDE_FLIGHTLOG'; payload: FlightLog }
  | { type: 'ADD_SIGNATURE'; payload: Signature }
  | { type: 'ADD_AUDIT'; payload: AuditEntry }
  | { type: 'ADD_WORK_CARD'; payload: WorkCard }
  | { type: 'EDIT_WORK_CARD'; payload: WorkCard }
  | { type: 'ADD_PART_USAGE'; payload: PartUsage }
  | { type: 'DELETE_PART_USAGE'; payload: string }
  | { type: 'ADD_LABOR_ENTRY'; payload: LaborEntry }
  | { type: 'DELETE_LABOR_ENTRY'; payload: string }
  | { type: 'ADD_PROJECT'; payload: MaintenanceProject }
  | { type: 'EDIT_PROJECT'; payload: MaintenanceProject }
  | { type: 'ADD_RECURRING_CHECK'; payload: RecurringCheck }
  | { type: 'EDIT_RECURRING_CHECK'; payload: RecurringCheck }
  | { type: 'ADD_RECURRING_ACCOMPLISHMENT'; payload: RecurringCheckAccomplishment }
  | { type: 'ADD_INTERMITTENT_FAULT'; payload: IntermittentFault }
  | { type: 'EDIT_INTERMITTENT_FAULT'; payload: IntermittentFault }
  | { type: 'ADD_INTERMITTENT_OCCURRENCE'; payload: IntermittentFaultOccurrence }
  | { type: 'ADD_TRIP'; payload: Trip }
  | { type: 'EDIT_TRIP'; payload: Trip }
  | { type: 'ADD_BRIEFING'; payload: FlightBriefing }
  | { type: 'EDIT_BRIEFING'; payload: FlightBriefing }
  | { type: 'ADD_POSTFLIGHT'; payload: Postflight }
  | { type: 'SUPERSEDE_POSTFLIGHT'; payload: Postflight }
  | { type: 'ADD_COORDINATION_MESSAGE'; payload: CoordinationMessage }
  | { type: 'EDIT_COORDINATION_MESSAGE'; payload: CoordinationMessage }
  | { type: 'DELETE_COORDINATION_MESSAGE'; payload: string }
  | { type: 'ADD_RECORD_NOTE'; payload: RecordNote }
  | { type: 'SUPERSEDE_RECORD_NOTE'; payload: RecordNote }
  | { type: 'DISMISS_NOTIFICATION'; payload: string }
  | { type: 'SET_PERSONA'; payload: string }
  | { type: 'EDIT_AIRCRAFT'; payload: Aircraft }
  | { type: 'EDIT_PERSONNEL'; payload: Personnel }
  | { type: 'UPSERT_PERSONNEL'; payload: Personnel }
  | { type: 'EDIT_MEL_ITEM'; payload: MelItem }
  | { type: 'UPSERT_CAMP_CORRELATION'; payload: CampCorrelation }
  | { type: 'ADD_INTEGRATION_EVENT'; payload: IntegrationEvent }
  | { type: 'ACK_AOG'; payload: AogAck }
  | { type: 'PROPOSE_CHANGE'; payload: PendingApproval }
  | { type: 'DECIDE_APPROVAL'; payload: { id: string; approve: boolean; decidedByOid: string; decidedAtUtc: string; rejectionReason?: string } }
  | { type: 'ADD_CHECKLIST_TEMPLATE'; payload: ChecklistTemplate }
  | { type: 'ADD_CHECKLIST_INSTANCE'; payload: ChecklistInstance }
  | { type: 'EDIT_CHECKLIST_INSTANCE'; payload: ChecklistInstance }
  | { type: 'RESET_STATE'; payload: TechLogState };
