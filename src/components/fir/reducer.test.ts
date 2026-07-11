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
