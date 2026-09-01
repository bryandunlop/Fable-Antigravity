// The disclosure boundary — what each audience learns about a blocked day.
//
// Bryan, 2026-08-31: executives and EAs get the reason CATEGORY only. Not the defect, not the
// work order, not the vendor, not who is on leave.
//
// The mechanism matters more than the rule. Every executive-facing string here is BUILT from
// (category, untilUtc) — no value from the model is ever passed through to an executive
// audience. That makes leakage structurally impossible rather than a thing reviewers have to
// keep noticing, and it is why `detail` never appears below outside the operator branch.
//
// Three audiences:
//   executive       category + ETR only
//   executive-full  the whole operating picture — trips, downtime windows, hold labels — for
//                   named executives who are enabled for it. Still no defect/WO/vendor/crew.
//   operator        everything, including the ranked stack, conflicts and overlay notes.

import type {
  AvailabilityConflict,
  AvailabilityDay,
  AvailabilityReason,
  AvailabilityState,
  Audience,
  FleetAvailability,
  ReasonCategory,
  TailDayAvailability,
} from '../types';

export interface DisclosedCell {
  tail: string;
  dateUtc: string;
  state: AvailabilityState;
  category: ReasonCategory;
  /** Built from (category, untilUtc). Null when the day is available. */
  label: string | null;
  untilUtc: string | null;
  /** executive-full and operator only: the route or 'away'. Never a defect line. */
  scheduleLabel?: string | null;
  /** executive-full and operator only. */
  tripId?: string | null;
  /** executive-full and operator only: the author-written inventory sentence. */
  publicLabel?: string | null;
  /** operator only. */
  reasons?: AvailabilityReason[];
  /** operator only. */
  conflicts?: AvailabilityConflict[];
  /** operator only. */
  overlayNote?: string | null;
  /** operator only. */
  crew?: TailDayAvailability['crew'];
}

export interface DisclosedRow {
  tail: string;
  type: string;
  cells: DisclosedCell[];
}

export interface DisclosedAvailability {
  days: AvailabilityDay[];
  rows: DisclosedRow[];
  audience: Audience;
  generatedAtUtc: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** '12 Sep' from an ISO instant. Null in, null out. */
export function shortDate(iso: string | null): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  const d = new Date(ms);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/**
 * The executive-facing sentence, composed from the category and the bounding date ONLY.
 *
 * Deliberately not a lookup into the model. A 'maintenance' day with no ETR says so plainly
 * rather than borrowing the defect headline — the missing date is the honest signal (LG-308),
 * and it is the prompt for scheduling to create a block.
 */
export function categoryLabel(category: ReasonCategory, untilUtc: string | null): string | null {
  const until = shortDate(untilUtc);
  switch (category) {
    case 'maintenance':
      return until ? `In maintenance until ${until}` : 'Unavailable — no return date set';
    case 'not-in-service':
      return 'Not yet in service';
    case 'no-crew':
      return 'No crew that day';
    case 'committed':
      return until ? `Already committed until ${until}` : 'Already committed';
    case 'held':
      return 'Held by scheduling';
    case 'none':
      return null;
  }
}

/**
 * The route line, for audiences allowed to see the schedule.
 *
 * Read off the COMMITTED reason's detail, which is composed in availability.ts from the trip
 * number and its ICAO pair — never from a defect. Anything else is withheld, so a maintenance
 * day discloses no text here even to executive-full.
 */
function scheduleLabelFor(cell: TailDayAvailability): string | null {
  const committed = cell.reasons.find(r => r.category === 'committed');
  return committed ? committed.detail : null;
}

export function discloseCell(cell: TailDayAvailability, audience: Audience): DisclosedCell {
  const base: DisclosedCell = {
    tail: cell.tail,
    dateUtc: cell.dateUtc,
    state: cell.state,
    category: cell.reason.category,
    label: categoryLabel(cell.reason.category, cell.reason.untilUtc),
    untilUtc: cell.reason.untilUtc,
  };

  if (audience === 'executive') return base;

  const withSchedule: DisclosedCell = {
    ...base,
    scheduleLabel: scheduleLabelFor(cell),
    tripId: cell.tripId,
    publicLabel: cell.overlay?.publicLabel ?? null,
  };

  if (audience === 'executive-full') return withSchedule;

  return {
    ...withSchedule,
    reasons: cell.reasons,
    conflicts: cell.conflicts,
    overlayNote: cell.overlay?.note ?? null,
    crew: cell.crew,
  };
}

export function disclose(fleet: FleetAvailability, audience: Audience): DisclosedAvailability {
  return {
    days: fleet.days,
    audience,
    generatedAtUtc: fleet.generatedAtUtc,
    rows: fleet.rows.map(row => ({
      tail: row.tail,
      type: row.type,
      cells: row.cells.map(c => discloseCell(c, audience)),
    })),
  };
}
