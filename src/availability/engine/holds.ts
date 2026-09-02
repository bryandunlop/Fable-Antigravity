// Scheduling's overlay on the derived baseline — the declared-inventory half of the model.
//
// The overlay is APPEND-ONLY. Releasing a hold appends a `release` row naming the hold it
// supersedes; it never edits the hold. Same discipline as the ledger tables, for the same
// reason: who published what, and when, has to survive.
//
// The safety line, asserted in tests: a release can clear `held` and `no-crew`. It can NEVER
// clear `maintenance`. A scheduler who knows a crew is actually free may say so; nobody may
// declare a grounded aeroplane airworthy from a scheduling board.

import type {
  AppliedOverlay,
  AvailabilityReason,
  SchedulerOverlay,
  TailDayAvailability,
} from '../types';

/** Where a hold sits on the ladder in engine/availability.ts. */
const HOLD_RANK = 4;

/** Reason categories a release is permitted to clear. */
const RELEASABLE = new Set<AvailabilityReason['category']>(['held', 'no-crew', 'reserved']);

function coversDay(o: SchedulerOverlay, dateUtc: string): boolean {
  return o.fromDateUtc <= dateUtc && dateUtc <= o.toDateUtc;
}

/**
 * The overlay in force for a tail-day: the most recently created row covering it, ignoring any
 * that a later row supersedes. `dismissal` rows never take effect on a cell — they only stop a
 * suggestion resurfacing (see engine/suggestions.ts).
 */
export function activeOverlayFor(
  overlays: SchedulerOverlay[],
  tail: string,
  dateUtc: string,
): SchedulerOverlay | null {
  const superseded = new Set(
    overlays.map(o => o.supersedesOverlayId).filter((id): id is string => Boolean(id)),
  );

  const candidates = overlays
    .filter(o => o.tail === tail && o.kind !== 'dismissal' && !superseded.has(o.id) && coversDay(o, dateUtc))
    .sort((a, b) => Date.parse(a.createdAtUtc) - Date.parse(b.createdAtUtc));

  return candidates.length > 0 ? candidates[candidates.length - 1] : null;
}

function applied(o: SchedulerOverlay): AppliedOverlay {
  return {
    id: o.id,
    kind: o.kind,
    by: o.createdBy,
    byRole: o.createdByRole,
    atUtc: o.createdAtUtc,
    note: o.reasonNote,
    publicLabel: o.publicLabel,
  };
}

/**
 * Fold the overlay into a computed cell.
 *
 * A `hold` only bites on a day the engine already considered free — holding a tail that is in
 * the hangar changes nothing, and a hold must never mask a real blocker. A `release` clears a
 * releasable reason and drops to the next one in the stack, so releasing a `no-crew` day that is
 * also committed leaves it committed rather than making it available.
 */
export function applyOverlay(
  base: TailDayAvailability,
  overlay: SchedulerOverlay | null,
): TailDayAvailability {
  if (!overlay || overlay.kind === 'note' || overlay.kind === 'dismissal') {
    return overlay ? { ...base, overlay: applied(overlay) } : base;
  }

  if (overlay.kind === 'hold') {
    // A hold sits at HOLD_RANK, so it outranks a crew shortfall but never a booked downtime
    // window, a not-in-service airframe, a RED tail or a committed trip — see the RANK table in
    // engine/availability.ts, which is the authority. Guarding on rank rather than on state is
    // what keeps that true: holding a tail that is in the hangar must not repaint the cell as
    // merely "held".
    if (base.reason.rank <= HOLD_RANK) return { ...base, overlay: applied(overlay) };
    const reason: AvailabilityReason = {
      category: 'held',
      rank: HOLD_RANK,
      detail: overlay.reasonNote,
      untilUtc: overlay.toDateUtc,
      sourceRef: { kind: 'hold', id: overlay.id },
    };
    return {
      ...base,
      state: 'held',
      reason,
      reasons: [reason, ...base.reasons.filter(r => r.category !== 'none')],
      overlay: applied(overlay),
    };
  }

  // release
  if (!RELEASABLE.has(base.reason.category)) return { ...base, overlay: applied(overlay) };

  const remaining = base.reasons.filter(r => !RELEASABLE.has(r.category) && r.category !== 'none');
  const next = remaining[0];
  if (!next) {
    const none: AvailabilityReason = { category: 'none', rank: 5, detail: '', untilUtc: null };
    return { ...base, state: 'available', reason: none, reasons: [none], overlay: applied(overlay) };
  }
  return {
    ...base,
    state: next.category === 'committed' ? 'committed' : 'unavailable',
    reason: next,
    reasons: remaining,
    overlay: applied(overlay),
  };
}
