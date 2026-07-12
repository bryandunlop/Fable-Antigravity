import { describe, it, expect } from 'vitest';
import { firReducer } from './reducer';
import { buildFir } from './engine/create';
import type { FirImpact, FirState, FirTimelineEntry, PerspectiveStatement } from './types';

const opened = buildFir({
  id: 'fir-1', ref: 'FIR-2026-001', title: 'LMLG AOG', category: 'AOG',
  openedBy: { oid: 'USR002', name: 'Sarah Wilson (DOM)' },
  atUtc: '2026-07-11T10:00:00.000Z', eventStartUtc: '2026-07-11T08:00:00.000Z',
});

const state: FirState = { firs: [opened] };

const entry: FirTimelineEntry = {
  source: 'MANUAL', atUtc: '2026-07-11T11:00:00.000Z',
  label: 'Vendor AOG desk engaged', byOid: 'USR002',
};

describe('firReducer — OPEN_FIR', () => {
  it('appends a new FIR', () => {
    const next = firReducer({ firs: [] }, { type: 'OPEN_FIR', payload: { fir: opened } });
    expect(next.firs).toHaveLength(1);
    expect(next.firs[0].ref).toBe('FIR-2026-001');
  });

  it('rejects a duplicate id (no-op)', () => {
    const next = firReducer(state, { type: 'OPEN_FIR', payload: { fir: opened } });
    expect(next).toBe(state);
  });
});

describe('firReducer — ADD_MANUAL_ENTRY (assembly happens in OPEN, §4)', () => {
  it('appends a manual timeline entry to an OPEN FIR', () => {
    const next = firReducer(state, { type: 'ADD_MANUAL_ENTRY', payload: { firId: 'fir-1', entry } });
    expect(next.firs[0].manualTimeline).toHaveLength(1);
    expect(next.firs[0].manualTimeline[0].label).toBe('Vendor AOG desk engaged');
  });

  it('forces source MANUAL — SYSTEM entries are derived, never stored (§5)', () => {
    const sneaky = { ...entry, source: 'SYSTEM' as const };
    const next = firReducer(state, { type: 'ADD_MANUAL_ENTRY', payload: { firId: 'fir-1', entry: sneaky } });
    expect(next.firs[0].manualTimeline[0].source).toBe('MANUAL');
  });

  it('rejects entries on a non-OPEN FIR', () => {
    const closed: FirState = { firs: [{ ...opened, status: 'CLOSED_INTERNAL' }] };
    const next = firReducer(closed, { type: 'ADD_MANUAL_ENTRY', payload: { firId: 'fir-1', entry } });
    expect(next).toBe(closed);
  });

  it('rejects entries for an unknown FIR', () => {
    const next = firReducer(state, { type: 'ADD_MANUAL_ENTRY', payload: { firId: 'nope', entry } });
    expect(next).toBe(state);
  });
});

describe('firReducer — REASSIGN_OWNER (reassignable, audit-trailed, §5)', () => {
  const payload = {
    firId: 'fir-1', newOwnerOid: 'USR008', newOwnerName: 'Tom Parker',
    byOid: 'USR002', byName: 'Sarah Wilson (DOM)', atUtc: '2026-07-11T12:00:00.000Z',
  };

  it('reassigns the owner and appends an OWNER_REASSIGNED audit event', () => {
    const next = firReducer(state, { type: 'REASSIGN_OWNER', payload });
    expect(next.firs[0].ownerOid).toBe('USR008');
    expect(next.firs[0].ownerName).toBe('Tom Parker');
    const audit = next.firs[0].audit;
    expect(audit[audit.length - 1]).toMatchObject({ kind: 'OWNER_REASSIGNED', byOid: 'USR002' });
    expect(audit[audit.length - 1].detail).toMatch(/Tom Parker/);
  });

  it('is a no-op when the owner is unchanged', () => {
    const next = firReducer(state, { type: 'REASSIGN_OWNER', payload: { ...payload, newOwnerOid: 'USR002' } });
    expect(next).toBe(state);
  });
});

const statement = (over: Partial<PerspectiveStatement> = {}): PerspectiveStatement => ({
  id: 'st-1', requestedByOid: 'USR002', requestedOfOid: 'USR001', requestedOfRole: 'PILOT',
  prompt: 'Your account of the gear indication at KLUK', status: 'REQUESTED',
  requestedAtUtc: '2026-07-11T12:00:00.000Z', ...over,
});

describe('firReducer — REQUEST_STATEMENT (§4 statement sub-lifecycle)', () => {
  it('appends a REQUESTED statement to an OPEN FIR', () => {
    const next = firReducer(state, { type: 'REQUEST_STATEMENT', payload: { firId: 'fir-1', statement: statement() } });
    expect(next.firs[0].statements).toHaveLength(1);
    expect(next.firs[0].statements[0].status).toBe('REQUESTED');
  });

  it('rejects a second pending request to the same person', () => {
    const one = firReducer(state, { type: 'REQUEST_STATEMENT', payload: { firId: 'fir-1', statement: statement() } });
    const two = firReducer(one, { type: 'REQUEST_STATEMENT', payload: { firId: 'fir-1', statement: statement({ id: 'st-2' }) } });
    expect(two).toBe(one);
  });

  it('allows a re-request after a decline', () => {
    const req = firReducer(state, { type: 'REQUEST_STATEMENT', payload: { firId: 'fir-1', statement: statement() } });
    const declined = firReducer(req, { type: 'DECLINE_STATEMENT', payload: { firId: 'fir-1', statementId: 'st-1', atUtc: 't' } });
    const reReq = firReducer(declined, { type: 'REQUEST_STATEMENT', payload: { firId: 'fir-1', statement: statement({ id: 'st-2' }) } });
    expect(reReq.firs[0].statements).toHaveLength(2);
  });

  it('rejects when the FIR is not OPEN', () => {
    const closed: FirState = { firs: [{ ...opened, status: 'CLOSED_INTERNAL' }] };
    expect(firReducer(closed, { type: 'REQUEST_STATEMENT', payload: { firId: 'fir-1', statement: statement() } })).toBe(closed);
  });
});

describe('firReducer — SUBMIT_STATEMENT / DECLINE_STATEMENT', () => {
  const withReq = firReducer(state, { type: 'REQUEST_STATEMENT', payload: { firId: 'fir-1', statement: statement() } });

  it('submit sets SUBMITTED + text + respondedAt', () => {
    const next = firReducer(withReq, { type: 'SUBMIT_STATEMENT', payload: { firId: 'fir-1', statementId: 'st-1', text: 'Gear showed unsafe on the second retraction.', atUtc: '2026-07-11T13:00:00.000Z' } });
    const s = next.firs[0].statements[0];
    expect(s.status).toBe('SUBMITTED');
    expect(s.text).toMatch(/unsafe/);
    expect(s.respondedAtUtc).toBe('2026-07-11T13:00:00.000Z');
  });

  it('decline sets DECLINED + reason', () => {
    const next = firReducer(withReq, { type: 'DECLINE_STATEMENT', payload: { firId: 'fir-1', statementId: 'st-1', reason: 'Was not on this leg', atUtc: '2026-07-11T13:00:00.000Z' } });
    const s = next.firs[0].statements[0];
    expect(s.status).toBe('DECLINED');
    expect(s.declineReason).toMatch(/leg/);
  });

  it('rejects a second response to an already-answered statement', () => {
    const submitted = firReducer(withReq, { type: 'SUBMIT_STATEMENT', payload: { firId: 'fir-1', statementId: 'st-1', text: 'x', atUtc: 't' } });
    const again = firReducer(submitted, { type: 'DECLINE_STATEMENT', payload: { firId: 'fir-1', statementId: 'st-1', reason: 'y', atUtc: 't2' } });
    expect(again).toBe(submitted);
  });

  it('no-op on an unknown statement id', () => {
    expect(firReducer(withReq, { type: 'SUBMIT_STATEMENT', payload: { firId: 'fir-1', statementId: 'nope', text: 'x', atUtc: 't' } })).toBe(withReq);
  });
});

describe('firReducer — UPDATE_NARRATIVE / UPDATE_IMPACT (OPEN-gated assembly)', () => {
  it('sets the narrative on an OPEN FIR', () => {
    const next = firReducer(state, { type: 'UPDATE_NARRATIVE', payload: { firId: 'fir-1', narrative: 'What actually happened and why.' } });
    expect(next.firs[0].narrative).toBe('What actually happened and why.');
  });

  it('replaces the impact block on an OPEN FIR', () => {
    const impact: FirImpact = { downtimeHours: 26, delayMinutes: 0, tripsAffected: 1, costNote: 'Repo flight + crew hotel' };
    const next = firReducer(state, { type: 'UPDATE_IMPACT', payload: { firId: 'fir-1', impact } });
    expect(next.firs[0].impact).toEqual(impact);
  });

  it('rejects narrative and impact edits on a non-OPEN FIR', () => {
    const closed: FirState = { firs: [{ ...opened, status: 'CLOSED_INTERNAL' }] };
    expect(firReducer(closed, { type: 'UPDATE_NARRATIVE', payload: { firId: 'fir-1', narrative: 'x' } })).toBe(closed);
    expect(firReducer(closed, { type: 'UPDATE_IMPACT', payload: { firId: 'fir-1', impact: {} } })).toBe(closed);
  });
});

const completeDraft = {
  summary: 'A gear indication grounded the aircraft; recovered with an AOG-freight part.',
  whatHappened: 'The PIC returned to base; the technician isolated a sensor.',
  timeline: [{ atUtc: '2026-07-11T08:40:00.000Z', label: 'Returned with gear indication' }],
  lessons: ['Single-source part — plan freight lead time.'],
  ackLevel: 'none' as const,
};

/** OPEN FIR carrying a complete curation draft, ready to submit. */
const withDraft: FirState = { firs: [{ ...opened, pendingPublished: completeDraft }] };
const LEAD = ['chief-pilot'];

describe('firReducer — publish four-eyes lifecycle (§4)', () => {
  it('curation draft is editable only while OPEN', () => {
    const next = firReducer(state, { type: 'UPDATE_PUBLISHED_DRAFT', payload: { firId: 'fir-1', draft: completeDraft } });
    expect(next.firs[0].pendingPublished).toEqual(completeDraft);
    const inReview: FirState = { firs: [{ ...opened, status: 'IN_REVIEW' }] };
    expect(firReducer(inReview, { type: 'UPDATE_PUBLISHED_DRAFT', payload: { firId: 'fir-1', draft: completeDraft } })).toBe(inReview);
  });

  it('submit requires a complete draft, then moves OPEN → IN_REVIEW recording the submitter', () => {
    expect(firReducer(state, { type: 'SUBMIT_FOR_REVIEW', payload: { firId: 'fir-1', byOid: 'USR002', atUtc: 'T1' } })).toBe(state); // no draft
    const next = firReducer(withDraft, { type: 'SUBMIT_FOR_REVIEW', payload: { firId: 'fir-1', byOid: 'USR002', byName: 'Sarah', atUtc: 'T1' } });
    expect(next.firs[0].status).toBe('IN_REVIEW');
    expect(next.firs[0].reviewSubmittedByOid).toBe('USR002');
    expect(next.firs[0].audit.at(-1)?.kind).toBe('SUBMITTED_FOR_REVIEW');
  });

  it('blocks the submitter from approving their own submission (four-eyes)', () => {
    const submitted = firReducer(withDraft, { type: 'SUBMIT_FOR_REVIEW', payload: { firId: 'fir-1', byOid: 'USR002', atUtc: 'T1' } });
    const self = firReducer(submitted, { type: 'APPROVE_PUBLISH', payload: { firId: 'fir-1', byOid: 'USR002', byRoles: LEAD, atUtc: 'T2' } });
    expect(self).toBe(submitted); // rejected — still IN_REVIEW
    expect(self.firs[0].status).toBe('IN_REVIEW');
  });

  it('a separate leadership approver publishes a stamped revision', () => {
    const submitted = firReducer(withDraft, { type: 'SUBMIT_FOR_REVIEW', payload: { firId: 'fir-1', byOid: 'USR002', atUtc: 'T1' } });
    const published = firReducer(submitted, { type: 'APPROVE_PUBLISH', payload: { firId: 'fir-1', byOid: 'USR009', byName: 'CP', byRoles: LEAD, atUtc: 'T2' } });
    const rev = published.firs[0].publishedRevision;
    expect(published.firs[0].status).toBe('PUBLISHED');
    expect(rev).toMatchObject({ revision: 1, approvedByOid: 'USR009', publishedAtUtc: 'T2', summary: completeDraft.summary });
    expect(published.firs[0].reviewSubmittedByOid).toBeUndefined();
  });

  it('a non-leadership decider cannot approve', () => {
    const submitted = firReducer(withDraft, { type: 'SUBMIT_FOR_REVIEW', payload: { firId: 'fir-1', byOid: 'USR002', atUtc: 'T1' } });
    const denied = firReducer(submitted, { type: 'APPROVE_PUBLISH', payload: { firId: 'fir-1', byOid: 'USR009', byRoles: ['pilot'], atUtc: 'T2' } });
    expect(denied).toBe(submitted);
  });

  it('request changes returns to OPEN with a note and keeps the draft', () => {
    const submitted = firReducer(withDraft, { type: 'SUBMIT_FOR_REVIEW', payload: { firId: 'fir-1', byOid: 'USR002', atUtc: 'T1' } });
    const back = firReducer(submitted, { type: 'REQUEST_CHANGES', payload: { firId: 'fir-1', byOid: 'USR009', byRoles: LEAD, note: 'Strip the tail number', atUtc: 'T2' } });
    expect(back.firs[0].status).toBe('OPEN');
    expect(back.firs[0].pendingPublished).toEqual(completeDraft);
    expect(back.firs[0].audit.at(-1)).toMatchObject({ kind: 'CHANGES_REQUESTED', detail: 'Strip the tail number' });
    // an empty note is rejected
    expect(firReducer(submitted, { type: 'REQUEST_CHANGES', payload: { firId: 'fir-1', byOid: 'USR009', byRoles: LEAD, note: '  ', atUtc: 'T2' } })).toBe(submitted);
  });

  it('close internal and reopen honor the guards', () => {
    const closed = firReducer(state, { type: 'CLOSE_INTERNAL', payload: { firId: 'fir-1', byOid: 'USR002', byRoles: [], atUtc: 'T1' } }); // owner
    expect(closed.firs[0].status).toBe('CLOSED_INTERNAL');
    const reopened = firReducer(closed, { type: 'REOPEN_FIR', payload: { firId: 'fir-1', byOid: 'USR009', byRoles: LEAD, atUtc: 'T2' } });
    expect(reopened.firs[0].status).toBe('OPEN');
    // a non-leadership stranger cannot close someone else's FIR
    expect(firReducer(state, { type: 'CLOSE_INTERNAL', payload: { firId: 'fir-1', byOid: 'USR999', byRoles: [], atUtc: 'T1' } })).toBe(state);
  });

  it('acknowledges a published report requesting initials, idempotently', () => {
    const base: FirState = { firs: [{ ...opened, status: 'PUBLISHED', publishedRevision: { ...completeDraft, ackLevel: 'initials', revision: 1, approvedByOid: 'USR009', publishedAtUtc: 'T2' }, publishedAcks: [] }] };
    const acked = firReducer(base, { type: 'ACKNOWLEDGE_PUBLISHED', payload: { firId: 'fir-1', oid: 'USR005', initials: 'jd', atUtc: 'T3' } });
    expect(acked.firs[0].publishedAcks).toEqual([{ oid: 'USR005', initials: 'JD', atUtc: 'T3' }]);
    const again = firReducer(acked, { type: 'ACKNOWLEDGE_PUBLISHED', payload: { firId: 'fir-1', oid: 'USR005', initials: 'JD', atUtc: 'T4' } });
    expect(again).toBe(acked); // idempotent
    // a report that doesn't ask for acks rejects
    const noAck: FirState = { firs: [{ ...opened, status: 'PUBLISHED', publishedRevision: { ...completeDraft, revision: 1, approvedByOid: 'USR009', publishedAtUtc: 'T2' } }] };
    expect(firReducer(noAck, { type: 'ACKNOWLEDGE_PUBLISHED', payload: { firId: 'fir-1', oid: 'USR005', initials: 'JD', atUtc: 'T3' } })).toBe(noAck);
  });
});
