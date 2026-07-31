import { describe, it, expect } from 'vitest';
import { defectActionLayout } from './defectActions';

/**
 * LG-154 — six equal buttons per row, repeated down the list, was the densest repeated thing in the
 * module. These pin the reduction AND the deliberate limit on it: the software must not pick between
 * deferring and rectifying on the technician's behalf.
 */
describe('defectActionLayout (LG-154)', () => {
  const maintOpen = { status: 'OPEN' as const, isMaint: true, canCorrect: true };

  it('shows both real paths out of an open defect, and promotes neither over the other', () => {
    const { promoted } = defectActionLayout(maintOpen);
    expect(promoted).toEqual(['defer', 'rectify']);
  });

  it('never promotes more than two actions', () => {
    for (const status of ['OPEN', 'WATCHLISTED', 'RECTIFIED', 'DEFERRED'] as const) {
      for (const isMaint of [true, false]) {
        for (const canCorrect of [true, false]) {
          const { promoted } = defectActionLayout({ status, isMaint, canCorrect });
          expect(promoted.length).toBeLessThanOrEqual(2);
        }
      }
    }
  });

  it('demotes the four that are not the decision', () => {
    const { overflow } = defectActionLayout(maintOpen);
    expect(overflow).toEqual(['correct', 'quickCrs', 'watch', 'fir']);
  });

  it('drops Correct entirely when the user is not authorised to supersede', () => {
    const { promoted, overflow } = defectActionLayout({ ...maintOpen, canCorrect: false });
    expect([...promoted, ...overflow]).not.toContain('correct');
  });

  it('gives a pilot only what a pilot may do', () => {
    const { promoted, overflow } = defectActionLayout({ status: 'OPEN', isMaint: false, canCorrect: false });
    expect(promoted).toEqual([]);
    expect(overflow).toEqual(['fir']);
    // A pilot must never be offered a disposition — pilots cannot self-clear.
    expect(overflow).not.toContain('rectify');
    expect(overflow).not.toContain('defer');
    expect(overflow).not.toContain('quickCrs');
  });

  it('switches the promoted pair once a defect is watchlisted', () => {
    const { promoted, overflow } = defectActionLayout({
      status: 'WATCHLISTED', isMaint: true, canCorrect: true,
    });
    expect(promoted).toEqual(['rectify', 'escalate']);
    expect(overflow).toEqual(['fir']);
  });

  it('never lists an action in both places', () => {
    for (const status of ['OPEN', 'WATCHLISTED'] as const) {
      const { promoted, overflow } = defectActionLayout({ status, isMaint: true, canCorrect: true });
      expect(promoted.filter(id => overflow.includes(id))).toEqual([]);
    }
  });

  it('keeps a stable overflow order so a menu does not reshuffle under the cursor', () => {
    const a = defectActionLayout(maintOpen).overflow;
    const b = defectActionLayout({ ...maintOpen }).overflow;
    expect(a).toEqual(b);
    expect(a.indexOf('correct')).toBeLessThan(a.indexOf('fir'));
  });
});
