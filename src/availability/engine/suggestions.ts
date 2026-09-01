// Release suggestions — the engine proposes, scheduling approves.
//
// Bryan, 2026-08-31: "the engine should make a suggestion to release the availability to
// scheduling and then scheduling can approve the release."
//
// That turns release from a raw override into the same propose-and-approve shape as the rest of
// the project. Suggestions are COMPUTED, never stored: nothing here writes, nothing applies
// itself, and approving one appends a `release` overlay carrying its id.
//
// The safety line: every trigger is grounded in something that has ALREADY happened in the source
// data — a block that ended, a hold nobody claimed, leave that finished, a trip that cancelled.
// No trigger may ever propose freeing a RED tail with no block, because nothing observable says
// that aeroplane is fixed. Asserted in suggestions.test.ts.

import type {
  FleetAvailability,
  MaintenanceDowntimeBlock,
  ReleaseSuggestion,
  SchedulerOverlay,
} from '../types';
import type { AvailabilityInput } from './availability';
import { effectiveWindow, utcDayKey } from './downtime';

const DAY_MS = 86_400_000;

/** How far ahead an unclaimed hold has to be before we suggest letting it go. */
export const UNCLAIMED_HOLD_WINDOW_DAYS = 7;

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * How many crew-resolvable suggestions to raise at once.
 *
 * Crew is a FLEET resource, so a single crewless day produces one suggestion per idle tail — five
 * cards saying the same thing. They are also the weakest of the four triggers: nothing has
 * happened, the day is simply tight. Capping them keeps a real signal (a window that ended early,
 * a cancelled trip) from being buried under rostering noise; the board's own no-crew count already
 * shows the full picture.
 */
export const MAX_CREW_SUGGESTIONS = 3;

/** Highest-signal first: something CHANGED, before something is merely tight. */
const TRIGGER_PRIORITY: Record<ReleaseSuggestion['trigger'], number> = {
  'downtime-ended-early': 0,
  'trip-cancelled': 1,
  'hold-unclaimed': 2,
  'crew-resolvable': 3,
};

/** Deterministic, so a dismissal keeps matching the suggestion it dismissed. */
function suggestionId(trigger: string, tail: string, from: string, to: string): string {
  return `sug-${trigger}-${tail}-${from}-${to}`;
}

/** A dismissal covering the same tail and range retires the suggestion. */
export function isDismissed(suggestion: ReleaseSuggestion, overlays: SchedulerOverlay[]): boolean {
  return overlays.some(
    o =>
      o.kind === 'dismissal' &&
      o.tail === suggestion.tail &&
      o.fromDateUtc <= suggestion.fromDateUtc &&
      o.toDateUtc >= suggestion.toDateUtc,
  );
}

/** An approved release already covering the range means there is nothing left to propose. */
function alreadyReleased(
  tail: string, from: string, to: string, overlays: SchedulerOverlay[],
): boolean {
  return overlays.some(
    o => o.kind === 'release' && o.tail === tail && o.fromDateUtc <= from && o.toDateUtc >= to,
  );
}

function dayRange(startMs: number, endMs: number): string[] {
  const out: string[] = [];
  for (let ms = startMs; ms <= endMs; ms += DAY_MS) out.push(utcDayKey(ms));
  return out;
}

/**
 * A block whose scheduled window is still running but whose source data says the work is over:
 * an actual end that beat the schedule, or the ops-board `released`/`cancelled` flag set.
 *
 * Note the asymmetry with the ladder: effectiveWindow already frees those days, so the
 * suggestion is not what makes the tail available — it is the prompt to PUBLISH that fact as
 * inventory, with an attributed release row, rather than letting it change silently.
 */
function downtimeEndedEarly(
  blocks: MaintenanceDowntimeBlock[], nowUtc: string,
): ReleaseSuggestion[] {
  const nowMs = Date.parse(nowUtc);
  const out: ReleaseSuggestion[] = [];

  for (const b of blocks) {
    const scheduledEndMs = Date.parse(b.scheduledEndUtc);
    if (Number.isNaN(scheduledEndMs) || scheduledEndMs <= nowMs) continue;

    const actualEndMs = b.actualEndUtc ? Date.parse(b.actualEndUtc) : NaN;
    const endedEarly = !Number.isNaN(actualEndMs) && actualEndMs < scheduledEndMs;
    if (!endedEarly && !b.released && !b.cancelled) continue;

    const freedFromMs = endedEarly ? actualEndMs + DAY_MS : Math.max(nowMs, Date.parse(b.scheduledStartUtc));
    if (Number.isNaN(freedFromMs) || freedFromMs > scheduledEndMs) continue;

    const from = utcDayKey(freedFromMs);
    const to = utcDayKey(scheduledEndMs);
    out.push({
      id: suggestionId('downtime-ended-early', b.tail, from, to),
      tail: b.tail,
      fromDateUtc: from,
      toDateUtc: to,
      trigger: 'downtime-ended-early',
      rationale: b.cancelled
        ? `${b.maintenanceType} was cancelled — the booked window is still on the board.`
        : endedEarly
          ? `${b.maintenanceType} finished ahead of the booked window.`
          : `${b.maintenanceType} is marked released — the booked window is still on the board.`,
      proposedPublicLabel: 'Back from maintenance early',
    });
  }
  return out;
}

/** A hold whose window is close and which nothing has been booked against. */
function holdUnclaimed(
  input: AvailabilityInput, overlays: SchedulerOverlay[], nowUtc: string,
): ReleaseSuggestion[] {
  const nowMs = Date.parse(nowUtc);
  const superseded = new Set(
    overlays.map(o => o.supersedesOverlayId).filter((id): id is string => Boolean(id)),
  );

  const out: ReleaseSuggestion[] = [];
  for (const o of overlays) {
    if (o.kind !== 'hold' || superseded.has(o.id)) continue;

    const fromMs = Date.parse(`${o.fromDateUtc}T00:00:00.000Z`);
    const toMs = Date.parse(`${o.toDateUtc}T00:00:00.000Z`);
    if (Number.isNaN(fromMs) || Number.isNaN(toMs) || toMs < nowMs) continue;
    if (fromMs - nowMs > UNCLAIMED_HOLD_WINDOW_DAYS * DAY_MS) continue;

    const held = new Set(dayRange(fromMs, toMs));
    const claimed = input.trips.some(
      t =>
        t.tail === o.tail &&
        t.status !== 'cancelled' &&
        dayRange(Date.parse(`${utcDayKey(Date.parse(t.startDate))}T00:00:00.000Z`), Date.parse(t.endDate))
          .some(d => held.has(d)),
    );
    if (claimed) continue;

    out.push({
      id: suggestionId('hold-unclaimed', o.tail, o.fromDateUtc, o.toDateUtc),
      tail: o.tail,
      fromDateUtc: o.fromDateUtc,
      toDateUtc: o.toDateUtc,
      trigger: 'hold-unclaimed',
      rationale: `Held since ${utcDayKey(Date.parse(o.createdAtUtc))} and still unbooked, with the window now inside ${UNCLAIMED_HOLD_WINDOW_DAYS} days.`,
      proposedPublicLabel: 'Released back to the fleet',
    });
  }
  return out;
}

/**
 * A no-crew day the SCHEDULER can actually resolve.
 *
 * Written first as `crew-recovered` — "a day that read no-crew now has a crew free" — which was
 * dead code, and the test that was supposed to prove it fires is what exposed that. A purely
 * derived engine has no stale verdict to recover from: the ladder only writes `no-crew` when
 * crewsFree is already zero, so the condition could never hold.
 *
 * The real signal is a different one, and it is honest: crews EXIST that day, they are simply all
 * committed. That is a rostering problem a scheduler can solve by reassigning, unlike a day where
 * no crew can be formed at all (nobody legal to fly), which no approval can fix. Only the former
 * is worth putting in front of them.
 */
function crewResolvable(fleet: FleetAvailability): ReleaseSuggestion[] {
  const out: ReleaseSuggestion[] = [];
  const seen = new Set<string>();

  for (const row of fleet.rows) {
    for (const cell of row.cells) {
      if (cell.reason.category !== 'no-crew') continue;
      // crewsFormable === 0 means nobody legal to fly — not something a release can answer.
      if (cell.crew.crewsFormable <= 0) continue;
      const key = `${row.tail}-${cell.dateUtc}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const { crewsFormable: formable, crewsCommitted: committed } = cell.crew;
      out.push({
        id: suggestionId('crew-resolvable', row.tail, cell.dateUtc, cell.dateUtc),
        tail: row.tail,
        fromDateUtc: cell.dateUtc,
        toDateUtc: cell.dateUtc,
        trigger: 'crew-resolvable',
        rationale: `${plural(formable, 'crew', 'crews')} can be formed and ${plural(committed, 'trip is', 'trips are')} already flying — reassignment could free this day.`,
        proposedPublicLabel: 'Crew reassigned — day available',
      });
    }
  }
  return out;
}

/** A cancelled trip whose days are still being read as committed by a stale hold or overlay. */
function tripCancelled(input: AvailabilityInput, fleet: FleetAvailability): ReleaseSuggestion[] {
  const out: ReleaseSuggestion[] = [];
  const cancelled = input.trips.filter(t => t.status === 'cancelled');

  for (const t of cancelled) {
    const startMs = Date.parse(`${utcDayKey(Date.parse(t.startDate))}T00:00:00.000Z`);
    const endMs = Date.parse(t.endDate);
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) continue;

    const days = new Set(dayRange(startMs, endMs));
    const row = fleet.rows.find(r => r.tail === t.tail);
    if (!row) continue;

    // Only worth proposing where the freed days are still not readable as available.
    const stillBlocked = row.cells.filter(
      c => days.has(c.dateUtc) && (c.state === 'held' || c.reason.category === 'no-crew'),
    );
    if (stillBlocked.length === 0) continue;

    const from = stillBlocked[0].dateUtc;
    const to = stillBlocked[stillBlocked.length - 1].dateUtc;
    out.push({
      id: suggestionId('trip-cancelled', t.tail, from, to),
      tail: t.tail,
      fromDateUtc: from,
      toDateUtc: to,
      trigger: 'trip-cancelled',
      rationale: `${t.tripNumber} was cancelled — these days are no longer needed for it.`,
      proposedPublicLabel: 'Freed by a cancellation',
    });
  }
  return out;
}

/**
 * Everything worth putting in front of scheduling, most-recent-window first.
 *
 * Suggestions covering a day the ladder reads as maintenance are dropped outright — that is the
 * safety line, enforced here rather than trusted to each trigger.
 */
export function deriveReleaseSuggestions(
  input: AvailabilityInput,
  fleet: FleetAvailability,
  overlays: SchedulerOverlay[],
  nowUtc: string,
): ReleaseSuggestion[] {
  const raw = [
    ...downtimeEndedEarly(input.downtime, nowUtc),
    ...holdUnclaimed(input, overlays, nowUtc),
    ...crewResolvable(fleet),
    ...tripCancelled(input, fleet),
  ];

  const byId = new Map<string, ReleaseSuggestion>();
  for (const s of raw) {
    if (isDismissed(s, overlays)) continue;
    if (alreadyReleased(s.tail, s.fromDateUtc, s.toDateUtc, overlays)) continue;
    if (proposesOverMaintenance(s, fleet)) continue;
    byId.set(s.id, s);
  }

  const sorted = [...byId.values()].sort(
    (a, b) =>
      TRIGGER_PRIORITY[a.trigger] - TRIGGER_PRIORITY[b.trigger] ||
      a.fromDateUtc.localeCompare(b.fromDateUtc) ||
      a.tail.localeCompare(b.tail),
  );

  const crew = sorted.filter(s => s.trigger === 'crew-resolvable');
  const rest = sorted.filter(s => s.trigger !== 'crew-resolvable');
  return [...rest, ...crew.slice(0, MAX_CREW_SUGGESTIONS)];
}

/**
 * The one thing no suggestion may do. A day the ladder currently reads as maintenance is either
 * inside a live downtime window or on a RED tail with no block; in both cases nothing observable
 * says the aeroplane may fly, so there is nothing to propose releasing.
 */
function proposesOverMaintenance(s: ReleaseSuggestion, fleet: FleetAvailability): boolean {
  const row = fleet.rows.find(r => r.tail === s.tail);
  if (!row) return false;
  return row.cells.some(
    c =>
      c.dateUtc >= s.fromDateUtc &&
      c.dateUtc <= s.toDateUtc &&
      c.reason.category === 'maintenance',
  );
}

/** The overlay an approval appends. Kept here so approve/dismiss share one shape. */
export function overlayFromSuggestion(
  suggestion: ReleaseSuggestion,
  decision: 'approve' | 'dismiss',
  by: { name: string; role: string },
  nowUtc: string,
  publicLabel?: string,
): SchedulerOverlay {
  return {
    id: `ov-${decision}-${suggestion.id}`,
    kind: decision === 'approve' ? 'release' : 'dismissal',
    tail: suggestion.tail,
    fromDateUtc: suggestion.fromDateUtc,
    toDateUtc: suggestion.toDateUtc,
    reasonNote: suggestion.rationale,
    publicLabel: decision === 'approve' ? (publicLabel ?? suggestion.proposedPublicLabel) : null,
    createdBy: by.name,
    createdByRole: by.role,
    createdAtUtc: nowUtc,
    fromSuggestionId: suggestion.id,
  };
}
