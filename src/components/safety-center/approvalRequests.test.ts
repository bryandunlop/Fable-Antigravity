import { describe, it, expect } from 'vitest';
import {
  buildRequest, applyDecision, currentApproverRole, pendingForRoles, requestedByName,
  type ApprovalRequest, type BuildInput,
} from './approvalRequests';

function input(over: Partial<BuildInput> = {}): BuildInput {
  return {
    formKind: 'waiver', formLabel: 'Waiver', subjectTitle: 'Duty-time extension',
    values: { request: '+1:30' }, fieldLabels: { request: 'What are you requesting?' },
    requestedByRole: 'pilot', requestedByName: 'Capt. Dunlop',
    chainRoles: ['safety', 'chief-pilot'],
    id: 'AR-1', requestedAt: '2026-07-21T00:00:00Z',
    ...over,
  };
}

describe('buildRequest', () => {
  it('starts a gated request at step 0, pending, all steps pending', () => {
    const r = buildRequest(input());
    expect(r.status).toBe('pending');
    expect(r.currentStep).toBe(0);
    expect(r.chain.map((s) => s.status)).toEqual(['pending', 'pending']);
    expect(currentApproverRole(r)).toBe('safety');
  });

  it('with an empty chain is born approved and needs no gate', () => {
    const r = buildRequest(input({ chainRoles: [] }));
    expect(r.status).toBe('approved');
    expect(r.currentStep).toBe(-1);
    expect(currentApproverRole(r)).toBeUndefined();
  });

  it('snapshots the submitted values and their labels', () => {
    const r = buildRequest(input());
    expect(r.values.request).toBe('+1:30');
    expect(r.fieldLabels.request).toBe('What are you requesting?');
  });
});

describe('applyDecision — walking the chain', () => {
  it('approve on a non-final step advances to the next approver', () => {
    const r0 = buildRequest(input());
    const r1 = applyDecision(r0, 'approve', 'J. Kerr', 'looks fine', '2026-07-21T13:00:00Z');
    expect(r1.chain[0].status).toBe('approved');
    expect(r1.chain[0].decidedByName).toBe('J. Kerr');
    expect(r1.chain[0].comment).toBe('looks fine');
    expect(r1.status).toBe('pending');
    expect(r1.currentStep).toBe(1);
    expect(currentApproverRole(r1)).toBe('chief-pilot');
  });

  it('approve on the final step completes the whole request', () => {
    let r = buildRequest(input());
    r = applyDecision(r, 'approve', 'J. Kerr', undefined, '2026-07-21T13:00:00Z');
    r = applyDecision(r, 'approve', 'Capt. Vance', undefined, '2026-07-21T15:00:00Z');
    expect(r.status).toBe('approved');
    expect(r.currentStep).toBe(-1);
    expect(r.chain.every((s) => s.status === 'approved')).toBe(true);
    expect(currentApproverRole(r)).toBeUndefined();
  });

  it('deny stops the chain immediately, later steps stay pending', () => {
    const r0 = buildRequest(input());
    const r1 = applyDecision(r0, 'deny', 'J. Kerr', 'not this trip', '2026-07-21T13:00:00Z');
    expect(r1.status).toBe('denied');
    expect(r1.currentStep).toBe(-1);
    expect(r1.chain[0].status).toBe('denied');
    expect(r1.chain[1].status).toBe('pending');
  });

  it('is a no-op once the request is finished (no double-decision)', () => {
    let r = buildRequest(input({ chainRoles: ['safety'] }));
    r = applyDecision(r, 'approve', 'J. Kerr', undefined, 't1');
    expect(r.status).toBe('approved');
    const again = applyDecision(r, 'deny', 'Someone', 'too late', 't2');
    expect(again).toEqual(r); // unchanged
  });

  it('drops a blank comment rather than storing an empty string', () => {
    const r = applyDecision(buildRequest(input()), 'approve', 'J. Kerr', '   ', 't1');
    expect(r.chain[0].comment).toBeUndefined();
  });
});

describe('inbox routing', () => {
  const reqs: ApprovalRequest[] = [
    buildRequest(input({ id: 'A', chainRoles: ['safety', 'chief-pilot'] })), // pending safety
    applyDecision(buildRequest(input({ id: 'B', chainRoles: ['safety', 'chief-pilot'], requestedByName: 'Capt. Ellis' })), 'approve', 'J. Kerr', undefined, 't'), // pending chief-pilot
    applyDecision(buildRequest(input({ id: 'C', chainRoles: ['safety'] })), 'deny', 'J. Kerr', 'no', 't'), // finished (denied)
  ];

  it('routes each pending request to exactly the role at its current step', () => {
    expect(pendingForRoles(reqs, ['safety']).map((r) => r.id)).toEqual(['A']);
    expect(pendingForRoles(reqs, ['chief-pilot']).map((r) => r.id)).toEqual(['B']);
  });

  it('a user holding several roles sees all requests awaiting any of them', () => {
    expect(pendingForRoles(reqs, ['safety', 'chief-pilot']).map((r) => r.id).sort()).toEqual(['A', 'B']);
  });

  it('a finished (denied/approved) request is in no inbox', () => {
    expect(pendingForRoles(reqs, ['safety', 'chief-pilot']).some((r) => r.id === 'C')).toBe(false);
  });

  it('requestedByName lists what a person filed, regardless of stage', () => {
    expect(requestedByName(reqs, 'Capt. Dunlop').map((r) => r.id).sort()).toEqual(['A', 'C']);
    expect(requestedByName(reqs, 'Capt. Ellis').map((r) => r.id)).toEqual(['B']);
  });
});
