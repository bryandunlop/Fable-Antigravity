// Pure derivations for the Lead brief — no React, no store reads.
//
// Trips come from the scheduling store (TripRecord), fleet from
// useUnifiedFleetStatus, approvals/FIRs from their own selectors; everything here
// only reshapes what it is handed so it stays unit-testable with a pinned clock.

import type { TripRecord } from '../../scheduling/store/types';
import type { Serviceability } from '../tech-log/types';

const DAY_MS = 86_400_000;
const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ── Week ahead ──────────────────────────────────────────────────────────────

export interface WeekAheadDay {
  /** 'YYYY-MM-DD' (UTC) — stable key + footer wording. */
  dateUtc: string;
  /** e.g. 'Wed 19' */
  dateLabel: string;
  tripCount: number;
  tailsAvailable: number;
  oversubscribed: boolean;
}

/** Trips still consuming a tail — cancelled and flown trips make no demand. */
function demandTrips(trips: TripRecord[]): TripRecord[] {
  return trips.filter(t => t.status !== 'cancelled' && t.status !== 'completed');
}

function utcDayKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * 7 UTC-day buckets starting today. Demand per day = distinct trips with a leg
 * DEPARTING that day; a multi-leg trip counts once per day it touches, never
 * twice for two same-day legs. `tailsAvailable` is today's dispatchable count
 * applied across the window (Phase-1 approximation — no per-day maintenance
 * schedule exists to project it against yet).
 */
export function buildWeekAhead(
  trips: TripRecord[],
  dispatchable: number,
  nowUtc: string,
): WeekAheadDay[] {
  const nowMs = Date.parse(nowUtc);
  const todayStartMs = Date.parse(`${utcDayKey(nowMs)}T00:00:00.000Z`);

  // day key -> set of trip ids departing that day
  const byDay = new Map<string, Set<string>>();
  for (const t of demandTrips(trips)) {
    for (const leg of t.legs) {
      const depMs = Date.parse(leg.departureTimeUtc);
      if (Number.isNaN(depMs)) continue;
      const key = utcDayKey(depMs);
      let set = byDay.get(key);
      if (!set) byDay.set(key, (set = new Set()));
      set.add(t.id);
    }
  }

  return Array.from({ length: 7 }, (_, i) => {
    const dayMs = todayStartMs + i * DAY_MS;
    const date = new Date(dayMs);
    const dateUtc = utcDayKey(dayMs);
    const tripCount = byDay.get(dateUtc)?.size ?? 0;
    return {
      dateUtc,
      dateLabel: `${WEEKDAY[date.getUTCDay()]} ${date.getUTCDate()}`,
      tripCount,
      tailsAvailable: dispatchable,
      oversubscribed: tripCount > dispatchable,
    };
  });
}

// ── Fleet exceptions ────────────────────────────────────────────────────────

/** Structural subset of UnifiedFleetAircraft — all this selector reads. */
export interface FleetExceptionSource {
  tailNumber: string;
  airworthiness: {
    status: Serviceability;
    headline: string | null;
    deferralClock: { daysRemaining: number | null } | null;
  };
}

export interface FleetExceptionPill {
  tailNumber: string;
  kind: 'grounded' | 'deferral-expiring';
  headline: string | null;
  daysRemaining: number | null;
}

const DEFERRAL_EXPIRING_THRESHOLD_DAYS = 3;

/**
 * The only tails a lead needs told about: RED (grounded, with the driving
 * headline) and AMBER whose governing deferral clock is inside 3 days. A
 * comfortable AMBER or a GREEN tail earns no pill.
 */
export function fleetExceptions(fleet: FleetExceptionSource[]): FleetExceptionPill[] {
  const pills: FleetExceptionPill[] = [];
  for (const ac of fleet) {
    const aw = ac.airworthiness;
    if (aw.status === 'RED') {
      pills.push({ tailNumber: ac.tailNumber, kind: 'grounded', headline: aw.headline, daysRemaining: null });
    } else if (aw.status === 'AMBER') {
      const days = aw.deferralClock?.daysRemaining ?? null;
      if (days !== null && days <= DEFERRAL_EXPIRING_THRESHOLD_DAYS) {
        pills.push({ tailNumber: ac.tailNumber, kind: 'deferral-expiring', headline: aw.headline, daysRemaining: days });
      }
    }
  }
  return pills;
}

// ── Waiting on you ──────────────────────────────────────────────────────────

/** Structural subsets so callers pass real records and tests pass stubs. */
export interface WaitingTripRequestSource {
  id: string;
  route: string;
  requestedByName: string;
  requestedAtUtc: string;
}
export interface WaitingApprovalSource {
  id: string;
  subjectTitle: string;
  formLabel: string;
  requestedAt: string;
}
export interface WaitingFirSource {
  id: string;
  ref: string;
  title: string;
  openedAtUtc: string;
}

export type WaitingKind = 'trip-request' | 'approval' | 'fir';

export interface WaitingItem {
  id: string;
  kind: WaitingKind;
  title: string;
  detail: string;
  sinceUtc: string;
  target: string;
}

/** One merged decision queue, oldest first — the longest-waiting item on top. */
export function buildWaitingOnYou(input: {
  pendingRequests: WaitingTripRequestSource[];
  approvals: WaitingApprovalSource[];
  firsInReview: WaitingFirSource[];
}): WaitingItem[] {
  const items: WaitingItem[] = [
    ...input.pendingRequests.map(r => ({
      id: r.id,
      kind: 'trip-request' as const,
      title: r.route,
      detail: `Trip request — ${r.requestedByName}`,
      sinceUtc: r.requestedAtUtc,
      target: '/scheduling-command',
    })),
    ...input.approvals.map(a => ({
      id: a.id,
      kind: 'approval' as const,
      title: a.subjectTitle,
      detail: `${a.formLabel} awaiting your approval`,
      sinceUtc: a.requestedAt,
      target: '/approvals',
    })),
    ...input.firsInReview.map(f => ({
      id: f.id,
      kind: 'fir' as const,
      title: f.title,
      detail: `${f.ref} — publish gate`,
      sinceUtc: f.openedAtUtc,
      target: `/fir/${f.id}`,
    })),
  ];
  return items.sort((a, b) => Date.parse(a.sinceUtc) - Date.parse(b.sinceUtc));
}

// ── Today's flights / month stats ───────────────────────────────────────────

export interface TodayLeg {
  tripId: string;
  tripNumber: string;
  tail: string;
  from: string;
  to: string;
  departureTimeUtc: string;
  paxCount: number;
}

/** Legs departing in the current UTC day, soonest first. */
export function todaysLegs(trips: TripRecord[], nowUtc: string): TodayLeg[] {
  const today = utcDayKey(Date.parse(nowUtc));
  const out: TodayLeg[] = [];
  for (const t of demandTrips(trips)) {
    for (const leg of t.legs) {
      const depMs = Date.parse(leg.departureTimeUtc);
      if (Number.isNaN(depMs) || utcDayKey(depMs) !== today) continue;
      out.push({
        tripId: t.id,
        tripNumber: t.tripNumber,
        tail: t.tail,
        from: leg.departureIcao,
        to: leg.arrivalIcao,
        departureTimeUtc: leg.departureTimeUtc,
        paxCount: leg.paxCount,
      });
    }
  }
  return out.sort((a, b) => Date.parse(a.departureTimeUtc) - Date.parse(b.departureTimeUtc));
}

/** Completed trips whose end date falls in the current UTC month. */
export function tripsFlownThisMonth(trips: TripRecord[], nowUtc: string): number {
  const monthKey = utcDayKey(Date.parse(nowUtc)).slice(0, 7);
  return trips.filter(
    t => t.status === 'completed' && utcDayKey(Date.parse(t.endDate)).slice(0, 7) === monthKey,
  ).length;
}
