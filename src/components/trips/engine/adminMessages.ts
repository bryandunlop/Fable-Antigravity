// Messages from an admin (the EA) that scheduling has not answered (LG-398, Bryan, 2026-09-03: "a
// way to show an outstanding message from any of the admins — on the trip and in a dedicated
// space"). A message is answered by any later message or question from scheduling. Pure.

import type { Trip, TripEvent } from './trip';

export type AdminMessage = Extract<TripEvent, { kind: 'message' }> | Extract<TripEvent, { kind: 'question' }>;

/** The EA's messages on this trip after scheduling last spoke, oldest first. */
export function outstandingAdminMessages(trip: Trip): AdminMessage[] {
  let open: AdminMessage[] = [];
  for (const e of trip.events) {
    if ((e.kind === 'message' || e.kind === 'question') && e.by.role === 'ea') open.push(e);
    else if ((e.kind === 'message' || e.kind === 'question') && e.by.role === 'scheduling') open = [];
  }
  return open;
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
