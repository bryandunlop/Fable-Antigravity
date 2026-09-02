import { describe, it, expect } from 'vitest';
import { workspaceSummary, WAITING_LABEL } from './workspaceSummary';
import { DEFAULT_CUTOFFS } from './cutoffs';
import { DEFAULT_DOCUMENT_POLICY, documentGates } from './documentGates';
import { SEED_PEOPLE, personByName, type Person } from './people';
import {
  createDraft, newLeg, submitItinerary, assignTail, setPassengers, requestChange, askQuestion,
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
  it('is scheduling while a submitted trip has no aircraft', () => {
    expect(summarise(base()).waitingOn).toBe('scheduling');
  });

  it('is scheduling while a change request is undecided', () => {
    let t = assignTail(base(), 'N1PG', SCHED, NOW);
    t = requestChange(t, t.legs[0].id, { date: '2026-10-17' }, 'Meeting moved', EA, NOW);
    expect(summarise(t).waitingOn).toBe('scheduling');
  });

  it('is scheduling while a document gate is unresolved', () => {
    const sreyes = personByName(bare, 'S. Reyes')!;
    const withExpired = bare.map(p => (p.id === sreyes.id
      ? { ...p, documents: [{ id: 'd1', kind: 'passport' as const, label: 'Passport — USA', country: 'USA', numberMasked: '••• 1', expiresOn: '2026-10-12' }] }
      : p));
    let t = assignTail(base(), 'N1PG', SCHED, NOW);
    t = setPassengers(t, ['A. Reyes', 'S. Reyes'], EA, NOW, ['P-REYES', 'P-SREYES']);
    expect(summarise(t, withExpired).waitingOn).toBe('scheduling');
  });

  it('is the EA when scheduling has asked them a question', () => {
    let t = assignTail(base(), 'N1PG', SCHED, NOW);
    t = askQuestion(t, SCHED, 'passengers', 'Who is the third seat?', NOW);
    expect(summarise(t).waitingOn).toBe('ea');
  });

  it('is nobody when the aircraft is on and nothing is outstanding', () => {
    let t = assignTail(base(), 'N1PG', SCHED, NOW);
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
    let t = assignTail(base(), 'N1PG', SCHED, NOW);
    t = requestChange(t, t.legs[0].id, { date: '2026-10-17' }, 'Meeting moved', EA, NOW);
    expect(summarise(t).counts.itinerary).toBe(1);
  });

  it('is zero, never undefined, when there is nothing to decide', () => {
    let t = assignTail(base(), 'N1PG', SCHED, NOW);
    t = setPassengers(t, ['A. Reyes', 'S. Reyes', 'K. Tanaka'], EA, NOW, ['P-REYES', 'P-SREYES', 'P-TANAKA']);
    const s = summarise(t);
    expect(s.counts).toEqual({ itinerary: 0, people: 0, record: 0, documents: 0, sheet: 0, ops: 0 });
  });
});
