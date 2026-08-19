import type { Trip, TripLeg, TechLogAction, FratRecord, FratRecordSection } from './types';
import { T_MINUS_COMMIT_HOURS } from './engine/dispatchWindow';

/** The submitted assessment as the form hands it over — the template's `icon` is ignored. */
export interface FratAssessmentSection {
  title: string;
  items: { id: string; label: string; score: number; selected: boolean }[];
}

/**
 * Freeze the assessment as the pilot saw it: labels and scores as literals, never indices
 * into a template the builder can later edit. Drops anything else the caller passed
 * (notably `icon`, a React component reference).
 */
function freezeAssessment(sections: FratAssessmentSection[]): FratRecordSection[] {
  return sections.map((s) => ({
    title: s.title,
    items: s.items.map(({ id, label, score, selected }) => ({ id, label, score, selected })),
  }));
}

interface Base {
  dispatch: (a: TechLogAction) => void;
  newId: (prefix: string) => string;
  trip: Trip;
  leg: TripLeg;
  actorOid: string;
}

function patchLeg(
  { dispatch, newId, trip, leg, actorOid }: Base,
  patch: Partial<TripLeg>,
  action: string,
  summary: string,
): void {
  const updated: Trip = { ...trip, legs: (trip.legs ?? []).map((l) => (l.id === leg.id ? { ...l, ...patch } : l)) };
  dispatch({ type: 'EDIT_TRIP', payload: updated });
  dispatch({ type: 'ADD_AUDIT', payload: {
    id: newId('aud'), actorOid, action, entityType: 'TripLeg', entityId: leg.id,
    atUtc: new Date().toISOString(), summary,
  } });
}

export function completeFratOnLeg(
  args: Base & {
    totalScore?: number;
    /** Omit and the leg keeps only a score — the pre-2026-07-14 behaviour, retained for older call sites. */
    assessment?: FratAssessmentSection[];
    mitigationNotes?: string;
    additionalNotes?: string;
    nowUtc?: string;
  },
): void {
  // Appends rather than replaces: a resubmitted FRAT ("22 at 0600, 14 once the weather
  // cleared") must leave the earlier assessment readable. (Bryan, 2026-07-14)
  const records: FratRecord[] = [...(args.leg.fratRecords ?? [])];
  if (args.assessment) {
    records.push({
      score: args.totalScore ?? 0,
      sections: freezeAssessment(args.assessment),
      mitigationNotes: args.mitigationNotes,
      additionalNotes: args.additionalNotes,
      submittedAtUtc: args.nowUtc ?? new Date().toISOString(),
      submittedByOid: args.actorOid,
    });
  }

  patchLeg(
    args,
    {
      fratStatus: 'COMPLETED',
      fratScore: args.totalScore,
      // The draft is transient scratch; the record above is what survives. Before the
      // record existed, this line was the erasure — it wiped the only copy of the ticked
      // items and the mandatory mitigation plan. (TL-17)
      fratDraft: undefined,
      ...(records.length ? { fratRecords: records } : {}),
    },
    'LEG_FRAT_COMPLETED',
    `${args.trip.tripNumber} leg ${args.leg.sequence} FRAT score ${args.totalScore ?? '—'}`,
  );
}

export function saveFratDraftOnLeg(
  args: Base & { selections: boolean[][]; mitigationNotes?: string; nowUtc: string },
): void {
  patchLeg(args, {
    fratStatus: 'IN_PROGRESS',
    fratDraft: { selections: args.selections, mitigationNotes: args.mitigationNotes, savedAtUtc: args.nowUtc },
  }, 'LEG_FRAT_DRAFT_SAVED', `${args.trip.tripNumber} leg ${args.leg.sequence} FRAT draft saved`);
}

export function markAirportReviewedOnLeg(args: Base): void {
  patchLeg(args, { airportReviewed: true }, 'LEG_AIRPORT_REVIEWED',
    `${args.trip.tripNumber} leg ${args.leg.sequence} (${args.leg.departureIcao}→${args.leg.arrivalIcao}) airport reviewed`);
}

/**
 * How long before ETD a home-base fuel-farm request stops being accepted. Exported because the prep
 * matrix (D84) has to RENDER this boundary — show the lock time, and stop offering a button that
 * would be refused — and a second copy of `4` is exactly how the two would drift apart.
 *
 * This is THE boundary the rest of the app now aligns to; see `engine/dispatchWindow`.
 */
export const FUEL_LOCK_HOURS_BEFORE_ETD = T_MINUS_COMMIT_HOURS;

export function submitFuelOnLeg(args: Base & { lbs: number; nowMs: number }): { ok: true } | { ok: false; error: string } {
  const hoursUntil = (new Date(args.leg.departureTimeUtc).getTime() - args.nowMs) / 3_600_000;
  if (hoursUntil <= FUEL_LOCK_HOURS_BEFORE_ETD) return { ok: false, error: 'Locked — less than 4 hours to departure' };
  if (!Number.isFinite(args.lbs) || args.lbs <= 0) return { ok: false, error: 'Enter a valid fuel quantity' };
  const id = args.newId('fr');
  patchLeg(args, { fuelRequestId: id }, 'LEG_FUEL_SUBMITTED',
    `${args.trip.tripNumber} leg ${args.leg.sequence} fuel ${args.lbs} lb submitted to ${args.leg.departureIcao} fuel farm`);
  return { ok: true };
}

export function setPlannedFuelOnLeg(args: Base & { lbs: number }): void {
  patchLeg(args, { plannedFuelLb: args.lbs }, 'LEG_PLANNED_FUEL_SET',
    `${args.trip.tripNumber} leg ${args.leg.sequence} planned fuel set to ${args.lbs} lb`);
}

export function markFuelFinalOnLeg(args: Base & { nowUtc: string }): void {
  patchLeg(args, { fuelFinalizedByOid: args.actorOid, fuelFinalizedAtUtc: args.nowUtc }, 'LEG_FUEL_FINALIZED',
    `${args.trip.tripNumber} leg ${args.leg.sequence} fuel finalized at ${args.leg.plannedFuelLb ?? '—'} lb`);
}
