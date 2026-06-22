import type { Aircraft, TripLeg } from '../types';

// A home-base (fuel-farm) submission is required only for a leg departing the
// aircraft's home base — at outstations the FBO uplifts fuel. Exact ICAO match.
export function requiresFuelFarmSubmission(leg: TripLeg, aircraft: Aircraft): boolean {
  return leg.departureIcao === aircraft.homeBase;
}
