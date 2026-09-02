// Fleet display metadata for the plan board's tail rows and the filter chips. Serviceability is
// NOT stored here — it is the tech-log derived projection, read via bridge.readFleetServiceability
// and passed to the board (tails without a tech-log record simply show no status dot).
//
// The tails themselves come from `src/fleet/registry.ts`, which is the only place a tail number
// is declared. This list used to be hand-maintained and had drifted: it carried an `N650GS` that
// exists in no other seed and omitted two G500s the tech log knows about.

import { FLEET } from '../../fleet/registry';

export interface FleetAircraft {
  tail: string;
  type: string;
}

// Every tail the tech log holds, including the incoming G800 — the plan board is
// scheduling's own surface, so it sees the whole register, not just the bookable four.
export const KNOWN_FLEET: FleetAircraft[] = FLEET.map(a => ({ tail: a.tail, type: a.type }));

/** Known fleet first, then any extra tails appearing in trips (e.g. a placeholder/non-fleet tail). */
export function fleetRowsFor(trips: { aircraft: string; aircraftType: string }[]): FleetAircraft[] {
  const rows = [...KNOWN_FLEET];
  const known = new Set(rows.map(r => r.tail));
  for (const t of trips) {
    if (!known.has(t.aircraft)) {
      known.add(t.aircraft);
      rows.push({ tail: t.aircraft, type: t.aircraftType });
    }
  }
  return rows;
}
