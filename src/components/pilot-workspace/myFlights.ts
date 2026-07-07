import type { Trip, Aircraft } from '../tech-log/types';
import { requiresFuelFarmSubmission } from '../tech-log/engine/fuel';

/** A released trip needs the pilot's prep when any leg has an outstanding pilot action:
 *  FRAT not completed, airport not reviewed, or a home-base (leg-one) fuel-farm submission
 *  not yet made. A trip with no tech-log mirror (not released to preflight) needs nothing;
 *  aircraft serviceability is the readiness dot's concern, not a prep item. */
export function tripNeedsPrep(tlTrip: Trip | null, aircraft: Aircraft | undefined): boolean {
  if (!tlTrip) return false;
  for (const leg of tlTrip.legs ?? []) {
    if (leg.fratStatus !== 'COMPLETED') return true;
    if (!leg.airportReviewed) return true;
    if (aircraft && requiresFuelFarmSubmission(leg, aircraft) && !leg.fuelRequestId) return true;
  }
  return false;
}
