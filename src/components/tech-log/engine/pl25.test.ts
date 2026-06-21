import { describe, it, expect } from 'vitest';
import { computeClockStart, computeRepairDue, isDeferralExpired } from './pl25';

describe('PL-25 clock', () => {
  it('clock starts midnight UTC after discovery (day of discovery excluded)', () => {
    expect(computeClockStart('2026-01-26T10:00:00Z')).toBe('2026-01-27T00:00:00.000Z');
  });

  it('Cat C (10 day) discovered Jan 26 10:00 -> due Feb 5 00:00 UTC', () => {
    const start = computeClockStart('2026-01-26T10:00:00Z');
    const due = computeRepairDue('C', start, { repairIntervalUnit: 'CALENDAR_DAY', repairIntervalValue: 10 }, { hours: 0, cycles: 0 });
    expect(due.repairDueDateUtc).toBe('2026-02-05T00:00:00.000Z');
    expect(due.usageDueThreshold).toBeUndefined();
  });

  it('Cat B (3 day) calendar due date', () => {
    const start = computeClockStart('2026-03-01T08:00:00Z'); // -> Mar 2 00:00
    const due = computeRepairDue('B', start, { repairIntervalUnit: 'CALENDAR_DAY', repairIntervalValue: 3 }, { hours: 0, cycles: 0 });
    expect(due.repairDueDateUtc).toBe('2026-03-04T00:00:00.000Z');
  });

  it('category fallback: Cat D with no explicit interval -> 120 days', () => {
    const start = computeClockStart('2026-01-01T06:00:00Z'); // -> Jan 2 00:00
    const due = computeRepairDue('D', start, {}, { hours: 0, cycles: 0 });
    expect(due.repairDueDateUtc).toBe('2026-05-01T00:00:00.000Z');
  });

  it('Cat A usage-based (CYCLE) computes a usage threshold, no calendar due', () => {
    const start = computeClockStart('2026-01-01T00:00:00Z');
    const due = computeRepairDue('A', start, { repairIntervalUnit: 'CYCLE', repairIntervalValue: 50 }, { hours: 1200, cycles: 800 });
    expect(due.usageDueThreshold).toBe(850);
    expect(due.repairDueDateUtc).toBeUndefined();
  });

  it('calendar deferral is expired once now >= repairDueDate', () => {
    const d = { repairIntervalUnit: 'CALENDAR_DAY' as const, repairDueDateUtc: '2026-02-05T00:00:00.000Z', usageDueThreshold: undefined };
    expect(isDeferralExpired(d, '2026-02-04T23:59:00Z', { hours: 0, cycles: 0 })).toBe(false);
    expect(isDeferralExpired(d, '2026-02-05T00:00:00Z', { hours: 0, cycles: 0 })).toBe(true);
  });

  it('usage deferral is expired once airframe usage >= threshold', () => {
    const d = { repairIntervalUnit: 'CYCLE' as const, repairDueDateUtc: undefined, usageDueThreshold: 850 };
    expect(isDeferralExpired(d, '2026-02-01T00:00:00Z', { hours: 0, cycles: 849 })).toBe(false);
    expect(isDeferralExpired(d, '2026-02-01T00:00:00Z', { hours: 0, cycles: 850 })).toBe(true);
  });
});
