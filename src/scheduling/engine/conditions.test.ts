import { describe, it, expect } from 'vitest';
import { evaluateCondition } from './conditions';
import type { Condition, TripContext } from './types';

const trip = (over: Partial<TripContext> = {}): TripContext => ({
  tripId: 't1', tripType: 'domestic', tail: 'N1PG', aircraftType: 'G650ER',
  etdUtc: '2026-07-10T14:00:00.000Z', maxPaxCount: 4, isWeekendDeparture: false,
  routeIcaos: [], ...over,
});

describe('evaluateCondition §7', () => {
  it('always is true', () => {
    expect(evaluateCondition({ kind: 'always' }, trip())).toBe(true);
  });
  it('tripType matches', () => {
    expect(evaluateCondition({ kind: 'tripType', equals: 'international' }, trip({ tripType: 'international' }))).toBe(true);
    expect(evaluateCondition({ kind: 'tripType', equals: 'international' }, trip())).toBe(false);
  });
  it('paxCountAtLeast', () => {
    expect(evaluateCondition({ kind: 'paxCountAtLeast', value: 7 }, trip({ maxPaxCount: 7 }))).toBe(true);
    expect(evaluateCondition({ kind: 'paxCountAtLeast', value: 7 }, trip({ maxPaxCount: 6 }))).toBe(false);
  });
  it('allOf: 7-pax G650 focus item', () => {
    const c: Condition = { kind: 'allOf', conditions: [
      { kind: 'paxCountAtLeast', value: 7 },
      { kind: 'aircraftTypeEquals', value: 'G650ER' },
    ]};
    expect(evaluateCondition(c, trip({ maxPaxCount: 7 }))).toBe(true);
    expect(evaluateCondition(c, trip({ maxPaxCount: 7, aircraftType: 'G500' }))).toBe(false);
  });
  it('anyOf and not', () => {
    expect(evaluateCondition({ kind: 'anyOf', conditions: [
      { kind: 'tripType', equals: 'dca_dassp' }, { kind: 'isWeekendDeparture' },
    ]}, trip({ isWeekendDeparture: true }))).toBe(true);
    expect(evaluateCondition({ kind: 'not', condition: { kind: 'isWeekendDeparture' } }, trip())).toBe(true);
  });

  it('routeTouchesCountry matches when any route ICAO maps to the given country', () => {
    expect(evaluateCondition({ kind: 'routeTouchesCountry', country: 'CN' }, trip({ routeIcaos: ['ZBAA', 'KLUK'] }))).toBe(true);
    expect(evaluateCondition({ kind: 'routeTouchesCountry', country: 'CN' }, trip({ routeIcaos: ['KLUK', 'KASE'] }))).toBe(false);
  });

  it('routeTouchesIcaoPrefix matches when any route ICAO starts with the given prefix', () => {
    expect(evaluateCondition({ kind: 'routeTouchesIcaoPrefix', prefix: 'EG' }, trip({ routeIcaos: ['EGLL'] }))).toBe(true);
    expect(evaluateCondition({ kind: 'routeTouchesIcaoPrefix', prefix: 'EG' }, trip({ routeIcaos: ['KLUK'] }))).toBe(false);
  });

  it('throws on an unknown condition kind (deserialized/invalid input)', () => {
    expect(() => evaluateCondition({ kind: 'bogus' } as any, trip())).toThrow(/Unknown/i);
  });
});
