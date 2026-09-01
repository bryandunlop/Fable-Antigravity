// Booking portal demo shell — domain types.
// Vocabulary is the design of record (docs/booking-portal/portal-design.md):
// trip path Draft → Requested → Pending approval → Approved → Confirmed,
// watch path Watching → Freed → Requested, seat path reuses the trip words.
// Everything here runs on fixtures; no myairops call exists behind any of it.

import type { LegTiming } from './engine/legTiming';

export type { LegTiming };

export type Persona = 'ea' | 'scheduling';

export type Purpose = 'business' | 'personal' | 'entertainment' | 'commuting';

export type RequestStatus =
  | 'draft'
  | 'requested'
  | 'pending'
  | 'approved'
  | 'confirmed'
  | 'declined';

export type SeatAskStatus = 'requested' | 'confirmed' | 'withdrawn' | 'reconfirm' | 'released';

export type WatchStatus = 'watching' | 'freed' | 'expired';

export type DocVerdict = 'valid' | 'flag' | 'block';

export interface LegPassenger {
  passengerId: string;
  lead?: boolean;
  purpose: Purpose;
}

export interface RequestLeg {
  id: string;
  from: string;
  to: string;
  date: string; // ISO date
  /** The expected departure. When `timing` is an arrive-by, this is DERIVED from
   *  it (engine/legTiming) so every existing reader keeps working. */
  departLocal: string; // "08:00"
  flexHours: number; // 0 = firm
  /** What is actually fixed about the timing — depart around, be there by, or
   *  nothing firmer than the date. Absent on legacy legs, read as 'depart'. */
  timing?: LegTiming;
  estMinutes: number;
  estNm: number;
  passengers: LegPassenger[];
}

export interface ThreadMessage {
  id: string;
  from: Persona;
  author: string;
  at: string; // ISO datetime
  text: string;
}

export interface TripRequest {
  id: string; // R-2047
  status: RequestStatus;
  tier: 1 | 2 | 3;
  principalId: string;
  requestedBy: string; // "Dana Whitfield (EA)"
  createdAt: string;
  legs: RequestLeg[];
  extras: string[];
  note?: string;
  declineReason?: string;
  messages: ThreadMessage[];
  /** set when a freed watch pre-filled this request */
  fromWatchId?: string;
  /**
   * The tail the executive was looking at on the fleet week when they asked (LG-311).
   * A REQUEST, not an assignment — scheduling still decides. It was previously dropped on the
   * floor between the two surfaces, so scheduling never learned which aircraft prompted the ask.
   */
  requestedTail?: string;
  /** Seats the EA asked to hold. She usually knows the lead passenger and a
   *  rough headcount long before she knows the names, so this is the number the
   *  manifest is measured against — not `legs[].passengers.length`. */
  seatsHeld?: number;
}

export interface Flight {
  id: string;
  date: string; // ISO date
  from: string;
  to: string;
  depart: string;
  arrive: string;
  aircraft: string;
  seatsOpen: number;
  /** principals of the current EA aboard — drives the gold "own trip" card */
  ownPrincipalIds: string[];
  manifestLocked?: boolean;
}

export interface SeatAsk {
  id: string;
  flightId: string;
  passengerId: string;
  purpose: Purpose;
  status: SeatAskStatus;
  firstFlight?: boolean;
  createdAt: string;
}

export interface Watch {
  id: string;
  kind: 'fleet' | 'route';
  label: string;
  detail: string;
  status: WatchStatus;
  freedNote?: string;
  prefillRequestId?: string;
}

export interface TravelDoc {
  id: string;
  label: string; // "Passport — USA"
  numberMasked: string;
  expires: string; // ISO date
}

export interface Passenger {
  id: string;
  name: string;
  kind: 'principal' | 'guest' | 'staff';
  /** the current EA's authority over this person, when a principal */
  eaLevel?: 'view' | 'book' | 'full';
  docs: TravelDoc[];
  formStatus?: 'approved' | 'in-review' | 'resubmit';
  formNote?: string;
  prefs?: string;
  hasFlown: boolean;
  /** last travel date of the next booked trip window, for doc evaluation */
  nextTravelStart?: string;
  nextTravelEnd?: string;
}

export interface InboxItem {
  id: string;
  at: string;
  kind: 'watch' | 'decision' | 'reconfirm' | 'thread' | 'form';
  text: string;
  actionNeeded: boolean;
  read?: boolean;
}

export interface PortalState {
  persona: Persona;
  requests: TripRequest[];
  flights: Flight[];
  seatAsks: SeatAsk[];
  watches: Watch[];
  passengers: Passenger[];
  inbox: InboxItem[];
  /** monotonically increasing counters for demo ids */
  nextRequestNumber: number;
}
