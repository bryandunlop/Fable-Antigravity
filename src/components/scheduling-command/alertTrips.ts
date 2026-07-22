// Pure reshape: scheduling TripRecords -> the alert engine's TripForAlerts.
// Extracted from SchedulingCommandCenter's effect so it is testable (vitest
// runs only .ts files) — review finding 2 on feat/myairops-adapters.

import type { TripRecord } from '../../scheduling/store/types';
import type { TripForAlerts } from '../tech-log/bridge';

/** Trips worth alerting on: anything not explicitly over or called off. */
export function toTripsForAlerts(rows: TripRecord[]): TripForAlerts[] {
  return rows
    .filter(t => t.status !== 'cancelled' && t.status !== 'completed')
    .map(t => ({
      tripId: t.id,
      tripNumber: t.tripNumber,
      tail: t.tail,
      legs: t.legs.map(l => ({
        legId: l.id,
        departureTimeUtc: l.departureTimeUtc,
        ...(l.arrivalTimeUtc ? { arrivalTimeUtc: l.arrivalTimeUtc } : {}),
      })),
    }));
}
