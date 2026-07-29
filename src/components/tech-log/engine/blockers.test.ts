import { describe, it, expect } from 'vitest';
import { buildBlockers } from './blockers';
import type { Aircraft, Defect, Deferral, WorkCard, RecurringCheck } from '../types';

const ac: Aircraft = {
  id: 'ac1', tailNumber: 'N1PG', type: 'G650ER', serialNumber: '6260', status: 'ACTIVE',
  isProvisional: false, homeBase: 'KLUK', airframeTotalHours: 2450.5, airframeTotalCycles: 980,
};
const NOW = '2026-06-21T00:00:00Z';
const empty = {
  aircraft: [ac], defects: [], deferrals: [], workCards: [],
  recurringChecks: [], recurringAccomplishments: [],
};

function defect(p: Partial<Defect> = {}): Defect {
  return {
    id: 'd1', aircraftId: 'ac1', source: 'PIREP', ataChapter: '32', description: 'gear unsafe',
    airworthinessAffecting: true, status: 'OPEN', reportedByOid: 'u',
    occurredAtUtc: NOW, reportedAtUtc: NOW, signatureId: 's', ...p,
  };
}
function deferral(p: Partial<Deferral> = {}): Deferral {
  return {
    id: 'df1', defectId: 'd1', aircraftId: 'ac1', melItemId: 'm', governingMmelRevision: 'Rev 1',
    governingEffectiveDate: NOW, category: 'C', dayOfDiscoveryUtc: NOW, clockStartDateUtc: NOW,
    governingTimezone: 'America/New_York',
    repairIntervalUnit: 'CALENDAR_DAY', repairIntervalValue: 10, placardRequired: false,
    mProcedureRequired: false, extensionUsed: false, riiRequired: false, melReviewAcknowledged: true,
    signedByOid: 'u', signatureId: 's', status: 'ACTIVE', ...p,
  };
}
function check(p: Partial<RecurringCheck> = {}): RecurringCheck {
  return {
    id: 'rc1', aircraftId: 'ac1', name: 'Altimeter & static system (91.411)', intervalUnit: 'MONTH',
    intervalValue: 24, active: true, createdAtUtc: '2020-01-01T00:00:00Z', ...p,
  };
}
function card(p: Partial<WorkCard> = {}): WorkCard {
  return {
    id: 'wc1', cardNumber: 'WC-1015', aircraftId: 'ac1', title: 'LMLG troubleshoot', ataChapter: '32',
    description: 'x', headerStatusCode: 1, scheduled: false, riiRequired: false, source: 'MANUAL',
    createdAtUtc: NOW, status: 'OPEN', steps: [], ...p,
  };
}

describe('buildBlockers — every grounding cause is a listed, actionable row', () => {
  it('GREEN aircraft has no blockers and no restrictions', () => {
    const r = buildBlockers('ac1', empty, NOW);
    expect(r.blockers).toHaveLength(0);
    expect(r.restrictions).toHaveLength(0);
    expect(r.status).toBe('GREEN');
  });

  it('rule 1 — an open airworthiness defect is a blocker offering defer / work card / release', () => {
    const r = buildBlockers('ac1', { ...empty, defects: [defect()] }, NOW);
    expect(r.status).toBe('RED');
    expect(r.blockers).toHaveLength(1);
    const b = r.blockers[0];
    expect(b.kind).toBe('DEFECT_OPEN');
    expect(b.actions).toEqual(expect.arrayContaining(['DEFER', 'RAISE_CARD', 'SIGN_RELEASE']));
    expect(b.governing).toBe(true);
  });

  it('rule 2 — an expired deferral is its own blocker row, not a silent status', () => {
    // Cat C, 10 calendar days, clock started 2026-06-01 → long past due at NOW.
    const d = deferral({ status: 'ACTIVE', clockStartDateUtc: '2026-06-01T00:00:00Z', repairDueDateUtc: '2026-06-11T03:59:59Z' });
    const r = buildBlockers('ac1', { ...empty, defects: [defect({ status: 'DEFERRED' })], deferrals: [d] }, NOW);
    expect(r.status).toBe('RED');
    const kinds = r.blockers.map(b => b.kind);
    expect(kinds).toContain('DEFERRAL_EXPIRED');
    // an expired deferral must NOT also be listed as an in-force restriction
    expect(r.restrictions).toHaveLength(0);
  });

  it('rule 3 — a never-accomplished recurring check is a blocker with an accomplish action', () => {
    const r = buildBlockers('ac1', { ...empty, recurringChecks: [check()] }, NOW);
    expect(r.status).toBe('RED');
    const b = r.blockers.find(x => x.kind === 'CHECK_EXPIRED');
    expect(b).toBeDefined();
    expect(b!.actions).toContain('ACCOMPLISH');
  });

  it('a PENDING_PLACARD deferral blocks dispatch and asks for the gating release', () => {
    const r = buildBlockers(
      'ac1',
      { ...empty, defects: [defect({ status: 'DEFERRED' })], deferrals: [deferral({ status: 'PENDING_PLACARD', placardRequired: true })] },
      NOW,
    );
    expect(r.status).toBe('RED');
    const b = r.blockers.find(x => x.kind === 'DEFERRAL_PENDING_PLACARD');
    expect(b).toBeDefined();
    expect(b!.actions).toContain('SIGN_GATING');
  });

  it('rule 4 — an ACTIVE deferral is a restriction, not a blocker', () => {
    const r = buildBlockers('ac1', { ...empty, defects: [defect({ status: 'DEFERRED' })], deferrals: [deferral()] }, NOW);
    expect(r.status).toBe('AMBER');
    expect(r.blockers).toHaveLength(0);
    expect(r.restrictions).toHaveLength(1);
    expect(r.restrictions[0].actions).toContain('EXTEND');
  });

  it('open work cards are listed as in-progress work, never as a grounding cause', () => {
    const r = buildBlockers('ac1', { ...empty, workCards: [card()] }, NOW);
    expect(r.status).toBe('GREEN');
    expect(r.blockers).toHaveLength(0);
    expect(r.inProgress).toHaveLength(1);
    expect(r.inProgress[0].actions).toContain('OPEN_CARD');
  });

  it('the governing blocker matches the serviceability rule that actually grounds the tail', () => {
    // both an open defect (rule 1) and an expired check (rule 3) — rule 1 wins
    const r = buildBlockers('ac1', { ...empty, defects: [defect()], recurringChecks: [check()] }, NOW);
    const governing = r.blockers.filter(b => b.governing);
    expect(governing).toHaveLength(1);
    expect(governing[0].kind).toBe('DEFECT_OPEN');
    expect(r.governingRule).toBe(1);
  });

  it('a provisional aircraft cannot be offered the defer action', () => {
    const prov: Aircraft = { ...ac, id: 'ac2', tailNumber: 'N3PG', isProvisional: true };
    const r = buildBlockers(
      'ac2',
      { ...empty, aircraft: [ac, prov], defects: [defect({ id: 'd2', aircraftId: 'ac2' })] },
      NOW,
    );
    const b = r.blockers.find(x => x.kind === 'DEFECT_OPEN');
    expect(b).toBeDefined();
    expect(b!.actions).not.toContain('DEFER');
  });

  it('a repair-due instant is handed over raw, never pre-formatted into the display text (D24)', () => {
    const due = '2026-08-04T04:00:00.000Z';
    const r = buildBlockers(
      'ac1',
      { ...empty, defects: [defect({ status: 'DEFERRED' })], deferrals: [deferral({ repairDueDateUtc: due })] },
      NOW,
    );
    const row = r.restrictions[0];
    expect(row.dueUtc).toBe(due);
    expect(row.governingTimezone).toBe('America/New_York');
    // The engine has no display-zone context, so it must not bake a timestamp into any visible string.
    for (const text of [row.title, row.detail ?? '', row.clearsWhen]) {
      expect(text).not.toContain(due);
      expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
    }
  });

  /**
   * A deferral row is *about* a defect, and the defect is what carries the CAS annunciation the
   * crew saw (D57). Populating only DEFECT_OPEN made a deferred defect's CAS invisible on the
   * board — reachable on seed data, where the seeded deferral's defect is `casObserved`.
   */
  it('deferral-backed rows carry the linked defect, so its CAS annunciation is renderable', () => {
    const d = defect({ status: 'DEFERRED', casMessage: 'CABIN TEMP', casColor: 'AMBER' });
    const expired = deferral({ id: 'df-exp', status: 'ACTIVE', clockStartDateUtc: '2026-06-01T00:00:00Z', repairDueDateUtc: '2026-06-11T03:59:59Z' });
    const pending = deferral({ id: 'df-pnd', status: 'PENDING_PLACARD', placardRequired: true });
    const active = deferral({ id: 'df-act', status: 'ACTIVE' });

    for (const df of [expired, pending, active]) {
      const r = buildBlockers('ac1', { ...empty, defects: [d], deferrals: [df] }, NOW);
      const row = [...r.blockers, ...r.restrictions].find(x => x.deferral?.id === df.id);
      expect(row, `no row for ${df.status}`).toBeDefined();
      expect(row!.defect?.id).toBe('d1');
      expect(row!.defect?.casMessage).toBe('CABIN TEMP');
      expect(row!.defect?.casColor).toBe('AMBER');
    }
  });

  it('a deferral whose defect is not on this tail leaves defect undefined rather than mismatching', () => {
    const r = buildBlockers(
      'ac1',
      { ...empty, deferrals: [deferral({ defectId: 'gone' })] },
      NOW,
    );
    expect(r.restrictions[0].defect).toBeUndefined();
  });

  it('every blocker states what clears it', () => {
    const r = buildBlockers(
      'ac1',
      { ...empty, defects: [defect()], deferrals: [deferral({ id: 'df2', defectId: 'dX', status: 'PENDING_PLACARD' })], recurringChecks: [check()] },
      NOW,
    );
    expect(r.blockers.length).toBeGreaterThanOrEqual(3);
    for (const b of r.blockers) {
      expect(b.clearsWhen.length).toBeGreaterThan(0);
      expect(b.title.length).toBeGreaterThan(0);
    }
  });
});
