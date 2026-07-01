// Resolves a myGFO trip leg to the ForeFlight flight myairops already created for it.
//
// The real GetFlights endpoint has no tailNumber filter — only fromDate/toDate/tags/search —
// so this fetches the departure-day window and matches client-side on tail + route, which is
// what a real integration is actually forced to do against the documented API.

import type { TripRecord, TripLegRecord } from '../store/types';
import type { ForeFlightDispatchClient, ForeFlightFlightRef } from './foreflightClient';

export async function findFlightForLeg(
  leg: TripLegRecord,
  trip: TripRecord,
  client: ForeFlightDispatchClient,
): Promise<ForeFlightFlightRef | null> {
  const day = leg.departureTimeUtc.slice(0, 10);
  const candidates = await client.listFlights({
    fromDate: `${day}T00:00:00.000Z`,
    toDate: `${day}T23:59:59.999Z`,
  });
  return candidates.find((f) => (
    f.aircraftRegistration === trip.tail
    && f.departure === leg.departureIcao
    && f.destination === leg.arrivalIcao
  )) ?? null;
}
