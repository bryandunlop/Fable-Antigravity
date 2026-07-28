// The seam between "where myairops trips come from" and everything that reads them.
//
// Today: the typed fixtures, mapped through the same adapter a real pull uses.
// Phase 2: the fixture call swaps for HTTP and nothing downstream changes.
//
// A real pull cannot ask myairops "which trips for tail N2PG" — GET /api/Trips takes only
// fromDate / toDate / clientId / skip / limit, with NO aircraft filter
// (ref-myairops-booking-api). So the shape is always: fetch a date window, then match on
// tail client-side. resolveLegForTail does that half. Same constraint, same workaround as
// scheduling/foreflight/flightMatcher.ts.
//
// PULL-ONLY. Nothing here builds a request body headed toward myairops.

import type { TripRecord } from '../../scheduling/store/types';
import { mapBookingTripToTripRecord } from './bookingAdapter';
import { buildMyairopsBookingFixtures } from './fixtures/bookingTrips';

/**
 * The myairops trip mirrors visible to myGFO at `nowUtcIso`.
 *
 * Trips the adapter rejects are SKIPPED, not fatal: the adapter throws on a leg with no
 * departureDateTime (unpinned — calculated, never operator-authored) or a missing ICAO, and
 * this runs inside a render path. Dropping one malformed trip is right; blanking the fleet
 * page is not.
 */
export function loadMyairopsTripMirrors(nowUtcIso: string): TripRecord[] {
  const mirrors: TripRecord[] = [];
  for (const fixture of buildMyairopsBookingFixtures(nowUtcIso)) {
    try {
      mirrors.push(mapBookingTripToTripRecord(fixture.trip, { nowUtc: nowUtcIso }));
    } catch {
      // Unmappable trip (unpinned leg times, missing airport) — skip it, per the adapter's
      // own rule that a puller parks rather than invents.
    }
  }
  return mirrors;
}
