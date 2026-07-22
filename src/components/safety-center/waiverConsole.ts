// Pure logic for the waiver manager console (D40). The console reads the SAME
// approvalRequests store the /approvals inbox reads and the SAME decide engine
// it actions through — there is no second waiver store. These helpers only
// project and summarise that shared store for a fleet-wide manager view.

import { type ApprovalRequest, currentApproverRole } from './approvalRequests';

export const WAIVER_KIND = 'waiver';

// Demo heuristic: a waiver still pending after this long reads as "overdue" in
// the aging tile. Not a regulatory clock — just a review-turnaround nudge.
export const OVERDUE_AFTER_MS = 2 * 24 * 60 * 60 * 1000;

/** The waiver slice of the shared approval store (hazards never route here). */
export function waiversOnly(requests: ApprovalRequest[]): ApprovalRequest[] {
  return requests.filter((r) => r.formKind === WAIVER_KIND);
}

/** True when the request is currently waiting on one of the given roles — i.e.
 *  this user may action it from the console. Mirrors the inbox's routing
 *  (pendingForRoles) exactly, so a manager can never approve a step that is
 *  actually another role's to decide. */
export function isAwaitingRoles(req: ApprovalRequest, roles: string[]): boolean {
  const role = currentApproverRole(req);
  return role != null && roles.includes(role);
}

/** For a finished (approved/denied) request, the ISO time of its last recorded
 *  decision; undefined while still pending. */
export function clearedAt(req: ApprovalRequest): string | undefined {
  if (req.status === 'pending') return undefined;
  const decided = req.chain.filter((s) => s.decidedAt).map((s) => s.decidedAt as string);
  return decided.length ? decided[decided.length - 1] : undefined;
}

export interface WaiverStats {
  total: number;
  pending: number;
  approved: number;
  denied: number;
  overdue: number;            // pending longer than OVERDUE_AFTER_MS
  avgClearMs: number | null;  // mean requestedAt->cleared over finished waivers; null if none cleared
}

/** Summarise the waiver slice for the cockpit tiles. `now` is injected so this
 *  stays pure and testable (the component passes Date.now()). */
export function waiverStats(requests: ApprovalRequest[], now: number): WaiverStats {
  const ws = waiversOnly(requests);
  let pending = 0, approved = 0, denied = 0, overdue = 0;
  let clearSum = 0, clearN = 0;
  for (const r of ws) {
    if (r.status === 'approved') approved++;
    else if (r.status === 'denied') denied++;
    else {
      pending++;
      const filed = new Date(r.requestedAt).getTime();
      if (!isNaN(filed) && now - filed > OVERDUE_AFTER_MS) overdue++;
    }
    const done = clearedAt(r);
    if (done) {
      const filed = new Date(r.requestedAt).getTime();
      const cleared = new Date(done).getTime();
      if (!isNaN(filed) && !isNaN(cleared) && cleared >= filed) {
        clearSum += cleared - filed;
        clearN++;
      }
    }
  }
  return { total: ws.length, pending, approved, denied, overdue, avgClearMs: clearN ? clearSum / clearN : null };
}
