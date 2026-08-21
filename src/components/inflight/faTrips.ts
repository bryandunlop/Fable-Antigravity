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
          // Five booked: two profiles, two booking stubs, and one id with no record
          // at all. The dangling id is deliberate — it is what a stale manifest looks
          // like, and the roster must still show five.
          passengerIds: ['PAX001', 'PAX003', 'PAX007', 'PAX008', 'PAX-9902'],
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
    {
      id: 'FA-TRIP-2',
      tripNumber: 'TRP-2026-0047',
      tripName: 'Cincinnati shuttle',
      tail: 'N5PG',
      aircraftType: 'G500',
      cabinCrew: ['You'],
      legs: [
        {
          id: 'FA-TRIP2-LEG-1',
          legNumber: 1,
          flightNumber: 'PG512',
          origin: 'KTEB',
          destination: 'KLUK',
          departureUtc: at(now, 13, 8),
          arrivalUtc: at(now, 13, 10, 30),
          passengerIds: ['PAX002', 'PAX005'],
          catering: {
            caterer: 'Sky Chefs — Teterboro',
            contactPerson: 'Owen Brady',
            phone: '+1 (201) 555-0193',
            status: 'Ordered',
            orderDeadlineUtc: at(now, 12, 15),
            deliveryUtc: at(now, 13, 6, 30),
            deliveryLocation: 'Signature TEB',
            service: 'Breakfast service',
            items: [
              { name: 'Greek yoghurt and berries', category: 'Main', quantity: 2 },
              { name: 'Gluten-free granola', category: 'Main', quantity: 1, note: 'sealed, separate container' },
              { name: 'Green tea', category: 'Beverage', quantity: 2 },
            ],
            specialInstructions: 'One gluten-free cover — keep the granola sealed until service.',
          },
        },
        {
          id: 'FA-TRIP2-LEG-2',
          legNumber: 2,
          flightNumber: 'PG519',
          origin: 'KLUK',
          destination: 'KTEB',
          departureUtc: at(now, 15, 16),
          arrivalUtc: at(now, 15, 18, 15),
          passengerIds: ['PAX002', 'PAX004'],
        },
      ],
    },
    {
      id: 'FA-TRIP-3',
      tripNumber: 'TRP-2026-0052',
      tripName: 'Aspen weekend',
      tail: 'N1PG',
      aircraftType: 'G650ER',
      cabinCrew: ['You', 'Maria Lopez'],
      legs: [
        {
          id: 'FA-TRIP3-LEG-1',
          legNumber: 1,
          flightNumber: 'PG604',
          origin: 'KTEB',
          destination: 'KASE',
          departureUtc: at(now, 31, 13),
          arrivalUtc: at(now, 31, 17, 30),
          passengerIds: ['PAX001', 'PAX003', 'PAX007'],
        },
        {
          id: 'FA-TRIP3-LEG-2',
          legNumber: 2,
          flightNumber: 'PG611',
          origin: 'KASE',
          destination: 'KTEB',
          departureUtc: at(now, 33, 15),
          arrivalUtc: at(now, 33, 21),
          passengerIds: ['PAX001', 'PAX006'],
        },
      ],
    },
  ];
}
