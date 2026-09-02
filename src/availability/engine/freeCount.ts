// One number per day: how many aeroplanes are free.
//
// This is the whole information content of the EA's month. Deliberately a COUNT and
// never a list of tails:
//   - scheduling can move tails around underneath her without her screen becoming wrong;
//   - it survives the fleet growing (or the G800 replacing a G650ER);
//   - it keeps her out of the habit of asking for a specific aeroplane, which is
//     scheduling's call to make, not hers.
// Pips-per-aircraft were designed and rejected for exactly the first reason.
//
// The count is out of `CORE_FLEET_SIZE` — the four. A tail the register calls
// `demo-only` or `incoming` is never counted, so a provisional G800 cannot inflate
// the number an EA plans against.

import { CORE_TAILS, CORE_FLEET_SIZE } from '../../fleet/registry';
import type { FleetAvailability, TailDayAvailability } from '../types';

/**
 * Does a pending (asked-for, not yet approved) request hold the aeroplane?
 *
 * OPEN QUESTION with the scheduling manager (EA Booking Hub build plan, 2026-09-01), so
 * it is a policy flag rather than a decision baked into the maths. Default `approved-only`:
 * an unapproved ask does not reduce what anyone else sees, which matches the portal's
 * "nothing is booked until scheduling says so" rule.
 */
export type PendingPolicy = 'approved-only' | 'pending-holds';

export interface FreeCountOptions {
  pendingPolicy?: PendingPolicy;
  /** Tails a pending (unapproved) request is asking for, per day: dateUtc -> tails. */
  pendingByDate?: Record<string, string[]>;
}

/**
 * `confident` — every core tail had a real answer for this day.
 * `provisional` — at least one tail's day is only "free" because it sits beyond the
 *   published crew roster (`CREW_ROSTER_HORIZON_DAYS`). Nothing is known to block it,
 *   but nothing has been rostered either. That is honest, and softer than either
 *   "unavailable" (the bug that used to black out the far horizon) or a hard "3 free".
 */
export type FreeCountConfidence = 'confident' | 'provisional';

export interface DayFreeCount {
  dateUtc: string;
  /** How many of the four are free. */
  free: number;
  /** Always CORE_FLEET_SIZE — carried so a surface never hardcodes "of 4". */
  fleetSize: number;
  confidence: FreeCountConfidence;
  /** True when at least one of the free ones is only free for want of a roster. */
  restingOnUnrosteredDays: boolean;
}

const isFreeState = (cell: TailDayAvailability): boolean => cell.state === 'available';

const isUnrostered = (cell: TailDayAvailability): boolean =>
  cell.reasons.some(r => r.category === 'not-yet-rostered');

/**
 * The count for every day in a fleet availability grid.
 *
 * Note what is NOT here: no tail ever leaves this function. The return value cannot
 * disclose which aeroplane is busy even by accident, which is the disclosure boundary
 * the EA and executive surfaces need (`Audience` handles the operator side).
 */
export function freeCountByDay(
  fleet: FleetAvailability,
  options: FreeCountOptions = {},
): DayFreeCount[] {
  const policy = options.pendingPolicy ?? 'approved-only';
  const core = new Set(CORE_TAILS);
  const rows = fleet.rows.filter(r => core.has(r.tail));

  return fleet.days.map(day => {
    const pending = policy === 'pending-holds'
      ? new Set(options.pendingByDate?.[day.dateUtc] ?? [])
      : new Set<string>();

    let free = 0;
    let unrosteredAmongFree = 0;

    for (const tail of CORE_TAILS) {
      const cell = rows.find(r => r.tail === tail)?.cells.find(c => c.dateUtc === day.dateUtc);
      // A core tail the availability grid says nothing about is NOT counted free.
      // Absence of a verdict is not a verdict — the same default-RED discipline the
      // tech-log projection uses for an unstated defect.
      if (!cell || !isFreeState(cell)) continue;
      if (pending.has(tail)) continue;
      free += 1;
      if (isUnrostered(cell)) unrosteredAmongFree += 1;
    }

    return {
      dateUtc: day.dateUtc,
      free,
      fleetSize: CORE_FLEET_SIZE,
      confidence: unrosteredAmongFree > 0 ? 'provisional' : 'confident',
      restingOnUnrosteredDays: unrosteredAmongFree > 0,
    };
  });
}

/** Keyed by 'YYYY-MM-DD', for a calendar that renders day by day. */
export function freeCountIndex(
  fleet: FleetAvailability,
  options: FreeCountOptions = {},
): Record<string, DayFreeCount> {
  const out: Record<string, DayFreeCount> = {};
  for (const d of freeCountByDay(fleet, options)) out[d.dateUtc] = d;
  return out;
}

/**
 * The month strip's one line: the average free-per-day, so she can aim at a month before
 * she arrives in it. Rounded to one decimal — a month is not precise enough for two.
 */
export function averageFreePerDay(counts: DayFreeCount[]): number {
  if (counts.length === 0) return 0;
  const total = counts.reduce((sum, c) => sum + c.free, 0);
  return Math.round((total / counts.length) * 10) / 10;
}

/** True when any day in the range rests on an unpublished roster. */
export const anyProvisional = (counts: DayFreeCount[]): boolean =>
  counts.some(c => c.confidence === 'provisional');

/**
 * How tight a set of days is, in plain English.
 *
 * THE one place scarcity is put into words. Her month and the executive's card both read
 * this, so the two surfaces cannot say different things about the same week — which they
 * would within a fortnight if each grew its own sentence.
 *
 * Says nothing about WHICH aeroplanes, ever: this text reaches an executive.
 */
export interface Scarcity {
  /** The fewest free on any one of the days asked about — the binding day. */
  fewestFree: number;
  fleetSize: number;
  /** True when the answer rests on days nobody has rostered yet. */
  provisional: boolean;
  line: string;
}

export function describeScarcity(counts: DayFreeCount[]): Scarcity {
  const fleetSize = counts[0]?.fleetSize ?? CORE_FLEET_SIZE;
  if (counts.length === 0) {
    return { fewestFree: 0, fleetSize, provisional: false, line: 'No days chosen yet.' };
  }

  const fewestFree = Math.min(...counts.map(c => c.free));
  const provisional = counts.some(c => c.confidence === 'provisional');
  const days = counts.length === 1 ? 'that day' : 'those days';

  const body =
    fewestFree === 0
      ? `Every aircraft is committed on at least one of ${days}. Scheduling will look at moving things.`
      : fewestFree === fleetSize
        ? `All ${fleetSize} aircraft are free across ${days}.`
        : fewestFree === 1
          ? `One aircraft free on the tightest of ${days}.`
          : `${fewestFree} of ${fleetSize} aircraft free on the tightest of ${days}.`;

  // Far out, nobody has built a crew roster yet. Saying so is the difference between a
  // plan and a promise, and an executive is exactly the reader who will hear a promise.
  return {
    fewestFree,
    fleetSize,
    provisional,
    line: provisional ? `${body} That far out the crew roster is not published, so this is a plan rather than a promise.` : body,
  };
}

