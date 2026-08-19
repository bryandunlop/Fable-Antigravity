export const FRAT_EARLY_SUBMIT_WARN_HOURS = 24;

/** Index of the first leg not yet departed (the leg to prep/fly); the last leg if all have departed; -1 if none. */
export function currentLegIndex(legs: { departureTimeUtc: string }[], nowUtc: string): number {
  if (legs.length === 0) return -1;
  const now = new Date(nowUtc).getTime();
  const idx = legs.findIndex((l) => new Date(l.departureTimeUtc).getTime() >= now);
  return idx === -1 ? legs.length - 1 : idx;
}

/**
 * The leg index to show, given the URL `?leg` param and the current (first-not-departed) leg.
 * A param matching a leg id wins (the pilot pinned it); an absent/stale param follows the current
 * leg. Result is clamped to a valid index; empty lists return 0 (callers guard on the leg existing).
 */
export function selectedLegIndex(
  legs: { id: string }[], legParam: string | null | undefined, currentIdx: number,
): number {
  if (legs.length === 0) return 0;
  const pinned = legParam ? legs.findIndex((l) => l.id === legParam) : -1;
  const base = pinned >= 0 ? pinned : (currentIdx < 0 ? 0 : currentIdx);
  return Math.min(Math.max(base, 0), legs.length - 1);
}

/** Group legs by their office-local departure date, preserving each leg's original index. */
export function groupLegsByDay<T extends { departureTimeUtc: string }>(
  legs: T[], officeTzOffsetMinutes: number,
): { dayKey: string; legs: { leg: T; index: number }[] }[] {
  const groups: { dayKey: string; legs: { leg: T; index: number }[] }[] = [];
  legs.forEach((leg, index) => {
    const localMs = new Date(leg.departureTimeUtc).getTime() + officeTzOffsetMinutes * 60_000;
    const dayKey = new Date(localMs).toISOString().slice(0, 10);
    let g = groups.find((x) => x.dayKey === dayKey);
    if (!g) { g = { dayKey, legs: [] }; groups.push(g); }
    g.legs.push({ leg, index });
  });
  return groups;
}

// `defaultPhase()` lived here and is deliberately gone (D84 slice 2).
//
// It answered "prep or day-of?" for the Prep/Day-of TOGGLE, which the 2026-07-07 four-module board
// dissolved — leaving it dead, referenced only by its own tests, for over a month. That was harmless
// until this slice reintroduced the same question in `paneMode.derivePaneMode`, at which point two
// live-looking answers with DIFFERENT thresholds (24h here, 12h there) sat one import apart. The
// next person to need this would have had a coin-flip. `paneMode.ts` is the only answer now.

/** Split the pilot's actionable items into outstanding (not done, leading) and done (collapsed), order preserved. */
export function partitionOutstanding<T extends { done: boolean }>(items: T[]): { outstanding: T[]; done: T[] } {
  return { outstanding: items.filter((i) => !i.done), done: items.filter((i) => i.done) };
}

/** A6 soft warning: true when a final FRAT submit is more than `thresholdHours` before the leg's ETD. */
export function fratEarlySubmitWarning(
  nowUtc: string, etdUtc: string, thresholdHours: number = FRAT_EARLY_SUBMIT_WARN_HOURS,
): boolean {
  const hoursUntil = (new Date(etdUtc).getTime() - new Date(nowUtc).getTime()) / 3_600_000;
  return hoursUntil > thresholdHours;
}
