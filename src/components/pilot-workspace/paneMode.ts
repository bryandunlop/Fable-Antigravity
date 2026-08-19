import type { TripLeg } from '../tech-log/types';
import { T_MINUS_COMMIT_HOURS } from '../tech-log/engine/dispatchWindow';

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
 * THE THRESHOLD IS T-4h, THE SAME BOUNDARY AS THE FUEL LOCK (Bryan, 2026-08-19). It is not a guess
 * any more and it is not this module's to pick — see `tech-log/engine/dispatchWindow` for why one
 * number governs all of them.
 *
 * It shipped as 12h for a day, on the reasoning that day-of should surface the fuel lock while that
 * lock could still be acted on. That was backwards: fuel is PREP work and belongs in the prep matrix
 * (which shows its lock time in the cell), so a day-of queue whose most urgent item for eight hours
 * was a prep task would have been a queue about the wrong thing. Aligned, the panes mean something
 * concrete — prep is "everything is still actionable", day-of is "the last reversible thing closed".
 *
 * DELIBERATELY NOT CALENDAR MATH. This is a fixed offset from an instant, so no timezone and no DST
 * transition can move it. That is the opposite of the PL-25 repair clock (D24), which is anchored to
 * an operator reference zone and must be computed with the IANA database. Do not unify them.
 */
export const DAY_OF_THRESHOLD_HOURS = T_MINUS_COMMIT_HOURS;

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
