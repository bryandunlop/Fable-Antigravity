// What the executive sees. One card, phone-shaped, and almost nothing on it.
//
// He has no persona in this app today: he exists only as a `Passenger` row carrying HER
// authority over him. This gives him the smallest possible surface — the state of his
// trip in one word, the trip, how tight the days are, and a button to message his EA.
//
// The scarcity sentence comes from `describeScarcity`, which is also what her month
// reads. Two surfaces growing their own words for the same week is how a system starts
// telling two people different things; there is a test that they cannot.

import { describeScarcity, type DayFreeCount, type Scarcity } from '../../../availability/engine/freeCount';
import type { TripRequest } from '../types';
import { requestDates } from './hubMonth';
import { routeLabel } from './lifecycle';

/**
 * ASKED FOR / CONFIRMED. The same distinction her month draws as dashed vs solid, in the
 * one word he needs — no status ladder, and no vocabulary to learn.
 */
export type ExecutiveHeadline = 'ASKED FOR' | 'CONFIRMED';

export interface ExecutiveCard {
  requestId: string;
  headline: ExecutiveHeadline;
  trip: string;
  dates: string;
  scarcity: Scarcity;
  /** Set when his trip lost its slot. Never the reason until someone has said it aloud. */
  note: string | null;
}

const CONFIRMED_STATUSES = ['approved', 'confirmed'];

export function headlineFor(request: TripRequest): ExecutiveHeadline {
  return CONFIRMED_STATUSES.includes(request.status) ? 'CONFIRMED' : 'ASKED FOR';
}

export function datesLabel(request: TripRequest): string {
  const dates = requestDates(request);
  if (dates.length === 0) return 'No dates yet';
  return dates.length === 1 ? dates[0] : `${dates[0]} → ${dates[dates.length - 1]}`;
}

/**
 * The card for one trip. `byDate` is the same index her calendar renders from, so his
 * sentence and her cells are two readings of one number.
 */
export function executiveCard(
  request: TripRequest,
  byDate: Record<string, DayFreeCount>,
): ExecutiveCard {
  const counts = requestDates(request)
    .map(d => byDate[d])
    .filter((c): c is DayFreeCount => !!c);

  return {
    requestId: request.id,
    headline: headlineFor(request),
    trip: routeLabel(request),
    dates: datesLabel(request),
    scarcity: describeScarcity(counts),
    note: request.bumpedBy
      ? request.bumpedBy.reasonVisibleAt
        ? `Moved by ${request.bumpedBy.authorizedBy}.`
        : 'Scheduling is working on this and will call.'
      : null,
  };
}

/** His trips, soonest first. Trips with no dates sit at the end rather than vanishing. */
export function cardsFor(
  requests: TripRequest[],
  principalId: string,
  byDate: Record<string, DayFreeCount>,
): ExecutiveCard[] {
  return requests
    .filter(r => r.principalId === principalId && r.status !== 'draft')
    .map(r => executiveCard(r, byDate))
    .sort((a, b) => (a.dates === 'No dates yet' ? 1 : b.dates === 'No dates yet' ? -1 : a.dates.localeCompare(b.dates)));
}
