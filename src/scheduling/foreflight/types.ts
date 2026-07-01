// Demo-scoped types for the myGFO -> ForeFlight document delivery slice.
//
// myairops stays the source of truth for trip-sheet content (crew, FBOs, leg
// notes, passenger roster) — myGFO pulls it, renders a trip sheet, and pushes
// it — plus myGFO-owned passenger travel documents — into ForeFlight's Files
// tab for the matching flight. myGFO never creates flights in ForeFlight;
// myairops already does that via its own existing schedule push.

export interface MyAirOpsCrewMember {
  name: string;
  role: 'PIC' | 'SIC' | 'FA';
  phone: string;
}

export interface MyAirOpsFbo {
  name: string;
  phone: string;
}

export interface MyAirOpsAirportRef {
  icao: string;
  city: string;
  country: string;
}

export interface MyAirOpsLegSheet {
  legId: string; // correlates to TripLegRecord.id
  dayOfWeek: string;
  departure: MyAirOpsAirportRef;
  arrival: MyAirOpsAirportRef;
  etdLocal: string; // "HH:MM"
  etdUtc: string; // ISO
  etdUtcOffsetHours: number;
  etaLocal: string; // "HH:MM"
  etaUtc: string; // ISO
  etaUtcOffsetHours: number;
  eft: string; // "H:MM" estimated flight time
  ete: string; // "H:MM" estimated time enroute (incl. taxi allowance)
  paxCount: number;
  departureFbo: MyAirOpsFbo;
  arrivalFbo: MyAirOpsFbo;
  legComments?: string;
  paxCateringRequests?: string;
  schedulingNotes?: string;
}

export interface MyAirOpsOperationalMessage {
  icao: string;
  message: string;
}

export interface MyAirOpsPassenger {
  name: string;
  employeeNumber: string;
  phone: string;
  nationality: string;
  legIds: string[];
}

export interface MyAirOpsTripSheet {
  tripNumber: string;
  tail: string;
  aircraftType: string;
  tripDates: { startDate: string; endDate: string };
  crew: MyAirOpsCrewMember[];
  legs: MyAirOpsLegSheet[];
  passengers: MyAirOpsPassenger[];
  operationalMessages: MyAirOpsOperationalMessage[];
}

export type TravelDocumentType = 'itinerary' | 'passport' | 'visa' | 'other';

export interface PassengerTravelDocument {
  id: string;
  passengerName: string;
  docType: TravelDocumentType;
  displayName: string;
  legIds: string[]; // which legs this document should ride along on
  htmlContent: string; // demo stand-in for a real scanned/generated file
}

export type PushItemStatus = 'uploaded' | 'replaced' | 'unchanged' | 'no_matching_flight' | 'error';

export interface PushItemResult {
  legId: string;
  route: string; // e.g. "KTEB-KHOU", for readable reports
  docType: 'trip_sheet' | 'travel_document';
  displayName: string;
  status: PushItemStatus;
  foreFlightFlightId?: string;
  fileObjectId?: string;
  message?: string;
}

export interface SyncReport {
  tripId: string;
  tripNumber: string;
  timestampUtc: string;
  total: number;
  successful: number; // uploaded + replaced + unchanged
  updated: number; // replaced only
  failed: number; // error + no_matching_flight
  details: PushItemResult[];
}
