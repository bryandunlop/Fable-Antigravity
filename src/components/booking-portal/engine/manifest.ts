// The manifest as the EA actually works it (D100 design pass, 2026-08-29).
//
// At request time she knows the lead passenger and roughly how many seats. The
// rest arrives over weeks, in bits, chasing people for forms and passports. So
// the model is SEATS HELD vs NAMES KNOWN, plus a clock, plus a list of who owes
// what — never a form that demands everyone up front.
//
// Pure: no React, no storage, and the clock is always passed in.

import type { Passenger, TripRequest } from '../types';
import { evaluateDoc } from './docExpiry';
import { LOCKOUT_HOURS } from './itinerary';

const HOUR_MS = 3_600_000;

/** Reminder cadence before the lock, newest-first in the UI. */
export const REMINDER_DAYS_BEFORE = [5, 3, 1];

export type OutstandingKind = 'form' | 'document';

export interface Outstanding {
  passengerId: string;
  name: string;
  kind: OutstandingKind;
  /** One line the EA can act on. */
  detail: string;
  /** Legs this person cannot fly. Empty when the problem is not leg-specific. */
  blockedLegIds: string[];
}

export interface ManifestSeat {
  passengerId: string;
  name: string;
  kind: Passenger['kind'];
  lead: boolean;
  /** Leg ids this passenger is on. */
  legIds: string[];
}

export interface ManifestState {
  seatsHeld: number;
  named: ManifestSeat[];
  /** seatsHeld − named, never negative: naming more people than seats held is
   *  the EA telling us the estimate was low, not an error to throw. */
  unnamedSeats: number;
  international: boolean;
  lockHours: number;
  /** ms timestamp of the lock, or null when the leg has no parseable departure. */
  lockAtMs: number | null;
  hoursToLock: number;
  locked: boolean;
  outstanding: Outstanding[];
}

function firstDepartureMs(request: TripRequest): number | null {
  const first = request.legs[0];
  if (!first) return null;
  const t = Date.parse(`${first.date}T${(first.departLocal || '00:00').slice(0, 5)}:00`);
  return Number.isNaN(t) ? null : t;
}

const isIntl = (icao: string) => !/^K[A-Z]{3}$/.test(icao);

/** Travel window used to evaluate documents: first departure to last leg's date. */
function travelWindow(request: TripRequest): { start: string; end: string } | null {
  const first = request.legs[0];
  const last = request.legs[request.legs.length - 1];
  if (!first || !last) return null;
  return { start: first.date, end: last.date };
}

/**
 * Everything the manifest screen needs, in one pass.
 *
 * `seatsHeld` falls back to the number of distinct named passengers when the
 * request predates the field — an old request is fully named by definition.
 */
export function manifestState(
  request: TripRequest,
  passengers: Passenger[],
  nowMs: number,
): ManifestState {
  const byId = new Map(passengers.map((p) => [p.id, p]));

  // Distinct people across all legs, remembering which legs each is on.
  const seats = new Map<string, ManifestSeat>();
  for (const leg of request.legs) {
    for (const lp of leg.passengers) {
      const person = byId.get(lp.passengerId);
      const existing = seats.get(lp.passengerId);
      if (existing) {
        existing.legIds.push(leg.id);
        existing.lead = existing.lead || !!lp.lead;
      } else {
        seats.set(lp.passengerId, {
          passengerId: lp.passengerId,
          name: person?.name ?? lp.passengerId,
          kind: person?.kind ?? 'guest',
          lead: !!lp.lead,
          legIds: [leg.id],
        });
      }
    }
  }
  const named = Array.from(seats.values());

  const international = request.legs.some((l) => isIntl(l.from) || isIntl(l.to));
  const lockHours = international ? LOCKOUT_HOURS.international : LOCKOUT_HOURS.domestic;
  const departMs = firstDepartureMs(request);
  const lockAtMs = departMs === null ? null : departMs - lockHours * HOUR_MS;
  const hoursToLock = lockAtMs === null ? Number.POSITIVE_INFINITY : (lockAtMs - nowMs) / HOUR_MS;

  const window = travelWindow(request);
  const outstanding: Outstanding[] = [];

  for (const seat of named) {
    const person = byId.get(seat.passengerId);
    if (!person) continue;

    // A form that has not come back is the EA's most common chase.
    if (person.formStatus === 'resubmit' || (!person.hasFlown && person.formStatus !== 'approved')) {
      outstanding.push({
        passengerId: person.id,
        name: person.name,
        kind: 'form',
        detail:
          person.formStatus === 'resubmit'
            ? person.formNote || 'Scheduling asked for this to be resubmitted'
            : 'First time flying with us — travel form not returned',
        blockedLegIds: [],
      });
    }

    // Documents are evaluated against the travel window, and a block is stated
    // per leg: "cannot fly the return" is actionable, "invalid" is not.
    if (window) {
      for (const doc of person.docs) {
        if (evaluateDoc(doc.expires, window.start, window.end) !== 'block') continue;
        const blockedLegIds = request.legs
          .filter((leg) => leg.passengers.some((lp) => lp.passengerId === person.id))
          .filter((leg) => Date.parse(doc.expires) < Date.parse(leg.date))
          .map((leg) => leg.id);
        outstanding.push({
          passengerId: person.id,
          name: person.name,
          kind: 'document',
          detail: `${doc.label} expires ${doc.expires}`,
          blockedLegIds: blockedLegIds.length > 0 ? blockedLegIds : seat.legIds,
        });
        break; // one document problem per person is enough to act on
      }
    }
  }

  const seatsHeld = request.seatsHeld ?? named.length;

  return {
    seatsHeld,
    named,
    unnamedSeats: Math.max(0, seatsHeld - named.length),
    international,
    lockHours,
    lockAtMs,
    hoursToLock,
    locked: hoursToLock <= 0,
    outstanding,
  };
}

/**
 * What the EA is told will happen if she does nothing — the honest version of a
 * deadline. Stated as sentences because the consequences differ in kind: seats
 * are released, blocked people come off legs.
 */
export function consequencesOfSilence(state: ManifestState): string[] {
  const out: string[] = [];
  if (state.locked) return ['The manifest is locked — changes now go through scheduling.'];
  if (state.unnamedSeats > 0) {
    out.push(
      state.unnamedSeats === 1
        ? 'The unnamed seat is released back to the fleet.'
        : `${state.unnamedSeats} unnamed seats are released back to the fleet.`,
    );
  }
  for (const item of state.outstanding) {
    if (item.kind === 'document' && item.blockedLegIds.length > 0) {
      out.push(`${item.name} comes off ${item.blockedLegIds.length === 1 ? 'a leg' : 'the affected legs'} automatically.`);
    }
    if (item.kind === 'form') {
      out.push(`${item.name} cannot board without the travel form.`);
    }
  }
  if (out.length === 0) out.push('Nothing — this manifest is complete.');
  return out;
}

/** Reminder instants before the lock, soonest first, future ones only. */
export function upcomingReminders(state: ManifestState, nowMs: number): number[] {
  if (state.lockAtMs === null) return [];
  return REMINDER_DAYS_BEFORE.map((d) => state.lockAtMs! - d * 24 * HOUR_MS)
    .filter((ms) => ms > nowMs)
    .sort((a, b) => a - b);
}
