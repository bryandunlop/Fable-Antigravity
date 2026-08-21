import { describe, it, expect } from 'vitest';
import { formatRegulatoryInstant, formatRegulatoryCompact, formatRegulatoryDeadline, formatRegulatoryDeadlineShort } from './displayZone';

// D24 display layer: a stored UTC instant is the SAME absolute moment everywhere; only the lens
// changes. Default lens = the deferral's own governing zone (clean regulatory boundary), with
// UTC and device-Local toggles. The grounding decision never depends on this — it's display only.
const DUE = '2026-01-30T05:00:00.000Z'; // Cat B Eastern-governed: Jan 30 00:00 ET (EST)

describe('formatRegulatoryInstant (D24 display zone)', () => {
  it('GOVERNING mode renders the instant in the deferral governing zone (clean midnight)', () => {
    expect(formatRegulatoryInstant(DUE, 'GOVERNING', 'America/New_York')).toEqual({
      date: 'Jan 30, 2026', time: '00:00', zoneLabel: 'EST', differsFromGoverningDate: false,
    });
  });

  it('UTC mode renders the same instant in UTC', () => {
    expect(formatRegulatoryInstant(DUE, 'UTC', 'America/New_York')).toEqual({
      date: 'Jan 30, 2026', time: '05:00', zoneLabel: 'UTC', differsFromGoverningDate: false,
    });
  });

  it('LOCAL mode renders in the device zone and flags a different calendar day (west of Eastern)', () => {
    expect(formatRegulatoryInstant(DUE, 'LOCAL', 'America/New_York', 'America/Los_Angeles')).toEqual({
      date: 'Jan 29, 2026', time: '21:00', zoneLabel: 'PST', differsFromGoverningDate: true,
    });
  });

  it('LOCAL mode on a Central device also lands on the previous day for a midnight-ET boundary', () => {
    expect(formatRegulatoryInstant(DUE, 'LOCAL', 'America/New_York', 'America/Chicago')).toEqual({
      date: 'Jan 29, 2026', time: '23:00', zoneLabel: 'CST', differsFromGoverningDate: true,
    });
  });

  it('GOVERNING mode uses DST-correct zone label (EDT in summer)', () => {
    const summer = formatRegulatoryInstant('2026-07-20T04:00:00.000Z', 'GOVERNING', 'America/New_York');
    expect(summer).toEqual({ date: 'Jul 20, 2026', time: '00:00', zoneLabel: 'EDT', differsFromGoverningDate: false });
  });

  it('GOVERNING mode follows an overridden deferral zone, not a fixed Eastern reference', () => {
    // A deferral overridden to Central: its own boundary is Jan 30 00:00 CST = 2026-01-30T06:00Z.
    expect(formatRegulatoryInstant('2026-01-30T06:00:00.000Z', 'GOVERNING', 'America/Chicago')).toEqual({
      date: 'Jan 30, 2026', time: '00:00', zoneLabel: 'CST', differsFromGoverningDate: false,
    });
  });
});

describe('formatRegulatoryCompact (list-friendly)', () => {
  it('omits the time when it is midnight in the shown zone (the governing-mode common case)', () => {
    expect(formatRegulatoryCompact(DUE, 'GOVERNING', 'America/New_York')).toBe('Jan 30, 2026 EST');
  });
  it('includes the time when the shown zone is not at midnight', () => {
    expect(formatRegulatoryCompact(DUE, 'UTC', 'America/New_York')).toBe('Jan 30, 2026 · 05:00 UTC');
    expect(formatRegulatoryCompact(DUE, 'LOCAL', 'America/New_York', 'America/Los_Angeles')).toBe('Jan 29, 2026 · 21:00 PST');
  });
});

describe('formatRegulatoryDeadline (LG-195 — an END boundary must never read a day late)', () => {
  it('renders a midnight governing-zone boundary as the PREVIOUS day at 23:59 (PL-25 idiom)', () => {
    // Cat C discovered Aug 8 ET: clock starts Aug 9, expires at the stroke of Aug 19 00:00 EDT.
    // PL-25's own worked example prints "2359 on <the last day>" — never the bare next-day date.
    expect(formatRegulatoryDeadline('2026-08-19T04:00:00.000Z', 'GOVERNING', 'America/New_York'))
      .toBe('Aug 18, 2026 · 23:59 EDT');
  });

  it('matches the SME-ruled Feb-6 case: boundary Feb 6 00:00 EST renders as Feb 5 · 23:59 EST', () => {
    // tech-log-pl25-feb6: clock_start + interval = Feb 6 00:00 ET is the SAME instant as
    // "2359 on February 5" — the engine keeps Feb 6; only the display speaks Feb 5.
    expect(formatRegulatoryDeadline('2026-02-06T05:00:00.000Z', 'GOVERNING', 'America/New_York'))
      .toBe('Feb 5, 2026 · 23:59 EST');
  });

  it('keeps a non-midnight boundary exactly as it is (time shown, no shifting)', () => {
    expect(formatRegulatoryDeadline('2026-08-18T18:30:00.000Z', 'GOVERNING', 'America/New_York'))
      .toBe('Aug 18, 2026 · 14:30 EDT');
  });

  it('through the UTC lens a midnight-ET boundary is not midnight, so it passes through unshifted', () => {
    expect(formatRegulatoryDeadline('2026-08-19T04:00:00.000Z', 'UTC', 'America/New_York'))
      .toBe('Aug 19, 2026 · 04:00 UTC');
  });

  it('a boundary that IS midnight in the viewing lens shifts in that lens too (UTC-midnight case)', () => {
    expect(formatRegulatoryDeadline('2026-08-19T00:00:00.000Z', 'UTC', 'America/New_York'))
      .toBe('Aug 18, 2026 · 23:59 UTC');
  });

  it('stays DST-correct across fall-back: a midnight-EST boundary after the transition labels EST', () => {
    // Nov 1 2026 is the US fall-back; a boundary at Nov 3 00:00 EST = 05:00Z renders Nov 2 · 23:59 EST.
    expect(formatRegulatoryDeadline('2026-11-03T05:00:00.000Z', 'GOVERNING', 'America/New_York'))
      .toBe('Nov 2, 2026 · 23:59 EST');
  });

  it('honors an overridden governing zone (D24 per-deferral override), not a fixed Eastern anchor', () => {
    expect(formatRegulatoryDeadline('2026-01-30T06:00:00.000Z', 'GOVERNING', 'America/Chicago'))
      .toBe('Jan 29, 2026 · 23:59 CST');
  });
});


describe('formatRegulatoryDeadlineShort (tight surfaces — a TV lane label)', () => {
  it('keeps the LG-195 day-shift, drops only the year', () => {
    // Same instant as the full-form test above: Aug 19 00:00 EDT is Aug 18 · 23:59.
    expect(formatRegulatoryDeadlineShort('2026-08-19T04:00:00.000Z', 'GOVERNING', 'America/New_York'))
      .toBe('Aug 18 · 23:59 EDT');
  });

  it('never renders the raw next-day date — the whole point of the short form existing', () => {
    const out = formatRegulatoryDeadlineShort('2026-02-06T05:00:00.000Z', 'GOVERNING', 'America/New_York');
    expect(out).toBe('Feb 5 · 23:59 EST');
    expect(out).not.toContain('Feb 6');
  });

  it('keeps a non-midnight boundary as-is, minus the year', () => {
    expect(formatRegulatoryDeadlineShort('2026-08-19T18:30:00.000Z', 'GOVERNING', 'America/New_York'))
      .toBe('Aug 19 · 14:30 EDT');
  });
});
