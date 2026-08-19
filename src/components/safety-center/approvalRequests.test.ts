import { describe, it, expect } from 'vitest';
import {
  buildRequest, applyDecision, currentApproverRole, pendingForRoles, requestedByName,
  advancedByRoles, reassignCurrentStep, resubmit,
  type ApprovalRequest, type ApprovalStep, type BuildInput, type RequestStatus,
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
  // Every step in these fixtures is unnamed, so the viewer id cannot change the
  // outcome — the D85 exclusion cases below assert that it does.
  const ANY_VIEWER = 'USR006';

  const reqs: ApprovalRequest[] = [
    buildRequest(input({ id: 'A', chainRoles: ['safety', 'chief-pilot'] })), // pending safety
    applyDecision(buildRequest(input({ id: 'B', chainRoles: ['safety', 'chief-pilot'], requestedByName: 'Capt. Ellis' })), 'approve', 'J. Kerr', undefined, 't'), // pending chief-pilot
    applyDecision(buildRequest(input({ id: 'C', chainRoles: ['safety'] })), 'deny', 'J. Kerr', 'no', 't'), // finished (denied)
  ];

  it('routes each pending request to exactly the role at its current step', () => {
    expect(pendingForRoles(reqs, ['safety'], ANY_VIEWER).map((r) => r.id)).toEqual(['A']);
    expect(pendingForRoles(reqs, ['chief-pilot'], ANY_VIEWER).map((r) => r.id)).toEqual(['B']);
  });

  it('a user holding several roles sees all requests awaiting any of them', () => {
    expect(pendingForRoles(reqs, ['safety', 'chief-pilot'], ANY_VIEWER).map((r) => r.id).sort()).toEqual(['A', 'B']);
  });

  it('a finished (denied/approved) request is in no inbox', () => {
    expect(pendingForRoles(reqs, ['safety', 'chief-pilot'], ANY_VIEWER).some((r) => r.id === 'C')).toBe(false);
  });

  it('requestedByName lists what a person filed, regardless of stage', () => {
    expect(requestedByName(reqs, 'Capt. Dunlop').map((r) => r.id).sort()).toEqual(['A', 'C']);
    expect(requestedByName(reqs, 'Capt. Ellis').map((r) => r.id)).toEqual(['B']);
  });
});

// ── D85: a named approver EXCLUDES the rest of the role ────────────────────
// "It excludes everyone" (Bryan, 2026-08-18). The failure mode of this feature
// is silent — it fails by showing a request to people who should no longer see
// it — so the exclusion is asserted from both sides every time.

describe('D85 — naming an individual on a step', () => {
  const REQ = (chain: ApprovalStep[], currentStep = 0, status: RequestStatus = 'pending'): ApprovalRequest => ({
    id: 'AR-X', formKind: 'waiver', formLabel: 'Waiver', subjectTitle: 'A waiver',
    values: {}, fieldLabels: {},
    requestedByRole: 'pilot', requestedByName: 'Capt. Dunlop', requestedAt: '2026-08-01T00:00:00Z',
    chain, currentStep, status,
  });
  const LEAD_A = { userId: 'USR004', name: 'David Brown' };
  const LEAD_B = { userId: 'USR015', name: 'Priya Raman' };

  describe('pendingForRoles', () => {
    it('shows an UNNAMED step to everyone holding the role', () => {
      const r = REQ([{ role: 'lead', status: 'pending' }]);
      expect(pendingForRoles([r], ['lead'], LEAD_A.userId)).toHaveLength(1);
      expect(pendingForRoles([r], ['lead'], LEAD_B.userId)).toHaveLength(1);
    });

    it('shows a NAMED step only to that person', () => {
      const r = REQ([{ role: 'lead', status: 'pending', assigneeUserId: LEAD_A.userId, assigneeName: LEAD_A.name }]);
      expect(pendingForRoles([r], ['lead'], LEAD_A.userId)).toHaveLength(1);
      // The whole point. If this ever returns 1, the exclusion is cosmetic.
      expect(pendingForRoles([r], ['lead'], LEAD_B.userId)).toHaveLength(0);
    });

    it('still excludes a role that is not on the current step at all', () => {
      const r = REQ([{ role: 'safety', status: 'pending' }]);
      expect(pendingForRoles([r], ['lead'], LEAD_A.userId)).toHaveLength(0);
    });

    it('excludes a finished request regardless of who is asking', () => {
      const r = REQ([{ role: 'lead', status: 'approved' }], -1, 'approved');
      expect(pendingForRoles([r], ['lead'], LEAD_A.userId)).toHaveLength(0);
    });

    it('reads only the CURRENT step, not an earlier one that named someone', () => {
      const r = REQ([
        { role: 'safety', status: 'approved', assigneeUserId: 'USR006', assigneeName: 'Robert Garcia' },
        { role: 'lead', status: 'pending' },
      ], 1);
      expect(pendingForRoles([r], ['lead'], LEAD_B.userId)).toHaveLength(1);
    });
  });

  describe('applyDecision with a next assignee', () => {
    it('names the NEXT step when the current one is approved', () => {
      const r = REQ([{ role: 'safety', status: 'pending' }, { role: 'lead', status: 'pending' }]);
      const out = applyDecision(r, 'approve', 'J. Kerr', 'Safety-acceptable.', '2026-08-18T10:00:00Z', LEAD_B);
      expect(out.currentStep).toBe(1);
      expect(out.chain[1].assigneeUserId).toBe(LEAD_B.userId);
      expect(out.chain[1].assigneeName).toBe(LEAD_B.name);
      // and the step just decided keeps the recommendation
      expect(out.chain[0].comment).toBe('Safety-acceptable.');
    });

    it('leaves the next step unnamed when no individual was chosen', () => {
      const r = REQ([{ role: 'safety', status: 'pending' }, { role: 'lead', status: 'pending' }]);
      const out = applyDecision(r, 'approve', 'J. Kerr', undefined, '2026-08-18T10:00:00Z');
      expect(out.chain[1].assigneeUserId).toBeUndefined();
    });

    it('ignores an assignee on the LAST step — there is no next step to name', () => {
      const r = REQ([{ role: 'lead', status: 'pending' }]);
      const out = applyDecision(r, 'approve', 'David Brown', undefined, '2026-08-18T10:00:00Z', LEAD_B);
      expect(out.status).toBe('approved');
      expect(out.chain[0].assigneeUserId).toBeUndefined();
    });

    it('names nobody when the decision is a denial — the chain stops', () => {
      const r = REQ([{ role: 'safety', status: 'pending' }, { role: 'lead', status: 'pending' }]);
      const out = applyDecision(r, 'deny', 'J. Kerr', 'Not acceptable.', '2026-08-18T10:00:00Z', LEAD_B);
      expect(out.status).toBe('denied');
      expect(out.chain[1].assigneeUserId).toBeUndefined();
    });
  });

  describe('reassignCurrentStep', () => {
    it('re-points a named step at someone else and records who did it', () => {
      const r = REQ([{ role: 'lead', status: 'pending', assigneeUserId: LEAD_A.userId, assigneeName: LEAD_A.name }]);
      const out = reassignCurrentStep(r, LEAD_B, 'J. Kerr (Safety)', '2026-08-19T08:00:00Z');
      expect(out.chain[0].assigneeUserId).toBe(LEAD_B.userId);
      expect(out.chain[0].reassignedByName).toBe('J. Kerr (Safety)');
      expect(out.chain[0].reassignedAt).toBe('2026-08-19T08:00:00Z');
    });

    it('moves the request into the new person’s inbox and out of the old one’s', () => {
      const r = REQ([{ role: 'lead', status: 'pending', assigneeUserId: LEAD_A.userId, assigneeName: LEAD_A.name }]);
      const out = reassignCurrentStep(r, LEAD_B, 'J. Kerr (Safety)', '2026-08-19T08:00:00Z');
      expect(pendingForRoles([out], ['lead'], LEAD_B.userId)).toHaveLength(1);
      expect(pendingForRoles([out], ['lead'], LEAD_A.userId)).toHaveLength(0);
    });

    it('can name someone on a step that was role-wide', () => {
      const r = REQ([{ role: 'lead', status: 'pending' }]);
      const out = reassignCurrentStep(r, LEAD_A, 'J. Kerr (Safety)', '2026-08-19T08:00:00Z');
      expect(pendingForRoles([out], ['lead'], LEAD_B.userId)).toHaveLength(0);
    });

    it('refuses to touch a finished request — a decided step is history', () => {
      const r = REQ([{ role: 'lead', status: 'approved' }], -1, 'approved');
      expect(reassignCurrentStep(r, LEAD_B, 'J. Kerr', '2026-08-19T08:00:00Z')).toBe(r);
    });
  });

  describe('advancedByRoles', () => {
    it('keeps a request visible to the role that moved it along', () => {
      const r = REQ([
        { role: 'safety', status: 'approved' },
        { role: 'lead', status: 'pending', assigneeUserId: LEAD_A.userId },
      ], 1);
      expect(advancedByRoles([r], ['safety'])).toHaveLength(1);
    });

    it('excludes a request the role has not touched', () => {
      const r = REQ([{ role: 'chief-pilot', status: 'approved' }, { role: 'lead', status: 'pending' }], 1);
      expect(advancedByRoles([r], ['safety'])).toHaveLength(0);
    });

    it('excludes a request still sitting on the role’s own step — that is "yours", not "theirs"', () => {
      const r = REQ([{ role: 'safety', status: 'pending' }, { role: 'lead', status: 'pending' }], 0);
      expect(advancedByRoles([r], ['safety'])).toHaveLength(0);
    });

    it('excludes a finished request — nothing is with the chain any more', () => {
      const r = REQ([{ role: 'safety', status: 'approved' }, { role: 'lead', status: 'approved' }], -1, 'approved');
      expect(advancedByRoles([r], ['safety'])).toHaveLength(0);
    });

    it('does not overlap with pendingForRoles — a request is in one list or the other', () => {
      const mine = REQ([{ role: 'safety', status: 'pending' }, { role: 'lead', status: 'pending' }], 0);
      const theirs = REQ([{ role: 'safety', status: 'approved' }, { role: 'lead', status: 'pending' }], 1);
      const all = [mine, theirs];
      const a = pendingForRoles(all, ['safety'], 'USR006').map((r) => r.chain[0].status);
      const b = advancedByRoles(all, ['safety']).map((r) => r.chain[0].status);
      expect(a).toEqual(['pending']);
      expect(b).toEqual(['approved']);
    });
  });
});

// ── 2026-08-19: a request can go DOWN the chain and back up again ──────────
// "no they can send back good idea" / "yes lets have that be possible and it can
// go all the way back down and up". Send-back is the answer to "not with this
// justification", which previously had no expression other than killing the
// request.

describe('send_back', () => {
  const REQ = (chain: ApprovalStep[], currentStep = 0, status: RequestStatus = 'pending'): ApprovalRequest => ({
    id: 'AR-S', formKind: 'waiver', formLabel: 'Waiver', subjectTitle: 'A waiver',
    values: {}, fieldLabels: {},
    requestedByRole: 'pilot', requestedByName: 'Capt. Dunlop', requestedAt: '2026-08-01T00:00:00Z',
    chain, currentStep, status, history: [],
  });
  const T = '2026-08-19T10:00:00Z';

  it('moves DOWN one step, not straight to the requester', () => {
    const r = REQ([
      { role: 'safety', status: 'approved', decidedByName: 'J. Kerr', comment: 'ok' },
      { role: 'lead', status: 'pending' },
    ], 1);
    const out = applyDecision(r, 'send_back', 'David Brown', 'Need the fatigue plan attached.', T);
    expect(out.currentStep).toBe(0);
    expect(out.status).toBe('pending');
  });

  it('clears the step below so it must be decided again', () => {
    const r = REQ([
      { role: 'safety', status: 'approved', decidedByName: 'J. Kerr', decidedAt: T, comment: 'ok' },
      { role: 'lead', status: 'pending' },
    ], 1);
    const out = applyDecision(r, 'send_back', 'David Brown', 'More detail please.', T);
    expect(out.chain[0].status).toBe('pending');
    expect(out.chain[0].decidedByName).toBeUndefined();
    expect(out.chain[0].comment).toBeUndefined();
  });

  it('keeps the cleared approval in history — the round trip is not erased', () => {
    const r = REQ([
      { role: 'safety', status: 'approved', decidedByName: 'J. Kerr', decidedAt: T, comment: 'Safety-acceptable.' },
      { role: 'lead', status: 'pending' },
    ], 1);
    const out = applyDecision(r, 'send_back', 'David Brown', 'More detail.', T);
    expect(out.history!.map((e) => e.action)).toEqual(['sent_back']);
    expect(out.history![0].comment).toBe('More detail.');
  });

  it('returns to the REQUESTER from the first step — there is nobody below', () => {
    const r = REQ([{ role: 'safety', status: 'pending' }, { role: 'lead', status: 'pending' }], 0);
    const out = applyDecision(r, 'send_back', 'J. Kerr', 'Which trip is this?', T);
    expect(out.status).toBe('returned');
    expect(out.currentStep).toBe(-1);
  });

  it('is distinct from a decline — a returned request is not finished', () => {
    const r = REQ([{ role: 'safety', status: 'pending' }], 0);
    const returned = applyDecision(r, 'send_back', 'J. Kerr', 'why?', T);
    const declined = applyDecision(r, 'deny', 'J. Kerr', 'no', T);
    expect(returned.status).toBe('returned');
    expect(declined.status).toBe('denied');
    expect(returned.chain[0].status).toBe('pending');
    expect(declined.chain[0].status).toBe('denied');
  });

  it('takes a returned request out of every approver inbox', () => {
    const r = REQ([{ role: 'safety', status: 'pending' }, { role: 'lead', status: 'pending' }], 0);
    const out = applyDecision(r, 'send_back', 'J. Kerr', 'why?', T);
    expect(pendingForRoles([out], ['safety'], 'USR006')).toHaveLength(0);
    expect(pendingForRoles([out], ['lead'], 'USR004')).toHaveLength(0);
  });

  it('walks all the way down one step at a time', () => {
    let r = REQ([
      { role: 'safety', status: 'approved' },
      { role: 'chief-pilot', status: 'approved' },
      { role: 'lead', status: 'pending' },
    ], 2);
    r = applyDecision(r, 'send_back', 'David Brown', 'a', T);
    expect(r.currentStep).toBe(1);
    r = applyDecision(r, 'send_back', 'Capt. Smith', 'b', T);
    expect(r.currentStep).toBe(0);
    r = applyDecision(r, 'send_back', 'J. Kerr', 'c', T);
    expect(r.status).toBe('returned');
    expect(r.history!.map((e) => e.action)).toEqual(['sent_back', 'sent_back', 'sent_back']);
  });

  it('and back up again', () => {
    let r = REQ([{ role: 'safety', status: 'pending' }, { role: 'lead', status: 'pending' }], 0);
    r = applyDecision(r, 'send_back', 'J. Kerr', 'why?', T);
    r = resubmit(r, 'Capt. Dunlop', 'Fatigue plan attached.', T);
    expect(r.status).toBe('pending');
    expect(r.currentStep).toBe(0);
    r = applyDecision(r, 'approve', 'J. Kerr', 'ok now', T);
    r = applyDecision(r, 'approve', 'David Brown', 'approved', T);
    expect(r.status).toBe('approved');
    expect(r.history!.map((e) => e.action)).toEqual(['sent_back', 'resubmitted', 'approved', 'approved']);
  });

  it('is a no-op on a finished request', () => {
    const done = REQ([{ role: 'safety', status: 'approved' }], -1, 'approved');
    expect(applyDecision(done, 'send_back', 'x', 'y', T)).toBe(done);
  });
});

describe('resubmit', () => {
  const returned = (): ApprovalRequest => ({
    id: 'AR-T', formKind: 'waiver', formLabel: 'Waiver', subjectTitle: 'A waiver',
    values: {}, fieldLabels: {},
    requestedByRole: 'pilot', requestedByName: 'Capt. Dunlop', requestedAt: '2026-08-01T00:00:00Z',
    chain: [
      { role: 'safety', status: 'pending' },
      { role: 'lead', status: 'pending', assigneeUserId: 'USR015', assigneeName: 'Priya Raman' },
    ],
    currentStep: -1, status: 'returned', history: [],
  });

  it('puts it back at the bottom of the chain', () => {
    const out = resubmit(returned(), 'Capt. Dunlop', 'Updated.', '2026-08-19T11:00:00Z');
    expect(out.status).toBe('pending');
    expect(out.currentStep).toBe(0);
  });

  it('clears every step so each approver decides again on what is now written', () => {
    const r = returned();
    r.chain[0] = { role: 'safety', status: 'approved', decidedByName: 'J. Kerr', comment: 'stale' };
    const out = resubmit(r, 'Capt. Dunlop', 'Updated.', '2026-08-19T11:00:00Z');
    expect(out.chain.every((s) => s.status === 'pending')).toBe(true);
    expect(out.chain[0].comment).toBeUndefined();
  });

  it('keeps a named approver named — re-submitting does not un-address it', () => {
    const out = resubmit(returned(), 'Capt. Dunlop', 'Updated.', '2026-08-19T11:00:00Z');
    expect(out.chain[1].assigneeName).toBe('Priya Raman');
  });

  it('records the re-submission and what changed', () => {
    const out = resubmit(returned(), 'Capt. Dunlop', 'Fatigue plan attached.', '2026-08-19T11:00:00Z');
    expect(out.history!.at(-1)).toMatchObject({ action: 'resubmitted', comment: 'Fatigue plan attached.' });
  });

  it('refuses anything that is not returned', () => {
    const pending = { ...returned(), status: 'pending' as RequestStatus, currentStep: 0 };
    expect(resubmit(pending, 'x', 'y', 'z')).toBe(pending);
  });
});
