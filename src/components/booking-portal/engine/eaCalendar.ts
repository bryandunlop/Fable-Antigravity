// The EA command center's pure layer (D100): itineraries → calendar geometry,
// the "revised since you looked" test, and the .ics an EA forwards.
//
// No React, no storage. The month-grid maths itself is NOT reimplemented here —
// `components/inflight/tripCalendar.ts` already solves week-boundary squaring and
// is unit-tested; this only adapts the portal's `Itinerary` to that engine's
// structural `CalTrip` and adds what the portal needs on top.

import type { CalTrip } from '../../inflight/tripCalendar';
import type { Itinerary } from './itinerary';

/**
 * An itinerary as the calendar engine wants it. Departure/arrival are built from
 * the leg's local date + time: the portal has no arrival instant, so a leg is
 * treated as same-day (an out-and-back over three days still spans correctly,
 * because the span runs first leg → last leg).
 */
export function toCalTrip(itinerary: Itinerary): CalTrip {
  const legs = itinerary.legs.map((leg) => {
    const iso = `${leg.date}T${(leg.depart || '00:00').slice(0, 5)}:00`;
    return { departureUtc: iso, arrivalUtc: `${leg.date}T${(leg.arrive || leg.depart || '23:59').slice(0, 5)}:00` };
  });
  return {
    id: itinerary.id,
    tripName: itinerary.title,
    // The bar's second half: a seat rides someone else's aircraft, so say so
    // rather than printing a tail the EA cannot act on.
    tail: itinerary.kind === 'seat' ? 'seat' : itinerary.legs[0]?.aircraft ?? 'TBD',
    legs,
  };
}

export const toCalTrips = (itineraries: Itinerary[]): CalTrip[] => itineraries.map(toCalTrip);

/**
 * Which trip the panel opens on: the next one that has not departed, else the
 * most recent. The panel is never empty while any trip exists — an always-open
 * panel that starts blank is just a drawer with extra steps.
 */
export function defaultSelectedId(itineraries: Itinerary[], nowMs: number): string | null {
  if (itineraries.length === 0) return null;
  const upcoming = itineraries.find((i) => {
    const first = i.legs[0];
    if (!first) return false;
    return Date.parse(`${first.date}T${(first.depart || '00:00').slice(0, 5)}:00`) >= nowMs;
  });
  return (upcoming ?? itineraries[itineraries.length - 1]).id;
}

/**
 * The month the calendar opens on: the month of the trip the panel is showing,
 * not today's. Opening on an empty August while the panel reads a September
 * trip makes the two halves look unrelated — the calendar should be showing the
 * thing you are looking at.
 */
export function initialMonth(
  itineraries: Itinerary[],
  selectedId: string | null,
  now: Date,
): { year: number; month: number } {
  const first = itineraries.find((i) => i.id === selectedId)?.legs[0];
  if (first) {
    const d = new Date(`${first.date}T00:00:00`);
    if (!Number.isNaN(d.getTime())) return { year: d.getFullYear(), month: d.getMonth() };
  }
  return { year: now.getFullYear(), month: now.getMonth() };
}

/**
 * "Revised" is relative to the reader, not absolute (FL3XX's magenta flag, via
 * ref-fl3xx-cfd-trip-flow): a trip the EA has already seen since the change is
 * not revised for her. `seenAt` is per-trip; absent means never opened, which
 * still reads revised — she has not seen the change either way.
 */
export function isRevised(revisedAt: string | undefined, seenAt: string | undefined): boolean {
  if (!revisedAt) return false;
  if (!seenAt) return true;
  const r = Date.parse(revisedAt);
  const s = Date.parse(seenAt);
  if (Number.isNaN(r) || Number.isNaN(s)) return true;
  return r > s;
}

const icsEscape = (s: string): string =>
  s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

const stamp = (date: string, time: string): string =>
  `${date.replace(/-/g, '')}T${(time || '00:00').slice(0, 5).replace(':', '')}00`;

/**
 * One VEVENT per leg — an EA forwards a trip, and the principal's calendar should
 * show each flight, not one opaque multi-day block. Local-time values (no Z): the
 * portal's times are local to the departure airport and pretending otherwise
 * would shift a 08:00 departure in the reader's calendar.
 */
export function itineraryToIcs(itinerary: Itinerary, uidSeed = 'mygfo'): string {
  const lines: string[] = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//myGFO//Booking Portal//EN', 'CALSCALE:GREGORIAN'];
  itinerary.legs.forEach((leg, i) => {
    const pax = leg.passengers.map((p) => p.name).join(', ');
    lines.push(
      'BEGIN:VEVENT',
      `UID:${uidSeed}-${itinerary.id}-${leg.id || i}`,
      `SUMMARY:${icsEscape(`${leg.from} → ${leg.to}${leg.aircraft ? ` · ${leg.aircraft}` : ''}`)}`,
      `DTSTART:${stamp(leg.date, leg.depart)}`,
      `DTEND:${stamp(leg.date, leg.arrive || leg.depart)}`,
      `LOCATION:${icsEscape(leg.fbo.from)}`,
      `DESCRIPTION:${icsEscape(pax ? `Passengers: ${pax}` : 'myGFO trip')}`,
      'END:VEVENT',
    );
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
