/**
 * A person is a record, not a string.
 *
 * Everything about a passenger was keyed by their DISPLAY NAME: `Trip.passengerNames`, the briefing
 * preference in trip settings (`passengerPrefs[].name`), the principal reserve
 * (`principalReserve.name`, D107). Rename anyone — a marriage, a correction, "A. Reyes" becoming
 * "Alexandra Reyes" — and the reserve stops reserving, the email stops sending, and nothing in the
 * app says so. Bryan chose the C plan on 2026-09-02, and answered the canvas's Q3: **`/people` owns
 * the person record and the Passenger Forms module reads it.** (Phase 5 slice 2, D109, LG-365.)
 *
 * WHAT THIS RECORD IS: who they are to the flight department — identity, who books for them, their
 * travel documents, their forms, whether they want the briefing email, the preferences scheduling
 * types in a sentence.
 *
 * WHAT IT IS NOT: the cabin profile the flight attendants keep (`components/passengers/`) — the
 * allergies, the comfort settings, the galley notes. That is a separate record for a separate
 * audience, and today the two hold DISJOINT sets of people (this one has A. Reyes and M. Osei; that
 * one has Robert Johnson and Sarah Chen). Merging them now would mean inventing which is which.
 * The link is a `personId` on the cabin profile when someone can say who maps to whom.
 *
 * Pure. No React, no storage, no clock — callers pass `nowUtc`.
 */

import type { BriefingPref } from './briefingEmail';

/** Re-exported so the people surfaces need not reach into the email engine for a person's field. */
export type BriefingPrefValue = BriefingPref;

export type PersonKind = 'principal' | 'guest' | 'staff';

/** How far the current EA may act for this person. Carried over from the old portal's model. */
export type EaLevel = 'view' | 'book' | 'full';

export type FormStatus = 'approved' | 'in-review' | 'resubmit' | 'none';

export type DocumentKind = 'passport' | 'visa' | 'id';

export interface TravelDocument {
  id: string;
  kind: DocumentKind;
  /** What a person calls it: "Passport — USA". */
  label: string;
  /** ISO-3166 alpha-3, or null when it is not a country document. */
  country: string | null;
  /** Never the full number. The demo holds no real document numbers and neither should this. */
  numberMasked: string;
  /** "YYYY-MM-DD". A date, not an instant — a passport expires on a day, in no time zone. */
  expiresOn: string;
}

export interface Person {
  id: string;
  name: string;
  kind: PersonKind;
  /**
   * The one person the aircraft is always kept for (D107). A flag on the record rather than a name
   * in settings, so the reserve survives a rename.
   */
  principal: boolean;
  /** The EA who books for them, by display name. Null for a guest nobody books for. */
  ea: string | null;
  email: string | null;
  briefingPref: BriefingPref;
  /**
   * Whether they have flown with us — what a 'first' briefing preference turns off.
   *
   * DERIVED, not authored: `withFlownDerived` recomputes it from the trip records, because nothing
   * ever set it and a 'first trip only' preference could therefore never turn off — every guest
   * created from a typed name started `false` and stayed there forever (fresh review, 2026-09-02).
   * The stored value survives only as the seed's starting point and as the answer for a person the
   * trip records say nothing about.
   */
  hasFlown: boolean;
  forms: { status: FormStatus; note?: string };
  documents: TravelDocument[];
  /** Scheduling's own sentence about them. Free text on purpose. */
  prefs: string | null;
  eaLevel?: EaLevel;
  /**
   * Created by the system from a name typed on a trip, never confirmed by a human. Their documents
   * and forms are empty because nobody has asked, NOT because there is nothing to ask — the gates
   * in slice 3 must be able to tell those apart.
   */
  unverified?: boolean;
}

/** Normalised for matching: a person typed as "  a. reyes " is the same person. */
const key = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');

export function personById(people: Person[], id: string): Person | undefined {
  return people.find(p => p.id === id);
}

export function personByName(people: Person[], name: string): Person | undefined {
  const k = key(name);
  return people.find(p => key(p.name) === k);
}

export function principalOf(people: Person[]): Person | undefined {
  return people.find(p => p.principal);
}

/** Replace a person by id, or append when they are new. Never mutates. */
export function upsertPerson(people: Person[], person: Person): Person[] {
  return people.some(p => p.id === person.id)
    ? people.map(p => (p.id === person.id ? person : p))
    : [...people, person];
}

/** A rename touches the name and nothing else — the id is what every reference holds. */
export function renamePerson(people: Person[], id: string, name: string): Person[] {
  const next = name.trim();
  const current = personById(people, id);
  if (!next || !current || current.name === next) return people;
  return upsertPerson(people, { ...current, name: next });
}

/**
 * Only one person may be the principal. Setting a new one clears the old, so the reserve can never
 * be ambiguous about who it is holding an aircraft for.
 */
export function setPrincipal(people: Person[], id: string): Person[] {
  if (!personById(people, id)) return people;
  return people.map(p => (p.principal === (p.id === id) ? p : { ...p, principal: p.id === id }));
}

/** Stable-enough id for a demo; the shape (`per-…`) is what makes a record recognisable in storage. */
function newPersonId(name: string, nowUtc: string): string {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'person';
  return `per-${slug}-${Date.parse(nowUtc).toString(36)}`;
}

export interface ResolvedPassengers {
  /** The register, including anyone this call had to create. Store this, not the input. */
  people: Person[];
  /** One id per input name, in the order given. */
  ids: string[];
  /** Records created for names nobody knew. Surface these — they are unverified. */
  created: Person[];
}

/**
 * Names in, ids out. A name we do not know becomes an unverified guest rather than being dropped:
 * an EA types a guest's name long before anyone opens a record for them, and losing that name is
 * how a person ends up aboard with no forms and no document check.
 */
export function resolvePassengers(people: Person[], names: string[], nowUtc: string): ResolvedPassengers {
  let register = people;
  const created: Person[] = [];
  const ids: string[] = [];
  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    const existing = personByName(register, name);
    if (existing) { ids.push(existing.id); continue; }
    const person: Person = {
      id: newPersonId(name, nowUtc),
      name,
      kind: 'guest',
      principal: false,
      ea: null,
      email: null,
      briefingPref: 'first',
      hasFlown: false,
      forms: { status: 'none' },
      documents: [],
      prefs: null,
      unverified: true,
    };
    register = upsertPerson(register, person);
    created.push(person);
    ids.push(person.id);
  }
  return { people: register, ids, created };
}

export function briefingPrefFor(people: Person[], id: string): BriefingPref | null {
  return personById(people, id)?.briefingPref ?? null;
}

/**
 * Who this trip's email actually goes to, by name as it should be printed. Reads the person, so a
 * rename changes the address list's rendering and nothing about who is on it.
 */
export function recipientNames(people: Person[], ids: string[]): string[] {
  const out: string[] = [];
  for (const id of ids) {
    const p = personById(people, id);
    if (!p) continue;                                  // an id with no record addresses nobody
    if (p.briefingPref === 'never') continue;
    if (p.briefingPref === 'first' && p.hasFlown) continue;
    out.push(p.name);
  }
  return out;
}

export interface ExpiringDocument {
  personId: string;
  personName: string;
  document: TravelDocument;
}

/**
 * Documents held by these people that lapse before `beforeDate` ("YYYY-MM-DD"). Date-string
 * comparison is exact for ISO dates and avoids inventing a time zone for a document that has none.
 *
 * A person with NO documents produces nothing here. That is the honest answer to "does anything
 * expire" — and deliberately not the answer to "is this person cleared to fly", which slice 3 asks
 * separately, because an empty list means nobody asked.
 */
export function documentsExpiringBefore(people: Person[], ids: string[], beforeDate: string): ExpiringDocument[] {
  const out: ExpiringDocument[] = [];
  for (const id of ids) {
    const p = personById(people, id);
    if (!p) continue;
    for (const d of p.documents) {
      if (d.expiresOn < beforeDate) out.push({ personId: p.id, personName: p.name, document: d });
    }
  }
  return out;
}

const daysFromNow = (n: number): string =>
  new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

/**
 * The people the demo's trips already name, lifted from the old booking portal's seed so the two
 * halves of the demo agree about who exists. The briefing preferences are the ones that used to sit
 * in trip settings as `passengerPrefs`.
 */
export const SEED_PEOPLE: Person[] = [
  {
    id: 'P-REYES', name: 'A. Reyes', kind: 'principal', principal: true,
    ea: 'Dana Whitfield', eaLevel: 'full', email: 'a.reyes@example.com',
    briefingPref: 'never', hasFlown: true,
    forms: { status: 'resubmit', note: 'Emergency-contact section is blank — resubmit with it filled.' },
    prefs: 'Window seat · no shellfish · car at destination by default',
    documents: [
      { id: 'D1', kind: 'passport', label: 'Passport — USA', country: 'USA', numberMasked: '••• 4821', expiresOn: '2031-03-15' },
      { id: 'D2', kind: 'passport', label: 'Passport — IRL', country: 'IRL', numberMasked: '••• 0937', expiresOn: daysFromNow(120) },
      { id: 'D3', kind: 'visa', label: 'Visa — CHN (USA passport)', country: 'CHN', numberMasked: '••• 1178', expiresOn: daysFromNow(8) },
    ],
  },
  {
    id: 'P-OSEI', name: 'M. Osei', kind: 'principal', principal: false,
    ea: 'Dana Whitfield', eaLevel: 'book', email: 'm.osei@example.com',
    briefingPref: 'never', hasFlown: true,
    forms: { status: 'approved' },
    prefs: 'Aisle seat · sparkling water on board',
    documents: [
      { id: 'D4', kind: 'passport', label: 'Passport — USA', country: 'USA', numberMasked: '••• 2210', expiresOn: '2033-06-30' },
    ],
  },
  {
    id: 'P-LINDQVIST', name: 'J. Lindqvist', kind: 'principal', principal: false,
    ea: 'Dana Whitfield', eaLevel: 'view', email: 'j.lindqvist@example.com',
    briefingPref: 'first', hasFlown: true,
    forms: { status: 'approved' },
    prefs: null,
    documents: [
      { id: 'D5', kind: 'passport', label: 'Passport — SWE', country: 'SWE', numberMasked: '••• 8853', expiresOn: '2030-01-12' },
    ],
  },
  {
    id: 'P-SREYES', name: 'S. Reyes', kind: 'guest', principal: false,
    ea: null, email: 's.reyes@example.com',
    briefingPref: 'every', hasFlown: false,
    forms: { status: 'none' },
    prefs: null,
    // Lapses four days before the London trip departs — the D109 slice 3 case, so the demo has a
    // real gate to refuse a freeze over rather than a hypothetical one.
    documents: [
      { id: 'D7', kind: 'passport', label: 'Passport — USA', country: 'USA', numberMasked: '••• 5510', expiresOn: daysFromNow(40) },
    ],
  },
  {
    id: 'P-TANAKA', name: 'K. Tanaka', kind: 'staff', principal: false,
    ea: null, email: 'k.tanaka@example.com',
    briefingPref: 'first', hasFlown: true,
    forms: { status: 'approved' },
    prefs: null,
    documents: [
      { id: 'D6', kind: 'passport', label: 'Passport — USA', country: 'USA', numberMasked: '••• 6644', expiresOn: '2029-09-01' },
    ],
  },
];

/**
 * A person's history with the department, counted from the trip records — never stored on the
 * person, so it cannot drift from what actually happened.
 */
export interface PersonHistory {
  trips: number;
  /** Live trips still ahead of `nowUtc`. */
  upcoming: number;
  /** Times a trip they were on was bumped for a more senior one. */
  bumped: number;
  /** Questions their side put to scheduling on a trip they were on. */
  asked: number;
  lastFlown: { date: string; title: string } | null;
}

/** True when this trip carries the person — by id where the trip has them, else by name. */
export function tripCarries(trip: TripLike, person: Person): boolean {
  return trip.passengerIds?.length
    ? trip.passengerIds.includes(person.id)
    : trip.passengerNames.includes(person.name);
}

/** The slice of a Trip this module reads. Kept structural so `people` stays free of trip logic. */
export interface TripLike {
  id: string;
  title: string;
  status: string;
  passengerNames: string[];
  passengerIds?: string[];
  legs: Array<{ date: string | null }>;
  events: Array<{ kind: string }>;
}

export function personHistory(trips: TripLike[], person: Person, nowUtc: string): PersonHistory {
  const theirs = trips.filter(t => tripCarries(t, person) && t.status !== 'draft');
  const today = nowUtc.slice(0, 10);
  const datesOf = (t: TripLike) => t.legs.map(l => l.date).filter((d): d is string => !!d).sort();
  const flown = theirs
    .map(t => ({ t, dates: datesOf(t) }))
    .filter(x => x.dates.length > 0 && x.dates[x.dates.length - 1] < today)
    .sort((a, b) => b.dates[0].localeCompare(a.dates[0]));
  return {
    trips: theirs.length,
    upcoming: theirs.filter(t => { const d = datesOf(t); return d.length > 0 && d[d.length - 1] >= today; }).length,
    bumped: theirs.filter(t => t.events.some(e => e.kind === 'bumped')).length,
    asked: theirs.reduce((n, t) => n + t.events.filter(e => e.kind === 'question').length, 0),
    lastFlown: flown[0] ? { date: flown[0].dates[flown[0].dates.length - 1], title: flown[0].t.title } : null,
  };
}

/**
 * `hasFlown` recomputed from the trip records — one trip already behind them makes it true.
 *
 * Kept a derived projection rather than a stored flag, for the same reason serviceability is: a
 * flag nobody updates is a flag that lies. Nothing in the app ever set this one, so a person whose
 * preference was "only their first trip" would have been emailed on every trip forever.
 *
 * A person the trips say nothing about keeps whatever the record holds — that is the seed's answer,
 * and the honest one for someone with no history to read.
 */
export function withFlownDerived(people: Person[], trips: TripLike[], nowUtc: string): Person[] {
  const today = nowUtc.slice(0, 10);
  const flown = new Set<string>();
  for (const t of trips) {
    if (t.status === 'draft' || t.status === 'declined' || t.status === 'cancelled') continue;
    const dates = t.legs.map(l => l.date).filter((d): d is string => !!d).sort();
    if (dates.length === 0 || dates[dates.length - 1] >= today) continue;
    for (const p of people) if (tripCarries(t, p)) flown.add(p.id);
  }
  let changed = false;
  const out = people.map(p => {
    const next = p.hasFlown || flown.has(p.id);
    if (next === p.hasFlown) return p;
    changed = true;
    return { ...p, hasFlown: next };
  });
  return changed ? out : people;
}
