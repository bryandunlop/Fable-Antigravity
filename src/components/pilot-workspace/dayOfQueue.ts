import type { Trip, TripLeg, Aircraft } from '../tech-log/types';
import { requiresFuelFarmSubmission } from '../tech-log/engine/fuel';
import { FUEL_LOCK_HOURS_BEFORE_ETD } from '../tech-log/preflightActions';

/**
 * The day-of pane's instrument (D84): everything still owed, ranked by WHEN IT IS DUE.
 *
 * Day-of is worked by the clock, not by module. The four-module board this replaces put FRAT, fuel,
 * handover and scheduling in four equal boxes and left the pilot to work out which mattered next;
 * inside T-4h the only useful ordering is time.
 *
 * Like `prepMatrix`, this returns state and data, never display strings.
 */
export type QueueKind = 'frat' | 'airport' | 'fuel';
export type QueueState = 'todo' | 'draft' | 'locked';

export interface QueueItem {
  id: string;
  kind: QueueKind;
  state: QueueState;
  legId: string;
  legSequence: number;
  departureIcao: string;
  arrivalIcao: string;
  /** The instant this item stops being useful — usually the ETD, but the LOCK for fuel. */
  dueUtc: string;
}

const HOUR_MS = 60 * 60 * 1000;

const fuelLockUtc = (leg: TripLeg) =>
  new Date(new Date(leg.departureTimeUtc).getTime() - FUEL_LOCK_HOURS_BEFORE_ETD * HOUR_MS).toISOString();

/** Legs that have not departed, soonest first. */
function upcomingLegs(tlTrip: Trip | null, nowUtc: string): TripLeg[] {
  const now = new Date(nowUtc).getTime();
  return [...(tlTrip?.legs ?? [])]
    .filter((l) => new Date(l.departureTimeUtc).getTime() >= now)
    .sort((a, b) => a.departureTimeUtc.localeCompare(b.departureTimeUtc));
}

function itemsForLeg(leg: TripLeg, aircraft: Aircraft | undefined, nowUtc: string): QueueItem[] {
  const base = {
    legId: leg.id,
    legSequence: leg.sequence,
    departureIcao: leg.departureIcao,
    arrivalIcao: leg.arrivalIcao,
  };
  const out: QueueItem[] = [];

  if (leg.fratStatus !== 'COMPLETED') {
    out.push({ ...base, id: `${leg.id}:frat`, kind: 'frat', dueUtc: leg.departureTimeUtc,
      state: leg.fratStatus === 'IN_PROGRESS' ? 'draft' : 'todo' });
  }
  if (!leg.airportReviewed) {
    out.push({ ...base, id: `${leg.id}:airport`, kind: 'airport', state: 'todo', dueUtc: leg.departureTimeUtc });
  }
  if (aircraft && requiresFuelFarmSubmission(leg, aircraft) && !leg.fuelRequestId) {
    // Deliberately still listed once locked. Day-of begins AT the fuel lock, so if the request was
    // missed this pane is where the pilot finds out — dropping it because it is no longer actionable
    // would hide the miss behind an empty queue.
    const dueUtc = fuelLockUtc(leg);
    out.push({ ...base, id: `${leg.id}:fuel`, kind: 'fuel', dueUtc,
      state: new Date(nowUtc).getTime() >= new Date(dueUtc).getTime() ? 'locked' : 'todo' });
  }
  return out;
}

export function deriveDayOfQueue(
  tlTrip: Trip | null,
  aircraft: Aircraft | undefined,
  nowUtc: string,
): QueueItem[] {
  return upcomingLegs(tlTrip, nowUtc)
    .flatMap((leg) => itemsForLeg(leg, aircraft, nowUtc))
    .sort((a, b) => a.dueUtc.localeCompare(b.dueUtc));
}

/**
 * "N of M done before push" — scoped to the NEXT leg only.
 *
 * Deliberately not the whole trip: "before push" is a claim about THIS departure, and a trip-wide
 * fraction would read as reassuring while the leg about to fly is untouched.
 */
export function beforePushProgress(
  tlTrip: Trip | null,
  aircraft: Aircraft | undefined,
  nowUtc: string,
): { done: number; total: number } {
  const next = upcomingLegs(tlTrip, nowUtc)[0];
  if (!next) return { done: 0, total: 0 };

  const needsFuel = !!aircraft && requiresFuelFarmSubmission(next, aircraft);
  const total = 2 + (needsFuel ? 1 : 0);
  const done =
    (next.fratStatus === 'COMPLETED' ? 1 : 0) +
    (next.airportReviewed ? 1 : 0) +
    (needsFuel && next.fuelRequestId ? 1 : 0);
  return { done, total };
}

/**
 * The countdown, as the band shows it: `T−5:47`, `T−0:09`, `T+0:12` once it has slipped past.
 *
 * Its own function with its own tests because a countdown fails silently and convincingly: an
 * off-by-one hour, a negative rendered as `T−-1:13`, or minutes that read `5:7` all look plausible
 * at a glance on a moving number.
 */
export function formatCountdown(nowUtc: string, targetUtc: string | undefined): string | undefined {
  if (!targetUtc) return undefined;
  const deltaMs = new Date(targetUtc).getTime() - new Date(nowUtc).getTime();
  if (!Number.isFinite(deltaMs)) return undefined;
  const past = deltaMs < 0;
  const mins = Math.floor(Math.abs(deltaMs) / 60_000);
  return `T${past ? '+' : '\u2212'}${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}`;
}
