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

export const MOCK_TRIPS: Trip[] = [
  {
    id: 'trip-001',
    tailNumber: 'N5PG',
    aircraftType: 'G500',
    tripName: 'East Coast Swing',
    tripNumber: 'TRP-2026-0042',
    status: 'active',
    startDate: '2026-05-12T08:00:00Z',
    createdBy: 'Sarah Mitchell',
    createdAt: '2026-05-11T20:00:00Z',
    notes: [
      tripNote('tn-001', 'trip-001', undefined, 'Client prefers Pellegrino over Fiji. Stock extra sparkling.', 'Sarah Mitchell', '2026-05-12T07:30:00Z'),
      tripNote('tn-002', 'trip-001', undefined, 'Crew change at TEB — Mike taking over legs 3-7.', 'Sarah Mitchell', '2026-05-14T09:00:00Z'),
    ],
    legs: [
      {
        id: 'leg-001', tripId: 'trip-001', legNumber: 1,
        origin: 'LUK', destination: 'TEB', date: '2026-05-12', paxCount: 4,
        status: 'completed', groceryListId: 'gl-001',
        usageLog: [
          usageEntry('ue-001', 'leg-001', '1', 4, 'Sarah Mitchell', '2026-05-12T10:30:00Z'),
          usageEntry('ue-002', 'leg-001', '3', 2, 'Sarah Mitchell', '2026-05-12T10:45:00Z'),
          usageEntry('ue-003', 'leg-001', '5', 6, 'Sarah Mitchell', '2026-05-12T11:00:00Z'),
          usageEntry('ue-004', 'leg-001', '10', 2, 'Sarah Mitchell', '2026-05-12T11:15:00Z'),
          usageEntry('ue-005', 'leg-001', '15', 1, 'Sarah Mitchell', '2026-05-12T11:30:00Z'),
        ],
        notes: [
          tripNote('tn-003', 'trip-001', 'leg-001', 'Catering was 20 min late at LUK. Had to rush pre-flight check.', 'Sarah Mitchell', '2026-05-12T08:15:00Z'),
        ],
      },
      {
        id: 'leg-002', tripId: 'trip-001', legNumber: 2,
        origin: 'TEB', destination: 'BOS', date: '2026-05-13', paxCount: 2,
        status: 'completed',
        usageLog: [
          usageEntry('ue-006', 'leg-002', '1', 2, 'Sarah Mitchell', '2026-05-13T14:00:00Z'),
          usageEntry('ue-007', 'leg-002', '5', 3, 'Sarah Mitchell', '2026-05-13T14:20:00Z'),
          usageEntry('ue-008', 'leg-002', '20', 1, 'Sarah Mitchell', '2026-05-13T14:40:00Z'),
        ],
        notes: [],
      },
      {
        id: 'leg-003', tripId: 'trip-001', legNumber: 3,
        origin: 'TEB', destination: 'PBI', date: '2026-05-15', paxCount: 3,
        status: 'active',
        usageLog: [
          usageEntry('ue-009', 'leg-003', '1', 2, 'Mike Johnson', '2026-05-15T09:30:00Z'),
          usageEntry('ue-010', 'leg-003', '5', 2, 'Mike Johnson', '2026-05-15T09:45:00Z'),
        ],
        notes: [],
      },
      { id: 'leg-004', tripId: 'trip-001', legNumber: 4, origin: 'PBI', destination: 'VNY', date: '2026-05-17', paxCount: 3, status: 'upcoming', usageLog: [], notes: [] },
      { id: 'leg-005', tripId: 'trip-001', legNumber: 5, origin: 'VNY', destination: 'SEA', date: '2026-05-18', paxCount: 2, status: 'upcoming', usageLog: [], notes: [] },
      { id: 'leg-006', tripId: 'trip-001', legNumber: 6, origin: 'SEA', destination: 'DEN', date: '2026-05-19', paxCount: 4, status: 'upcoming', usageLog: [], notes: [] },
      { id: 'leg-007', tripId: 'trip-001', legNumber: 7, origin: 'DEN', destination: 'LUK', date: '2026-05-20', paxCount: 2, status: 'upcoming', usageLog: [], notes: [] },
    ],
  },
  {
    id: 'trip-002',
    tailNumber: 'N1PG',
    aircraftType: 'G650',
    tripName: 'West Coast Charter',
    tripNumber: 'TRP-2026-0043',
    status: 'active',
    startDate: '2026-05-14T06:00:00Z',
    createdBy: 'Mike Johnson',
    createdAt: '2026-05-13T18:00:00Z',
    notes: [],
    legs: [
      {
        id: 'leg-008', tripId: 'trip-002', legNumber: 1,
        origin: 'LUK', destination: 'VNY', date: '2026-05-14', paxCount: 6,
        status: 'active',
        usageLog: [
          usageEntry('ue-011', 'leg-008', '1', 6, 'Mike Johnson', '2026-05-14T10:00:00Z'),
          usageEntry('ue-012', 'leg-008', '3', 4, 'Mike Johnson', '2026-05-14T10:15:00Z'),
          usageEntry('ue-013', 'leg-008', '5', 8, 'Mike Johnson', '2026-05-14T10:30:00Z'),
          usageEntry('ue-014', 'leg-008', '10', 3, 'Mike Johnson', '2026-05-14T10:45:00Z'),
        ],
        notes: [
          tripNote('tn-004', 'trip-002', 'leg-008', 'Full charter group — heavy beverage service. Will need restock at VNY.', 'Mike Johnson', '2026-05-14T11:00:00Z'),
        ],
      },
      { id: 'leg-009', tripId: 'trip-002', legNumber: 2, origin: 'VNY', destination: 'SFO', date: '2026-05-16', paxCount: 4, status: 'upcoming', usageLog: [], notes: [] },
      { id: 'leg-010', tripId: 'trip-002', legNumber: 3, origin: 'SFO', destination: 'LUK', date: '2026-05-17', paxCount: 4, status: 'upcoming', usageLog: [], notes: [] },
    ],
  },
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
    legs: [
      { id: 'leg-011', tripId: 'trip-003', legNumber: 1, origin: 'LUK', destination: 'TEB', date: '2026-05-10', paxCount: 3, status: 'completed', usageLog: [usageEntry('ue-015', 'leg-011', '1', 3, 'Sarah Mitchell', '2026-05-10T09:00:00Z'), usageEntry('ue-016', 'leg-011', '5', 4, 'Sarah Mitchell', '2026-05-10T09:15:00Z')], notes: [] },
      { id: 'leg-012', tripId: 'trip-003', legNumber: 2, origin: 'TEB', destination: 'LUK', date: '2026-05-10', paxCount: 3, status: 'completed', usageLog: [usageEntry('ue-017', 'leg-012', '1', 2, 'Sarah Mitchell', '2026-05-10T19:00:00Z'), usageEntry('ue-018', 'leg-012', '10', 1, 'Sarah Mitchell', '2026-05-10T19:20:00Z')], notes: [] },
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
    legs: [
      { id: 'leg-013', tripId: 'trip-004', legNumber: 1, origin: 'LUK', destination: 'OPF', date: '2026-05-08', paxCount: 2, status: 'completed', usageLog: [usageEntry('ue-019', 'leg-013', '1', 2, 'Mike Johnson', '2026-05-08T09:00:00Z'), usageEntry('ue-020', 'leg-013', '5', 2, 'Mike Johnson', '2026-05-08T09:15:00Z')], notes: [] },
      { id: 'leg-014', tripId: 'trip-004', legNumber: 2, origin: 'OPF', destination: 'LUK', date: '2026-05-09', paxCount: 2, status: 'completed', usageLog: [usageEntry('ue-021', 'leg-014', '1', 1, 'Mike Johnson', '2026-05-09T16:00:00Z')], notes: [] },
    ],
  },
];

export const MOCK_GROCERY_LISTS: GroceryList[] = [
  {
    id: 'gl-001',
    tripId: 'trip-001',
    legId: 'leg-001',
    tailNumber: 'N5PG',
    status: 'fulfilled',
    items: [
      { id: 'gli-001', itemId: '1', qtyNeeded: 4, qtyFulfilled: 4 },
      { id: 'gli-002', itemId: '5', qtyNeeded: 6, qtyFulfilled: 6 },
      { id: 'gli-003', itemId: '10', qtyNeeded: 2, qtyFulfilled: 2 },
    ],
    generatedAt: '2026-05-12T13:00:00Z',
    generatedBy: 'Sarah Mitchell',
    notes: 'Restocked at TEB FBO before leg 2.',
  },
];
