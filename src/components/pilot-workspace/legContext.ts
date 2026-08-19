import { T_MINUS_COMMIT_HOURS } from '../tech-log/engine/dispatchWindow';

/**
 * A FRAT submitted earlier than this is out of process, and gets a confirm (Bryan, 2026-08-19).
 *
 * How crews actually work it: the FRAT is FILLED IN ahead of time — that is what the prep matrix is
 * for — but it is reviewed and SUBMITTED at the crew brief before the flight, and that brief is
 * typically inside four hours. So prep produces a DRAFT and day-of produces the submission.
 *
 * This was 24h, which let a whole prep pass submit finished assessments silently. Aligning it to
 * T_MINUS_COMMIT_HOURS makes the warning fire MORE often, deliberately: it now catches exactly the
 * case it should — someone finishing a FRAT days out and submitting it instead of leaving a draft
 * for the brief. The same boundary governs the fuel-farm lock and the prep/day-of pane switch.
 */
export const FRAT_EARLY_SUBMIT_WARN_HOURS = T_MINUS_COMMIT_HOURS;

/** A6 soft warning: true when a final FRAT submit is more than `thresholdHours` before the leg's ETD. */
export function fratEarlySubmitWarning(
  nowUtc: string, etdUtc: string, thresholdHours: number = FRAT_EARLY_SUBMIT_WARN_HOURS,
): boolean {
  const hoursUntil = (new Date(etdUtc).getTime() - new Date(nowUtc).getTime()) / 3_600_000;
  return hoursUntil > thresholdHours;
}

// ---------------------------------------------------------------------------------------------
// What used to live here, and why it is gone (D84 slice 3).
//
// `currentLegIndex`, `selectedLegIndex` and `groupLegsByDay` existed to drive the LEG STEPPER, and
// `partitionOutstanding` the outstanding/done split above it. Neither pane has a stepper any more:
// prep addresses every leg at once in the matrix, and day-of is ordered by clock ACROSS legs, so
// "the selected leg" is no longer a thing the workspace has. `defaultPhase` went the same way one
// commit earlier for the same reason.
//
// Deleted rather than left: this file already proved that a dead export sits unnoticed for a month
// and then gets mistaken for the live answer — `defaultPhase` was still holding a 24h threshold
// while `paneMode` held 12h, one import apart. `nextDepartureUtc` in paneMode.ts is the live
// question now, and the per-panel URL params (?frat, ?fuel, ?airport) are the live "which leg".
// ---------------------------------------------------------------------------------------------
