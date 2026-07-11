// FIR — Flight Irregularity Report (docs/FIR_MODULE_DESIGN.md §5).
// A retrospective, evidence-backed explanation of an operational irregularity.
// Off-ledger by design: a management artifact — updatable, audit-trailed — not a
// signed regulatory record. The evidence it references (defects, releases,
// signatures) stays in the tech-log ledger; the FIR points at it via anchors.

export type FirCategory = 'AOG' | 'DELAY' | 'DIVERSION' | 'DAMAGE' | 'SERVICE' | 'OTHER';

export type FirStatus = 'OPEN' | 'IN_REVIEW' | 'PUBLISHED' | 'CLOSED_INTERNAL';

export type FirAnchorKind = 'DEFECT' | 'WORK_CARD' | 'TRIP_LEG' | 'AIRCRAFT';

/** Pointer at ledger/ops evidence — 0..n per FIR. A deicing delay anchors to a
 * TRIP_LEG, not a defect. */
export interface FirAnchor {
  kind: FirAnchorKind;
  refId: string;
}

export interface FirTimelineEntry {
  /** SYSTEM entries are derived at render from anchors (never stored); the FIR
   * only persists MANUAL entries added by the owner. */
  source: 'SYSTEM' | 'MANUAL';
  atUtc: string;
  label: string;
  byOid?: string;
  note?: string;
  sourceRef?: { kind: FirAnchorKind | 'AOG_ACK' | 'DEBRIEF_EVENT'; refId: string };
}

/** Statement sub-lifecycle: REQUESTED → SUBMITTED | DECLINED. A decline is
 * recorded as a decline, not silently dropped. (Request/submit UI is slice 2.) */
export interface PerspectiveStatement {
  id: string;
  requestedByOid: string;
  requestedOfOid: string;
  requestedOfRole: string; // role snapshot at request time
  prompt: string;
  status: 'REQUESTED' | 'SUBMITTED' | 'DECLINED';
  requestedAtUtc: string;
  respondedAtUtc?: string;
  text?: string;
  declineReason?: string;
}

/** Curated, de-identified published revision — roles only, never names (§7).
 * (Curation/publish flow is slice 3.) */
export interface FirPublished {
  revision: number;
  approvedByOid: string; // four-eyes approver, ≠ author
  publishedAtUtc: string;
  summary: string;
  whatHappened: string;
  timeline: { atUtc: string; label: string }[];
  lessons: string[];
  ackLevel: 'none' | 'initials';
}

export type FirAuditKind = 'OPENED' | 'OWNER_REASSIGNED' | 'STATUS_CHANGED' | 'PUBLISHED' | 'REOPENED';

export interface FirAuditEvent {
  kind: FirAuditKind;
  atUtc: string;
  byOid: string;
  byName?: string;
  detail?: string;
}

export interface FirImpact {
  downtimeHours?: number; // from debrief when defect-anchored
  delayMinutes?: number;
  tripsAffected?: number;
  costNote?: string; // free text; no cost engine in v1
}

export interface FlightIrregularityReport {
  id: string;
  ref: string; // FIR-2026-001 (sequential per year)
  title: string;
  category: FirCategory;
  status: FirStatus;
  openedByOid: string;
  openedByName?: string; // display snapshot (AogAck precedent) — oids stay canonical
  ownerOid: string; // defaults to opener; reassignable, audit-trailed
  ownerName?: string;
  openedAtUtc: string;
  eventStartUtc: string;
  eventEndUtc?: string;
  /** Convenience snapshot for list filtering/header; evidence itself is anchored. */
  aircraftId?: string;
  anchors: FirAnchor[];
  narrative: string; // owner-written, internal (full attribution allowed)
  impact: FirImpact;
  manualTimeline: FirTimelineEntry[]; // MANUAL only; SYSTEM derived at render
  statements: PerspectiveStatement[];
  relatedSafetyItems: string[]; // link-only chips — no content crosses the safety boundary (§3)
  publishedRevision?: FirPublished;
  audit: FirAuditEvent[];
}

export interface FirState {
  firs: FlightIrregularityReport[];
}
