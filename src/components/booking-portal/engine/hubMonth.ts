// The EA hub's pure layer: her requests → what the month draws, and what waits beside it.
//
// The hub is a traditional month calendar because that is the shape an EA has used her
// whole career and the one Outlook shows her all day. Her trips are spanning bars; every
// day carries one number, which is how many aeroplanes are free (see
// availability/engine/freeCount.ts — a count, never which aeroplanes).
//
// The month-grid maths is NOT reimplemented here. components/inflight/tripCalendar.ts
// already solves week-boundary squaring and is unit-tested; this adapts a TripRequest to
// that engine's structural CalTrip and decides what the bar looks like.

import type { CalTrip } from '../../inflight/tripCalendar';
import type { RequestStatus, TripRequest } from '../types';
import { routeLabel } from './lifecycle';

/**
 * Solid = approved, dashed = pending. ONE visual difference, and no status badge on the
 * bar: the same distinction reaches the executive as one word (ASKED FOR / CONFIRMED),
 * and a legend of five colours is a thing to learn rather than a thing to read.
 */
export type BarStyle = 'solid' | 'dashed';

export type RailBand = 'needs-you' | 'no-dates-yet' | 'approved';

export interface HubTrip {
  request: TripRequest;
  id: string;
  label: string;
  style: BarStyle;
  /** Null when the request carries no dates — it is not drawn, it waits in the rail. */
  span: { start: string; end: string } | null;
  /** The geometry engine's view of it. Null for exactly the same reason as `span`. */
  calTrip: CalTrip | null;
  band: RailBand;
  /** What SHE reads about a bump, if any. Never the reason until it has been said aloud. */
  bumpLine: string | null;
}

const SOLID: RequestStatus[] = ['approved', 'confirmed'];

/** The dates a request touches, in order. Blank leg dates are simply not dates. */
export function requestDates(request: TripRequest): string[] {
  const seen = new Set<string>();
  for (const leg of request.legs) if (leg.date) seen.add(leg.date);
  return [...seen].sort();
}

export const hasDates = (request: TripRequest): boolean => requestDates(request).length > 0;

/**
 * A request as the calendar engine wants it. Times ride along so a same-day out-and-back
 * still spans one day rather than collapsing to nothing.
 */
export function toCalTrip(request: TripRequest): CalTrip | null {
  const dates = requestDates(request);
  if (dates.length === 0) return null;
  const legs = request.legs
    .filter(l => l.date)
    .map(l => ({
      departureUtc: `${l.date}T${(l.departLocal || '00:00').slice(0, 5)}:00`,
      arrivalUtc: `${l.date}T23:59:00`,
    }));
  return {
    id: request.id,
    tripName: routeLabel(request),
    // No tail. Ever. She never picks one and is never shown one — scheduling assigns
    // the aircraft, and a tail on her bar would make her start asking for it.
    tail: '',
    legs,
  };
}

export const barStyle = (request: TripRequest): BarStyle =>
  SOLID.includes(request.status) ? 'solid' : 'dashed';

/**
 * A senior person can bump an approved trip back to pending, and until the scheduler has
 * actually made the call, the losing side reads that scheduling is working on it — never
 * the reason, and never a colour change with no explanation. Nobody should learn they were
 * outranked from a web page.
 */
export function bumpLineFor(request: TripRequest): string | null {
  const bump = request.bumpedBy;
  if (!bump) return null;
  if (!bump.reasonVisibleAt) return 'Working — scheduling will call you.';
  return `Moved by ${bump.authorizedBy} — ${bump.reason}`;
}

export function bandFor(request: TripRequest): RailBand {
  if (!hasDates(request)) return 'no-dates-yet';
  if (request.status === 'declined' || request.status === 'draft' || request.bumpedBy) return 'needs-you';
  if (SOLID.includes(request.status)) return 'approved';
  return 'needs-you';
}

export function toHubTrip(request: TripRequest): HubTrip {
  const dates = requestDates(request);
  return {
    request,
    id: request.id,
    label: routeLabel(request),
    style: barStyle(request),
    span: dates.length > 0 ? { start: dates[0], end: dates[dates.length - 1] } : null,
    calTrip: toCalTrip(request),
    band: bandFor(request),
    bumpLine: bumpLineFor(request),
  };
}

export const toHubTrips = (requests: TripRequest[]): HubTrip[] => requests.map(toHubTrip);

/** Only the ones with dates are drawn. The rest are not late — they are not yet dated. */
export type DrawableHubTrip = HubTrip & { span: { start: string; end: string }; calTrip: CalTrip };
export const drawable = (trips: HubTrip[]): DrawableHubTrip[] =>
  trips.filter((t): t is DrawableHubTrip => t.span !== null && t.calTrip !== null);

export interface Rail {
  needsYou: HubTrip[];
  noDatesYet: HubTrip[];
  approved: HubTrip[];
}

/**
 * The right rail. Three bands, in the order she acts on them: the ones waiting on her, the
 * ones that have not earned dates, and the ones that are settled. A trip drops out of
 * "not on the calendar yet" and onto a week the moment it has dates — that is the whole
 * planning/calendar split (D103), with no mode switch to find.
 */
export function railFor(requests: TripRequest[]): Rail {
  const trips = toHubTrips(requests);
  return {
    needsYou: trips.filter(t => t.band === 'needs-you'),
    noDatesYet: trips.filter(t => t.band === 'no-dates-yet'),
    approved: trips.filter(t => t.band === 'approved'),
  };
}

/** The months a set of requests touches, earliest first — what the month strip must offer. */
export function monthsTouched(requests: TripRequest[]): { year: number; month: number }[] {
  const keys = new Set<string>();
  for (const r of requests) {
    for (const d of requestDates(r)) keys.add(d.slice(0, 7));
  }
  return [...keys].sort().map(k => ({ year: Number(k.slice(0, 4)), month: Number(k.slice(5, 7)) - 1 }));
}
