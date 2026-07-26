import type { TechLogState, Trip } from '../types';
import { deriveServiceability } from './serviceability';
import { requiresFuelFarmSubmission } from './fuel';
import { deferralsRequiringAck } from './handover';

export type TripReadiness = 'RED' | 'NOT_READY' | 'READY';

export interface TripReadinessResult {
  state: TripReadiness;
  blocker?: string;
  drivingLegId?: string;
  computedAtUtc: string;
}

const FRAT_NO_GO = 25;

export function deriveTripReadiness(
  trip: Trip,
  state: Pick<TechLogState, 'aircraft' | 'defects' | 'deferrals'> &
    Partial<Pick<TechLogState, 'recurringChecks' | 'recurringAccomplishments' | 'melItems' | 'briefings'>>,
  asOfUtc: string,
): TripReadinessResult {
  const verdict = (s: TripReadiness, extra: Partial<TripReadinessResult> = {}): TripReadinessResult =>
    ({ state: s, computedAtUtc: asOfUtc, ...extra });

  // Highest precedence: aircraft serviceability.
  if (deriveServiceability(trip.aircraftId, state, asOfUtc).status === 'RED') {
    return verdict('RED', { blocker: 'Aircraft grounded (RED)' });
  }

  const aircraft = state.aircraft.find(a => a.id === trip.aircraftId);
  const legs = trip.legs ?? [];

  // (2) A FRAT no-go (>= 25) grounds the trip independently of serviceability — evaluated only after the aircraft-RED check above.
  const noGo = legs.find(l => l.fratScore != null && l.fratScore >= FRAT_NO_GO);
  if (noGo) return verdict('RED', { blocker: 'FRAT no-go (>= 25)', drivingLegId: noGo.id });

  // (3) An ACTIVE deferral requiring PIC acknowledgement (restriction/placard/(O) procedure) that
  // hasn't actually been acknowledged via the latest briefing — must agree with the BriefingPanel
  // acceptance gate (handover.ts) rather than being silently invisible to trip dispatch.
  // TL-16: no `melItems` — the (O) procedure is read from the frozen deferral, so trip dispatch and
  // the briefing acceptance gate cannot diverge when a MelItem is edited underneath them.
  const ackRequired = deferralsRequiringAck(trip.aircraftId, { deferrals: state.deferrals }, asOfUtc);
  if (ackRequired.length) {
    const latestBriefing = (state.briefings ?? [])
      .filter(b => b.aircraftId === trip.aircraftId && b.status === 'ACKNOWLEDGED')
      .sort((a, b) => b.createdAtUtc.localeCompare(a.createdAtUtc))[0];
    const acked = new Set(latestBriefing?.acknowledgedDeferralIds ?? []);
    const unacked = ackRequired.find(d => !acked.has(d.id));
    if (unacked) return verdict('NOT_READY', { blocker: 'Deferral acknowledgement pending' });
  }

  // NOT_READY: outstanding pilot-owed preflight items.
  const fratPending = legs.find(l => l.fratStatus !== 'COMPLETED');
  if (fratPending) return verdict('NOT_READY', { blocker: 'FRAT incomplete', drivingLegId: fratPending.id });

  const airportPending = legs.find(l => !l.airportReviewed);
  if (airportPending) return verdict('NOT_READY', { blocker: 'Airport review pending', drivingLegId: airportPending.id });

  const fuelPending = aircraft
    ? legs.find(l => requiresFuelFarmSubmission(l, aircraft) && !l.fuelRequestId)
    : undefined;
  if (fuelPending) return verdict('NOT_READY', { blocker: 'Home-base fuel not submitted', drivingLegId: fuelPending.id });

  return verdict('READY');
}
