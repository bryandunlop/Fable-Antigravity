// The trips module's trips as the scheduling store sees them, and the aircraft's day (rotation).
//
// Two jobs:
//  1. `tripsAsRecords` — a confirmed trip with a tail must OCCUPY that tail in the availability
//     engine, or the fleet schedule keeps showing it open. The engine reads TripRecords; this
//     projects our records into that shape (planning departure times, estimated arrivals).
//  2. `rotationFor` — for scheduling: everything one tail does across a window, all trips, with
//     the empty legs between them, so a one-way out and a different one-way back read as one
//     aircraft day with a ferry in the middle.
// Pure.

import type { TripRecord, TripLegRecord } from '../../../scheduling/store/types';
import { legClock, icaoOf } from './legClock';
import { aircraftFor } from '../../../fleet/registry';
import type { Trip } from './trip';

export function tripAsRecord(trip: Trip): TripRecord | null {
  if (!trip.tail || (trip.status !== 'confirmed' && trip.status !== 'submitted')) return null;
  const legs: TripLegRecord[] = [];
  trip.legs.forEach((l, i) => {
    const dep = icaoOf(l.from.airport), arr = icaoOf(l.to.airport);
    const clock = legClock(l);
    if (!clock || !dep || !arr) return;
    legs.push({ id: `${trip.id}-l${i}`, sequence: i + 1, departureIcao: dep, arrivalIcao: arr, departureTimeUtc: clock.depUtc, arrivalTimeUtc: clock.arrUtc, paxCount: l.positioning ? 0 : trip.passengerNames.length });
  });
  if (legs.length === 0) return null;
  const dates = trip.legs.map(l => l.date).filter((d): d is string => !!d).sort();
  return {
    id: trip.id, tripNumber: trip.title, sourceSystem: 'manual', sourceTripRef: null,
    tail: trip.tail, aircraftType: aircraftFor(trip.tail)?.type ?? 'G500', tripType: 'domestic', priority: 'standard',
    // A submitted trip with a tail is not yet confirmed, but the tail is spoken for.
    status: 'confirmed',
    startDate: `${dates[0]}T00:00:00.000Z`, endDate: `${dates[dates.length - 1]}T23:59:59.000Z`,
    legs, createdBy: trip.createdBy.name, createdAtUtc: trip.createdAt,
  };
}

export const tripsAsRecords = (trips: Trip[]): TripRecord[] => trips.map(tripAsRecord).filter((r): r is TripRecord => !!r);

export interface RotationLeg {
  kind: 'passenger' | 'positioning' | 'ferry' | 'return';
  from: string;
  to: string;
  dateUtc: string;
  tripId: string | null;
  title: string | null;
  aboard: number;
}

/** One tail's legs across all records, in time order, with the empty legs between them. */
export function rotationFor(tail: string, records: TripRecord[], fromDate: string, toDate: string): RotationLeg[] {
  const legs = records
    .filter(r => r.tail === tail && r.status !== 'cancelled')
    .flatMap(r => r.legs.map(l => ({ r, l, ms: Date.parse(l.departureTimeUtc) })))
    .sort((a, b) => a.ms - b.ms);
  const out: RotationLeg[] = [];
  for (let i = 0; i < legs.length; i++) {
    const { r, l } = legs[i];
    const day = l.departureTimeUtc.slice(0, 10);
    const prev = legs[i - 1];
    if (prev && prev.l.arrivalIcao !== l.departureIcao) out.push({ kind: 'ferry', from: prev.l.arrivalIcao, to: l.departureIcao, dateUtc: day, tripId: null, title: null, aboard: 0 });
    out.push({ kind: l.paxCount === 0 ? 'positioning' : 'passenger', from: l.departureIcao, to: l.arrivalIcao, dateUtc: day, tripId: r.id, title: r.tripNumber, aboard: l.paxCount });
  }
  const last = legs.at(-1);
  const home = aircraftFor(tail)?.homeBase;
  if (last && home && last.l.arrivalIcao !== home) {
    const day = new Date(Date.parse(last.l.arrivalTimeUtc ?? last.l.departureTimeUtc) + 86_400_000).toISOString().slice(0, 10);
    out.push({ kind: 'return', from: last.l.arrivalIcao, to: home, dateUtc: day, tripId: null, title: null, aboard: 0 });
  }
  return out.filter(x => x.dateUtc >= fromDate && x.dateUtc <= toDate);
}
