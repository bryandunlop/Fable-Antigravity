// The principal reserve, from the trips module's side (D107).
//
// "The plane always has to be available for the CEO." The passenger database marks who the
// principal is; this turns the principal's own trips into the set of days they are AWAY, and
// picks the candidate tails by cabin from the fleet register. The availability engine does the
// reserving. Pure: callers pass trips and settings.

import { CORE_FLEET } from '../../../fleet/registry';
import { personById, principalOf, type Person } from './people';
import type { Trip } from './trip';
import type { PrincipalReserve } from '../../../availability/engine/availability';

export interface PrincipalReserveSetting {
  enabled: boolean;
  /**
   * LEGACY, migration only. The principal is a FLAG ON THE PERSON RECORD (`Person.principal`), not
   * a name in settings — a name here stopped matching the moment anyone was renamed, and the
   * reserve then silently released the aircraft with nothing on screen to say why (Phase 5 slice 2).
   * `data/peopleStore.migrateSettingsOntoPeople` reads this once and then it means nothing.
   */
  name: string;
  cabin: 'big' | 'standard' | 'any';
}

export const DEFAULT_PRINCIPAL_RESERVE: PrincipalReserveSetting = { enabled: true, name: 'A. Reyes', cabin: 'big' };

/** Every UTC day key from the trip's first leg date to its last, inclusive. Drafts do not count. */
export function tripDays(trip: Trip): string[] {
  if (trip.status === 'draft' || trip.status === 'declined') return [];
  const dates = trip.legs.map(l => l.date).filter((d): d is string => !!d).sort();
  if (dates.length === 0) return [];
  const out: string[] = [];
  const start = Date.parse(`${dates[0]}T00:00:00.000Z`);
  const end = Date.parse(`${dates[dates.length - 1]}T00:00:00.000Z`);
  for (let ms = start; ms <= end; ms += 86_400_000) out.push(new Date(ms).toISOString().slice(0, 10));
  return out;
}

/**
 * Days the principal is travelling — any live trip that carries them.
 *
 * Matched by ID where the trip has resolved passenger ids, falling back to the display name for a
 * trip written before ids existed. The fallback is what keeps an old trip counted; the id path is
 * what keeps a renamed principal counted.
 */
export function principalAwayDates(trips: Trip[], person: Person): string[] {
  const days = new Set<string>();
  for (const t of trips) {
    const aboard = t.passengerIds?.length
      ? t.passengerIds.includes(person.id)
      : t.passengerNames.includes(person.name);
    if (!aboard) continue;
    for (const d of tripDays(t)) days.add(d);
  }
  return Array.from(days).sort();
}

export function candidateTails(cabin: PrincipalReserveSetting['cabin']): string[] {
  return CORE_FLEET.filter(a => cabin === 'any' || a.cabin === cabin).map(a => a.tail);
}

/**
 * The reserve, or undefined when it is off or nobody is marked as the principal. `personId` may be
 * passed to reserve for someone other than the flagged principal; by default it is whoever carries
 * `principal: true` on their record.
 */
export function principalReserveInput(
  trips: Trip[],
  people: Person[],
  setting: PrincipalReserveSetting,
  personId?: string,
): PrincipalReserve | undefined {
  if (!setting.enabled) return undefined;
  const person = personId ? personById(people, personId) : principalOf(people);
  if (!person) return undefined;
  return { name: person.name, candidateTails: candidateTails(setting.cabin), awayDates: principalAwayDates(trips, person) };
}
