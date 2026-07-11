import { describe, it, expect } from 'vitest';
import { firReducer } from './reducer';
import { buildFir } from './engine/create';
import type { FirState, FirTimelineEntry } from './types';

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
