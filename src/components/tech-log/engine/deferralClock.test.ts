import { describe, it, expect } from 'vitest';
import { readDeferralClock, URGENT_WINDOW_DAYS } from './deferralClock';

const HOUR = 3600000;
const DAY = 86400000;

// A Cat C deferral: clock starts midnight after discovery, 10 calendar days to repair.
const START = Date.parse('2026-07-01T04:00:00.000Z');
const DUE = START + 10 * DAY;

describe('readDeferralClock', () => {
  it('returns null for a usage-based deferral (no calendar due date)', () => {
    // Usage-based deferrals expire on a usage threshold, not a date — there is no
    // calendar interval to drain, so the display must degrade rather than invent one.
    expect(readDeferralClock(new Date(START).toISOString(), undefined, START, 'C')).toBeNull();
  });

  it('reads zero elapsed at the moment the clock starts', () => {
    const r = readDeferralClock(new Date(START).toISOString(), new Date(DUE).toISOString(), START, 'C')!;
    expect(r.fractionElapsed).toBe(0);
    expect(r.tone).toBe('NORMAL');
  });

  it('reads half elapsed at the midpoint', () => {
    const r = readDeferralClock(new Date(START).toISOString(), new Date(DUE).toISOString(), START + 5 * DAY, 'C')!;
    expect(r.fractionElapsed).toBeCloseTo(0.5, 5);
  });

  it('drains monotonically as now advances', () => {
    const at = (ms: number) =>
      readDeferralClock(new Date(START).toISOString(), new Date(DUE).toISOString(), ms, 'C')!.fractionElapsed;
    let prev = -1;
    for (let d = 0; d <= 10; d++) {
      const f = at(START + d * DAY);
      expect(f).toBeGreaterThanOrEqual(prev);
      prev = f;
    }
  });

  it('goes EXPIRED exactly at the due instant, not a tick later', () => {
    const r = readDeferralClock(new Date(START).toISOString(), new Date(DUE).toISOString(), DUE, 'C')!;
    expect(r.tone).toBe('EXPIRED');
    expect(r.label).toBe('overdue');
    expect(r.fractionElapsed).toBe(1);
  });

  it('clamps fractionElapsed to 1 past due — the ring never overfills', () => {
    const r = readDeferralClock(new Date(START).toISOString(), new Date(DUE).toISOString(), DUE + 30 * DAY, 'C')!;
    expect(r.fractionElapsed).toBe(1);
    expect(r.msRemaining).toBeLessThan(0);
  });

  it('clamps fractionElapsed to 0 before the clock starts', () => {
    // PL-25 excludes the day of discovery, so "now" can legitimately precede clock start.
    const r = readDeferralClock(new Date(START).toISOString(), new Date(DUE).toISOString(), START - 6 * HOUR, 'C')!;
    expect(r.fractionElapsed).toBe(0);
    expect(r.tone).toBe('NORMAL');
  });

  it('turns URGENT inside Cat C\'s final two days but is not yet expired', () => {
    const r = readDeferralClock(new Date(START).toISOString(), new Date(DUE).toISOString(), DUE - 36 * HOUR, 'C')!;
    expect(r.tone).toBe('URGENT');
    expect(r.msRemaining).toBeGreaterThan(0);
  });

  it('is still NORMAL just outside Cat C\'s two-day threshold', () => {
    const r = readDeferralClock(new Date(START).toISOString(), new Date(DUE).toISOString(), DUE - 49 * HOUR, 'C')!;
    expect(r.tone).toBe('NORMAL');
  });

  it('preserves the existing label format so the copy does not shift', () => {
    const label = (ms: number) =>
      readDeferralClock(new Date(START).toISOString(), new Date(DUE).toISOString(), ms, 'C')!.label;
    expect(label(DUE - (3 * DAY + 4 * HOUR))).toBe('3d 4h left');
    expect(label(DUE - 4 * HOUR)).toBe('4h left');
    expect(label(DUE + HOUR)).toBe('overdue');
  });

  it('survives malformed data where due precedes start, without dividing by a negative span', () => {
    const r = readDeferralClock(new Date(START).toISOString(), new Date(START - DAY).toISOString(), START, 'C')!;
    expect(Number.isFinite(r.fractionElapsed)).toBe(true);
    expect(r.fractionElapsed).toBe(1);
    expect(r.tone).toBe('EXPIRED');
  });

  it('survives a zero-length span without producing NaN', () => {
    const r = readDeferralClock(new Date(START).toISOString(), new Date(START).toISOString(), START, 'C')!;
    expect(Number.isFinite(r.fractionElapsed)).toBe(true);
    expect(r.tone).toBe('EXPIRED');
  });

  it('returns null for an unparseable date rather than rendering NaN', () => {
    expect(readDeferralClock('not-a-date', new Date(DUE).toISOString(), START, 'C')).toBeNull();
    expect(readDeferralClock(new Date(START).toISOString(), 'not-a-date', START, 'C')).toBeNull();
  });
});


describe('per-category urgency thresholds (Bryan, 2026-07-14)', () => {
  // Urgency is scaled to how much runway the interval actually gives you, rather than a
  // flat 2 days for every category. An absolute window made a Cat B (3-day) deferral read
  // amber for two-thirds of its life, where the ring told you nothing the chip didn't.
  const at = (cat: 'A' | 'B' | 'C' | 'D', spanDays: number, msLeft: number) => {
    const start = Date.parse('2026-07-01T04:00:00.000Z');
    const due = start + spanDays * DAY;
    return readDeferralClock(new Date(start).toISOString(), new Date(due).toISOString(), due - msLeft, cat)!;
  };

  it('exposes the agreed thresholds', () => {
    expect(URGENT_WINDOW_DAYS.B).toBe(1);
    expect(URGENT_WINDOW_DAYS.C).toBe(2);
    expect(URGENT_WINDOW_DAYS.D).toBe(7);
  });

  it('Cat B (3 days) is URGENT only inside the final day', () => {
    expect(at('B', 3, 20 * HOUR).tone).toBe('URGENT');
    expect(at('B', 3, 30 * HOUR).tone).toBe('NORMAL');
  });

  it('Cat B at 2 days left is NORMAL — the old absolute window called this URGENT', () => {
    expect(at('B', 3, 2 * DAY).tone).toBe('NORMAL');
  });

  it('Cat C (10 days) is URGENT inside the final two days', () => {
    expect(at('C', 10, 36 * HOUR).tone).toBe('URGENT');
    expect(at('C', 10, 3 * DAY).tone).toBe('NORMAL');
  });

  it('Cat D (120 days) is URGENT inside the final week — the old window waited until 2 days', () => {
    expect(at('D', 120, 5 * DAY).tone).toBe('URGENT');
    expect(at('D', 120, 9 * DAY).tone).toBe('NORMAL');
  });

  it('expiry still wins over any category threshold', () => {
    expect(at('B', 3, -1).tone).toBe('EXPIRED');
    expect(at('D', 120, -1).tone).toBe('EXPIRED');
  });

  it('Cat A has no calendar interval, so there is no ring to draw', () => {
    // Cat A is "per proviso" — CATEGORY_DAYS.A is null. Such a deferral carries no
    // repairDueDateUtc, so the reading is null regardless of threshold.
    const start = Date.parse('2026-07-01T04:00:00.000Z');
    expect(readDeferralClock(new Date(start).toISOString(), undefined, start, 'A')).toBeNull();
  });
});
