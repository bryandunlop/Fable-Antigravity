import { describe, expect, it } from 'vitest';
import { CAPACITY, seatsFor, bestSingleAircraftCapacity, aircraftNeeded, fitFor, profileLabel } from './capacity';

describe('the capacity table (Bryan, 2026-09-01)', () => {
  it('is 12 domestic on a big cabin and 10 on a standard one', () => {
    expect(seatsFor('big', 'domestic')).toBe(12);
    expect(seatsFor('standard', 'domestic')).toBe(10);
  });

  it('is identical on every aeroplane over an ocean, because the limit is beds not seats', () => {
    expect(CAPACITY.big['ocean-day']).toBe(CAPACITY.standard['ocean-day']);
    expect(CAPACITY.big['ocean-overnight']).toBe(CAPACITY.standard['ocean-overnight']);
    expect(seatsFor('big', 'ocean-overnight')).toBe(4);
  });

  it('the cabin only matters domestically', () => {
    expect(seatsFor('big', 'domestic')).toBeGreaterThan(seatsFor('standard', 'domestic'));
    expect(seatsFor('big', 'ocean-day')).toBe(seatsFor('standard', 'ocean-day'));
  });
});

describe('how many aeroplanes it takes', () => {
  it('four sleeping fit on one; five do not', () => {
    expect(aircraftNeeded(4, 'ocean-overnight')).toBe(1);
    expect(aircraftNeeded(5, 'ocean-overnight')).toBe(2);
  });

  it('twelve domestic fit on one big cabin', () => {
    expect(aircraftNeeded(12, 'domestic')).toBe(1);
    expect(aircraftNeeded(13, 'domestic')).toBe(2);
  });

  it('nobody at all needs no aeroplane', () => {
    expect(aircraftNeeded(0, 'domestic')).toBe(0);
  });

  it('more people than the fleet can carry is counted, not silently capped', () => {
    // 4 aircraft x 4 berths = 16 sleeping. Seventeen is a fifth aircraft-load.
    expect(aircraftNeeded(17, 'ocean-overnight')).toBe(5);
  });
});

describe('the six-people-sleeping trade', () => {
  const fit = fitFor(6, 'ocean-overnight');

  it('six sleeping does not fit any single aeroplane', () => {
    expect(fit.fitsOnOne).toBe(false);
    expect(fit.aircraftNeeded).toBe(2);
    expect(bestSingleAircraftCapacity('ocean-overnight')).toBe(4);
  });

  it('offers the real trade — eight in daylight on one, or six sleeping on two', () => {
    const lines = fit.alternatives.map(a => a.line);
    expect(lines.some(l => l.includes('daylight') && l.includes('one aircraft'))).toBe(true);
    expect(lines.some(l => l.includes('sleeping across 2 aircraft'))).toBe(true);
    expect(bestSingleAircraftCapacity('ocean-day')).toBe(8);
  });

  it('offers no trade when the thing already fits', () => {
    expect(fitFor(4, 'ocean-overnight').alternatives).toHaveLength(0);
    expect(fitFor(8, 'domestic').alternatives).toHaveLength(0);
  });

  it('never names a type or a tail to her', () => {
    const text = JSON.stringify(fit) + profileLabel('ocean-overnight');
    expect(text).not.toMatch(/G[56]\d0|G800|N\dPG/);
  });
});
