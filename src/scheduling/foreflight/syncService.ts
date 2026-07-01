// Orchestrates the myGFO -> ForeFlight document push: pull the myairops trip sheet,
// render it, resolve each leg's ForeFlight flight, and push/replace files idempotently.
//
// "Idempotently" matters because ForeFlight's Files API has no in-place content edit —
// updating a file means delete-then-reupload. Re-running the push after nothing has
// changed should not spam ForeFlight with churn, so this service tracks the hash of the
// last content it pushed per (flight, displayName) and only calls the API when that
// hash has actually changed.

import type { TripRecord } from '../store/types';
import type { ForeFlightDispatchClient, ForeFlightFileRecord, ForeFlightFileUploadInput } from './foreflightClient';
import type { MyAirOpsClient } from './myairopsClient';
import type { PushItemResult, PushItemStatus, SyncReport } from './types';
import { findFlightForLeg } from './flightMatcher';
import { renderTripSheetHtml } from './tripSheetDocument';
import { getPassengerTravelDocuments } from './passengerDocuments';

export interface ForeFlightSyncServiceDeps {
  foreFlight: ForeFlightDispatchClient;
  myAirOps: MyAirOpsClient;
}

function simpleHash(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) h = (Math.imul(h, 31) + input.charCodeAt(i)) | 0;
  return h.toString(36);
}

export class ForeFlightSyncService {
  private foreFlight: ForeFlightDispatchClient;
  private myAirOps: MyAirOpsClient;
  private lastPushedHash = new Map<string, string>(); // key: `${flightId}::${displayName}`

  constructor(deps: ForeFlightSyncServiceDeps) {
    this.foreFlight = deps.foreFlight;
    this.myAirOps = deps.myAirOps;
  }

  async pushTripDocuments(trip: TripRecord, nowUtc: string): Promise<SyncReport> {
    const sheet = await this.myAirOps.getTripSheet(trip);
    // myairops already pushed these flights to ForeFlight in the real world; the fake
    // client needs an explicit seed step to stand in for that (see foreflightClient.ts).
    await this.foreFlight.seedFlightsFromTrip(trip);

    const tripSheetHtml = renderTripSheetHtml(sheet);
    const travelDocs = getPassengerTravelDocuments(sheet);
    const details: PushItemResult[] = [];

    for (const leg of trip.legs) {
      const route = `${leg.departureIcao}-${leg.arrivalIcao}`;
      const flight = await findFlightForLeg(leg, trip, this.foreFlight);

      if (!flight) {
        details.push({
          legId: leg.id,
          route,
          docType: 'trip_sheet',
          displayName: 'Trip Sheet',
          status: 'no_matching_flight',
          message: 'No ForeFlight flight found for this leg yet — myairops may not have synced it.',
        });
        continue;
      }

      details.push(await this.pushFile(flight.flightId, {
        displayName: `Trip Sheet — ${trip.tail} — ${route}`,
        category: 'General',
        mimeType: 'text/html',
        content: tripSheetHtml,
      }, 'trip_sheet', leg.id, route));

      const docsForLeg = travelDocs.filter((d) => d.legIds.includes(leg.id));
      for (const doc of docsForLeg) {
        details.push(await this.pushFile(flight.flightId, {
          displayName: doc.displayName,
          category: 'General',
          mimeType: 'text/html',
          content: doc.htmlContent,
        }, 'travel_document', leg.id, route));
      }
    }

    const successful = details.filter((d) => (
      d.status === 'uploaded' || d.status === 'replaced' || d.status === 'unchanged'
    )).length;
    const updated = details.filter((d) => d.status === 'replaced').length;
    const failed = details.filter((d) => d.status === 'error' || d.status === 'no_matching_flight').length;

    return {
      tripId: trip.id,
      tripNumber: trip.tripNumber,
      timestampUtc: nowUtc,
      total: details.length,
      successful,
      updated,
      failed,
      details,
    };
  }

  /** What's currently sitting in ForeFlight's Files tab for each leg of this trip. */
  async listDeliveredFiles(trip: TripRecord): Promise<Record<string, ForeFlightFileRecord[]>> {
    const out: Record<string, ForeFlightFileRecord[]> = {};
    for (const leg of trip.legs) {
      const flight = await findFlightForLeg(leg, trip, this.foreFlight);
      out[leg.id] = flight ? await this.foreFlight.listFilesForFlight(flight.flightId) : [];
    }
    return out;
  }

  private async pushFile(
    flightId: string,
    input: ForeFlightFileUploadInput,
    docType: PushItemResult['docType'],
    legId: string,
    route: string,
  ): Promise<PushItemResult> {
    const key = `${flightId}::${input.displayName}`;
    const hash = simpleHash(input.content);
    const previousHash = this.lastPushedHash.get(key);

    if (previousHash === hash) {
      return {
        legId, route, docType, displayName: input.displayName, status: 'unchanged', foreFlightFlightId: flightId,
      };
    }

    let status: PushItemStatus;
    try {
      if (previousHash !== undefined) {
        // Content changed. No in-place edit exists — replace via delete + reupload.
        const existing = await this.foreFlight.listFilesForFlight(flightId);
        const old = existing.find((f) => f.displayName === input.displayName);
        if (old) await this.foreFlight.deleteFile(flightId, old.objectId);
        status = 'replaced';
      } else {
        status = 'uploaded';
      }
      const uploaded = await this.foreFlight.uploadFile(flightId, input);
      this.lastPushedHash.set(key, hash);
      return {
        legId, route, docType, displayName: input.displayName, status, foreFlightFlightId: flightId, fileObjectId: uploaded.objectId,
      };
    } catch (err) {
      return {
        legId,
        route,
        docType,
        displayName: input.displayName,
        status: 'error',
        foreFlightFlightId: flightId,
        message: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }
}
