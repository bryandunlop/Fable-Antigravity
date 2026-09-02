// THIN localStorage wrapper for the people register (Phase 5 slice 2, D109).
//
// The migration is the interesting part: before this, a person's briefing preference lived in trip
// settings keyed by display name (`passengerPrefs`), and the principal reserve named a person in a
// string (`principalReserve.name`, D107). Both move onto the record here, once, on first load.

import { SEED_PEOPLE, upsertPerson, setPrincipal, personByName, resolvePassengers, type Person } from '../engine/people';
import type { PassengerPref } from '../engine/briefingEmail';

const KEY = 'trip-people-state';
const VERSION_KEY = 'trip-people-version';
const VERSION = '1';

export function loadPeople(): Person[] {
  if (typeof localStorage === 'undefined') return SEED_PEOPLE;
  try {
    if (localStorage.getItem(VERSION_KEY) !== VERSION) return SEED_PEOPLE;
    const raw = localStorage.getItem(KEY);
    if (!raw) return SEED_PEOPLE;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return SEED_PEOPLE;
    return parsed as Person[];
  } catch {
    return SEED_PEOPLE;
  }
}

export function savePeople(people: Person[]): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(people));
  localStorage.setItem(VERSION_KEY, VERSION);
}

/**
 * Fold the name-keyed settings that used to hold this data onto the records.
 *
 * Pure and idempotent, so it is safe to run on every load: a preference already on the record is
 * only overwritten when the old settings still carry one for that name, and a name in the old
 * settings that matches nobody is IGNORED rather than creating a person — a stale preference for a
 * name that no longer exists should not resurrect them as a passenger.
 */
export function migrateSettingsOntoPeople(
  people: Person[],
  prefs: PassengerPref[] | undefined,
  principalName: string | undefined,
): Person[] {
  let out = people;
  for (const p of prefs ?? []) {
    const person = personByName(out, p.name);
    if (!person) continue;
    out = upsertPerson(out, { ...person, briefingPref: p.pref, hasFlown: p.hasFlown });
  }
  const principal = principalName ? personByName(out, principalName) : undefined;
  if (principal) out = setPrincipal(out, principal.id);
  return out;
}

/**
 * Give every trip written before Phase 5 slice 2 its `passengerIds`.
 *
 * Without this the whole slice is half-done. A trip that carries only NAMES is linked to a person
 * by string match, so the first rename silently detaches it: the person's page showed "0 trips",
 * and — worse, because nothing renders it — `principalAwayDates` stopped finding the principal's
 * own trips and the reserve would hold an aircraft on days they were already flying. Caught by
 * renaming A. Reyes in the browser, 2026-09-02.
 *
 * The backfill must run BEFORE anyone is renamed, which is why it happens on load: at that moment
 * the names on the trips and the names on the records are still the same strings.
 *
 * This adds a derived index, not a fact: it records no new event on the trip, because linking a
 * name already on the record to the person it always meant is not something that happened.
 */
export function backfillPassengerIds<T extends { passengerNames: string[]; passengerIds?: string[] }>(
  trips: T[],
  people: Person[],
  nowUtc: string,
): { trips: T[]; people: Person[] } {
  let register = people;
  let changed = false;
  const out = trips.map(t => {
    if (t.passengerIds?.length || t.passengerNames.length === 0) return t;
    const r = resolvePassengers(register, t.passengerNames, nowUtc);
    register = r.people;
    // Only store ids that line up one-for-one, for the same reason `setPassengers` does.
    if (r.ids.length !== t.passengerNames.length) return t;
    changed = true;
    return { ...t, passengerIds: r.ids };
  });
  return changed || register !== people ? { trips: changed ? out : trips, people: register } : { trips, people };
}
