import { describe, it, expect } from 'vitest';
import { getDefaultState } from './scenarios';
import { deriveServiceability } from '../engine/serviceability';

describe('seeded fleet derives the intended colors', () => {
  const s = getDefaultState();
  const now = new Date().toISOString();
  const colorOf = (tail: string) => {
    const ac = s.aircraft.find(a => a.tailNumber === tail)!;
    return deriveServiceability(ac.id, s, now).status;
  };

  // The demo fleet must show a RANGE (Bryan, 2026-08-21). It used to run three tails RED at once —
  // one flyable aeroplane out of six — because three separate feature demos each needed a grounded
  // aircraft. N2PG's chip-detector finding is now rectified and released, and the FIR §8 nudge it
  // used to feed moved to N1PG's downtime path (see fir/engine/suggestions.test.ts).
  it('N5PG GREEN (clean)', () => expect(colorOf('N5PG')).toBe('GREEN'));
  it('N2PG GREEN (chip detector borescoped and released)', () => expect(colorOf('N2PG')).toBe('GREEN'));
  it('N6PG AMBER (active deferral mid-clock)', () => expect(colorOf('N6PG')).toBe('AMBER'));
  it('N1PG RED (open airworthiness defect — the fleet AOG, and the FIR nudge tail)', () => expect(colorOf('N1PG')).toBe('RED'));

  /**
   * The guard that keeps the demo fleet readable. It went 3 RED because three feature demos each
   * needed a grounded aeroplane and there are only five active tails; without a guard the next one
   * grounds a fourth.
   *
   * Two are left, and each is the ONLY way its rule can be shown:
   *   N1PG — an open grounding defect, which the FIR §8 downtime nudge needs.
   *   N7PG — a deferral whose crew action is outstanding, which is D59's whole point: it is not
   *          ACTIVE, so the aeroplane is NOT dispatchable. Move that onto a non-grounding defect
   *          and the gate still renders but stops demonstrating its consequence.
   *
   * A new demo wanting a grounded tail takes one of these two or argues here.
   */
  it('no more than two tails are RED, and only the two that must be', () => {
    const reds = s.aircraft.filter(a => colorOf(a.tailNumber) === 'RED').map(a => a.tailNumber);
    expect(reds.sort()).toEqual(['N1PG', 'N7PG']);
  });

  it('most of the fleet is dispatchable — the range the demo is supposed to show', () => {
    const dispatchable = s.aircraft.filter(a => colorOf(a.tailNumber) !== 'RED');
    expect(dispatchable.length).toBeGreaterThanOrEqual(4);
  });

  it('the seeded AMBER deferral is not expired and has a future due date', () => {
    const df = s.deferrals.find(d => d.id === 'df-n6pg')!;
    expect(df.status).toBe('ACTIVE');
    expect(new Date(df.repairDueDateUtc!).getTime()).toBeGreaterThan(Date.now());
  });
});
