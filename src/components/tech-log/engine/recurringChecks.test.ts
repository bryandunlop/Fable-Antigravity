import { describe, it, expect } from 'vitest';
import { projectCheck, expiredChecksFor } from './recurringChecks';
import { deriveServiceability } from './serviceability';
import type { Aircraft, RecurringCheck, RecurringCheckAccomplishment } from '../types';

const ac: Aircraft = {
  id: 'ac1', tailNumber: 'N5PG', type: 'G500', serialNumber: '72157', status: 'ACTIVE',
  isProvisional: false, homeBase: 'KLUK', airframeTotalHours: 1200, airframeTotalCycles: 800,
};
const NOW = '2026-06-21T00:00:00Z';

const check = (p: Partial<RecurringCheck> = {}): RecurringCheck => ({
  id: 'c1', aircraftId: 'ac1', name: 'Altimeter', intervalUnit: 'CALENDAR_DAY', intervalValue: 30,
  active: true, createdAtUtc: '2026-01-01T00:00:00Z', ...p,
});
const acc = (p: Partial<RecurringCheckAccomplishment> = {}): RecurringCheckAccomplishment => ({
  id: 'a1', checkId: 'c1', aircraftId: 'ac1', accomplishedAtUtc: NOW, accomplishedByOid: 'u',
  airframeHours: 1200, airframeCycles: 800, signatureId: 's', ...p,
});

describe('recurring checks (§17.4)', () => {
  it('CURRENT when within the calendar interval', () => {
    const p = projectCheck(check(), [acc({ accomplishedAtUtc: '2026-06-15T00:00:00Z' })], NOW, { hours: 1200, cycles: 800 });
    expect(p.state).toBe('CURRENT');
  });
  it('EXPIRED once past the calendar interval', () => {
    const p = projectCheck(check({ intervalValue: 10 }), [acc({ accomplishedAtUtc: '2026-05-01T00:00:00Z' })], NOW, { hours: 1200, cycles: 800 });
    expect(p.state).toBe('EXPIRED');
  });
  it('NEVER_DONE when there is no accomplishment', () => {
    expect(projectCheck(check(), [], NOW, { hours: 1200, cycles: 800 }).state).toBe('NEVER_DONE');
  });
  it('usage-based EXPIRED once airframe passes the threshold', () => {
    const p = projectCheck(check({ intervalUnit: 'FLIGHT_HOUR', intervalValue: 100 }), [acc({ airframeHours: 1050 })], NOW, { hours: 1200, cycles: 800 });
    expect(p.state).toBe('EXPIRED'); // due at 1150, now 1200
  });

  it('an expired check grounds the aircraft RED via serviceability rule 3', () => {
    const state = {
      aircraft: [ac], defects: [], deferrals: [],
      recurringChecks: [check({ intervalValue: 10 })],
      recurringAccomplishments: [acc({ accomplishedAtUtc: '2026-05-01T00:00:00Z' })],
    };
    const r = deriveServiceability('ac1', state, NOW);
    expect(r.status).toBe('RED');
    expect(r.governingRule).toBe(3);
    expect(r.drivingCheckId).toBe('c1');
  });

  it('re-accomplishing the check clears the grounding (GREEN)', () => {
    const state = {
      aircraft: [ac], defects: [], deferrals: [],
      recurringChecks: [check({ intervalValue: 10 })],
      recurringAccomplishments: [acc({ accomplishedAtUtc: '2026-06-20T00:00:00Z' })],
    };
    expect(deriveServiceability('ac1', state, NOW).status).toBe('GREEN');
    expect(expiredChecksFor('ac1', state, NOW)).toHaveLength(0);
  });
});
