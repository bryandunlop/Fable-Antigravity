// Fake stand-in for ForeFlight's real Dispatch API (Aircraft / Flights / Files-in-Flight,
// per ForeFlight's public OpenAPI spec). Field names on ForeFlightFlightRef and
// ForeFlightFileRecord mirror the real DTOFlightSummary / DTOFlightAttachment shapes,
// so swapping FakeForeFlightDispatchClient for a real HTTP client later is a drop-in
// (same interface, same field names), not a redesign.
//
// IMPORTANT: myGFO never creates flights in ForeFlight — myairops does, via its own
// existing schedule push (see GetFlights / GetModifiedFlights in the real spec).
// seedFlightsFromTrip() stands in for "myairops already pushed this trip's legs,"
// which is why ForeFlightSyncService calls it before trying to match/attach files.
//
// The real GetFlights endpoint only filters by fromDate/toDate/tags/search — there's
// no tailNumber query param — so flightMatcher.ts fetches by date window and filters
// client-side by aircraftRegistration + route, exactly as a real integration would have to.

import type { TripRecord } from '../store/types';

export interface ForeFlightFlightRef {
  flightId: string;
  aircraftRegistration: string;
  departure: string;
  destination: string;
  departureTime: string; // ISO UTC — matches DTOFlightSummary.departureTime
}

export type ForeFlightFileCategory = 'General' | 'LoadSheet' | 'Notoc' | 'SignatureReport';

export interface ForeFlightFileUploadInput {
  displayName: string;
  category: ForeFlightFileCategory;
  mimeType: string;
  content: string; // HTML string for the demo; a real client sends multipart/form-data binary
}

export interface ForeFlightFileRecord {
  objectId: string;
  flightObjectId: string;
  displayName: string;
  mimeType: string;
  category: ForeFlightFileCategory;
  downloadUrl: string;
  dateCreated: string;
  dateUpdated?: string;
}

export interface ForeFlightDispatchClient {
  /** Demo-only seam: stands in for myairops's existing schedule push into ForeFlight. */
  seedFlightsFromTrip(trip: TripRecord): Promise<void>;
  listFlights(params: { fromDate: string; toDate: string }): Promise<ForeFlightFlightRef[]>;
  listFilesForFlight(flightId: string): Promise<ForeFlightFileRecord[]>;
  uploadFile(flightId: string, input: ForeFlightFileUploadInput): Promise<ForeFlightFileRecord>;
  deleteFile(flightId: string, fileObjectId: string): Promise<void>;
}

function toDataUrl(content: string, mimeType: string): string {
  const base64 = typeof Buffer !== 'undefined'
    ? Buffer.from(content, 'utf-8').toString('base64')
    : btoa(unescape(encodeURIComponent(content)));
  return `data:${mimeType};base64,${base64}`;
}

export class FakeForeFlightDispatchClient implements ForeFlightDispatchClient {
  private flights = new Map<string, ForeFlightFlightRef>(); // keyed by flightId
  private filesByFlight = new Map<string, ForeFlightFileRecord[]>();
  private seededLegs = new Set<string>(); // `${tripId}:${legId}` — seed each leg's flight once
  private objectIdCounter = 0;

  private nextObjectId(prefix: string): string {
    this.objectIdCounter += 1;
    return `${prefix}-${this.objectIdCounter.toString().padStart(6, '0')}`;
  }

  async seedFlightsFromTrip(trip: TripRecord): Promise<void> {
    for (const leg of trip.legs) {
      const seedKey = `${trip.id}:${leg.id}`;
      if (this.seededLegs.has(seedKey)) continue;
      this.seededLegs.add(seedKey);
      const flightId = this.nextObjectId('FF-FLT');
      this.flights.set(flightId, {
        flightId,
        aircraftRegistration: trip.tail,
        departure: leg.departureIcao,
        destination: leg.arrivalIcao,
        departureTime: leg.departureTimeUtc,
      });
    }
  }

  async listFlights(params: { fromDate: string; toDate: string }): Promise<ForeFlightFlightRef[]> {
    const from = new Date(params.fromDate).getTime();
    const to = new Date(params.toDate).getTime();
    return [...this.flights.values()].filter((f) => {
      const t = new Date(f.departureTime).getTime();
      return t >= from && t <= to;
    });
  }

  async listFilesForFlight(flightId: string): Promise<ForeFlightFileRecord[]> {
    return [...(this.filesByFlight.get(flightId) ?? [])];
  }

  async uploadFile(flightId: string, input: ForeFlightFileUploadInput): Promise<ForeFlightFileRecord> {
    if (!this.flights.has(flightId)) throw new Error(`No flight with ID = ${flightId}`); // mirrors the real API's 404 text
    const record: ForeFlightFileRecord = {
      objectId: this.nextObjectId('FF-FILE'),
      flightObjectId: flightId,
      displayName: input.displayName,
      mimeType: input.mimeType,
      category: input.category,
      downloadUrl: toDataUrl(input.content, input.mimeType),
      dateCreated: new Date().toISOString(),
    };
    const existing = this.filesByFlight.get(flightId) ?? [];
    existing.push(record);
    this.filesByFlight.set(flightId, existing);
    return record;
  }

  async deleteFile(flightId: string, fileObjectId: string): Promise<void> {
    const existing = this.filesByFlight.get(flightId) ?? [];
    this.filesByFlight.set(flightId, existing.filter((f) => f.objectId !== fileObjectId));
  }
}
