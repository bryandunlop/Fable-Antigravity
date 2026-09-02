// The principal reserve, from the trips module's side (D107).
//
// "The plane always has to be available for the CEO." The passenger database marks who the
// principal is; this turns the principal's own trips into the set of days they are AWAY, and
// picks the candidate tails by cabin from the fleet register. The availability engine does the
// reserving. Pure: callers pass trips and settings.

import { CORE_FLEET } from '../../../fleet/registry';
import type { Trip } from './trip';
import type { PrincipalReserve } from '../../../availability/engine/availability';

export interface PrincipalReserveSetting {
  enabled: boolean;
  /** Passenger display name, as it appears on trips. */
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

/** Days the principal is travelling — any live trip that carries their name. */
export function principalAwayDates(trips: Trip[], name: string): string[] {
  const days = new Set<string>();
  for (const t of trips) {
    if (!t.passengerNames.includes(name)) continue;
    for (const d of tripDays(t)) days.add(d);
  }
  return Array.from(days).sort();
}

export function candidateTails(cabin: PrincipalReserveSetting['cabin']): string[] {
  return CORE_FLEET.filter(a => cabin === 'any' || a.cabin === cabin).map(a => a.tail);
}

export function principalReserveInput(trips: Trip[], setting: PrincipalReserveSetting): PrincipalReserve | undefined {
  if (!setting.enabled || !setting.name.trim()) return undefined;
  return { name: setting.name, candidateTails: candidateTails(setting.cabin), awayDates: principalAwayDates(trips, setting.name) };
}
