import { describe, expect, it } from 'vitest';
import { createDraft, newLeg, submitItinerary, postMessage, askQuestion, type Actor } from './trip';
import { outstandingAdminMessages, outstandingAcrossTrips, newsForEa, newsAcrossTrips } from './adminMessages';

const EA: Actor = { name: 'Dana', role: 'ea' };
const SCHED: Actor = { name: 'R. Calloway', role: 'scheduling' };
const T = (h: number) => new Date(Date.UTC(2026, 8, 1, h)).toISOString();

function trip(title = 'Boston') {
  let t = createDraft({ title, leadPassengerId: 'P', leadPassengerName: 'A. Reyes', by: EA, nowUtc: T(0),
    legs: [newLeg({ from: { placeName: 'Cincinnati', placeId: null, airport: 'KLUK' }, to: { placeName: 'Boston', placeId: null, airport: 'KBED' }, date: '2026-09-10', timing: { kind: 'depart', departLocal: '09:00', flexHours: 0 } })] });
  return submitItinerary(t, EA, T(1));
}

describe('an admin message stays outstanding until scheduling answers', () => {
  it('counts the EA messages after scheduling last spoke; a scheduling reply clears them', () => {
    let t = trip();
    t = postMessage(t, EA, 'Can we leave at 8 instead?', T(2));
    t = postMessage(t, EA, 'And add a bag.', T(3));
    expect(outstandingAdminMessages(t).map(m => m.kind === 'message' ? m.text : '')).toEqual(['Can we leave at 8 instead?', 'And add a bag.']);
    t = postMessage(t, SCHED, '8 is fine.', T(4));
    expect(outstandingAdminMessages(t)).toEqual([]);
    t = postMessage(t, EA, 'Thanks — one more thing', T(5));
    expect(outstandingAdminMessages(t)).toHaveLength(1);
  });
  it("a scheduling question is an answer too, and the EA's answer to it is outstanding for scheduling", () => {
    let t = trip();
    t = askQuestion(t, SCHED, 'airport', 'KBED or KBOS?', T(2));
    expect(outstandingAdminMessages(t)).toEqual([]);
    t = postMessage(t, EA, 'KBED please', T(3));
    expect(outstandingAdminMessages(t)).toHaveLength(1);
  });
  it('the dedicated space lists every trip, oldest first, with an age', () => {
    let a = postMessage(trip('Boston'), EA, 'old', T(1));
    let b = postMessage(trip('Seattle'), EA, 'new', T(5));
    const out = outstandingAcrossTrips([b, a], T(6));
    expect(out.map(o => o.trip.title)).toEqual(['Boston', 'Seattle']);
    expect(out[0].ageHours).toBe(5);
  });
});

describe('the mirror: what scheduling has said since the EA last spoke', () => {
  it('is news for the EA, oldest first, and her own reply clears it', () => {
    let t = trip();
    t = postMessage(t, SCHED, 'You are on N1PG.', T(2));
    t = askQuestion(t, SCHED, 'airport', 'KBED or KBOS?', T(3));
    expect(newsForEa(t).map(m => m.text)).toEqual(['You are on N1PG.', 'KBED or KBOS?']);
    t = postMessage(t, EA, 'KBED please', T(4));
    expect(newsForEa(t)).toEqual([]);
  });

  it('separates what she owes from what is merely news', () => {
    let t = trip();
    t = postMessage(t, SCHED, 'You are on N1PG.', T(2));
    // A plain reply is news, not a debt: nothing is owed back.
    expect(newsForEa(t)).toHaveLength(1);
    expect(newsForEa(t).filter(m => m.kind === 'question')).toEqual([]);
    t = askQuestion(t, SCHED, 'passengers', 'Who is in seat 4?', T(3));
    expect(newsForEa(t).filter(m => m.kind === 'question')).toHaveLength(1);
  });

  it("her own messages are never news to her", () => {
    let t = trip();
    t = postMessage(t, EA, 'Can we leave at 8?', T(2));
    expect(newsForEa(t)).toEqual([]);
  });

  it('the log lists every live trip, most recent activity first', () => {
    const a = postMessage(trip('Boston'), SCHED, 'old', T(1));
    const b = postMessage(trip('Seattle'), SCHED, 'new', T(5));
    const out = newsAcrossTrips([a, b], T(6));
    expect(out.map(o => o.trip.title)).toEqual(['Seattle', 'Boston']);
    expect(out[0].ageHours).toBe(1);
  });
});
