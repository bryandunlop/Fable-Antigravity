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

import type { MelCategory } from '../types';

/** Action urgency, not proportion — see `URGENT_WINDOW_DAYS`. */
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
 * How much runway is left before the clock demands action — scaled per MEL category
 * (Bryan, 2026-07-14; see D31). Replaces a flat 2 days for every category, which made a
 * Cat B (3-day) deferral read amber for two-thirds of its life, where the ring told you
 * nothing the serviceability chip hadn't already.
 *
 * Cat A is "per proviso" — no calendar interval (`CATEGORY_DAYS.A` is null), so such a
 * deferral carries no `repairDueDateUtc` and never produces a reading at all.
 *
 * These are display thresholds, NOT regulatory boundaries. The repair interval itself
 * lives in `constants.ts` CATEGORY_DAYS (B=3, C=10, D=120) and the due date is computed
 * by `pl25.ts`. Changing a number here changes when the ring turns amber — it can never
 * change when a deferral actually expires.
 */
export const URGENT_WINDOW_DAYS: Record<MelCategory, number | null> = {
  A: null, B: 1, C: 2, D: 7,
};

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
 * @param category       Deferral.category — selects the urgency threshold. A short Cat B
 *                       and a long Cat D do not become urgent at the same remaining time.
 * @returns null when there is nothing calendar-based to show.
 */
export function readDeferralClock(
  clockStartIso: string,
  repairDueIso: string | undefined,
  nowMs: number,
  category: MelCategory,
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

  // A category with no calendar interval (Cat A) has no urgency window either — it can
  // still expire, it just never pre-warns.
  const windowDays = URGENT_WINDOW_DAYS[category];
  const tone: ClockTone =
    msRemaining <= 0
      ? 'EXPIRED'
      : windowDays != null && msRemaining < windowDays * DAY_MS
        ? 'URGENT'
        : 'NORMAL';

  return { fractionElapsed, msRemaining, tone, label: labelFor(msRemaining) };
}
