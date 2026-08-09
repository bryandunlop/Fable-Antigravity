// Pure selectors for the maintainer workbench — "what is in flight on this
// document". No React, no storage.
import type { DocRevision, RevisionStatus } from '../types';

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
