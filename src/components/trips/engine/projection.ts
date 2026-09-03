// The booking, projected into the scheduling store's shape — faithfully (D110 slice 1).
//
// There is ONE trip: the booking (`Trip`). The command center, the checklist engine and the
// availability engine read `TripRecord`s, so every booking that occupies a tail is projected
// into that shape here. Faithful means: the booking's leg ids survive (a checklist item stamped
// with a legId points back at the booking leg), the trip type is derived from the route rather
// than forced to 'domestic', and a cancelled booking projects as a cancelled record so the store
// releases the tail. Pure.

import type { TripRecord, TripLegRecord } from '../../../scheduling/store/types';
import type { TripType } from '../../../scheduling/engine';
import { legClock, icaoOf } from './legClock';
import { aircraftFor } from '../../../fleet/registry';
import { SCHEDULING_DECIDES } from './places';
import type { Trip } from './trip';

/**
 * Which per-trip checklist the booking gets. A demo heuristic on ICAO prefixes, standing in for
 * a route-class model that does not exist yet: KDCA anywhere on the route is the DASSP checklist,
 * any non-US field is international, otherwise domestic.
 */
export function tripTypeOf(trip: Trip): TripType {
  const fields = trip.legs.flatMap(l => [l.from.airport, l.to.airport]).filter((a): a is string => !!a && a !== SCHEDULING_DECIDES);
  if (fields.some(a => a === 'KDCA')) return 'dca_dassp';
  if (fields.some(a => !a.startsWith('K'))) return 'international';
  return 'domestic';
}

function statusOf(trip: Trip): TripRecord['status'] | null {
  switch (trip.status) {
    // A submitted booking with a tail is not yet confirmed to the EA, but the tail is spoken for.
    case 'submitted':
    case 'confirmed': return 'confirmed';
    case 'declined':
    case 'cancelled': return 'cancelled';
    default: return null;
  }
}

export function tripToRecord(trip: Trip): TripRecord | null {
  const status = statusOf(trip);
  if (!trip.tail || !status) return null;
  const aboard = trip.passengerIds?.length ?? trip.passengerNames.length;
  const legs: TripLegRecord[] = [];
  trip.legs.forEach((l, i) => {
    const dep = icaoOf(l.from.airport), arr = icaoOf(l.to.airport);
    const clock = legClock(l);
    if (!clock || !dep || !arr) return;
    legs.push({ id: l.id, sequence: i + 1, departureIcao: dep, arrivalIcao: arr, departureTimeUtc: clock.depUtc, arrivalTimeUtc: clock.arrUtc, paxCount: l.positioning ? 0 : aboard });
  });
  if (legs.length === 0) return null;
  const dates = trip.legs.map(l => l.date).filter((d): d is string => !!d).sort();
  // Who is aboard, as records — only when the names have resolved to ids (Phase 5 slice 2); a
  // name with no record yet is not a person an item can be bound to.
  const people = trip.passengerIds && trip.passengerIds.length === trip.passengerNames.length
    ? trip.passengerIds.map((id, i) => ({ id, name: trip.passengerNames[i] }))
    : undefined;
  return {
    id: trip.id, tripNumber: trip.title, sourceSystem: 'manual', sourceTripRef: null,
    tail: trip.tail, aircraftType: aircraftFor(trip.tail)?.type ?? 'G500', tripType: tripTypeOf(trip), priority: 'standard',
    status,
    startDate: `${dates[0]}T00:00:00.000Z`, endDate: `${dates[dates.length - 1]}T23:59:59.000Z`,
    legs, ...(people ? { people } : {}), crew: trip.crew, lead: trip.leadPassengerName, createdBy: trip.createdBy.name, createdAtUtc: trip.createdAt,
  };
}

export const tripsToRecords = (trips: Trip[]): TripRecord[] => trips.map(tripToRecord).filter((r): r is TripRecord => !!r);
