// The trips module's trips as the scheduling store sees them, and the aircraft's day (rotation).
//
// Two jobs:
//  1. `tripsAsRecords` — a confirmed trip with a tail must OCCUPY that tail in the availability
//     engine, or the fleet schedule keeps showing it open. The projection itself is
//     engine/projection.ts (D110 slice 1: faithful leg ids, derived trip type); re-exported here.
//  2. `rotationFor` — for scheduling: everything one tail does across a window, all trips, with
//     the empty legs between them, so a one-way out and a different one-way back read as one
//     aircraft day with a ferry in the middle.
// Pure.

import type { TripRecord } from '../../../scheduling/store/types';
import { aircraftFor } from '../../../fleet/registry';
import { tripToRecord, tripsToRecords } from './projection';

/** The booking projected into the store's shape; the faithful version lives in engine/projection.ts (D110). */
export const tripAsRecord = tripToRecord;
export const tripsAsRecords = tripsToRecords;

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
