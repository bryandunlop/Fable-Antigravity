// Answers "which leg is this tail working right now?" from the myairops-mirrored
// schedule. Pure: takes already-mapped TripRecords, a tail and a moment in time.
//
// SCHEDULE, NOT ACTUALS. The Booking API exposes no movement/actual-time GET
// (ref-myairops-booking-api), so every answer here is derived from scheduled
// departure/arrival. A late trip will name the wrong leg — which is why the
// caller must always show the resolved leg's own time and keep the override one
// tap away (D53 hinge assumption).

import type { TripRecord, TripLegRecord } from '../../scheduling/store/types';

export type LegResolutionKind = 'in_flight' | 'just_landed' | 'next_departure';

export interface ResolvedLeg {
  kind: LegResolutionKind;
  trip: TripRecord;
  leg: TripLegRecord;
  /** Distance from now to the leg's anchor (arrival when landed, departure when upcoming). 0 in flight. */
  offsetMs: number;
}

export interface LegResolution {
  tail: string;
  /** The leg myGFO adopts unless the user swaps. Null when nothing is close enough. */
  primary: ResolvedLeg | null;
  /** The other plausible read of the same turn — the nearer leg of the opposite kind. */
  alternate: ResolvedLeg | null;
  /** Every in-window leg for this tail, nearest first, for the "not this leg?" picker. */
  candidates: ResolvedLeg[];
}

/**
 * How far either side of now a scheduled leg still counts as the one you are
 * working. A leg more than a day away is not this turn.
 */
export const RESOLUTION_WINDOW_HOURS = 24;

/**
 * A leg whose arrival time is absent is treated as still airborne for this long
 * after departure. myairops arrival times are calculated-unless-pinned and are
 * nullable in the vendor schema, so this case is normal, not exceptional.
 */
export const UNKNOWN_ARRIVAL_GRACE_HOURS = 24;

const HOUR_MS = 60 * 60 * 1000;

function parse(iso: string | undefined): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

function classify(leg: TripLegRecord, trip: TripRecord, nowMs: number): ResolvedLeg | null {
  const departure = parse(leg.departureTimeUtc);
  if (departure === null) return null;

  const arrival = parse(leg.arrivalTimeUtc) ?? departure + UNKNOWN_ARRIVAL_GRACE_HOURS * HOUR_MS;

  if (departure <= nowMs && nowMs <= arrival) {
    return { kind: 'in_flight', trip, leg, offsetMs: 0 };
  }
  if (arrival < nowMs) {
    return { kind: 'just_landed', trip, leg, offsetMs: nowMs - arrival };
  }
  return { kind: 'next_departure', trip, leg, offsetMs: departure - nowMs };
}

/** Resolves the working leg for one tail. Returns empty rather than guessing when nothing is near. */
export function resolveLegForTail(trips: TripRecord[], tail: string, nowIso: string): LegResolution {
  const nowMs = parse(nowIso);
  if (nowMs === null) return { tail, primary: null, alternate: null, candidates: [] };

  const windowMs = RESOLUTION_WINDOW_HOURS * HOUR_MS;

  const candidates = trips
    .filter(t => t.tail === tail && t.status !== 'cancelled')
    .flatMap(t => t.legs.map(l => classify(l, t, nowMs)))
    .filter((c): c is ResolvedLeg => c !== null && c.offsetMs <= windowMs)
    // Nearest first; leg id breaks ties so the order is stable across renders.
    .sort((a, b) => a.offsetMs - b.offsetMs || a.leg.id.localeCompare(b.leg.id));

  const primary = candidates[0] ?? null;
  const alternate = primary && primary.kind !== 'in_flight'
    ? candidates.find(c => c.kind !== 'in_flight' && c.kind !== primary.kind) ?? null
    : null;

  return { tail, primary, alternate, candidates };
}
