// Fleet display metadata for the plan board's tail rows and the filter chips. The serviceability
// dot is display-mock until the tech-log serviceability projection is bridged in (future pass).

export interface FleetAircraft {
  tail: string;
  type: string;
  serviceable: boolean;
}

export const KNOWN_FLEET: FleetAircraft[] = [
  { tail: 'N2PG', type: 'G650ER', serviceable: true },
  { tail: 'N1PG', type: 'G650ER', serviceable: true },
  { tail: 'N650GS', type: 'G650ER', serviceable: true },
  { tail: 'N6PG', type: 'G500', serviceable: false },
];

/** Known fleet first, then any extra tails appearing in trips (e.g. a placeholder/non-fleet tail). */
export function fleetRowsFor(trips: { aircraft: string; aircraftType: string }[]): FleetAircraft[] {
  const rows = [...KNOWN_FLEET];
  const known = new Set(rows.map(r => r.tail));
  for (const t of trips) {
    if (!known.has(t.aircraft)) {
      known.add(t.aircraft);
      rows.push({ tail: t.aircraft, type: t.aircraftType, serviceable: true });
    }
  }
  return rows;
}
