// Trip-vs-serviceability collision alerts (LG-25): joins upcoming trips (any
// source — scheduling store, myairops mirror) against the §14.2 DERIVED
// serviceability projection. PURE — the caller supplies state and the clock.
//
// Three findings, first-match-wins per trip:
//   RED_AT_ETD                — the aircraft is RED at a leg's departure time
//                               (open defect, expired deferral, or expired check).
//   DEFERRAL_EXPIRES_MID_TRIP — dispatchable at first ETD, but an ACTIVE
//                               calendar-clock deferral's due boundary falls inside
//                               the trip window: the aircraft goes RED mid-trip,
//                               possibly away from base.
//   ACTIVE_DEFERRAL_INFO      — dispatchable, but flying on an ACTIVE deferral
//                               (schedulers see the MEL clock context).
//
// Usage-based deferrals (usageDueThreshold, no calendar due date) cannot be
// projected onto a time window without planned hours/cycles per leg; they
// surface as ACTIVE_DEFERRAL_INFO with no dueUtc rather than a guessed expiry.

import type { TechLogState } from '../types';
import { deriveServiceability } from './serviceability';
import { currentRows } from './supersede';

export interface TripForAlerts {
  tripId: string;
  tripNumber: string;
  tail: string;
  legs: Array<{ legId: string; departureTimeUtc: string; arrivalTimeUtc?: string }>;
}

export type TripAlertKind = 'RED_AT_ETD' | 'DEFERRAL_EXPIRES_MID_TRIP' | 'ACTIVE_DEFERRAL_INFO';

export interface TripServiceabilityAlert {
  kind: TripAlertKind;
  severity: 'red' | 'amber';
  tripId: string;
  tripNumber: string;
  tail: string;
  legId?: string;
  /** The departure the alert anchors to (first affected leg, or first leg). */
  etdUtc: string;
  /** Deferral due boundary, when one drives the alert. */
  dueUtc?: string;
  drivingDefectId?: string;
  drivingDeferralId?: string;
  detail: string;
}

const SEVERITY_RANK: Record<TripAlertKind, number> = {
  RED_AT_ETD: 0,
  DEFERRAL_EXPIRES_MID_TRIP: 1,
  ACTIVE_DEFERRAL_INFO: 2,
};

/** Window extension when a final leg has no confirmed arrival time. */
export const UNKNOWN_ARRIVAL_GRACE_MS = 24 * 60 * 60 * 1000;

export function deriveTripServiceabilityAlerts(
  state: TechLogState,
  trips: TripForAlerts[],
  nowUtc: string,
): TripServiceabilityAlert[] {
  const alerts: TripServiceabilityAlert[] = [];

  for (const trip of trips) {
    if (trip.legs.length === 0) continue;
    const ac = state.aircraft.find(a => a.tailNumber === trip.tail);
    if (!ac) continue; // non-fleet/placeholder tail — nothing derivable

    const legs = [...trip.legs].sort((a, b) => a.departureTimeUtc.localeCompare(b.departureTimeUtc));
    const lastLeg = legs[legs.length - 1];
    // No confirmed arrival on the final leg (the "+ New Trip" dialog never sets
    // one): the trip is NOT over just because its last departure passed — the
    // aircraft may be airborne with a clock running. Cover it with a deliberate
    // 24h over-estimate (longer than any fleet leg) rather than a guessed
    // duration; erring long only extends the alert window, never shrinks it.
    const tripEndUtc = lastLeg.arrivalTimeUtc
      ?? new Date(new Date(lastLeg.departureTimeUtc).getTime() + UNKNOWN_ARRIVAL_GRACE_MS).toISOString();
    if (tripEndUtc < nowUtc) continue; // past its known (or grace-extended) end

    const remaining = legs.filter(l => l.departureTimeUtc >= nowUtc);
    const firstEtd = remaining[0]?.departureTimeUtc ?? legs[0].departureTimeUtc;

    const redAlertFor = (legId: string, etdUtc: string): TripServiceabilityAlert => {
      const r = deriveServiceability(ac.id, state, etdUtc);
      const defect = r.drivingDefectId ? state.defects.find(d => d.id === r.drivingDefectId) : undefined;
      // A lapsed deferral shows up as a rule-1 defect RED (the defect is no longer
      // covered) — surface the deferral row as context either way.
      const deferral = r.drivingDeferralId
        ? state.deferrals.find(d => d.id === r.drivingDeferralId)
        : defect
          ? currentRows(state.deferrals).find(d => d.defectId === defect.id)
          : undefined;
      return {
        kind: 'RED_AT_ETD',
        severity: 'red',
        tripId: trip.tripId, tripNumber: trip.tripNumber, tail: trip.tail,
        legId, etdUtc,
        ...(deferral?.repairDueDateUtc ? { dueUtc: deferral.repairDueDateUtc } : {}),
        ...(r.drivingDefectId ? { drivingDefectId: r.drivingDefectId } : {}),
        ...(deferral ? { drivingDeferralId: deferral.id } : {}),
        detail: defect
          ? defect.description
          : deferral
            ? `Cat ${deferral.category} deferral past its due boundary`
            : 'Dispatch-gating recurring check expired',
      };
    };

    // RED at the FIRST remaining departure -> the trip cannot launch at all.
    if (remaining.length > 0 &&
        deriveServiceability(ac.id, state, firstEtd).status === 'RED') {
      alerts.push(redAlertFor(remaining[0].legId, firstEtd));
      continue;
    }

    // Ongoing trip (every leg departed, still inside its known/grace window):
    // evaluate at NOW — a RED aircraft mid-trip is exactly the away-from-base
    // case the scheduler must see. Non-RED ongoing trips fall through so a
    // deferral boundary landing before the trip's end still raises mid-trip.
    if (remaining.length === 0 && deriveServiceability(ac.id, state, nowUtc).status === 'RED') {
      alerts.push(redAlertFor(lastLeg.legId, nowUtc));
      continue;
    }

    // Launchable — does an ACTIVE deferral's calendar clock run out inside the
    // trip window? (This also covers the "return leg would be RED" case: the
    // boundary sits between the outbound and the return.)
    const deferrals = currentRows(state.deferrals).filter(d => d.aircraftId === ac.id && d.status === 'ACTIVE');
    const midTrip = deferrals.find(
      d => d.repairDueDateUtc && d.repairDueDateUtc > firstEtd && d.repairDueDateUtc <= tripEndUtc,
    );
    if (midTrip) {
      alerts.push({
        kind: 'DEFERRAL_EXPIRES_MID_TRIP',
        severity: 'red',
        tripId: trip.tripId, tripNumber: trip.tripNumber, tail: trip.tail,
        etdUtc: firstEtd,
        dueUtc: midTrip.repairDueDateUtc,
        drivingDeferralId: midTrip.id,
        detail: `Cat ${midTrip.category} deferral clock runs out during this trip — aircraft goes RED away from base unless rectified or extended first`,
      });
      continue;
    }

    // Residual: a LATER leg RED for a non-deferral reason (e.g. a dispatch-gating
    // recurring check expiring between legs).
    const laterRed = remaining.slice(1).find(l => deriveServiceability(ac.id, state, l.departureTimeUtc).status === 'RED');
    if (laterRed) {
      alerts.push(redAlertFor(laterRed.legId, laterRed.departureTimeUtc));
      continue;
    }

    const active = deferrals[0];
    if (active) {
      alerts.push({
        kind: 'ACTIVE_DEFERRAL_INFO',
        severity: 'amber',
        tripId: trip.tripId, tripNumber: trip.tripNumber, tail: trip.tail,
        etdUtc: firstEtd,
        ...(active.repairDueDateUtc ? { dueUtc: active.repairDueDateUtc } : {}),
        drivingDeferralId: active.id,
        detail: active.repairDueDateUtc
          ? `Departing on an ACTIVE Cat ${active.category} deferral`
          : `Departing on an ACTIVE Cat ${active.category} deferral (usage-limited — monitor hours/cycles)`,
      });
    }
  }

  return alerts.sort(
    (a, b) => SEVERITY_RANK[a.kind] - SEVERITY_RANK[b.kind] || a.etdUtc.localeCompare(b.etdUtc),
  );
}
