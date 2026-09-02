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
/**
 * Set once the name-keyed settings have been folded onto the records. Load-bearing: without it the
 * migration re-ran on every mount of `TripsProvider` — which is every navigation to /trips or
 * /people — and the stale `settings.passengerPrefs` overwrote whatever scheduling had just edited
 * on the record. `loadSettings()` returns DEFAULT_SETTINGS when storage is empty, so those old
 * preferences are never absent and the revert was silent and permanent. (Fresh review, 2026-09-02.)
 */
const MIGRATED_KEY = 'trip-people-migrated';

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
 * Fold the name-keyed settings that used to hold this data onto the records. ONE SHOT — see
 * `MIGRATED_KEY`; `loadLinkedRegister` is what enforces that, this function is the pure half.
 *
 * A name in the old settings that matches nobody is IGNORED rather than creating a person: a stale
 * preference for a name that no longer exists should not resurrect them as a passenger.
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

/** Has the one-shot settings migration already run in this browser? */
export function hasMigrated(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(MIGRATED_KEY) === VERSION;
}

export function markMigrated(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(MIGRATED_KEY, VERSION);
}

/**
 * The register and the trips, loaded, migrated, linked and persisted — in one place.
 *
 * Two call sites need this (`TripsProvider` on mount, and `availability/source` for the principal
 * reserve when no trips page is open). They previously each ran their own copy of the sequence and
 * only one of them persisted the result, which meant the rule "the backfill must happen before
 * anyone is renamed" depended on which page you opened first. (Fresh review, 2026-09-02.)
 */
export function loadLinkedRegister<T extends TripLike>(
  loadTripsFn: () => T[],
  saveTripsFn: (t: T[]) => void,
  settingsPrefs: PassengerPref[] | undefined,
  settingsPrincipalName: string | undefined,
  nowUtc: string,
): { trips: T[]; people: Person[] } {
  const stored = loadPeople();
  const migrated = hasMigrated()
    ? stored
    : migrateSettingsOntoPeople(stored, settingsPrefs, settingsPrincipalName);
  const linked = backfillPassengerIds(loadTripsFn(), migrated, nowUtc);
  if (linked.trips !== undefined) saveTripsFn(linked.trips);
  savePeople(linked.people);
  markMigrated();
  return linked;
}

/** The slice of a trip this module links. Structural, so the store stays free of trip logic. */
export interface TripLike { passengerNames: string[]; passengerIds?: string[] }
