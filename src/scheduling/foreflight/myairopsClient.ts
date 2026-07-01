// Fake stand-in for the myairops trip-sheet pull.
//
// myairops is the real source of truth for all of this (crew, FBOs, leg
// notes, passenger roster) — myGFO doesn't have a live connection to it yet.
// This generates realistic-looking data DETERMINISTICALLY from the trip
// already mirrored into myGFO, so re-pulling the same trip returns identical
// content until the trip itself changes. That determinism is what lets
// ForeFlightSyncService correctly report "unchanged" instead of re-uploading
// on every push — a real myairops integration would replace this file only;
// nothing downstream needs to change.

import type { TripRecord, TripLegRecord } from '../store/types';
import type {
  MyAirOpsTripSheet, MyAirOpsLegSheet, MyAirOpsPassenger, MyAirOpsCrewMember, MyAirOpsOperationalMessage,
} from './types';

export interface MyAirOpsClient {
  getTripSheet(trip: TripRecord): Promise<MyAirOpsTripSheet>;
}

function stableIndex(seed: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % mod;
}

function pick<T>(pool: T[], seed: string): T {
  return pool[stableIndex(seed, pool.length)];
}

const AIRPORT_LOOKUP: Record<string, { city: string; country: string }> = {
  KTEB: { city: 'Teterboro, NJ', country: 'United States' },
  KHOU: { city: 'Houston, TX', country: 'United States' },
  KLUK: { city: 'Cincinnati, OH', country: 'United States' },
  KMVY: { city: "Martha's Vineyard, MA", country: 'United States' },
  KAUS: { city: 'Austin, TX', country: 'United States' },
  KJFK: { city: 'New York, NY', country: 'United States' },
  KSEA: { city: 'Seattle, WA', country: 'United States' },
  KDEN: { city: 'Denver, CO', country: 'United States' },
  KIND: { city: 'Indianapolis, IN', country: 'United States' },
  EGLL: { city: 'London', country: 'United Kingdom' },
  LFPB: { city: 'Paris', country: 'France' },
};
function lookupAirport(icao: string): { city: string; country: string } {
  return AIRPORT_LOOKUP[icao] ?? { city: icao, country: 'Unknown' };
}

// Coarse, demo-only UTC offsets — a real pull gets this (and DST handling) from myairops.
const UTC_OFFSET_LOOKUP: Record<string, number> = {
  KTEB: -4, KHOU: -5, KLUK: -4, KMVY: -4, KAUS: -5, KJFK: -4, KSEA: -7, KDEN: -6, KIND: -4, EGLL: 1, LFPB: 2,
};
function utcOffsetHoursFor(icao: string): number {
  return UTC_OFFSET_LOOKUP[icao] ?? 0;
}

function addHoursIso(iso: string, hours: number): string {
  const d = new Date(iso);
  d.setUTCHours(d.getUTCHours() + hours);
  return d.toISOString();
}

function toLocalDisplay(iso: string, offsetHours: number): string {
  return addHoursIso(iso, offsetHours).slice(11, 16);
}

function formatDuration(startIso: string, endIso: string): string {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}:${m.toString().padStart(2, '0')}`;
}

const CREW_NAMES = ['Capt. R. Alvarez', 'Capt. J. Chen', 'F/O M. Grant', 'F/O S. Patel', 'FA D. Reyes'];
const FBO_NAMES = ['Signature Flight Support', 'Atlantic Aviation', 'Jet Aviation', 'Landmark Aviation', 'TAC Air'];
const PASSENGER_SURNAMES = ['Whitfield', 'Marsh', 'Delgado', 'Okafor', 'Lindqvist', 'Bianchi', 'Novak', 'Sato'];
const NATIONALITIES = ['United States', 'United Kingdom', 'Canada', 'France', 'Germany'];
const CATERING_REQUESTS = [
  'Continental breakfast, no nuts', 'Light lunch, dairy-free for 1 pax', 'Dinner service, no shellfish', 'Snack tray only',
];
const SCHEDULING_NOTES = [
  'Confirm slot 2 hrs prior', 'VIP handling requested', 'Standard handling', 'Crew car requested on arrival',
];
const OPS_MESSAGES = [
  'Noise-sensitive departure after 22:00 local — use published NADP.',
  'Ramp fee waived with min. fuel uplift of 200 gal.',
  'Customs by prior arrangement only — notify 4 hrs before arrival.',
  'Preferred FBO has limited overnight parking — confirm ahead.',
];

function phoneFor(seed: string): string {
  const area = 200 + stableIndex(seed, 700);
  const line = 1000 + stableIndex(`${seed}-x`, 9000);
  return `+1 (${area}) 555-${line}`;
}

function fboFor(seed: string): { name: string; phone: string } {
  return { name: pick(FBO_NAMES, seed), phone: phoneFor(`${seed}-fbo`) };
}

export class FakeMyAirOpsClient implements MyAirOpsClient {
  async getTripSheet(trip: TripRecord): Promise<MyAirOpsTripSheet> {
    const crew: MyAirOpsCrewMember[] = [
      { name: pick(CREW_NAMES, `${trip.id}-pic`), role: 'PIC', phone: phoneFor(`${trip.id}-pic`) },
      { name: pick(CREW_NAMES, `${trip.id}-sic`), role: 'SIC', phone: phoneFor(`${trip.id}-sic`) },
    ];

    const legs: MyAirOpsLegSheet[] = trip.legs.map((leg) => this.buildLeg(leg));
    const passengers: MyAirOpsPassenger[] = this.buildPassengers(trip);
    const operationalMessages: MyAirOpsOperationalMessage[] = [
      ...new Set(trip.legs.flatMap((l) => [l.departureIcao, l.arrivalIcao])),
    ].map((icao) => ({ icao, message: pick(OPS_MESSAGES, icao) }));

    return {
      tripNumber: trip.tripNumber,
      tail: trip.tail,
      aircraftType: trip.aircraftType,
      tripDates: { startDate: trip.startDate, endDate: trip.endDate },
      crew,
      legs,
      passengers,
      operationalMessages,
    };
  }

  private buildLeg(leg: TripLegRecord): MyAirOpsLegSheet {
    const dep = lookupAirport(leg.departureIcao);
    const arr = lookupAirport(leg.arrivalIcao);
    const depOffset = utcOffsetHoursFor(leg.departureIcao);
    const arrOffset = utcOffsetHoursFor(leg.arrivalIcao);
    const etaUtc = leg.arrivalTimeUtc ?? addHoursIso(leg.departureTimeUtc, 2);
    const dow = new Date(leg.departureTimeUtc).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
    const eft = formatDuration(leg.departureTimeUtc, etaUtc);
    const eteMinutes = Math.round(
      (new Date(etaUtc).getTime() - new Date(leg.departureTimeUtc).getTime()) / 60000,
    ) + 15; // + demo taxi allowance
    const ete = `${Math.floor(eteMinutes / 60)}:${(eteMinutes % 60).toString().padStart(2, '0')}`;

    return {
      legId: leg.id,
      dayOfWeek: dow,
      departure: { icao: leg.departureIcao, ...dep },
      arrival: { icao: leg.arrivalIcao, ...arr },
      etdLocal: toLocalDisplay(leg.departureTimeUtc, depOffset),
      etdUtc: leg.departureTimeUtc,
      etdUtcOffsetHours: depOffset,
      etaLocal: toLocalDisplay(etaUtc, arrOffset),
      etaUtc,
      etaUtcOffsetHours: arrOffset,
      eft,
      ete,
      paxCount: leg.paxCount,
      departureFbo: fboFor(`${leg.id}-dep`),
      arrivalFbo: fboFor(`${leg.id}-arr`),
      legComments: leg.filedStatus === 'filed' ? 'Filed and confirmed.' : 'Not yet filed.',
      paxCateringRequests: pick(CATERING_REQUESTS, leg.id),
      schedulingNotes: pick(SCHEDULING_NOTES, `${leg.id}-notes`),
    };
  }

  private buildPassengers(trip: TripRecord): MyAirOpsPassenger[] {
    const maxPax = trip.legs.reduce((m, l) => Math.max(m, l.paxCount), 0);
    return Array.from({ length: maxPax }, (_, i) => {
      const seed = `${trip.id}-pax-${i}`;
      const surname = pick(PASSENGER_SURNAMES, seed);
      const initial = String.fromCharCode(65 + stableIndex(`${seed}-init`, 26));
      return {
        name: `${initial}. ${surname}`,
        employeeNumber: `EMP-${1000 + stableIndex(seed, 8999)}`,
        phone: phoneFor(seed),
        nationality: pick(NATIONALITIES, seed),
        legIds: trip.legs.filter((l) => i < l.paxCount).map((l) => l.id),
      };
    });
  }
}
