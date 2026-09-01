// Seeded crew-readiness source — the ONE place crew duty/currency demo data lives.
//
// Names and roles align with the app's named users (src/lib/mockUsers.ts SYSTEM_USERS)
// and the tech-log personnel seed (src/components/tech-log/mockData/fleet.ts
// SEED_PERSONNEL) so persona switching, sign-offs, and this readiness view all mean
// the same humans. Expiry dates are computed RELATIVE TO NOW so they never go stale.

const DAY_MS = 86_400_000;

export type CrewRole = 'PIC' | 'SIC' | 'FA';

export interface CrewRecord {
  /** SYSTEM_USERS / SEED_PERSONNEL id (USR00x) — one identity across surfaces. */
  id: string;
  name: string;
  role: CrewRole;
  /** Duty hours used in the current duty period vs the applicable limit. */
  dutyHoursUsed: number;
  dutyLimitHours: number;
  /** Rolling 30-day flight hours vs the applicable limit. */
  flightHours30d: number;
  flightHoursLimit30d: number;
  /** ISO UTC expiry instants, derived from `now` at read time. */
  currencyExpiresUtc: string;
  medicalExpiresUtc: string | null; // FAs carry no medical in the demo
  trainingDueUtc: string;
}

export interface CrewExpiryItem {
  record: CrewRecord;
  kind: 'currency' | 'medical' | 'training';
  expiresUtc: string;
  daysUntil: number;
}

export type CrewDayStatus = 'available' | 'leave' | 'training' | 'rest';

/**
 * One person's status on one UTC day. Absent = available, so only exceptions are stored.
 *
 * DEMO STAND-IN. There is no real roster feed: the myairops Schedule API holds crew duties but
 * has no captured spec (unknown, not read-only), so nothing authoritative can back this yet.
 * It exists so "no crew that day" is an explainable verdict rather than a flat capacity
 * constant — it is not a duty-and-rest calculation and must never be read as one.
 */
export interface CrewDayCoverage {
  crewId: string;
  /** 'YYYY-MM-DD' (UTC). */
  dateUtc: string;
  status: CrewDayStatus;
  note?: string;
}

export interface CrewHeadroom {
  id: string;
  name: string;
  role: CrewRole;
  dutyHoursUsed: number;
  dutyLimitHours: number;
  headroomHours: number;
}

function inDays(nowMs: number, days: number): string {
  return new Date(nowMs + days * DAY_MS).toISOString();
}

/**
 * The seeded readiness picture. Pass `nowUtc` for determinism in tests; defaults
 * to the wall clock for callers rendering "today".
 */
export function getCrewRecords(nowUtc: string = new Date().toISOString()): CrewRecord[] {
  const now = Date.parse(nowUtc);
  return [
    {
      // SEED_PERSONNEL USR001 'Capt. John Smith' (acting Chief Pilot)
      id: 'USR001',
      name: 'Capt. John Smith',
      role: 'PIC',
      dutyHoursUsed: 8.5,
      dutyLimitHours: 14,
      flightHours30d: 62,
      flightHoursLimit30d: 100,
      currencyExpiresUtc: inDays(now, 24), // inside the 60-day watch window
      medicalExpiresUtc: inDays(now, 140),
      trainingDueUtc: inDays(now, 210),
    },
    {
      // SEED_PERSONNEL USR007 'FO Emily Chen'
      id: 'USR007',
      name: 'FO Emily Chen',
      role: 'SIC',
      dutyHoursUsed: 0,
      dutyLimitHours: 14,
      flightHours30d: 55,
      flightHoursLimit30d: 100,
      currencyExpiresUtc: inDays(now, 150),
      medicalExpiresUtc: inDays(now, 45), // inside the 60-day watch window
      trainingDueUtc: inDays(now, 90),
    },
    {
      // SYSTEM_USERS USR003 'Mike Johnson' (Cabin Services)
      id: 'USR003',
      name: 'Mike Johnson',
      role: 'FA',
      dutyHoursUsed: 7,
      dutyLimitHours: 14,
      flightHours30d: 58,
      flightHoursLimit30d: 120,
      currencyExpiresUtc: inDays(now, 200),
      medicalExpiresUtc: null,
      trainingDueUtc: inDays(now, 31), // inside the 60-day watch window
    },
    {
      // SYSTEM_USERS USR014 'Elena Marsh' (Cabin Services)
      id: 'USR014',
      name: 'Elena Marsh',
      role: 'FA',
      dutyHoursUsed: 0,
      dutyLimitHours: 14,
      flightHours30d: 42,
      flightHoursLimit30d: 120,
      currencyExpiresUtc: inDays(now, 300),
      medicalExpiresUtc: null,
      trainingDueUtc: inDays(now, 180),
    },
  ];
}

/**
 * Every currency/medical/training expiry falling within `days` of `nowUtc`
 * (inclusive), soonest first. Already-lapsed items (negative daysUntil) are
 * included — a lapsed currency is MORE urgent, not out of scope.
 */
export function expiringWithinDays(
  records: CrewRecord[],
  days: number,
  nowUtc: string,
): CrewExpiryItem[] {
  const nowMs = Date.parse(nowUtc);
  const items: CrewExpiryItem[] = [];
  for (const record of records) {
    const candidates: Array<[CrewExpiryItem['kind'], string | null]> = [
      ['currency', record.currencyExpiresUtc],
      ['medical', record.medicalExpiresUtc],
      ['training', record.trainingDueUtc],
    ];
    for (const [kind, expiresUtc] of candidates) {
      if (!expiresUtc) continue;
      const daysUntil = Math.floor((Date.parse(expiresUtc) - nowMs) / DAY_MS);
      if (daysUntil <= days) items.push({ record, kind, expiresUtc, daysUntil });
    }
  }
  return items.sort((a, b) => a.daysUntil - b.daysUntil);
}

/** Per-person duty headroom (limit − used), tightest first. */
export function dutyHeadroom(records: CrewRecord[]): CrewHeadroom[] {
  return records
    .map(r => ({
      id: r.id,
      name: r.name,
      role: r.role,
      dutyHoursUsed: r.dutyHoursUsed,
      dutyLimitHours: r.dutyLimitHours,
      headroomHours: r.dutyLimitHours - r.dutyHoursUsed,
    }))
    .sort((a, b) => a.headroomHours - b.headroomHours);
}

const DAY_KEY = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/**
 * Roster-only pilots — flight crew who exist for scheduling purposes but have no login persona.
 *
 * getCrewRecords() is a readiness SAMPLE (one PIC, one SIC, two FAs) built to demo the expiry
 * watch list. It cannot answer "how many crews can we field on Thursday", which is what the
 * availability engine needs, so the roster extends it rather than replacing it: the four sampled
 * ids stay first and unchanged, because PilotCurrency and CrewResourceManagement read them.
 */
const ROSTER_ONLY_PILOTS: Array<{ id: string; name: string; role: CrewRole; dutyHoursUsed: number; currencyDays: number; medicalDays: number; trainingDays: number }> = [
  { id: 'CRW020', name: 'Capt. Ray Okafor', role: 'PIC', dutyHoursUsed: 3, currencyDays: 190, medicalDays: 220, trainingDays: 260 },
  { id: 'CRW021', name: 'Capt. Nina Alvarez', role: 'PIC', dutyHoursUsed: 0, currencyDays: 95, medicalDays: 310, trainingDays: 120 },
  { id: 'CRW022', name: 'Capt. Doug Feeney', role: 'PIC', dutyHoursUsed: 11, currencyDays: 240, medicalDays: 180, trainingDays: 330 },
  { id: 'CRW023', name: 'FO Marcus Bell', role: 'SIC', dutyHoursUsed: 4, currencyDays: 170, medicalDays: 200, trainingDays: 150 },
  { id: 'CRW024', name: 'FO Priya Nandan', role: 'SIC', dutyHoursUsed: 0, currencyDays: 130, medicalDays: 260, trainingDays: 240 },
  { id: 'CRW025', name: 'FA Tomas Reyes', role: 'FA', dutyHoursUsed: 2, currencyDays: 280, medicalDays: 0, trainingDays: 190 },
];

/**
 * The full flight-crew roster: the readiness sample plus the roster-only pilots.
 * 4 PIC / 3 SIC / 3 FA — enough that losing one to leave visibly changes what the fleet can fly.
 */
export function getCrewRoster(nowUtc: string = new Date().toISOString()): CrewRecord[] {
  const now = Date.parse(nowUtc);
  return [
    ...getCrewRecords(nowUtc),
    ...ROSTER_ONLY_PILOTS.map(p => ({
      id: p.id,
      name: p.name,
      role: p.role,
      dutyHoursUsed: p.dutyHoursUsed,
      dutyLimitHours: 14,
      flightHours30d: 45,
      flightHoursLimit30d: p.role === 'FA' ? 120 : 100,
      currencyExpiresUtc: inDays(now, p.currencyDays),
      medicalExpiresUtc: p.medicalDays === 0 ? null : inDays(now, p.medicalDays),
      trainingDueUtc: inDays(now, p.trainingDays),
    })),
  ];
}

/**
 * Seeded leave/training/rest, generated from fixed per-person offsets relative to `now` so the
 * picture is deterministic for a pinned clock and never goes stale. Only exceptions are emitted.
 */
const COVERAGE_SEED: Array<{ crewId: string; startDay: number; lengthDays: number; status: CrewDayStatus; note: string }> = [
  { crewId: 'CRW020', startDay: 2, lengthDays: 3, status: 'leave', note: 'Annual leave' },
  { crewId: 'USR007', startDay: 4, lengthDays: 2, status: 'training', note: 'Recurrent sim — FlightSafety' },
  { crewId: 'CRW024', startDay: 6, lengthDays: 2, status: 'leave', note: 'Annual leave' },
  { crewId: 'CRW022', startDay: 9, lengthDays: 1, status: 'rest', note: 'Post-trip rest' },
  { crewId: 'CRW023', startDay: 11, lengthDays: 3, status: 'training', note: 'Type rating renewal' },
];

export function getCrewDayCoverage(nowUtc: string, days = 14): CrewDayCoverage[] {
  const todayStart = Date.parse(`${DAY_KEY(Date.parse(nowUtc))}T00:00:00.000Z`);
  const out: CrewDayCoverage[] = [];
  for (const seed of COVERAGE_SEED) {
    for (let i = 0; i < seed.lengthDays; i += 1) {
      const offset = seed.startDay + i;
      if (offset < 0 || offset >= days) continue;
      out.push({
        crewId: seed.crewId,
        dateUtc: DAY_KEY(todayStart + offset * DAY_MS),
        status: seed.status,
        note: seed.note,
      });
    }
  }
  return out;
}
