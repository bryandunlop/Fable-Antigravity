import { describe, expect, it } from 'vitest';
import { createDraft, newLeg, submitItinerary, assignTail, setCrew, setPassengers, requestChange, type Actor } from './trip';
import { DEFAULT_DOCUMENT_POLICY } from './documentGates';
import type { Person } from './people';
import { boardMarksFor, markLabels, unassignedBookings, crewLabel } from './boardMarks';

const EA: Actor = { name: 'Dana', role: 'ea' };
const SCHED: Actor = { name: 'R. Calloway', role: 'scheduling' };
const T0 = '2026-09-01T00:00:00.000Z';
const people: Person[] = [
  { id: 'P-SREYES', name: 'S. Reyes', kind: 'guest', principal: false, briefingPref: 'summary', forms: { status: 'approved' }, documents: [{ id: 'd1', kind: 'passport', label: 'Passport — USA', country: 'US', numberMasked: '••1', expiresOn: '2026-09-20' }], prefs: {} } as unknown as Person,
];

function london(tail: string | null) {
  let t = createDraft({ title: 'London', leadPassengerId: 'P-SREYES', leadPassengerName: 'S. Reyes', seatsHeld: 2, by: EA, nowUtc: T0,
    legs: [newLeg({ from: { placeName: 'Cincinnati', placeId: null, airport: 'KLUK' }, to: { placeName: 'London', placeId: null, airport: 'EGLF' }, date: '2026-10-17', timing: { kind: 'depart', departLocal: '18:30', flexHours: 0 } })] });
  t = submitItinerary(t, EA, T0);
  t = setPassengers(t, ['S. Reyes'], EA, T0, ['P-SREYES']);
  return tail ? assignTail(t, tail, SCHED, T0, { free: true, reason: null }) : t;
}

describe('the board marks (D110 slice 3)', () => {
  it('a blocking passport gate and a pending change become marks on the block; a tailed trip with no crew says so', () => {
    let t = london('N1PG');
    t = requestChange(t, t.legs[0].id, { date: '2026-10-18' }, 'a day later', EA, T0);
    const m = boardMarksFor([t], people, DEFAULT_DOCUMENT_POLICY, T0).get(t.id)!;
    expect(m.gates).toBe(1);
    expect(m.changes).toBe(1);
    expect(m.crewMissing).toBe(true);
    expect(markLabels(m)).toEqual(['✕ gate', '△ change']);
    const crewed = setCrew(t, { pic: 'Capt. John Smith', sic: 'FO Emily Chen', fa: 'Lena Nguyen' }, SCHED, T0);
    const m2 = boardMarksFor([crewed], people, DEFAULT_DOCUMENT_POLICY, T0).get(t.id)!;
    expect(m2.crewMissing).toBe(false);
    expect(crewLabel(m2.crew)).toBe('Smith / Chen · FA Nguyen');
  });
  it('a submitted booking with no aircraft is the Unassigned lane; a draft is not', () => {
    const t = london(null);
    expect(unassignedBookings([t]).map(x => x.id)).toEqual([t.id]);
    const draft = createDraft({ title: 'x', leadPassengerId: 'P', leadPassengerName: 'x', by: EA, nowUtc: T0, legs: [] });
    expect(unassignedBookings([draft])).toEqual([]);
  });
});
