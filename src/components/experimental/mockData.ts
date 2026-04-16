export interface MockTripData {
  id: string;
  tripNumber: string;
  client: string;
  aircraft: string;
  route: string;
  departureDate: string; // ISO string
  durationDays: number;
  status: 'planning' | 'in-progress' | 'dispatched';
  readinessScore: number;
  criticalBlocker?: string;
  isInternational: boolean;
}

const INTL_ROUTES = [
  'KTEB → EGGW', 'KATL → LFPG → OMDB', 'VOMM → WSSS', 'MMMX → MYNN', 'KLAX → RJTT', 'KTEB → LSGG'
];
const DOM_ROUTES = [
  'KTEB → KDAL', 'KDAL → KASE', 'KLAX → KTEB', 'KMDW → KTEB', 'KPBI → KTEB', 'KOPF → KDAL', 'KTEB → KPBI', 'KDAL → KDEN'
];

const CLIENTS = ['Apex Corp', 'Omega Holdings', 'VIP Charter', 'Mountain Exp.', 'Resort Ops', 'Internal / Deadhead', 'Alpha Investments', 'Global Tech'];

export const AIRCRAFT = [
  '1PG', '2PG', '5PG', '6PG'
];

const BLOCKERS = ['FBO Hangar Waitlisted', 'UK eBorders DOB Missing', 'Slot Unconfirmed', 'Catering Unconfirmed', 'Crew Duty Limit Risk', 'Need Pax Passports'];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateTrips(): MockTripData[] {
  const trips: MockTripData[] = [];
  const today = new Date();
  let tripCounter = 1;

  AIRCRAFT.forEach(tail => {
    let currentOffsetDays = Math.floor(Math.random() * 2); // Start somewhere in next 0-1 days
    
    // Generate trips per tail spreading outwards
    while (currentOffsetDays < 60) {
        const depDate = new Date(today);
        depDate.setDate(today.getDate() + currentOffsetDays);
        depDate.setHours(7 + Math.floor(Math.random() * 10), 0, 0, 0);

        // 30% chance of international
        const isInternational = Math.random() < 0.3;
        const duration = isInternational ? 3 + Math.floor(Math.random() * 5) : 1 + Math.floor(Math.random() * 3);
        const readiness = Math.floor(Math.random() * 100);
        const isBlocked = readiness < 60 && Math.random() < 0.3;

        trips.push({
            id: `t${tripCounter}`,
            tripNumber: `TRP-2025-${tripCounter.toString().padStart(3, '0')}`,
            client: randomChoice(CLIENTS),
            aircraft: tail,
            route: randomChoice(isInternational ? INTL_ROUTES : DOM_ROUTES),
            departureDate: depDate.toISOString(),
            durationDays: duration,
            status: currentOffsetDays < 2 ? 'dispatched' : 'planning',
            readinessScore: isBlocked ? 20 : (currentOffsetDays < 5 ? 100 : readiness),
            criticalBlocker: isBlocked ? randomChoice(BLOCKERS) : undefined,
            isInternational
        });

        // Advance the offset for this tail: duration + 0 to 2 days pause
        currentOffsetDays += duration + Math.floor(Math.random() * 2);
        tripCounter++;
    }
  });

  trips.sort((a, b) => new Date(a.departureDate).getTime() - new Date(b.departureDate).getTime());
  return trips;
}

export const SHARED_MOCK_TRIPS = generateTrips();
