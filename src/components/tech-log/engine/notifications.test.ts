import { describe, it, expect } from 'vitest';
import { getDefaultState } from '../mockData/scenarios';
import { buildNotifications } from './notifications';
import type { Deferral, Personnel, TechLogState } from '../types';

describe('notifications feed', () => {
  const s = getDefaultState();
  const now = new Date().toISOString();
  const maint = s.personnel.find(p => p.oid === 'USR002')!; // DOM (maintenance)
  const pilot = s.personnel.find(p => p.oid === 'USR001')! as Personnel; // Capt (reported d-n1pg + d-n6pg)

  it('maintenance sees the open squawk (N1PG) as a notification', () => {
    const feed = buildNotifications(s, maint, now);
    expect(feed.some(n => n.id === 'sq:d-n1pg')).toBe(true);
  });

  it('pilot sees the released briefing (N2PG) and their deferred squawk (N6PG)', () => {
    const feed = buildNotifications(s, pilot, now);
    expect(feed.some(n => n.id === 'br:brief-1')).toBe(true);
    expect(feed.some(n => n.id === 'ac:d-n6pg')).toBe(true);
  });

  it('dismissed notifications are excluded', () => {
    const s2 = { ...s, dismissedNotifications: ['sq:d-n1pg'] };
    expect(buildNotifications(s2, maint, now).some(n => n.id === 'sq:d-n1pg')).toBe(false);
  });

  it('feed is sorted critical-first', () => {
    const feed = buildNotifications(s, maint, now);
    const ranks = feed.map(n => (n.severity === 'critical' ? 0 : n.severity === 'warn' ? 1 : 2));
    for (let i = 1; i < ranks.length; i++) expect(ranks[i - 1]).toBeLessThanOrEqual(ranks[i]);
  });
});

// ── D59 — the crew action is the crew's job to do and maintenance's job to release ──
describe('crew-action notifications (D59)', () => {
  const s = getDefaultState();
  const now = new Date().toISOString();
  const maint = s.personnel.find(p => p.oid === 'USR002')!;
  const pilot = s.personnel.find(p => p.oid === 'USR001')! as Personnel;

  const crewActionDeferral = (p: Partial<Deferral> = {}): Deferral => ({
    id: 'df-ca', defectId: 'd-n6pg', aircraftId: 'ac-n6pg', melItemId: 'mel-g500-21-01-01',
    governingMmelRevision: 'Rev 1', governingEffectiveDate: '2025-09-03', category: 'C',
    dayOfDiscoveryUtc: now, clockStartDateUtc: now, governingTimezone: 'America/New_York',
    repairIntervalUnit: 'CALENDAR_DAY', repairIntervalValue: 10, placardRequired: false,
    mProcedureRequired: false, extensionUsed: false, riiRequired: false, melReviewAcknowledged: true,
    signedByOid: 'USR002', signatureId: 'sig-x', status: 'PENDING_PLACARD',
    crewActionRequired: true, melOProcedure: 'Pull CB 3-J14 before each flight',
    melSubItemNumber: '21-01-01', ...p,
  });
  const withDeferral = (d: Deferral): TechLogState => ({ ...s, deferrals: [...s.deferrals, d] });

  it('BOTH personas are told a crew action is outstanding — pilots do it on the road, maintenance at base', () => {
    const st = withDeferral(crewActionDeferral());
    for (const persona of [pilot, maint]) {
      const n = buildNotifications(st, persona, now).find(x => x.id === 'ca:df-ca');
      expect(n, `${persona.role} should see the crew-action notification`).toBeDefined();
      expect(n!.title).toMatch(/Crew action required — N6PG/);
      expect(n!.link).toContain('crewAction=1');
    }
  });

  it('once marked, the pending notice is gone and maintenance is asked to review and release', () => {
    const st = withDeferral(crewActionDeferral({
      crewActionCompliance: { id: 'cac1', byOid: 'USR001', byName: 'Capt Reed', atUtc: now, signatureId: 'sig-ca' },
    }));
    const maintFeed = buildNotifications(st, maint, now);
    expect(maintFeed.some(n => n.id === 'ca:df-ca')).toBe(false);
    const done = maintFeed.find(n => n.id === 'cac:df-ca');
    expect(done).toBeDefined();
    expect(done!.title).toMatch(/Crew action complied — review and release N6PG/);
    // the mark is evidence: a pilot has nothing left to do here
    expect(buildNotifications(st, pilot, now).some(n => n.id === 'cac:df-ca')).toBe(false);
  });

  it('a deferral with no crew action raises neither notice', () => {
    const st = withDeferral(crewActionDeferral({ crewActionRequired: false, placardRequired: true }));
    const feed = buildNotifications(st, maint, now);
    expect(feed.some(n => n.id === 'ca:df-ca')).toBe(false);
    expect(feed.some(n => n.id === 'cac:df-ca')).toBe(false);
    expect(feed.some(n => n.id === 'pp:df-ca')).toBe(true); // the existing gating notice is untouched
  });
});
