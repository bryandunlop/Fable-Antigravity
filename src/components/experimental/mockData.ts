// Deterministic mock trip data for the experimental scheduling module. One seeded generator feeds
// the command center (plan board / run board / calendar / table) AND the unified trip workspace, so
// readiness %, checklist state, and board colors can never disagree. Reloads are byte-stable within
// a day (dates anchor to startOfDay-today); the dev team later swaps this for the real store.

export type ChecklistStatus = 'requested' | 'in-work' | 'blocked' | 'ready';
export type ChecklistCategory = 'dispatch' | 'crew' | 'comms' | 'ground-ops' | 'customs' | 'permits';

export interface MockChecklistItem {
  id: string;
  title: string;
  category: ChecklistCategory;
  status: ChecklistStatus;
  assignedTo: string;
  dueOffsetDays: number; // due = departure − dueOffsetDays (days before ETD)
  lastComment?: string;
  nudged?: boolean;
}

export interface MockAircraft {
  tail: string;
  type: 'G650ER' | 'G500' | 'G800';
  serviceable: boolean; // drives the tail-column serviceability dot (mocked)
}

export const FLEET: MockAircraft[] = [
  { tail: 'N2PG', type: 'G650ER', serviceable: true },
  { tail: 'N1PG', type: 'G500', serviceable: true },
  { tail: 'N650GS', type: 'G650ER', serviceable: true },
  { tail: 'N6PG', type: 'G800', serviceable: false },
];

// Kept for existing imports (SchedulingCommandCenter filter chips).
export const AIRCRAFT = FLEET.map(a => a.tail);

export interface MockTripData {
  id: string;
  tripNumber: string;
  client: string;
  aircraft: string;
  route: string;
  departureDate: string; // ISO string
  durationDays: number;
  status: 'planning' | 'in-progress' | 'dispatched';
  readinessScore: number; // DERIVED from checklist (ready/total) — never set independently
  criticalBlocker?: string;
  isInternational: boolean;
  checklist: MockChecklistItem[];
}

const INTL_ROUTES = [
  'KTEB → EGGW', 'KATL → LFPG → OMDB', 'VOMM → WSSS', 'MMMX → MYNN', 'KLAX → RJTT', 'KTEB → LSGG',
];
const DOM_ROUTES = [
  'KTEB → KDAL', 'KDAL → KASE', 'KLAX → KTEB', 'KMDW → KTEB', 'KPBI → KTEB', 'KOPF → KDAL', 'KTEB → KPBI', 'KDAL → KDEN',
];
const CLIENTS = ['Apex Corp', 'Omega Holdings', 'VIP Charter', 'Mountain Exp.', 'Resort Ops', 'Internal / Deadhead', 'Alpha Investments', 'Global Tech'];
const BLOCKERS = ['FBO Hangar Waitlisted', 'UK eBorders DOB Missing', 'Slot Unconfirmed', 'Catering Unconfirmed', 'Crew Duty Limit Risk', 'Need Pax Passports'];
const ASSIGNEES = ['Sarah M.', 'Mike D.'];

// The full INTL scheduler checklist (source: the department's INTL trip SOP), each item with a
// due offset in days before ETD. Also imported by UnifiedTripWorkspace's "load template" action.
export const INTL_CHECKLIST_TEMPLATE: { title: string; category: ChecklistCategory; dueOffsetDays: number }[] = [
  // Dispatch
  { title: 'Update flight times in MAO (UV plan/Foreflight)', category: 'dispatch', dueOffsetDays: 3 },
  { title: 'Review airport status (NOTAMS, curfews, events)', category: 'dispatch', dueOffsetDays: 2 },
  { title: 'Adjust trip type regulation in MAO as needed', category: 'dispatch', dueOffsetDays: 3 },
  { title: 'Upload final Crew/Pax pdf to attachments', category: 'dispatch', dueOffsetDays: 1 },
  { title: 'Check Region Tab for additional info', category: 'dispatch', dueOffsetDays: 7 },
  // Crew
  { title: 'Check duty day issues', category: 'crew', dueOffsetDays: 7 },
  { title: 'Check fatigue and WOCL issues', category: 'crew', dueOffsetDays: 7 },
  { title: 'Mark 18 hrs Pre-Rest Off in MAO if required', category: 'crew', dueOffsetDays: 3 },
  { title: 'Mark 48 hrs Post-Rest Off in MAO if required', category: 'crew', dueOffsetDays: 3 },
  { title: 'Confirm PIC is INTL Captain', category: 'crew', dueOffsetDays: 14 },
  { title: 'Email/mark standby crew as TSB/OSB', category: 'crew', dueOffsetDays: 5 },
  { title: 'Set Outlook reminder to "Release STBY Crew"', category: 'crew', dueOffsetDays: 2 },
  // Comms
  { title: 'Email trip sheet 1-2 months pre-ETD', category: 'comms', dueOffsetDays: 30 },
  { title: 'Email Crew & Pax Info 2 weeks pre-ETD', category: 'comms', dueOffsetDays: 14 },
  { title: 'Schedule INTL Trip Brief', category: 'comms', dueOffsetDays: 10 },
  // Ground Ops
  { title: 'Verify handler info in MAO', category: 'ground-ops', dueOffsetDays: 5 },
  { title: 'Confirm sleeping arrangements for pax', category: 'ground-ops', dueOffsetDays: 4 },
  // Customs
  { title: 'Send passport check to admin(s)', category: 'customs', dueOffsetDays: 14 },
  { title: 'Fill out Passport & Visas tab; check UVgo', category: 'customs', dueOffsetDays: 10 },
  { title: 'Cross-Check Outbound Apis from UV email', category: 'customs', dueOffsetDays: 2 },
  { title: 'CREW: Confirm Passports and Visas', category: 'customs', dueOffsetDays: 10 },
  { title: 'PAX: Confirm Passports and Visas', category: 'customs', dueOffsetDays: 10 },
  // Permits
  { title: 'Is a waiver required for this trip?', category: 'permits', dueOffsetDays: 21 },
];

export const DOMESTIC_CHECKLIST_TEMPLATE: { title: string; category: ChecklistCategory; dueOffsetDays: number }[] = [
  { title: 'Update flight times in MAO (UV plan/Foreflight)', category: 'dispatch', dueOffsetDays: 2 },
  { title: 'Review airport status (NOTAMS, curfews, events)', category: 'dispatch', dueOffsetDays: 2 },
  { title: 'Upload final Crew/Pax pdf to attachments', category: 'dispatch', dueOffsetDays: 1 },
  { title: 'Check duty day issues', category: 'crew', dueOffsetDays: 5 },
  { title: 'Check fatigue and WOCL issues', category: 'crew', dueOffsetDays: 5 },
  { title: 'Email trip sheet to crew', category: 'comms', dueOffsetDays: 7 },
  { title: 'Email Crew & Pax Info', category: 'comms', dueOffsetDays: 5 },
  { title: 'Verify handler/FBO info in MAO', category: 'ground-ops', dueOffsetDays: 3 },
  { title: 'Confirm catering', category: 'ground-ops', dueOffsetDays: 2 },
  { title: 'Confirm ground transport for pax', category: 'ground-ops', dueOffsetDays: 2 },
];

// Small deterministic PRNG (mulberry32) — the whole dataset derives from one fixed seed so every
// reload (and both consumers) see identical data. Never use Math.random() here.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T,>(arr: T[], rng: () => number): T => arr[Math.floor(rng() * arr.length)];
const int = (min: number, max: number, rng: () => number) => min + Math.floor(rng() * (max - min + 1));

function buildChecklist(
  tripIdx: number,
  isInternational: boolean,
  targetReadiness: number, // 0..100 aim; actual score derives from the statuses laid down
  blocker: string | undefined,
  rng: () => number,
): { checklist: MockChecklistItem[]; readinessScore: number } {
  const template = isInternational ? INTL_CHECKLIST_TEMPLATE : DOMESTIC_CHECKLIST_TEMPLATE;
  const targetReady = Math.floor((targetReadiness / 100) * template.length);
  const checklist: MockChecklistItem[] = template.map((item, index) => {
    let status: ChecklistStatus = 'requested';
    let lastComment: string | undefined;
    let nudged = false;
    if (index < targetReady) status = 'ready';
    else if (index === targetReady && targetReadiness > 0 && targetReadiness < 100) status = 'in-work';
    if (blocker && index === targetReady) {
      status = 'blocked';
      lastComment = blocker;
      nudged = true;
    }
    return {
      id: `t${tripIdx}-m${index}`,
      title: item.title,
      category: item.category,
      status,
      assignedTo: pick(ASSIGNEES, rng),
      dueOffsetDays: item.dueOffsetDays,
      lastComment,
      nudged,
    };
  });
  const ready = checklist.filter(i => i.status === 'ready').length;
  return { checklist, readinessScore: Math.round((ready / checklist.length) * 100) };
}

/**
 * Generate 30–50 trips across the fleet over a −14…+70-day window around `anchor`. Readiness
 * correlates with proximity (imminent trips are worked, far trips untouched) and is derived from
 * the attached checklist. A few same-tail overlaps are injected so conflict handling is visible.
 */
export function generateTrips(anchor: Date): MockTripData[] {
  const rng = mulberry32(0x9f0_2026);
  const today = new Date(anchor);
  today.setHours(0, 0, 0, 0);
  const nowMs = today.getTime();

  const trips: MockTripData[] = [];
  let tripCounter = 1;

  const makeTrip = (tail: string, offsetDays: number, forceDuration?: number): MockTripData => {
    const depDate = new Date(today);
    depDate.setDate(depDate.getDate() + offsetDays);
    depDate.setHours(int(7, 16, rng), 0, 0, 0);
    const isInternational = rng() < 0.3;
    const duration = forceDuration ?? (isInternational ? int(3, 7, rng) : int(1, 3, rng));

    // Readiness by proximity: departed → fully worked; ≤5 days → 85–100; ≤14 → 40–90; beyond →
    // mostly untouched. Blockers only on future, incompletely-worked trips.
    let target: number;
    if (offsetDays < 0) target = 100;
    else if (offsetDays <= 5) target = int(85, 100, rng);
    else if (offsetDays <= 14) target = int(40, 90, rng);
    else target = rng() < 0.55 ? 0 : int(5, 45, rng);
    const blocked = offsetDays >= 0 && target < 85 && rng() < 0.22;
    const blocker = blocked ? pick(BLOCKERS, rng) : undefined;

    const idx = tripCounter++;
    const { checklist, readinessScore } = buildChecklist(idx, isInternational, target, blocker, rng);
    return {
      id: `t${idx}`,
      tripNumber: `TRP-2026-${idx.toString().padStart(3, '0')}`,
      client: pick(CLIENTS, rng),
      aircraft: tail,
      route: pick(isInternational ? INTL_ROUTES : DOM_ROUTES, rng),
      departureDate: depDate.toISOString(),
      durationDays: duration,
      status: depDate.getTime() <= nowMs ? 'dispatched' : offsetDays <= 2 ? 'in-progress' : 'planning',
      readinessScore,
      criticalBlocker: blocker,
      isInternational,
      checklist,
    };
  };

  for (const ac of FLEET) {
    let offset = -14 + int(0, 3, rng);
    while (offset < 70 && trips.length < 47) {
      const trip = makeTrip(ac.tail, offset);
      trips.push(trip);
      offset += trip.durationDays + int(2, 5, rng); // duration + turnaround gap
    }
  }

  // Deliberate same-tail conflicts (a charter request landing on a committed tail) so the plan
  // board's conflict treatment always has something to show.
  const conflictSources = [trips.find(t => t.aircraft === 'N2PG' && new Date(t.departureDate).getTime() > nowMs),
    trips.find(t => t.aircraft === 'N650GS' && new Date(t.departureDate).getTime() > nowMs)];
  for (const src of conflictSources) {
    if (!src || trips.length >= 50) continue;
    const dep = new Date(src.departureDate);
    dep.setDate(dep.getDate() + 1);
    const clash = makeTrip(src.aircraft, Math.round((dep.getTime() - nowMs) / 86400000), Math.max(2, src.durationDays));
    clash.departureDate = dep.toISOString();
    trips.push(clash);
  }

  trips.sort((a, b) => new Date(a.departureDate).getTime() - new Date(b.departureDate).getTime());
  return trips;
}

export const SHARED_MOCK_TRIPS = generateTrips(new Date());
