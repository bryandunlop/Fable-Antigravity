// Pure grouping: per-trip serviceability alerts -> one card per aircraft
// (LG-27, option C from the layout mockups). A grounded aircraft with nine
// exposed trips is ONE problem with nine consequences — the card says the
// problem once and lists the trips as chips.

import type { TripServiceabilityAlert, TripAlertKind } from '../tech-log/bridge';

export interface AircraftAlertTripChip {
  tripId: string;
  tripNumber: string;
  etdUtc: string;
  kind: TripAlertKind;
}

export interface AircraftAlertGroup {
  tail: string;
  severity: 'red' | 'amber';
  /** The cause, said once: defect description or the deferral-clock line. */
  headline: string;
  dueUtc?: string;
  trips: AircraftAlertTripChip[];
  counts: { redAtEtd: number; midTrip: number; info: number };
  /** Latest exposed departure — the "through <date>" in the card header. */
  lastEtdUtc: string;
}

const KIND_PRIORITY: Record<TripAlertKind, number> = {
  RED_AT_ETD: 0,
  DEFERRAL_EXPIRES_MID_TRIP: 1,
  ACTIVE_DEFERRAL_INFO: 2,
};

export function groupAlertsByAircraft(alerts: TripServiceabilityAlert[]): AircraftAlertGroup[] {
  const byTail = new Map<string, TripServiceabilityAlert[]>();
  for (const a of alerts) {
    const bucket = byTail.get(a.tail);
    if (bucket) bucket.push(a);
    else byTail.set(a.tail, [a]);
  }

  const groups = [...byTail.entries()].map(([tail, rows]) => {
    const lead = [...rows].sort(
      (a, b) => KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind] || a.etdUtc.localeCompare(b.etdUtc),
    )[0];
    const trips = rows
      .map(a => ({ tripId: a.tripId, tripNumber: a.tripNumber, etdUtc: a.etdUtc, kind: a.kind }))
      .sort((a, b) => a.etdUtc.localeCompare(b.etdUtc));
    return {
      tail,
      severity: rows.some(a => a.severity === 'red') ? 'red' as const : 'amber' as const,
      headline: lead.detail,
      ...(rows.find(a => a.dueUtc)?.dueUtc ? { dueUtc: rows.find(a => a.dueUtc)!.dueUtc } : {}),
      trips,
      counts: {
        redAtEtd: rows.filter(a => a.kind === 'RED_AT_ETD').length,
        midTrip: rows.filter(a => a.kind === 'DEFERRAL_EXPIRES_MID_TRIP').length,
        info: rows.filter(a => a.kind === 'ACTIVE_DEFERRAL_INFO').length,
      },
      lastEtdUtc: trips[trips.length - 1].etdUtc,
    };
  });

  return groups.sort(
    (a, b) =>
      (a.severity === b.severity ? 0 : a.severity === 'red' ? -1 : 1) ||
      a.trips[0].etdUtc.localeCompare(b.trips[0].etdUtc),
  );
}
