/**
 * ICAO/IATA -> coordinate lookup.
 *
 * Before this module, airport coordinates were hard-coded per-file (LiveFleetMap
 * carried its own 11-entry `airportCoords` literal), so nothing else could plot an
 * airport. This is now the app's only coordinate table — LiveFleetMap was migrated
 * onto it and its literal deleted (LG-43).
 *
 * Both code systems are indexed on purpose — the satcom feed reports IATA
 * ('LAX', 'JFK') while the fleet roster reports ICAO ('KLUK').
 *
 * Coordinates are approximate field references, adequate for plotting a dot.
 * A full open dataset (e.g. OurAirports) can replace SEED wholesale without
 * touching callers.
 */

export interface AirportCoord {
  icao: string;
  iata?: string;
  lat: number;
  lon: number;
  name: string;
}

const SEED: AirportCoord[] = [
  { icao: 'KLUK', iata: 'LUK', lat: 39.1033, lon: -84.4186, name: 'Cincinnati Municipal (Lunken)' },
  { icao: 'KTEB', iata: 'TEB', lat: 40.8501, lon: -74.0608, name: 'Teterboro' },
  { icao: 'KJFK', iata: 'JFK', lat: 40.6398, lon: -73.7789, name: 'New York JFK' },
  { icao: 'KLGA', iata: 'LGA', lat: 40.7772, lon: -73.8726, name: 'New York LaGuardia' },
  { icao: 'KEWR', iata: 'EWR', lat: 40.6925, lon: -74.1687, name: 'Newark Liberty' },
  { icao: 'KLAX', iata: 'LAX', lat: 33.9425, lon: -118.4081, name: 'Los Angeles' },
  { icao: 'KMIA', iata: 'MIA', lat: 25.7932, lon: -80.2906, name: 'Miami' },
  { icao: 'KOPF', iata: 'OPF', lat: 25.907, lon: -80.2784, name: 'Miami-Opa Locka Executive' },
  { icao: 'KORD', iata: 'ORD', lat: 41.9786, lon: -87.9048, name: 'Chicago O’Hare' },
  { icao: 'KATL', iata: 'ATL', lat: 33.6367, lon: -84.4281, name: 'Atlanta Hartsfield-Jackson' },
  { icao: 'KSFO', iata: 'SFO', lat: 37.6189, lon: -122.375, name: 'San Francisco' },
  { icao: 'KPHX', iata: 'PHX', lat: 33.4343, lon: -112.0116, name: 'Phoenix Sky Harbor' },
  { icao: 'KPHL', iata: 'PHL', lat: 39.8721, lon: -75.2411, name: 'Philadelphia' },
  { icao: 'KDCA', iata: 'DCA', lat: 38.8521, lon: -77.0377, name: 'Washington National' },
  { icao: 'KSAN', iata: 'SAN', lat: 32.7336, lon: -117.1897, name: 'San Diego' },
  { icao: 'KBUR', iata: 'BUR', lat: 34.2007, lon: -118.3587, name: 'Hollywood Burbank' },
  { icao: 'KLGB', iata: 'LGB', lat: 33.8177, lon: -118.1516, name: 'Long Beach' },
  { icao: 'MYNN', iata: 'NAS', lat: 25.039, lon: -77.4662, name: 'Nassau Lynden Pindling' },
  { icao: 'EGLL', iata: 'LHR', lat: 51.4706, lon: -0.4619, name: 'London Heathrow' },
  // Carried over from LiveFleetMap's deleted literal (LG-43) so that migration lost no
  // coverage. Nothing in the app's data feeds these yet — they are long-haul destinations
  // the old map could draw a path to, and dropping them silently would have narrowed it.
  { icao: 'LFPG', iata: 'CDG', lat: 49.0097, lon: 2.5479, name: 'Paris Charles de Gaulle' },
  { icao: 'OMDB', iata: 'DXB', lat: 25.2532, lon: 55.3657, name: 'Dubai' },
  { icao: 'RJTT', iata: 'HND', lat: 35.5494, lon: 139.7798, name: 'Tokyo Haneda' },
  // Stations the demo data actually references but the table could not place, so every
  // surface built on it — coordinates, sun times, and now field-local leg times — silently
  // rendered a gap for them. KCVG is the booking portal's own default leg (LG-312).
  { icao: 'KCVG', iata: 'CVG', lat: 39.0489, lon: -84.6678, name: 'Cincinnati/Northern Kentucky' },
  { icao: 'KASE', iata: 'ASE', lat: 39.2232, lon: -106.8687, name: 'Aspen-Pitkin County' },
  { icao: 'KHPN', iata: 'HPN', lat: 41.0670, lon: -73.7076, name: 'Westchester County' },
  { icao: 'KBOS', iata: 'BOS', lat: 42.3656, lon: -71.0096, name: 'Boston Logan' },
  { icao: 'KPBI', iata: 'PBI', lat: 26.6832, lon: -80.0956, name: 'Palm Beach International' },
  { icao: 'KDAL', iata: 'DAL', lat: 32.8471, lon: -96.8518, name: 'Dallas Love Field' },
  { icao: 'KAUS', iata: 'AUS', lat: 30.1975, lon: -97.6664, name: 'Austin-Bergstrom' },
  { icao: 'EGGW', iata: 'LTN', lat: 51.8747, lon: -0.3683, name: 'London Luton' },
  { icao: 'LSGG', iata: 'GVA', lat: 46.2381, lon: 6.1090, name: 'Geneva' },
];

const BY_CODE = new Map<string, AirportCoord>();
for (const airport of SEED) {
  BY_CODE.set(airport.icao, airport);
  if (airport.iata) BY_CODE.set(airport.iata, airport);
}

export function normalizeAirportCode(code: string | undefined | null): string {
  return (code ?? '').trim().toUpperCase();
}

export function lookupAirport(code: string | undefined | null): AirportCoord | undefined {
  const key = normalizeAirportCode(code);
  return key ? BY_CODE.get(key) : undefined;
}

export const KNOWN_AIRPORTS: readonly AirportCoord[] = SEED;
