// The trip record — one object per trip, from the first idea to wheels-up (D105, D77).
//
// The shape Bryan chose on 2026-09-01: a request is not a form that gets approved, it is a
// trip that gets progressively completed over months. So the record is a small header
// (legs, lead, seats, status) plus an APPEND-ONLY event stream: every message, document,
// share, submission and assignment is an event with who and when. The searchable log, the
// trip sheet and the metrics are readers of that stream.
//
// Two rules from the scheduling manager are enforced here, not merely written down:
//   - scheduling cannot see a draft until the EA shares it (`visibleToScheduling`);
//   - scheduling cannot hold an aircraft until an itinerary is submitted (`assignTail`).
//
// Pure: no React, no storage, no clock — callers pass `nowUtc` and `actor`.

import type { LegTiming } from '../../booking-portal/engine/legTiming';
import { SCHEDULING_DECIDES } from './places';

export type TripStatus = 'draft' | 'submitted' | 'confirmed' | 'declined';

export type ActorRole = 'ea' | 'scheduling' | 'executive' | 'system';

export interface Actor {
  name: string;
  role: ActorRole;
}

/** One end of a leg: what the EA said, and which field it resolved to. */
export interface LegEnd {
  /** The place as typed/chosen — "Seattle", "Mehoopany plant". */
  placeName: string;
  placeId: string | null;
  /** ICAO, or SCHEDULING_DECIDES, or null when unresolved. */
  airport: string | null;
}

export interface TripLeg {
  id: string;
  from: LegEnd;
  to: LegEnd;
  /** ISO date or null while the EA does not know. */
  date: string | null;
  timing: LegTiming;
}

export type TripEvent =
  | { id: string; kind: 'created'; at: string; by: Actor }
  | { id: string; kind: 'message'; at: string; by: Actor; text: string }
  | { id: string; kind: 'shared'; at: string; by: Actor }
  | { id: string; kind: 'submitted'; at: string; by: Actor }
  | { id: string; kind: 'document'; at: string; by: Actor; doc: TripDocument }
  | { id: string; kind: 'question'; at: string; by: Actor; about: 'airport' | 'date' | 'passengers' | 'other'; text: string }
  | { id: string; kind: 'assigned'; at: string; by: Actor; tail: string }
  | { id: string; kind: 'airport-changed'; at: string; by: Actor; legId: string; end: 'from' | 'to'; airport: string }
  | { id: string; kind: 'declined'; at: string; by: Actor; reason: string };

export type TripEventKind = TripEvent['kind'];

export interface TripDocument {
  id: string;
  name: string;
  sizeBytes: number;
  /** Optional data URL for small demo files. Never a real passport. */
  dataUrl?: string;
  /** What it belongs to: a leg, a passenger name, or the trip. */
  tag: { kind: 'trip' } | { kind: 'leg'; legId: string } | { kind: 'passenger'; name: string };
  /** EA + scheduling in Phase 2; crew arrives later, sent from scheduling (D105). */
  visibleTo: Array<'ea' | 'scheduling'>;
}

export interface Trip {
  id: string;
  title: string;
  status: TripStatus;
  /** Drafts are private to the EA until shared. Submission implies visibility. */
  visibleToScheduling: boolean;
  leadPassengerId: string;
  leadPassengerName: string;
  seatsHeld: number;
  legs: TripLeg[];
  tail: string | null;
  createdBy: Actor;
  createdAt: string;
  events: TripEvent[];
}

let seq = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(seq += 1).toString(36)}`;

export function emptyEnd(placeName = ''): LegEnd {
  return { placeName, placeId: null, airport: null };
}

export function newLeg(partial: Partial<TripLeg> = {}): TripLeg {
  return {
    id: nextId('leg'),
    from: emptyEnd(),
    to: emptyEnd(),
    date: null,
    timing: { kind: 'flexible' },
    ...partial,
  };
}

export function createDraft(input: {
  title?: string;
  leadPassengerId: string;
  leadPassengerName: string;
  seatsHeld?: number;
  legs?: TripLeg[];
  by: Actor;
  nowUtc: string;
}): Trip {
  const legs = input.legs && input.legs.length > 0 ? input.legs : [newLeg()];
  return {
    id: nextId('trip'),
    title: input.title?.trim() || 'Untitled trip',
    status: 'draft',
    visibleToScheduling: false,
    leadPassengerId: input.leadPassengerId,
    leadPassengerName: input.leadPassengerName,
    seatsHeld: input.seatsHeld ?? 1,
    legs,
    tail: null,
    createdBy: input.by,
    createdAt: input.nowUtc,
    events: [{ id: nextId('ev'), kind: 'created', at: input.nowUtc, by: input.by }],
  };
}

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type NewEvent = DistributiveOmit<TripEvent, 'id'>;

function append(trip: Trip, event: NewEvent): Trip {
  return { ...trip, events: [...trip.events, { ...event, id: nextId('ev') } as TripEvent] };
}

// ── The itinerary, while it is still the EA's to edit ─────────────────────────────

const editable = (trip: Trip) => trip.status === 'draft';

export function updateLeg(trip: Trip, legId: string, patch: Partial<Omit<TripLeg, 'id'>>): Trip {
  if (!editable(trip)) return trip;
  return { ...trip, legs: trip.legs.map(l => (l.id === legId ? { ...l, ...patch } : l)) };
}

export function addLeg(trip: Trip): Trip {
  if (!editable(trip)) return trip;
  const last = trip.legs[trip.legs.length - 1];
  // The next leg usually starts where the last one ended.
  const from = last ? { ...last.to } : emptyEnd();
  return { ...trip, legs: [...trip.legs, newLeg({ from })] };
}

export function removeLeg(trip: Trip, legId: string): Trip {
  if (!editable(trip) || trip.legs.length <= 1) return trip;
  return { ...trip, legs: trip.legs.filter(l => l.id !== legId) };
}

export function setHeader(
  trip: Trip,
  patch: Partial<Pick<Trip, 'title' | 'leadPassengerId' | 'leadPassengerName' | 'seatsHeld'>>,
): Trip {
  if (!editable(trip)) return trip;
  return { ...trip, ...patch };
}

/**
 * An airport choice on a submitted trip is a real change, so it is an EVENT with a name on it,
 * not a silent edit. On a draft it is just editing.
 */
export function chooseAirport(
  trip: Trip,
  legId: string,
  end: 'from' | 'to',
  airport: string,
  by: Actor,
  nowUtc: string,
): Trip {
  const legs = trip.legs.map(l => (l.id === legId ? { ...l, [end]: { ...l[end], airport } } : l));
  const next = { ...trip, legs };
  return trip.status === 'draft' ? next : append(next, { kind: 'airport-changed', at: nowUtc, by, legId, end, airport });
}

// ── Readiness: what stops "Submit itinerary" ──────────────────────────────────────

export interface SubmitBlocker {
  legId: string | null;
  text: string;
}

export interface ReadinessCheck {
  legId: string | null;
  text: string;
}

export function submitBlockers(trip: Trip): SubmitBlocker[] {
  const out: SubmitBlocker[] = [];
  if (!trip.leadPassengerId) out.push({ legId: null, text: 'No lead passenger' });
  if (trip.legs.length === 0) out.push({ legId: null, text: 'No legs' });
  trip.legs.forEach((leg, i) => {
    const n = i + 1;
    if (!leg.date) out.push({ legId: leg.id, text: `Leg ${n} has no date` });
    if (!leg.from.placeName.trim()) out.push({ legId: leg.id, text: `Leg ${n} has no departure place` });
    if (!leg.to.placeName.trim()) out.push({ legId: leg.id, text: `Leg ${n} has no destination` });
  });
  return out;
}

/** Things the EA should glance at but that do not block — the "check" line. */
export function readinessChecks(trip: Trip): ReadinessCheck[] {
  const out: ReadinessCheck[] = [];
  trip.legs.forEach((leg, i) => {
    const n = i + 1;
    for (const end of ['from', 'to'] as const) {
      const e = leg[end];
      if (!e.placeName.trim()) continue;
      if (e.airport === SCHEDULING_DECIDES) out.push({ legId: leg.id, text: `Leg ${n}: ${e.placeName} — scheduling will pick the airport` });
      else if (!e.airport) out.push({ legId: leg.id, text: `Leg ${n}: ${e.placeName} is not a place we know — scheduling will ask` });
      else out.push({ legId: leg.id, text: `Leg ${n}: ${e.placeName} resolved to ${e.airport}` });
    }
    if (leg.timing.kind === 'flexible') out.push({ legId: leg.id, text: `Leg ${n}: any time that day` });
  });
  return out;
}

export const canSubmit = (trip: Trip): boolean => trip.status === 'draft' && submitBlockers(trip).length === 0;

// ── Lifecycle events ──────────────────────────────────────────────────────────────

/** The EA's explicit act. Nothing is held; scheduling can now see and comment. */
export function shareDraft(trip: Trip, by: Actor, nowUtc: string): Trip {
  if (trip.status !== 'draft' || trip.visibleToScheduling) return trip;
  return append({ ...trip, visibleToScheduling: true }, { kind: 'shared', at: nowUtc, by });
}

export function submitItinerary(trip: Trip, by: Actor, nowUtc: string): Trip {
  if (!canSubmit(trip)) return trip;
  return append(
    { ...trip, status: 'submitted', visibleToScheduling: true },
    { kind: 'submitted', at: nowUtc, by },
  );
}

export function postMessage(trip: Trip, by: Actor, text: string, nowUtc: string): Trip {
  const t = text.trim();
  if (!t) return trip;
  return append(trip, { kind: 'message', at: nowUtc, by, text: t });
}

/** Scheduling's structured ask ("which airport for the Mehoopany plant?"). Lands in the record. */
export function askQuestion(
  trip: Trip,
  by: Actor,
  about: 'airport' | 'date' | 'passengers' | 'other',
  text: string,
  nowUtc: string,
): Trip {
  const t = text.trim();
  if (!t) return trip;
  return append(trip, { kind: 'question', at: nowUtc, by, about, text: t });
}

export function addDocument(trip: Trip, by: Actor, doc: Omit<TripDocument, 'id'>, nowUtc: string): Trip {
  return append(trip, { kind: 'document', at: nowUtc, by, doc: { ...doc, id: nextId('doc') } });
}

/**
 * "The scheduling team cannot hold an aircraft unless there is an itinerary." Refused on a
 * draft — shared or not — and refused for anyone but scheduling.
 */
export function assignTail(trip: Trip, tail: string, by: Actor, nowUtc: string): Trip {
  if (by.role !== 'scheduling') return trip;
  if (trip.status !== 'submitted' && trip.status !== 'confirmed') return trip;
  const t = tail.trim().toUpperCase();
  if (!t) return trip;
  return append({ ...trip, tail: t, status: 'confirmed' }, { kind: 'assigned', at: nowUtc, by, tail: t });
}

export function decline(trip: Trip, by: Actor, reason: string, nowUtc: string): Trip {
  if (by.role !== 'scheduling' || trip.status !== 'submitted') return trip;
  return append({ ...trip, status: 'declined' }, { kind: 'declined', at: nowUtc, by, reason: reason.trim() });
}

// ── Readers ───────────────────────────────────────────────────────────────────────

export const documentsOf = (trip: Trip): TripDocument[] =>
  trip.events.flatMap(e => (e.kind === 'document' ? [e.doc] : []));

/** What scheduling may see: submitted trips, and drafts the EA chose to share. */
export const visibleToScheduling = (trip: Trip): boolean =>
  trip.status !== 'draft' || trip.visibleToScheduling;

/** Plain-text rendering of an event, for display and search. */
export function eventText(e: TripEvent): string {
  switch (e.kind) {
    case 'created': return `Draft created`;
    case 'message': return e.text;
    case 'shared': return `Draft shared with scheduling`;
    case 'submitted': return `Itinerary submitted`;
    case 'document': return `${e.doc.name} added`;
    case 'question': return e.text;
    case 'assigned': return `${e.tail} assigned`;
    case 'airport-changed': return `Airport changed to ${e.airport}`;
    case 'declined': return `Declined: ${e.reason}`;
  }
}

export interface SearchHit {
  trip: Trip;
  event: TripEvent;
}

/** Search the record — one trip or all of them. Matches text, author and event kind words. */
export function searchEvents(trips: Trip[], query: string): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const hits: SearchHit[] = [];
  for (const trip of trips) {
    for (const event of trip.events) {
      const hay = `${eventText(event)} ${event.by.name} ${event.kind} ${trip.title}`.toLowerCase();
      if (hay.includes(q)) hits.push({ trip, event });
    }
  }
  return hits.sort((a, b) => b.event.at.localeCompare(a.event.at));
}

/** First and last leg dates, for the list. */
export function tripSpan(trip: Trip): { start: string | null; end: string | null } {
  const dates = trip.legs.map(l => l.date).filter((d): d is string => !!d).sort();
  return { start: dates[0] ?? null, end: dates[dates.length - 1] ?? null };
}

export function routeLabel(trip: Trip): string {
  const code = (e: LegEnd) => (e.airport && e.airport !== SCHEDULING_DECIDES ? e.airport : e.placeName || '?');
  if (trip.legs.length === 0) return '—';
  const first = trip.legs[0];
  const last = trip.legs[trip.legs.length - 1];
  if (trip.legs.length === 2 && code(first.from) === code(last.to)) return `${code(first.from)} ⇄ ${code(first.to)}`;
  return [code(first.from), ...trip.legs.map(l => code(l.to))].join(' → ');
}
