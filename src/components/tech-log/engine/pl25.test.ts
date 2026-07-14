import { describe, it, expect } from 'vitest';
import { computeClockStart, computeRepairDue, isDeferralExpired } from './pl25';

// D24: the PL-25 calendar-day clock is anchored to a real IANA zone (default America/New_York,
// per-deferral override), DST-aware. Boundaries are the UTC instant of the zone-local midnight.
// These fixtures assert the zone-anchored UTC instants (…T05:00Z in EST, …T04:00Z in EDT), NOT the
// old naive UTC-midnight (…T00:00Z). All values verified against @date-fns/tz (America/New_York).
const ET = 'America/New_York';

describe('PL-25 clock (D24 zone-anchored, DST-aware)', () => {
  it('clock starts at the next Eastern midnight after discovery (day of discovery excluded)', () => {
    // Jan 26 10:00Z = 05:00 EST -> next ET midnight = Jan 27 00:00 EST = 2026-01-27T05:00Z
    expect(computeClockStart('2026-01-26T10:00:00Z', ET)).toBe('2026-01-27T05:00:00.000Z');
  });

  it('defaults to Eastern when no zone is passed', () => {
    expect(computeClockStart('2026-01-26T10:00:00Z')).toBe('2026-01-27T05:00:00.000Z');
  });

  it('Cat C (10 day) discovered Jan 26 -> due Feb 6 00:00 ET (end of final dispatchable day)', () => {
    const start = computeClockStart('2026-01-26T10:00:00Z', ET);
    const due = computeRepairDue('C', start, { repairIntervalUnit: 'CALENDAR_DAY', repairIntervalValue: 10 }, { hours: 0, cycles: 0 }, ET);
    expect(due.repairDueDateUtc).toBe('2026-02-06T05:00:00.000Z');
    expect(due.usageDueThreshold).toBeUndefined();
  });

  it('Cat B (3 day) calendar due date, Eastern-anchored', () => {
    const start = computeClockStart('2026-03-01T08:00:00Z', ET); // -> Mar 2 00:00 ET
    const due = computeRepairDue('B', start, { repairIntervalUnit: 'CALENDAR_DAY', repairIntervalValue: 3 }, { hours: 0, cycles: 0 }, ET);
    expect(due.repairDueDateUtc).toBe('2026-03-05T05:00:00.000Z');
  });

  it('category fallback: Cat D with no explicit interval -> 120 days (window crosses DST -> EDT)', () => {
    const start = computeClockStart('2026-01-01T06:00:00Z', ET); // -> Jan 2 00:00 ET
    const due = computeRepairDue('D', start, {}, { hours: 0, cycles: 0 }, ET);
    // 120 days from Jan 2 lands in May, after the Mar 8 spring-forward -> EDT (-4) -> …T04:00Z
    expect(due.repairDueDateUtc).toBe('2026-05-02T04:00:00.000Z');
  });

  it('DST spring-forward: 10-day window crossing 2026-03-08 loses an hour of offset (the key D24 case)', () => {
    // Discovered Mar 5 12:00Z (EST) -> clock start Mar 6 00:00 EST = 2026-03-06T05:00Z
    const start = computeClockStart('2026-03-05T12:00:00Z', ET);
    expect(start).toBe('2026-03-06T05:00:00.000Z');
    const due = computeRepairDue('C', start, { repairIntervalUnit: 'CALENDAR_DAY', repairIntervalValue: 10 }, { hours: 0, cycles: 0 }, ET);
    // Due = Mar 16 00:00 EDT = 2026-03-16T04:00Z. The naive DAY_MS answer would be …T05:00Z.
    expect(due.repairDueDateUtc).toBe('2026-03-16T04:00:00.000Z');
    expect(due.repairDueDateUtc).not.toBe('2026-03-16T05:00:00.000Z');
  });

  it('per-deferral override to a different operating zone yields a different boundary (Chicago)', () => {
    const start = computeClockStart('2026-03-05T12:00:00Z', 'America/Chicago');
    expect(start).toBe('2026-03-06T06:00:00.000Z'); // Mar 6 00:00 CST = -6
    const due = computeRepairDue('C', start, { repairIntervalUnit: 'CALENDAR_DAY', repairIntervalValue: 10 }, { hours: 0, cycles: 0 }, 'America/Chicago');
    expect(due.repairDueDateUtc).toBe('2026-03-16T05:00:00.000Z'); // Mar 16 00:00 CDT = -5
  });

  it('is host-timezone independent: a non-US zone is actually applied (regression guard for zone fallback)', () => {
    // If the clock silently fell back to host-local time, Tokyo would equal Eastern. It must not.
    // Mar 6 00:00 JST (+9) = 2026-03-05T15:00Z.
    const tokyo = computeClockStart('2026-03-05T12:00:00Z', 'Asia/Tokyo');
    expect(tokyo).toBe('2026-03-05T15:00:00.000Z');
    expect(tokyo).not.toBe(computeClockStart('2026-03-05T12:00:00Z', ET));
  });

  it('override zone whose DST change is at 00:00 local: clock start resolves the nonexistent midnight forward to 01:00 local, day-count still correct (documented, not a bug)', () => {
    // America/Havana springs forward at 00:00 on 2026-03-08 — that local midnight does not exist.
    // "Next midnight" resolves forward to when the day actually begins (01:00 local = 2026-03-08T05:00Z).
    // This only happens for override zones with a midnight transition; America/New_York transitions at
    // 02:00 and is never affected. Crucially the repair interval is still an exact 3 calendar days.
    const start = computeClockStart('2026-03-07T12:00:00Z', 'America/Havana');
    expect(start).toBe('2026-03-08T05:00:00.000Z');
    const due = computeRepairDue('B', start, { repairIntervalUnit: 'CALENDAR_DAY', repairIntervalValue: 3 }, { hours: 0, cycles: 0 }, 'America/Havana');
    expect(due.repairDueDateUtc).toBe('2026-03-11T04:00:00.000Z'); // Mar 11 00:00 CDT — 3 full days
  });

  it('Cat A usage-based (CYCLE) computes a usage threshold, no calendar due', () => {
    const start = computeClockStart('2026-01-01T00:00:00Z', ET);
    const due = computeRepairDue('A', start, { repairIntervalUnit: 'CYCLE', repairIntervalValue: 50 }, { hours: 1200, cycles: 800 }, ET);
    expect(due.usageDueThreshold).toBe(850);
    expect(due.repairDueDateUtc).toBeUndefined();
  });

  it('calendar deferral is expired once now >= repairDueDate (UTC instant compare, zone-agnostic)', () => {
    const d = { repairIntervalUnit: 'CALENDAR_DAY' as const, repairDueDateUtc: '2026-02-06T05:00:00.000Z', usageDueThreshold: undefined };
    expect(isDeferralExpired(d, '2026-02-06T04:59:00Z', { hours: 0, cycles: 0 })).toBe(false);
    expect(isDeferralExpired(d, '2026-02-06T05:00:00Z', { hours: 0, cycles: 0 })).toBe(true);
  });

  it('usage deferral is expired once airframe usage >= threshold', () => {
    const d = { repairIntervalUnit: 'CYCLE' as const, repairDueDateUtc: undefined, usageDueThreshold: 850 };
    expect(isDeferralExpired(d, '2026-02-01T00:00:00Z', { hours: 0, cycles: 849 })).toBe(false);
    expect(isDeferralExpired(d, '2026-02-01T00:00:00Z', { hours: 0, cycles: 850 })).toBe(true);
  });
});
