// The ONLY import surface for availability outside src/availability.
//
// THIN by design, exactly like tech-log/bridge.ts: it assembles engine input from the tech-log
// projection, the scheduling store's trips, the crew roster and the availability store, then
// hands off to pure functions. No logic lives here — anything worth testing belongs in engine/.
//
// This is what lets the booking portal ask "is N1PG free on the 12th" without importing the
// tech-log bridge, the scheduling store and the executive view.

import {
  getCrewDayCoverage,
  getCrewRoster,
} from '../components/crew/crewRecords';
import { readFleetOpsDetail, readTripServiceabilityAlerts } from '../components/tech-log/bridge';
import type { Serviceability } from '../components/tech-log/types';
import type { TripRecord } from '../scheduling/store/types';
import {
  appendOverlay as appendOverlayToStore,
  loadAvailabilityData,
  saveDowntimeBlock as saveDowntimeBlockToStore,
} from './data/availabilityStore';
import { buildFleetAvailability, type AvailabilityInput, type PrincipalReserve } from './engine/availability';
import { disclose, discloseCell, type DisclosedAvailability, type DisclosedCell } from './engine/disclosure';
import { deriveReleaseSuggestions } from './engine/suggestions';
// D107: the trips module tells the engine who the principal is and when they are away. The
// dependency points this way (availability reads trips) so no page has to plumb it through.
import { loadTrips } from '../components/trips/data/tripsStore';
import { loadSettings } from '../components/trips/data/settingsStore';
import { principalReserveInput } from '../components/trips/engine/principal';
import type {
  Audience,
  AvailabilityData,
  FleetAvailability,
  MaintenanceDowntimeBlock,
  ReleaseSuggestion,
  SchedulerOverlay,
} from './types';

/** Trips a scheduling-store read handed us. Passed in so this stays usable under test. */
export interface AvailabilitySources {
  trips: TripRecord[];
  /** Overrides the persisted blocks/overlays — used by tests and by the myairops adapter. */
  data?: AvailabilityData;
  /** Override the D107 reserve: an explicit value, or `null` for none. Absent = read the trips module. */
  principalReserve?: PrincipalReserve | null;
}

function assembleInput(sources: AvailabilitySources, nowUtc: string, days: number): AvailabilityInput {
  const detail = readFleetOpsDetail(nowUtc);
  const data = sources.data ?? loadAvailabilityData(nowUtc);

  const tailStatus: Record<string, Serviceability> = {};
  const tailHeadline: Record<string, string | null> = {};
  for (const d of detail) {
    tailStatus[d.tailNumber] = d.status;
    tailHeadline[d.tailNumber] = d.headline;
  }

  return {
    // Tails come from the tech-log projection, which is the only roster that can receive a
    // verdict at all — a tail with no tech-log record has no serviceability to derive.
    tails: detail.map(d => ({ tail: d.tailNumber, type: d.type })),
    trips: sources.trips,
    downtime: data.downtimeBlocks,
    crewRoster: getCrewRoster(nowUtc),
    crewCoverage: getCrewDayCoverage(nowUtc, days),
    overlays: data.overlays,
    tailStatus,
    tailHeadline,
    principalReserve: sources.principalReserve === null ? undefined : (sources.principalReserve ?? principalReserveInput(loadTrips(), loadSettings().principalReserve)),
    tripAlerts: readTripServiceabilityAlerts(
      sources.trips.map(t => ({
        tripId: t.id,
        tripNumber: t.tripNumber,
        tail: t.tail,
        legs: t.legs.map(l => ({
          legId: l.id,
          departureTimeUtc: l.departureTimeUtc,
          arrivalTimeUtc: l.arrivalTimeUtc,
        })),
      })),
      nowUtc,
    ),
  };
}

export function readFleetAvailability(
  sources: AvailabilitySources,
  nowUtc: string,
  days = 14,
): FleetAvailability {
  return buildFleetAvailability(assembleInput(sources, nowUtc, days), nowUtc, days);
}

export function readDisclosedAvailability(
  sources: AvailabilitySources,
  audience: Audience,
  nowUtc: string,
  days = 14,
): DisclosedAvailability {
  return disclose(readFleetAvailability(sources, nowUtc, days), audience);
}

/**
 * Just the dates a draft request touches. Advisory: the booking form shows these lines beside the
 * legs, but never blocks a submission on them — scheduling assigns the aircraft, not the EA.
 */
export function readAvailabilityForDates(
  sources: AvailabilitySources,
  dates: string[],
  audience: Audience,
  nowUtc: string,
): DisclosedCell[] {
  if (dates.length === 0) return [];
  const wanted = new Set(dates);
  const horizon = horizonDays(dates, nowUtc);
  const fleet = readFleetAvailability(sources, nowUtc, horizon);
  return fleet.rows.flatMap(row =>
    row.cells.filter(c => wanted.has(c.dateUtc)).map(c => discloseCell(c, audience)),
  );
}

const DAY_MS = 86_400_000;
const MAX_HORIZON_DAYS = 400;

/** Enough days to reach the furthest requested date, capped so a typo cannot build a huge grid. */
function horizonDays(dates: string[], nowUtc: string): number {
  const todayMs = Date.parse(`${new Date(Date.parse(nowUtc)).toISOString().slice(0, 10)}T00:00:00.000Z`);
  const furthest = dates
    .map(d => Date.parse(`${d}T00:00:00.000Z`))
    .filter(ms => !Number.isNaN(ms))
    .reduce((max, ms) => Math.max(max, ms), todayMs);
  return Math.min(MAX_HORIZON_DAYS, Math.max(1, Math.floor((furthest - todayMs) / DAY_MS) + 1));
}

export function readReleaseSuggestions(
  sources: AvailabilitySources,
  nowUtc: string,
  days = 14,
): ReleaseSuggestion[] {
  const data = sources.data ?? loadAvailabilityData(nowUtc);
  return deriveReleaseSuggestions(
    assembleInput(sources, nowUtc, days),
    readFleetAvailability(sources, nowUtc, days),
    data.overlays,
    nowUtc,
  );
}

/** THIN localStorage wrapper. */
export function saveDowntimeBlock(block: MaintenanceDowntimeBlock, nowUtc: string): void {
  saveDowntimeBlockToStore(block, nowUtc);
}

/** THIN localStorage wrapper. APPEND-ONLY — see engine/holds.ts. */
export function appendOverlay(overlay: SchedulerOverlay, nowUtc: string): void {
  appendOverlayToStore(overlay, nowUtc);
}

export { loadAvailabilityData };
export type { DisclosedAvailability, DisclosedCell };
