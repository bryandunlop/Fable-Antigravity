// Crew capacity per day — how many crews the department can actually field.
//
// DEMO STAND-IN, and the honest limits are worth stating: TripRecord carries no crew fields, and
// the myairops Schedule API (which holds crew duties) has no captured spec, so nothing here is
// backed by a real roster or a real assignment. What this replaces is worse — a flat
// DEMO_CREW_CAPACITY constant compared against a trip count, which could say "no crew" but never
// say why. This can say why.
//
// It is NOT an FDP calculation. Duty limits are compared as a simple used-vs-limit number and
// rest is a coverage status someone set, not a computed rest requirement. `crewAssignments` is
// the seam where a real assignment feed lands.

import type { CrewDayCoverage, CrewRecord } from '../../components/crew/crewRecords';
import type { TripRecord } from '../../scheduling/store/types';

const DAY_MS = 86_400_000;

export interface CrewDayCapacity {
  dateUtc: string;
  picAvailable: number;
  sicAvailable: number;
  /** One crew is one PIC plus one SIC, so capacity is the scarcer seat. */
  crewsFormable: number;
  crewsCommitted: number;
  /** Never negative — an over-committed day has zero free, not minus one. */
  crewsFree: number;
  overCommitted: boolean;
}

export interface CrewAssignment {
  tripId: string;
  crewIds: string[];
}

function utcDayKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** A date-keyed expiry has lapsed once the day has started. */
function lapsedBy(expiresUtc: string | null, dayStartMs: number): boolean {
  if (!expiresUtc) return false;
  const ms = Date.parse(expiresUtc);
  return !Number.isNaN(ms) && ms <= dayStartMs;
}

/** Trips still consuming crew — cancelled and flown trips make no demand. */
function demandTrips(trips: TripRecord[]): TripRecord[] {
  return trips.filter(t => t.status !== 'cancelled' && t.status !== 'completed');
}

export function crewCapacityByDay(
  roster: CrewRecord[],
  coverage: CrewDayCoverage[],
  trips: TripRecord[],
  nowUtc: string,
  days: number,
  assignments?: CrewAssignment[],
): CrewDayCapacity[] {
  const todayStartMs = Date.parse(`${utcDayKey(Date.parse(nowUtc))}T00:00:00.000Z`);

  // crewId -> set of dates that person is NOT available.
  const unavailableBy = new Map<string, Set<string>>();
  for (const c of coverage) {
    if (c.status === 'available') continue;
    let set = unavailableBy.get(c.crewId);
    if (!set) unavailableBy.set(c.crewId, (set = new Set()));
    set.add(c.dateUtc);
  }

  // date -> trip ids spanning it. A trip holds its crew for its whole span; the crew is
  // wherever the plane is.
  const tripsByDay = new Map<string, Set<string>>();
  for (const t of demandTrips(trips)) {
    const startMs = Date.parse(t.startDate);
    const endMs = Date.parse(t.endDate);
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) continue;
    for (let ms = Date.parse(`${utcDayKey(startMs)}T00:00:00.000Z`); ms <= endMs; ms += DAY_MS) {
      const key = utcDayKey(ms);
      let set = tripsByDay.get(key);
      if (!set) tripsByDay.set(key, (set = new Set()));
      set.add(t.id);
    }
  }

  const assignedCrewByTrip = new Map(assignments?.map(a => [a.tripId, a.crewIds]) ?? []);

  return Array.from({ length: days }, (_, i) => {
    const dayStartMs = todayStartMs + i * DAY_MS;
    const dateUtc = utcDayKey(dayStartMs);
    const tripIds = tripsByDay.get(dateUtc) ?? new Set<string>();

    // Anyone explicitly assigned to a trip that day is flying it, so they are not free for
    // another. Where no assignment exists the trip still consumes a notional crew below.
    const flyingToday = new Set<string>();
    for (const tripId of tripIds) {
      for (const crewId of assignedCrewByTrip.get(tripId) ?? []) flyingToday.add(crewId);
    }

    const free = roster.filter(r => {
      if (unavailableBy.get(r.id)?.has(dateUtc)) return false;
      if (flyingToday.has(r.id)) return false;
      if (r.dutyHoursUsed >= r.dutyLimitHours) return false;
      if (lapsedBy(r.currencyExpiresUtc, dayStartMs)) return false;
      if (lapsedBy(r.medicalExpiresUtc, dayStartMs)) return false;
      return true;
    });

    const picAvailable = free.filter(r => r.role === 'PIC').length;
    const sicAvailable = free.filter(r => r.role === 'SIC').length;
    const crewsFormable = Math.min(picAvailable, sicAvailable);
    const crewsCommitted = tripIds.size;

    return {
      dateUtc,
      picAvailable,
      sicAvailable,
      crewsFormable,
      crewsCommitted,
      crewsFree: Math.max(0, crewsFormable - crewsCommitted),
      overCommitted: crewsCommitted > crewsFormable,
    };
  });
}
