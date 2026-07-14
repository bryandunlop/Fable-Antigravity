import { describe, it, expect } from 'vitest';
import { formatRegulatoryInstant, formatRegulatoryCompact } from './displayZone';

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
