/**
 * Reading a deferral's repair clock for DISPLAY.
 *
 * This is presentation math, deliberately separate from `pl25.ts`, which owns the
 * regulated boundary math (clock start, repair due, expiry) per D24.
 *
 * Per CLAUDE.md, deferral expiry is server-authoritative and derived: a deferral past
 * its due boundary reads EXPIRED and re-grounds the aircraft to RED wherever the §14
 * projection is computed. Nothing here decides that. A ticking client clock may show
 * `EXPIRED` a moment before or after the server agrees, and that is fine — this reading
 * must never gate dispatch, drive a status transition, or be written to a ledger row.
 * It exists so a human can see the clock draining instead of date-diffing a string.
 */

/** Action urgency, not proportion — see `URGENT_WINDOW_MS`. */
export type ClockTone = 'NORMAL' | 'URGENT' | 'EXPIRED';

export interface ClockReading {
  /** Share of the repair interval consumed, clamped to 0..1. Drives the drain visual. */
  fractionElapsed: number;
  /** Negative once past due. */
  msRemaining: number;
  tone: ClockTone;
  /** Matches the previous inline format exactly: "3d 4h left" | "4h left" | "overdue". */
  label: string;
}

const HOUR_MS = 3600000;
const DAY_MS = 86400000;

/**
 * Absolute, not proportional. Two days left is equally urgent to act on whether the
 * interval was Cat B (3 days) or Cat D (120). The drain ring carries proportion; the
 * tone carries time-to-act. Inherited from the previous `urgent: days < 2` threshold —
 * whether the operator wants urgency scaled per category is a DOM question, not a
 * UI default (see D31).
 */
const URGENT_WINDOW_MS = 2 * DAY_MS;

function labelFor(msRemaining: number): string {
  if (msRemaining <= 0) return 'overdue';
  const days = Math.floor(msRemaining / DAY_MS);
  const hours = Math.floor((msRemaining % DAY_MS) / HOUR_MS);
  return days >= 1 ? `${days}d ${hours}h left` : `${hours}h left`;
}

/**
 * @param clockStartIso  Deferral.clockStartDateUtc — PL-25 midnight after discovery.
 * @param repairDueIso   Deferral.repairDueDateUtc. Undefined for usage-based deferrals,
 *                       which expire on a usage threshold and have no calendar span to drain.
 * @param nowMs          Injected rather than read from the clock, so this stays pure and
 *                       the caller controls the tick cadence.
 * @returns null when there is nothing calendar-based to show.
 */
export function readDeferralClock(
  clockStartIso: string,
  repairDueIso: string | undefined,
  nowMs: number,
): ClockReading | null {
  if (!repairDueIso) return null;

  const start = Date.parse(clockStartIso);
  const due = Date.parse(repairDueIso);
  if (!Number.isFinite(start) || !Number.isFinite(due)) return null;

  const msRemaining = due - nowMs;
  const span = due - start;

  // A non-positive span means malformed data (due at or before clock start). Read it as
  // fully elapsed rather than dividing by zero and rendering NaN into a regulated view.
  const fractionElapsed =
    span > 0 ? Math.min(1, Math.max(0, (nowMs - start) / span)) : 1;

  const tone: ClockTone =
    msRemaining <= 0 ? 'EXPIRED' : msRemaining < URGENT_WINDOW_MS ? 'URGENT' : 'NORMAL';

  return { fractionElapsed, msRemaining, tone, label: labelFor(msRemaining) };
}
