import { describe, it, expect } from 'vitest';
import { OPERATOR_TIME_ZONE, operatorTodayIso, formatDateOnly } from './operatorDate';

// D24: the platform's operational calendar day is anchored to the operator
// reference zone (America/New_York), DST-aware — never the UTC date.
describe('operatorTodayIso (D24 operator reference zone)', () => {
  it('anchors to America/New_York', () => {
    expect(OPERATOR_TIME_ZONE).toBe('America/New_York');
  });

  it('late-evening ET stays on the operator day after UTC midnight (EDT, UTC-4)', () => {
    // 2026-07-11T02:00Z = 2026-07-10 22:00 EDT — UTC has rolled over, ET has not
    expect(operatorTodayIso(new Date('2026-07-11T02:00:00Z'))).toBe('2026-07-10');
  });

  it('summer day boundary is 04:00Z (EDT)', () => {
    expect(operatorTodayIso(new Date('2026-07-11T03:59:59Z'))).toBe('2026-07-10');
    expect(operatorTodayIso(new Date('2026-07-11T04:00:00Z'))).toBe('2026-07-11');
  });

  it('winter day boundary is 05:00Z (EST, UTC-5) — DST-aware', () => {
    expect(operatorTodayIso(new Date('2026-01-15T04:59:59Z'))).toBe('2026-01-14');
    expect(operatorTodayIso(new Date('2026-01-15T05:00:00Z'))).toBe('2026-01-15');
  });

  it('defaults to the current instant and returns YYYY-MM-DD', () => {
    expect(operatorTodayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// LG-117. A date-only field (effectiveDate, expirationDate, ackDueDate) names a
// CALENDAR DAY, not an instant. `new Date('2024-11-01')` parses it as UTC midnight
// per ECMA-262, so toLocaleDateString() renders Oct 31 anywhere west of Greenwich —
// the printed and on-screen copies of one controlled publication disagreed by a day.
describe('formatDateOnly (LG-117 — a calendar day is not an instant)', () => {
  it('renders the calendar day it was given, not a UTC-shifted one', () => {
    expect(formatDateOnly('2024-11-01')).toBe('11/1/2024');
    expect(formatDateOnly('2025-01-15')).toBe('1/15/2025');
  });

  it('never lands on the previous day, for any day of any month', () => {
    // The bug only bites west of Greenwich, so a single spot-check can pass on a
    // UTC/Europe CI box while shipping broken to an ET user. Assert the invariant
    // structurally instead: the rendered day-of-month must equal the input's.
    for (const month of ['01', '03', '06', '11', '12']) {
      for (const day of ['01', '09', '15', '28']) {
        const iso = `2024-${month}-${day}`;
        const [, m, d] = formatDateOnly(iso).match(/^(\d+)\/(\d+)\//)!;
        expect(`${iso} → ${formatDateOnly(iso)}`).toBe(
          `${iso} → ${Number(m)}/${Number(d)}/2024`,
        );
        expect(Number(d)).toBe(Number(day));
        expect(Number(m)).toBe(Number(month));
      }
    }
  });

  it('honours format options (the long form used in document identity lines)', () => {
    expect(
      formatDateOnly('2024-11-01', { month: 'short', day: 'numeric', year: 'numeric' }),
    ).toBe('Nov 1, 2024');
  });

  it('returns the raw value when it is not a date — never "Invalid Date"', () => {
    // A controlled publication showing "Invalid Date" as its effective date is worse
    // than showing the stored string: one is unreadable, the other is diagnosable.
    expect(formatDateOnly('')).toBe('');
    expect(formatDateOnly('not-a-date')).toBe('not-a-date');
    expect(formatDateOnly('2024-13-45')).toBe('2024-13-45');
  });
});
