import type { Trip, GroceryList, TripNote, UsageLogEntry } from './types';

function usageEntry(
  id: string,
  legId: string,
  itemId: string,
  qtyUsed: number,
  loggedBy: string,
  loggedAt: string,
): UsageLogEntry {
  return { id, legId, itemId, qtyUsed, loggedBy, loggedAt };
}

function tripNote(
  id: string,
  tripId: string,
  legId: string | undefined,
  text: string,
  author: string,
  createdAt: string,
): TripNote {
  return { id, tripId, legId, text, author, createdAt };
}

// All trips are completed history. No active trips — each aircraft is parked,
// ready for a flight attendant to arrive and start a fresh pre-flight inspection.
export const MOCK_TRIPS: Trip[] = [
  {
    id: 'trip-003',
    tailNumber: 'N2PG',
    aircraftType: 'G650',
    tripName: 'NYC Day Trip',
    tripNumber: 'TRP-2026-0039',
    status: 'completed',
    startDate: '2026-05-10T07:00:00Z',
    endDate: '2026-05-10T21:00:00Z',
    createdBy: 'Sarah Mitchell',
    createdAt: '2026-05-09T20:00:00Z',
    notes: [],
    loadItems: [],
    returnItems: [],
    legs: [
      { id: 'leg-011', tripId: 'trip-003', legNumber: 1, origin: 'LUK', destination: 'TEB', date: '2026-05-10', paxCount: 3, status: 'completed', phase: 'complete', usageLog: [usageEntry('ue-015', 'leg-011', '1', 3, 'Sarah Mitchell', '2026-05-10T09:00:00Z'), usageEntry('ue-016', 'leg-011', '5', 4, 'Sarah Mitchell', '2026-05-10T09:15:00Z')], notes: [] },
      { id: 'leg-012', tripId: 'trip-003', legNumber: 2, origin: 'TEB', destination: 'LUK', date: '2026-05-10', paxCount: 3, status: 'completed', phase: 'complete', usageLog: [usageEntry('ue-017', 'leg-012', '1', 2, 'Sarah Mitchell', '2026-05-10T19:00:00Z'), usageEntry('ue-018', 'leg-012', '10', 1, 'Sarah Mitchell', '2026-05-10T19:20:00Z')], notes: [] },
    ],
  },
  {
    id: 'trip-004',
    tailNumber: 'N6PG',
    aircraftType: 'G500',
    tripName: 'Miami Overnighter',
    tripNumber: 'TRP-2026-0040',
    status: 'completed',
    startDate: '2026-05-08T06:00:00Z',
    endDate: '2026-05-09T18:00:00Z',
    createdBy: 'Mike Johnson',
    createdAt: '2026-05-07T20:00:00Z',
    notes: [
      tripNote('tn-005', 'trip-004', undefined, 'Smooth trip. No issues.', 'Mike Johnson', '2026-05-09T18:30:00Z'),
    ],
    loadItems: [],
    returnItems: [],
    legs: [
      { id: 'leg-013', tripId: 'trip-004', legNumber: 1, origin: 'LUK', destination: 'OPF', date: '2026-05-08', paxCount: 2, status: 'completed', phase: 'complete', usageLog: [usageEntry('ue-019', 'leg-013', '1', 2, 'Mike Johnson', '2026-05-08T09:00:00Z'), usageEntry('ue-020', 'leg-013', '5', 2, 'Mike Johnson', '2026-05-08T09:15:00Z')], notes: [] },
      { id: 'leg-014', tripId: 'trip-004', legNumber: 2, origin: 'OPF', destination: 'LUK', date: '2026-05-09', paxCount: 2, status: 'completed', phase: 'complete', usageLog: [usageEntry('ue-021', 'leg-014', '1', 1, 'Mike Johnson', '2026-05-09T16:00:00Z')], notes: [] },
    ],
  },
];

// No grocery lists outstanding — all completed trips fulfilled their lists on the road.
export const MOCK_GROCERY_LISTS: GroceryList[] = [];
