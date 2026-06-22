import { describe, it, expect } from 'vitest';
import { lifecycleStep } from './lifecycle';
import type { FlightBriefing, Postflight, FlightLog } from '../types';

const AC = 'ac1';
const brief = (p: Partial<FlightBriefing> = {}): FlightBriefing => ({ id: 'b1', aircraftId: AC, preparedByOid: 'm', createdAtUtc: '2026-06-20T00:00:00Z', status: 'DRAFT', checklist: [], ...p });
const leg = (p: Partial<FlightLog> = {}): FlightLog => ({ id: 'fl1', aircraftId: AC, sectorSequence: 1, flightDateUtc: '2026-06-21T10:00:00Z', outUtc: '', offUtc: '', onUtc: '', inUtc: '', blockTime: 1, flightTime: 1, landings: 1, cycles: 1, picOid: 'p', sicOid: 's', airframeTotalHours: 1, airframeTotalCycles: 1, signatureId: 'sig', ...p });
const base = { briefings: [] as FlightBriefing[], postflights: [] as Postflight[], flightLogs: [] as FlightLog[] };

describe('lifecycleStep', () => {
  it('PREFLIGHT when in maintenance / no briefing', () => {
    expect(lifecycleStep(AC, base, '2026-06-22T00:00:00Z').step).toBe('PREFLIGHT');
  });
  it('RELEASED when a briefing is released, not acknowledged', () => {
    const b = brief({ status: 'RELEASED', releasedAtUtc: '2026-06-21T08:00:00Z' });
    expect(lifecycleStep(AC, { ...base, briefings: [b] }, '2026-06-21T09:00:00Z').step).toBe('RELEASED');
  });
  it('ACCEPTED when acknowledged but no leg flown since', () => {
    const b = brief({ status: 'ACKNOWLEDGED', releasedAtUtc: '2026-06-21T08:00:00Z', acknowledgedAtUtc: '2026-06-21T09:00:00Z' });
    expect(lifecycleStep(AC, { ...base, briefings: [b] }, '2026-06-21T09:30:00Z').step).toBe('ACCEPTED');
  });
  it('IN_SERVICE when a leg has flown since acceptance', () => {
    const b = brief({ status: 'ACKNOWLEDGED', releasedAtUtc: '2026-06-21T08:00:00Z', acknowledgedAtUtc: '2026-06-21T09:00:00Z' });
    const fl = leg({ flightDateUtc: '2026-06-21T11:00:00Z' });
    expect(lifecycleStep(AC, { ...base, briefings: [b], flightLogs: [fl] }, '2026-06-21T12:00:00Z').step).toBe('IN_SERVICE');
  });
  it('back to PREFLIGHT after a postflight reclaim', () => {
    const b = brief({ status: 'ACKNOWLEDGED', releasedAtUtc: '2026-06-21T08:00:00Z', acknowledgedAtUtc: '2026-06-21T09:00:00Z' });
    const pf: Postflight = { id: 'pf1', aircraftId: AC, performedByOid: 'm', performedAtUtc: '2026-06-22T07:00:00Z', checklist: [], gatheredDefectIds: [], signatureId: 's' };
    expect(lifecycleStep(AC, { ...base, briefings: [b], postflights: [pf] }, '2026-06-22T08:00:00Z').step).toBe('PREFLIGHT');
  });
  it('pre-acceptance leg does NOT promote to IN_SERVICE', () => {
    const b = brief({ status: 'ACKNOWLEDGED', releasedAtUtc: '2026-06-21T08:00:00Z', acknowledgedAtUtc: '2026-06-21T09:00:00Z' });
    const fl = leg({ flightDateUtc: '2026-06-21T07:00:00Z' });
    expect(lifecycleStep(AC, { ...base, briefings: [b], flightLogs: [fl] }, '2026-06-21T10:00:00Z').step).toBe('ACCEPTED');
  });
  it('exact-boundary leg (flightDateUtc === acknowledgedAtUtc) promotes to IN_SERVICE', () => {
    const b = brief({ status: 'ACKNOWLEDGED', releasedAtUtc: '2026-06-21T08:00:00Z', acknowledgedAtUtc: '2026-06-21T09:00:00Z' });
    const fl = leg({ flightDateUtc: '2026-06-21T09:00:00Z' });
    expect(lifecycleStep(AC, { ...base, briefings: [b], flightLogs: [fl] }, '2026-06-21T10:00:00Z').step).toBe('IN_SERVICE');
  });
});
