import { describe, it, expect } from 'vitest';
import { firsInProgress, firInProgressSummary, firLastActivityUtc, readFirState } from './select';
import { memoryStorage } from '../../../notifications/storage';
import { getSeedState } from '../mockData';
import { STORAGE_KEY, VERSION_KEY, DATA_VERSION } from '../storageKeys';
import type { FlightIrregularityReport } from '../types';

const fir = (over: Partial<FlightIrregularityReport>): FlightIrregularityReport => ({
  id: 'fir-1', ref: 'FIR-2026-001', title: 't', category: 'AOG', status: 'OPEN',
  openedByOid: 'USR002', ownerOid: 'USR002', openedAtUtc: '2026-07-11T10:00:00.000Z',
  eventStartUtc: '2026-07-11T08:00:00.000Z', anchors: [], narrative: '', impact: {},
  manualTimeline: [], statements: [], relatedSafetyItems: [], audit: [], ...over,
});

describe('firsInProgress — the leadership "in progress" set', () => {
  it('keeps OPEN and IN_REVIEW, drops PUBLISHED and CLOSED_INTERNAL', () => {
    const firs = [
      fir({ id: 'a', status: 'OPEN' }),
      fir({ id: 'b', status: 'IN_REVIEW' }),
      fir({ id: 'c', status: 'PUBLISHED' }),
      fir({ id: 'd', status: 'CLOSED_INTERNAL' }),
    ];
    expect(firsInProgress(firs).map(f => f.id)).toEqual(['a', 'b']);
  });
});

describe('firLastActivityUtc — newest touch across open/audit/manual/statements', () => {
  it('takes the latest of opened, audit, manual entries, and statement timestamps', () => {
    const f = fir({
      openedAtUtc: '2026-07-11T10:00:00.000Z',
      audit: [{ kind: 'OPENED', atUtc: '2026-07-11T10:00:00.000Z', byOid: 'USR002' }],
      manualTimeline: [{ source: 'MANUAL', atUtc: '2026-07-11T11:00:00.000Z', label: 'note' }],
      statements: [{
        id: 's1', requestedByOid: 'USR002', requestedOfOid: 'USR001', requestedOfRole: 'PILOT',
        prompt: 'p', status: 'SUBMITTED', requestedAtUtc: '2026-07-11T11:30:00.000Z',
        respondedAtUtc: '2026-07-11T12:15:00.000Z', text: 'x',
      }],
    });
    expect(firLastActivityUtc(f)).toBe('2026-07-11T12:15:00.000Z');
  });
});

describe('firInProgressSummary — chip data', () => {
  it('counts in-progress FIRs and reports the newest activity across them', () => {
    const firs = [
      fir({ id: 'a', status: 'OPEN', openedAtUtc: '2026-07-11T09:00:00.000Z' }),
      fir({ id: 'b', status: 'IN_REVIEW', openedAtUtc: '2026-07-11T10:00:00.000Z',
        manualTimeline: [{ source: 'MANUAL', atUtc: '2026-07-11T14:00:00.000Z', label: 'x' }] }),
      fir({ id: 'c', status: 'CLOSED_INTERNAL', openedAtUtc: '2026-07-11T23:00:00.000Z' }),
    ];
    const s = firInProgressSummary(firs);
    expect(s.count).toBe(2);
    expect(s.latestAtUtc).toBe('2026-07-11T14:00:00.000Z'); // closed FIR excluded despite newer stamp
  });

  it('is empty and undefined when nothing is in progress', () => {
    const s = firInProgressSummary([fir({ status: 'PUBLISHED' })]);
    expect(s).toEqual({ count: 0, latestAtUtc: undefined });
  });
});

describe('readFirState — read-only snapshot for out-of-provider surfaces', () => {
  it('returns seeds when storage has no matching version, without writing', () => {
    const s = memoryStorage();
    const state = readFirState(s);
    expect(state.firs.length).toBeGreaterThanOrEqual(2);
    expect(s.getItem(VERSION_KEY)).toBeNull(); // never writes (unlike the provider loader)
  });

  it('parses a stored payload when the version matches', () => {
    const s = memoryStorage();
    s.setItem(VERSION_KEY, DATA_VERSION);
    s.setItem(STORAGE_KEY, JSON.stringify({ firs: [fir({ id: 'x' })] }));
    expect(readFirState(s).firs.map(f => f.id)).toEqual(['x']);
  });

  it('falls back to seeds on a stale version or corrupt payload', () => {
    const stale = memoryStorage();
    stale.setItem(VERSION_KEY, 'old');
    stale.setItem(STORAGE_KEY, JSON.stringify({ firs: [] }));
    expect(readFirState(stale).firs.length).toBe(getSeedState().firs.length);

    const corrupt = memoryStorage();
    corrupt.setItem(VERSION_KEY, DATA_VERSION);
    corrupt.setItem(STORAGE_KEY, '{not json');
    expect(readFirState(corrupt).firs.length).toBe(getSeedState().firs.length);
  });
});
