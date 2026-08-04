// Request/seat/watch lifecycle — the pure half of the demo shell.
// The reducer in BookingPortalContext dispatches into these helpers so the
// transition rules stay testable without React.

import type {
  InboxItem,
  PortalState,
  RequestStatus,
  TripRequest,
} from '../types';

/** Legal transitions on the trip path. Approved ≠ Confirmed by design. */
const TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  draft: ['requested'],
  requested: ['pending'],
  pending: ['approved', 'declined'],
  approved: ['confirmed'],
  confirmed: [],
  declined: ['draft'],
};

export function canTransition(from: RequestStatus, to: RequestStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/**
 * The scheduling queue's default order: org tier, then request time.
 * (Provisional default in the design — overrides happen in the UI with a
 * logged reason, never by mutating this order.)
 */
export function rankQueue(requests: TripRequest[]): TripRequest[] {
  return requests
    .filter((r) => r.status === 'pending')
    .slice()
    .sort((a, b) => a.tier - b.tier || a.createdAt.localeCompare(b.createdAt));
}

let inboxSeq = 0;
export function inboxItem(
  kind: InboxItem['kind'],
  text: string,
  actionNeeded: boolean,
  at: string,
): InboxItem {
  inboxSeq += 1;
  return { id: `N-${at}-${inboxSeq}`, at, kind, text, actionNeeded };
}

export function nextRequestId(state: Pick<PortalState, 'nextRequestNumber'>): string {
  return `R-${state.nextRequestNumber}`;
}

/** Route label for a request, e.g. "KCVG ⇄ KTEB" or "KCVG → KATL". */
export function routeLabel(request: TripRequest): string {
  const legs = request.legs;
  if (legs.length === 0) return '—';
  const first = legs[0];
  const last = legs[legs.length - 1];
  const isRoundTrip = legs.length > 1 && last.to === first.from;
  return isRoundTrip ? `${first.from} ⇄ ${first.to}` : legs.map((l) => l.from).concat(last.to).join(' → ');
}

export function totalEstMinutes(request: TripRequest): number {
  return request.legs.reduce((sum, l) => sum + l.estMinutes, 0);
}
