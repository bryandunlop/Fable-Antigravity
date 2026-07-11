// Pure read-and-initial logic — the bulletins engine generalized to Doc/Revision.
// Acks bind to a revisionId, so publishing a new revision re-arms automatically.
import type { Doc, DocRevision, DocAcknowledgment } from '../types';
import { currentRevision } from './revisions';

/** One person expected to read a doc. Login is by role in this demo, so a
 * "reader" is a role plus its resolved representative user id. */
export interface Reader {
  role: string;
  userId: string;
}

/** Whether a reader (by role) is in the doc's target audience. */
export function isTargetRole(doc: Pick<Doc, 'roles'>, role: string): boolean {
  return doc.roles.includes('all') || doc.roles.includes(role);
}

/** Has this user acknowledged THIS revision? A prior-revision ack does not count. */
export function isAcknowledged(
  rev: Pick<DocRevision, 'id'>,
  acks: DocAcknowledgment[],
  userId: string,
): boolean {
  return acks.some((a) => a.revisionId === rev.id && a.userId === userId);
}

/** Acknowledgments recorded against this revision. */
export function acknowledgedFor(
  rev: Pick<DocRevision, 'id'>,
  acks: DocAcknowledgment[],
): DocAcknowledgment[] {
  return acks.filter((a) => a.revisionId === rev.id);
}

/** Readers who still owe a read on this revision. */
export function outstandingReaders(
  rev: Pick<DocRevision, 'id'>,
  readers: Reader[],
  acks: DocAcknowledgment[],
): Reader[] {
  return readers.filter((r) => !isAcknowledged(rev, acks, r.userId));
}

/** Is this revision's ack window past due? */
export function isOverdue(rev: Pick<DocRevision, 'ackDueDate'>, todayIso: string): boolean {
  return !!rev.ackDueDate && rev.ackDueDate < todayIso;
}

export interface RequiredRead {
  doc: Doc;
  rev: DocRevision;
}

/** Published, ack-requiring revisions the given user still owes. Drives the
 * "My required reads" list and the notification contributor. */
export function unacknowledgedRequiredReads(
  docs: Doc[],
  revisions: DocRevision[],
  acks: DocAcknowledgment[],
  userRole: string,
  userId: string,
): RequiredRead[] {
  return docs
    .filter((d) => !d.isArchived && isTargetRole(d, userRole))
    .map((doc) => ({ doc, rev: currentRevision(doc.id, revisions) }))
    .filter(
      (x): x is RequiredRead =>
        !!x.rev &&
        x.rev.requireAcknowledgment &&
        x.rev.ackLevel !== 'none' &&
        !isAcknowledged(x.rev, acks, userId),
    );
}
