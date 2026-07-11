// Shared domain types for the unified Document Compliance module.
// Model: a Doc is an identity; a DocRevision is the publishable unit; the ack
// requirement is a property of the published revision; a DocAcknowledgment is
// scoped to (doc, revision, user) so publishing a new revision re-arms it.
import type { Signature } from '../tech-log/types';
import type { BulletinImage, BulletinVideo, BulletinLink } from '../bulletins/types';

export type AckLevel = 'none' | 'initials' | 'signature';

export type RevisionStatus =
  | 'draft'
  | 'pending-approval'
  | 'approved' // approved with a future effectiveDate; promoted to 'published' when the date arrives
  | 'published'
  | 'superseded'
  | 'rejected';

export type BlockType = 'paragraph' | 'heading' | 'list' | 'table' | 'callout' | 'figure';

export interface DocBlock {
  id: string;                 // stable across revisions; '<sectionId>::b<ordinal>' this slice
  type: BlockType;
  md: string;                 // block content as markdown (GFM)
  calloutKind?: 'note' | 'caution' | 'warning';
  splitFrom?: string;         // lineage when a block is split (set by the editor in Slice 3)
  effectivity?: string[];     // per-tail/type applicability — field now, UI later (spec D-12)
  figureRef?: string;         // image src for 'figure' blocks
}

export interface DocSection {
  id: string;                 // '<docId>::<slug(heading)>', de-duplicated on collision
  level: number;              // 1 = document preamble/title, 2 = '##' section
  number: string;              // display number '3.1' or '' when the heading has none
  title: string;
  blocks: DocBlock[];
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
}

export interface DocRevision {
  id: string; // 'SOP-001-r2'
  docId: string;
  revision: string; // display label: '1.0', '2.0'
  status: RevisionStatus;
  content: string; // markdown
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
  /** mockSha256 of content — shown as an integrity chip; folded into signature payloads. */
  mockChecksum: string;
  submittedAtUtc?: string;
  decidedAtUtc?: string;
  decidedByUserId?: string; // approver; never === authorUserId (reducer-enforced)
  decidedByName?: string;
  rejectionReason?: string;
  publishedAtUtc?: string;
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
  /** Free-text "which part" (no PDF selection rects in this demo). */
  sectionRef?: string;
  proposedChange: string;
  rationale: string;
  status: 'open' | 'accepted' | 'declined';
  resolvedByUserId?: string;
  resolvedByName?: string;
  resolutionNote?: string;
  resolvedAtUtc?: string;
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
  reviews: DocReviewRecord[];
  /** Signature-level ack records (tech-log Signature shape, shared e-sign component). */
  signatures: Signature[];
}
