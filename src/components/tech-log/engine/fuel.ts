import type { Aircraft, TripLeg, TechLogState } from '../types';

// A home-base (fuel-farm) submission is required only for a leg departing the
// aircraft's home base — at outstations the FBO uplifts fuel. Exact ICAO match.
export function requiresFuelFarmSubmission(leg: TripLeg, aircraft: Aircraft): boolean {
  return leg.departureIcao === aircraft.homeBase;
}

/** The earliest upcoming leg for this aircraft whose crew has finalized planned fuel — the source
 * the postflight fuel step offers as "next flight load" before falling back to the tail's standby load. */
export function findNextFinalizedLeg(
  aircraftId: string,
  state: Pick<TechLogState, 'trips'>,
  nowUtc: string,
): TripLeg | undefined {
  return state.trips
    .filter(t => t.aircraftId === aircraftId && t.status === 'OPEN')
    .flatMap(t => t.legs ?? [])
    .filter(l => l.fuelFinalizedAtUtc && l.departureTimeUtc > nowUtc)
    .sort((a, b) => a.departureTimeUtc.localeCompare(b.departureTimeUtc))[0];
}
