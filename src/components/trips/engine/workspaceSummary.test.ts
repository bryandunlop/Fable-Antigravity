import { describe, it, expect } from 'vitest';
import { workspaceSummary, WAITING_LABEL } from './workspaceSummary';
import { DEFAULT_CUTOFFS } from './cutoffs';
import { DEFAULT_DOCUMENT_POLICY, documentGates } from './documentGates';
import { SEED_PEOPLE, personByName, type Person } from './people';
import {
  createDraft, newLeg, submitItinerary, assignTail, setPassengers, requestChange, askQuestion, setCrew, postMessage,
  type Actor, type Trip,
} from './trip';

const EA: Actor = { name: 'Dana Whitfield', role: 'ea' };
const SCHED: Actor = { name: 'R. Calloway', role: 'scheduling' };
const NOW = '2026-09-02T12:00:00.000Z';

function base(): Trip {
  const t = createDraft({
    title: 'London', leadPassengerId: 'P-REYES', leadPassengerName: 'A. Reyes', seatsHeld: 3,
    by: EA, nowUtc: '2026-08-01T00:00:00.000Z',
    legs: [
      newLeg({ from: { placeName: 'Cincinnati', placeId: null, airport: 'KLUK' }, to: { placeName: 'London', placeId: null, airport: 'EGLF' }, date: '2026-10-16', timing: { kind: 'depart', departLocal: '18:30', flexHours: 0 } }),
      newLeg({ from: { placeName: 'London', placeId: null, airport: 'EGLF' }, to: { placeName: 'Cincinnati', placeId: null, airport: 'KLUK' }, date: '2026-10-19', timing: { kind: 'depart', departLocal: '11:00', flexHours: 0 } }),
    ],
  });
  return submitItinerary(t, EA, '2026-08-02T00:00:00.000Z');
}

const bare: Person[] = SEED_PEOPLE.map(p => ({ ...p, documents: [] }));
const settings = { cutoffs: DEFAULT_CUTOFFS, documentPolicy: DEFAULT_DOCUMENT_POLICY };

const summarise = (trip: Trip, people = bare, now = NOW) =>
  workspaceSummary(trip, people, settings, documentGates(trip, people, settings.documentPolicy, now), now);

describe('the next cutoff cell', () => {
  it('is the soonest one still ahead, never one already passed', () => {
    const s = summarise(base());
    expect(s.nextCutoff).toBeTruthy();
    expect(s.nextCutoff!.dueUtc > NOW).toBe(true);
    expect(s.nextCutoff!.label).toBe('Passenger forms');
  });

  it('says nothing rather than guessing when no leg has a date', () => {
    const t = base();
    const undated = { ...t, legs: t.legs.map(l => ({ ...l, date: null })) };
    expect(summarise(undated).nextCutoff).toBeNull();
  });

  it('goes quiet once every cutoff is behind us', () => {
    expect(summarise(base(), bare, '2027-01-01T00:00:00.000Z').nextCutoff).toBeNull();
  });
});

describe('the people cell', () => {
  it('counts named seats against seats held', () => {
    const s = summarise(base());
    expect(s.people.named).toBe(1);        // the lead
    expect(s.people.seats).toBe(3);
    expect(s.people.unnamed).toBe(2);
  });

  it('carries the unresolved document-gate count', () => {
    const s = summarise(base(), bare);
    expect(s.people.gates).toBe(0);

    const sreyes = personByName(bare, 'S. Reyes')!;
    const withExpired = bare.map(p => (p.id === sreyes.id
      ? { ...p, documents: [{ id: 'd1', kind: 'passport' as const, label: 'Passport — USA', country: 'USA', numberMasked: '••• 1', expiresOn: '2026-10-12' }] }
      : p));
    const t = setPassengers(base(), ['A. Reyes', 'S. Reyes'], EA, NOW, ['P-REYES', 'P-SREYES']);
    expect(summarise(t, withExpired).people.gates).toBe(2);   // both international legs
  });
});

describe('the freeze cell', () => {
  it('names the freeze moment and says it is clear when nothing blocks it', () => {
    const s = summarise(base());
    expect(s.freeze!.blocked).toBe(false);
  });

  it('says blocked while a document gate is unresolved', () => {
    const sreyes = personByName(bare, 'S. Reyes')!;
    const withExpired = bare.map(p => (p.id === sreyes.id
      ? { ...p, documents: [{ id: 'd1', kind: 'passport' as const, label: 'Passport — USA', country: 'USA', numberMasked: '••• 1', expiresOn: '2026-10-12' }] }
      : p));
    const t = setPassengers(base(), ['A. Reyes', 'S. Reyes'], EA, NOW, ['P-REYES', 'P-SREYES']);
    expect(summarise(t, withExpired).freeze!.blocked).toBe(true);
  });

  it('says already frozen once a sheet exists, rather than counting down to nothing', () => {
    const t = { ...base(), frozenSheets: [{ version: 1 } as never] };
    expect(summarise(t).freeze!.frozen).toBe(true);
  });
});

describe('waiting on', () => {
  it('is scheduling while the aircraft has nobody flying it', () => {
    // Regression: a tailed, crewless trip read "Waiting on nobody · crew set, nothing owed" on a row
    // that simultaneously said "No crew set" (fresh review, 2026-09-02).
    const t = assignTail(base(), 'N1PG', SCHED, NOW, { free: true, reason: null });
    expect(summarise(t).waitingOn).toBe('scheduling');
  });

  it('is scheduling while a submitted trip has no aircraft', () => {
    expect(summarise(base()).waitingOn).toBe('scheduling');
  });

  it('is scheduling while a change request is undecided', () => {
    let t = assignTail(base(), 'N1PG', SCHED, NOW, { free: true, reason: null });
    t = requestChange(t, t.legs[0].id, { date: '2026-10-17' }, 'Meeting moved', EA, NOW);
    expect(summarise(t).waitingOn).toBe('scheduling');
  });

  it('is scheduling while a document gate is unresolved', () => {
    const sreyes = personByName(bare, 'S. Reyes')!;
    const withExpired = bare.map(p => (p.id === sreyes.id
      ? { ...p, documents: [{ id: 'd1', kind: 'passport' as const, label: 'Passport — USA', country: 'USA', numberMasked: '••• 1', expiresOn: '2026-10-12' }] }
      : p));
    let t = assignTail(base(), 'N1PG', SCHED, NOW, { free: true, reason: null });
    t = setPassengers(t, ['A. Reyes', 'S. Reyes'], EA, NOW, ['P-REYES', 'P-SREYES']);
    expect(summarise(t, withExpired).waitingOn).toBe('scheduling');
  });

  it('is the EA when scheduling has asked them a question', () => {
    let t = assignTail(base(), 'N1PG', SCHED, NOW, { free: true, reason: null });
    // Crew too: an aircraft with nobody flying it is scheduling's own outstanding job, and it
    // outranks anything the EA owes.
    t = setCrew(t, { pic: 'Capt. John Smith', sic: 'FO Emily Chen', fa: null }, SCHED, NOW);
    t = askQuestion(t, SCHED, 'passengers', 'Who is the third seat?', NOW);
    expect(summarise(t).waitingOn).toBe('ea');
  });

  it('is nobody when the aircraft is on and nothing is outstanding', () => {
    let t = assignTail(base(), 'N1PG', SCHED, NOW, { free: true, reason: null });
    t = setCrew(t, { pic: 'Capt. John Smith', sic: 'FO Emily Chen', fa: null }, SCHED, NOW);
    t = setPassengers(t, ['A. Reyes', 'S. Reyes', 'K. Tanaka'], EA, NOW, ['P-REYES', 'P-SREYES', 'P-TANAKA']);
    expect(summarise(t).waitingOn).toBe('nobody');
  });

  it('reads the wait from the last thing that happened, not from now', () => {
    const s = summarise(base());
    expect(s.waitingSinceUtc).toBe(base().events[base().events.length - 1].at);
  });

  it('has a label for every state, so no cell can render undefined', () => {
    for (const k of ['scheduling', 'ea', 'nobody'] as const) expect(WAITING_LABEL[k]).toBeTruthy();
  });
});

describe('tab counts', () => {
  it('puts the unnamed seats on People and the gates on Documents', () => {
    const sreyes = personByName(bare, 'S. Reyes')!;
    const withExpired = bare.map(p => (p.id === sreyes.id
      ? { ...p, documents: [{ id: 'd1', kind: 'passport' as const, label: 'Passport — USA', country: 'USA', numberMasked: '••• 1', expiresOn: '2026-10-12' }] }
      : p));
    const t = setPassengers(base(), ['A. Reyes', 'S. Reyes'], EA, NOW, ['P-REYES', 'P-SREYES']);
    const s = summarise(t, withExpired);
    expect(s.counts.people).toBe(1);       // one seat still unnamed
    expect(s.counts.documents).toBe(2);
  });

  it('counts undecided change requests on Itinerary', () => {
    let t = assignTail(base(), 'N1PG', SCHED, NOW, { free: true, reason: null });
    t = requestChange(t, t.legs[0].id, { date: '2026-10-17' }, 'Meeting moved', EA, NOW);
    expect(summarise(t).counts.itinerary).toBe(1);
  });

  it('is zero, never undefined, when there is nothing to decide', () => {
    let t = assignTail(base(), 'N1PG', SCHED, NOW, { free: true, reason: null });
    t = setPassengers(t, ['A. Reyes', 'S. Reyes', 'K. Tanaka'], EA, NOW, ['P-REYES', 'P-SREYES', 'P-TANAKA']);
    t = setCrew(t, { pic: 'Capt. John Smith', sic: 'FO Emily Chen', fa: null }, SCHED, NOW);
    const s = summarise(t);
    expect(s.counts).toEqual({ itinerary: 0, people: 0, checklist: 0, record: 0, documents: 0, sheet: 0, ops: 0 });
  });
});

describe('the gaps the fresh review found', () => {
  it('counts an aircraft with nobody flying it on the Ops tab', () => {
    // The one tab that could never raise its hand: crew is a decision scheduling owes, and it sat
    // behind a tab with no number on it.
    const withTail = assignTail(base(), 'N1PG', SCHED, NOW, { free: true, reason: null });
    expect(summarise(withTail).counts.ops).toBe(1);
    const crewed = setCrew(withTail, { pic: 'Capt. John Smith', sic: 'FO Emily Chen', fa: null }, SCHED, NOW);
    expect(summarise(crewed).counts.ops).toBe(0);
  });

  it('does not ask for crew before there is an aircraft to crew', () => {
    expect(summarise(base()).counts.ops).toBe(0);
  });

  it('treats any later EA message as the answer to an open question — deliberately', () => {
    // Pinning the semantics the reviewer flagged: in a linear record an EA message after a question
    // reads as the reply, and there is no "answer this" affordance to be stricter with. If that ever
    // becomes wrong, this test is what says the behaviour was chosen rather than overlooked.
    let t = assignTail(base(), 'N1PG', SCHED, NOW, { free: true, reason: null });
    t = askQuestion(t, SCHED, 'passengers', 'Who is the third seat?', NOW);
    expect(summarise(t).counts.record).toBe(1);
    t = postMessage(t, EA, 'Booking the car for Monday.', NOW);
    // LG-398 (Bryan, 2026-09-03): the EA's reply is itself an outstanding message until scheduling
    // answers it — the question is closed, the message is not. Scheduling's reply clears the record.
    const afterReply = summarise(t);
    expect(afterReply.messages).toBe(1);
    expect(afterReply.counts.record).toBe(1);
    expect(afterReply.waitingOn).toBe('scheduling');
    t = postMessage(t, SCHED, 'Noted, thanks.', NOW);
    expect(summarise(t).counts.record).toBe(0);
  });

  it('does not let a SCHEDULING message answer scheduling’s own question', () => {
    let t = assignTail(base(), 'N1PG', SCHED, NOW, { free: true, reason: null });
    t = askQuestion(t, SCHED, 'passengers', 'Who is the third seat?', NOW);
    t = postMessage(t, SCHED, 'Bumping this to the top of the pile.', NOW);
    expect(summarise(t).counts.record).toBe(1);
  });
});
