import { describe, it, expect } from 'vitest';
import { readDeferralClock } from './deferralClock';

const HOUR = 3600000;
const DAY = 86400000;

// A Cat C deferral: clock starts midnight after discovery, 10 calendar days to repair.
const START = Date.parse('2026-07-01T04:00:00.000Z');
const DUE = START + 10 * DAY;

describe('readDeferralClock', () => {
  it('returns null for a usage-based deferral (no calendar due date)', () => {
    // Usage-based deferrals expire on a usage threshold, not a date — there is no
    // calendar interval to drain, so the display must degrade rather than invent one.
    expect(readDeferralClock(new Date(START).toISOString(), undefined, START)).toBeNull();
  });

  it('reads zero elapsed at the moment the clock starts', () => {
    const r = readDeferralClock(new Date(START).toISOString(), new Date(DUE).toISOString(), START)!;
    expect(r.fractionElapsed).toBe(0);
    expect(r.tone).toBe('NORMAL');
  });

  it('reads half elapsed at the midpoint', () => {
    const r = readDeferralClock(new Date(START).toISOString(), new Date(DUE).toISOString(), START + 5 * DAY)!;
    expect(r.fractionElapsed).toBeCloseTo(0.5, 5);
  });

  it('drains monotonically as now advances', () => {
    const at = (ms: number) =>
      readDeferralClock(new Date(START).toISOString(), new Date(DUE).toISOString(), ms)!.fractionElapsed;
    let prev = -1;
    for (let d = 0; d <= 10; d++) {
      const f = at(START + d * DAY);
      expect(f).toBeGreaterThanOrEqual(prev);
      prev = f;
    }
  });

  it('goes EXPIRED exactly at the due instant, not a tick later', () => {
    const r = readDeferralClock(new Date(START).toISOString(), new Date(DUE).toISOString(), DUE)!;
    expect(r.tone).toBe('EXPIRED');
    expect(r.label).toBe('overdue');
    expect(r.fractionElapsed).toBe(1);
  });

  it('clamps fractionElapsed to 1 past due — the ring never overfills', () => {
    const r = readDeferralClock(new Date(START).toISOString(), new Date(DUE).toISOString(), DUE + 30 * DAY)!;
    expect(r.fractionElapsed).toBe(1);
    expect(r.msRemaining).toBeLessThan(0);
  });

  it('clamps fractionElapsed to 0 before the clock starts', () => {
    // PL-25 excludes the day of discovery, so "now" can legitimately precede clock start.
    const r = readDeferralClock(new Date(START).toISOString(), new Date(DUE).toISOString(), START - 6 * HOUR)!;
    expect(r.fractionElapsed).toBe(0);
    expect(r.tone).toBe('NORMAL');
  });

  it('turns URGENT inside the final two days but is not yet expired', () => {
    const r = readDeferralClock(new Date(START).toISOString(), new Date(DUE).toISOString(), DUE - 36 * HOUR)!;
    expect(r.tone).toBe('URGENT');
    expect(r.msRemaining).toBeGreaterThan(0);
  });

  it('is still NORMAL just outside the two-day threshold', () => {
    const r = readDeferralClock(new Date(START).toISOString(), new Date(DUE).toISOString(), DUE - 49 * HOUR)!;
    expect(r.tone).toBe('NORMAL');
  });

  it('preserves the existing label format so the copy does not shift', () => {
    const label = (ms: number) =>
      readDeferralClock(new Date(START).toISOString(), new Date(DUE).toISOString(), ms)!.label;
    expect(label(DUE - (3 * DAY + 4 * HOUR))).toBe('3d 4h left');
    expect(label(DUE - 4 * HOUR)).toBe('4h left');
    expect(label(DUE + HOUR)).toBe('overdue');
  });

  it('survives malformed data where due precedes start, without dividing by a negative span', () => {
    const r = readDeferralClock(new Date(START).toISOString(), new Date(START - DAY).toISOString(), START)!;
    expect(Number.isFinite(r.fractionElapsed)).toBe(true);
    expect(r.fractionElapsed).toBe(1);
    expect(r.tone).toBe('EXPIRED');
  });

  it('survives a zero-length span without producing NaN', () => {
    const r = readDeferralClock(new Date(START).toISOString(), new Date(START).toISOString(), START)!;
    expect(Number.isFinite(r.fractionElapsed)).toBe(true);
    expect(r.tone).toBe('EXPIRED');
  });

  it('returns null for an unparseable date rather than rendering NaN', () => {
    expect(readDeferralClock('not-a-date', new Date(DUE).toISOString(), START)).toBeNull();
    expect(readDeferralClock(new Date(START).toISOString(), 'not-a-date', START)).toBeNull();
  });
});
