// Shared domain types for the unified Document Compliance module.
// Model: a Doc is an identity; a DocRevision is the publishable unit; the ack
// requirement is a property of the published revision; a DocAcknowledgment is
// scoped to (doc, revision, user) so publishing a new revision re-arms it.
import type { Signature, AircraftType, CasColor } from '../tech-log/types';
import type { BulletinImage, BulletinVideo, BulletinLink } from '../bulletins/types';

export type AckLevel = 'none' | 'initials' | 'signature';

export type RevisionStatus =
  | 'draft'
  | 'pending-approval'
  | 'approved' // approved with a future effectiveDate; promoted to 'published' when the date arrives
  | 'published'
  | 'superseded'
  | 'rejected'
  | 'withdrawn'; // author/manager pulled it before publication — kept as a tombstone (C7)

export type BlockType = 'paragraph' | 'heading' | 'list' | 'table' | 'callout' | 'figure';

export interface DocBlock {
  id: string;                 // stable across revisions; '<sectionId>::b<ordinal>' this slice
  type: BlockType;
  md: string;                 // block content as markdown (GFM)
  calloutKind?: 'note' | 'caution' | 'warning';
  splitFrom?: string;         // lineage when a block is split (set by the editor in Slice 3)
  /** Per-tail/type applicability of THIS BLOCK — field now, UI later (spec D-12).
   * Not the same axis as `Doc.fleetTypes` (D60), which is doc-level: "this whole
   * entry is about the G500". A block-level effectivity says "this paragraph
   * applies only to these tails inside an otherwise shared document". Both can
   * coexist; neither supersedes the other, so this is not a fork. */
  effectivity?: string[];
  figureRef?: string;         // image src for 'figure' blocks
  /** Regulation requirement ids this block satisfies (into regCatalog) — G1
   * compliance linking. Part of block content, so it rides the four-eyes revision. */
  complianceRefs?: string[];
}

export interface DocSection {
  id: string;                 // '<docId>::<slug(heading)>', de-duplicated on collision
  level: number;              // 1 = document preamble/title, 2 = '##' section
  number: string;              // display number '3.1' or '' when the heading has none
  title: string;
  blocks: DocBlock[];
}

/**
 * D60 — the structured half of a CAS tribal-knowledge entry: what the message is
 * called and what colour tier the flight deck shows it in. Present only on
 * tribal-knowledge docs that describe ONE CAS message; a freeform article
 * (startup CAS stack, nuisance notes) carries `fleetTypes` and no `casMeta`.
 *
 * This is REFERENCE content. It is adjacent to airworthiness records and never
 * part of one — a defect's own `casMessage`/`casColor` are captured on the signed
 * defect (D57) and are not read from here. The catalog only ever *offers* values
 * at intake; nothing here can change what a signed record says.
 */
export interface DocCasMeta {
  casMessage: string;
  casColor: CasColor;
  /**
   * Related CMC/MAU fault codes — **hand-curated only.** Bryan explicitly rejected
   * rolling codes recorded during troubleshooting into tribal knowledge (D60,
   * answer 13): this class is for known issues, while defect/work-card CMC capture
   * is intake and diagnosis. Nothing in the app writes this field automatically,
   * and no intake path should be wired into it.
   */
  cmcCodes?: string[];
}

export interface Doc {
  id: string; // 'SOP-001' — generated from the class idPrefix
  classId: string; // key into DOC_CLASSES
  title: string;
  category: string;
  /** Audience roles; 'all' targets every role (bulletins semantics). */
  roles: string[];
  /** Accountable owner: review cycles + suggestion routing. */
  ownerUserId: string;
  ownerName: string;
  tags: string[];
  isPinned: boolean;
  isArchived: boolean;
  /** Per-doc override of the class default review cycle. */
  reviewCycleDays?: number;
  /** ISO date; staleness / overdue-for-review derives from this. */
  nextReviewDate?: string;
  createdDate: string;
  /**
   * D60 — fleet-type applicability of the whole entry, canonical strings
   * (`'G650ER' | 'G500' | 'G800'`). Drives the tail page's Reference tab and the
   * defect-form CAS picker: a tail only ever sees knowledge tagged for its own type.
   *
   * ONE field for both kinds of entry. D60's shape put `fleetTypes` inside
   * `casMeta`, but freeform articles need the same applicability with no `casMeta`
   * at all — two fields carrying the same fact would be the fork D29 exists to
   * avoid, so applicability lives here and `casMeta` carries only the structured
   * CAS half. Absent/empty = not fleet-scoped (every existing entry, e.g. the KTEB
   * ramp note), and such an entry is never offered under a fleet filter.
   */
  fleetTypes?: AircraftType[];
  /** D60 — set only on a structured CAS entry; absent on freeform articles. */
  casMeta?: DocCasMeta;
}

export interface DocRevision {
  id: string; // 'SOP-001-r2'
  docId: string;
  revision: string; // display label: '1.0', '2.0'
  status: RevisionStatus;
  sections: DocSection[]; // structured content — the block tree (replaces the markdown blob)
  /** Reader-facing "what changed" — REQUIRED when a prior published revision exists. */
  changeSummary: string;
  effectiveDate: string;
  expirationDate?: string;
  authorUserId: string;
  authorName: string;
  requireAcknowledgment: boolean;
  ackLevel: AckLevel;
  /** Drives the overdue chase list. */
  ackDueDate?: string;
  /** mockSha256 of the canonical section serialization — shown as an integrity chip; folded into signature payloads. */
  mockChecksum: string;
  submittedAtUtc?: string;
  decidedAtUtc?: string;
  decidedByUserId?: string; // approver; never === authorUserId (reducer-enforced)
  decidedByName?: string;
  rejectionReason?: string;
  publishedAtUtc?: string;
  // Withdrawal tombstone (C7): a draft/pending/rejected revision pulled before publication.
  withdrawnAtUtc?: string;
  withdrawnByUserId?: string;
  withdrawnByName?: string;
  withdrawalReason?: string;
  /** Doc-identity changes (title/audience/category/tags) riding this revision
   * through four-eyes; applied to the Doc when the revision publishes. A live
   * controlled doc's meta is never edited in place (C1). */
  proposedMeta?: { title: string; category: string; roles: string[]; tags: string[] };
  /** Legacy bulletins 'lastUpdated' display date — preserved for lossless round-trips. */
  lastUpdatedDate?: string;
  images?: BulletinImage[];
  videos?: BulletinVideo[];
  links?: BulletinLink[];
}

export interface DocAcknowledgment {
  docId: string;
  revisionId: string;
  revision: string; // display label at time of ack
  userId: string;
  userName: string;
  role: string;
  level: AckLevel; // how it was captured
  initials?: string; // level 'initials'
  signatureId?: string; // level 'signature' → Signature in state.signatures
  acknowledgedAtUtc: string;
  /** A newer ack by the same user for the same revision replaced this record;
   * kept for the audit trail (C2 — append-with-supersede, never delete). */
  superseded?: boolean;
}

/** Tribal-knowledge discussion thread entry. */
export interface DocComment {
  id: string;
  docId: string;
  authorUserId: string;
  authorName: string;
  role: string;
  text: string;
  createdAtUtc: string;
}

/** Reader feedback routed to the doc owner (Comply365-style crew→manual loop). */
export interface DocSuggestion {
  id: string;
  docId: string;
  revisionId: string;
  docTitle: string;
  authorUserId: string;
  authorName: string;
  role: string;
  /** Free-text "which part" (legacy / fallback display). */
  sectionRef?: string;
  /** Block this suggestion is anchored to (Slice 2 block-anchoring). */
  blockId?: string;
  proposedChange: string;
  rationale: string;
  status: 'open' | 'accepted' | 'declined';
  resolvedByUserId?: string;
  resolvedByName?: string;
  resolutionNote?: string;
  resolvedAtUtc?: string;
  createdAtUtc: string;
}

/** A reply on a suggestion's inline discussion thread. Working discussion, not a
 * signed ledger record (mirrors DocComment); the accepted change still rides the
 * four-eyes revision pipeline. */
export interface DocSuggestionReply {
  id: string;
  suggestionId: string;
  authorUserId: string;
  authorName: string;
  role: string;
  text: string;
  createdAtUtc: string;
}

/** Periodic-review completion without a new revision. */
export interface DocReviewRecord {
  id: string;
  docId: string;
  reviewedByUserId: string;
  reviewedByName: string;
  reviewedAtUtc: string;
  outcome: 'reaffirmed' | 'revision-started';
  note?: string;
}

export interface DocumentsState {
  docs: Doc[];
  revisions: DocRevision[];
  acknowledgments: DocAcknowledgment[];
  comments: DocComment[];
  suggestions: DocSuggestion[];
  suggestionReplies: DocSuggestionReply[];
  reviews: DocReviewRecord[];
  /** Signature-level ack records (tech-log Signature shape, shared e-sign component). */
  signatures: Signature[];
}
