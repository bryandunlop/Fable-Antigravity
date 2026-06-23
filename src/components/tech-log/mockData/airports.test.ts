import { describe, it, expect } from 'vitest';
import { airportInfo } from './airports';

describe('airportInfo', () => {
  it('returns the home base KLUK with the P&G fuel farm', () => {
    const a = airportInfo('KLUK')!;
    expect(a.name).toMatch(/lunken/i);
    expect(a.fbo).toMatch(/fuel farm/i);
  });
  it('marks KASE mountainous', () => {
    expect(airportInfo('KASE')!.mountainous).toBe(true);
  });
  it('returns undefined for an unknown ICAO', () => {
    expect(airportInfo('ZZZZ')).toBeUndefined();
  });
});
