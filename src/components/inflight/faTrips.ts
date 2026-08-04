// The flight attendant's upcoming work, shaped as TRIPS (a tail + a crew + a sequence
// of legs), not a flat list of legs. Passenger references are shared-store passenger
// ids, so the manifest shows the same records (allergies, notes, photos) the Passenger
// Database owns. Dates are relative to "now" so the list always looks current.
//
// Catering is a structured order, not a free-text note. The shape is the subset of
// CateringOrders.tsx's CateringOrder that a flight attendant actually acts on: who is
// catering, how to reach them, whether it is confirmed, and when it lands.

export type CateringStatus = 'Not ordered' | 'Ordered' | 'Confirmed' | 'Delivered' | 'Issue';

export interface FaCateringItem {
  name: string;
  category: string;
  quantity: number;
  note?: string;
}

export interface FaCateringOrder {
  caterer: string;
  contactPerson: string;
  phone: string;
  email?: string;
  status: CateringStatus;
  /** Last moment changes can be made. Past this, the FA calls instead of edits. */
  orderDeadlineUtc: string;
  deliveryUtc: string;
  /** Where it meets the aircraft — FBO or handler. */
  deliveryLocation: string;
  service: string;
  items: FaCateringItem[];
  specialInstructions?: string;
}

export interface FaLeg {
  id: string;
  legNumber: number;
  flightNumber: string;
  origin: string;
  destination: string;
  departureUtc: string;
  arrivalUtc: string;
  passengerIds: string[];
  catering?: FaCateringOrder;
}

export interface FaTrip {
  id: string;
  tripNumber: string;
  tripName: string;
  tail: string;
  aircraftType: string;
  cabinCrew: string[];
  legs: FaLeg[];
}

function at(base: Date, addDays: number, hour: number, minute = 0): string {
  const d = new Date(base);
  d.setDate(d.getDate() + addDays);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

/** The current flight attendant's upcoming trips. `now` is injected so callers control
 * the clock (the component passes new Date()). */
export function buildFaTrips(now: Date): FaTrip[] {
  return [
    {
      id: 'FA-TRIP-1',
      tripNumber: 'TRP-2026-0041',
      tripName: 'West coast rotation',
      tail: 'N1PG',
      aircraftType: 'G650ER',
      cabinCrew: ['You', 'Maria Lopez'],
      legs: [
        {
          id: 'FA-LEG-1',
          legNumber: 1,
          flightNumber: 'PG241',
          origin: 'KTEB',
          destination: 'KLAX',
          departureUtc: at(now, 1, 9),
          arrivalUtc: at(now, 1, 15),
          passengerIds: ['PAX001', 'PAX003', 'PAX005'],
          catering: {
            caterer: 'Air Culinaire Worldwide — Teterboro',
            contactPerson: 'Dana Reyes',
            phone: '+1 (201) 555-0148',
            email: 'teb@airculinaire.example',
            status: 'Confirmed',
            orderDeadlineUtc: at(now, 0, 18),
            deliveryUtc: at(now, 1, 7, 30),
            deliveryLocation: 'Signature TEB, east ramp',
            service: 'Dinner service',
            items: [
              { name: 'Seared tuna niçoise', category: 'Main', quantity: 1 },
              { name: 'Gluten-free rigatoni', category: 'Main', quantity: 1, note: 'GF pasta, separate prep surface' },
              { name: 'Caesar salad', category: 'Main', quantity: 1, note: 'dressing on the side' },
              { name: 'Fruit and cheese platter', category: 'Shared', quantity: 1 },
              { name: 'Still water 1 L', category: 'Beverage', quantity: 6 },
            ],
            specialInstructions: 'Nut-free galley — no nut oils, no marzipan garnish. Confirm sealed packaging on arrival.',
          },
        },
        {
          id: 'FA-LEG-2',
          legNumber: 2,
          flightNumber: 'PG318',
          origin: 'KLAX',
          destination: 'KLAS',
          departureUtc: at(now, 3, 14),
          arrivalUtc: at(now, 3, 15),
          passengerIds: ['PAX002', 'PAX006'],
          catering: {
            caterer: 'DaVinci Inflight — Los Angeles',
            contactPerson: 'Marco Bianchi',
            phone: '+1 (310) 555-0177',
            status: 'Ordered',
            orderDeadlineUtc: at(now, 2, 16),
            deliveryUtc: at(now, 3, 12, 30),
            deliveryLocation: 'Atlantic Aviation LAX',
            service: 'Light lunch',
            items: [
              { name: 'Grain bowl, plant-based', category: 'Main', quantity: 1 },
              { name: 'Vegetarian mezze', category: 'Main', quantity: 1 },
              { name: 'Sparkling water', category: 'Beverage', quantity: 4 },
            ],
            specialInstructions: 'Short leg — cold service only, no hot ovens.',
          },
        },
        {
          id: 'FA-LEG-3',
          legNumber: 3,
          flightNumber: 'PG422',
          origin: 'KLAS',
          destination: 'KTEB',
          departureUtc: at(now, 5, 11),
          arrivalUtc: at(now, 5, 18),
          passengerIds: ['PAX001', 'PAX004', 'PAX006'],
          catering: {
            caterer: 'Rudy’s Inflight Catering — Las Vegas',
            contactPerson: 'Priya Nandan',
            phone: '+1 (702) 555-0122',
            email: 'orders@rudysinflight.example',
            status: 'Not ordered',
            orderDeadlineUtc: at(now, 4, 15),
            deliveryUtc: at(now, 5, 9, 15),
            deliveryLocation: 'Signature LAS',
            service: 'Breakfast service',
            items: [],
            specialInstructions: 'Dairy-free for one passenger — oat milk, no butter on the pastries.',
          },
        },
      ],
    },
  ];
}
