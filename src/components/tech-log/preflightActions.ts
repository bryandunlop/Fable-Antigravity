import type { Trip, TripLeg, TechLogAction } from './types';

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

export function completeFratOnLeg(args: Base & { totalScore?: number }): void {
  patchLeg(args, { fratStatus: 'COMPLETED', fratScore: args.totalScore, fratDraft: undefined }, 'LEG_FRAT_COMPLETED',
    `${args.trip.tripNumber} leg ${args.leg.sequence} FRAT score ${args.totalScore ?? '—'}`);
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

export function submitFuelOnLeg(args: Base & { lbs: number; nowMs: number }): { ok: true } | { ok: false; error: string } {
  const hoursUntil = (new Date(args.leg.departureTimeUtc).getTime() - args.nowMs) / 3_600_000;
  if (hoursUntil <= 4) return { ok: false, error: 'Locked — less than 4 hours to departure' };
  if (!Number.isFinite(args.lbs) || args.lbs <= 0) return { ok: false, error: 'Enter a valid fuel quantity' };
  const id = args.newId('fr');
  patchLeg(args, { fuelRequestId: id }, 'LEG_FUEL_SUBMITTED',
    `${args.trip.tripNumber} leg ${args.leg.sequence} fuel ${args.lbs} lb submitted to ${args.leg.departureIcao} fuel farm`);
  return { ok: true };
}
