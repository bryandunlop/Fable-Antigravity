export const FRAT_EARLY_SUBMIT_WARN_HOURS = 24;

/** Index of the first leg not yet departed (the leg to prep/fly); the last leg if all have departed; -1 if none. */
export function currentLegIndex(legs: { departureTimeUtc: string }[], nowUtc: string): number {
  if (legs.length === 0) return -1;
  const now = new Date(nowUtc).getTime();
  const idx = legs.findIndex((l) => new Date(l.departureTimeUtc).getTime() >= now);
  return idx === -1 ? legs.length - 1 : idx;
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

/** Which phase leads: day-of when in progress or within the threshold of the current leg's ETD, else prep. */
export function defaultPhase(
  tripStatus: string,
  currentLegEtdUtc: string | undefined,
  nowUtc: string,
  thresholdHours: number = 24,
): 'prep' | 'day-of' {
  if (tripStatus === 'in_progress') return 'day-of';
  if (!currentLegEtdUtc) return 'prep';
  const hoursUntil = (new Date(currentLegEtdUtc).getTime() - new Date(nowUtc).getTime()) / 3_600_000;
  return hoursUntil <= thresholdHours ? 'day-of' : 'prep';
}

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
