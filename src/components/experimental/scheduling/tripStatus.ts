import type { MockTripData } from '../mockData';

// One derivation + one style map shared by the plan board, run board, calendar pills, and dispatch
// table — previously triplicated inline in SchedulingCommandCenter. Rules are lifted verbatim from
// the original calendar-pill logic; 'airborne' is additionally bounded by arrival (dep + duration)
// so completed trips settle back to 'ready' instead of reading airborne forever.
export type TripDerivedStatus =
  | 'blocked' | 'airborne' | 'ready' | 'behind' | 'attention' | 'uninteracted' | 'on-track';

const DAY_MS = 86400000;

export function deriveTripStatus(
  t: Pick<MockTripData, 'readinessScore' | 'criticalBlocker' | 'departureDate' | 'durationDays'>,
  nowMs: number,
): TripDerivedStatus {
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

export const TRIP_STATUS_STYLES: Record<TripDerivedStatus, TripStatusStyle> = {
  blocked: {
    label: 'Blocked',
    bar: 'bg-rose-500 text-white',
    pill: 'bg-rose-500 text-white border border-transparent',
    badge: 'bg-rose-100 text-rose-700',
    dot: 'bg-rose-500',
  },
  airborne: {
    label: 'Airborne',
    bar: 'bg-indigo-600 text-white shadow-[0_0_10px_rgba(79,70,229,0.5)]',
    pill: 'bg-indigo-600 text-white border border-transparent shadow-[0_0_10px_rgba(79,70,229,0.5)]',
    badge: 'bg-indigo-100 text-indigo-700 border-indigo-300',
    dot: 'bg-indigo-600',
  },
  ready: {
    label: 'Ready',
    bar: 'bg-emerald-500 text-white',
    pill: 'bg-emerald-500 text-white border border-transparent',
    badge: 'bg-emerald-100 text-emerald-700',
    dot: 'bg-emerald-500',
  },
  behind: {
    label: 'Behind',
    bar: 'bg-amber-400 text-amber-950 ring-2 ring-amber-500',
    pill: 'bg-amber-50 text-amber-900 border-2 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)] animate-[pulse_2s_ease-in-out_infinite]',
    badge: 'bg-amber-100 text-amber-700',
    dot: 'bg-amber-400',
  },
  attention: {
    label: 'Needs attention',
    bar: 'bg-amber-300 text-amber-950 ring-2 ring-amber-500',
    pill: 'bg-amber-50 text-amber-900 border-2 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)] animate-[pulse_2s_ease-in-out_infinite]',
    badge: 'bg-amber-100 text-amber-700',
    dot: 'bg-amber-300',
  },
  uninteracted: {
    label: 'Uninteracted',
    bar: 'bg-slate-200 text-slate-600 border border-dashed border-slate-400',
    pill: 'bg-slate-100 border border-dashed border-slate-400 text-slate-500 hover:border-slate-500 hover:bg-slate-200',
    badge: 'bg-slate-100 text-slate-500 border border-dashed border-slate-300',
    dot: 'bg-slate-300',
  },
  'on-track': {
    label: 'On track',
    bar: 'bg-blue-500 text-white',
    pill: 'bg-blue-500 text-white border border-transparent',
    badge: 'bg-blue-100 text-blue-700',
    dot: 'bg-blue-500',
  },
};
