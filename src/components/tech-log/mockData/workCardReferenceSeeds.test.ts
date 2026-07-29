import { describe, it, expect } from 'vitest';
import { getDefaultState } from './scenarios';

/**
 * LG-98/99/108 seed guard.
 *
 * Rendering tests use their own fixtures, so they stay green even if the seeds lose these fields —
 * and then the feature is invisible on a fresh load with nothing failing to say so. That is exactly
 * the trap the D57 slice hit: its FIR fast path depended on one seeded `casColor: 'RED'` and needed a
 * mutation check to prove the assertion was load-bearing. Same discipline here.
 *
 * These assertions are deliberately about the *demo being demonstrable*, not about the shape of the
 * type. They pin two things a refactor could plausibly break without noticing:
 *   1. both the read-only (COMPLETED, prints on a CRS) and the editable (IN_WORK) paths are seeded,
 *      because those are different code paths and only one of them reaches the print;
 *   2. the pilot intake hint actually points at a card that holds a list — the whole point of
 *      `Defect.cmcFaultCode` being singular and `WorkCard.cmcFaultCodes` being plural.
 */
describe('work card AMM/CMC seeds (LG-98/99)', () => {
  const state = getDefaultState(Date.parse('2026-07-29T12:00:00.000Z'));

  it('seeds a COMPLETED card carrying both references, so they land on a printed CRS', () => {
    const wc1 = state.workCards.find(c => c.id === 'wc-1');
    expect(wc1).toBeDefined();
    expect(wc1!.status).toBe('COMPLETED');
    // A release is what makes this card reach the CRS print path at all.
    expect(wc1!.completedReleaseId).toBeTruthy();
    expect(wc1!.ammReference).toBe('AMM 21-50-00');
    expect(wc1!.cmcFaultCodes).toEqual(['21-51-03']);
  });

  it('seeds a live card carrying both references, so the editable path is reachable on load', () => {
    const wc3 = state.workCards.find(c => c.id === 'wc-3');
    expect(wc3).toBeDefined();
    expect(wc3!.status).not.toBe('COMPLETED');
    expect(wc3!.ammReference).toBe('AMM 32-30-00');
    // More than one, on purpose: one squawk interrogates into several codes.
    expect(wc3!.cmcFaultCodes!.length).toBeGreaterThan(1);
  });

  it("seeds the pilot's single intake code on the defect the live card is fixing", () => {
    const wc3 = state.workCards.find(c => c.id === 'wc-3')!;
    const defect = state.defects.find(d => d.id === wc3.linkedDefectId);
    expect(defect).toBeDefined();
    expect(defect!.cmcFaultCode).toBe('32-31-14');
    // The hint is only a hint if maintenance's list is a superset it can be added to.
    expect(wc3.cmcFaultCodes).toContain(defect!.cmcFaultCode);
  });
});

describe("pilot narrative seeds (LG-108)", () => {
  const state = getDefaultState(Date.parse('2026-07-29T12:00:00.000Z'));

  it('seeds a symptom on a defect that has a work card, so the header renders it on load', () => {
    const carded = state.workCards.filter(c => c.linkedDefectId);
    expect(carded.length).toBeGreaterThan(0);
    const withNarrative = carded.filter(c => {
      const d = state.defects.find(x => x.id === c.linkedDefectId);
      return Boolean(d?.symptom?.trim());
    });
    expect(withNarrative.length).toBeGreaterThan(0);
  });
});
