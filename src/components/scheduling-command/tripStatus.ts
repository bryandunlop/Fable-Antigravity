// One derivation + one style map shared by the plan board, run board, calendar pills, and dispatch
// table — previously triplicated inline in SchedulingCommandCenter. Rules are lifted verbatim from
// the original calendar-pill logic; 'airborne' is additionally bounded by arrival (dep + duration)
// so completed trips settle back to 'ready' instead of reading airborne forever.
export type TripDerivedStatus =
  | 'blocked' | 'airborne' | 'ready' | 'behind' | 'attention' | 'uninteracted' | 'on-track';

const DAY_MS = 86400000;

/** Structural input — satisfied by BoardTrip (the production-store adapter). */
export interface TripStatusInput {
  readinessScore: number;
  criticalBlocker?: string;
  departureDate: string;
  durationDays: number;
}

export function deriveTripStatus(t: TripStatusInput, nowMs: number): TripDerivedStatus {
  if (t.criticalBlocker) return 'blocked';

  const depMs = new Date(t.departureDate).getTime();
  const daysUntilDeparture = Math.floor((depMs - nowMs) / DAY_MS);

  if (t.readinessScore === 100) {
    const inFlightWindow = daysUntilDeparture <= 0 && nowMs < depMs + t.durationDays * DAY_MS;
    return inFlightWindow ? 'airborne' : 'ready';
  }

  const isBehind =
    (t.readinessScore < 90 && daysUntilDeparture < 1) ||
    (t.readinessScore < 50 && daysUntilDeparture < 3);
  if (isBehind) return 'behind';

  // The "two-week trigger": inside the working window with under 80% readiness demands attention —
  // deliberately outranks 'uninteracted' (an untouched trip 10 days out is a problem, not idle).
  if (daysUntilDeparture <= 14 && daysUntilDeparture > 5 && t.readinessScore < 80) return 'attention';

  if (t.readinessScore === 0) return 'uninteracted';
  return 'on-track';
}

export interface TripStatusStyle {
  label: string;
  bar: string;    // plan-board duration bar fill
  pill: string;   // calendar day-cell pill
  badge: string;  // table status badge
  dot: string;    // funnel-strip / legend dot
}

// GFO design language: the app's RAG palette (--gfo-success/warning/error) for the safety-adjacent
// states, indigo reserved for airborne, quiet muted treatment for untouched — no glows, no pulse.
export const TRIP_STATUS_STYLES: Record<TripDerivedStatus, TripStatusStyle> = {
  blocked: {
    label: 'Blocked',
    bar: 'bg-[var(--gfo-error,#EF3340)] text-white',
    pill: 'bg-[var(--gfo-error,#EF3340)] text-white border border-transparent',
    badge: 'bg-[var(--gfo-error,#EF3340)]/10 text-[var(--gfo-error,#EF3340)]',
    dot: 'bg-[var(--gfo-error,#EF3340)]',
  },
  airborne: {
    label: 'Airborne',
    bar: 'bg-indigo-600 text-white',
    pill: 'bg-indigo-600 text-white border border-transparent',
    badge: 'bg-indigo-600/10 text-indigo-700',
    dot: 'bg-indigo-600',
  },
  ready: {
    label: 'Ready',
    bar: 'bg-[var(--gfo-success,#00B140)] text-white',
    pill: 'bg-[var(--gfo-success,#00B140)] text-white border border-transparent',
    badge: 'bg-[var(--gfo-success,#00B140)]/10 text-[var(--gfo-success,#00B140)]',
    dot: 'bg-[var(--gfo-success,#00B140)]',
  },
  behind: {
    label: 'Behind',
    bar: 'bg-[var(--gfo-warning,#F1B434)] text-amber-950',
    pill: 'bg-[var(--gfo-warning,#F1B434)]/15 text-amber-900 border border-[var(--gfo-warning,#F1B434)]',
    badge: 'bg-[var(--gfo-warning,#F1B434)]/15 text-amber-800',
    dot: 'bg-[var(--gfo-warning,#F1B434)]',
  },
  attention: {
    label: 'Needs attention',
    bar: 'bg-[var(--gfo-warning,#F1B434)]/70 text-amber-950',
    pill: 'bg-[var(--gfo-warning,#F1B434)]/15 text-amber-900 border border-[var(--gfo-warning,#F1B434)]',
    badge: 'bg-[var(--gfo-warning,#F1B434)]/15 text-amber-800',
    dot: 'bg-[var(--gfo-warning,#F1B434)]/70',
  },
  uninteracted: {
    label: 'Untouched',
    bar: 'bg-muted text-muted-foreground border border-dashed border-muted-foreground/40',
    pill: 'bg-muted text-muted-foreground border border-dashed border-muted-foreground/40 hover:bg-accent',
    badge: 'bg-muted text-muted-foreground border border-dashed border-muted-foreground/30',
    dot: 'bg-muted-foreground/40',
  },
  'on-track': {
    label: 'On track',
    bar: 'bg-blue-500 text-white',
    pill: 'bg-blue-500 text-white border border-transparent',
    badge: 'bg-blue-500/10 text-blue-700',
    dot: 'bg-blue-500',
  },
};
