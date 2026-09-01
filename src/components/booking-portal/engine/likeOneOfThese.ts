// "Like one of these?"
//
// A new trip opens her own past trips, not an empty form. An EA books the same handful of
// routes for the same handful of people over and over; making her re-type KCVG → KTEB for
// the ninth time is work the software should be doing. She changes the dates and sends it.
//
// Also here: "just hold some days", which is a BUTTON and not a new lifecycle state. A
// request with no route is an inquiry — it needs no status of its own, because the thing
// that makes it different is the absence of a route, and that is already visible.

import type { DraftLeg } from './requestReadiness';
import type { TripRequest } from '../types';
import { routeLabel } from './lifecycle';

export interface PastTripOption {
  /** The request it came from, so "use this" copies the real thing. */
  request: TripRequest;
  label: string;
  /** How many times she has asked for this shape. Repetition is the whole signal. */
  timesAsked: number;
  lastAsked: string;
  legCount: number;
  /** Days from the first leg to the last — preserved when she re-dates it. */
  spanDays: number;
}

/** Route shape + leg count, so an out-and-back is not confused with a one-way. */
export function tripShapeKey(request: TripRequest): string {
  return request.legs.map(l => `${l.from}>${l.to}`).join('|');
}

const dayOf = (iso: string): number => Date.parse(`${iso}T00:00:00Z`) / 86_400_000;

export function spanDaysOf(request: TripRequest): number {
  const dates = request.legs.map(l => l.date).filter(Boolean).sort();
  if (dates.length === 0) return 0;
  return Math.round(dayOf(dates[dates.length - 1]) - dayOf(dates[0]));
}

/**
 * Her past trips, most-repeated first and then most-recent. Drafts are excluded: a form she
 * abandoned is not a trip she takes.
 */
export function pastTrips(requests: TripRequest[], limit = 6): PastTripOption[] {
  const byShape = new Map<string, TripRequest[]>();
  for (const r of requests) {
    if (r.status === 'draft') continue;
    if (r.legs.length === 0 || !r.legs[0].from) continue;
    const key = tripShapeKey(r);
    byShape.set(key, [...(byShape.get(key) ?? []), r]);
  }

  return [...byShape.values()]
    .map(group => {
      const newest = group.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      return {
        request: newest,
        label: routeLabel(newest),
        timesAsked: group.length,
        lastAsked: newest.createdAt.slice(0, 10),
        legCount: newest.legs.length,
        spanDays: spanDaysOf(newest),
      };
    })
    .sort((a, b) => b.timesAsked - a.timesAsked || b.lastAsked.localeCompare(a.lastAsked))
    .slice(0, limit);
}

const shift = (iso: string, days: number): string =>
  new Date((dayOf(iso) + days) * 86_400_000).toISOString().slice(0, 10);

/**
 * The same trip on new dates. Day offsets between legs are preserved, so a Tuesday-out
 * Thursday-back keeps its two-night shape wherever she moves it — re-dating every leg to
 * the same day would silently turn a three-day trip into a day trip.
 *
 * People are NOT copied. Who travelled last time is a fact about last time, and a manifest
 * that arrives pre-filled with the wrong names is worse than an empty one.
 */
export function cloneToDraft(request: TripRequest, newStartDate: string): DraftLeg[] {
  const dates = request.legs.map(l => l.date).filter(Boolean).sort();
  const base = dates[0];
  return request.legs.map(leg => ({
    from: leg.from,
    to: leg.to,
    date: base && leg.date ? shift(newStartDate, Math.round(dayOf(leg.date) - dayOf(base))) : newStartDate,
    timing: leg.timing ?? { kind: 'depart' as const, departLocal: leg.departLocal || '09:00', flexHours: leg.flexHours ?? 0 },
    extraPassengerIds: [],
    purposes: {},
  }));
}

/**
 * "Just hold some days" — a set of dates and no route. Not a new status: `isInquiry`
 * reads it off the absence of a route, so nothing in the lifecycle has to learn a new word.
 */
export function holdDraft(dates: string[]): DraftLeg[] {
  return dates.map(date => ({
    from: '',
    to: '',
    date,
    // 'flexible' is the honest timing for a day she is only holding: there is no route
    // to be early or late for yet.
    timing: { kind: 'flexible' as const },
    extraPassengerIds: [],
    purposes: {},
  }));
}

export const isInquiry = (request: { legs: { from: string; to: string }[] }): boolean =>
  request.legs.length > 0 && request.legs.every(l => !l.from && !l.to);

/** What an inquiry is called, since it has no route to be named after. */
export function inquiryLabel(request: { legs: { date: string }[] }): string {
  const dates = request.legs.map(l => l.date).filter(Boolean).sort();
  if (dates.length === 0) return 'Holding days';
  const first = dates[0];
  const last = dates[dates.length - 1];
  return first === last ? `Holding ${first}` : `Holding ${first} → ${last}`;
}
