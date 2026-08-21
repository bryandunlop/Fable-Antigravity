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
