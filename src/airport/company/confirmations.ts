/**
 * Per-field confirmation — "when was this fact last checked and still true" (D54).
 *
 * A company page version records when someone last *changed* a page. It does not
 * record when someone last *checked it was still true*, so a page written in 2019
 * and still correct was indistinguishable from one written in 2019 and now wrong.
 * That single gap is what the officer worklist, the debrief feeder and the
 * self-populated warning were all waiting on.
 *
 * Confirmation is per FIELD, not per page. A crew coming off a trip confirms the
 * facts they just saw — the FBO, the customs timing — not a page they read. A
 * curfew changes rarely and an FBO contact constantly, so one clock for both is
 * wrong whichever way it is set. Page-level answers are DERIVED here (the oldest
 * present field governs), never stored.
 *
 * Two rules carry most of the correctness:
 *
 *  1. **Publishing a value is itself a confirmation.** Whoever published a field
 *     asserted it was true at that moment. Without this every freshly published
 *     page would read as "never confirmed" and the worklist would open full of
 *     noise on day one.
 *  2. **An edit invalidates a confirmation of that field only.** A confirmation
 *     pins the version it saw (D47's discipline). If the field's value changed
 *     since, the confirmation attests the OLD value and must not vouch for the
 *     new one — but an unrelated edit elsewhere on the page leaves it standing.
 *     That containment is the entire argument for per-field over per-page.
 *
 * Staleness is derived, never stored as a flag — the platform's projection
 * discipline, same as src/components/documents/engine/review.ts. All comparisons
 * are ISO date strings compared lexicographically in the operator zone; do not
 * reintroduce local-timezone Date math (see src/lib/operatorDate.ts).
 */

import { operatorTodayIso } from '../../lib/operatorDate';
import { CONFIRMABLE_FIELDS } from './pageStore';
import type {
  CompanyAirportPageContent,
  CompanyAirportPageVersion,
  ConfirmableField,
  ConfirmationSource,
  FieldConfirmation,
} from './pageStore';

// The records themselves live in pageStore alongside the other stored shapes;
// this module owns the derivation over them.
export { CONFIRMABLE_FIELDS };
export type { ConfirmableField, ConfirmationSource, FieldConfirmation };

export const FIELD_LABEL: Record<ConfirmableField, string> = {
  ppr: 'PPR',
  curfew: 'Curfew',
  opsNotes: 'Ops notes',
  fboPreference: 'FBO preference',
  rampHandlingLimits: 'Ramp & handling limits',
};

/**
 * How long a field's confirmation stays good, in days.
 *
 * These are product defaults chosen from how fast each fact moves in practice —
 * an FBO contact turns over far faster than a curfew. They are NOT a regulatory
 * cadence and nothing authoritative sets them; they are overridable per airport
 * and should be put to the chief pilot before anyone treats them as policy.
 */
export const DEFAULT_CADENCE_DAYS: Record<ConfirmableField, number> = {
  ppr: 180,
  curfew: 365,
  opsNotes: 180,
  fboPreference: 90,
  rampHandlingLimits: 365,
};

/** How long before the due date a field starts warning. Matches the documents engine. */
export const DUE_SOON_DAYS = 30;

export type ConfirmationStatus = 'not-applicable' | 'ok' | 'due-soon' | 'overdue';

export type PageConfirmationStatus = ConfirmationStatus | 'no-page';

export interface LastConfirmed {
  atUtc: string;
  by: string;
  via: ConfirmationSource | 'publish';
}

export interface FieldConfirmationState {
  field: ConfirmableField;
  /** False when the field carries no value — there is nothing to confirm. */
  present: boolean;
  lastConfirmed: LastConfirmed | null;
  /** Operator-zone ISO date the field falls due, or null when not applicable. */
  dueDateIso: string | null;
  status: ConfirmationStatus;
}

export interface PageConfirmationSummary {
  status: PageConfirmationStatus;
  /** True until a human has explicitly confirmed at least one field — a publish does not count. */
  neverConfirmed: boolean;
  /** The governing date: the oldest confirmation across fields that carry a value. */
  oldestConfirmedAtUtc: string | null;
  /** The soonest date any present field falls due. */
  nextDueDateIso: string | null;
  overdueFields: ConfirmableField[];
  dueSoonFields: ConfirmableField[];
}

export type CadenceOverrides = Partial<Record<ConfirmableField, number>>;

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function valueOf(content: CompanyAirportPageContent, field: ConfirmableField): string | null {
  return content[field];
}

/** Versions for one airport, oldest first. */
function ordered(versions: readonly CompanyAirportPageVersion[]): CompanyAirportPageVersion[] {
  return [...versions].sort((a, b) => a.version - b.version);
}

/**
 * The version that last changed this field's value — the moment the current value
 * was asserted. Clearing a value counts as a change, so a field that was emptied
 * does not keep aging against the value it used to hold.
 *
 * Null when the field has never carried a value.
 */
export function versionThatLastChanged(
  versions: readonly CompanyAirportPageVersion[],
  field: ConfirmableField,
): CompanyAirportPageVersion | null {
  const history = ordered(versions);
  let previous: string | null = null;
  let changedAt: CompanyAirportPageVersion | null = null;
  let everSet = false;

  for (const version of history) {
    const value = valueOf(version.content, field);
    if (value !== previous) {
      changedAt = version;
      previous = value;
    }
    if (value !== null) everSet = true;
  }

  if (!everSet) return null;
  return changedAt;
}

/**
 * When this field was last confirmed, and by whom.
 *
 * The later of: the publish that set the current value, and the newest explicit
 * confirmation that still vouches for that value. A confirmation stops vouching
 * once the field has been edited underneath it.
 */
export function lastConfirmedAt(
  versions: readonly CompanyAirportPageVersion[],
  confirmations: readonly FieldConfirmation[],
  field: ConfirmableField,
): LastConfirmed | null {
  const history = ordered(versions);
  const current = history[history.length - 1];
  if (!current) return null;
  if (valueOf(current.content, field) === null) return null;

  const setBy = versionThatLastChanged(versions, field);
  if (!setBy) return null;

  let best: LastConfirmed = {
    atUtc: setBy.publishedAtUtc,
    by: setBy.publishedBy,
    via: 'publish',
  };

  const currentValue = valueOf(current.content, field);

  for (const confirmation of confirmations) {
    if (confirmation.field !== field) continue;

    // Does the version they saw still hold the value we hold now? If the field
    // was edited since, their confirmation is about the old wording.
    const seen = history.find((version) => version.id === confirmation.versionIdSeen);
    if (!seen) continue;
    if (valueOf(seen.content, field) !== currentValue) continue;

    // `>=`, not `>`. A confirmation stamped in the same millisecond as the
    // publish is still a human checking the fact, and it is the later record by
    // insertion order. Strict `>` silently discarded it, which showed up as a
    // just-confirmed field still reading "never checked since".
    if (confirmation.confirmedAtUtc >= best.atUtc) {
      best = {
        atUtc: confirmation.confirmedAtUtc,
        by: confirmation.confirmedBy,
        via: confirmation.source,
      };
    }
  }

  return best;
}

export function fieldConfirmationState(
  versions: readonly CompanyAirportPageVersion[],
  confirmations: readonly FieldConfirmation[],
  field: ConfirmableField,
  todayIso: string = operatorTodayIso(),
  cadence: CadenceOverrides = {},
): FieldConfirmationState {
  const lastConfirmed = lastConfirmedAt(versions, confirmations, field);

  if (!lastConfirmed) {
    return { field, present: false, lastConfirmed: null, dueDateIso: null, status: 'not-applicable' };
  }

  const days = cadence[field] ?? DEFAULT_CADENCE_DAYS[field];
  // The instant is converted to a calendar day in the operator zone before any
  // date arithmetic — a 00:30Z confirmation belongs to the previous ET day.
  const confirmedDay = operatorTodayIso(new Date(lastConfirmed.atUtc));
  const dueDateIso = addDays(confirmedDay, days);

  let status: ConfirmationStatus = 'ok';
  if (todayIso >= dueDateIso) {
    status = 'overdue';
  } else if (todayIso >= addDays(dueDateIso, -DUE_SOON_DAYS)) {
    status = 'due-soon';
  }

  return { field, present: true, lastConfirmed, dueDateIso, status };
}

export function confirmationStates(
  versions: readonly CompanyAirportPageVersion[],
  confirmations: readonly FieldConfirmation[],
  todayIso: string = operatorTodayIso(),
  cadence: CadenceOverrides = {},
): FieldConfirmationState[] {
  return CONFIRMABLE_FIELDS.map((field) =>
    fieldConfirmationState(versions, confirmations, field, todayIso, cadence),
  );
}

const SEVERITY: Record<ConfirmationStatus, number> = {
  'not-applicable': 0,
  ok: 1,
  'due-soon': 2,
  overdue: 3,
};

export function pageConfirmationSummary(
  versions: readonly CompanyAirportPageVersion[],
  confirmations: readonly FieldConfirmation[],
  todayIso: string = operatorTodayIso(),
  cadence: CadenceOverrides = {},
): PageConfirmationSummary {
  if (versions.length === 0) {
    return {
      status: 'no-page',
      neverConfirmed: true,
      oldestConfirmedAtUtc: null,
      nextDueDateIso: null,
      overdueFields: [],
      dueSoonFields: [],
    };
  }

  const states = confirmationStates(versions, confirmations, todayIso, cadence);
  const present = states.filter((state) => state.present);

  const worst = present.reduce<ConfirmationStatus>(
    (acc, state) => (SEVERITY[state.status] > SEVERITY[acc] ? state.status : acc),
    present.length > 0 ? 'ok' : 'not-applicable',
  );

  const oldest = present.reduce<string | null>(
    (acc, state) =>
      acc === null || (state.lastConfirmed !== null && state.lastConfirmed.atUtc < acc)
        ? (state.lastConfirmed?.atUtc ?? acc)
        : acc,
    null,
  );

  const nextDue = present.reduce<string | null>(
    (acc, state) =>
      acc === null || (state.dueDateIso !== null && state.dueDateIso < acc)
        ? (state.dueDateIso ?? acc)
        : acc,
    null,
  );

  return {
    status: worst,
    // Derived from the CURRENT fields, not from confirmation history. A publish
    // is the author asserting their own edit, so it never clears "nobody has
    // checked this" — and neither does a confirmation of a value that has since
    // been edited or cleared, because it no longer vouches for anything on the
    // page. Reading history instead let a page whose only confirmed field was
    // later cleared drop off the board entirely, with nothing on it ever
    // human-checked.
    neverConfirmed: !present.some(
      (state) => state.lastConfirmed !== null && state.lastConfirmed.via !== 'publish',
    ),
    oldestConfirmedAtUtc: oldest,
    nextDueDateIso: nextDue,
    overdueFields: present.filter((s) => s.status === 'overdue').map((s) => s.field),
    dueSoonFields: present.filter((s) => s.status === 'due-soon').map((s) => s.field),
  };
}
