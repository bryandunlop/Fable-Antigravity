// Pure selectors for the maintainer workbench — "what is in flight on this
// document". No React, no storage.
import type { Doc, DocBlock, DocRevision, DocSection, DocSuggestion, RevisionStatus } from '../types';
import { reviewStatus, type ReviewStatus } from './review';

/**
 * A document may hold at most ONE revision in these states.
 *
 * `pending-approval` is included deliberately. Forking a draft underneath a
 * revision that is already with an approver means they decide on content the
 * document has locally superseded — the approval would attest something nobody
 * is publishing. The workbench says so and offers the existing withdraw path
 * instead.
 */
export const IN_FLIGHT_STATUSES: RevisionStatus[] = ['draft', 'rejected', 'pending-approval'];

/** The revision in flight on a doc, whatever its stage. At most one (CREATE_DRAFT guards it). */
export function inFlightRevision(docId: string, revisions: DocRevision[]): DocRevision | undefined {
  return revisions.find((r) => r.docId === docId && IN_FLIGHT_STATUSES.includes(r.status));
}

/**
 * The single editable revision of a doc — the "working draft".
 *
 * A `rejected` revision counts: returning it to the author is a request to keep
 * working, and `UPDATE_DRAFT` flips it back to `draft` on the next save.
 * A `pending-approval` revision does NOT count — it is not editable.
 */
export function workingDraft(docId: string, revisions: DocRevision[]): DocRevision | undefined {
  return revisions.find(
    (r) => r.docId === docId && (r.status === 'draft' || r.status === 'rejected'),
  );
}

/** Blocks holding a reader's words that a maintainer has not yet worked in. */
export function stagedBlocks(sections: DocSection[]): DocBlock[] {
  return sections.flatMap((s) => s.blocks.filter((b) => b.stagedFromSuggestionId));
}

/**
 * What actually became of a suggestion — DERIVED from the revision carrying it,
 * never from `status` alone.
 *
 * `status: 'accepted'` only says a maintainer took it on. If that draft was then
 * withdrawn or rejected, the reader's change did NOT ship, and telling them it
 * did would be a false claim on a compliance surface. So the carrying revision's
 * own status is the authority.
 */
export type SuggestionOutcome =
  | 'open'
  | 'declined'
  | 'staged-in-draft'
  | 'pending-approval'
  | 'scheduled'
  | 'published'
  | 'dropped';

export function suggestionOutcome(sug: DocSuggestion, revisions: DocRevision[]): SuggestionOutcome {
  if (sug.status === 'open') return 'open';
  if (sug.status === 'declined') return 'declined';
  // Accepted before this field existed: honest silence beats an invented link.
  if (!sug.resolvedIntoRevisionId) return 'staged-in-draft';
  const carrier = revisions.find((r) => r.id === sug.resolvedIntoRevisionId);
  if (!carrier) return 'dropped';
  switch (carrier.status) {
    case 'draft':
      return 'staged-in-draft';
    case 'pending-approval':
      return 'pending-approval';
    case 'approved':
      return 'scheduled';
    case 'published':
    case 'superseded':
      return 'published';
    default:
      // 'rejected' | 'withdrawn' — the change did not survive.
      return 'dropped';
  }
}

/** Everything happening to one document, for the badges and the workbench header. */
export interface DocInFlight {
  openSuggestionCount: number;
  /** Staged reader words still awaiting a maintainer's wording. */
  stagedCount: number;
  workingDraft?: DocRevision;
  pendingApproval?: DocRevision;
  /** Approved but not yet effective — publishes on its effective date. */
  scheduled?: DocRevision;
  review: ReviewStatus;
  /** True when anything at all needs a maintainer's attention. */
  hasActivity: boolean;
}

export function docInFlight(
  doc: Doc,
  revisions: DocRevision[],
  suggestions: DocSuggestion[],
  todayIso: string,
): DocInFlight {
  const openSuggestionCount = suggestions.filter(
    (s) => s.docId === doc.id && s.status === 'open',
  ).length;
  const draft = workingDraft(doc.id, revisions);
  const pendingApproval = revisions.find(
    (r) => r.docId === doc.id && r.status === 'pending-approval',
  );
  const scheduled = revisions.find((r) => r.docId === doc.id && r.status === 'approved');
  const review = reviewStatus(doc, todayIso);
  return {
    openSuggestionCount,
    stagedCount: draft ? stagedBlocks(draft.sections).length : 0,
    workingDraft: draft,
    pendingApproval,
    scheduled,
    review,
    hasActivity:
      openSuggestionCount > 0 ||
      !!draft ||
      !!pendingApproval ||
      !!scheduled ||
      review === 'due-soon' ||
      review === 'overdue',
  };
}
