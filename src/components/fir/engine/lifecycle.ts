// Publish lifecycle guards (§4) — the four-eyes gate for a FIR's published version.
// Mirrors the documents-module discipline (author ≠ approver, self-approval blocked),
// enforced in the reducer, not just hidden in the UI. Approver must be leadership.
import type { FirPublishedDraft, FlightIrregularityReport } from '../types';
import { isFirLeadership } from './access';

export type Guard = { ok: true } | { ok: false; error: string };

const ok: Guard = { ok: true };
const no = (error: string): Guard => ({ ok: false, error });

/** A draft is publishable once it carries the two prose fields a reader needs. */
export function isDraftComplete(draft?: FirPublishedDraft): boolean {
  return Boolean(draft && draft.summary.trim() && draft.whatHappened.trim());
}

/** The next revision number — documents-engine revision semantics. */
export function nextRevision(fir: Pick<FlightIrregularityReport, 'publishedRevision'>): number {
  return (fir.publishedRevision?.revision ?? 0) + 1;
}

/** Owner/leadership curate while OPEN; the draft is frozen once submitted. */
export function canCurate(fir: Pick<FlightIrregularityReport, 'status'>): boolean {
  return fir.status === 'OPEN';
}

/** OPEN → IN_REVIEW: the curated draft must be complete. */
export function validateSubmitForReview(
  fir: Pick<FlightIrregularityReport, 'status' | 'pendingPublished'>,
): Guard {
  if (fir.status !== 'OPEN') return no('Only an open FIR can be submitted for review.');
  if (!isDraftComplete(fir.pendingPublished)) {
    return no('A summary and a “what happened” are required before submitting.');
  }
  return ok;
}

/** IN_REVIEW → PUBLISHED: leadership approver, never the submitter (four-eyes). */
export function validateApprove(
  fir: Pick<FlightIrregularityReport, 'status' | 'reviewSubmittedByOid'>,
  deciderOid: string,
  deciderRoles: string[],
): Guard {
  if (fir.status !== 'IN_REVIEW') return no('Only an in-review FIR can be approved.');
  if (!isFirLeadership(deciderRoles)) return no('Publishing requires the leadership tier.');
  if (deciderOid && deciderOid === fir.reviewSubmittedByOid) {
    return no('Four-eyes: you cannot approve your own submission.');
  }
  return ok;
}

/** IN_REVIEW → OPEN with a reviewer note (returned for changes). */
export function validateRequestChanges(
  fir: Pick<FlightIrregularityReport, 'status'>,
  deciderRoles: string[],
  note: string,
): Guard {
  if (fir.status !== 'IN_REVIEW') return no('Only an in-review FIR can be sent back.');
  if (!isFirLeadership(deciderRoles)) return no('Reviewing requires the leadership tier.');
  if (!note.trim()) return no('A note is required so the owner knows what to change.');
  return ok;
}

/** OPEN → CLOSED_INTERNAL: owner or leadership; not every FIR earns publication. */
export function canCloseInternal(
  fir: Pick<FlightIrregularityReport, 'status' | 'ownerOid'>,
  viewer: { oid: string; roles: string[] },
): boolean {
  return fir.status === 'OPEN' && (viewer.oid === fir.ownerOid || isFirLeadership(viewer.roles));
}

/** A published or closed FIR can be reopened by leadership (audit-trailed). */
export function canReopen(
  fir: Pick<FlightIrregularityReport, 'status'>,
  roles: string[],
): boolean {
  return (fir.status === 'PUBLISHED' || fir.status === 'CLOSED_INTERNAL') && isFirLeadership(roles);
}
