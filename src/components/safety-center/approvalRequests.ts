// Generic, manager-configurable approval routing (D39). A form template can
// carry an ordered `approvalChain` of role ids; filing such a form creates an
// ApprovalRequest that walks the chain one step at a time. Each step's role
// sees the request in their own Approvals inbox and approves/denies it. A
// denial stops the chain. Hazards are deliberately NOT routed here — they keep
// their bespoke Manager→Accountable-Executive workflow (see D39 / handleFiled).
//
// The request IS the record for forms without a dedicated store (waivers): it
// snapshots the submitted values + their field labels, so nothing is dropped.

import { useEffect, useReducer } from 'react';
import { ALL_ROLES, ADDITIONAL_ROLES, getRoleLabelByValue } from '../../lib/mockUsers';

export type StepStatus = 'pending' | 'approved' | 'denied';
export type RequestStatus = 'pending' | 'approved' | 'denied';

export interface ApprovalStep {
  role: string;              // role id from the catalog
  status: StepStatus;
  decidedByName?: string;
  decidedAt?: string;        // ISO
  comment?: string;
  // D85 — the specific person this step is addressed to. Naming someone
  // EXCLUDES the rest of the role: the request leaves every other holder of
  // that role's inbox. An unnamed step stays role-wide, as D39 built it.
  assigneeUserId?: string;
  assigneeName?: string;
  /** Set when the step was re-pointed at a different person after the fact —
   *  who did it and when. An excluded request whose named approver is away is
   *  otherwise stuck where nobody can see it. */
  reassignedByName?: string;
  reassignedAt?: string;
}

/** Who a step is addressed to, when the sender named an individual. */
export interface Assignee { userId: string; name: string; }

export interface ApprovalRequest {
  id: string;
  formKind: string;          // 'waiver' | 'asap' | 'cws' — never 'hazard'
  formLabel: string;         // display, e.g. 'Waiver'
  subjectTitle: string;
  values: Record<string, string>;        // submitted answers snapshot
  fieldLabels: Record<string, string>;   // field id -> label, for rendering
  requestedByRole: string;
  requestedByName: string;
  requestedAt: string;       // ISO
  chain: ApprovalStep[];
  currentStep: number;       // index into chain; -1 when finished
  status: RequestStatus;
}

// Any role can be picked as an approver — the full login catalog.
export const APPROVER_ROLES: { value: string; label: string }[] = [
  ...ALL_ROLES.map((r) => ({ value: r.value, label: r.label })),
  ...ADDITIONAL_ROLES.map((r) => ({ value: r.id, label: r.label })),
];

export function roleLabel(roleId: string): string {
  return getRoleLabelByValue(roleId);
}

// ---- pure reducer core (tested) -------------------------------------------

export interface BuildInput {
  formKind: string;
  formLabel: string;
  subjectTitle: string;
  values: Record<string, string>;
  fieldLabels: Record<string, string>;
  requestedByRole: string;
  requestedByName: string;
  chainRoles: string[];
  id: string;
  requestedAt: string;
}

/** Initialize a request from a template's chain. An empty chain means "no
 *  approval gate" — the request is born already approved. */
export function buildRequest(input: BuildInput): ApprovalRequest {
  const chain: ApprovalStep[] = input.chainRoles.map((role) => ({ role, status: 'pending' as StepStatus }));
  const gated = chain.length > 0;
  return {
    id: input.id,
    formKind: input.formKind,
    formLabel: input.formLabel,
    subjectTitle: input.subjectTitle,
    values: input.values,
    fieldLabels: input.fieldLabels,
    requestedByRole: input.requestedByRole,
    requestedByName: input.requestedByName,
    requestedAt: input.requestedAt,
    chain,
    currentStep: gated ? 0 : -1,
    status: gated ? 'pending' : 'approved',
  };
}

/** Apply an approve/deny to the current step. Approve advances to the next
 *  step (or completes on the last); deny stops the chain. A no-op on a request
 *  that is already finished. */
export function applyDecision(
  req: ApprovalRequest,
  decision: 'approve' | 'deny',
  actorName: string,
  comment: string | undefined,
  at: string,
  /** Who the NEXT step is addressed to. Approving is the moment the sender
   *  chooses the individual, so it rides with the decision rather than being a
   *  second write that could fail on its own. */
  nextAssignee?: Assignee,
): ApprovalRequest {
  if (req.status !== 'pending' || req.currentStep < 0) return req;
  const chain = req.chain.map((s, i) =>
    i === req.currentStep
      ? { ...s, status: decision === 'approve' ? ('approved' as StepStatus) : ('denied' as StepStatus), decidedByName: actorName, decidedAt: at, comment: comment?.trim() || undefined }
      : s,
  );
  if (decision === 'deny') {
    return { ...req, chain, status: 'denied', currentStep: -1 };
  }
  const isLast = req.currentStep === chain.length - 1;
  const nextIndex = req.currentStep + 1;
  const withAssignee = (!isLast && nextAssignee)
    ? chain.map((st, i) => (i === nextIndex
        ? { ...st, assigneeUserId: nextAssignee.userId, assigneeName: nextAssignee.name }
        : st))
    : chain;
  return {
    ...req,
    chain: withAssignee,
    status: isLast ? 'approved' : 'pending',
    currentStep: isLast ? -1 : nextIndex,
  };
}

/** Re-point the current step at a different person. Only a pending step can be
 *  reassigned — a decided step is history. */
export function reassignCurrentStep(
  req: ApprovalRequest,
  to: Assignee,
  byName: string,
  at: string,
): ApprovalRequest {
  if (req.status !== 'pending' || req.currentStep < 0) return req;
  return {
    ...req,
    chain: req.chain.map((st, i) => (i === req.currentStep
      ? { ...st, assigneeUserId: to.userId, assigneeName: to.name, reassignedByName: byName, reassignedAt: at }
      : st)),
  };
}

/** The step the request is currently waiting on (or undefined). */
export function currentStep(req: ApprovalRequest): ApprovalStep | undefined {
  return req.status === 'pending' && req.currentStep >= 0 ? req.chain[req.currentStep] : undefined;
}

/** The role whose decision the request is currently waiting on (or undefined). */
export function currentApproverRole(req: ApprovalRequest): string | undefined {
  return req.status === 'pending' && req.currentStep >= 0 ? req.chain[req.currentStep]?.role : undefined;
}

/** Requests awaiting a decision from this viewer (the approver inbox).
 *
 *  `viewerUserId` is REQUIRED, and deliberately so. D85 made a named approver
 *  EXCLUSIVE — naming someone removes the request from every other holder of
 *  that role. A role-only version of this selector would still show the request
 *  to all of them, and the exclusion would be cosmetic: the one way this feature
 *  fails is silently, by showing too much. Making the id required means the
 *  compiler finds every call site rather than one of them defaulting to
 *  "everybody". */
export function pendingForRoles(
  requests: ApprovalRequest[],
  roles: string[],
  viewerUserId: string,
): ApprovalRequest[] {
  return requests.filter((r) => {
    const step = currentStep(r);
    if (!step || !roles.includes(step.role)) return false;
    // Unnamed → the whole role sees it. Named → only that person.
    return !step.assigneeUserId || step.assigneeUserId === viewerUserId;
  });
}

/** Requests one of these roles has already moved along, still pending with
 *  someone else — the "With the chain" list. A forwarded waiver must not vanish
 *  from the person who forwarded it; this is the only thing that will surface
 *  one rotting in a named approver's inbox. */
export function advancedByRoles(requests: ApprovalRequest[], roles: string[]): ApprovalRequest[] {
  return requests.filter((r) => {
    if (r.status !== 'pending' || r.currentStep < 0) return false;
    return r.chain.some((st, i) =>
      i < r.currentStep && st.status === 'approved' && roles.includes(st.role));
  });
}

/** Requests a given person filed (their "requested by you" list). */
export function requestedByName(requests: ApprovalRequest[], name: string): ApprovalRequest[] {
  return requests.filter((r) => r.requestedByName === name);
}

// ---- store (localStorage; same idiom as asapReports.ts) -------------------

const KEY = 'sc_approval_requests_v1';

const SEED: ApprovalRequest[] = [
  {
    id: 'AR-2026-001', formKind: 'waiver', formLabel: 'Waiver',
    subjectTitle: 'Duty-time extension — KASE overnight',
    values: { request: '+1:30 duty-time extension for a KASE overnight repositioning', justification: 'Weather delay compressed the day; crew rested, fatigue plan attached.', tripDate: 'T-2026-0721' },
    fieldLabels: { request: 'What are you requesting?', justification: 'Reason / justification', tripDate: 'Trip / date' },
    requestedByRole: 'pilot', requestedByName: 'Capt. Dunlop', requestedAt: '2026-07-21T18:40:00Z',
    chain: [
      { role: 'safety', status: 'pending' },
      { role: 'lead', status: 'pending' },
    ],
    currentStep: 0, status: 'pending',
  },
  {
    id: 'AR-2026-002', formKind: 'waiver', formLabel: 'Waiver',
    subjectTitle: 'Procedure deviation — single-engine taxi',
    values: { request: 'Single-engine taxi at KTEB to reduce FOD exposure on the east ramp', justification: 'Congested ramp, long taxi; SOP allows with Chief Pilot concurrence.' },
    fieldLabels: { request: 'What are you requesting?', justification: 'Reason / justification' },
    requestedByRole: 'pilot', requestedByName: 'Capt. Ellis', requestedAt: '2026-07-20T21:05:00Z',
    chain: [
      { role: 'safety', status: 'approved', decidedByName: 'J. Kerr (Safety)', decidedAt: '2026-07-21T13:10:00Z', comment: 'Risk justified; standard SOP allowance. Flagging that this is the second single-engine taxi request at KTEB this month.' },
      // Already forwarded to an individual, so the demo opens with one request
      // in "With the chain" — the list that exists because a named approver
      // excludes everyone else and a rotting request would otherwise be invisible.
      { role: 'lead', status: 'pending', assigneeUserId: 'USR015', assigneeName: 'Priya Raman' },
    ],
    currentStep: 1, status: 'pending',
  },
];

type Listener = () => void;
let listeners: Listener[] = [];
function emit() { listeners.forEach((l) => l()); }

function load(): ApprovalRequest[] {
  try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw) as ApprovalRequest[]; } catch { /* ignore */ }
  try { localStorage.setItem(KEY, JSON.stringify(SEED)); } catch { /* ignore */ }
  return SEED;
}
function save(v: ApprovalRequest[]) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* ignore */ } }

export function getApprovalRequests(): ApprovalRequest[] { return load(); }

export function createApprovalRequest(input: Omit<BuildInput, 'id' | 'requestedAt'>): ApprovalRequest {
  const list = load();
  const n = list.length + 1;
  const req = buildRequest({
    ...input,
    id: `AR-2026-${String(n).padStart(3, '0')}`,
    requestedAt: new Date().toISOString(),
  });
  save([req, ...list]);
  emit();
  return req;
}

export function decideRequest(
  id: string, decision: 'approve' | 'deny', actorName: string, comment?: string, nextAssignee?: Assignee,
): ApprovalRequest | undefined {
  const at = new Date().toISOString();
  let updated: ApprovalRequest | undefined;
  save(load().map((r) => {
    if (r.id !== id) return r;
    updated = applyDecision(r, decision, actorName, comment, at, nextAssignee);
    return updated;
  }));
  emit();
  return updated;
}

export function reassignRequest(id: string, to: Assignee, byName: string): ApprovalRequest | undefined {
  const at = new Date().toISOString();
  let updated: ApprovalRequest | undefined;
  save(load().map((r) => {
    if (r.id !== id) return r;
    updated = reassignCurrentStep(r, to, byName, at);
    return updated;
  }));
  emit();
  return updated;
}

export function useApprovalRequests() {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    const l = () => force();
    listeners.push(l);
    return () => { listeners = listeners.filter((x) => x !== l); };
  }, []);
  return { requests: getApprovalRequests(), createApprovalRequest, decideRequest };
}
