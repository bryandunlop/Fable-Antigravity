// Seeded maintenance downtime + scheduler overlays.
//
// Shaped exactly like myairops MaintenanceEntryModel (see MaintenanceDowntimeBlock) so the
// Phase-2 pull replaces this file's output rather than the model. Dates are computed RELATIVE
// TO NOW, same discipline as crewRecords and seedTrips, so the demo never goes stale.

import type { AvailabilityData, MaintenanceDowntimeBlock, SchedulerOverlay } from '../types';

const DAY_MS = 86_400_000;

function at(nowMs: number, days: number, hourUtc: number): string {
  const d = new Date(nowMs + days * DAY_MS);
  d.setUTCHours(hourUtc, 0, 0, 0);
  return d.toISOString();
}

function dayKey(nowMs: number, days: number): string {
  return new Date(nowMs + days * DAY_MS).toISOString().slice(0, 10);
}

/**
 * The seeded downtime picture.
 *
 * N1PG is the RED seed tail (d-n1pg gear defect). It gets a block with a real end date so the
 * demo shows the good case — "in maintenance until <date>" rather than the down-forever cell
 * LG-308 objects to. N5PG gets a routine future inspection so the board has a second block that
 * is not tied to a defect at all.
 */
export function buildDowntimeFixtures(nowUtcIso: string): MaintenanceDowntimeBlock[] {
  const now = Date.parse(nowUtcIso);
  return [
    {
      id: 'mx-n1pg-gear',
      tail: 'N1PG',
      maintenanceType: 'AOG rectification',
      category: 'Unscheduled',
      description: 'Main landing gear actuator — awaiting part, Savannah',
      airportIcao: 'KLUK',
      vendorName: 'Gulfstream Savannah',
      woNumber: 'WO-4471',
      scheduledStartUtc: at(now, -1, 12),
      scheduledEndUtc: at(now, 4, 18),
      actualStartUtc: at(now, -1, 13),
      actualEndUtc: null,
      cancelled: false,
      released: false,
      createdBy: 'USR005',
      createdAtUtc: at(now, -1, 11),
      modifiedBy: null,
      modifiedAtUtc: null,
      source: 'local',
      sourceRef: null,
    },
    {
      id: 'mx-n5pg-96mo',
      tail: 'N5PG',
      maintenanceType: 'Scheduled inspection',
      category: 'Inspection',
      description: '12-month inspection — hangar slot booked',
      airportIcao: 'KSAV',
      vendorName: 'Gulfstream Savannah',
      woNumber: 'WO-4502',
      scheduledStartUtc: at(now, 8, 8),
      scheduledEndUtc: at(now, 11, 17),
      actualStartUtc: null,
      actualEndUtc: null,
      cancelled: false,
      released: false,
      createdBy: 'USR005',
      createdAtUtc: at(now, -6, 9),
      modifiedBy: null,
      modifiedAtUtc: null,
      source: 'local',
      sourceRef: null,
    },
  ];
}

/**
 * Seeded overlays — one live hold, so the executive view has something reading
 * "Held by scheduling" out of the box and the declared-inventory idea is visible.
 */
export function buildOverlayFixtures(nowUtcIso: string): SchedulerOverlay[] {
  const now = Date.parse(nowUtcIso);
  return [
    {
      id: 'ov-n6pg-board',
      kind: 'hold',
      tail: 'N6PG',
      fromDateUtc: dayKey(now, 5),
      toDateUtc: dayKey(now, 7),
      reasonNote: 'Board week — CEO travel likely, do not release until the agenda is fixed.',
      publicLabel: 'Held by scheduling — board week',
      createdBy: 'Dana Whitfield',
      createdByRole: 'scheduling',
      createdAtUtc: at(now, -3, 14),
    },
  ];
}

export function buildAvailabilityFixtures(nowUtcIso: string): AvailabilityData {
  return {
    downtimeBlocks: buildDowntimeFixtures(nowUtcIso),
    overlays: buildOverlayFixtures(nowUtcIso),
  };
}
