// One decision path for every surface that actions an approval request — the
// /approvals inbox AND the Safety-Center waiver console (D40). Both call this,
// so a decision made in either place walks the same chain and fans out the
// identical notifications. This is the guard against the "two action surfaces"
// drifting apart that the manager-cockpit option deliberately accepted.

import { eventStore } from '../../notifications/events';
import { decideRequest, currentApproverRole, currentStep, roleLabel, type ApprovalRequest, type Assignee } from '../safety-center/approvalRequests';

/** Apply an approve/deny to the request's current step and notify the requester
 *  (and, if it advanced, the next approver). `actingRoleId` is the role the
 *  current user is acting as; its label is recorded as the decider's name.
 *  Returns the updated request, or undefined if the id was already finished. */
export function decideAndNotify(
  req: ApprovalRequest,
  decision: 'approve' | 'deny',
  actingRoleId: string,
  comment?: string,
  /** D85 — who the next step is addressed to. Naming someone excludes the rest
   *  of that role, so the notification says who is expected to act. */
  nextAssignee?: Assignee,
): ApprovalRequest | undefined {
  const actor = roleLabel(actingRoleId);
  const updated = decideRequest(req.id, decision, actor, comment, nextAssignee);
  if (!updated) return undefined;
  const note = comment?.trim();
  eventStore.publish({
    id: `approval-decided-${req.id}-${Date.now()}`,
    severity: decision === 'deny' ? 'warn' : 'info',
    title: decision === 'deny'
      ? `${req.formLabel} denied: ${req.subjectTitle}`
      : (updated.status === 'approved' ? `${req.formLabel} approved: ${req.subjectTitle}` : `${req.subjectTitle}: ${actor} approved`),
    detail: decision === 'deny'
      ? (note ? `${actor}: “${note}”` : `Denied by ${actor}`)
      : (updated.status === 'approved'
          ? 'Fully approved'
          // Name the person when one was chosen — "Now with Lead Team" is not
          // actionable when only one member of Lead Team can now see it.
          : `Now with ${currentStep(updated)?.assigneeName ?? roleLabel(currentApproverRole(updated) || '')}`),
    module: 'Safety', link: '/approvals',
    audienceRoles: [req.requestedByRole, ...(updated.status === 'pending' && currentApproverRole(updated) ? [currentApproverRole(updated) as string] : [])],
  });
  return updated;
}
