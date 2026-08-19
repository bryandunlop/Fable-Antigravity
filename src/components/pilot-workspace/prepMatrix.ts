import type { Trip, TripLeg, Aircraft } from '../tech-log/types';
import { requiresFuelFarmSubmission } from '../tech-log/engine/fuel';
import { FUEL_LOCK_HOURS_BEFORE_ETD } from '../tech-log/preflightActions';

/**
 * The prep pane's instrument (D84): one row per leg, one column per item.
 *
 * The leg stepper is the wrong shape for prep. Days ahead, the work is one pass down FUEL, one down
 * FRAT, one down AIRPORTS — Bryan's own description of the job — and a stepper forces four walks
 * through a leg instead. This selector reduces a trip to that grid.
 *
 * It returns STATE and DATA, never display strings: labels and time formatting belong to the
 * component, so these tests do not break when the copy changes.
 */
export type PrepCellState =
  | 'todo'    // actionable now
  | 'draft'   // started, resumable
  | 'done'
  | 'locked'  // was actionable, boundary has passed — offering a button here is a lie
  | 'na';     // does not apply to this leg

export interface PrepCell {
  state: PrepCellState;
  /** Fuel only: the instant the request stops being accepted (ETD minus the lock window). */
  lockAtUtc?: string;
  /** FRAT only, when done: the latest submitted score. */
  score?: number;
  /** Airport only, when outstanding: which fields still need reviewing. */
  icaos?: string[];
}

export interface PrepRow {
  leg: TripLeg;
  frat: PrepCell;
  airport: PrepCell;
  fuel: PrepCell;
}

const HOUR_MS = 60 * 60 * 1000;

function fratCell(leg: TripLeg): PrepCell {
  if (leg.fratStatus === 'COMPLETED') return { state: 'done', score: leg.fratScore };
  if (leg.fratStatus === 'IN_PROGRESS') return { state: 'draft' };
  return { state: 'todo' };
}

function airportCell(leg: TripLeg): PrepCell {
  return leg.airportReviewed
    ? { state: 'done' }
    : { state: 'todo', icaos: [leg.departureIcao, leg.arrivalIcao] };
}

function fuelCell(leg: TripLeg, aircraft: Aircraft | undefined, nowUtc: string): PrepCell {
  // No aircraft yet (released to a placeholder tail) means the home-base test cannot be run at all.
  if (!aircraft || !requiresFuelFarmSubmission(leg, aircraft)) return { state: 'na' };
  if (leg.fuelRequestId) return { state: 'done' };

  const lockAtUtc = new Date(
    new Date(leg.departureTimeUtc).getTime() - FUEL_LOCK_HOURS_BEFORE_ETD * HOUR_MS,
  ).toISOString();
  // `submitFuelOnLeg` refuses at exactly the boundary (`hoursUntil <= 4`), so `>=` here — the matrix
  // must agree with the action it offers, not approximately agree with it.
  return new Date(nowUtc).getTime() >= new Date(lockAtUtc).getTime()
    ? { state: 'locked', lockAtUtc }
    : { state: 'todo', lockAtUtc };
}

export function derivePrepRows(
  tlTrip: Trip | null,
  aircraft: Aircraft | undefined,
  nowUtc: string,
): PrepRow[] {
  return [...(tlTrip?.legs ?? [])]
    .sort((a, b) => a.sequence - b.sequence)
    .map((leg) => ({
      leg,
      frat: fratCell(leg),
      airport: airportCell(leg),
      fuel: fuelCell(leg, aircraft, nowUtc),
    }));
}

const CELLS = (r: PrepRow) => [r.frat, r.airport, r.fuel];

/** What the pilot can still do something about — the number worth putting on a chip. */
export function prepOutstanding(rows: PrepRow[]): number {
  return rows.flatMap(CELLS).filter((c) => c.state === 'todo' || c.state === 'draft').length;
}

/** Missed boundaries. Counted apart from `prepOutstanding` because no amount of prep clears them. */
export function prepLocked(rows: PrepRow[]): number {
  return rows.flatMap(CELLS).filter((c) => c.state === 'locked').length;
}
