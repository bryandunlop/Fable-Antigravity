import type { TripLeg } from '../tech-log/types';

/**
 * Which instrument the pilot workspace hands you, per D84.
 *
 * Prep and day-of are different JOBS, not two views of one job:
 *   - PREP is worked BY ITEM ACROSS LEGS — one pass down fuel, one down FRAT, one down airports,
 *     days ahead. Its instrument is the leg x item matrix.
 *   - DAY-OF is worked BY CLOCK WITHIN ONE LEG. Its instrument is the countdown + ranked queue.
 *
 * The clock chooses, and the pilot can override — a mode that changes under you without a way back
 * is a trap, and a mode you must remember to enter is a chore (both were drawn and rejected).
 *
 * THE THRESHOLD IS A GUESS AND IS MARKED AS ONE. 12h covers the duty day and lands comfortably
 * before the T-4h home-base fuel lock (`requiresFuelFarmSubmission`), so the countdown surfaces
 * that lock while it can still be acted on; 4h would be too late to help and 24h is noise. The real
 * number is a Chief Pilot ruling — see D84's open list. It is one constant so that ruling is a
 * one-line change.
 *
 * DELIBERATELY NOT CALENDAR MATH. This is a fixed offset from an instant, so no timezone and no DST
 * transition can move it. That is the opposite of the PL-25 repair clock (D24), which is anchored to
 * an operator reference zone and must be computed with the IANA database. Do not unify them.
 */
export const DAY_OF_THRESHOLD_HOURS = 12;

export type PaneMode = 'prep' | 'day-of';

export interface PaneModeResult {
  /** What to render — the override if there is one, otherwise the clock's answer. */
  mode: PaneMode;
  /** What the clock alone says, so the chip can offer the other one honestly. */
  auto: PaneMode;
  /** True only when the pilot's choice actually disagrees with the clock. */
  overridden: boolean;
  /** When day-of opens on its own, for the chip's "day-of opens 02:20Z". Undefined once flying. */
  opensAtUtc?: string;
}

const HOUR_MS = 60 * 60 * 1000;

/** The first leg that has not departed. Legs are not assumed to arrive in sequence order. */
export function nextDepartureUtc(legs: TripLeg[], nowUtc: string): string | undefined {
  const now = new Date(nowUtc).getTime();
  return legs
    .map((l) => l.departureTimeUtc)
    .filter((t) => Number.isFinite(new Date(t).getTime()) && new Date(t).getTime() >= now)
    .sort()[0];
}

export function derivePaneMode(legs: TripLeg[], nowUtc: string, override?: PaneMode): PaneModeResult {
  const next = nextDepartureUtc(legs, nowUtc);

  // No leg left to depart means one of two things, and both are day-of: the trip is under way, or
  // it is over. Neither is a planning surface. A trip with NO legs at all has nothing imminent and
  // is the opposite case — it stays prep.
  const auto: PaneMode = next
    ? new Date(nowUtc).getTime() >= new Date(next).getTime() - DAY_OF_THRESHOLD_HOURS * HOUR_MS
      ? 'day-of'
      : 'prep'
    : legs.length > 0
      ? 'day-of'
      : 'prep';

  return {
    mode: override ?? auto,
    auto,
    overridden: override !== undefined && override !== auto,
    opensAtUtc: next ? new Date(new Date(next).getTime() - DAY_OF_THRESHOLD_HOURS * HOUR_MS).toISOString() : undefined,
  };
}
