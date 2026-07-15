import { describe, it, expect } from 'vitest';
import { canWatchlistDefect, canEscalateWatchedDefect, watchItemsFor } from './watchlist';
import type { Defect, DefectStatus, Personnel } from '../types';

const maint = (p: Partial<Personnel> = {}): Personnel => ({ oid: 'm', displayName: 'M', role: 'MAINTENANCE', riiAuthorized: false, riiAuthorizedAta: [], active: true, ...p });
const pilot = (p: Partial<Personnel> = {}): Personnel => ({ oid: 'p', displayName: 'P', role: 'PILOT', riiAuthorized: false, riiAuthorizedAta: [], active: true, ...p });
const defect = (p: Partial<Defect> = {}): Pick<Defect, 'status'> & Partial<Defect> => ({ status: 'OPEN', ...p });

const row = (p: Partial<Defect> = {}): Defect => ({
  id: 'd1', aircraftId: 'ac1', source: 'CABIN', ataChapter: '25', description: 'seat 3A recline inop',
  severity: 'LOW', airworthinessAffecting: false, status: 'WATCHLISTED', reportedByOid: 'm',
  reportedAtUtc: '2026-06-21T00:00:00Z', signatureId: 's', ...p,
});

describe('canWatchlistDefect', () => {
  it('allows maintenance to watchlist an OPEN defect assessed non-airworthiness', () => {
    expect(canWatchlistDefect(maint(), defect(), false).ok).toBe(true);
  });

  it('refuses a pilot', () => {
    const r = canWatchlistDefect(pilot(), defect(), false);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/maintenance/i);
  });

  it('refuses every non-OPEN current status', () => {
    for (const status of ['DEFERRED', 'RECTIFIED', 'CLOSED', 'WATCHLISTED'] as DefectStatus[]) {
      expect(canWatchlistDefect(maint(), defect({ status }), false).ok).toBe(false);
    }
  });

  it('refuses when the assessment is null (grounding-by-default is not an assessment)', () => {
    expect(canWatchlistDefect(maint(), defect(), null).ok).toBe(false);
  });

  it('refuses when the assessment is airworthiness-affecting', () => {
    expect(canWatchlistDefect(maint(), defect(), true).ok).toBe(false);
  });
});

describe('watchItemsFor', () => {
  it('returns the aircraft\'s current watch items', () => {
    const items = watchItemsFor([row()], 'ac1');
    expect(items.map(d => d.id)).toEqual(['d1']);
  });

  it('excludes other aircraft', () => {
    expect(watchItemsFor([row({ id: 'd2', aircraftId: 'ac2' })], 'ac1')).toEqual([]);
  });

  it('spans the fleet when no aircraft is given — the work queue\'s bucket', () => {
    const items = watchItemsFor([row(), row({ id: 'd2', aircraftId: 'ac2' })]);
    expect(items.map(d => d.id).sort()).toEqual(['d1', 'd2']);
  });

  it('excludes every non-WATCHLISTED status', () => {
    for (const status of ['OPEN', 'DEFERRED', 'RECTIFIED', 'CLOSED'] as DefectStatus[]) {
      expect(watchItemsFor([row({ status })], 'ac1')).toEqual([]);
    }
  });

  it('excludes a superseded watch row, and returns the row that superseded it', () => {
    // d1 was escalated back to OPEN by d2 — the watch item is no longer current.
    const escalated = row({ id: 'd2', status: 'OPEN', airworthinessAffecting: true, supersedesId: 'd1' });
    expect(watchItemsFor([row(), escalated], 'ac1')).toEqual([]);
  });

  it('surfaces a watch row that supersedes an earlier open row', () => {
    const watched = row({ id: 'd2', supersedesId: 'd1' });
    const original = row({ id: 'd1', status: 'OPEN', airworthinessAffecting: true });
    expect(watchItemsFor([original, watched], 'ac1').map(d => d.id)).toEqual(['d2']);
  });

  it('sorts newest-reported first, matching the work queue', () => {
    const older = row({ id: 'old', reportedAtUtc: '2026-06-01T00:00:00Z' });
    const newer = row({ id: 'new', reportedAtUtc: '2026-06-20T00:00:00Z' });
    expect(watchItemsFor([older, newer], 'ac1').map(d => d.id)).toEqual(['new', 'old']);
  });
});

describe('canEscalateWatchedDefect', () => {
  it('allows maintenance to escalate a WATCHLISTED defect back to open grounding', () => {
    expect(canEscalateWatchedDefect(maint(), defect({ status: 'WATCHLISTED' })).ok).toBe(true);
  });

  it('refuses a pilot', () => {
    expect(canEscalateWatchedDefect(pilot(), defect({ status: 'WATCHLISTED' })).ok).toBe(false);
  });

  it('refuses a defect that is not on the watch list', () => {
    for (const status of ['OPEN', 'DEFERRED', 'RECTIFIED', 'CLOSED'] as DefectStatus[]) {
      expect(canEscalateWatchedDefect(maint(), defect({ status })).ok).toBe(false);
    }
  });
});
