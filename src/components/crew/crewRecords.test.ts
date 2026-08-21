import { describe, expect, it } from 'vitest';
import { getCrewRecords, expiringWithinDays, dutyHeadroom, type CrewRecord } from './crewRecords';
import { SYSTEM_USERS } from '../../lib/mockUsers';
import { SEED_PERSONNEL } from '../tech-log/mockData/fleet';

const NOW = '2026-08-19T12:00:00.000Z';

function record(overrides: Partial<CrewRecord>): CrewRecord {
  return {
    id: 'USR999',
    name: 'Test Pilot',
    role: 'PIC',
    dutyHoursUsed: 0,
    dutyLimitHours: 14,
    currencyExpiresUtc: '2099-01-01T00:00:00.000Z',
    medicalExpiresUtc: null,
    trainingDueUtc: '2099-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('getCrewRecords', () => {
  it('every name matches a mockUsers or SEED_PERSONNEL display name', () => {
    const known = new Set([
      ...SYSTEM_USERS.map(u => u.name),
      ...SEED_PERSONNEL.map(p => p.displayName),
    ]);
    for (const r of getCrewRecords(NOW)) {
      expect(known, `${r.name} not in mockUsers/SEED_PERSONNEL`).toContain(r.name);
    }
  });

  it('every id matches a mockUsers or SEED_PERSONNEL id', () => {
    const known = new Set([
      ...SYSTEM_USERS.map(u => u.id),
      ...SEED_PERSONNEL.map(p => p.oid),
    ]);
    for (const r of getCrewRecords(NOW)) {
      expect(known).toContain(r.id);
    }
  });

  it('expiry dates are derived from now, not hardcoded years', () => {
    const nowMs = Date.parse(NOW);
    const later = '2031-03-05T12:00:00.000Z';
    const shifted = Date.parse(later) - nowMs;

    const a = getCrewRecords(NOW);
    const b = getCrewRecords(later);
    for (let i = 0; i < a.length; i++) {
      expect(Date.parse(b[i].currencyExpiresUtc) - Date.parse(a[i].currencyExpiresUtc)).toBe(shifted);
      // Every expiry sits in the future-or-near-past of the given now, never a frozen year.
      expect(Date.parse(a[i].currencyExpiresUtc)).toBeGreaterThan(nowMs);
    }
  });
});

describe('expiringWithinDays', () => {
  const DAY = 86_400_000;

  it('includes an expiry 59 days out and excludes one 61 days out at a 60-day window', () => {
    const nowMs = Date.parse(NOW);
    const in59 = record({ id: 'USR059', currencyExpiresUtc: new Date(nowMs + 59 * DAY).toISOString() });
    const in61 = record({ id: 'USR061', currencyExpiresUtc: new Date(nowMs + 61 * DAY).toISOString() });

    const hits = expiringWithinDays([in59, in61], 60, NOW);
    expect(hits.map(h => h.record.id)).toContain('USR059');
    expect(hits.map(h => h.record.id)).not.toContain('USR061');
  });

  it('reports all three expiry kinds and sorts soonest first', () => {
    const nowMs = Date.parse(NOW);
    const r = record({
      currencyExpiresUtc: new Date(nowMs + 30 * DAY).toISOString(),
      medicalExpiresUtc: new Date(nowMs + 10 * DAY).toISOString(),
      trainingDueUtc: new Date(nowMs + 50 * DAY).toISOString(),
    });
    const hits = expiringWithinDays([r], 60, NOW);
    expect(hits.map(h => h.kind)).toEqual(['medical', 'currency', 'training']);
    expect(hits.map(h => h.daysUntil)).toEqual([10, 30, 50]);
  });

  it('includes already-lapsed items with negative daysUntil', () => {
    const nowMs = Date.parse(NOW);
    const r = record({ currencyExpiresUtc: new Date(nowMs - 5 * DAY).toISOString() });
    const hits = expiringWithinDays([r], 60, NOW);
    expect(hits[0].daysUntil).toBe(-5);
  });
});

describe('dutyHeadroom', () => {
  it('computes limit minus used and sorts tightest first', () => {
    const rows = dutyHeadroom([
      record({ id: 'A', dutyHoursUsed: 2, dutyLimitHours: 14 }),
      record({ id: 'B', dutyHoursUsed: 8.5, dutyLimitHours: 14 }),
    ]);
    expect(rows[0].id).toBe('B');
    expect(rows[0].headroomHours).toBeCloseTo(5.5);
    expect(rows[1].headroomHours).toBe(12);
  });
});
