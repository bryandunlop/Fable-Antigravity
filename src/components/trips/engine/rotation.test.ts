import { describe, expect, it } from 'vitest';
import { createDraft, newLeg, submitItinerary, assignTail, type Actor } from './trip';
import { tripAsRecord, tripsAsRecords, rotationFor } from './rotation';

const EA: Actor = { name: 'Dana', role: 'ea' };
const SCHED: Actor = { name: 'R. Calloway', role: 'scheduling' };
function oneWay(title: string, from: string, to: string, date: string, tail: string | null) {
  let t = createDraft({ title, leadPassengerId: 'P', leadPassengerName: title, by: EA, nowUtc: '2026-09-01T00:00:00.000Z',
    legs: [newLeg({ from: { placeName: from, placeId: null, airport: from }, to: { placeName: to, placeId: null, airport: to }, date, timing: { kind: 'depart', departLocal: '09:00', flexHours: 0 } })] });
  t = submitItinerary(t, EA, '2026-09-01T00:00:00.000Z');
  return tail ? assignTail(t, tail, SCHED, '2026-09-01T00:00:00.000Z') : t;
}

describe('trips occupy tails, and a tail has a day', () => {
  it('a confirmed trip becomes a TripRecord with one leg per dated leg; a draft or tail-less trip does not', () => {
    const r = tripAsRecord(oneWay('Out', 'KLUK', 'KTEB', '2026-09-10', 'N5PG'))!;
    expect(r.tail).toBe('N5PG'); expect(r.legs).toHaveLength(1); expect(r.legs[0].departureIcao).toBe('KLUK');
    expect(r.legs[0].departureTimeUtc).toBe('2026-09-10T13:00:00.000Z');
    expect(tripAsRecord(oneWay('x', 'KLUK', 'KTEB', '2026-09-10', null))).toBeNull();
  });
  it('one lead out to KTEB, another back from KBED: the rotation shows the ferry between them and no return', () => {
    const recs = tripsAsRecords([oneWay('Out', 'KLUK', 'KTEB', '2026-09-10', 'N5PG'), oneWay('Back', 'KBED', 'KLUK', '2026-09-12', 'N5PG')]);
    const rot = rotationFor('N5PG', recs, '2026-09-01', '2026-09-30');
    expect(rot.map(x => `${x.kind} ${x.from}→${x.to} ${x.dateUtc}`)).toEqual([
      'passenger KLUK→KTEB 2026-09-10',
      'ferry KTEB→KBED 2026-09-12',
      'passenger KBED→KLUK 2026-09-12',
    ]);
  });
  it('a one-way that ends away shows the implied return home', () => {
    const recs = tripsAsRecords([oneWay('Out', 'KLUK', 'KTEB', '2026-09-10', 'N5PG')]);
    expect(rotationFor('N5PG', recs, '2026-09-01', '2026-09-30').at(-1)).toMatchObject({ kind: 'return', from: 'KTEB', to: 'KLUK', dateUtc: '2026-09-11' });
  });
});
