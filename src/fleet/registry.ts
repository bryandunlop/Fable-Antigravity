// THE fleet register. One list, and the only place a tail number is declared.
//
// Before this file there were six lists that disagreed: the tech-log seed, scheduling
// command's KNOWN_FLEET (which carried an `N650GS` that exists in no other seed, and
// omitted both G500s the tech-log knows about), the scheduling store's seed trips, the
// ops-wall demo day, the availability fixtures, and the booking portal. A fleet that
// disagrees with itself cannot answer "how many aeroplanes are free on the 12th", which
// is the one number the EA Booking Hub puts on every day of the month.
//
// Serviceability is NOT here. It is the tech-log derived projection (GREEN/AMBER/RED),
// and availability is derived on top of that — this file says only what metal exists.

import type { AircraftType } from '../components/tech-log/types';

/**
 * Domestically the cabin is what limits the seat count; on an ocean crossing it does not,
 * because out there the limit is beds. See `src/fleet/capacity.ts`.
 */
export type Cabin = 'big' | 'standard';

/**
 * - `core`      — the operational fleet an EA books against. Bryan, 2026-09-01: four
 *                 aeroplanes, 2 x G650ER + 2 x G500. This is the set the free-per-day
 *                 count is out of.
 * - `incoming`  — ordered/provisional metal. Real, but not bookable: the G800's D195 MEL
 *                 content is PENDING_FSDO, and a provisional type cannot carry a deferral.
 * - `demo-only` — exists in the tech-log demo seed to carry a story (N7PG holds the D59
 *                 PENDING_PLACARD case) and is not part of the four. Never counted as
 *                 bookable capacity; delete it here and the tech-log demo loses its case.
 */
export type FleetRole = 'core' | 'incoming' | 'demo-only';

export interface FleetAircraftRecord {
  /** Exact match against CAMP, hyphens and capitalisation included. */
  tail: string;
  type: AircraftType;
  cabin: Cabin;
  role: FleetRole;
  serialNumber: string;
  homeBase: string;
  /** Seeds the tech-log ledger's opening cumulative totals. */
  airframeTotalHours: number;
  airframeTotalCycles: number;
  standbyFuelLoadLb: number;
  /** True while the type has no FSDO-approved D195 MEL content. */
  provisional?: boolean;
  note?: string;
}

export const FLEET: FleetAircraftRecord[] = [
  { tail: 'N1PG', type: 'G650ER', cabin: 'big', role: 'core', serialNumber: '6260', homeBase: 'KLUK', airframeTotalHours: 2450.5, airframeTotalCycles: 980, standbyFuelLoadLb: 8000 },
  { tail: 'N2PG', type: 'G650ER', cabin: 'big', role: 'core', serialNumber: '6264', homeBase: 'KLUK', airframeTotalHours: 2310.2, airframeTotalCycles: 905, standbyFuelLoadLb: 8000 },
  { tail: 'N5PG', type: 'G500', cabin: 'standard', role: 'core', serialNumber: '72157', homeBase: 'KLUK', airframeTotalHours: 1180.0, airframeTotalCycles: 760, standbyFuelLoadLb: 6000 },
  { tail: 'N6PG', type: 'G500', cabin: 'standard', role: 'core', serialNumber: '72175', homeBase: 'KLUK', airframeTotalHours: 990.7, airframeTotalCycles: 640, standbyFuelLoadLb: 6000 },
  {
    tail: 'N7PG', type: 'G500', cabin: 'standard', role: 'demo-only', serialNumber: '72188', homeBase: 'KLUK',
    airframeTotalHours: 640.3, airframeTotalCycles: 410, standbyFuelLoadLb: 6000,
    note: 'Tech-log demo tail (D59 PENDING_PLACARD). Not one of the four.',
  },
  {
    tail: 'N3PG', type: 'G800', cabin: 'big', role: 'incoming', serialNumber: '88041', homeBase: 'KLUK',
    airframeTotalHours: 12.0, airframeTotalCycles: 6, standbyFuelLoadLb: 8000, provisional: true,
    note: 'S/N 88041 known, registration TBD. Replaces a G650ER when it arrives.',
  },
];

/** The four. What "how many are free" is a count out of. */
export const CORE_FLEET = FLEET.filter(a => a.role === 'core');

/** How many aeroplanes exist to be free on a day. */
export const CORE_FLEET_SIZE = CORE_FLEET.length;

export const CORE_TAILS = CORE_FLEET.map(a => a.tail);

/** Every tail this app is allowed to name, whatever its role. */
export const ALL_TAILS = FLEET.map(a => a.tail);

const BY_TAIL = new Map(FLEET.map(a => [a.tail, a]));

export const aircraftFor = (tail: string): FleetAircraftRecord | undefined => BY_TAIL.get(tail);

export const isCoreTail = (tail: string): boolean => aircraftFor(tail)?.role === 'core';

export const cabinFor = (tail: string): Cabin | undefined => aircraftFor(tail)?.cabin;

/**
 * NOT ours. A tail deliberately outside the register, used by the scheduling seed's
 * international demo trip so the release → placeholder-aircraft path in tech-log/bridge.ts
 * stays demonstrable. It is named here, once, precisely so it can never again be mistaken
 * for fleet — it had leaked into scheduling command's KNOWN_FLEET and the volume-trip
 * generator, where it inflated the fleet by a whole aeroplane.
 */
export const FOREIGN_DEMO_TAIL = 'N650GS';

