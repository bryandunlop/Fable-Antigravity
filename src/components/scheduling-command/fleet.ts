// Fleet display metadata for the plan board's tail rows and the filter chips. Serviceability is
// NOT stored here — it is the tech-log derived projection, read via bridge.readFleetServiceability
// and passed to the board (tails without a tech-log record simply show no status dot).

export interface FleetAircraft {
  tail: string;
  type: string;
}

export const KNOWN_FLEET: FleetAircraft[] = [
  { tail: 'N2PG', type: 'G650ER' },
  { tail: 'N1PG', type: 'G650ER' },
  { tail: 'N650GS', type: 'G650ER' },
  { tail: 'N6PG', type: 'G500' },
];

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
