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
  locationFreetext?: string;
  severity: Severity;
  airworthinessAffecting: boolean | null; // null => treated as grounding
  status: DefectStatus;
  reportedByOid: string;
  reportedAtUtc: string;
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
  signatureId: string;
  supersedesId?: string;
}

export type SignedEntity = 'FLIGHT_LOG' | 'DEFECT' | 'DEFERRAL' | 'CRS' | 'ACCEPTANCE';

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

export interface FlightLog {
  id: string;
  aircraftId: string;
  sectorSequence: number;
  flightDateUtc: string;
  outUtc: string; offUtc: string; onUtc: string; inUtc: string;
  blockTime: number; flightTime: number;
  landings: number; cycles: number;
  picOid: string; sicOid: string;
  fuelUplift?: number;
  airframeTotalHours: number; airframeTotalCycles: number;
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
  | { type: 'ADD_SIGNATURE'; payload: Signature }
  | { type: 'ADD_AUDIT'; payload: AuditEntry }
  | { type: 'SET_PERSONA'; payload: string }
  | { type: 'EDIT_AIRCRAFT'; payload: Aircraft }
  | { type: 'EDIT_PERSONNEL'; payload: Personnel }
  | { type: 'UPSERT_PERSONNEL'; payload: Personnel }
  | { type: 'EDIT_MEL_ITEM'; payload: MelItem }
  | { type: 'UPSERT_CAMP_CORRELATION'; payload: CampCorrelation }
  | { type: 'ADD_INTEGRATION_EVENT'; payload: IntegrationEvent }
  | { type: 'RESET_STATE'; payload: TechLogState };
