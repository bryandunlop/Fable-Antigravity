// Month-grid maths for the trip picker's calendar. No React / no storage — unit-tested.
//
// Trip dates in this app are built with local setHours(), so every comparison here is in
// LOCAL calendar terms. Mixing in UTC would shift a trip a day either side of midnight,
// which on a calendar is the difference between "I fly Saturday" and "I fly Sunday".
import type { FaTrip } from './faTrips';

export interface CalDay {
  date: Date;
  day: number;
  /** False for the leading/trailing days borrowed from the neighbouring months. */
  inMonth: boolean;
  isToday: boolean;
  key: string;
}

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Six Sunday-first weeks covering the month. Always six, never five: a grid that
 *  changes height between months makes everything below it jump. */
export function monthGrid(year: number, month: number, today: Date): CalDay[][] {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  const todayKey = dayKey(today);

  const weeks: CalDay[][] = [];
  for (let w = 0; w < 6; w++) {
    const week: CalDay[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + i);
      week.push({ date, day: date.getDate(), inMonth: date.getMonth() === month, isToday: dayKey(date) === todayKey, key: dayKey(date) });
    }
    weeks.push(week);
  }
  return weeks;
}

/** A trip's calendar span: first departure through last arrival, whole days. */
export function tripSpan(trip: FaTrip): { start: Date; end: Date } | null {
  if (trip.legs.length === 0) return null;
  let start = new Date(trip.legs[0].departureUtc);
  let end = new Date(trip.legs[0].arrivalUtc);
  for (const leg of trip.legs) {
    const d = new Date(leg.departureUtc);
    const a = new Date(leg.arrivalUtc);
    if (d < start) start = d;
    if (a > end) end = a;
  }
  return { start: startOfDay(start), end: startOfDay(end) };
}

export interface TripSegment {
  tripId: string;
  label: string;
  /** 0-6 inclusive, the columns this bar covers in its week. */
  startCol: number;
  endCol: number;
  /** The trip carries on past this week's edge — the bar is drawn squared off there. */
  continuesLeft: boolean;
  continuesRight: boolean;
  /** Only one segment per trip carries the name: the widest one. Repeating it reads as
   *  two trips, and putting it on a one-column stub renders "West co…" while the wide
   *  bar next to it sits empty. */
  showLabel: boolean;
}

/** The bars to draw on one week row. A trip that crosses a week boundary produces a
 *  segment in each week it touches, squared off where it continues — otherwise a
 *  five-day trip starting on a Saturday reads as two unrelated one-day trips. */
export function segmentsForWeek(week: CalDay[], trips: FaTrip[]): TripSegment[] {
  const segments: TripSegment[] = [];
  const weekStart = week[0].date;
  const weekEnd = week[6].date;

  for (const trip of trips) {
    const span = tripSpan(trip);
    if (!span) continue;
    if (span.end < weekStart || span.start > weekEnd) continue;

    const startCol = span.start <= weekStart ? 0 : week.findIndex((d) => d.key === dayKey(span.start));
    const endCol = span.end >= weekEnd ? 6 : week.findIndex((d) => d.key === dayKey(span.end));
    if (startCol < 0 || endCol < 0) continue;

    segments.push({
      tripId: trip.id,
      label: `${trip.tripName} · ${trip.tail}`,
      startCol,
      endCol,
      continuesLeft: span.start < weekStart,
      continuesRight: span.end > weekEnd,
      showLabel: true,
    });
  }
  return segments;
}

export function tripsInMonth(trips: FaTrip[], year: number, month: number): FaTrip[] {
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  return trips.filter((t) => {
    const span = tripSpan(t);
    return span ? span.end >= monthStart && span.start <= monthEnd : false;
  });
}

/** The first trip that starts after the given month — so an empty month can say where
 *  to look instead of being a dead end. */
export function nextTripAfterMonth(trips: FaTrip[], year: number, month: number): FaTrip | null {
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
  const later = trips
    .map((t) => ({ t, span: tripSpan(t) }))
    .filter((x): x is { t: FaTrip; span: { start: Date; end: Date } } => !!x.span && x.span.start > monthEnd)
    .sort((a, b) => a.span.start.getTime() - b.span.start.getTime());
  return later.length > 0 ? later[0].t : null;
}

export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

/** Segments for every week of a grid, with `showLabel` left true on only the widest
 * segment of each trip. Needs the whole month at once, which is why it is not something
 * `segmentsForWeek` can decide on its own. */
export function monthSegments(weeks: CalDay[][], trips: FaTrip[]): TripSegment[][] {
  const perWeek = weeks.map((w) => segmentsForWeek(w, trips));
  const widest = new Map<string, { width: number; seg: TripSegment }>();

  for (const week of perWeek) {
    for (const seg of week) {
      const width = seg.endCol - seg.startCol + 1;
      const best = widest.get(seg.tripId);
      if (!best || width > best.width) widest.set(seg.tripId, { width, seg });
    }
  }
  for (const week of perWeek) {
    for (const seg of week) seg.showLabel = widest.get(seg.tripId)?.seg === seg;
  }
  return perWeek;
}
