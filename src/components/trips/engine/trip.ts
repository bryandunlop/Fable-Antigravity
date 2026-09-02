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

export type TripStatus = 'draft' | 'submitted' | 'confirmed' | 'declined' | 'cancelled';

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
  /** Catering note for this leg, when loaded. Read by the trip sheet and the email (D106). */
  catering?: string;
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
  | { id: string; kind: 'declined'; at: string; by: Actor; reason: string; category?: DenialCategory }
  | { id: string; kind: 'bumped'; at: string; by: Actor; reason: string; category: DenialCategory; tail: string | null }
  | { id: string; kind: 'cancelled'; at: string; by: Actor; reason: string }
  | { id: string; kind: 'board-set'; at: string; by: Actor; window: BoardWindow | null }
  | { id: string; kind: 'change-requested'; at: string; by: Actor; change: ChangeRequest }
  | { id: string; kind: 'change-decided'; at: string; by: Actor; changeId: string; approved: boolean; note: string }
  | { id: string; kind: 'passengers-updated'; at: string; by: Actor; names: string[] }
  | { id: string; kind: 'catering-set'; at: string; by: Actor; legId: string; text: string }
  | { id: string; kind: 'crew-set'; at: string; by: Actor; crew: TripCrew }
  | { id: string; kind: 'cutoff-moved'; at: string; by: Actor; cutoff: string; dueUtc: string; reason: string }
  | { id: string; kind: 'sheet-frozen'; at: string; by: Actor; version: number }
  | { id: string; kind: 'sent-to-crew'; at: string; by: Actor; version: number }
  | { id: string; kind: 'email-drafted'; at: string; by: Actor; version: number; recipients: string[] }
  | { id: string; kind: 'email-sent'; at: string; by: Actor; recipients: string[]; auto: boolean };

/**
 * A change the EA asks for after the itinerary is submitted (Bryan, 2026-09-01: "the admins should
 * also be able to request to modify times, dates, etc after the trip is approved, but it needs to
 * be approved by scheduling"). The itinerary does not move until scheduling says yes.
 */
export interface ChangeRequest {
  id: string;
  legId: string;
  /** Only the fields the EA is allowed to ask about. */
  patch: Partial<Pick<TripLeg, 'date' | 'timing'>> & { from?: LegEnd; to?: LegEnd };
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  decidedBy?: string;
  decidedAt?: string;
  note?: string;
}

/** D107 — why a request was refused or an aircraft taken away. Counted by the metrics page. */
export type DenialCategory = 'no-crew' | 'maintenance' | 'senior-conflict' | 'not-a-fit' | 'other';

/** D107 — a board trip's window; the fleet-wide block follows it. */
export interface BoardWindow {
  fromDate: string;
  toDate: string;
  tailsNeeded: number;
}

/** Who is flying it. Set by scheduling; snapshotted into the frozen sheet. */
export interface TripCrew {
  pic: string;
  sic: string;
  fa: string | null;
}

/** A per-trip move of one cutoff (D106). The defaults live in settings; this is the exception. */
export interface CutoffOverride {
  cutoff: string;
  dueUtc: string;
  reason: string;
  by: Actor;
  at: string;
}

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
  /** Names known so far, lead included. Seats not yet named = seatsHeld - names.length. */
  passengerNames: string[];
  crew: TripCrew | null;
  cutoffOverrides: CutoffOverride[];
  /** Frozen T-72 sheets, oldest first; version = index + 1. Opaque here: engine/tripSheet.ts owns the shape. */
  frozenSheets: unknown[];
  /** The passenger email draft made at freeze; engine/briefingEmail.ts owns the shape. */
  emailDraft: unknown | null;
  /** Set when this is a board trip: its window blocks the fleet (engine/board.ts). */
  board: BoardWindow | null;
  changeRequests: ChangeRequest[];
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
    passengerNames: [input.leadPassengerName],
    crew: null,
    cutoffOverrides: [],
    frozenSheets: [],
    emailDraft: null,
    board: null,
    changeRequests: [],
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

export function decline(trip: Trip, by: Actor, reason: string, nowUtc: string, category: DenialCategory = 'other'): Trip {
  if (by.role !== 'scheduling' || trip.status !== 'submitted') return trip;
  return append({ ...trip, status: 'declined' }, { kind: 'declined', at: nowUtc, by, reason: reason.trim(), category });
}

/**
 * A bump: a confirmed trip loses its aircraft to something senior. It goes back to the queue as
 * submitted, tail cleared, and the event carries the category so the metrics can count it.
 */
export function bumpTrip(trip: Trip, by: Actor, category: DenialCategory, reason: string, nowUtc: string): Trip {
  if (by.role !== 'scheduling' || trip.status !== 'confirmed') return trip;
  return append({ ...trip, status: 'submitted', tail: null }, { kind: 'bumped', at: nowUtc, by, reason: reason.trim(), category, tail: trip.tail });
}

/** The EA withdraws. Allowed on anything not already declined or cancelled. */
export function cancelTrip(trip: Trip, by: Actor, reason: string, nowUtc: string): Trip {
  if (by.role !== 'ea' || trip.status === 'declined' || trip.status === 'cancelled') return trip;
  return append({ ...trip, status: 'cancelled' }, { kind: 'cancelled', at: nowUtc, by, reason: reason.trim() });
}

/** Mark (or unmark) a board trip and its window. Draft-only for the window; scheduling may change tailsNeeded later. */
export function setBoard(trip: Trip, window: BoardWindow | null, by: Actor, nowUtc: string): Trip {
  if (trip.status === 'declined' || trip.status === 'cancelled') return trip;
  if (trip.status !== 'draft' && by.role !== 'scheduling') return trip;
  return append({ ...trip, board: window }, { kind: 'board-set', at: nowUtc, by, window });
}

/** Names arrive over months. Allowed on a draft or a submitted/confirmed trip — never after decline. */
export function setPassengers(trip: Trip, names: string[], by: Actor, nowUtc: string): Trip {
  if (trip.status === 'declined') return trip;
  const clean = Array.from(new Set(names.map(n => n.trim()).filter(Boolean)));
  if (!clean.includes(trip.leadPassengerName)) clean.unshift(trip.leadPassengerName);
  return append({ ...trip, passengerNames: clean }, { kind: 'passengers-updated', at: nowUtc, by, names: clean });
}

export function setCatering(trip: Trip, legId: string, text: string, by: Actor, nowUtc: string): Trip {
  if (trip.status === 'declined') return trip;
  const legs = trip.legs.map(l => (l.id === legId ? { ...l, catering: text.trim() || undefined } : l));
  return append({ ...trip, legs }, { kind: 'catering-set', at: nowUtc, by, legId, text: text.trim() });
}

/** Scheduling names the crew. Refused before a tail is assigned — no aircraft, no crew. */
export function setCrew(trip: Trip, crew: TripCrew, by: Actor, nowUtc: string): Trip {
  if (by.role !== 'scheduling' || !trip.tail) return trip;
  return append({ ...trip, crew }, { kind: 'crew-set', at: nowUtc, by, crew });
}

/** Append-only record of a cutoff move; engine/cutoffs.ts decides what it means. */
export function recordCutoffMove(trip: Trip, cutoff: string, dueUtc: string, reason: string, by: Actor, nowUtc: string): Trip {
  const r = reason.trim();
  if (by.role !== 'scheduling' || !r) return trip;
  const override: CutoffOverride = { cutoff, dueUtc, reason: r, by, at: nowUtc };
  return append({ ...trip, cutoffOverrides: [...trip.cutoffOverrides, override] }, { kind: 'cutoff-moved', at: nowUtc, by, cutoff, dueUtc, reason: r });
}

// ── Changes after submission (scheduling must approve) ────────────────────────────────

/** The EA asks; nothing moves yet. One pending request per leg at a time. */
export function requestChange(trip: Trip, legId: string, patch: ChangeRequest['patch'], reason: string, by: Actor, nowUtc: string): Trip {
  if (by.role !== 'ea' || (trip.status !== 'submitted' && trip.status !== 'confirmed')) return trip;
  if (!trip.legs.some(l => l.id === legId)) return trip;
  if (Object.keys(patch).length === 0) return trip;
  if (trip.changeRequests.some(c => c.legId === legId && c.status === 'pending')) return trip;
  const change: ChangeRequest = { id: nextId('chg'), legId, patch, reason: reason.trim(), status: 'pending' };
  return append({ ...trip, changeRequests: [...trip.changeRequests, change] }, { kind: 'change-requested', at: nowUtc, by, change });
}

/** Scheduling decides. Approving applies the patch to the leg; rejecting leaves the itinerary alone. */
export function decideChange(trip: Trip, changeId: string, approved: boolean, note: string, by: Actor, nowUtc: string): Trip {
  if (by.role !== 'scheduling') return trip;
  const change = trip.changeRequests.find(c => c.id === changeId && c.status === 'pending');
  if (!change) return trip;
  const legs = approved ? trip.legs.map(l => (l.id === change.legId ? { ...l, ...change.patch } : l)) : trip.legs;
  const changeRequests = trip.changeRequests.map(c => (c.id === changeId ? { ...c, status: approved ? 'approved' as const : 'rejected' as const, decidedBy: by.name, decidedAt: nowUtc, note: note.trim() } : c));
  return append({ ...trip, legs, changeRequests }, { kind: 'change-decided', at: nowUtc, by, changeId, approved, note: note.trim() });
}

export const pendingChanges = (trip: Trip): ChangeRequest[] => trip.changeRequests.filter(c => c.status === 'pending');

/**
 * How free the EA is with the passenger list. Free while far out; once inside the names cutoff the
 * list needs scheduling's approval — and international trips hit that wall earlier (documents, APIS).
 * The hours come from the cutoff defaults so the same number governs both.
 */
export function passengerEditPolicy(hoursToDeparture: number | null, international: boolean, namesDomesticHours: number, namesInternationalHours: number): 'free' | 'approval' | 'locked' {
  if (hoursToDeparture === null) return 'free';
  if (hoursToDeparture <= 0) return 'locked';
  const wall = international ? namesInternationalHours : namesDomesticHours;
  return hoursToDeparture > wall ? 'free' : 'approval';
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
    case 'passengers-updated': return `Passengers: ${e.names.join(', ')}`;
    case 'catering-set': return e.text ? `Catering set: ${e.text}` : 'Catering cleared';
    case 'crew-set': return `Crew: ${e.crew.pic}, ${e.crew.sic}${e.crew.fa ? `, ${e.crew.fa}` : ''}`;
    case 'cutoff-moved': return `${e.cutoff} cutoff moved to ${e.dueUtc.slice(0, 10)} — ${e.reason}`;
    case 'sheet-frozen': return `Trip sheet frozen · v${e.version}`;
    case 'sent-to-crew': return `Trip sheet v${e.version} sent to crew`;
    case 'email-drafted': return `Passenger email drafted for ${e.recipients.length} ${e.recipients.length === 1 ? 'person' : 'people'}`;
    case 'email-sent': return `${e.auto ? 'Passenger email auto-sent (unreviewed)' : 'Passenger email sent'} to ${e.recipients.join(', ')}`;
    case 'bumped': return `Bumped off ${e.tail ?? 'the aircraft'} — ${e.category}${e.reason ? `: ${e.reason}` : ''}`;
    case 'cancelled': return `Cancelled by the requester${e.reason ? `: ${e.reason}` : ''}`;
    case 'board-set': return e.window ? `Board trip · ${e.window.fromDate} to ${e.window.toDate} · ${e.window.tailsNeeded} aircraft` : 'No longer a board trip';
    case 'change-requested': return `Change requested on a leg${e.change.reason ? `: ${e.change.reason}` : ''}`;
    case 'change-decided': return `${e.approved ? 'Change approved' : 'Change declined'}${e.note ? `: ${e.note}` : ''}`;
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
