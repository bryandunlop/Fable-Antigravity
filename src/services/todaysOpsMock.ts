/**
 * One coherent day for the demo fleet.
 *
 * The satcom feed, the flights list, and the NAS-impact analysis were each seeded
 * independently, so they disagreed — the flights panel flew N1PG to London while
 * satcom put it over New York, and NAS ran on tails that don't exist. The ops wall
 * shows them side by side, so the seams showed. This is the single source they all
 * read, built to be internally consistent:
 *
 *  - The five real tails (N1PG..N3PG), all based at KLUK.
 *  - Positions respect airworthiness: the two grounded (RED) tails sit on the ramp;
 *    only serviceable tails are airborne. (RAG itself is derived by the tech-log
 *    projection — this file only makes position/flights agree with it, never sets it.)
 *  - Today's legs and the NAS events reference the same airports, so "affect you"
 *    is real.
 *
 * Codes: satcom-style positions use IATA (LUK/MIA/TEB), matching the live feed's
 * convention; the airport table resolves either IATA or ICAO.
 */
import type { AircraftPosition, AircraftStatus } from '../components/hooks/useSatcomDirect';

interface TailPosition {
  tail: string;
  callSign?: string;
  lat: number;
  lon: number;
  altitude: number;
  groundSpeed: number;
  heading: number;
  verticalSpeed: number;
  phase: AircraftPosition['flightPhase'];
  depIata?: string;
  arrIata?: string;
  fuel: number;
  caution?: string;
}

// N1PG & N2PG are RED (AOG) -> parked at KLUK. N3PG is GREEN but provisional -> on
// the ramp at KLUK. N5PG (GREEN) and N6PG (AMBER) are the two flying today.
const TAIL_POSITIONS: TailPosition[] = [
  { tail: 'N1PG', lat: 39.1033, lon: -84.4186, altitude: 0, groundSpeed: 0, heading: 0, verticalSpeed: 0, phase: 'Parked', depIata: 'LUK', fuel: 6800, caution: 'AOG — see maintenance' },
  { tail: 'N2PG', lat: 39.1033, lon: -84.4186, altitude: 0, groundSpeed: 0, heading: 0, verticalSpeed: 0, phase: 'Parked', depIata: 'LUK', fuel: 5200, caution: 'AOG — engine borescope' },
  { tail: 'N3PG', lat: 39.1033, lon: -84.4186, altitude: 0, groundSpeed: 0, heading: 0, verticalSpeed: 0, phase: 'Parked', depIata: 'LUK', fuel: 9000 },
  { tail: 'N5PG', callSign: 'PG512', lat: 31.6, lon: -81.9, altitude: 43000, groundSpeed: 476, heading: 156, verticalSpeed: 0, phase: 'Cruise', depIata: 'LUK', arrIata: 'MIA', fuel: 11800 },
  { tail: 'N6PG', callSign: 'PG618', lat: 40.25, lon: -78.6, altitude: 39000, groundSpeed: 452, heading: 78, verticalSpeed: 0, phase: 'Cruise', depIata: 'LUK', arrIata: 'TEB', fuel: 9400, caution: 'MEL 21-01 deferral active' },
];

export interface TodayLeg {
  id: string;
  flightNumber: string;
  tail: string;
  depIcao: string;
  arrIcao: string;
  depIata: string;
  arrIata: string;
  schedDep: string;
  schedArr: string;
  eta: string;
  etaStatus: 'early' | 'late' | 'on-time';
  status: 'In Flight' | 'Scheduled' | 'Departed';
  pax: number;
}

// Only serviceable tails are scheduled. N5PG and N6PG are airborne; N3PG goes out
// this afternoon. The two grounded tails (N1PG/N2PG) have no leg — that's the point.
export const TODAY_LEGS: TodayLeg[] = [
  { id: 'LEG-N5PG', flightNumber: 'PG512', tail: 'N5PG', depIcao: 'KLUK', arrIcao: 'KMIA', depIata: 'LUK', arrIata: 'MIA', schedDep: '08:15', schedArr: '11:05', eta: '10:58', etaStatus: 'early', status: 'In Flight', pax: 4 },
  { id: 'LEG-N6PG', flightNumber: 'PG618', tail: 'N6PG', depIcao: 'KLUK', arrIcao: 'KTEB', depIata: 'LUK', arrIata: 'TEB', schedDep: '09:30', schedArr: '11:40', eta: '11:52', etaStatus: 'late', status: 'In Flight', pax: 2 },
  { id: 'LEG-N3PG', flightNumber: 'PG330', tail: 'N3PG', depIcao: 'KLUK', arrIcao: 'KMIA', depIata: 'LUK', arrIata: 'MIA', schedDep: '15:45', schedArr: '18:20', eta: '18:20', etaStatus: 'on-time', status: 'Scheduled', pax: 6 },
];

const nowIso = () => new Date().toISOString();

/** Positions for the satcom feed — all five tails, coherent with today's legs. */
export function satcomPositions(): AircraftPosition[] {
  return TAIL_POSITIONS.map(p => ({
    tailNumber: p.tail,
    callSign: p.callSign,
    latitude: p.lat,
    longitude: p.lon,
    altitude: p.altitude,
    groundSpeed: p.groundSpeed,
    heading: p.heading,
    verticalSpeed: p.verticalSpeed,
    timestamp: nowIso(),
    flightPhase: p.phase,
    departureAirport: p.depIata,
    arrivalAirport: p.arrIata,
    fuelRemaining: p.fuel,
    flightTime: p.phase === 'Cruise' ? 90 : 0,
  }));
}

/** Minimal statuses for the satcom feed; a caution becomes one unacknowledged alert. */
export function satcomStatuses(): AircraftStatus[] {
  return TAIL_POSITIONS.map(p => ({
    tailNumber: p.tail,
    isOnline: true,
    lastContact: nowIso(),
    satcomStatus: 'Connected',
    systemHealth: { engine: 'Normal', hydraulics: 'Normal', electrical: 'Normal', avionics: 'Normal' },
    alerts: p.caution
      ? [{ id: `${p.tail}-c1`, type: 'Maintenance', severity: 'Caution', message: p.caution, timestamp: nowIso(), acknowledged: false }]
      : [],
  }));
}
