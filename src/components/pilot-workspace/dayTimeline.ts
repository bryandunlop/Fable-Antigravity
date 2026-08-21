import type { Trip, TripLeg, Aircraft } from '../tech-log/types';
import { deriveDayOfQueue, type QueueItem } from './dayOfQueue';

/**
 * The day-of pane's instrument, second generation (Bryan, 2026-08-21).
 *
 * `dayOfQueue` answers "what is still owed, soonest first". That is the right question until the
 * PIC signs for the aircraft — and the wrong one immediately afterwards, because at that moment the
 * pilot stops preparing for a departure and starts working a DAY. The queue emptied to "Nothing
 * outstanding for the legs ahead" and the screen had nothing left to say, on a trip with three legs
 * still to fly.
 *
 * So this reduces the trip to the day as it will actually be lived: legs, and the ground time
 * between them, in clock order, with the outstanding items attached to the leg they belong to
 * rather than floating in a list of their own. The queue is not replaced — it is the input here,
 * so an item can never appear in one and not the other.
 *
 * Returns STATE and DATA, never display strings (same discipline as `prepMatrix` and `dayOfQueue`):
 * labels, countdowns and time formatting belong to the component.
 */

/** Where the day has got to, relative to now. */
export type EntryState = 'past' | 'current' | 'future';

export interface LegEntry {
  kind: 'leg';
  id: string;
  state: EntryState;
  /** True only while the leg is between its own ETD and ETA — the day's one airborne block. */
  airborne: boolean;
  /** True for the first leg that has not departed: the one the countdown band is about. */
  next: boolean;
  leg: TripLeg;
  /** Everything still owed for THIS leg, in due order. Empty once the leg is ready. */
  items: QueueItem[];
}

export interface GroundEntry {
  kind: 'ground';
  id: string;
  state: EntryState;
  /** Where the aircraft sits. Undefined before the first departure of a day that starts elsewhere. */
  icao: string;
  fromUtc: string;
  toUtc: string;
  /** Milliseconds on the ground — the turn, which is the thing a crew actually plans around. */
  durationMs: number;
  /** The leg this ground time is waiting for, so the panel can say what the turn is FOR. */
  nextLegSequence: number;
}

export interface EndEntry {
  kind: 'end';
  id: string;
  state: EntryState;
  icao: string;
  atUtc: string;
}

export type TimelineEntry = LegEntry | GroundEntry | EndEntry;

const ms = (iso: string) => new Date(iso).getTime();

/**
 * The day, in clock order: leg, turn, leg, turn, … , end of day.
 *
 * Only ONE entry is ever `current` — the day is somewhere, and it is either airborne on a leg or on
 * the ground between two. Everything before it is `past` and everything after `future`, which is
 * what lets the panel draw a single "you are here" marker instead of asking the reader to work it
 * out from four timestamps.
 */
export function deriveDayTimeline(
  tlTrip: Trip | null,
  aircraft: Aircraft | undefined,
  nowUtc: string,
): TimelineEntry[] {
  const legs = [...(tlTrip?.legs ?? [])].sort((a, b) => a.departureTimeUtc.localeCompare(b.departureTimeUtc));
  if (legs.length === 0) return [];

  const now = ms(nowUtc);
  const queue = deriveDayOfQueue(tlTrip, aircraft, nowUtc);
  const itemsFor = (legId: string) => queue.filter((q) => q.legId === legId);

  // The first leg that has not departed. Undefined once the last one is airborne or done — the day
  // still has a shape, it just has no "next" any more.
  const nextLegId = legs.find((l) => ms(l.departureTimeUtc) >= now)?.id;

  const out: TimelineEntry[] = [];

  legs.forEach((leg, i) => {
    const dep = ms(leg.departureTimeUtc);
    const arr = ms(leg.arrivalTimeUtc);
    const airborne = now >= dep && now < arr;
    out.push({
      kind: 'leg',
      id: `${leg.id}:leg`,
      state: airborne ? 'current' : now >= arr ? 'past' : 'future',
      airborne,
      next: leg.id === nextLegId,
      leg,
      items: itemsFor(leg.id),
    });

    const following = legs[i + 1];
    if (!following) {
      // End of day: the aircraft is wherever the last leg put it. Deliberately NOT called
      // "postflight" — the postflight/reclaim ceremony is custody's business and lives in the
      // handover card; naming it here would offer a second door to the same act.
      out.push({
        kind: 'end',
        id: `${leg.id}:end`,
        state: now >= arr ? 'current' : 'future',
        icao: leg.arrivalIcao,
        atUtc: leg.arrivalTimeUtc,
      });
      return;
    }

    const nextDep = ms(following.departureTimeUtc);
    out.push({
      kind: 'ground',
      id: `${leg.id}:ground`,
      state: now >= arr && now < nextDep ? 'current' : now >= nextDep ? 'past' : 'future',
      icao: leg.arrivalIcao,
      fromUtc: leg.arrivalTimeUtc,
      toUtc: following.departureTimeUtc,
      // Clamped at zero: a schedule can be edited into a negative turn, and a "-0:25 on the ground"
      // reads as a rendering bug rather than as the scheduling conflict it actually is.
      durationMs: Math.max(0, nextDep - arr),
      nextLegSequence: following.sequence,
    });
  });

  return out;
}

/** Legs still to fly, for the "N legs left" count. Airborne counts as still flying. */
export function legsRemaining(entries: TimelineEntry[]): number {
  return entries.filter((e) => e.kind === 'leg' && e.state !== 'past').length;
}

/** Every outstanding item across the whole day — the honest total, not just the next leg's. */
export function dayOutstanding(entries: TimelineEntry[]): number {
  return entries.reduce((n, e) => n + (e.kind === 'leg' ? e.items.length : 0), 0);
}
