// Airport matching for per-leg / exact-airport task instantiation (Phase 2).
// Pure, case-insensitive. `prefix` with `except` expresses "K airports except KLUK".
import type { AirportMatch, AirportEndpoint } from './types';

export function matchAirport(icao: string, m: AirportMatch): boolean {
  const up = icao.toUpperCase();
  if (m.kind === 'exact') return up === m.icao.toUpperCase();
  return up.startsWith(m.prefix.toUpperCase()) && !(m.except ?? []).map((x) => x.toUpperCase()).includes(up);
}

export function expandEndpoints(e: AirportEndpoint): ('departure' | 'arrival')[] {
  return e === 'both' ? ['departure', 'arrival'] : [e];
}
