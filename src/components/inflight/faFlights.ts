// Mock upcoming flights for the flight-attendant view. Passenger references are
// shared-store passenger ids, so the manifest shows the same records (allergies,
// notes, photos) the Passenger Database owns. Dates are relative to "now" so the
// list always looks current in the demo.

export interface FaFlightLeg {
  id: string;
  flightNumber: string;
  tail: string;
  origin: string;
  destination: string;
  departureUtc: string;
  arrivalUtc: string;
  cabinCrew: string[];
  cateringNotes?: string;
  passengerIds: string[];
}

function at(base: Date, addDays: number, hour: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + addDays);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

/** The current flight attendant's upcoming legs. `now` is injected so callers
 * control the clock (component passes new Date()). */
export function buildFaFlights(now: Date): FaFlightLeg[] {
  return [
    {
      id: 'FA-LEG-1',
      flightNumber: 'PG241',
      tail: 'N1PG',
      origin: 'KTEB',
      destination: 'KLAX',
      departureUtc: at(now, 1, 9),
      arrivalUtc: at(now, 1, 15),
      cabinCrew: ['You', 'Maria Lopez'],
      cateringNotes: 'Dinner service. No nuts on board (critical). One gluten-free main.',
      passengerIds: ['PAX001', 'PAX003', 'PAX005'],
    },
    {
      id: 'FA-LEG-2',
      flightNumber: 'PG318',
      tail: 'N5PG',
      origin: 'KLAX',
      destination: 'KLAS',
      departureUtc: at(now, 3, 14),
      arrivalUtc: at(now, 3, 15),
      cabinCrew: ['You'],
      cateringNotes: 'Light lunch. Vegetarian + plant-based options.',
      passengerIds: ['PAX002', 'PAX006'],
    },
    {
      id: 'FA-LEG-3',
      flightNumber: 'PG422',
      tail: 'N1PG',
      origin: 'KLAS',
      destination: 'KTEB',
      departureUtc: at(now, 5, 11),
      arrivalUtc: at(now, 5, 18),
      cabinCrew: ['You', 'Maria Lopez'],
      cateringNotes: 'Breakfast service. Dairy-free for one passenger.',
      passengerIds: ['PAX001', 'PAX004', 'PAX006'],
    },
  ];
}
