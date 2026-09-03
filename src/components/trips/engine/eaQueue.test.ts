import { describe, it, expect } from 'vitest';
import { eaQueue, EA_BAND_LABEL, type EaBand } from './eaQueue';
import { schedulingQueue } from './queue';
import { DEFAULT_CUTOFFS } from './cutoffs';
import { DEFAULT_DOCUMENT_POLICY } from './documentGates';
import { SEED_PEOPLE, type Person } from './people';
import {
  createDraft, newLeg, submitItinerary, assignTail, setPassengers, askQuestion, postMessage, setCrew,
  type Actor, type Trip,
} from './trip';

const EA: Actor = { name: 'Dana Whitfield', role: 'ea' };
const SCHED: Actor = { name: 'R. Calloway', role: 'scheduling' };
const NOW = '2026-09-02T12:00:00.000Z';
const bare: Person[] = SEED_PEOPLE.map(p => ({ ...p, documents: [] }));
const settings = { cutoffs: DEFAULT_CUTOFFS, documentPolicy: DEFAULT_DOCUMENT_POLICY };

function trip(id: string, days: number, seats = 2): Trip {
  const date = new Date(Date.parse(NOW) + days * 86_400_000).toISOString().slice(0, 10);
  const t = createDraft({
    title: `Trip ${id}`, leadPassengerId: 'P-REYES', leadPassengerName: 'A. Reyes', seatsHeld: seats,
    by: EA, nowUtc: '2026-08-01T00:00:00.000Z',
    legs: [newLeg({
      from: { placeName: 'Cincinnati', placeId: null, airport: 'KLUK' },
      to: { placeName: 'Boston', placeId: null, airport: 'KBED' },
      date, timing: { kind: 'depart', departLocal: '09:00', flexHours: 0 },
    })],
  });
  return { ...submitItinerary(t, EA, '2026-08-02T00:00:00.000Z'), id: `t-${id}` };
}

function settled(id: string, days: number): Trip {
  let t = assignTail(trip(id, days, 2), 'N1PG', SCHED, NOW, { free: true, reason: null });
  t = setCrew(t, { pic: 'Capt. John Smith', sic: 'FO Emily Chen', fa: null }, SCHED, NOW);
  return setPassengers(t, ['A. Reyes', 'S. Reyes'], EA, NOW, ['P-REYES', 'P-SREYES']);
}

const run = (trips: Trip[], now = NOW) => eaQueue(trips, bare, settings, now);
const idsIn = (q: ReturnType<typeof run>, band: EaBand) => q[band].map(r => r.trip.id);

describe("the EA's bands", () => {
  it('has a label for every band, so no heading can render undefined', () => {
    for (const b of ['you', 'scheduling', 'freezing', 'nobody'] as const) expect(EA_BAND_LABEL[b]).toBeTruthy();
  });

  it('puts an unanswered question from scheduling in her own band', () => {
    const t = askQuestion(settled('a', 20), SCHED, 'airport', 'KBED or KBOS?', NOW);
    expect(idsIn(run([t]), 'you')).toEqual(['t-a']);
  });

  it('reads a question as hers to answer and names who asked', () => {
    const t = askQuestion(settled('a', 20), SCHED, 'airport', 'KBED or KBOS?', NOW);
    expect(run([t]).you[0].reasons[0]).toBe('Scheduling asked 1 question');
  });

  it('marks a plain reply as news without making it a debt', () => {
    const t = postMessage(settled('a', 20), SCHED, 'You are on N1PG.', NOW);
    const q = run([t]);
    // News, not owed: the trip does not move into her band.
    expect(idsIn(q, 'you')).toEqual([]);
    expect(q.nobody[0].reasons).toContain('Scheduling replied');
  });

  it('agrees with the scheduler about who is holding a trip up', () => {
    const trips = [
      askQuestion(settled('q', 20), SCHED, 'airport', 'Which one?', NOW),
      trip('n', 20),
      settled('s', 20),
    ];
    const ea = run(trips);
    const sched = schedulingQueue(trips, bare, settings, NOW);
    // Her "waiting on you" is exactly the scheduler's "waiting on the EA", and vice versa.
    expect(idsIn(ea, 'you')).toEqual(sched.ea.map(r => r.trip.id));
    expect(idsIn(ea, 'scheduling')).toEqual(sched.you.map(r => r.trip.id));
  });

  it('leaves drafts out — a queue is a list of things somebody can act on', () => {
    const draft = createDraft({
      title: 'Draft', leadPassengerId: 'P-REYES', leadPassengerName: 'A. Reyes', by: EA, nowUtc: NOW,
      legs: [newLeg({ from: { placeName: 'Cincinnati', placeId: null, airport: 'KLUK' }, to: { placeName: 'Boston', placeId: null, airport: 'KBED' }, date: '2026-09-20', timing: { kind: 'depart', departLocal: '09:00', flexHours: 0 } })],
    });
    const q = run([draft]);
    expect(q.you.length + q.scheduling.length + q.freezing.length + q.nobody.length).toBe(0);
  });

  it('tells her the seats she still has to name', () => {
    const t = assignTail(trip('u', 20, 3), 'N1PG', SCHED, NOW, { free: true, reason: null });
    expect(run([setCrew(t, { pic: 'Capt. John Smith', sic: 'FO Emily Chen', fa: null }, SCHED, NOW)]).you[0].reasons)
      .toContain('2 seats unnamed');
  });

  it('reads her own unanswered message as a sentence, not a count of one', () => {
    const one = postMessage(settled('m', 20), EA, 'Can we push to 10?', NOW);
    expect(run([one]).scheduling[0].reasons).toContain('Your message is unanswered');
    const two = postMessage(one, EA, 'And add a bag.', NOW);
    expect(run([two]).scheduling[0].reasons).toContain('2 of your messages unanswered');
  });
});
