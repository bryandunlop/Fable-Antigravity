import { describe, it, expect } from 'vitest';
import { OPERATOR_TIME_ZONE, operatorTodayIso } from './operatorDate';

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
