// Schema-faithful Booking-API fixtures. Every object is typed against the
// generated vendor types, so this is exactly what a real
// GET /api/Trips/{id} + /api/Trips/{id}/passengers response can look like.
// Dates are RELATIVE to now so the demo scenarios hold whenever it runs:
//   MAO-7301  N1PG (RED seed defect)   departs tomorrow        -> RED-at-ETD alert
//   MAO-7305  N6PG (AMBER seed)        +7d .. +9d6h intl       -> its Cat-C deferral due
//             date (clockStart+10d ≈ now+7d16h..+8d16h) falls INSIDE the trip window
//             -> deferral-expires-mid-trip alert
//   MAO-7310  N5PG (GREEN seed)        +4d                     -> clean control
//   MAO-7315  N2PG                     -4h .. +9h35, mid-turn -> the only trip inside the
//             leg-resolution window: leg 1 landed 2h ago, leg 2 departs in 3h (D53). A FOUR-leg
//             northeast day (KLUK-KTEB-KBOS-KLGA-KLUK) rather than an out-and-back, because it
//             pins to the top of the pilot's Flight Hub. Deliberately NOT routed via KDCA: a DCA
//             leg reclassifies the whole trip as dca_dassp, and the flagship demo trip should be
//             the ordinary domestic case — MAO-4519 already carries the DASSP scenario.
//             pins to the top of the pilot's Flight Hub and the day timeline there has nothing to
//             show on a trip whose only remaining leg is the one in the countdown.
// Tails/types match the tech-log seed fleet (fleet.ts) — the tail is the join key.

import type { BookingTripWithLegs, BookingTripPassenger } from '../bookingAdapter';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export interface MyairopsBookingFixture {
  trip: BookingTripWithLegs;
  /** GET /api/Trips/{id}/passengers — the trip-level manifest. */
  passengers: BookingTripPassenger[];
}

export function buildMyairopsBookingFixtures(nowUtcIso: string): MyairopsBookingFixture[] {
  const base = new Date(nowUtcIso).getTime();
  const iso = (offsetMs: number) => new Date(base + offsetMs).toISOString();

  const pax = (
    id: number, tripId: number, fullName: string, crmPassengerId: number | null,
    extras: Partial<BookingTripPassenger> = {},
  ): BookingTripPassenger => ({
    id, tripId, crmPassengerId,
    sharedSeat: false, leadPassenger: false, hasAllergy: false,
    details: { fullName },
    ...extras,
  } as BookingTripPassenger);

  return [
    {
      trip: {
        id: 7301, reference: 'MAO-7301', clientId: 12, aircraft: 'N1PG', aircraftType: 'GLF6',
        status: 'Booked', requiresQuotation: false,
        legs: [
          {
            id: 90311, tripId: 7301,
            departureAirport: { id: 101, icao: 'KLUK', iata: 'LUK', name: 'Cincinnati Municipal Lunken' },
            arrivalAirport: { id: 102, icao: 'KTEB', iata: 'TEB', name: 'Teterboro' },
            departureDateTime: iso(1 * DAY_MS), arrivalDateTime: iso(1 * DAY_MS + 100 * 60_000),
            adults: 3, children: 1, crew: 2, cabinCrew: 1, flyingTime: 100,
          },
          {
            id: 90312, tripId: 7301,
            departureAirport: { id: 102, icao: 'KTEB', iata: 'TEB', name: 'Teterboro' },
            arrivalAirport: { id: 101, icao: 'KLUK', iata: 'LUK', name: 'Cincinnati Municipal Lunken' },
            departureDateTime: iso(1 * DAY_MS + 9 * HOUR_MS), arrivalDateTime: iso(1 * DAY_MS + 9 * HOUR_MS + 105 * 60_000),
            adults: 2, children: 0, crew: 2, cabinCrew: 1, flyingTime: 105,
          },
        ],
      } as BookingTripWithLegs,
      passengers: [
        pax(9101, 7301, 'Marcus Webb', 501, { leadPassenger: true }),
        pax(9102, 7301, 'Dana Whitfield', 502),
        pax(9103, 7301, 'Janae Holloway', 505),
        pax(9104, 7301, 'R. Castellanos', null), // manifest-only: no CRM link -> UNMATCHED
      ],
    },
    {
      trip: {
        id: 7305, reference: 'MAO-7305', clientId: 12, aircraft: 'N6PG', aircraftType: 'GA5C',
        status: 'Booked', requiresQuotation: false,
        legs: [
          {
            id: 90351, tripId: 7305,
            departureAirport: { id: 101, icao: 'KLUK', iata: 'LUK', name: 'Cincinnati Municipal Lunken' },
            arrivalAirport: { id: 103, icao: 'EGGW', iata: 'LTN', name: 'London Luton' },
            departureDateTime: iso(7 * DAY_MS), arrivalDateTime: iso(7 * DAY_MS + 7 * HOUR_MS + 30 * 60_000),
            adults: 2, children: 0, crew: 2, cabinCrew: 1, flyingTime: 450,
          },
          {
            id: 90352, tripId: 7305,
            departureAirport: { id: 103, icao: 'EGGW', iata: 'LTN', name: 'London Luton' },
            arrivalAirport: { id: 101, icao: 'KLUK', iata: 'LUK', name: 'Cincinnati Municipal Lunken' },
            departureDateTime: iso(9 * DAY_MS), arrivalDateTime: iso(9 * DAY_MS + 6 * HOUR_MS),
            adults: 2, children: 0, crew: 2, cabinCrew: 1, flyingTime: 495,
          },
        ],
      } as BookingTripWithLegs,
      passengers: [
        pax(9151, 7305, 'Priya Raman', 503, { leadPassenger: true }),
        pax(9152, 7305, 'Elliot Kranz', 504),
      ],
    },
    {
      trip: {
        id: 7310, reference: 'MAO-7310', clientId: 12, aircraft: 'N5PG', aircraftType: 'GA5C',
        status: 'Booked', requiresQuotation: false,
        legs: [
          {
            id: 90361, tripId: 7310,
            departureAirport: { id: 101, icao: 'KLUK', iata: 'LUK', name: 'Cincinnati Municipal Lunken' },
            arrivalAirport: { id: 104, icao: 'KPBI', iata: 'PBI', name: 'Palm Beach Intl' },
            departureDateTime: iso(4 * DAY_MS), arrivalDateTime: iso(4 * DAY_MS + 2 * HOUR_MS + 30 * 60_000),
            adults: 5, children: 1, crew: 2, cabinCrew: 1, flyingTime: 150,
          },
          {
            id: 90362, tripId: 7310,
            departureAirport: { id: 104, icao: 'KPBI', iata: 'PBI', name: 'Palm Beach Intl' },
            arrivalAirport: { id: 101, icao: 'KLUK', iata: 'LUK', name: 'Cincinnati Municipal Lunken' },
            departureDateTime: iso(4 * DAY_MS + 8 * HOUR_MS), arrivalDateTime: iso(4 * DAY_MS + 10 * HOUR_MS + 30 * 60_000),
            adults: 5, children: 1, crew: 2, cabinCrew: 1, flyingTime: 150,
          },
        ],
      } as BookingTripWithLegs,
      passengers: [
        pax(9161, 7310, 'Tom Okafor', 506, { leadPassenger: true }),
        pax(9162, 7310, 'Mei-Lin Chu', 507),
      ],
    },
    {
      // MAO-7315  N2PG — a trip mid-turn RIGHT NOW: leg 1 landed 2h ago, leg 2 departs in 3h.
      // The only fixture inside the leg-resolution window (D53), so inventory v2's "click a
      // tail and it knows the leg" has something to resolve; the other three sit days out on
      // purpose and must stay that way for the scheduling-hub alert scenarios.
      trip: {
        id: 7315, reference: 'MAO-7315', clientId: 12, aircraft: 'N2PG', aircraftType: 'GLF6',
        status: 'InProgress', requiresQuotation: false,
        legs: [
          {
            id: 90371, tripId: 7315,
            departureAirport: { id: 101, icao: 'KLUK', iata: 'LUK', name: 'Cincinnati Municipal Lunken' },
            arrivalAirport: { id: 102, icao: 'KTEB', iata: 'TEB', name: 'Teterboro' },
            departureDateTime: iso(-4 * HOUR_MS), arrivalDateTime: iso(-2 * HOUR_MS),
            adults: 4, children: 0, crew: 2, cabinCrew: 1, flyingTime: 120,
          },
          {
            id: 90372, tripId: 7315,
            departureAirport: { id: 102, icao: 'KTEB', iata: 'TEB', name: 'Teterboro' },
            arrivalAirport: { id: 103, icao: 'KBOS', iata: 'BOS', name: 'Boston Logan' },
            departureDateTime: iso(3 * HOUR_MS), arrivalDateTime: iso(3 * HOUR_MS + 55 * 60_000),
            adults: 4, children: 0, crew: 2, cabinCrew: 1, flyingTime: 55,
          },
          {
            id: 90373, tripId: 7315,
            departureAirport: { id: 103, icao: 'KBOS', iata: 'BOS', name: 'Boston Logan' },
            arrivalAirport: { id: 104, icao: 'KLGA', iata: 'LGA', name: 'New York LaGuardia' },
            departureDateTime: iso(5.5 * HOUR_MS), arrivalDateTime: iso(5.5 * HOUR_MS + 50 * 60_000),
            adults: 4, children: 0, crew: 2, cabinCrew: 1, flyingTime: 50,
          },
          {
            id: 90374, tripId: 7315,
            departureAirport: { id: 104, icao: 'KLGA', iata: 'LGA', name: 'New York LaGuardia' },
            arrivalAirport: { id: 101, icao: 'KLUK', iata: 'LUK', name: 'Cincinnati Municipal Lunken' },
            departureDateTime: iso(8 * HOUR_MS), arrivalDateTime: iso(8 * HOUR_MS + 105 * 60_000),
            adults: 2, children: 0, crew: 2, cabinCrew: 1, flyingTime: 95,
          },
        ],
      } as BookingTripWithLegs,
      passengers: [
        pax(9171, 7315, 'Adaeze Nwosu', 508, { leadPassenger: true }),
        pax(9172, 7315, 'Franklin Oyelaran', 509),
      ],
    },
  ];
}
