// The trip sheet — the record, frozen at T-72 (D106, LG-320).
//
// Times, airports, who is on each leg, catering, crew, documents: GENERATED from the trip, never
// typed again. Freezing takes a snapshot and appends it as version n; a change afterwards does
// not alter v1 — scheduling refreezes as v2 and the record says so. "Send to crew" is recorded on
// the trip; the EFB push waits on a documented API (TL-29) and is an adapter behind that event.
//
// Pure. Callers pass the clock, the places register and the crew roster.

import { airportLabel, type PlaceRecord } from './places';
import { firstDepartureUtc } from './cutoffs';
import { legClock, formatLegWall, estimateMinutes, icaoOf } from './legClock';
import { documentsOf, type Actor, type Trip, type TripLeg } from './trip';

// The leg arithmetic lives in `legClock` now; re-exported so existing callers and tests keep
// their import site while there is exactly one implementation.
export { estimateMinutes };

export interface SheetEnd {
  icao: string | null;
  /** The place as the EA said it — "Seattle", "Mehoopany plant". What a passenger reads. */
  place: string;
  label: string;
  /** "09:20 EDT" at the field, or null when the field is unplaced. */
  wall: string | null;
  utc: string;
}

export interface SheetLeg {
  n: number;
  date: string;
  from: SheetEnd;
  to: SheetEnd;
  elapsedMinutes: number | null;
  /** +1 when the arrival is the next local day. */
  dayShift: number | null;
  aboard: string[];
  catering: string | null;
  /** True when the departure time is a planning number, not one scheduling set. */
  planned: boolean;
  /** Nobody aboard — the aircraft is positioning. */
  positioning: boolean;
}

export interface SheetCrewLine { role: 'PIC' | 'SIC' | 'FA'; name: string; blurb: string | null }

export interface FrozenSheet {
  version: number;
  frozenAtUtc: string;
  frozenBy: string;
  tripId: string;
  title: string;
  tail: string | null;
  lead: string;
  legs: SheetLeg[];
  crew: SheetCrewLine[];
  documents: string[];
  /** A hash-like fingerprint of the inputs, so "changed since freeze" is a comparison, not a guess. */
  fingerprint: string;
}

export function sheetLeg(leg: TripLeg, n: number, trip: Trip, places: PlaceRecord[]): SheetLeg | null {
  const clock = legClock(leg);
  if (!clock || !leg.date) return null;
  const fromIcao = icaoOf(leg.from.airport);
  const toIcao = icaoOf(leg.to.airport);
  const wall = (end: typeof clock.times.departure, icao: string | null) =>
    icao && end.wallTime ? formatLegWall(end) : null;
  return {
    n,
    date: leg.date,
    from: { icao: fromIcao, place: leg.from.placeName, label: leg.from.airport ? airportLabel(places, leg.from.airport) : leg.from.placeName, wall: wall(clock.times.departure, fromIcao), utc: clock.depUtc },
    to: { icao: toIcao, place: leg.to.placeName, label: leg.to.airport ? airportLabel(places, leg.to.airport) : leg.to.placeName, wall: wall(clock.times.arrival, toIcao), utc: clock.arrUtc },
    elapsedMinutes: clock.times.elapsedMinutes ?? clock.estimatedMinutes,
    dayShift: clock.times.dayShift,
    aboard: leg.positioning ? [] : trip.passengerNames,
    catering: leg.positioning ? null : (leg.catering ?? null),
    planned: clock.planned,
    positioning: !!leg.positioning,
  };
}

export interface SheetContext {
  places: PlaceRecord[];
  /** Crew blurbs by crew name — a line scheduling maintains on the crew record (D106 assumption). */
  blurbs: Record<string, string>;
}

/** The sheet as it would read right now. Not frozen — see freezeSheet. */
export function buildSheet(trip: Trip, ctx: SheetContext, nowUtc: string, by: Actor): FrozenSheet {
  const legs = trip.legs.map((l, i) => sheetLeg(l, i + 1, trip, ctx.places)).filter((l): l is SheetLeg => !!l);
  const crew: SheetCrewLine[] = trip.crew
    ? [
        { role: 'PIC', name: trip.crew.pic, blurb: ctx.blurbs[trip.crew.pic] ?? null },
        { role: 'SIC', name: trip.crew.sic, blurb: ctx.blurbs[trip.crew.sic] ?? null },
        ...(trip.crew.fa ? [{ role: 'FA' as const, name: trip.crew.fa, blurb: ctx.blurbs[trip.crew.fa] ?? null }] : []),
      ]
    : [];
  const documents = documentsOf(trip).map(d => d.name);
  const fingerprint = JSON.stringify({ legs: legs.map(l => [l.date, l.from.utc, l.to.utc, l.aboard, l.catering]), tail: trip.tail, crew: trip.crew, documents });
  return {
    version: trip.frozenSheets.length + 1,
    frozenAtUtc: nowUtc,
    frozenBy: by.name,
    tripId: trip.id,
    title: trip.title,
    tail: trip.tail,
    lead: trip.leadPassengerName,
    legs,
    crew,
    documents,
    fingerprint,
  };
}

export const frozenSheets = (trip: Trip): FrozenSheet[] => trip.frozenSheets as FrozenSheet[];
export const latestSheet = (trip: Trip): FrozenSheet | null => frozenSheets(trip).at(-1) ?? null;

/** True when the trip has moved on since the last freeze — the prompt to refreeze as v(n+1). */
export function changedSinceFreeze(trip: Trip, ctx: SheetContext, nowUtc: string, by: Actor): boolean {
  const last = latestSheet(trip);
  if (!last) return false;
  return buildSheet(trip, ctx, nowUtc, by).fingerprint !== last.fingerprint;
}

/**
 * Freeze. Refused on a draft (nothing is booked) and when nothing changed since the last version
 * (a second identical freeze is noise). Anyone on the trip may freeze — the freeze is a clock
 * event, not an authority.
 */
export function freezeSheet(trip: Trip, ctx: SheetContext, nowUtc: string, by: Actor): Trip {
  if (trip.status !== 'submitted' && trip.status !== 'confirmed') return trip;
  const sheet = buildSheet(trip, ctx, nowUtc, by);
  const last = latestSheet(trip);
  if (last && last.fingerprint === sheet.fingerprint) return trip;
  const events = [...trip.events, { id: `ev-${Date.now().toString(36)}-${trip.events.length}`, kind: 'sheet-frozen' as const, at: nowUtc, by, version: sheet.version }];
  return { ...trip, frozenSheets: [...trip.frozenSheets, sheet], events };
}

/** Recorded on the trip; the EFB adapter hangs off this event later (TL-29). */
export function sendSheetToCrew(trip: Trip, by: Actor, nowUtc: string): Trip {
  const last = latestSheet(trip);
  if (!last || by.role !== 'scheduling') return trip;
  const events = [...trip.events, { id: `ev-${Date.now().toString(36)}-${trip.events.length}`, kind: 'sent-to-crew' as const, at: nowUtc, by, version: last.version }];
  return { ...trip, events };
}

/** True when the first departure is inside the freeze window — the UI offers "freeze now". */
export function inFreezeWindow(trip: Trip, freezeHours: number, nowUtc: string): boolean {
  const dep = firstDepartureUtc(trip);
  return !!dep && Date.parse(dep) - Date.parse(nowUtc) <= freezeHours * 3_600_000;
}
