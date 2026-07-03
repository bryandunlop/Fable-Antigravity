import { describe, it, expect } from 'vitest';
import { canWatchlistDefect, canEscalateWatchedDefect } from './watchlist';
import type { Defect, DefectStatus, Personnel } from '../types';

const maint = (p: Partial<Personnel> = {}): Personnel => ({ oid: 'm', displayName: 'M', role: 'MAINTENANCE', riiAuthorized: false, riiAuthorizedAta: [], active: true, ...p });
const pilot = (p: Partial<Personnel> = {}): Personnel => ({ oid: 'p', displayName: 'P', role: 'PILOT', riiAuthorized: false, riiAuthorizedAta: [], active: true, ...p });
const defect = (p: Partial<Defect> = {}): Pick<Defect, 'status'> & Partial<Defect> => ({ status: 'OPEN', ...p });

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
