import { describe, it, expect } from 'vitest';
import { getDefaultState } from '../mockData/scenarios';
import { currentRows } from './supersede';
import { defectsByAta, dispatchReliability, deferralAging, aogStats, mtbur } from './analytics';

describe('analytics engine (seeded world)', () => {
  const s = getDefaultState();
  const now = new Date().toISOString();

  it('defectsByAta sums to the number of current defect chains and is sorted desc', () => {
    const rows = defectsByAta(s);
    const total = rows.reduce((a, r) => a + r.count, 0);
    expect(total).toBe(currentRows(s.defects).length);
    for (let i = 1; i < rows.length; i++) expect(rows[i - 1].count).toBeGreaterThanOrEqual(rows[i].count);
  });

  it('dispatchReliability is a percentage with at least one technical delay seeded', () => {
    const r = dispatchReliability(s);
    expect(r.total).toBe(currentRows(s.flightLogs).length);
    expect(r.reliabilityPct).toBeGreaterThanOrEqual(0);
    expect(r.reliabilityPct).toBeLessThanOrEqual(100);
    expect(r.techDelayed).toBeGreaterThanOrEqual(1);
  });

  it('deferralAging buckets cover every open deferral', () => {
    const buckets = deferralAging(s, now);
    const total = buckets.reduce((a, b) => a + b.count, 0);
    expect(total).toBe(currentRows(s.deferrals).filter(d => d.status !== 'CLEARED').length);
  });

  it('aogStats counts at least the seeded grounded aircraft and flags ongoing', () => {
    const r = aogStats(s, now);
    expect(r.events).toBeGreaterThanOrEqual(1);
    expect(r.ongoing).toBeGreaterThanOrEqual(1);
  });

  it('mtbur derives from the seeded unscheduled removal', () => {
    const r = mtbur(s);
    expect(r.removals).toBeGreaterThanOrEqual(1);
    expect(r.fleetHours).toBeGreaterThan(0);
    expect(r.mtburOverall).toBeGreaterThan(0);
  });
});
