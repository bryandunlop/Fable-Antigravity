// Booking-queue seed — swappable adapter for the Lead brief.
//
// REPLACE with booking-portal store reads when feat/booking-portal-framework lands:
// each getter here mirrors a read that branch's store will serve, so the Lead
// dashboard only re-points imports — no reshaping.
//
// Tails and airports stay consistent with the canonical fleet
// (src/components/tech-log/mockData/fleet.ts — home base KLUK; N2PG grounded on the
// chip-detector defect; N3PG the provisional G800). Dates are computed RELATIVE TO
// NOW so the queue never goes stale.

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

export interface PendingTripRequest {
  id: string;
  requestedByName: string;
  route: string; // "KLUK → LSGG"
  purpose: string;
  startUtc: string;
  endUtc: string;
  requestedAtUtc: string;
  paxCount: number;
  preferredTail: string | null;
  /** Present when the request as filed cannot be met as-is. */
  conflictNote: string | null;
}

export interface Turndown {
  id: string;
  requestedRoute: string;
  turnedDownAtUtc: string;
  reason: 'availability' | 'crew-duty' | 'weather';
  detail: string;
}

export interface OnTimeLegStats {
  onTimeLegs: number;
  totalLegs: number;
  weatherDelays: number;
}

export interface TrackedPassenger {
  id: string;
  name: string;
  role: string;
  category: 'BOD' | 'C-Suite';
  email: string;
  phone: string;
  preferences: string;
  /** Next booked leg for this principal, when one exists; derived relative to now. */
  nextFlight: { route: string; departureUtc: string } | null;
}

function iso(baseMs: number, offsetMs: number): string {
  return new Date(baseMs + offsetMs).toISOString();
}

/** Trip requests awaiting a lead decision, oldest first. */
export function getPendingTripRequests(nowUtc: string = new Date().toISOString()): PendingTripRequest[] {
  const now = Date.parse(nowUtc);
  return [
    {
      id: 'REQ-1041',
      requestedByName: 'Jennifer Martinez',
      route: 'KLUK → LSGG',
      purpose: 'Geneva investor meetings, 3-night stay',
      startUtc: iso(now, 14 * DAY_MS),
      endUtc: iso(now, 17 * DAY_MS),
      requestedAtUtc: iso(now, -(2 * DAY_MS)),
      paxCount: 4,
      preferredTail: 'N1PG',
      conflictNote: null,
    },
    {
      id: 'REQ-1044',
      requestedByName: 'Michael Chen',
      route: 'KLUK → SBGR',
      purpose: 'São Paulo plant visit',
      startUtc: iso(now, 9 * DAY_MS),
      endUtc: iso(now, 12 * DAY_MS),
      requestedAtUtc: iso(now, -(6 * HOUR_MS)),
      paxCount: 6,
      preferredTail: 'N2PG',
      conflictNote: 'Requested tail N2PG is grounded (chip-detector defect) — needs a swap or a release before confirm.',
    },
  ];
}

/** Requests the department could not serve this month, newest first. */
export function getTurndownsThisMonth(nowUtc: string = new Date().toISOString()): Turndown[] {
  const now = Date.parse(nowUtc);
  return [
    {
      id: 'TDN-208',
      requestedRoute: 'KLUK → KSFO',
      turnedDownAtUtc: iso(now, -(3 * DAY_MS)),
      reason: 'availability',
      detail: 'Both G650ERs committed; G500 range/pax fit marginal.',
    },
    {
      id: 'TDN-207',
      requestedRoute: 'KLUK → EGLL',
      turnedDownAtUtc: iso(now, -(8 * DAY_MS)),
      reason: 'availability',
      detail: 'No dispatchable long-range tail in the window.',
    },
    {
      id: 'TDN-206',
      requestedRoute: 'KLUK → KTEB',
      turnedDownAtUtc: iso(now, -(12 * DAY_MS)),
      reason: 'crew-duty',
      detail: 'Return leg would have breached the duty limit; no relief crew.',
    },
  ];
}

/** Rolling on-time performance for the brief's stat card. */
export function getOnTimeLegStats(): OnTimeLegStats {
  return { onTimeLegs: 46, totalLegs: 48, weatherDelays: 2 };
}

/** Passenger ids tracked by default on the Lead brief. */
export const DEFAULT_TRACKED_PASSENGER_IDS = ['PAX001', 'PAX003', 'PAX007', 'PAX012', 'PAX018'];

/**
 * The principal register — moved here from the old LeadDashboard.tsx private
 * literal so any surface (brief, booking portal, manifests) reads the same
 * people. Next-flight lines are derived relative to now so they never go stale.
 */
export function getTrackedPassengers(nowUtc: string = new Date().toISOString()): TrackedPassenger[] {
  const now = Date.parse(nowUtc);
  return [
    { id: 'PAX001', name: 'Robert Johnson', role: 'Board Chairman', category: 'BOD', email: 'robert.johnson@email.com', phone: '+1 (555) 123-4567', preferences: 'Window seat, sparkling water, WSJ', nextFlight: { route: 'KLUK → KTEB', departureUtc: iso(now, 2 * DAY_MS) } },
    { id: 'PAX003', name: 'Michael Chen', role: 'CEO', category: 'C-Suite', email: 'michael.chen@email.com', phone: '+1 (555) 234-5678', preferences: 'Quiet cabin, green tea, no shellfish', nextFlight: { route: 'KLUK → SBGR', departureUtc: iso(now, 9 * DAY_MS) } },
    { id: 'PAX007', name: 'Jennifer Martinez', role: 'CFO', category: 'C-Suite', email: 'jennifer.martinez@email.com', phone: '+1 (555) 345-6789', preferences: 'Aisle seat, diet coke, Financial Times', nextFlight: { route: 'KLUK → LSGG', departureUtc: iso(now, 14 * DAY_MS) } },
    { id: 'PAX012', name: 'David Thompson', role: 'Board Member', category: 'BOD', email: 'david.thompson@email.com', phone: '+1 (555) 456-7890', preferences: 'Rear cabin, bourbon, privacy', nextFlight: null },
    { id: 'PAX015', name: 'Susan Whitfield', role: 'Board Member', category: 'BOD', email: 'susan.whitfield@email.com', phone: '+1 (555) 567-8901', preferences: 'Forward cabin, still water, no photography', nextFlight: { route: 'KLUK → KSFO', departureUtc: iso(now, 5 * DAY_MS) } },
    { id: 'PAX018', name: 'Carlos Mendes', role: 'COO', category: 'C-Suite', email: 'carlos.mendes@email.com', phone: '+1 (555) 678-9012', preferences: 'Working cabin setup, espresso, early boarding', nextFlight: { route: 'KLUK → EGLL', departureUtc: iso(now, 6 * DAY_MS) } },
    { id: 'PAX021', name: 'Katherine O’Leary', role: 'CHRO', category: 'C-Suite', email: 'katherine.oleary@email.com', phone: '+1 (555) 789-0123', preferences: 'Aisle seat, herbal tea, vegetarian', nextFlight: null },
    { id: 'PAX024', name: 'Thomas Gruber', role: 'General Counsel', category: 'C-Suite', email: 'thomas.gruber@email.com', phone: '+1 (555) 890-1234', preferences: 'Privacy divider, sparkling water, document security case', nextFlight: null },
  ];
}
