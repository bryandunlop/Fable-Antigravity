import { describe, it, expect } from 'vitest';
import { matchAirport, expandEndpoints } from './airports';
import type { AirportMatch } from './types';

describe('matchAirport', () => {
  it('exact match is case-insensitive', () => {
    expect(matchAirport('KBOS', { kind: 'exact', icao: 'KBOS' })).toBe(true);
    expect(matchAirport('kbos', { kind: 'exact', icao: 'KBOS' })).toBe(true);
    expect(matchAirport('KJFK', { kind: 'exact', icao: 'KBOS' })).toBe(false);
  });

  it('prefix with except: K airports except KLUK', () => {
    const m: AirportMatch = { kind: 'prefix', prefix: 'K', except: ['KLUK'] };
    expect(matchAirport('KTEB', m)).toBe(true);
    expect(matchAirport('KBOS', m)).toBe(true);
    expect(matchAirport('KLUK', m)).toBe(false);
    expect(matchAirport('EGLL', m)).toBe(false);
  });
});

describe('expandEndpoints', () => {
  it('both -> [departure, arrival]; single -> itself', () => {
    expect(expandEndpoints('both')).toEqual(['departure', 'arrival']);
    expect(expandEndpoints('arrival')).toEqual(['arrival']);
    expect(expandEndpoints('departure')).toEqual(['departure']);
  });
});
