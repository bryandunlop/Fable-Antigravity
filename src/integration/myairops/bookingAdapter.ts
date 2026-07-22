// Pure mapping: myairops Booking API shapes (generated from the vendor OpenAPI doc)
// -> myGFO scheduling TripRecord. Validation throws with a ctx-prefixed message
// (same idiom as scheduling/store/validate.ts). PULL-ONLY: nothing here builds a
// request body for myairops.

import type { components } from './gen/booking';
import type { TripRecord, TripLegRecord } from '../../scheduling/store/types';
import type { TripType } from '../../scheduling/engine';

export type BookingTripWithLegs = components['schemas']['Airops.Flight.Booking.Models.TripWithLegsViewModel'];
export type BookingTripLeg = components['schemas']['Airops.Flight.Booking.Models.TripLegViewModel'];
export type BookingTripPassenger = components['schemas']['Airops.Flight.Booking.Models.TripPassengerViewModel'];

// ICAO type designator -> fleet display label. Display convenience only (falls back
// to the raw designator) — never used as an identity join; the tail is the join key.
const TYPE_DESIGNATOR_LABELS: Record<string, string> = {
  GLF6: 'G650ER',
  GA5C: 'G500',
  G800: 'G800',
};

/** myairops trip status ladder -> myGFO TripRecord.status. */
export function mapBookingStatus(status: BookingTripWithLegs['status']): TripRecord['status'] {
  switch (status) {
    case 'Booked': return 'confirmed';
    case 'InProgress': return 'in_progress';
    case 'Completed':
    case 'Invoiced':
    case 'Paid': return 'completed';
    case 'Cancelled': return 'cancelled';
    case 'New':
    case 'Hold':
    case 'CheckFeasibility':
    default:
      return 'planning';
  }
}

/**
 * Demo heuristic for the checklist engine's trip type: KDCA anywhere -> dca_dassp;
 * any non-US (non-K-prefixed) ICAO -> international; else domestic. A production
 * pull would take this from myairops leg-type/regulation data instead.
 */
export function deriveTripType(legs: Array<{ departureIcao: string; arrivalIcao: string }>): TripType {
  const icaos = legs.flatMap(l => [l.departureIcao, l.arrivalIcao]);
  if (icaos.includes('KDCA')) return 'dca_dassp';
  if (icaos.some(c => !c.startsWith('K'))) return 'international';
  return 'domestic';
}

function reqLegIcao(leg: BookingTripLeg, side: 'departureAirport' | 'arrivalAirport', ctx: string): string {
  const icao = leg[side]?.icao;
  if (!icao) throw new Error(`${ctx}: leg ${String(leg.id ?? '?')} missing ${side}.icao`);
  return icao;
}

function reqLegDeparture(leg: BookingTripLeg, ctx: string): string {
  // departureDateTime is nullable in the vendor schema (calculated unless pinned);
  // a puller must skip/park unpinned legs rather than invent a time.
  if (!leg.departureDateTime) throw new Error(`${ctx}: leg ${String(leg.id ?? '?')} has no departureDateTime (unpinned)`);
  return leg.departureDateTime;
}

export interface BookingTripMapOptions {
  nowUtc: string;      // stamped as createdAtUtc on the mirror
  createdBy?: string;  // defaults to the integration actor
}

/** Maps one Booking-API trip (with legs) into a myGFO TripRecord mirror. */
export function mapBookingTripToTripRecord(trip: BookingTripWithLegs, opts: BookingTripMapOptions): TripRecord {
  const ctx = `bookingTrip ${String(trip.reference ?? trip.id ?? '?')}`;
  if (trip.id === undefined || trip.id === null) throw new Error(`${ctx}: missing id`);
  if (!trip.aircraft) throw new Error(`${ctx}: missing aircraft registration`);
  const rawLegs = trip.legs ?? [];
  if (rawLegs.length === 0) throw new Error(`${ctx}: no legs`);

  const legs: TripLegRecord[] = rawLegs.map((leg, i) => ({
    id: `mao-leg-${String(leg.id ?? `${trip.id}-${i + 1}`)}`,
    sequence: i + 1,
    departureIcao: reqLegIcao(leg, 'departureAirport', ctx),
    arrivalIcao: reqLegIcao(leg, 'arrivalAirport', ctx),
    departureTimeUtc: reqLegDeparture(leg, ctx),
    ...(leg.arrivalDateTime ? { arrivalTimeUtc: leg.arrivalDateTime } : {}),
    paxCount: (leg.adults ?? 0) + (leg.children ?? 0),
    filedStatus: 'unfiled',
  }));

  const last = legs[legs.length - 1];
  const reference = trip.reference ?? `MAO-${trip.id}`;

  return {
    id: `mao-trip-${trip.id}`,
    tripNumber: reference,
    sourceSystem: 'myairops',
    sourceTripRef: reference,
    tail: trip.aircraft,
    aircraftType: trip.aircraftType
      ? (TYPE_DESIGNATOR_LABELS[trip.aircraftType] ?? trip.aircraftType)
      : 'UNKNOWN',
    tripType: deriveTripType(legs),
    priority: 'standard',
    status: mapBookingStatus(trip.status),
    startDate: legs[0].departureTimeUtc,
    endDate: last.arrivalTimeUtc ?? last.departureTimeUtc,
    legs,
    createdBy: opts.createdBy ?? 'myairops-sync',
    createdAtUtc: opts.nowUtc,
  };
}
