import type { Trip, Aircraft } from '../tech-log/types';
import { requiresFuelFarmSubmission } from '../tech-log/engine/fuel';
import type { TripRecord } from '../../scheduling/store/types';
import { firstDeparture } from './selectors';

const DAY_MS = 24 * 60 * 60 * 1000;
export const THIS_WEEK_DAYS = 7;
export const NEXT_2_WEEKS_DAYS = 14;
export const THIS_MONTH_DAYS = 30;

export interface HorizonGroups {
  inProgress: TripRecord[];
  thisWeek: TripRecord[];
  next2Weeks: TripRecord[];
  laterThisMonth: TripRecord[];
  nextMonth: TripRecord[];
}

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

/** Bucket a pilot's trips into an in-progress pin plus four forward time bands,
 *  soonest departure first within each band. Self-contained: sorts internally, so
 *  callers need not pre-sort. Boundaries (7/14/30 days) are inclusive at the lower band.
 *  A past-due trip (departure already elapsed) that is not in_progress falls into thisWeek. */
export function groupTripsByHorizon(trips: TripRecord[], nowUtc: string): HorizonGroups {
  const nowMs = new Date(nowUtc).getTime();
  const groups: HorizonGroups = {
    inProgress: [], thisWeek: [], next2Weeks: [], laterThisMonth: [], nextMonth: [],
  };
  const sorted = [...trips].sort((a, b) => firstDeparture(a) - firstDeparture(b));
  for (const t of sorted) {
    if (t.status === 'in_progress') { groups.inProgress.push(t); continue; }
    const days = (firstDeparture(t) - nowMs) / DAY_MS;
    if (days <= THIS_WEEK_DAYS) groups.thisWeek.push(t);
    else if (days <= NEXT_2_WEEKS_DAYS) groups.next2Weeks.push(t);
    else if (days <= THIS_MONTH_DAYS) groups.laterThisMonth.push(t);
    else groups.nextMonth.push(t);
  }
  return groups;
}
