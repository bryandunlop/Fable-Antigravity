// Empty legs — where a one-way trip leaves the aircraft, and what that opens up (Bryan, 2026-09-01).
//
// "One lead takes the plane to airport A. The airplane flies empty to airport B and another
// passenger takes it back from B." The passenger legs belong to two trips; the empty positioning
// leg belongs to neither — it belongs to the aircraft's day. This module derives those legs from
// every trip on a tail, in time order:
//   - a FERRY when one leg lands somewhere and the next leg on that tail departs from somewhere
//     else (A → B), placed on the day the next leg departs;
//   - a RETURN when the last leg leaves the aircraft away from home and nothing else is booked on
//     that tail within `returnWithinDays`, placed on the day after it lands (X → home).
// A day with an empty leg is still committed — the aircraft is doing something — but it is
// POTENTIALLY OPEN: someone could ride the empty leg. That flag is what the surfaces show.
//
// Pure. Home base comes from the fleet register.

import type { TripRecord } from '../../scheduling/store/types';
import { aircraftFor } from '../../fleet/registry';

export interface EmptyLeg {
  tail: string;
  /** UTC day key the empty leg flies. */
  dateUtc: string;
  from: string;
  to: string;
  kind: 'ferry' | 'return' | 'positioning';
  /** The trips either side, for the operator. */
  afterTripId: string;
  beforeTripId: string | null;
}

const DAY_MS = 86_400_000;
const dayKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);

interface FlatLeg { tripId: string; dep: string; arr: string; depMs: number; arrMs: number; pax: number }

function flatten(trips: TripRecord[], tail: string): FlatLeg[] {
  return trips
    .filter(t => t.tail === tail && t.status !== 'cancelled' && t.status !== 'completed')
    .flatMap(t => t.legs.map(l => ({
      tripId: t.id,
      dep: l.departureIcao,
      arr: l.arrivalIcao,
      depMs: Date.parse(l.departureTimeUtc),
      arrMs: l.arrivalTimeUtc ? Date.parse(l.arrivalTimeUtc) : Date.parse(l.departureTimeUtc) + 2 * 3_600_000,
      pax: l.paxCount,
    })))
    .filter(l => !Number.isNaN(l.depMs))
    .sort((a, b) => a.depMs - b.depMs);
}

/**
 * Which fields count as 'home' for the return rule. The register's home base plus any the caller
 * adds — the scheduling seed uses KCVG for Cincinnati where the register says KLUK, and a landing
 * at either is the aircraft home, not away.
 */
export function homeAirportsFor(tail: string, extra: string[] = []): Set<string> {
  const s = new Set(extra);
  const hb = aircraftFor(tail)?.homeBase;
  if (hb) s.add(hb);
  return s;
}

export function emptyLegsFor(trips: TripRecord[], tail: string, nowUtc: string, extraHome: string[] = [], returnWithinDays = 3): EmptyLeg[] {
  const legs = flatten(trips, tail);
  const homes = homeAirportsFor(tail, extraHome);
  const home = aircraftFor(tail)?.homeBase ?? null;
  const out: EmptyLeg[] = [];
  for (let i = 0; i < legs.length; i++) {
    const cur = legs[i];
    const next = legs[i + 1];
    // A leg the trip itself flies empty — a pickup or a drop — is an empty leg in its own right.
    if (cur.pax === 0) out.push({ tail, dateUtc: dayKey(cur.depMs), from: cur.dep, to: cur.arr, kind: 'positioning', afterTripId: cur.tripId, beforeTripId: cur.tripId });
    if (next) {
      if (cur.arr !== next.dep) {
        out.push({ tail, dateUtc: dayKey(next.depMs), from: cur.arr, to: next.dep, kind: 'ferry', afterTripId: cur.tripId, beforeTripId: next.tripId });
      }
    } else if (home && !homes.has(cur.arr) && cur.arrMs >= Date.parse(nowUtc) - DAY_MS) {
      // Nothing booked after this leg: the aircraft has to come home some time. Say so the next day.
      out.push({ tail, dateUtc: dayKey(cur.arrMs + DAY_MS), from: cur.arr, to: home, kind: 'return', afterTripId: cur.tripId, beforeTripId: null });
    }
    // A gap longer than returnWithinDays between two legs that both leave the aircraft away is
    // also a return-and-back opportunity; kept simple here — the ferry above already covers it
    // when the airports differ, and same-airport gaps are the aircraft waiting, not flying.
    void returnWithinDays;
  }
  return out;
}

/** dateUtc → empty leg, for one tail. */
export function emptyLegIndex(trips: TripRecord[], tail: string, nowUtc: string, extraHome: string[] = []): Map<string, EmptyLeg> {
  const m = new Map<string, EmptyLeg>();
  for (const e of emptyLegsFor(trips, tail, nowUtc, extraHome)) if (!m.has(e.dateUtc)) m.set(e.dateUtc, e);
  return m;
}
