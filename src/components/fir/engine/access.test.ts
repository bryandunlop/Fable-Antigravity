import { describe, it, expect } from 'vitest';
import { isFirLeadership, canSeeFir, visibleFirs, visibleStatements, isFirRequestee } from './access';
import type { FlightIrregularityReport, PerspectiveStatement } from '../types';

const fir = (over: Partial<FlightIrregularityReport> = {}): FlightIrregularityReport => ({
  id: 'fir-1', ref: 'FIR-2026-001', title: 'LMLG AOG at KLUK', category: 'AOG', status: 'OPEN',
  openedByOid: 'USR002', ownerOid: 'USR002', openedAtUtc: '2026-07-11T10:00:00.000Z',
  eventStartUtc: '2026-07-11T08:00:00.000Z', anchors: [], narrative: '', impact: {},
  manualTimeline: [], statements: [], relatedSafetyItems: [], audit: [], ...over,
});

describe('FIR access (§7 — names internal: leadership tier + owner see internal FIRs)', () => {
  it('recognizes the leadership tier (dom, chief-pilot, lead, admin — vp maps in too)', () => {
    expect(isFirLeadership(['dom'])).toBe(true);
    expect(isFirLeadership(['chief-pilot'])).toBe(true);
    expect(isFirLeadership(['lead'])).toBe(true);
    expect(isFirLeadership(['admin'])).toBe(true);
    expect(isFirLeadership(['vp'])).toBe(true);
    expect(isFirLeadership(['pilot'])).toBe(false);
    expect(isFirLeadership(['maintenance', 'scheduling'])).toBe(false);
  });

  it('leadership sees every FIR from the moment it opens', () => {
    expect(canSeeFir(fir(), { oid: 'USR999', roles: ['lead'] })).toBe(true);
  });

  it('the owner and the opener see their FIR without a leadership role', () => {
    expect(canSeeFir(fir(), { oid: 'USR002', roles: ['maintenance'] })).toBe(true);
    const reassigned = fir({ ownerOid: 'USR008' });
    expect(canSeeFir(reassigned, { oid: 'USR008', roles: ['maintenance'] })).toBe(true);
    // the original opener keeps visibility after reassignment
    expect(canSeeFir(reassigned, { oid: 'USR002', roles: ['maintenance'] })).toBe(true);
  });

  it('an uninvolved non-leadership user does not see an internal FIR', () => {
    expect(canSeeFir(fir(), { oid: 'USR007', roles: ['pilot'] })).toBe(false);
  });

  it('visibleFirs filters a list down to what the viewer may see', () => {
    const firs = [fir(), fir({ id: 'fir-2', ref: 'FIR-2026-002', openedByOid: 'USR007', ownerOid: 'USR007' })];
    expect(visibleFirs(firs, { oid: 'USR007', roles: ['pilot'] }).map(f => f.id)).toEqual(['fir-2']);
    expect(visibleFirs(firs, { oid: 'USR999', roles: ['dom'] })).toHaveLength(2);
  });
});

describe('FIR statement visibility (§7 — requestee sees only their own; owner/leadership see all)', () => {
  const stmt = (over: Partial<PerspectiveStatement>): PerspectiveStatement => ({
    id: 'st-1', requestedByOid: 'USR002', requestedOfOid: 'USR001', requestedOfRole: 'PILOT',
    prompt: 'Your account of the gear indication', status: 'REQUESTED',
    requestedAtUtc: '2026-07-11T10:00:00.000Z', ...over,
  });
  const withStmts = fir({
    ownerOid: 'USR002', openedByOid: 'USR002',
    statements: [
      stmt({ id: 'st-1', requestedOfOid: 'USR001' }),
      stmt({ id: 'st-2', requestedOfOid: 'USR008', requestedOfRole: 'MAINTENANCE', status: 'SUBMITTED', text: 'saw it too' }),
    ],
  });

  it('a requestee can open the FIR (canSeeFir grants them a scoped view)', () => {
    expect(canSeeFir(withStmts, { oid: 'USR001', roles: ['pilot'] })).toBe(true);
  });

  it('leadership and owner see every statement', () => {
    expect(visibleStatements(withStmts, { oid: 'USR999', roles: ['dom'] })).toHaveLength(2);
    expect(visibleStatements(withStmts, { oid: 'USR002', roles: ['maintenance'] })).toHaveLength(2);
  });

  it('a requestee sees only their own statement, never other people’s', () => {
    expect(visibleStatements(withStmts, { oid: 'USR001', roles: ['pilot'] }).map(s => s.id)).toEqual(['st-1']);
    expect(visibleStatements(withStmts, { oid: 'USR008', roles: ['maintenance'] }).map(s => s.id)).toEqual(['st-2']);
  });

  it('isFirRequestee detects membership', () => {
    expect(isFirRequestee(withStmts, 'USR001')).toBe(true);
    expect(isFirRequestee(withStmts, 'USR007')).toBe(false);
  });

  it('an uninvolved non-leadership user sees neither the FIR nor any statement', () => {
    expect(canSeeFir(withStmts, { oid: 'USR007', roles: ['pilot'] })).toBe(false);
    expect(visibleStatements(withStmts, { oid: 'USR007', roles: ['pilot'] })).toHaveLength(0);
  });
});
