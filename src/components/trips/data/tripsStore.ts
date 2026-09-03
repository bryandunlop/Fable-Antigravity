// THIN localStorage wrapper for trip records + the demo seed. No logic: engine/trip.ts owns it.

import { createDraft, newLeg, postMessage, shareDraft, submitItinerary, askQuestion, addDocument, assignTail, setPassengers, setCatering, setCrew, type Trip, type Actor } from '../engine/trip';
import { SCHEDULING_DECIDES } from '../engine/places';

export const TRIPS_KEY = 'trip-records-state';
const VERSION_KEY = 'trip-records-version';
const VERSION = '10';

/** Fired on every write so the scheduling store can re-project the bookings (D110 slice 1). */
export const TRIPS_CHANGED_EVENT = 'trips-changed';

export interface LeadOption { id: string; name: string }
/** Principals the demo EA books for. Names match the booking portal's passenger fixtures. */
export const LEADS: LeadOption[] = [
  { id: 'P-REYES', name: 'A. Reyes' },
  { id: 'P-OSEI', name: 'M. Osei' },
  { id: 'P-LINDQVIST', name: 'J. Lindqvist' },
];

const EA: Actor = { name: 'Dana Whitfield', role: 'ea' };
const SCHED: Actor = { name: 'R. Calloway', role: 'scheduling' };

/** 'YYYY-MM-DD' n days from now (local). The Boston seed sits inside the T-72 window on purpose. */
function daysFromNow(n: number): string {
  const d = new Date(); d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function seedTrips(): Trip[] {
  const seattle = createDraft({
    title: 'Seattle plant visit', leadPassengerId: 'P-REYES', leadPassengerName: 'A. Reyes', seatsHeld: 4, by: EA, nowUtc: '2026-08-25T13:12:00.000Z',
    legs: [
      newLeg({ from: { placeName: 'Cincinnati', placeId: 'pl-cvg', airport: 'KLUK' }, to: { placeName: 'Seattle', placeId: 'pl-sea', airport: 'KBFI' }, date: '2026-10-14', timing: { kind: 'arrive', arriveByLocal: '15:00' } }),
      newLeg({ from: { placeName: 'Seattle', placeId: 'pl-sea', airport: 'KBFI' }, to: { placeName: 'Cincinnati', placeId: 'pl-cvg', airport: 'KLUK' }, date: null, timing: { kind: 'flexible' } }),
    ],
  });

  let board = createDraft({
    title: 'Board week — New York', leadPassengerId: 'P-LINDQVIST', leadPassengerName: 'J. Lindqvist', seatsHeld: 6, by: EA, nowUtc: '2026-08-20T14:00:00.000Z',
    legs: [
      newLeg({ from: { placeName: 'Cincinnati', placeId: 'pl-cvg', airport: 'KLUK' }, to: { placeName: 'New York', placeId: 'pl-nyc', airport: 'KTEB' }, date: '2026-11-09', timing: { kind: 'arrive', arriveByLocal: '17:00' } }),
      newLeg({ from: { placeName: 'New York', placeId: 'pl-nyc', airport: 'KTEB' }, to: { placeName: 'Cincinnati', placeId: 'pl-cvg', airport: 'KLUK' }, date: '2026-11-12', timing: { kind: 'depart', departLocal: '16:00', flexHours: 2 } }),
    ],
  });
  board = shareDraft(board, EA, '2026-08-20T14:05:00.000Z');
  board = postMessage(board, EA, 'Sharing early — the board dates are firm but the agenda is not. Six seats is a ceiling, not a count.', '2026-08-20T14:06:00.000Z');
  board = postMessage(board, SCHED, 'Seen. Nothing held until you submit; the week is blocked on our side for the board anyway.', '2026-08-20T15:31:00.000Z');

  let meh = createDraft({
    title: 'Mehoopany plant — line review', leadPassengerId: 'P-OSEI', leadPassengerName: 'M. Osei', seatsHeld: 3, by: EA, nowUtc: '2026-08-28T09:10:00.000Z',
    legs: [
      newLeg({ from: { placeName: 'Cincinnati', placeId: 'pl-cvg', airport: 'KLUK' }, to: { placeName: 'Mehoopany plant', placeId: 'pl-meh', airport: SCHEDULING_DECIDES }, date: '2026-09-22', timing: { kind: 'arrive', arriveByLocal: '09:30' } }),
      newLeg({ from: { placeName: 'Mehoopany plant', placeId: 'pl-meh', airport: SCHEDULING_DECIDES }, to: { placeName: 'Cincinnati', placeId: 'pl-cvg', airport: 'KLUK' }, date: '2026-09-22', timing: { kind: 'depart', departLocal: '17:30', flexHours: 1 } }),
    ],
  });
  meh = submitItinerary(meh, EA, '2026-08-28T09:40:00.000Z');
  meh = askQuestion(meh, SCHED, 'airport', 'Wilkes-Barre/Scranton (KAVP) as usual for the plant, or is the team meeting at the Tunkhannock office?', '2026-08-28T10:02:00.000Z');
  meh = postMessage(meh, EA, 'The plant. KAVP is fine.', '2026-08-28T10:15:00.000Z');
  meh = addDocument(meh, EA, { name: 'line-review-agenda.pdf', sizeBytes: 84_212, tag: { kind: 'leg', legId: meh.legs[0].id }, visibleTo: ['ea', 'scheduling'] }, '2026-08-29T16:20:00.000Z');

  let bos = createDraft({
    title: 'Boston — Gillette day', leadPassengerId: 'P-REYES', leadPassengerName: 'A. Reyes', seatsHeld: 2, by: EA, nowUtc: '2026-08-12T11:00:00.000Z',
    legs: [
      newLeg({ from: { placeName: 'Cincinnati', placeId: 'pl-cvg', airport: 'KLUK' }, to: { placeName: 'Boston', placeId: 'pl-bos', airport: 'KBED' }, date: daysFromNow(2), timing: { kind: 'depart', departLocal: '07:30', flexHours: 0 } }),
      newLeg({ from: { placeName: 'Boston', placeId: 'pl-bos', airport: 'KBED' }, to: { placeName: 'Cincinnati', placeId: 'pl-cvg', airport: 'KLUK' }, date: daysFromNow(2), timing: { kind: 'depart', departLocal: '18:00', flexHours: 0 } }),
    ],
  });
  bos = submitItinerary(bos, EA, '2026-08-12T11:20:00.000Z');
  bos = assignTail(bos, 'N6PG', SCHED, '2026-08-13T08:45:00.000Z', { free: true, reason: null });
  bos = setPassengers(bos, ['A. Reyes', 'S. Reyes'], EA, '2026-08-20T10:00:00.000Z');
  bos = setCatering(bos, bos.legs[0].id, 'Light breakfast for 2, no shellfish', EA, '2026-08-21T09:00:00.000Z');
  bos = setCrew(bos, { pic: 'Capt. John Smith', sic: 'FO Emily Chen', fa: 'Lena Nguyen' }, SCHED, '2026-08-22T08:00:00.000Z');
  bos = postMessage(bos, SCHED, 'N6PG confirmed. Names by the 14th please.', '2026-08-13T08:46:00.000Z');

  // One-way pair on N5PG (Bryan, 2026-09-01): one lead out to Teterboro, another back from Boston two
  // days later. The aircraft ferries KTEB → KBED empty in between — the leg that reads 'potentially open'.
  let out = createDraft({
    title: 'Teterboro — one way out', leadPassengerId: 'P-OSEI', leadPassengerName: 'M. Osei', seatsHeld: 2, by: EA, nowUtc: '2026-08-26T10:00:00.000Z',
    legs: [newLeg({ from: { placeName: 'Cincinnati', placeId: 'pl-cvg', airport: 'KLUK' }, to: { placeName: 'New York', placeId: 'pl-nyc', airport: 'KTEB' }, date: daysFromNow(5), timing: { kind: 'depart', departLocal: '08:00', flexHours: 0 } })],
  });
  out = submitItinerary(out, EA, '2026-08-26T10:05:00.000Z');
  out = assignTail(out, 'N5PG', SCHED, '2026-08-26T14:00:00.000Z', { free: true, reason: null });
  out = setCrew(out, { pic: 'Capt. Ray Okafor', sic: 'FO Marcus Bell', fa: null }, SCHED, '2026-08-27T08:00:00.000Z');
  out = setPassengers(out, ['M. Osei', 'K. Tanaka'], EA, '2026-08-27T09:00:00.000Z');
  let back = createDraft({
    title: 'Boston — one way home', leadPassengerId: 'P-LINDQVIST', leadPassengerName: 'J. Lindqvist', seatsHeld: 3, by: EA, nowUtc: '2026-08-27T09:00:00.000Z',
    legs: [newLeg({ from: { placeName: 'Boston', placeId: 'pl-bos', airport: 'KBED' }, to: { placeName: 'Cincinnati', placeId: 'pl-cvg', airport: 'KLUK' }, date: daysFromNow(7), timing: { kind: 'depart', departLocal: '17:00', flexHours: 1 } })],
  });
  back = submitItinerary(back, EA, '2026-08-27T09:10:00.000Z');
  back = assignTail(back, 'N5PG', SCHED, '2026-08-27T15:00:00.000Z', { free: true, reason: null });
  back = setCrew(back, { pic: 'Capt. Ray Okafor', sic: 'FO Marcus Bell', fa: null }, SCHED, '2026-08-28T08:00:00.000Z');
  back = postMessage(back, SCHED, 'N5PG will already be at Teterboro from M. Osei’s trip; we ferry it up to Hanscom that afternoon. If anyone needs KTEB → KBED that day, the leg is empty.', '2026-08-27T15:02:00.000Z');

  // A pickup: the aircraft positions empty to JFK, the passenger rides home (Bryan, 2026-09-01).
  let pickup = createDraft({
    title: 'JFK pickup', leadPassengerId: 'P-REYES', leadPassengerName: 'A. Reyes', seatsHeld: 2, by: EA, nowUtc: '2026-08-28T12:00:00.000Z',
    legs: [
      newLeg({ from: { placeName: 'Cincinnati', placeId: 'pl-cvg', airport: 'KLUK' }, to: { placeName: 'New York', placeId: 'pl-nyc', airport: 'KJFK' }, date: daysFromNow(16), timing: { kind: 'depart', departLocal: '07:30', flexHours: 0 }, positioning: true }),
      newLeg({ from: { placeName: 'New York', placeId: 'pl-nyc', airport: 'KJFK' }, to: { placeName: 'Cincinnati', placeId: 'pl-cvg', airport: 'KLUK' }, date: daysFromNow(16), timing: { kind: 'depart', departLocal: '12:30', flexHours: 1 } }),
    ],
  });
  pickup = submitItinerary(pickup, EA, '2026-08-28T12:05:00.000Z');
  pickup = assignTail(pickup, 'N5PG', SCHED, '2026-08-28T15:00:00.000Z', { free: true, reason: null });

  // London, with a document gate on it (D109 slice 3). S. Reyes's passport lapses before the trip,
  // so the sheet refuses to freeze until scheduling overrides it with a reason. The dates are far
  // enough out that the T-72 clock is not already past them.
  let london = createDraft({
    title: 'London — Weybridge site', leadPassengerId: 'P-REYES', leadPassengerName: 'A. Reyes', seatsHeld: 3, by: EA, nowUtc: '2026-08-29T09:00:00.000Z',
    legs: [
      newLeg({ from: { placeName: 'Cincinnati', placeId: 'pl-cvg', airport: 'KLUK' }, to: { placeName: 'London', placeId: 'pl-lon', airport: 'EGLF' }, date: daysFromNow(44), timing: { kind: 'depart', departLocal: '18:30', flexHours: 0 } }),
      newLeg({ from: { placeName: 'London', placeId: 'pl-lon', airport: 'EGLF' }, to: { placeName: 'Cincinnati', placeId: 'pl-cvg', airport: 'KLUK' }, date: daysFromNow(47), timing: { kind: 'depart', departLocal: '11:00', flexHours: 0 } }),
    ],
  });
  london = submitItinerary(london, EA, '2026-08-29T09:20:00.000Z');
  london = assignTail(london, 'N1PG', SCHED, '2026-08-30T10:00:00.000Z', { free: true, reason: null });
  london = setPassengers(london, ['A. Reyes', 'S. Reyes'], EA, '2026-08-30T11:00:00.000Z');
  london = postMessage(london, SCHED, 'N1PG held. Passports and forms before the 21-day cutoff please.', '2026-08-30T10:05:00.000Z');

  // Three bookings that used to be command-center fixtures (D110 slice 1: the booking is the only trip).
  // Between them they exercise the per-airport checklist (KLGA ARO, KBOS PPR), the 7-pax special
  // handling item and the DASSP checklist, now hanging off real bookings on the board.
  let northeast = createDraft({
    title: 'Northeast round — LGA and Boston', leadPassengerId: 'P-LINDQVIST', leadPassengerName: 'J. Lindqvist', seatsHeld: 4, by: EA, nowUtc: '2026-08-30T09:00:00.000Z',
    legs: [
      newLeg({ from: { placeName: 'Cincinnati', placeId: 'pl-cvg', airport: 'KLUK' }, to: { placeName: 'New York', placeId: 'pl-nyc', airport: 'KLGA' }, date: daysFromNow(3), timing: { kind: 'depart', departLocal: '07:00', flexHours: 0 } }),
      newLeg({ from: { placeName: 'New York', placeId: 'pl-nyc', airport: 'KLGA' }, to: { placeName: 'Boston', placeId: 'pl-bos', airport: 'KBOS' }, date: daysFromNow(3), timing: { kind: 'depart', departLocal: '12:00', flexHours: 0 } }),
      newLeg({ from: { placeName: 'Boston', placeId: 'pl-bos', airport: 'KBOS' }, to: { placeName: 'Cincinnati', placeId: 'pl-cvg', airport: 'KLUK' }, date: daysFromNow(3), timing: { kind: 'depart', departLocal: '16:00', flexHours: 1 } }),
    ],
  });
  northeast = submitItinerary(northeast, EA, '2026-08-30T09:10:00.000Z');
  northeast = assignTail(northeast, 'N2PG', SCHED, '2026-08-30T11:00:00.000Z', { free: true, reason: null });
  northeast = setPassengers(northeast, ['J. Lindqvist', 'K. Tanaka', 'M. Osei', 'A. Reyes'], EA, '2026-08-31T09:00:00.000Z');
  northeast = setCrew(northeast, { pic: 'Capt. John Smith', sic: 'FO Emily Chen', fa: 'Lena Nguyen' }, SCHED, '2026-08-31T10:00:00.000Z');

  let vineyard = createDraft({
    title: "Martha's Vineyard — seven aboard", leadPassengerId: 'P-OSEI', leadPassengerName: 'M. Osei', seatsHeld: 7, by: EA, nowUtc: '2026-08-30T13:00:00.000Z',
    legs: [
      newLeg({ from: { placeName: 'Cincinnati', placeId: 'pl-cvg', airport: 'KLUK' }, to: { placeName: "Martha's Vineyard", placeId: 'pl-mvy', airport: 'KMVY' }, date: daysFromNow(4), timing: { kind: 'depart', departLocal: '08:30', flexHours: 0 } }),
      newLeg({ from: { placeName: "Martha's Vineyard", placeId: 'pl-mvy', airport: 'KMVY' }, to: { placeName: 'Cincinnati', placeId: 'pl-cvg', airport: 'KLUK' }, date: daysFromNow(4), timing: { kind: 'depart', departLocal: '17:30', flexHours: 1 } }),
    ],
  });
  vineyard = submitItinerary(vineyard, EA, '2026-08-30T13:10:00.000Z');
  vineyard = assignTail(vineyard, 'N2PG', SCHED, '2026-08-30T15:00:00.000Z', { free: true, reason: null });
  vineyard = setPassengers(vineyard, ['M. Osei', 'K. Tanaka', 'A. Reyes', 'S. Reyes', 'J. Lindqvist', 'P. Hartley', 'D. Whitfield'], EA, '2026-08-31T11:00:00.000Z');

  let dca = createDraft({
    title: 'Washington — DCA day', leadPassengerId: 'P-OSEI', leadPassengerName: 'M. Osei', seatsHeld: 3, by: EA, nowUtc: '2026-08-31T08:00:00.000Z',
    legs: [
      newLeg({ from: { placeName: 'Cincinnati', placeId: 'pl-cvg', airport: 'KLUK' }, to: { placeName: 'Washington', placeId: 'pl-dca', airport: 'KDCA' }, date: daysFromNow(6), timing: { kind: 'depart', departLocal: '07:45', flexHours: 0 } }),
      newLeg({ from: { placeName: 'Washington', placeId: 'pl-dca', airport: 'KDCA' }, to: { placeName: 'Cincinnati', placeId: 'pl-cvg', airport: 'KLUK' }, date: daysFromNow(6), timing: { kind: 'depart', departLocal: '18:30', flexHours: 0 } }),
    ],
  });
  dca = submitItinerary(dca, EA, '2026-08-31T08:10:00.000Z');
  dca = assignTail(dca, 'N6PG', SCHED, '2026-08-31T09:00:00.000Z', { free: true, reason: null });
  dca = setPassengers(dca, ['M. Osei', 'K. Tanaka', 'P. Hartley'], EA, '2026-08-31T12:00:00.000Z');

  return [seattle, board, meh, bos, out, back, pickup, london, northeast, vineyard, dca];
}

/** Rows written before D106 lack the T-72 fields; read them as empty rather than crashing. */
function withDefaults(t: Trip): Trip {
  return {
    ...t,
    passengerNames: t.passengerNames ?? [t.leadPassengerName],
    crew: t.crew ?? null,
    cutoffOverrides: t.cutoffOverrides ?? [],
    frozenSheets: t.frozenSheets ?? [],
    emailDraft: t.emailDraft ?? null,
    board: t.board ?? null,
    changeRequests: t.changeRequests ?? [],
  };
}

export function loadTrips(): Trip[] {
  if (typeof localStorage === 'undefined') return seedTrips();
  try {
    if (localStorage.getItem(VERSION_KEY) !== VERSION) return seedTrips();
    const raw = localStorage.getItem(TRIPS_KEY);
    return raw ? (JSON.parse(raw) as Trip[]).map(withDefaults) : seedTrips();
  } catch {
    return seedTrips();
  }
}

export function saveTrips(trips: Trip[]): void {
  if (typeof localStorage === 'undefined') return;
  const next = JSON.stringify(trips);
  // Only a real change is a change. The availability read re-links the register on every render
  // and writes the same trips back; announcing that spun the scheduling store into a resync →
  // bump → re-read → write loop that starved the router (found 2026-09-03 in slice 2).
  const changed = localStorage.getItem(TRIPS_KEY) !== next || localStorage.getItem(VERSION_KEY) !== VERSION;
  localStorage.setItem(TRIPS_KEY, next);
  localStorage.setItem(VERSION_KEY, VERSION);
  if (changed && typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(TRIPS_CHANGED_EVENT));
}
