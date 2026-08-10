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

/** 'step' is one numbered instruction in a task card — see `stepNumbers` in engine/blocks.
 *  It carries no new field: the instruction is `md`, its photo is `figureRef`, and an attached
 *  note is the following 'callout' block. So the canonical checksum shape is unchanged (D64). */
export type BlockType = 'paragraph' | 'heading' | 'list' | 'table' | 'callout' | 'figure' | 'step';

export interface DocBlock {
  id: string;                 // stable across revisions; '<sectionId>::b<ordinal>' this slice
  type: BlockType;
  md: string;                 // block content as markdown (GFM)
  calloutKind?: 'note' | 'caution' | 'warning';
  splitFrom?: string;         // lineage when a block is split (set by the editor in Slice 3)
  /** Per-tail/type applicability of THIS BLOCK — field now, UI later (spec D-12).
   * Not the same axis as `DocRevision.fleetTypes` (D60/D65), which scopes the whole
   * entry: "this entry is about the G500". A block-level effectivity says "this
   * paragraph applies only to these tails inside an otherwise shared document".
   * Both can coexist; neither supersedes the other, so this is not a fork. */
  effectivity?: string[];
  figureRef?: string;         // image src for 'figure' blocks
  /** Regulation requirement ids this block satisfies (into regCatalog) — G1
   * compliance linking. Part of block content, so it rides the four-eyes revision. */
  complianceRefs?: string[];
  /**
   * This block was STAGED into the working draft by accepting reader suggestion
   * `<id>`, and holds that reader's words verbatim. It is not document text yet:
   * `validateSubmit` refuses a revision that still carries one, so a reader's
   * prose can never reach four-eyes unedited. The maintainer resolves it by
   * editing it into real wording, merging it up into its anchor, or deleting it.
   *
   * Deliberately absent from `canonicalizeSections`: authoring metadata whose
   * lifetime is shorter than the draft it lives in must not perturb the content
   * digest.
   */
  stagedFromSuggestionId?: string;
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
 * tribal-knowledge REVISIONS that describe ONE CAS message; a freeform article
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

/**
 * D64 — one row of maintenance's known-nuisance CMC list, the messages crew read off the TOD
 * (top-of-descent) report.
 *
 * **These are CMC maintenance messages, not CAS annunciations.** Different vocabulary, different
 * source: CAS is what the flight deck shows, this is what the Central Maintenance Computer logs.
 * That is why the row is its own shape rather than a `DocCasMeta` — `casMessage`/`casColor` do not
 * describe it, and the picker must never offer one of these as a CAS value at defect intake.
 *
 * **Informational, never suppressive.** A row says a message is known and who is tracking it. It
 * does not say "do not write it up", and nothing reads it to gate, filter or discourage the defect
 * path. Whether myGFO may go further is [[Q19]], routed to the DOM and deliberately NOT built.
 */
export interface DocCmcRow {
  /** As printed on the report, e.g. 'SATC-TSC2 TO SDU BUS FAULT'. */
  messageName: string;
  /** e.g. '2315011SATC'. Two rows in the source list have none — the source is incomplete, so
   *  this may be empty rather than the list being silently trimmed. */
  maintCode: string;
  ataChapter: string;
  /** Vendor tickets: 'PR015034', 'Jira 3242', 'C_GAC_GVII_PAR_3391'. */
  vendorRefs: string[];
  /** The source list distinguishes these, so we keep the distinction rather than flattening it:
   *  a fix in progress is not the same claim as an accepted nuisance. */
  vendorStatus: 'being-worked' | 'accepted' | 'superseded';
  /** e.g. 'PR015035 is closed, see PR014109'. */
  supersededNote?: string;
}

/**
 * D73 — how a document's content got into myGFO.
 *
 * myGFO is the SYSTEM OF RECORD, not a cache of SharePoint. Sync is pull-only;
 * myGFO never writes back. One writer per document.
 *
 * The ROUTING TEST: bytes are ingested if and only if EITHER a signature depends
 * on the content, OR it must be producible onboard — the D195 MEL, an FSDO LOA,
 * an (O)/(M) procedure text, placard wording. Everything else is a pointer.
 */
export type DocOriginKind =
  /** Written in myGFO through the block editor. The default; `undefined` reads as this. */
  | 'authored'
  /** Bytes received from outside, hashed by myGFO, frozen, cached offline. */
  | 'received-copy'
  /** Not held at all: resolved at access time from driveId + itemId. */
  | 'external-pointer';

/**
 * The frozen bytes of a received revision.
 *
 * APPEND-ONLY. Once a revision carries one, neither the blob nor the hash may be
 * rewritten: new bytes are a NEW revision, confirmed by a human (D73 step G).
 * Without that gate, an external edit button becomes an unsigned publish path
 * into an airworthiness record.
 */
export interface DocAttachment {
  /** Key into the IndexedDB blob store. */
  blobKey: string;
  filename: string;
  mimeType: string;
  byteLength: number;
  /** Computed by myGFO over these exact bytes. NEVER a vendor-reported hash:
   *  Graph supplies no SHA-256 on a business tenant. */
  sha256: string;
}

/** Why this document is held as bytes rather than pointed at — the D73 routing
 *  test, recorded so an auditor reads the reasoning instead of inferring it. */
export type CarriageReason = 'signature-attested' | 'required-onboard';

/** Where a REVISION's content came from. Append-only, like the revision itself:
 *  it is the frozen claim about what these exact bytes are. */
export interface DocProvenance {
  origin: DocOriginKind;
  /** Present iff origin === 'received-copy'. */
  attachment?: DocAttachment;
  ingestedAtUtc?: string;
  ingestedByUserId?: string;
  ingestedByName?: string;
  /** Human-readable origin: 'P&G SharePoint — Flight Ops / MEL', 'FSDO letter, 2026-06-02'. */
  sourceLabel?: string;
  /** The source version AS OBSERVED AT INGEST. Not a live pointer — SharePoint
   *  trims version history permanently, so a pinned versionId can cease to exist. */
  sourceVersionId?: string;
  carriageReason?: CarriageReason;
}

/**
 * Where a DOCUMENT's source file lives — the pointer half.
 *
 * Reference data, updatable, and deliberately NOT on the revision: a file that
 * moves in SharePoint has not produced a new revision of the document, and
 * pushing that through four-eyes would put content approvers in the business of
 * approving URLs.
 */
export interface DocSource {
  kind: 'sharepoint' | 'vendor-portal' | 'manual-upload' | 'other';
  driveId?: string;
  itemId?: string;
  /** An item URL a person can open. NEVER a Graph @microsoft.graph.downloadUrl —
   *  those expire in ~1h and outlive permission revocation. */
  webUrl?: string;
  label: string;
  lastConfirmedAtUtc?: string;
  lastConfirmedByUserId?: string;
  lastConfirmedByName?: string;
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
  /** Where this document's source file lives, when it is not authored here.
   *  Updatable reference data — see DocSource. */
  source?: DocSource;
  // D65 — `fleetTypes` and `casMeta` used to live HERE. They now ride DocRevision:
  // see the note on those fields below.
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
  /** mockSha256 of the canonical section serialization — shown as an integrity chip; folded into signature payloads.
   *  For a RECEIVED revision this covers only the generated placeholder and is
   *  therefore meaningless: read the digest through `displayDigest()`, never
   *  this field directly. */
  mockChecksum: string;
  /** D73 — where this revision's content came from. Absent reads as 'authored'. */
  provenance?: DocProvenance;
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
  /**
   * D65 — fleet-type applicability of this entry, canonical strings
   * (`'G650ER' | 'G500' | 'G800'`). Drives the tail page's Reference tab and the
   * defect-form CAS picker: a tail only ever sees knowledge tagged for its own type.
   * Absent/empty = not fleet-scoped (e.g. the KTEB ramp note), and such an entry is
   * never offered under a fleet filter.
   *
   * **WHY THIS IS ON THE REVISION AND NOT ON THE `Doc` (D65).** The picker feeds the
   * intake form for a SIGNED airworthiness record, and the colour it fills in is what
   * the FIR safety fast path reads (`fir/engine/suggestions.ts`). "Only published
   * knowledge is ever offered" therefore has to be a property of the engine. `Doc` is
   * the mutable identity row — anything on it is live the moment it is written — so
   * with these fields there, the property held only because one dialog footer happens
   * not to render a "Save draft" button for this class. On the revision, `casCatalog`
   * reaches them through `currentRevision()`, which returns a published revision or
   * nothing: a draft's CAS facts are not filtered out, they are unreachable.
   *
   * ONE field for both kinds of entry. D60's shape put `fleetTypes` inside `casMeta`,
   * but freeform articles need the same applicability with no `casMeta` at all — two
   * fields carrying the same fact would be the fork D29 exists to avoid.
   *
   * This is NOT part of `proposedMeta`. That carries the four-eyes identity fields for
   * CONTROLLED classes and is applied to the `Doc` by `applyPublish`; these fields are
   * read off the revision itself and are never copied onto the doc, which is the whole
   * point. The four controlled classes never set either field.
   */
  fleetTypes?: AircraftType[];
  /** D60/D65 — set only on a structured CAS entry; absent on freeform articles.
   *  Lives on the revision for the reason given on `fleetTypes` above. */
  casMeta?: DocCasMeta;
  /**
   * D64 — the known-nuisance CMC list, when this entry IS that list.
   *
   * The whole list on ONE doc, not one doc per message: maintenance revises it as a unit when the
   * vendor issues a new version, so a new list version is a new revision and the review badge
   * covers it at the right granularity. On the revision for the same reason as `fleetTypes` — a
   * draft's rows are unreachable rather than filtered.
   */
  cmcRows?: DocCmcRow[];
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

/**
 * Tribal-knowledge discussion thread entry.
 *
 * Working discussion, not a signed ledger record — but corrections are still
 * MARKED, never silent. `DocSuggestionReply` is deliberately append-only for the
 * same reason (a reader who acted on what a comment said must be able to see that
 * it since changed), so an edit stamps `editedAtUtc` and a delete is a tombstone
 * (`deletedAtUtc`) rather than a row disappearing out of a thread other people
 * have replied to. Author-only, enforced in the reducer.
 */
export interface DocComment {
  id: string;
  docId: string;
  authorUserId: string;
  authorName: string;
  role: string;
  text: string;
  createdAtUtc: string;
  /** Set when the author revised the text — the thread says "edited". */
  editedAtUtc?: string;
  /** Set when the author withdrew it. The row AND its text are kept and rendered
   *  as a tombstone: withdrawing is the author saying "do not rely on what I
   *  wrote", not "I never wrote it", and the record has to be able to say what
   *  was withdrawn. Use `isLiveComment` to exclude it from counts. */
  deletedAtUtc?: string;
}

/** A comment still standing (not withdrawn) — the count crews are shown. */
export function isLiveComment(c: DocComment): boolean {
  return !c.deletedAtUtc;
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
  /**
   * The revision that carries this suggestion's text. Written by
   * ACCEPT_SUGGESTION_INTO_DRAFT in the same transition that flips `status` to
   * 'accepted', so "accepted" and "a draft carries it" cannot disagree.
   *
   * Whether it SHIPPED is DERIVED, never stored: look the revision up and read
   * its status (`suggestionOutcome`). A draft later withdrawn or rejected must
   * stop claiming the suggestion shipped, and a second stored flag would drift
   * the first time that happened.
   */
  resolvedIntoRevisionId?: string;
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
  /**
   * D75 / LG-183 — the cabin shelf's section vocabulary, once someone has edited it.
   *
   * `undefined` means "never edited" and resolves to the shipped default (`CABIN_SECTIONS`) —
   * see `engine/cabinSections`. Only cabin knowledge is user-editable this round; every other
   * class still takes its categories from `DOC_CLASSES`.
   *
   * Note this is vocabulary, NOT applicability. Fleet type stays derived from the real fleet
   * (`useFleetTypes`), because `AircraftType` is load-bearing for MEL items and serviceability
   * and is not ours to widen from a documents screen.
   */
  cabinSections?: string[];
}
