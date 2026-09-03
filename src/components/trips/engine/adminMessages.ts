// Messages from an admin (the EA) that scheduling has not answered (LG-398, Bryan, 2026-09-03: "a
// way to show an outstanding message from any of the admins — on the trip and in a dedicated
// space"). A message is answered by any later message or question from scheduling. Pure.

import type { Trip, TripEvent } from './trip';

export type AdminMessage = Extract<TripEvent, { kind: 'message' }> | Extract<TripEvent, { kind: 'question' }>;

/**
 * Everything one side has said on this trip since the other side last spoke, oldest first.
 *
 * Both directions run this one loop on purpose. The scheduler's board and the EA's home ask the
 * same question from opposite ends — "has this been picked up?" — and if the two sides computed it
 * separately they would eventually disagree about who is holding a trip up, which is the failure
 * `queue.ts` already documents for `waitingOn`.
 */
function saidSince(trip: Trip, by: 'ea' | 'scheduling'): AdminMessage[] {
  let open: AdminMessage[] = [];
  for (const e of trip.events) {
    if (e.kind !== 'message' && e.kind !== 'question') continue;
    if (e.by.role === by) open.push(e);
    else if (e.by.role === (by === 'ea' ? 'scheduling' : 'ea')) open = [];
  }
  return open;
}

/** The EA's messages on this trip after scheduling last spoke, oldest first. */
export function outstandingAdminMessages(trip: Trip): AdminMessage[] {
  return saidSince(trip, 'ea');
}

/**
 * The mirror: what scheduling has said since the EA last spoke — her news on this trip, oldest
 * first. A question in here is a debt she owes; a plain message is only news, and the two are
 * deliberately not levelled (Bryan, 2026-09-03: unread-but-not-a-question deserves a quieter mark
 * than an unanswered question, not silence).
 */
export function newsForEa(trip: Trip): AdminMessage[] {
  return saidSince(trip, 'scheduling');
}

export interface OutstandingMessage { trip: Trip; message: AdminMessage; ageHours: number }

/** Every unanswered admin message across the live bookings, oldest first — the dedicated space. */
export function outstandingAcrossTrips(trips: Trip[], nowUtc: string): OutstandingMessage[] {
  const now = Date.parse(nowUtc);
  const out: OutstandingMessage[] = [];
  for (const trip of trips) {
    if (trip.status === 'cancelled' || trip.status === 'declined') continue;
    for (const message of outstandingAdminMessages(trip)) out.push({ trip, message, ageHours: Math.max(0, (now - Date.parse(message.at)) / 3_600_000) });
  }
  return out.sort((a, b) => b.ageHours - a.ageHours);
}
