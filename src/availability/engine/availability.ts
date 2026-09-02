// The availability ladder — one verdict per tail per day, with a ranked reason.
//
// First match wins and the ladder is total, so a cell always has exactly one winning reason and
// ties are impossible. The full stack is kept alongside it, because scheduling needs to know
// that a day is BOTH committed and crewless before releasing anything, and because a release
// drops to the next reason rather than to 'available'.
//
// Rank 1 is the deliberate one: a RED tail with no downtime block reads unavailable with NO
// return date. Synthesising an ETR is exactly what LG-308 objects to. The fix is that scheduling
// can now create the block, and its absence shows up as a prompt to do so.
//
// Conflicts are NOT verdicts. A trip sitting inside a downtime window still reads
// unavailable/maintenance — the collision goes to conflicts[] for the scheduler to resolve.

import type { CrewDayCoverage, CrewRecord } from '../../components/crew/crewRecords';
import type { Serviceability } from '../../components/tech-log/types';
import type { TripServiceabilityAlert } from '../../components/tech-log/engine/tripAlerts';
import type { TripRecord } from '../../scheduling/store/types';
import type {
  AvailabilityConflict,
  AvailabilityDay,
  AvailabilityReason,
  FleetAvailability,
  MaintenanceDowntimeBlock,
  SchedulerOverlay,
  TailDayAvailability,
} from '../types';
import { blocksCoveringDay, returnToServiceUtc, utcDayKey } from './downtime';
import { crewCapacityByDay, type CrewAssignment, type CrewDayCapacity } from './crewCoverage';
import { activeOverlayFor, applyOverlay } from './holds';

const DAY_MS = 86_400_000;
const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface AvailabilityInput {
  tails: Array<{ tail: string; type: string }>;
  trips: TripRecord[];
  downtime: MaintenanceDowntimeBlock[];
  crewRoster: CrewRecord[];
  crewCoverage: CrewDayCoverage[];
  overlays: SchedulerOverlay[];
  /** Current derived serviceability per tail — the §14.2 projection, never a stored flag. */
  tailStatus: Record<string, Serviceability>;
  /** OPERATOR-ONLY: the driving defect line per tail. */
  tailHeadline: Record<string, string | null>;
  tripAlerts: TripServiceabilityAlert[];
  /** Phase-2 seam: real crew-to-trip assignment. Absent = one notional crew per trip. */
  crewAssignments?: CrewAssignment[];
  /**
   * D107 — "the plane always has to be available for the CEO." On any day the principal has no
   * trip of their own, one of `candidateTails` (in preference order) that would otherwise read
   * available is marked `reserved`. Scheduling releases it like a hold. Absent = no reserve.
   */
  principalReserve?: PrincipalReserve;
}

export interface PrincipalReserve {
  name: string;
  /** Core tails of the right cabin, in the order to try them. */
  candidateTails: string[];
  /** UTC day keys on which the principal is travelling — no reserve needed those days. */
  awayDates: string[];
}

/** Trips still consuming a tail — cancelled and flown trips make no demand. */
function demandTrips(trips: TripRecord[]): TripRecord[] {
  return trips.filter(t => t.status !== 'cancelled' && t.status !== 'completed');
}

interface Occupancy {
  trip: TripRecord;
  label: string | null;
}

/** tail -> date -> the trip holding it. Earlier-starting trip keeps the cell. */
function occupancyByTailDay(trips: TripRecord[]): Map<string, Map<string, Occupancy>> {
  const byTail = new Map<string, Map<string, Occupancy>>();
  const sorted = demandTrips(trips)
    .slice()
    .sort((a, b) => Date.parse(a.startDate) - Date.parse(b.startDate));

  for (const t of sorted) {
    const startMs = Date.parse(t.startDate);
    const endMs = Date.parse(t.endDate);
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) continue;

    let days = byTail.get(t.tail);
    if (!days) byTail.set(t.tail, (days = new Map()));

    for (let ms = Date.parse(`${utcDayKey(startMs)}T00:00:00.000Z`); ms <= endMs; ms += DAY_MS) {
      const key = utcDayKey(ms);
      if (days.has(key)) continue;
      const dayLegs = t.legs
        .filter(l => utcDayKey(Date.parse(l.departureTimeUtc)) === key)
        .sort((a, b) => Date.parse(a.departureTimeUtc) - Date.parse(b.departureTimeUtc));
      days.set(key, {
        trip: t,
        label: dayLegs.length > 0
          ? `${dayLegs[0].departureIcao} → ${dayLegs[dayLegs.length - 1].arrivalIcao}`
          : null,
      });
    }
  }
  return byTail;
}

function buildDays(nowUtc: string, days: number): AvailabilityDay[] {
  const todayStartMs = Date.parse(`${utcDayKey(Date.parse(nowUtc))}T00:00:00.000Z`);
  return Array.from({ length: days }, (_, i) => {
    const ms = todayStartMs + i * DAY_MS;
    const date = new Date(ms);
    return { dateUtc: utcDayKey(ms), dateLabel: `${WEEKDAY[date.getUTCDay()]} ${date.getUTCDate()}` };
  });
}

/**
 * The ladder, named once. Every rung lives here so the order is readable in one place and a new
 * rung is an edit rather than a renumbering scattered across the file.
 */
export const RANK = {
  MAINTENANCE_BLOCK: 0,
  NOT_IN_SERVICE: 1,
  MAINTENANCE_RED: 2,
  COMMITTED: 3,
  HELD: 4,
  NO_CREW: 5,
  RESERVED: 6,
  NOT_YET_ROSTERED: 7,
  NONE: 8,
} as const;

const NO_REASON: AvailabilityReason = { category: 'none', rank: RANK.NONE, detail: '', untilUtc: null };

export function buildFleetAvailability(
  input: AvailabilityInput,
  nowUtc: string,
  days = 14,
): FleetAvailability {
  const dayList = buildDays(nowUtc, days);
  const occupancy = occupancyByTailDay(input.trips);

  const capacity = new Map<string, CrewDayCapacity>(
    crewCapacityByDay(
      input.crewRoster, input.crewCoverage, input.trips, nowUtc, days, input.crewAssignments,
    ).map(c => [c.dateUtc, c]),
  );

  const alertsByTail = new Map<string, TripServiceabilityAlert[]>();
  for (const a of input.tripAlerts) {
    const list = alertsByTail.get(a.tail);
    if (list) list.push(a); else alertsByTail.set(a.tail, [a]);
  }

  const rows = input.tails.map(({ tail, type }) => {
    const tailOccupancy = occupancy.get(tail);
    const tailAlerts = alertsByTail.get(tail) ?? [];

    const cells = dayList.map(({ dateUtc }): TailDayAvailability => {
      const reasons: AvailabilityReason[] = [];
      const conflicts: AvailabilityConflict[] = [];

      // Rank 0 — a scheduled maintenance window, with the ETR it carries.
      const covering = blocksCoveringDay(input.downtime, tail, dateUtc);
      if (covering.length > 0) {
        const block = covering[0];
        reasons.push({
          category: 'maintenance',
          rank: RANK.MAINTENANCE_BLOCK,
          detail: block.description ?? block.maintenanceType,
          untilUtc: returnToServiceUtc(input.downtime, tail, dateUtc),
          sourceRef: { kind: 'downtime', id: block.id },
        });
      }

      // Rank 1 — the aircraft is not in service at all. NOT_ASSESSED is what the §14.2
      // projection returns for a provisional airframe (the G800 awaiting its FSDO LOA): its
      // serviceability is unknown, not green, so it must never read bookable. It is not
      // "maintenance" either — nothing is being fixed — so it gets its own category rather than
      // borrowing a label that would misdescribe it to an executive.
      if (input.tailStatus[tail] === 'NOT_ASSESSED') {
        reasons.push({
          category: 'not-in-service',
          rank: RANK.NOT_IN_SERVICE,
          detail: input.tailHeadline[tail] ?? 'Aircraft is not yet in service',
          untilUtc: null,
        });
      }

      // Rank 2 — RED with no block: unavailable, and honestly with no return date.
      if (covering.length === 0 && input.tailStatus[tail] === 'RED') {
        reasons.push({
          category: 'maintenance',
          rank: RANK.MAINTENANCE_RED,
          detail: input.tailHeadline[tail] ?? 'Aircraft is not airworthy',
          untilUtc: null,
        });
      }

      // Rank 3 — a trip already holds the tail.
      const occupied = tailOccupancy?.get(dateUtc);
      if (occupied) {
        reasons.push({
          category: 'committed',
          rank: RANK.COMMITTED,
          detail: occupied.label
            ? `${occupied.trip.tripNumber} · ${occupied.label}`
            : `${occupied.trip.tripNumber} · away`,
          untilUtc: occupied.trip.endDate,
          sourceRef: { kind: 'trip', id: occupied.trip.id },
        });
        if (covering.length > 0) {
          conflicts.push({
            kind: 'trip-in-downtime',
            tail,
            dateUtc,
            tripId: occupied.trip.id,
            blockId: covering[0].id,
            detail: `${occupied.trip.tripNumber} is scheduled while ${tail} is in ${covering[0].maintenanceType}`,
          });
        }
      }

      // Rank 5 — no crew can be formed for the day. (Rank 4, held, is the overlay's.)
      const cap = capacity.get(dateUtc);
      const crew = {
        crewsFormable: cap?.crewsFormable ?? 0,
        crewsCommitted: cap?.crewsCommitted ?? 0,
        crewsFree: cap?.crewsFree ?? 0,
        rostered: cap?.rostered ?? false,
      };
      // Rank 6 — beyond the published roster there is no crew answer to give. This is NOT a
      // block: nothing known stands in the way, we simply cannot say yet. Saying "no crew" out
      // here is the bug that made the far horizon read as a grounded fleet.
      if (!occupied && cap && !cap.rostered) {
        reasons.push({
          category: 'not-yet-rostered',
          rank: RANK.NOT_YET_ROSTERED,
          detail: 'beyond the published crew roster',
          untilUtc: null,
          sourceRef: { kind: 'crew', id: dateUtc },
        });
      } else if (!occupied && crew.crewsFree <= 0) {
        reasons.push({
          category: 'no-crew',
          rank: RANK.NO_CREW,
          detail: `${crew.crewsFormable} crew(s) formable, ${crew.crewsCommitted} committed`,
          untilUtc: null,
          sourceRef: { kind: 'crew', id: dateUtc },
        });
      }

      reasons.sort((a, b) => a.rank - b.rank);
      const winner = reasons[0] ?? NO_REASON;

      // Serviceability collisions on the trips themselves — reused from tripAlerts, never
      // recomputed. These are conflicts, not verdicts.
      if (occupied) {
        for (const a of tailAlerts) {
          if (a.tripId !== occupied.trip.id) continue;
          if (a.kind === 'RED_AT_ETD' && utcDayKey(Date.parse(a.etdUtc)) === dateUtc) {
            conflicts.push({ kind: 'trip-on-red-tail', tail, dateUtc, tripId: a.tripId, detail: a.detail });
          }
          if (a.kind === 'DEFERRAL_EXPIRES_MID_TRIP' && a.dueUtc && utcDayKey(Date.parse(a.dueUtc)) === dateUtc) {
            conflicts.push({ kind: 'deferral-expires-mid-trip', tail, dateUtc, tripId: a.tripId, detail: a.detail });
          }
        }
        if (crew.crewsCommitted > crew.crewsFormable) {
          conflicts.push({
            kind: 'trip-without-crew',
            tail,
            dateUtc,
            tripId: occupied.trip.id,
            detail: `${crew.crewsCommitted} trips flying with ${crew.crewsFormable} crew(s) formable`,
          });
        }
      }

      const base: TailDayAvailability = {
        tail,
        dateUtc,
        // 'not-yet-rostered' is an ABSENCE of knowledge, not a block, so it reads available —
        // the reason rides along so the surface can say why it is provisional.
        state: winner.category === 'none' || winner.category === 'not-yet-rostered'
          ? 'available'
          : winner.category === 'committed'
            ? 'committed'
            : 'unavailable',
        reason: winner,
        reasons: reasons.length > 0 ? reasons : [NO_REASON],
        conflicts,
        overlay: null,
        crew,
        tripId: occupied?.trip.id ?? null,
      };

      const overlay = activeOverlayFor(input.overlays, tail, dateUtc);
      const withOverlay = applyOverlay(base, overlay);

      if (overlay?.kind === 'hold' && base.state === 'committed') {
        withOverlay.conflicts = [
          ...withOverlay.conflicts,
          {
            kind: 'hold-over-confirmed-trip',
            tail,
            dateUtc,
            overlayId: overlay.id,
            tripId: base.tripId ?? undefined,
            detail: `Hold placed over ${base.reason.detail}`,
          },
        ];
      }

      return withOverlay;
    });

    return { tail, type, cells };
  });

  // ── The principal reserve, after everything else (D107) ───────────────────────────────
  // A post-pass rather than a rung: the reserve must pick a tail that is genuinely available —
  // airworthy, unscheduled, crewed, not held — so it can only be decided once the ladder has run
  // for every tail. One tail per day, first candidate that is open; a release overlay on any
  // candidate that day means scheduling let the reserve go, so the day is skipped.
  const reserve = input.principalReserve;
  if (reserve && reserve.candidateTails.length > 0) {
    const away = new Set(reserve.awayDates);
    const byTail = new Map(rows.map(r => [r.tail, r]));
    dayList.forEach(({ dateUtc }, dayIndex) => {
      if (away.has(dateUtc)) return;
      const released = reserve.candidateTails.some(t => activeOverlayFor(input.overlays, t, dateUtc)?.kind === 'release');
      if (released) return;
      for (const t of reserve.candidateTails) {
        const row = byTail.get(t);
        const cell = row?.cells[dayIndex];
        if (!row || !cell || cell.state !== 'available') continue;
        const reason: AvailabilityReason = {
          category: 'reserved',
          rank: RANK.RESERVED,
          detail: `Kept for ${reserve.name}`,
          untilUtc: null,
          sourceRef: { kind: 'reserve', id: `${t}-${dateUtc}` },
        };
        row.cells[dayIndex] = {
          ...cell,
          state: 'reserved',
          reason,
          reasons: [reason, ...cell.reasons.filter(r => r.category !== 'none')],
        };
        break;
      }
    });
  }

  return { days: dayList, rows, generatedAtUtc: nowUtc };
}

export interface TailDayStats {
  openTailDays: number;
  totalTailDays: number;
}

/** How much of the window is genuinely available — the executive's headline number. */
export function tailDayStats(fleet: FleetAvailability): TailDayStats {
  let open = 0;
  let total = 0;
  for (const row of fleet.rows) {
    for (const cell of row.cells) {
      total += 1;
      if (cell.state === 'available') open += 1;
    }
  }
  return { openTailDays: open, totalTailDays: total };
}

export interface OpenSlot {
  dateUtc: string;
  tail: string;
}

/** The earliest available tail-day. Ties on date go to the earlier row (fleet display order). */
export function firstAvailableSlot(fleet: FleetAvailability): OpenSlot | null {
  for (const day of fleet.days) {
    for (const row of fleet.rows) {
      const cell = row.cells.find(c => c.dateUtc === day.dateUtc);
      if (cell?.state === 'available') return { dateUtc: day.dateUtc, tail: row.tail };
    }
  }
  return null;
}

export function allConflicts(fleet: FleetAvailability): AvailabilityConflict[] {
  return fleet.rows.flatMap(r => r.cells.flatMap(c => c.conflicts));
}
