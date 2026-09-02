import { describe, expect, it } from 'vitest';
import { createDraft, newLeg, submitItinerary, type Actor } from './trip';
import { principalAwayDates, principalReserveInput, tripDays, candidateTails } from './principal';

const EA: Actor = { name: 'Dana Whitfield', role: 'ea' };
function trip(names: string[], d1: string, d2: string, submit = true) {
  let t = createDraft({ title: 't', leadPassengerId: 'P', leadPassengerName: names[0], by: EA, nowUtc: '2026-09-01T00:00:00.000Z',
    legs: [newLeg({ from: { placeName: 'a', placeId: null, airport: 'KLUK' }, to: { placeName: 'b', placeId: null, airport: 'KTEB' }, date: d1 }), newLeg({ from: { placeName: 'b', placeId: null, airport: 'KTEB' }, to: { placeName: 'a', placeId: null, airport: 'KLUK' }, date: d2 })] });
  t = { ...t, passengerNames: names };
  return submit ? submitItinerary(t, EA, '2026-09-01T00:00:00.000Z') : t;
}

describe('the principal reserve input', () => {
  it('a live trip carrying the principal marks every day from first to last leg as away', () => {
    expect(tripDays(trip(['A. Reyes'], '2026-10-06', '2026-10-08'))).toEqual(['2026-10-06', '2026-10-07', '2026-10-08']);
  });
  it('a draft is not travel; someone else’s trip is not the principal’s', () => {
    expect(tripDays(trip(['A. Reyes'], '2026-10-06', '2026-10-08', false))).toEqual([]);
    expect(principalAwayDates([trip(['M. Osei'], '2026-10-06', '2026-10-08')], 'A. Reyes')).toEqual([]);
    expect(principalAwayDates([trip(['M. Osei', 'A. Reyes'], '2026-10-06', '2026-10-06')], 'A. Reyes')).toEqual(['2026-10-06']);
  });
  it('big cabin means the two G650ERs, in register order; disabled means no reserve at all', () => {
    expect(candidateTails('big')).toEqual(['N1PG', 'N2PG']);
    expect(candidateTails('any')).toHaveLength(4);
    expect(principalReserveInput([], { enabled: false, name: 'A. Reyes', cabin: 'big' })).toBeUndefined();
    expect(principalReserveInput([trip(['A. Reyes'], '2026-10-06', '2026-10-06')], { enabled: true, name: 'A. Reyes', cabin: 'big' })).toEqual({ name: 'A. Reyes', candidateTails: ['N1PG', 'N2PG'], awayDates: ['2026-10-06'] });
  });
});
