// Pure shaping for the availability lens — grouping and counting only, so the board component
// renders and does no arithmetic. Same discipline as horizonSelectors.

import type {
  AvailabilityConflict,
  ConflictKind,
  FleetAvailability,
  TailDayAvailability,
} from '../../availability/types';

export interface AvailabilitySummary {
  openTailDays: number;
  totalTailDays: number;
  tailsDown: number;
  /** Tails unavailable for maintenance with NO booked return date — the LG-308 prompt. */
  tailsDownWithoutEtr: string[];
  daysWithNoCrew: number;
  conflictCount: number;
  heldTailDays: number;
}

export function summarizeAvailability(fleet: FleetAvailability): AvailabilitySummary {
  let openTailDays = 0;
  let totalTailDays = 0;
  let heldTailDays = 0;
  let conflictCount = 0;
  const downTails = new Set<string>();
  const withoutEtr = new Set<string>();
  const noCrewDays = new Set<string>();

  for (const row of fleet.rows) {
    for (const cell of row.cells) {
      totalTailDays += 1;
      conflictCount += cell.conflicts.length;
      if (cell.state === 'available') openTailDays += 1;
      if (cell.state === 'held') heldTailDays += 1;
      if (cell.reason.category === 'maintenance') {
        downTails.add(row.tail);
        if (!cell.reason.untilUtc) withoutEtr.add(row.tail);
      }
      if (cell.reason.category === 'no-crew') noCrewDays.add(cell.dateUtc);
    }
  }

  return {
    openTailDays,
    totalTailDays,
    tailsDown: downTails.size,
    tailsDownWithoutEtr: [...withoutEtr].sort(),
    daysWithNoCrew: noCrewDays.size,
    conflictCount,
    heldTailDays,
  };
}

export interface ConflictGroup {
  kind: ConflictKind;
  label: string;
  items: AvailabilityConflict[];
}

const CONFLICT_LABEL: Record<ConflictKind, string> = {
  'trip-in-downtime': 'Trip scheduled into a maintenance window',
  'trip-on-red-tail': 'Trip on an aircraft that is red at departure',
  'trip-without-crew': 'More trips flying than crews that can be formed',
  'hold-over-confirmed-trip': 'Hold placed over a committed trip',
  'deferral-expires-mid-trip': 'Deferral expires mid-trip',
};

/** Most-severe first, matching the order the labels are declared in. */
const CONFLICT_ORDER: ConflictKind[] = [
  'trip-in-downtime',
  'trip-on-red-tail',
  'deferral-expires-mid-trip',
  'trip-without-crew',
  'hold-over-confirmed-trip',
];

export function groupConflicts(fleet: FleetAvailability): ConflictGroup[] {
  const byKind = new Map<ConflictKind, AvailabilityConflict[]>();
  for (const row of fleet.rows) {
    for (const cell of row.cells) {
      for (const c of cell.conflicts) {
        const list = byKind.get(c.kind);
        if (list) list.push(c); else byKind.set(c.kind, [c]);
      }
    }
  }
  return CONFLICT_ORDER.filter(k => byKind.has(k)).map(kind => ({
    kind,
    label: CONFLICT_LABEL[kind],
    items: byKind.get(kind)!,
  }));
}

/** The tails a scheduler should book a downtime window for, so they stop reading down-forever. */
export function tailsNeedingEtr(fleet: FleetAvailability): string[] {
  return summarizeAvailability(fleet).tailsDownWithoutEtr;
}

export function cellAt(fleet: FleetAvailability, tail: string, dateUtc: string): TailDayAvailability | null {
  return fleet.rows.find(r => r.tail === tail)?.cells.find(c => c.dateUtc === dateUtc) ?? null;
}
