import { describe, it, expect, afterEach } from 'vitest';
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
//
// THE ZONE PINNING BELOW IS THE POINT OF THIS SUITE, not incidental setup. The bug is
// invisible at UTC+0: `new Date('2024-11-01').toLocaleDateString()` returns 11/1/2024
// there, so every assertion here passes against the BROKEN implementation on a
// UTC runner — and CI is `ubuntu-latest` with no TZ set, i.e. UTC. A first draft of
// this file did exactly that: it caught the regression on an ET laptop and would have
// waved it through in CI, which is the only place that gates a merge. Verified by
// reverting formatDateOnly to the bare parse: 9/10 green under TZ=UTC, 5 failures
// under TZ=America/New_York. If you remove the pinning, this suite stops testing
// anything it claims to test.
describe('formatDateOnly (LG-117 — a calendar day is not an instant)', () => {
  const hostTz = process.env.TZ;
  // Two zones either side of Greenwich: west is where the bug bites, east proves the
  // fix isn't merely compensating in one direction.
  const runIn = (tz: string, fn: () => void) => () => {
    process.env.TZ = tz;
    try { fn(); } finally { process.env.TZ = hostTz; }
  };

  afterEach(() => { process.env.TZ = hostTz; });

  it('the pinning actually takes effect (guards the guard)', runIn('America/Los_Angeles', () => {
    // If Node ever stops honouring a runtime TZ change, every zone-sensitive assertion
    // below silently degrades to a host-zone test. Prove the shift is live first.
    expect(new Date('2024-11-01').toLocaleDateString('en-US')).toBe('10/31/2024');
  }));

  it('renders the given calendar day west of Greenwich', runIn('America/Los_Angeles', () => {
    expect(formatDateOnly('2024-11-01')).toBe('11/1/2024');
    expect(formatDateOnly('2025-01-15')).toBe('1/15/2025');
  }));

  it('renders the given calendar day east of Greenwich', runIn('Asia/Tokyo', () => {
    expect(formatDateOnly('2024-11-01')).toBe('11/1/2024');
    expect(formatDateOnly('2025-01-15')).toBe('1/15/2025');
  }));

  it('never lands on the previous day, any month, west of Greenwich', runIn('Pacific/Honolulu', () => {
    for (const month of ['01', '03', '06', '11', '12']) {
      for (const day of ['01', '09', '15', '28']) {
        const iso = `2024-${month}-${day}`;
        expect(`${iso} → ${formatDateOnly(iso)}`).toBe(
          `${iso} → ${Number(month)}/${Number(day)}/2024`,
        );
      }
    }
  }));

  it('holds across a DST transition', runIn('America/New_York', () => {
    expect(formatDateOnly('2024-03-10')).toBe('3/10/2024'); // spring forward
    expect(formatDateOnly('2024-11-03')).toBe('11/3/2024'); // fall back
  }));

  it('honours format options (the long form used in document identity lines)', runIn('America/Los_Angeles', () => {
    expect(
      formatDateOnly('2024-11-01', { month: 'short', day: 'numeric', year: 'numeric' }),
    ).toBe('Nov 1, 2024');
  }));

  it('formats years below 0100 rather than tripping the rollover guard', () => {
    // `new Date(99, 0, 1)` is 1999 under the legacy two-digit-year mapping, so without
    // an explicit setFullYear a valid date silently fell through to the raw string.
    expect(formatDateOnly('0099-01-01')).toBe('1/1/99');
    expect(formatDateOnly('0100-06-15')).toBe('6/15/100');
  });

  it('returns the raw value when it is not a date — never "Invalid Date"', () => {
    // A controlled publication showing "Invalid Date" as its effective date is worse
    // than showing the stored string: one is unreadable, the other is diagnosable.
    expect(formatDateOnly('')).toBe('');
    expect(formatDateOnly('not-a-date')).toBe('not-a-date');
    expect(formatDateOnly('2024-13-45')).toBe('2024-13-45');
  });
});
