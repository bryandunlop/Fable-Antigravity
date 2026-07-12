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

  it('N5PG GREEN (clean)', () => expect(colorOf('N5PG')).toBe('GREEN'));
  it('N2PG RED (fresh un-reported AOG — feeds the FIR §8 nudge)', () => expect(colorOf('N2PG')).toBe('RED'));
  it('N6PG AMBER (active deferral mid-clock)', () => expect(colorOf('N6PG')).toBe('AMBER'));
  it('N1PG RED (open airworthiness defect)', () => expect(colorOf('N1PG')).toBe('RED'));

  it('the seeded AMBER deferral is not expired and has a future due date', () => {
    const df = s.deferrals.find(d => d.id === 'df-n6pg')!;
    expect(df.status).toBe('ACTIVE');
    expect(new Date(df.repairDueDateUtc!).getTime()).toBeGreaterThan(Date.now());
  });
});
