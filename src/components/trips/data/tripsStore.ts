// THIN localStorage wrapper for trip records + the demo seed. No logic: engine/trip.ts owns it.

import { createDraft, newLeg, postMessage, shareDraft, submitItinerary, askQuestion, addDocument, assignTail, type Trip, type Actor } from '../engine/trip';
import { SCHEDULING_DECIDES } from '../engine/places';

export const TRIPS_KEY = 'trip-records-state';
const VERSION_KEY = 'trip-records-version';
const VERSION = '2';

export interface LeadOption { id: string; name: string }
/** Principals the demo EA books for. Names match the booking portal's passenger fixtures. */
export const LEADS: LeadOption[] = [
  { id: 'P-REYES', name: 'A. Reyes' },
  { id: 'P-OSEI', name: 'M. Osei' },
  { id: 'P-LINDQVIST', name: 'J. Lindqvist' },
];

const EA: Actor = { name: 'Dana Whitfield', role: 'ea' };
const SCHED: Actor = { name: 'R. Calloway', role: 'scheduling' };

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
      newLeg({ from: { placeName: 'Cincinnati', placeId: 'pl-cvg', airport: 'KLUK' }, to: { placeName: 'Boston', placeId: 'pl-bos', airport: 'KBED' }, date: '2026-09-17', timing: { kind: 'arrive', arriveByLocal: '10:00' } }),
      newLeg({ from: { placeName: 'Boston', placeId: 'pl-bos', airport: 'KBED' }, to: { placeName: 'Cincinnati', placeId: 'pl-cvg', airport: 'KLUK' }, date: '2026-09-17', timing: { kind: 'depart', departLocal: '18:00', flexHours: 0 } }),
    ],
  });
  bos = submitItinerary(bos, EA, '2026-08-12T11:20:00.000Z');
  bos = assignTail(bos, 'N6PG', SCHED, '2026-08-13T08:45:00.000Z');
  bos = postMessage(bos, SCHED, 'N6PG confirmed. Names by the 14th please.', '2026-08-13T08:46:00.000Z');

  return [seattle, board, meh, bos];
}

export function loadTrips(): Trip[] {
  if (typeof localStorage === 'undefined') return seedTrips();
  try {
    if (localStorage.getItem(VERSION_KEY) !== VERSION) return seedTrips();
    const raw = localStorage.getItem(TRIPS_KEY);
    return raw ? (JSON.parse(raw) as Trip[]) : seedTrips();
  } catch {
    return seedTrips();
  }
}

export function saveTrips(trips: Trip[]): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(TRIPS_KEY, JSON.stringify(trips));
  localStorage.setItem(VERSION_KEY, VERSION);
}
