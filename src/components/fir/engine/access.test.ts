import { describe, it, expect } from 'vitest';
import { isFirLeadership, canSeeFir, visibleFirs } from './access';
import type { FlightIrregularityReport } from '../types';

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
