// What a confirmed booking turns into for the people travelling.
//
// The design note calls the trip page after Confirmed the largest open gap:
// every comparable product treats the itinerary as the heart of the app, and
// a portal that stops at "Confirmed" is a dead end. This builds the itinerary
// view-model from what the portal already holds — confirmed trip requests and
// confirmed seat asks, unified, because a seat on someone else's trip is still
// travel the passenger needs details for.

import type { Flight, Passenger, PortalState, SeatAsk, TripRequest } from '../types';
import { routeLabel } from './lifecycle';

export interface ItineraryLeg {
  id: string;
  from: string;
  to: string;
  date: string;
  depart: string;
  arrive?: string;
  aircraft?: string;
  fbo: { from: string; to: string };
  passengers: { name: string; lead: boolean; purpose: string }[];
}

export interface Itinerary {
  id: string;
  kind: 'trip' | 'seat';
  title: string;
  dates: string;
  status: 'confirmed';
  /** Set on a seat itinerary — whose trip it rides on is deliberately not named. */
  ridesOnScheduledTrip?: boolean;
  legs: ItineraryLeg[];
  extras: string[];
  note?: string;
  /** Hours until the manifest locks; negative once locked. */
  hoursToLockout: number;
  international: boolean;
}

// Demo-only FBO lookup. A real build reads this from the trip-support source;
// it lives here so the itinerary has the detail an EA actually calls about.
const FBO: Record<string, string> = {
  KCVG: 'Signature CVG',
  KTEB: 'Meridian TEB',
  KPBI: 'Atlantic PBI',
  KATL: 'Signature ATL',
  KLUK: 'Lunken Executive',
  KAUS: 'Atlantic AUS',
  KORD: 'Signature ORD',
  EGGW: 'Signature Luton',
};

export const fboFor = (icao: string): string => FBO[icao] ?? `${icao} FBO`;

/** Domestic manifests lock at 24 h, international at 72 h — APIS drives the longer one. */
export const LOCKOUT_HOURS = { domestic: 24, international: 72 };

const isIntl = (icao: string) => !/^K[A-Z]{3}$/.test(icao);

function hoursUntil(dateIso: string, timeLocal: string, nowMs: number): number {
  const t = Date.parse(`${dateIso}T${timeLocal || '00:00'}:00Z`);
  if (Number.isNaN(t)) return Number.POSITIVE_INFINITY;
  return (t - nowMs) / 3_600_000;
}

function legsOfRequest(request: TripRequest, passengers: Passenger[]): ItineraryLeg[] {
  return request.legs.map((leg) => ({
    id: leg.id,
    from: leg.from,
    to: leg.to,
    date: leg.date,
    depart: leg.departLocal,
    fbo: { from: fboFor(leg.from), to: fboFor(leg.to) },
    passengers: leg.passengers.map((lp) => ({
      name: passengers.find((p) => p.id === lp.passengerId)?.name ?? lp.passengerId,
      lead: !!lp.lead,
      purpose: lp.purpose,
    })),
  }));
}

function itineraryOfRequest(request: TripRequest, passengers: Passenger[], nowMs: number): Itinerary {
  const legs = legsOfRequest(request, passengers);
  const first = request.legs[0];
  const last = request.legs[request.legs.length - 1];
  const international = request.legs.some((l) => isIntl(l.from) || isIntl(l.to));
  return {
    id: request.id,
    kind: 'trip',
    title: routeLabel(request),
    dates: first ? (first.date === last.date ? first.date : `${first.date} – ${last.date}`) : '—',
    status: 'confirmed',
    legs,
    extras: request.extras,
    note: request.note,
    hoursToLockout: first
      ? hoursUntil(first.date, first.departLocal, nowMs) -
        (international ? LOCKOUT_HOURS.international : LOCKOUT_HOURS.domestic)
      : Number.POSITIVE_INFINITY,
    international,
  };
}

function itineraryOfSeat(
  ask: SeatAsk,
  flight: Flight,
  passengers: Passenger[],
  nowMs: number,
): Itinerary {
  const passenger = passengers.find((p) => p.id === ask.passengerId);
  const international = isIntl(flight.from) || isIntl(flight.to);
  return {
    id: ask.id,
    kind: 'seat',
    title: `${flight.from} → ${flight.to}`,
    dates: flight.date,
    status: 'confirmed',
    ridesOnScheduledTrip: true,
    legs: [{
      id: `${ask.id}-leg`,
      from: flight.from,
      to: flight.to,
      date: flight.date,
      depart: flight.depart,
      arrive: flight.arrive,
      aircraft: flight.aircraft,
      fbo: { from: fboFor(flight.from), to: fboFor(flight.to) },
      // Only the claimant is named: the host trip's manifest is not this
      // passenger's to see (the confidentiality projection, at itinerary level).
      passengers: passenger ? [{ name: passenger.name, lead: false, purpose: ask.purpose }] : [],
    }],
    extras: [],
    hoursToLockout:
      hoursUntil(flight.date, flight.depart, nowMs) -
      (international ? LOCKOUT_HOURS.international : LOCKOUT_HOURS.domestic),
    international,
  };
}

/** Everything confirmed, soonest first — trips and claimed seats together. */
export function buildItineraries(state: PortalState, nowMs: number): Itinerary[] {
  const trips = state.requests
    .filter((r) => r.status === 'confirmed')
    .map((r) => itineraryOfRequest(r, state.passengers, nowMs));

  const seats = state.seatAsks
    .filter((s) => s.status === 'confirmed')
    .map((s) => {
      const flight = state.flights.find((f) => f.id === s.flightId);
      return flight ? itineraryOfSeat(s, flight, state.passengers, nowMs) : null;
    })
    .filter((x): x is Itinerary => x !== null);

  return [...trips, ...seats].sort((a, b) => (a.legs[0]?.date ?? '').localeCompare(b.legs[0]?.date ?? ''));
}
