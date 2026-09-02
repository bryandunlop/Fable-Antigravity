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

describe('positioning legs — nobody aboard, on purpose', () => {
  it('an EA-requested empty leg out to JFK and a passenger leg home read as positioning then passenger, paxCount 0 on the empty one', async () => {
    const { createDraft, newLeg, submitItinerary, assignTail } = await import('./trip');
    const EA = { name: 'Dana', role: 'ea' as const }; const S = { name: 'R', role: 'scheduling' as const };
    let t = createDraft({ title: 'JFK pickup', leadPassengerId: 'P', leadPassengerName: 'A. Reyes', seatsHeld: 2, by: EA, nowUtc: '2026-09-01T00:00:00.000Z',
      legs: [
        newLeg({ from: { placeName: 'Cincinnati', placeId: null, airport: 'KLUK' }, to: { placeName: 'JFK', placeId: null, airport: 'KJFK' }, date: '2026-09-20', timing: { kind: 'depart', departLocal: '07:00', flexHours: 0 }, positioning: true }),
        newLeg({ from: { placeName: 'JFK', placeId: null, airport: 'KJFK' }, to: { placeName: 'Cincinnati', placeId: null, airport: 'KLUK' }, date: '2026-09-20', timing: { kind: 'depart', departLocal: '11:00', flexHours: 0 } }),
      ] });
    t = assignTail(submitItinerary(t, EA, '2026-09-01T00:00:00.000Z'), 'N5PG', S, '2026-09-01T00:00:00.000Z');
    const recs = tripsAsRecords([t]);
    expect(recs[0].legs.map(l => l.paxCount)).toEqual([0, 1]);
    const rot = rotationFor('N5PG', recs, '2026-09-01', '2026-09-30');
    expect(rot.map(x => x.kind)).toEqual(['positioning', 'passenger']);
  });
  it('scheduling can add a positioning leg onto a live trip; the EA cannot', async () => {
    const { createDraft, newLeg, submitItinerary, addLegBy } = await import('./trip');
    const EA = { name: 'Dana', role: 'ea' as const }; const S = { name: 'R', role: 'scheduling' as const };
    let t = createDraft({ title: 'x', leadPassengerId: 'P', leadPassengerName: 'A', by: EA, nowUtc: '2026-09-01T00:00:00.000Z',
      legs: [newLeg({ from: { placeName: 'a', placeId: null, airport: 'KTEB' }, to: { placeName: 'b', placeId: null, airport: 'KLUK' }, date: '2026-09-20' })] });
    t = submitItinerary(t, EA, '2026-09-01T00:00:00.000Z');
    const pos = { from: { placeName: 'Cincinnati', placeId: null, airport: 'KLUK' }, to: { placeName: 'a', placeId: null, airport: 'KTEB' }, date: '2026-09-20', timing: { kind: 'flexible' as const }, positioning: true };
    expect(addLegBy(t, 0, pos, EA, '2026-09-01T00:00:00.000Z')).toBe(t);
    const added = addLegBy(t, 0, pos, S, '2026-09-01T00:00:00.000Z');
    expect(added.legs).toHaveLength(2); expect(added.legs[0].positioning).toBe(true);
    expect(added.events.at(-1)).toMatchObject({ kind: 'leg-added', positioning: true });
  });
});
