// Board trips block their own window (D107, LG-326).
//
// The manager: "block off six days when they know the meeting is … once the schedule firms up,
// then they can release a day or two." Bryan chose the shape where the block FOLLOWS the trip:
// a trip flagged `board` places a fleet-wide hold across its window when submitted; narrowing
// the window, or saying fewer aircraft are needed, releases what is no longer needed. Holds and
// releases are the same append-only overlays scheduling already uses, so the fleet schedule and
// the availability board see them with no new machinery.
//
// Pure: given a trip and the overlays it has already placed, return the overlays to append.

import { CORE_TAILS } from '../../../fleet/registry';
import type { SchedulerOverlay } from '../../../availability/types';
import type { Actor, BoardWindow, Trip } from './trip';

export type { BoardWindow };

const DAY = 86_400_000;
function eachDay(from: string, to: string): string[] {
  const out: string[] = [];
  for (let ms = Date.parse(`${from}T00:00:00.000Z`); ms <= Date.parse(`${to}T00:00:00.000Z`); ms += DAY) out.push(new Date(ms).toISOString().slice(0, 10));
  return out;
}

const boardTag = (tripId: string) => `board:${tripId}`;

/** The days the trip actually flies, from its legs. */
export function legDays(trip: Trip): Set<string> {
  return new Set(trip.legs.map(l => l.date).filter((d): d is string => !!d));
}

/**
 * What SHOULD be held right now for this board trip: every core tail on every window day, except
 * that on leg days only `tailsNeeded` tails are held and on non-leg days inside the window all are
 * (the meeting might move). Returns tail-day pairs.
 */
export function desiredBoardHolds(trip: Trip, window: BoardWindow): Array<{ tail: string; dateUtc: string }> {
  const flying = legDays(trip);
  const out: Array<{ tail: string; dateUtc: string }> = [];
  for (const d of eachDay(window.fromDate, window.toDate)) {
    const tails = flying.has(d) ? CORE_TAILS.slice(0, Math.max(0, Math.min(CORE_TAILS.length, window.tailsNeeded))) : CORE_TAILS;
    for (const t of tails) out.push({ tail: t, dateUtc: d });
  }
  return out;
}

/** The board holds this trip has placed that are still in force (not superseded by a release). */
export function activeBoardHolds(overlays: SchedulerOverlay[], tripId: string): SchedulerOverlay[] {
  const tag = boardTag(tripId);
  const superseded = new Set(overlays.map(o => o.supersedesOverlayId).filter((x): x is string => !!x));
  return overlays.filter(o => o.kind === 'hold' && o.reasonNote.startsWith(tag) && !superseded.has(o.id));
}

let seq = 0;
const oid = (p: string) => `${p}-${Date.now().toString(36)}-${(seq += 1).toString(36)}`;

/**
 * Reconcile: the overlays to append so the active holds match the desired set. New days get a
 * one-day hold per tail; days no longer wanted get a release naming the hold they retire.
 * Idempotent — running it twice appends nothing the second time.
 */
export function reconcileBoardHolds(trip: Trip, window: BoardWindow, overlays: SchedulerOverlay[], by: Actor, nowUtc: string): SchedulerOverlay[] {
  const tag = boardTag(trip.id);
  const active = activeBoardHolds(overlays, trip.id);
  const have = new Map(active.map(o => [`${o.tail}|${o.fromDateUtc}`, o]));
  const want = new Set(desiredBoardHolds(trip, window).map(x => `${x.tail}|${x.dateUtc}`));
  const out: SchedulerOverlay[] = [];
  for (const key of want) {
    if (have.has(key)) continue;
    const [tail, d] = key.split('|');
    out.push({ id: oid('ov-board'), kind: 'hold', tail, fromDateUtc: d, toDateUtc: d, reasonNote: `${tag} ${trip.title}`, publicLabel: 'Held — board week', createdBy: by.name, createdByRole: by.role, createdAtUtc: nowUtc });
  }
  for (const [key, o] of have) {
    if (want.has(key)) continue;
    out.push({ id: oid('ov-board-rel'), kind: 'release', tail: o.tail, fromDateUtc: o.fromDateUtc, toDateUtc: o.toDateUtc, reasonNote: `${tag} released — window narrowed`, publicLabel: null, createdBy: by.name, createdByRole: by.role, createdAtUtc: nowUtc, supersedesOverlayId: o.id });
  }
  return out;
}

/** Everything a board trip holds, released — when it is declined or withdrawn. */
export function releaseAllBoardHolds(trip: Trip, overlays: SchedulerOverlay[], by: Actor, nowUtc: string): SchedulerOverlay[] {
  return activeBoardHolds(overlays, trip.id).map(o => ({ id: oid('ov-board-rel'), kind: 'release' as const, tail: o.tail, fromDateUtc: o.fromDateUtc, toDateUtc: o.toDateUtc, reasonNote: `${boardTag(trip.id)} released — trip ${trip.status}`, publicLabel: null, createdBy: by.name, createdByRole: by.role, createdAtUtc: nowUtc, supersedesOverlayId: o.id }));
}
