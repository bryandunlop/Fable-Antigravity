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
}

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
  return {
    ...req,
    chain,
    status: isLast ? 'approved' : 'pending',
    currentStep: isLast ? -1 : req.currentStep + 1,
  };
}

/** The role whose decision the request is currently waiting on (or undefined). */
export function currentApproverRole(req: ApprovalRequest): string | undefined {
  return req.status === 'pending' && req.currentStep >= 0 ? req.chain[req.currentStep]?.role : undefined;
}

/** Requests awaiting a decision from any of the given roles (the approver inbox). */
export function pendingForRoles(requests: ApprovalRequest[], roles: string[]): ApprovalRequest[] {
  return requests.filter((r) => {
    const role = currentApproverRole(r);
    return role != null && roles.includes(role);
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
      { role: 'chief-pilot', status: 'pending' },
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
      { role: 'safety', status: 'approved', decidedByName: 'J. Kerr (Safety)', decidedAt: '2026-07-21T13:10:00Z', comment: 'Risk justified; standard SOP allowance.' },
      { role: 'chief-pilot', status: 'pending' },
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

export function decideRequest(id: string, decision: 'approve' | 'deny', actorName: string, comment?: string): ApprovalRequest | undefined {
  const at = new Date().toISOString();
  let updated: ApprovalRequest | undefined;
  save(load().map((r) => {
    if (r.id !== id) return r;
    updated = applyDecision(r, decision, actorName, comment, at);
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
