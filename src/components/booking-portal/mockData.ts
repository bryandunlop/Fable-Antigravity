// Booking portal demo fixtures. All people and tails are fictional; airports
// are real for plausibility. Dates are generated relative to "now" so the demo
// calendar always shows a live-looking week.

import type { Flight, Passenger, PortalState, TripRequest, Watch } from './types';

function isoDate(daysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return d.toISOString().slice(0, 10);
}

function isoAt(daysFromToday: number, time: string): string {
  return `${isoDate(daysFromToday)}T${time}:00Z`;
}

export const EA_NAME = 'Dana Whitfield';
export const SCHEDULER_NAME = 'R. Calloway';

const passengers: Passenger[] = [
  {
    id: 'P-REYES',
    name: 'A. Reyes',
    kind: 'principal',
    eaLevel: 'full',
    hasFlown: true,
    nextTravelStart: isoDate(14),
    nextTravelEnd: isoDate(16),
    formStatus: 'resubmit',
    formNote: 'Emergency-contact section is blank — resubmit with it filled.',
    prefs: 'Window seat · no shellfish · car at destination by default',
    docs: [
      { id: 'D1', label: 'Passport — USA', numberMasked: '••• 4821', expires: '2031-03-15' },
      { id: 'D2', label: 'Passport — IRL', numberMasked: '••• 0937', expires: isoDate(120) },
      { id: 'D3', label: 'Visa — CHN (USA passport)', numberMasked: '••• 1178', expires: isoDate(8) },
    ],
  },
  {
    id: 'P-OSEI',
    name: 'M. Osei',
    kind: 'principal',
    eaLevel: 'book',
    hasFlown: true,
    nextTravelStart: isoDate(3),
    nextTravelEnd: isoDate(3),
    formStatus: 'approved',
    prefs: 'Aisle seat · sparkling water on board',
    docs: [
      { id: 'D4', label: 'Passport — USA', numberMasked: '••• 2210', expires: '2033-06-30' },
    ],
  },
  {
    id: 'P-LINDQVIST',
    name: 'J. Lindqvist',
    kind: 'principal',
    eaLevel: 'view',
    hasFlown: true,
    formStatus: 'approved',
    docs: [
      { id: 'D5', label: 'Passport — SWE', numberMasked: '••• 8853', expires: '2030-01-12' },
    ],
  },
  {
    id: 'P-SREYES',
    name: 'S. Reyes',
    kind: 'guest',
    hasFlown: false,
    docs: [],
  },
  {
    id: 'P-TANAKA',
    name: 'K. Tanaka',
    kind: 'staff',
    hasFlown: true,
    formStatus: 'approved',
    docs: [
      { id: 'D6', label: 'Passport — USA', numberMasked: '••• 6644', expires: '2029-09-01' },
    ],
  },
];

const flights: Flight[] = [
  {
    id: 'F-1',
    date: isoDate(1),
    from: 'KCVG',
    to: 'KTEB',
    depart: '08:00',
    arrive: '09:45',
    aircraft: 'G650ER',
    seatsOpen: 2,
    ownPrincipalIds: ['P-REYES'],
  },
  {
    id: 'F-2',
    date: isoDate(2),
    from: 'KTEB',
    to: 'KPBI',
    depart: '13:30',
    arrive: '16:20',
    aircraft: 'G500',
    seatsOpen: 4,
    ownPrincipalIds: [],
  },
  {
    id: 'F-3',
    date: isoDate(4),
    from: 'KCVG',
    to: 'EGGW',
    depart: '18:10',
    arrive: '07:05+1',
    aircraft: 'G650ER',
    seatsOpen: 1,
    ownPrincipalIds: [],
  },
  {
    id: 'F-4',
    date: isoDate(4),
    from: 'KLUK',
    to: 'KAUS',
    depart: '09:15',
    arrive: '11:40',
    aircraft: 'G500',
    seatsOpen: 0,
    ownPrincipalIds: ['P-OSEI'],
    manifestLocked: true,
  },
];

const seedRequest: TripRequest = {
  id: 'R-2047',
  status: 'pending',
  tier: 1,
  principalId: 'P-REYES',
  requestedBy: `${EA_NAME} (EA)`,
  createdAt: isoAt(-7, '09:02'),
  extras: ['Catering — light', 'Ground at KTEB'],
  note: 'Board meeting ends 16:30 — the 17:30 return is firm.',
  legs: [
    {
      id: 'L-1',
      from: 'KCVG',
      to: 'KTEB',
      date: isoDate(14),
      departLocal: '08:00',
      flexHours: 2,
      estMinutes: 105,
      estNm: 570,
      passengers: [
        { passengerId: 'P-REYES', lead: true, purpose: 'business' },
        { passengerId: 'P-SREYES', purpose: 'personal' },
        { passengerId: 'P-TANAKA', purpose: 'business' },
      ],
    },
    {
      id: 'L-2',
      from: 'KTEB',
      to: 'KCVG',
      date: isoDate(16),
      departLocal: '17:30',
      flexHours: 0,
      estMinutes: 125,
      estNm: 570,
      passengers: [
        { passengerId: 'P-REYES', lead: true, purpose: 'business' },
        { passengerId: 'P-TANAKA', purpose: 'business' },
      ],
    },
  ],
  messages: [
    {
      id: 'M-1',
      from: 'scheduling',
      author: SCHEDULER_NAME,
      at: isoAt(0, '09:12'),
      text: 'The dates work, but N802GF is the only tail free and it is a G500 — manifest of 3 is fine. Confirming the ±2 h flex on departure?',
    },
    {
      id: 'M-2',
      from: 'ea',
      author: `Dana (EA for A. Reyes)`,
      at: isoAt(0, '09:31'),
      text: 'Flex confirmed — anything between 06:00 and 10:00 works. The return is firm at 17:30.',
    },
    {
      id: 'M-3',
      from: 'scheduling',
      author: SCHEDULER_NAME,
      at: isoAt(0, '10:05'),
      text: "Noted. Queued for today's 14:00 review.",
    },
  ],
};

const secondRequest: TripRequest = {
  id: 'R-2050',
  status: 'pending',
  tier: 2,
  principalId: 'P-LINDQVIST',
  requestedBy: 'J. Lindqvist',
  createdAt: isoAt(-8, '08:15'),
  extras: [],
  legs: [
    {
      id: 'L-3',
      from: 'KCVG',
      to: 'KATL',
      date: isoDate(15),
      departLocal: '10:00',
      flexHours: 1,
      estMinutes: 80,
      estNm: 373,
      passengers: [{ passengerId: 'P-LINDQVIST', lead: true, purpose: 'business' }],
    },
  ],
  messages: [],
};

// Deliberately tier 3 and submitted last, but departing this week — the case the
// banding exists for. A flat tier-then-time list buries it under two requests
// that do not fly for a fortnight.
const departingSoonRequest: TripRequest = {
  id: 'R-2051',
  status: 'pending',
  tier: 3,
  principalId: 'P-TANAKA',
  requestedBy: 'P. Marsh',
  createdAt: isoAt(-1, '11:20'),
  extras: ['Ground at destination'],
  note: 'Plant visit — needs to be back same day.',
  legs: [
    {
      id: 'L-5',
      from: 'KCVG',
      to: 'KTEB',
      date: isoDate(4),
      departLocal: '06:30',
      flexHours: 1,
      estMinutes: 105,
      estNm: 570,
      passengers: [{ passengerId: 'P-TANAKA', lead: true, purpose: 'business' }],
    },
  ],
  messages: [],
};

const declinedRequest: TripRequest = {
  id: 'R-2044',
  status: 'declined',
  tier: 2,
  principalId: 'P-OSEI',
  requestedBy: `${EA_NAME} (EA)`,
  createdAt: isoAt(-10, '11:00'),
  extras: [],
  declineReason: 'Both tails committed that day. Can offer the following morning, or the prior evening late.',
  legs: [
    {
      id: 'L-4',
      from: 'KLUK',
      to: 'KORD',
      date: isoDate(12),
      departLocal: '07:30',
      flexHours: 0,
      estMinutes: 75,
      estNm: 250,
      passengers: [{ passengerId: 'P-OSEI', lead: true, purpose: 'business' }],
    },
  ],
  messages: [],
};

// Already through the whole ladder, so Trips has an itinerary to open on the
// first click rather than an empty state.
const confirmedRequest: TripRequest = {
  id: 'R-2039',
  status: 'confirmed',
  tier: 1,
  principalId: 'P-OSEI',
  requestedBy: `${EA_NAME} (EA)`,
  createdAt: isoAt(-16, '10:12'),
  extras: ['Catering — full', 'Ground at both ends'],
  note: 'Site visit; back the same evening.',
  legs: [
    {
      id: 'L-6',
      from: 'KLUK',
      to: 'KAUS',
      date: isoDate(4),
      departLocal: '09:15',
      flexHours: 0,
      estMinutes: 145,
      estNm: 920,
      passengers: [
        { passengerId: 'P-OSEI', lead: true, purpose: 'business' },
        { passengerId: 'P-TANAKA', purpose: 'business' },
      ],
    },
    {
      id: 'L-7',
      from: 'KAUS',
      to: 'KLUK',
      date: isoDate(4),
      departLocal: '18:40',
      flexHours: 0,
      estMinutes: 150,
      estNm: 920,
      passengers: [{ passengerId: 'P-OSEI', lead: true, purpose: 'business' }],
    },
  ],
  messages: [],
};

const watches: Watch[] = [
  {
    id: 'W-1',
    kind: 'fleet',
    label: `Fleet hold · ${isoDate(14)} – ${isoDate(16)} · 4 pax`,
    detail: 'Watching for any aircraft free across the window.',
    status: 'watching',
  },
  {
    id: 'W-2',
    kind: 'route',
    label: 'Seat watch · KCVG → KTEB · next 2 weeks',
    detail: 'Alerts you if a seat opens on any eligible flight matching route + window.',
    status: 'watching',
  },
  {
    id: 'W-3',
    kind: 'fleet',
    label: `Fleet hold · ${isoDate(-9)} – ${isoDate(-7)} · 2 pax`,
    detail: 'Window passed without an opening. No action needed.',
    status: 'expired',
  },
];

export function initialPortalState(): PortalState {
  return {
    persona: 'ea',
    requests: [seedRequest, secondRequest, departingSoonRequest, confirmedRequest, declinedRequest],
    flights,
    seatAsks: [],
    watches,
    passengers,
    inbox: [
      {
        id: 'N-seed-1',
        at: isoAt(0, '10:48'),
        kind: 'decision',
        text: 'R-2044 declined — "Both tails committed." Edit & resubmit.',
        actionNeeded: true,
      },
      {
        id: 'N-seed-2',
        at: isoAt(0, '10:05'),
        kind: 'thread',
        text: 'R-2047 message from scheduling: "Queued for today\'s 14:00 review."',
        actionNeeded: false,
      },
      {
        id: 'N-seed-3',
        at: isoAt(-1, '16:20'),
        kind: 'form',
        text: '2026 annual form for A. Reyes moved to "Resubmission requested".',
        actionNeeded: false,
      },
    ],
    tripSeenAt: {},
    nextRequestNumber: 2052,
  };
}
