import { describe, it, expect } from 'vitest';
import { computeDueAtUtc } from './dueDates';
import type { DueContext } from './types';

// EDT: local = UTC-4h => offset -240 min. All "local" times below are office-local (Eastern).
const ctx = (over: Partial<DueContext> = {}): DueContext => ({
  nowUtc: '2026-06-30T12:00:00.000Z', // Tue 2026-06-30, 08:00 EDT
  officeTzOffsetMinutes: -240,
  ...over,
});

describe('computeDueAtUtc §7', () => {
  it('dayOfTimeLocal: 15:00 office-local on the reference local date -> UTC', () => {
    // 15:00 EDT on 2026-06-30 == 19:00 UTC
    const r = computeDueAtUtc({ kind: 'dayOfTimeLocal', time: '15:00' }, ctx());
    expect(r).toBe('2026-06-30T19:00:00.000Z');
  });

  it('weekday MON of the reference week at 09:00 local', () => {
    // Reference week containing Tue 2026-06-30 -> Monday is 2026-06-29; 09:00 EDT == 13:00 UTC
    const r = computeDueAtUtc({ kind: 'weekday', day: 'MON' }, ctx());
    expect(r).toBe('2026-06-29T13:00:00.000Z');
  });

  it('weekday FRI PM -> 17:00 local', () => {
    // Friday of the ref week is 2026-07-03; 17:00 EDT == 21:00 UTC
    const r = computeDueAtUtc({ kind: 'weekday', day: 'FRI', period: 'PM' }, ctx());
    expect(r).toBe('2026-07-03T21:00:00.000Z');
  });

  it('dayOfMonth before the 15th -> 17:00 local on the 15th of the ref month', () => {
    const r = computeDueAtUtc({ kind: 'dayOfMonth', day: 15, when: 'before' }, ctx());
    expect(r).toBe('2026-06-15T21:00:00.000Z');
  });

  it('quarterWeek 1 -> first day of ref quarter at 17:00 local', () => {
    // 2026-06-30 is in Q2 (Apr-Jun); quarter start 2026-04-01; 17:00 EDT == 21:00 UTC
    const r = computeDueAtUtc({ kind: 'quarterWeek', week: 1 }, ctx());
    expect(r).toBe('2026-04-01T21:00:00.000Z');
  });

  it('annualDate Mar 31 -> 17:00 local of the ref year', () => {
    // Mar 31 is EDT (DST) but offset is caller-supplied; with -240 => 21:00 UTC
    const r = computeDueAtUtc({ kind: 'annualDate', month: 3, day: 31 }, ctx());
    expect(r).toBe('2026-03-31T21:00:00.000Z');
  });

  it('hoursBeforeEtd 24 -> pure UTC subtraction from ETD', () => {
    const r = computeDueAtUtc(
      { kind: 'hoursBeforeEtd', hours: 24 },
      ctx({ etdUtc: '2026-07-10T14:00:00.000Z' }),
    );
    expect(r).toBe('2026-07-09T14:00:00.000Z');
  });

  it('businessDaysBeforeEtd 1: weekday ETD -> previous weekday at 12:00 local', () => {
    // ETD Wed 2026-07-08; 1 business day before = Tue 2026-07-07; 12:00 EDT == 16:00 UTC
    const r = computeDueAtUtc(
      { kind: 'businessDaysBeforeEtd', days: 1 },
      ctx({ etdUtc: '2026-07-08T14:00:00.000Z' }),
    );
    expect(r).toBe('2026-07-07T16:00:00.000Z');
  });

  it('businessDaysBeforeEtd 1: Sunday ETD naturally lands on Friday (weekends skipped)', () => {
    // ETD Sun 2026-07-12; stepping back 1 business day skips Sat 07-11 -> Fri 2026-07-10, 12:00 local
    const r = computeDueAtUtc(
      { kind: 'businessDaysBeforeEtd', days: 1 },
      ctx({ etdUtc: '2026-07-12T14:00:00.000Z' }),
    );
    expect(r).toBe('2026-07-10T16:00:00.000Z');
  });

  it('monthsBeforeEtd 1 -> ETD minus one month at 12:00 local', () => {
    // ETD 2026-08-10 -> 2026-07-10, 12:00 EDT == 16:00 UTC
    const r = computeDueAtUtc(
      { kind: 'monthsBeforeEtd', months: 1 },
      ctx({ etdUtc: '2026-08-10T14:00:00.000Z' }),
    );
    expect(r).toBe('2026-07-10T16:00:00.000Z');
  });

  it('throws if an ETD-relative rule is given no etdUtc', () => {
    expect(() => computeDueAtUtc({ kind: 'hoursBeforeEtd', hours: 24 }, ctx())).toThrow(/etdUtc/);
  });

  it('throws on an unknown dueRule kind (deserialized/invalid input)', () => {
    expect(() => computeDueAtUtc({ kind: 'bogus' } as any, ctx())).toThrow(/Unknown/i);
  });

  it('monthsBeforeEtd 1 across a year boundary: Jan ETD -> prior December', () => {
    // ETD 2026-01-10; minus 1 month -> 2025-12-10, 12:00 EDT-offset (-240) == 16:00 UTC
    const r = computeDueAtUtc({ kind: 'monthsBeforeEtd', months: 1 }, ctx({ etdUtc: '2026-01-10T14:00:00.000Z' }));
    expect(r).toBe('2025-12-10T16:00:00.000Z');
  });

  it('businessDaysBeforeEtd 6 spans two weekends', () => {
    // ETD Wed 2026-07-15; 6 business days back skips 07-11/12 & 07-04/05 weekends -> Tue 2026-07-07
    const r = computeDueAtUtc({ kind: 'businessDaysBeforeEtd', days: 6 }, ctx({ etdUtc: '2026-07-15T14:00:00.000Z' }));
    expect(r).toBe('2026-07-07T16:00:00.000Z');
  });

  it('monthsBeforeEtd 1 from a 31st rolls forward through a short month (documents Date.UTC day-overflow)', () => {
    // ETD 2026-03-31; Date.UTC(2026, Feb, 31) normalizes Feb-31 -> Mar 3 (2026 is not a leap year)
    const r = computeDueAtUtc({ kind: 'monthsBeforeEtd', months: 1 }, ctx({ etdUtc: '2026-03-31T14:00:00.000Z' }));
    expect(r).toBe('2026-03-03T16:00:00.000Z');
  });
});
