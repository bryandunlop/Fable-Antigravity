import { describe, it, expect } from 'vitest';
import { isRiskAssessed, riskScore, UNASSESSED } from './riskAssessment';

// The GFO Risk Assessment Matrix (HazardWorkflow.tsx) is additive:
// likelihood 0..4 ("0 Rarely" .. "4 Almost Always") + severity 1..5.
// Note likelihood legitimately starts at ZERO — that is the bug these tests pin.

describe('isRiskAssessed', () => {
  it('is false before anyone has answered', () => {
    expect(isRiskAssessed(UNASSESSED, UNASSESSED)).toBe(false);
  });

  it('is false when only one axis has been answered', () => {
    expect(isRiskAssessed(3, UNASSESSED)).toBe(false);
    expect(isRiskAssessed(UNASSESSED, 3)).toBe(false);
  });

  it('is TRUE for a likelihood of zero — "Rarely" is a real answer, not a blank', () => {
    // The original bug: `!riskLikelihood` treated the correct answer "0 Rarely" as
    // "not yet assessed", permanently blocking stage advance.
    expect(isRiskAssessed(4, 0)).toBe(true);
    expect(isRiskAssessed(1, 0)).toBe(true);
  });

  it('is true once both axes are answered', () => {
    expect(isRiskAssessed(1, 1)).toBe(true);
    expect(isRiskAssessed(5, 4)).toBe(true);
  });

  it('never reports assessed purely because a default sum is positive', () => {
    // The original bug: defaults of 3 and 3 made the sentinel `sum > 0` true at mount,
    // rendering a green tick and "Score: 6" — which the legend calls High
    // (Undesirable) — on a hazard nobody had touched.
    expect(isRiskAssessed(UNASSESSED, UNASSESSED)).toBe(false);
    expect(riskScore(UNASSESSED, UNASSESSED)).toBeNull();
  });
});

describe('riskScore', () => {
  it('returns null until both axes are answered, so no score can be displayed', () => {
    expect(riskScore(UNASSESSED, UNASSESSED)).toBeNull();
    expect(riskScore(3, UNASSESSED)).toBeNull();
    expect(riskScore(UNASSESSED, 0)).toBeNull();
  });

  it('sums severity and likelihood once both are answered', () => {
    expect(riskScore(3, 3)).toBe(6);
    expect(riskScore(5, 4)).toBe(9);
    expect(riskScore(1, 0)).toBe(1);
  });

  it('returns a real score of zero-likelihood cases rather than swallowing them', () => {
    expect(riskScore(4, 0)).toBe(4);
  });

  it('spans the full documented range 1..9', () => {
    expect(riskScore(1, 0)).toBe(1);
    expect(riskScore(5, 4)).toBe(9);
  });
});
