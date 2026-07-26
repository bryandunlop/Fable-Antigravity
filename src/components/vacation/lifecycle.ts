// Vacation-request lifecycle (LG-19 / D37 Wave 2 exemplar).
//
// The audit's canonical gap: a crew member could submit a request and then do
// nothing with it — no withdraw, no edit, no way to correct a wrong date — and the
// "Modify & Resubmit" button on a denied request had no handler at all. Approvers
// likewise had no way back from a mis-click.
//
// The rules live here, as pure functions, because "may this person change this
// request now?" is the part worth testing and the part every surface must agree
// on: the crew list, the scheduling queue, and the manager review all ask the same
// questions rather than each re-deriving them from a status string.
//
// This is ordinary editable business data — a leave request, not an airworthiness
// record — so it is genuinely mutable. Signed regulatory records keep their
// append-only supersede discipline and must never adopt this pattern.

export type RequestStatus =
  | 'pending_scheduling'
  | 'denied_by_scheduling'
  | 'tentative_scheduling'
  | 'pending_manager'
  | 'denied_by_manager'
  | 'tentative_manager'
  | 'approved_awaiting_confirmation'
  | 'confirmed'
  | 'withdrawn';

/** Statuses where a decision is still outstanding, so the requester may still act. */
const IN_FLIGHT: RequestStatus[] = [
  'pending_scheduling',
  'tentative_scheduling',
  'pending_manager',
  'tentative_manager',
];

const DENIED: RequestStatus[] = ['denied_by_scheduling', 'denied_by_manager'];

/** Terminal for the requester: nothing they do alone can move it. */
const SETTLED: RequestStatus[] = ['confirmed', 'withdrawn'];

export interface LifecycleVerdict {
  allowed: boolean;
  /** Why not — shown to the user instead of a silently missing or dead button. */
  reason?: string;
}

/**
 * Withdraw = the requester takes their own request off the approvers' desks.
 * Allowed while a decision is outstanding, and after a denial (tidying up).
 * An approved-and-confirmed booking is NOT self-service: crew rosters are built
 * on it, so cancelling one is a conversation with scheduling, not a button.
 */
export function canWithdraw(status: RequestStatus): LifecycleVerdict {
  if (IN_FLIGHT.includes(status) || DENIED.includes(status)) return { allowed: true };
  if (status === 'withdrawn') return { allowed: false, reason: 'This request has already been withdrawn.' };
  if (status === 'confirmed') {
    return { allowed: false, reason: 'Confirmed leave is on the roster — contact scheduling to cancel it.' };
  }
  return { allowed: false, reason: 'This request can no longer be withdrawn.' };
}

/**
 * Edit = change the dates/type and put it back in the queue. Allowed while a
 * decision is outstanding and after a denial (that IS "modify & resubmit").
 * Editing always restarts approval: an approver who said "tentative" to one set
 * of dates has not agreed to a different set.
 */
export function canEdit(status: RequestStatus): LifecycleVerdict {
  if (IN_FLIGHT.includes(status) || DENIED.includes(status)) return { allowed: true };
  if (status === 'withdrawn') return { allowed: false, reason: 'Withdrawn requests cannot be edited — submit a new one.' };
  if (status === 'confirmed') {
    return { allowed: false, reason: 'Confirmed leave is on the roster — contact scheduling to change it.' };
  }
  if (status === 'approved_awaiting_confirmation') {
    return { allowed: false, reason: 'This request is approved and awaiting confirmation — withdraw it to make changes.' };
  }
  return { allowed: false, reason: 'This request can no longer be edited.' };
}

/**
 * Reversing a decision. An approver who denies or tentatively approves by mistake
 * can take it back while the request is still in the pipeline; once the requester
 * has a confirmed booking, unwinding it is a conversation, not a click.
 */
export function canReverseDecision(status: RequestStatus): LifecycleVerdict {
  if (DENIED.includes(status)) return { allowed: true };
  if (status === 'tentative_scheduling' || status === 'tentative_manager') return { allowed: true };
  if (status === 'withdrawn') return { allowed: false, reason: 'The requester withdrew this request.' };
  if (status === 'confirmed') return { allowed: false, reason: 'Confirmed leave is on the roster — reversing it needs scheduling.' };
  return { allowed: false, reason: 'There is no decision to reverse yet.' };
}

export function isSettled(status: RequestStatus): boolean {
  return SETTLED.includes(status);
}

/** Status a request returns to when it is edited or a decision is reversed. */
export const RESUBMIT_STATUS: RequestStatus = 'pending_scheduling';

export interface AuditComment {
  id: string;
  author: string;
  role: 'submitter' | 'scheduling' | 'manager';
  comment: string;
  timestamp: Date;
}

/**
 * Every lifecycle action leaves a comment on the thread. The DOM's standing
 * instruction for corrections is "make a note that it has been edited and a
 * record of it" — so a withdraw or an edit is never silent, even here where the
 * record is mutable.
 */
export function lifecycleNote(
  action: 'withdrawn' | 'edited' | 'decision-reversed',
  author: string,
  role: AuditComment['role'],
  detail?: string,
  now: Date = new Date(),
): AuditComment {
  const text = {
    withdrawn: 'Withdrew this request.',
    edited: 'Edited this request; it returns to Scheduling for review.',
    'decision-reversed': 'Reversed the earlier decision; the request returns to Scheduling.',
  }[action];
  return {
    id: `c-${action}-${now.getTime()}`,
    author,
    role,
    comment: detail ? `${text} ${detail}` : text,
    timestamp: now,
  };
}
