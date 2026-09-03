import { describe, expect, it } from 'vitest';
import { createDraft, newLeg, submitItinerary, assignTail, setPassengers, cancelTrip, type Actor, type Trip } from './trip';
import { tripToRecord, tripsToRecords } from './projection';

const EA: Actor = { name: 'Dana', role: 'ea' };
const SCHED: Actor = { name: 'R. Calloway', role: 'scheduling' };
const T0 = '2026-09-01T00:00:00.000Z';

function booking(legs: Array<[string, string, string]>, tail: string | null = 'N2PG', pax = ['A. Reyes']): Trip {
  let t = createDraft({ title: 'London', leadPassengerId: 'P-REYES', leadPassengerName: 'A. Reyes', seatsHeld: 3, by: EA, nowUtc: T0,
    legs: legs.map(([from, to, date]) => newLeg({ from: { placeName: from, placeId: null, airport: from }, to: { placeName: to, placeId: null, airport: to }, date, timing: { kind: 'depart', departLocal: '09:00', flexHours: 0 } })) });
  t = submitItinerary(t, EA, T0);
  t = setPassengers(t, pax, EA, T0);
  return tail ? assignTail(t, tail, SCHED, T0, { free: true, reason: null }) : t;
}

describe('a booking projects faithfully into the scheduling record', () => {
  it('keeps the booking leg ids, so a checklist item stamped with a legId points back at the booking leg', () => {
    const t = booking([['KLUK', 'KTEB', '2026-09-10'], ['KTEB', 'KLUK', '2026-09-12']]);
    const r = tripToRecord(t)!;
    expect(r.legs.map(l => l.id)).toEqual(t.legs.map(l => l.id));
    expect(r.legs.map(l => l.sequence)).toEqual([1, 2]);
    expect(r.id).toBe(t.id);
    expect(r.tripNumber).toBe('London');
  });
  it('derives the trip type from the route: a non-US field is international, KDCA is DASSP, otherwise domestic', () => {
    expect(tripToRecord(booking([['KLUK', 'KTEB', '2026-09-10']]))!.tripType).toBe('domestic');
    expect(tripToRecord(booking([['KLUK', 'EGLF', '2026-09-10'], ['EGLF', 'KLUK', '2026-09-13']]))!.tripType).toBe('international');
    expect(tripToRecord(booking([['KLUK', 'KDCA', '2026-09-10']]))!.tripType).toBe('dca_dassp');
  });
  it('a submitted booking with a tail is confirmed for the store (the tail is spoken for); a draft or tail-less one is not a record', () => {
    expect(tripToRecord(booking([['KLUK', 'KTEB', '2026-09-10']]))!.status).toBe('confirmed');
    expect(tripToRecord(booking([['KLUK', 'KTEB', '2026-09-10']], null))).toBeNull();
    const draft = createDraft({ title: 'x', leadPassengerId: 'P', leadPassengerName: 'x', by: EA, nowUtc: T0, legs: [] });
    expect(tripToRecord(draft)).toBeNull();
  });
  it('a cancelled booking that had a tail projects as a cancelled record, so the store can release the tail', () => {
    const t = cancelTrip(booking([['KLUK', 'KTEB', '2026-09-10']]), EA, 'plans changed', T0);
    expect(tripToRecord(t)!.status).toBe('cancelled');
  });
  it('pax count comes from the people aboard, and a positioning leg carries nobody', () => {
    const t = booking([['KLUK', 'KJFK', '2026-09-10'], ['KJFK', 'KLUK', '2026-09-10']], 'N2PG', ['A. Reyes', 'S. Reyes']);
    const pos: Trip = { ...t, legs: [{ ...t.legs[0], positioning: true }, t.legs[1]] };
    expect(tripToRecord(pos)!.legs.map(l => l.paxCount)).toEqual([0, 2]);
  });
  it('tripsToRecords drops what does not project', () => {
    expect(tripsToRecords([booking([['KLUK', 'KTEB', '2026-09-10']]), booking([['KLUK', 'KTEB', '2026-09-10']], null)])).toHaveLength(1);
  });
});
