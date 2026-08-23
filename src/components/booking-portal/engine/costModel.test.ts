import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SWEEP, GFO_COST_INPUTS, HOLDS_ABOVE_MULTIPLE,
  costPicture, holdingThreshold, idlePicture, sweepFixedShare,
} from './costModel';

describe('costPicture — the numbers Bryan can check by hand', () => {
  it('reproduces GFO at the stated inputs', () => {
    const p = costPicture();
    expect(p.budget).toBe(50_000_000);          // $10k x 2,500 h is half the budget
    expect(p.fixedCost).toBe(40_000_000);       // 80% of it
    expect(p.realCostPerHour).toBe(4_000);      // the other 20% over 2,500 h
    expect(p.ceilingPerHour).toBe(20_000);      // full allocable cost
    expect(p.deterrentMultiple).toBe(2.5);      // $10,000 charged for a $4,000 hour
    expect(p.ceilingUsed).toBe(0.5);
  });

  it('is charging below cost when little of the budget is fixed', () => {
    const p = costPicture({ ...GFO_COST_INPUTS, fixedShare: 0.4 });
    expect(p.realCostPerHour).toBe(12_000);
    expect(p.deterrentMultiple).toBeCloseTo(0.833, 3);
  });

  it('never lets the published rate exceed the ceiling it derives', () => {
    // Both come from the same budget, so ceilingUsed is chargebackShare by construction.
    for (const chargebackShare of [0.3, 0.5, 0.8, 1]) {
      expect(costPicture({ ...GFO_COST_INPUTS, chargebackShare }).ceilingUsed).toBeCloseTo(chargebackShare);
    }
  });
});

describe('idlePicture — an idle aircraft wastes money already spent', () => {
  it('charges nothing to idleness when the fleet flies its plan', () => {
    const i = idlePicture(2_500);
    expect(i.idleHours).toBe(0);
    expect(i.idleFixedCost).toBe(0);
    expect(i.costPerHourDelivered).toBe(20_000);
  });

  it('raises cost per hour delivered as the fleet sits, without flying getting dearer', () => {
    const full = idlePicture(2_500);
    const cut = idlePicture(1_900);
    expect(cut.idleHours).toBe(600);
    expect(cut.idleFixedCost).toBe(40_000_000 * (600 / 2_500));
    expect(cut.costPerHourDelivered).toBeGreaterThan(full.costPerHourDelivered);
  });

  it('does not divide by zero when nothing flies at all', () => {
    const none = idlePicture(0);
    expect(Number.isFinite(none.costPerHourDelivered)).toBe(true);
    expect(none.idleFixedCost).toBe(40_000_000);
  });

  it('never reports negative idle when the fleet beats its plan', () => {
    const over = idlePicture(3_000);
    expect(over.idleHours).toBe(0);
    expect(over.idleFixedCost).toBe(0);
  });
});

describe('sweepFixedShare — does the conclusion survive the guess being wrong?', () => {
  it('walks the multiple up as more of the budget is fixed', () => {
    const rows = sweepFixedShare();
    expect(rows).toHaveLength(DEFAULT_SWEEP.length);
    for (let i = 1; i < rows.length; i += 1) {
      expect(rows[i].deterrentMultiple).toBeGreaterThan(rows[i - 1].deterrentMultiple);
      expect(rows[i].realCostPerHour).toBeLessThan(rows[i - 1].realCostPerHour);
    }
  });

  it('finds the turn, not the bottom of the range', () => {
    // The bug this guards: taking the first row BELOW the threshold names 40%,
    // which is the floor of the sweep rather than the point the argument turns.
    const rows = sweepFixedShare();
    const t = holdingThreshold(rows)!;
    expect(t.fixedShare).toBe(0.7);
    expect(t.deterrentMultiple).toBeGreaterThanOrEqual(HOLDS_ABOVE_MULTIPLE);
    const below = rows[rows.indexOf(t) - 1];
    expect(below.argumentHolds).toBe(false);
  });

  it('reduces to chargebackShare / (1 - fixedShare), which is worth knowing', () => {
    // The budget cancels out, so the deterrent multiple does not depend on the rate
    // or the hours at all — only on how much of the budget is fixed and how much of
    // it the chargeback is asked to carry. Raising EITHER makes the rate a bigger
    // deterrent, which is not obvious from the page.
    for (const chargebackShare of [0.3, 0.5, 0.8, 1]) {
      for (const fixedShare of [0.5, 0.7, 0.8, 0.9]) {
        const p = costPicture({ ...GFO_COST_INPUTS, chargebackShare, fixedShare });
        expect(p.deterrentMultiple).toBeCloseTo(chargebackShare / (1 - fixedShare), 6);
      }
    }
  });

  it('holds nowhere in the plausible range when the chargeback carries little of the budget', () => {
    const rows = sweepFixedShare({ ...GFO_COST_INPUTS, chargebackShare: 0.1 }, [0.4, 0.5, 0.6, 0.7]);
    expect(rows.every((r) => !r.argumentHolds)).toBe(true);
    expect(holdingThreshold(rows)).toBeNull();
  });

  it('returns null rather than guessing when nothing in the sweep holds', () => {
    expect(holdingThreshold(sweepFixedShare(GFO_COST_INPUTS, [0.4, 0.5]))).toBeNull();
  });
});
