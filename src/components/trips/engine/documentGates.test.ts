import { describe, it, expect } from 'vitest';
import {
  documentGates, blockingGates, gateKey, DEFAULT_DOCUMENT_POLICY,
  type DocumentPolicy,
} from './documentGates';
import { SEED_PEOPLE, personByName, upsertPerson, type Person, type TravelDocument } from './people';
import { createDraft, newLeg, submitItinerary, overrideGate, gateOverrides, type Actor, type Trip } from './trip';
import { freezeSheet, latestSheet } from './tripSheet';
import { SEED_PLACES } from './places';

const EA: Actor = { name: 'Dana Whitfield', role: 'ea' };
const SCHED: Actor = { name: 'R. Calloway', role: 'scheduling' };
const NOW = '2026-09-02T12:00:00.000Z';

const doc = (over: Partial<TravelDocument> = {}): TravelDocument => ({
  id: 'dp1', kind: 'passport', label: 'Passport — USA', country: 'USA',
  numberMasked: '••• 1234', expiresOn: '2031-01-01', ...over,
});

/**
 * S. Reyes with whatever documents the case needs, and NOBODY else carrying any.
 *
 * The seed deliberately gives A. Reyes a visa that lapses in eight days — good for the demo, and
 * noise here: a fixture that leans on another person's incidental documents cannot tell you which
 * assertion actually failed.
 */
function peopleWith(docs: TravelDocument[]): Person[] {
  const bare = SEED_PEOPLE.map(p => ({ ...p, documents: [] }));
  const s = personByName(bare, 'S. Reyes')!;
  return upsertPerson(bare, { ...s, documents: docs });
}

/** A trip whose legs are the given [from, to] airports on the given dates. */
function trip(legs: Array<[string, string, string]>, names = ['A. Reyes', 'S. Reyes']): Trip {
  const t = createDraft({
    title: 'Test', leadPassengerId: 'P-REYES', leadPassengerName: 'A. Reyes', seatsHeld: names.length,
    by: EA, nowUtc: '2026-08-01T00:00:00.000Z',
    legs: legs.map(([from, to, date]) => newLeg({
      from: { placeName: from, placeId: null, airport: from },
      to: { placeName: to, placeId: null, airport: to },
      date, timing: { kind: 'depart', departLocal: '09:00', flexHours: 0 },
    })),
  });
  return {
    ...submitItinerary(t, EA, '2026-08-02T00:00:00.000Z'),
    passengerNames: names,
    passengerIds: names.map(n => personByName(SEED_PEOPLE, n)!.id),
  };
}

const DOMESTIC: Array<[string, string, string]> = [['KLUK', 'KBED', '2026-10-16']];
const INTERNATIONAL: Array<[string, string, string]> = [
  ['KLUK', 'EGLL', '2026-10-16'],
  ['EGLL', 'KLUK', '2026-10-18'],
];

describe('the department policy is a setting, not a regulation', () => {
  it('defaults to six months of passport validity for international legs', () => {
    expect(DEFAULT_DOCUMENT_POLICY.internationalPassportMonths).toBe(6);
  });

  it('honours a different number when the department sets one', () => {
    const policy: DocumentPolicy = { internationalPassportMonths: 3 };
    const people = peopleWith([doc({ expiresOn: '2027-01-20' })]); // ~3 months after 16 Oct
    expect(documentGates(trip(INTERNATIONAL), people, DEFAULT_DOCUMENT_POLICY, NOW)).not.toEqual([]);
    expect(documentGates(trip(INTERNATIONAL), people, policy, NOW)).toEqual([]);
  });

  it('a zero-month policy still catches a passport that has actually expired', () => {
    const people = peopleWith([doc({ expiresOn: '2026-10-12' })]);
    const gates = documentGates(trip(INTERNATIONAL), people, { internationalPassportMonths: 0 }, NOW);
    expect(gates.map(g => g.kind)).toEqual(['expired', 'expired']);
  });
});

describe('an expiring passport on an international trip', () => {
  // The definition of done: S. Reyes, passport expiring 12 Oct, London leg on 16 Oct.
  const people = peopleWith([doc({ expiresOn: '2026-10-12' })]);
  const gates = documentGates(trip(INTERNATIONAL), people, DEFAULT_DOCUMENT_POLICY, NOW);

  it('blocks every international leg they are aboard, not just the first', () => {
    expect(gates).toHaveLength(2);
    expect(gates.map(g => g.legIndex)).toEqual([0, 1]);
    expect(new Set(gates.map(g => g.personName))).toEqual(new Set(['S. Reyes']));
  });

  it('says the document had already lapsed, not merely that it was short', () => {
    expect(gates[0].kind).toBe('expired');
    expect(gates[0].reason).toContain('12 Oct');
  });

  it('leaves the other passengers alone', () => {
    expect(gates.some(g => g.personName === 'A. Reyes')).toBe(false);
  });
});

describe('the six-month rule', () => {
  it('flags a passport valid on the day but short of the policy window', () => {
    // Valid until 1 Dec 2026 — past the 16 Oct leg, but under six months from it.
    const people = peopleWith([doc({ expiresOn: '2026-12-01' })]);
    const gates = documentGates(trip(INTERNATIONAL), people, DEFAULT_DOCUMENT_POLICY, NOW);
    expect(gates).toHaveLength(2);
    expect(gates[0].kind).toBe('short-validity');
    expect(gates[0].reason).toContain('department policy');
  });

  it('raises nothing at all on a domestic leg, not even an expired passport', () => {
    // A US-domestic leg crosses no border. Gating it on a passport — or worse, on a lapsed visa for
    // a country it is nowhere near — is noise, and noise is how a gate gets clicked past.
    const short = peopleWith([doc({ expiresOn: '2026-12-01' })]);
    expect(documentGates(trip(DOMESTIC), short, DEFAULT_DOCUMENT_POLICY, NOW)).toEqual([]);
    const lapsed = peopleWith([doc({ expiresOn: '2026-10-12' })]);
    expect(documentGates(trip(DOMESTIC), lapsed, DEFAULT_DOCUMENT_POLICY, NOW)).toEqual([]);
    const visa = peopleWith([doc({ id: 'v1', kind: 'visa', label: 'Visa — CHN', expiresOn: '2026-09-10' })]);
    expect(documentGates(trip(DOMESTIC), visa, DEFAULT_DOCUMENT_POLICY, NOW)).toEqual([]);
  });

  it('gates the international leg of a mixed trip and leaves the domestic one alone', () => {
    const people = peopleWith([doc({ expiresOn: '2026-10-12' })]);
    const mixed = trip([['KLUK', 'KBED', '2026-10-14'], ['KBED', 'EGLL', '2026-10-16']]);
    const gates = documentGates(mixed, people, DEFAULT_DOCUMENT_POLICY, NOW);
    expect(gates.map(g => g.legIndex)).toEqual([1]);
  });

  it('an identity card crosses no border and gates nothing', () => {
    const people = peopleWith([doc({ id: 'i1', kind: 'id', label: 'Staff ID', expiresOn: '2026-01-01' })]);
    expect(documentGates(trip(INTERNATIONAL), people, DEFAULT_DOCUMENT_POLICY, NOW)).toEqual([]);
  });

  it('measures from the LEG, not from today — a trip far out is not saved by the clock', () => {
    const people = peopleWith([doc({ expiresOn: '2027-01-01' })]);
    // Six months past a 16 Oct 2026 leg is 16 Apr 2027, so a 1 Jan 2027 passport is short —
    // even though it is comfortably more than six months from today.
    expect(documentGates(trip(INTERNATIONAL), people, DEFAULT_DOCUMENT_POLICY, NOW)).toHaveLength(2);
  });

  it('a visa is checked against the leg date only — the window is a passport rule, and the copy admits we cannot tell the country', () => {
    const people = peopleWith([
      doc({ expiresOn: '2031-01-01' }),
      doc({ id: 'v1', kind: 'visa', label: 'Visa — GBR', expiresOn: '2026-12-01' }),
    ]);
    // The visa outlives the leg, so nothing is raised despite being inside six months.
    expect(documentGates(trip(INTERNATIONAL), people, DEFAULT_DOCUMENT_POLICY, NOW)).toEqual([]);
    const lapsed = peopleWith([
      doc({ expiresOn: '2031-01-01' }),
      doc({ id: 'v1', kind: 'visa', label: 'Visa — GBR', expiresOn: '2026-10-12' }),
    ]);
    const gates = documentGates(trip(INTERNATIONAL), lapsed, DEFAULT_DOCUMENT_POLICY, NOW);
    expect(gates.map(g => g.kind)).toEqual(['expired', 'expired']);
    expect(gates[0].reason).toContain('does not enter that country');
  });
});

describe('what is NOT a gate', () => {
  it('a person with no documents raises nothing here — absence is not expiry', () => {
    expect(documentGates(trip(INTERNATIONAL), peopleWith([]), DEFAULT_DOCUMENT_POLICY, NOW)).toEqual([]);
  });

  it('a positioning leg carries nobody, so it gates nobody', () => {
    const people = peopleWith([doc({ expiresOn: '2026-10-12' })]);
    const t = trip(INTERNATIONAL);
    const positioning = { ...t, legs: t.legs.map(l => ({ ...l, positioning: true })) };
    expect(documentGates(positioning, people, DEFAULT_DOCUMENT_POLICY, NOW)).toEqual([]);
  });

  it('a leg with no date cannot be measured against, so it raises nothing', () => {
    const people = peopleWith([doc({ expiresOn: '2026-10-12' })]);
    const t = trip(INTERNATIONAL);
    const undated = { ...t, legs: t.legs.map(l => ({ ...l, date: null })) };
    expect(documentGates(undated, people, DEFAULT_DOCUMENT_POLICY, NOW)).toEqual([]);
  });
});

describe('scheduling overrides a gate with a reason', () => {
  const people = peopleWith([doc({ expiresOn: '2026-10-12' })]);
  const base = trip(INTERNATIONAL);
  const gates = documentGates(base, people, DEFAULT_DOCUMENT_POLICY, NOW);

  it('every gate is blocking until someone says otherwise', () => {
    expect(blockingGates(base, gates)).toHaveLength(2);
  });

  it('an override clears exactly the gate it names, and records who and why', () => {
    const t = overrideGate(base, gateKey(gates[0]), 'Renewal booked, courier confirmed for 10 Oct', SCHED, NOW);
    expect(blockingGates(t, gates)).toHaveLength(1);
    const ov = gateOverrides(t);
    expect(ov).toHaveLength(1);
    expect(ov[0].reason).toContain('Renewal booked');
    expect(ov[0].by.name).toBe('R. Calloway');
    expect(t.events.some(e => e.kind === 'gate-overridden')).toBe(true);
  });

  it('refuses an empty reason — an override with no reason is not a decision', () => {
    expect(overrideGate(base, gateKey(gates[0]), '   ', SCHED, NOW)).toBe(base);
  });

  it('only scheduling may override', () => {
    expect(overrideGate(base, gateKey(gates[0]), 'because', EA, NOW)).toBe(base);
  });

  it('a second override of the same gate changes nothing', () => {
    const once = overrideGate(base, gateKey(gates[0]), 'a reason', SCHED, NOW);
    expect(overrideGate(once, gateKey(gates[0]), 'a reason', SCHED, NOW)).toBe(once);
  });

  it('an override does not travel to a different person or leg', () => {
    const t = overrideGate(base, gateKey(gates[0]), 'a reason', SCHED, NOW);
    const stillBlocking = blockingGates(t, gates);
    expect(stillBlocking[0].legIndex).toBe(1);
  });
});

describe('the gate refuses the freeze (canvas Q4)', () => {
  const people = peopleWith([doc({ expiresOn: '2026-10-12' })]);
  const CTX = { places: SEED_PLACES, blurbs: {} };
  const base = trip(INTERNATIONAL);
  const gates = documentGates(base, people, DEFAULT_DOCUMENT_POLICY, NOW);

  it('declines while a gate is unresolved, returning the very same trip', () => {
    const out = freezeSheet(base, CTX, NOW, SCHED, blockingGates(base, gates));
    expect(out).toBe(base);
    expect(latestSheet(out)).toBeFalsy();
  });

  it('records nothing on a refusal — the T-72 clock retries every minute', () => {
    const out = freezeSheet(base, CTX, NOW, SCHED, blockingGates(base, gates));
    expect(out.events).toHaveLength(base.events.length);
  });

  it('freezes the moment every gate is overridden', () => {
    let t = base;
    for (const g of gates) t = overrideGate(t, gateKey(g), 'Renewal booked', SCHED, NOW);
    expect(blockingGates(t, gates)).toHaveLength(0);
    const out = freezeSheet(t, CTX, NOW, SCHED, blockingGates(t, gates));
    expect(latestSheet(out)).toBeTruthy();
  });

  it('one override of two is not enough — the sheet still will not freeze', () => {
    const t = overrideGate(base, gateKey(gates[0]), 'Renewal booked', SCHED, NOW);
    expect(freezeSheet(t, CTX, NOW, SCHED, blockingGates(t, gates))).toBe(t);
  });

  it('freezes normally when there are no gates at all', () => {
    const clean = trip(DOMESTIC);
    expect(latestSheet(freezeSheet(clean, CTX, NOW, SCHED, []))).toBeTruthy();
  });
});
