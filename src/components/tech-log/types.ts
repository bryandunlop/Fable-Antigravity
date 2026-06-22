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
}

export type DefectSource = 'PIREP' | 'MAREP' | 'CABIN' | 'STRUCTURAL' | 'NEF';
export type DefectStatus = 'OPEN' | 'DEFERRED' | 'RECTIFIED' | 'CLOSED';
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
  category: MelCategory;
  dayOfDiscoveryUtc: string;
  clockStartDateUtc: string;
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
  | 'POSTFLIGHT';

// ── Phase 3: work-card execution + parts/labor (D10) ──
export type WorkCardStatus = 'OPEN' | 'IN_WORK' | 'COMPLETED';
export type WorkCardSource = 'CAMP' | 'MANUAL';

export interface WorkStep {
  id: string;
  seq: number;
  text: string;
  done: boolean;
  riiRequired?: boolean;
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
  riiRequired: boolean;
  createdAtUtc: string;
  completedReleaseId?: string; // MaintenanceRelease produced on completion
  completedAtUtc?: string;
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

export interface LaborEntry {
  id: string;
  workCardId: string;
  techOid: string;
  hours: number;
  dateUtc: string;
  description: string;
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
  fratScore?: number;               // cumulative FRAT points; >= 25 is a no-go
  airportReviewed: boolean;         // origin + destination airport info acknowledged
  fuelRequestId?: string;           // set when a home-base fuel-farm submission exists
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

export interface BriefingChecklistItem {
  id: string;
  text: string;
  done: boolean;
  mandatory?: boolean;
  source?: 'TEMPLATE' | 'CAMP'; // pulled from a CAMP task vs a standing template item
}

/**
 * A maintenance "release for flight" briefing sent to the crew. The checklist + fuel + notes are
 * captured here; the airworthiness content (serviceability, MELs, defects, coming-due) is derived
 * live for display, with the headline serviceability snapshotted at release. Release + acknowledge
 * are e-signed events (not a CRS — this is a dispatch briefing).
 */
export interface FlightBriefing {
  id: string;
  aircraftId: string;
  preparedByOid: string;
  createdAtUtc: string;
  status: BriefingStatus;
  checklist: BriefingChecklistItem[];
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
  checklist: BriefingChecklistItem[];
  notes?: string;
  gatheredDefectIds: string[]; // still-open squawks gathered for the work queue
  signatureId: string;
  supersedesId?: string;
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
  outcome: 'OK' | 'ERROR' | 'EMPTY';
  atUtc: string;
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
  recurringChecks: RecurringCheck[];
  recurringAccomplishments: RecurringCheckAccomplishment[];
  intermittentFaults: IntermittentFault[];
  intermittentOccurrences: IntermittentFaultOccurrence[];
  trips: Trip[];
  briefings: FlightBriefing[];
  postflights: Postflight[];
  coordinationMessages: CoordinationMessage[];
  recordNotes: RecordNote[];
  dismissedNotifications: string[];     // notification keys the user has cleared
  campCorrelation: CampCorrelation[];   // OFF-ledger integration state (§18.1)
  integrationEvents: IntegrationEvent[];
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
  | { type: 'RESET_STATE'; payload: TechLogState };
