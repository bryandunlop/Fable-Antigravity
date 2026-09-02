import { describe, it, expect } from 'vitest';
import { schedulingQueue, BAND_LABEL, type QueueBand } from './queue';
import { DEFAULT_CUTOFFS } from './cutoffs';
import { DEFAULT_DOCUMENT_POLICY } from './documentGates';
import { SEED_PEOPLE, type Person } from './people';
import {
  createDraft, newLeg, submitItinerary, assignTail, setPassengers, requestChange, askQuestion, setCrew,
  type Actor, type Trip,
} from './trip';

const EA: Actor = { name: 'Dana Whitfield', role: 'ea' };
const SCHED: Actor = { name: 'R. Calloway', role: 'scheduling' };
const NOW = '2026-09-02T12:00:00.000Z';
const bare: Person[] = SEED_PEOPLE.map(p => ({ ...p, documents: [] }));
const settings = { cutoffs: DEFAULT_CUTOFFS, documentPolicy: DEFAULT_DOCUMENT_POLICY };

/** A submitted trip whose first leg is `days` from now, so the freeze cutoff can be placed. */
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

/** Fully settled: aircraft on, crew set, every seat named. */
function settled(id: string, days: number): Trip {
  let t = assignTail(trip(id, days, 2), 'N1PG', SCHED, NOW);
  t = setCrew(t, { pic: 'Capt. John Smith', sic: 'FO Emily Chen', fa: null }, SCHED, NOW);
  return setPassengers(t, ['A. Reyes', 'S. Reyes'], EA, NOW, ['P-REYES', 'P-SREYES']);
}

const run = (trips: Trip[], people = bare, now = NOW) => schedulingQueue(trips, people, settings, now);
const idsIn = (q: ReturnType<typeof run>, band: QueueBand) => q[band].map(r => r.trip.id);

describe('the bands', () => {
  it('has a label for every band, so no heading can render undefined', () => {
    for (const b of ['you', 'ea', 'freezing', 'nobody'] as const) expect(BAND_LABEL[b]).toBeTruthy();
  });

  it('puts a submitted trip with no aircraft in front of scheduling', () => {
    const q = run([trip('a', 40)]);
    expect(idsIn(q, 'you')).toEqual(['t-a']);
    expect(q.you[0].reasons).toContain('No aircraft yet');
  });

  it('puts an undecided change request in front of scheduling', () => {
    let t = assignTail(trip('b', 40), 'N1PG', SCHED, NOW);
    t = requestChange(t, t.legs[0].id, { date: '2026-11-01' }, 'Meeting moved', EA, NOW);
    const q = run([t]);
    expect(idsIn(q, 'you')).toEqual(['t-b']);
    expect(q.you[0].reasons.some(r => /change request/i.test(r))).toBe(true);
  });

  it('puts an unresolved document gate in front of scheduling', () => {
    const withExpired = bare.map(p => (p.id === 'P-SREYES'
      ? { ...p, documents: [{ id: 'd1', kind: 'passport' as const, label: 'Passport — USA', country: 'USA', numberMasked: '••• 1', expiresOn: '2026-09-01' }] }
      : p));
    // An international leg is what raises a gate at all.
    let t = assignTail(trip('c', 40), 'N1PG', SCHED, NOW);
    t = { ...t, legs: t.legs.map(l => ({ ...l, to: { ...l.to, airport: 'EGLF' } })) };
    t = setPassengers(t, ['A. Reyes', 'S. Reyes'], EA, NOW, ['P-REYES', 'P-SREYES']);
    const q = run([t], withExpired);
    expect(idsIn(q, 'you')).toEqual(['t-c']);
    expect(q.you[0].reasons.some(r => /document gate/i.test(r))).toBe(true);
  });

  it('puts an unanswered question in front of the EA', () => {
    let t = settled('d', 40);
    t = askQuestion(t, SCHED, 'passengers', 'Who is the third seat?', NOW);
    const q = run([t]);
    expect(idsIn(q, 'ea')).toEqual(['t-d']);
  });

  it('puts unnamed seats in front of the EA', () => {
    const t = assignTail(trip('e', 40, 4), 'N1PG', SCHED, NOW);
    const q = run([t]);
    expect(idsIn(q, 'ea')).toEqual(['t-e']);
    expect(q.ea[0].reasons.some(r => /unnamed/i.test(r))).toBe(true);
  });

  it('surfaces a settled trip freezing this week', () => {
    // Freeze is 72 h before departure, so a trip 5 days out freezes in 2 days.
    const q = run([settled('f', 5)]);
    expect(idsIn(q, 'freezing')).toEqual(['t-f']);
  });

  it('leaves a settled trip far out with nobody', () => {
    const q = run([settled('g', 60)]);
    expect(idsIn(q, 'nobody')).toEqual(['t-g']);
  });
});

describe('precedence — a trip appears in exactly one band', () => {
  it('never lists the same trip twice', () => {
    const trips = [trip('a', 40), settled('f', 5), settled('g', 60)];
    const q = run(trips);
    const all = ([...Object.keys(q)] as QueueBand[]).flatMap(b => idsIn(q, b));
    expect(new Set(all).size).toBe(all.length);
    expect(all.length).toBe(trips.length);
  });

  it('an unaircrafted trip freezing this week is scheduling’s, not merely "freezing"', () => {
    const q = run([trip('h', 5)]);
    expect(idsIn(q, 'you')).toEqual(['t-h']);
    expect(idsIn(q, 'freezing')).toEqual([]);
    // …and the freeze urgency is not lost, it rides along as a reason.
    expect(q.you[0].reasons.some(r => /freezes/i.test(r))).toBe(true);
  });
});

describe('what the queue leaves out', () => {
  it('ignores drafts — scheduling cannot act on a trip nobody has submitted', () => {
    const draft = createDraft({
      title: 'Draft', leadPassengerId: 'P-REYES', leadPassengerName: 'A. Reyes', seatsHeld: 2,
      by: EA, nowUtc: NOW, legs: [newLeg({ from: { placeName: 'A', placeId: null, airport: 'KLUK' }, to: { placeName: 'B', placeId: null, airport: 'KBED' }, date: '2026-10-16', timing: { kind: 'flexible' } })],
    });
    const q = run([draft]);
    expect((['you', 'ea', 'freezing', 'nobody'] as const).flatMap(b => idsIn(q, b))).toEqual([]);
  });

  it('ignores declined and cancelled trips', () => {
    const gone = { ...trip('x', 40), status: 'cancelled' as const };
    const q = run([gone]);
    expect((['you', 'ea', 'freezing', 'nobody'] as const).flatMap(b => idsIn(q, b))).toEqual([]);
  });
});

describe('age', () => {
  it('counts from the last thing that happened, and sorts the oldest first', () => {
    const older = { ...trip('old', 40) };
    older.events = older.events.map(e => ({ ...e, at: '2026-08-25T12:00:00.000Z' }));
    const newer = { ...trip('new', 40) };
    newer.events = newer.events.map(e => ({ ...e, at: '2026-09-01T12:00:00.000Z' }));
    const q = run([newer, older]);
    expect(idsIn(q, 'you')).toEqual(['t-old', 't-new']);
    expect(q.you[0].ageHours).toBeGreaterThan(q.you[1].ageHours);
  });
});
