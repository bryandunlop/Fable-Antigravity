// Cutoffs — department defaults with a per-trip override and a reason (D106, LG-322).
//
// The manager: "cutoffs … I don't have dates for that now, but that can be decided later and
// possibly would need to be able to be changed." Bryan: "we default to something, and then they
// can always override it." So: defaults live in settings and scheduling edits them; a move on
// one trip is an override with a reason, recorded on the trip.
//
// The anchor is the FIRST DEPARTURE. Each cutoff is that instant minus a duration; the result
// is an instant, displayed in the operator reference zone (D24: America/New_York).
// ASSUMPTION logged in D106: Bryan has not yet said whether T-72 counts from Eastern or from the
// departure field's local clock — the instant is the same either way; only "which day" a
// days-based cutoff falls on differs, and that is what the zone below decides.
//
// Pure. No React, no storage, no clock.

import { zoneForAirport } from '../../../services/airportZone';
import { SCHEDULING_DECIDES } from './places';
import { recordCutoffMove, type Actor, type Trip, type TripLeg } from './trip';

export const REFERENCE_ZONE = 'America/New_York';

export type CutoffKind = 'names' | 'forms' | 'catering' | 'freeze';

export interface CutoffDefaults {
  /** Hours before first departure by which every seat must carry a name. */
  namesDomesticHours: number;
  namesInternationalHours: number;
  /** Days before first departure by which passenger forms are due. */
  formsDays: number;
  cateringHours: number;
  /** When the trip sheet freezes and the passenger email is drafted. */
  freezeHours: number;
}

export const DEFAULT_CUTOFFS: CutoffDefaults = {
  namesDomesticHours: 24,
  namesInternationalHours: 72,
  formsDays: 21,
  cateringHours: 48,
  freezeHours: 72,
};

export const CUTOFF_LABEL: Record<CutoffKind, string> = {
  names: 'Names for every seat',
  forms: 'Passenger forms',
  catering: 'Catering',
  freeze: 'Trip sheet freezes · email drafted',
};

const HOUR = 3_600_000;

/** A leg touching a non-US field makes the trip international — the manifest rule, reused. */
export function isInternational(trip: Trip): boolean {
  const intl = (a: string | null) => !!a && a !== SCHEDULING_DECIDES && !a.startsWith('K');
  return trip.legs.some(l => intl(l.from.airport) || intl(l.to.airport));
}

/** Offset (minutes east of UTC) of a zone at an instant, via Intl. */
function offsetAt(zone: string, ms: number): number {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(ms));
  const g = (t: string) => Number(parts.find(p => p.type === t)?.value);
  const asUtc = Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'));
  return Math.round((asUtc - ms) / 60_000);
}

/** The UTC instant for a wall-clock date+time in a zone (DST-aware, two-pass). */
export function zonedToUtc(date: string, hhmm: string, zone: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = hhmm.split(':').map(Number);
  const naive = Date.UTC(y, m - 1, d, hh, mm);
  let ms = naive - offsetAt(zone, naive) * 60_000;
  ms = naive - offsetAt(zone, ms) * 60_000;
  return new Date(ms).toISOString();
}

/** Planning departure clock for a leg: what is fixed, or 09:00 when nothing is. */
export function plannedDepartureLocal(leg: TripLeg): string {
  const t = leg.timing;
  if (t.kind === 'depart') return t.departLocal;
  // Be-there-by: plan to leave four hours before, never before 06:00. A planning number, not
  // a schedule — scheduling sets the real one when the aircraft is assigned.
  if (t.kind === 'arrive') {
    const [h, m] = t.arriveByLocal.split(':').map(Number);
    const mins = Math.max(6 * 60, h * 60 + m - 240);
    return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
  }
  return '09:00';
}

/** The first departure as an instant. Null until the first leg has a date. */
export function firstDepartureUtc(trip: Trip): string | null {
  const leg = trip.legs[0];
  if (!leg?.date) return null;
  const zone = (leg.from.airport && leg.from.airport !== SCHEDULING_DECIDES ? zoneForAirport(leg.from.airport) : null) ?? REFERENCE_ZONE;
  return zonedToUtc(leg.date, plannedDepartureLocal(leg), zone);
}

export interface CutoffDue {
  kind: CutoffKind;
  label: string;
  dueUtc: string;
  source: 'default' | 'override';
  reason?: string;
  movedBy?: string;
}

export function cutoffsFor(trip: Trip, defaults: CutoffDefaults): CutoffDue[] {
  const dep = firstDepartureUtc(trip);
  if (!dep) return [];
  const depMs = Date.parse(dep);
  const intl = isInternational(trip);
  const base: Array<[CutoffKind, number]> = [
    ['forms', defaults.formsDays * 24 * HOUR],
    ['freeze', defaults.freezeHours * HOUR],
    ['catering', defaults.cateringHours * HOUR],
    ['names', (intl ? defaults.namesInternationalHours : defaults.namesDomesticHours) * HOUR],
  ];
  const out = base.map(([kind, before]) => {
    // The LAST override for a kind wins — the record keeps them all.
    const ov = [...trip.cutoffOverrides].reverse().find(o => o.cutoff === kind);
    return ov
      ? { kind, label: CUTOFF_LABEL[kind], dueUtc: ov.dueUtc, source: 'override' as const, reason: ov.reason, movedBy: ov.by.name }
      : { kind, label: CUTOFF_LABEL[kind], dueUtc: new Date(depMs - before).toISOString(), source: 'default' as const };
  });
  return out.sort((a, b) => a.dueUtc.localeCompare(b.dueUtc));
}

/** Scheduling moves one cutoff for this trip only; must say why. */
export function moveCutoff(trip: Trip, kind: CutoffKind, dueUtc: string, reason: string, by: Actor, nowUtc: string): Trip {
  if (Number.isNaN(Date.parse(dueUtc))) return trip;
  return recordCutoffMove(trip, kind, dueUtc, reason, by, nowUtc);
}

/** Has the freeze moment passed? */
export function freezeDue(trip: Trip, defaults: CutoffDefaults, nowUtc: string): boolean {
  const f = cutoffsFor(trip, defaults).find(c => c.kind === 'freeze');
  return !!f && f.dueUtc <= nowUtc;
}

/** 'Sun 11 Oct 09:20 ET' — the reference zone, always. */
export function formatEt(iso: string): string {
  const d = new Date(iso);
  const s = d.toLocaleString('en-US', { timeZone: REFERENCE_ZONE, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
  return `${s} ET`;
}
