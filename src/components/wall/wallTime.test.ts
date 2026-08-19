import { describe, it, expect } from 'vitest';
import { AXIS_END_MIN, AXIS_START_MIN, hhmmToMinutes, legBlockPct, pctOnAxis } from './wallTime';

describe('wall time axis (0600–2200 ET)', () => {
  it('parses HH:MM', () => {
    expect(hhmmToMinutes('06:00')).toBe(360);
    expect(hhmmToMinutes('16:30')).toBe(990);
  });

  it('positions on the axis as percent', () => {
    expect(pctOnAxis(AXIS_START_MIN)).toBe(0);
    expect(pctOnAxis(AXIS_END_MIN)).toBe(100);
    expect(pctOnAxis(hhmmToMinutes('10:00'))).toBeCloseTo(25);
  });

  it('clamps off-axis times', () => {
    expect(pctOnAxis(hhmmToMinutes('05:00'))).toBe(0);
    expect(pctOnAxis(hhmmToMinutes('23:00'))).toBe(100);
  });

  it('builds a leg block from dep to eta, clamped to the axis', () => {
    const b = legBlockPct('08:40', '10:55');
    expect(b.leftPct).toBeCloseTo(((520 - 360) / 960) * 100);
    expect(b.widthPct).toBeCloseTo(((655 - 520) / 960) * 100);
  });

  it('a leg ending past the axis clips at 100%', () => {
    const b = legBlockPct('20:00', '23:30');
    expect(b.leftPct + b.widthPct).toBeCloseTo(100);
  });
});
