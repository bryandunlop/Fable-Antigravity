import { describe, expect, it } from 'vitest';
import {
  createDraft, newLeg, updateLeg, addLeg, submitBlockers, readinessChecks, canSubmit,
  shareDraft, submitItinerary, assignTail, postMessage, addDocument, askQuestion,
  visibleToScheduling, searchEvents, documentsOf, chooseAirport, type Actor,
} from './trip';
import { SCHEDULING_DECIDES } from './places';

const EA: Actor = { name: 'Dana Whitfield', role: 'ea' };
const SCHED: Actor = { name: 'R. Calloway', role: 'scheduling' };
const T0 = '2026-09-03T13:12:00.000Z';

function draft() {
  return createDraft({
    title: 'Seattle plant visit', leadPassengerId: 'P-REYES', leadPassengerName: 'A. Reyes', seatsHeld: 4, by: EA, nowUtc: T0,
    legs: [
      newLeg({ from: { placeName: 'Cincinnati', placeId: 'pl-cvg', airport: 'KLUK' }, to: { placeName: 'Seattle', placeId: 'pl-sea', airport: 'KBFI' }, date: '2026-10-14', timing: { kind: 'arrive', arriveByLocal: '15:00' } }),
      newLeg({ from: { placeName: 'Seattle', placeId: 'pl-sea', airport: 'KBFI' }, to: { placeName: 'Cincinnati', placeId: 'pl-cvg', airport: 'KLUK' }, date: null, timing: { kind: 'flexible' } }),
    ],
  });
}

describe('before you submit', () => {
  it('a leg without a date blocks submission and names the leg', () => {
    const t = draft();
    expect(submitBlockers(t)).toEqual([{ legId: t.legs[1].id, text: 'Leg 2 has no date' }]);
    expect(canSubmit(t)).toBe(false);
  });

  it('the check list says what each place resolved to, and when scheduling will decide', () => {
    let t = draft();
    t = updateLeg(t, t.legs[1].id, { to: { placeName: 'Mehoopany plant', placeId: 'pl-meh', airport: SCHEDULING_DECIDES } });
    const texts = readinessChecks(t).map(c => c.text);
    expect(texts).toContain('Leg 1: Seattle resolved to KBFI');
    expect(texts).toContain('Leg 2: Mehoopany plant — scheduling will pick the airport');
    expect(texts).toContain('Leg 2: any time that day');
  });

  it('an unknown place does not block — scheduling will ask', () => {
    let t = draft();
    t = updateLeg(t, t.legs[1].id, { date: '2026-10-16', to: { placeName: 'Atlantis', placeId: null, airport: null } });
    expect(submitBlockers(t)).toEqual([]);
    expect(readinessChecks(t).map(c => c.text)).toContain('Leg 2: Atlantis is not a place we know — scheduling will ask');
  });

  it('adding a leg starts it where the last one ended', () => {
    const t = addLeg(draft());
    expect(t.legs[2].from.placeName).toBe('Cincinnati');
  });
});

describe('drafts are private until the EA shares them', () => {
  it('scheduling cannot see a fresh draft', () => {
    expect(visibleToScheduling(draft())).toBe(false);
  });

  it('sharing is an explicit event with the EA’s name on it, and holds nothing', () => {
    const t = shareDraft(draft(), EA, T0);
    expect(visibleToScheduling(t)).toBe(true);
    expect(t.status).toBe('draft');
    expect(t.events.at(-1)).toMatchObject({ kind: 'shared', by: EA });
  });

  it('submitting a complete itinerary makes it visible and moves it to submitted', () => {
    let t = updateLeg(draft(), draft().legs[1].id, { date: '2026-10-16' });
    // updateLeg on a different draft instance: rebuild properly
    t = draft(); t = updateLeg(t, t.legs[1].id, { date: '2026-10-16' });
    t = submitItinerary(t, EA, T0);
    expect(t.status).toBe('submitted');
    expect(visibleToScheduling(t)).toBe(true);
  });

  it('a blocked draft does not submit', () => {
    const t = submitItinerary(draft(), EA, T0);
    expect(t.status).toBe('draft');
  });
});

describe('scheduling cannot hold an aircraft without an itinerary', () => {
  it('refuses to assign a tail on a draft, even a shared one', () => {
    const t = assignTail(shareDraft(draft(), EA, T0), 'N5PG', SCHED, T0, { free: true, reason: null });
    expect(t.tail).toBeNull();
    expect(t.events.some(e => e.kind === 'assigned')).toBe(false);
  });

  it('assigns on a submitted trip, by scheduling only', () => {
    let t = draft(); t = updateLeg(t, t.legs[1].id, { date: '2026-10-16' }); t = submitItinerary(t, EA, T0);
    expect(assignTail(t, 'N5PG', EA, T0, { free: true, reason: null }).tail).toBeNull();
    const done = assignTail(t, 'n5pg', SCHED, T0, { free: true, reason: null });
    expect(done.tail).toBe('N5PG');
    expect(done.status).toBe('confirmed');
  });
});

describe('the record is one searchable stream', () => {
  it('messages, questions, documents and system events all carry who and when, and are searchable', () => {
    let t = shareDraft(draft(), EA, T0);
    t = postMessage(t, EA, 'Heads up, this one is likely.', '2026-09-03T13:14:00.000Z');
    t = askQuestion(t, SCHED, 'airport', 'Boeing Field as usual for the plant?', '2026-09-03T13:40:00.000Z');
    t = addDocument(t, EA, { name: 'passports-x4.pdf', sizeBytes: 120_000, tag: { kind: 'trip' }, visibleTo: ['ea', 'scheduling'] }, '2026-09-04T20:20:00.000Z');
    expect(documentsOf(t).map(d => d.name)).toEqual(['passports-x4.pdf']);
    expect(searchEvents([t], 'boeing').map(h => h.event.by.name)).toEqual(['R. Calloway']);
    expect(searchEvents([t], 'passport')).toHaveLength(1);
    expect(searchEvents([t], 'shared')).toHaveLength(1);
    expect(searchEvents([t], '')).toEqual([]);
    for (const e of t.events) { expect(e.by.name).toBeTruthy(); expect(e.at).toMatch(/^\d{4}-/); }
  });

  it('changing an airport on a submitted trip is an event; on a draft it is just editing', () => {
    const d = chooseAirport(draft(), draft().legs[0].id, 'to', 'KSEA', EA, T0);
    expect(d.events.some(e => e.kind === 'airport-changed')).toBe(false);
    let t = draft(); t = updateLeg(t, t.legs[1].id, { date: '2026-10-16' }); t = submitItinerary(t, EA, T0);
    t = chooseAirport(t, t.legs[0].id, 'to', 'KSEA', SCHED, T0);
    expect(t.events.at(-1)).toMatchObject({ kind: 'airport-changed', airport: 'KSEA' });
    expect(t.legs[0].to.airport).toBe('KSEA');
  });
});

describe('TL-48 — the engine refuses a busy tail, not just the button', () => {
  /** Submitted, which is the only state an aircraft can go onto — a shared draft is still a draft. */
  const live = () => {
    let t = draft();
    t = updateLeg(t, t.legs[1].id, { date: '2026-10-16' });
    return submitItinerary(t, EA, T0);
  };
  const FREE = { free: true, reason: null };
  const BUSY = { free: false, reason: 'M. Osei · Teterboro on 10-16' };

  it('assigns when the verdict says the tail is free', () => {
    const t = assignTail(live(), 'N5PG', SCHED, T0, FREE);
    expect(t.tail).toBe('N5PG');
    expect(t.status).toBe('confirmed');
  });

  it('returns the trip unchanged and records nothing when the tail is busy', () => {
    const before = live();
    const after = assignTail(before, 'N5PG', SCHED, T0, BUSY);
    // Identity, not just equality: the module clock relies on a declining engine handing back
    // exactly what it was given (see clockIdempotence.test.ts).
    expect(after).toBe(before);
    expect(after.tail).toBeNull();
    expect(after.events.some(e => e.kind === 'assigned')).toBe(false);
  });

  it('a busy verdict outranks everything else that would have allowed it', () => {
    // Right role, right status, real tail — and still refused, because the aircraft is spoken for.
    const before = live();
    expect(assignTail(before, 'n5pg', SCHED, T0, BUSY)).toBe(before);
  });

  it('still refuses the wrong role even when the tail is free', () => {
    expect(assignTail(live(), 'N5PG', EA, T0, FREE).tail).toBeNull();
  });
});
