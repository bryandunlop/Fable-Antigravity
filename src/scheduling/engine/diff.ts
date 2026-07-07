// Pure trip change detection for reconcile (Phase 2). Operates on a minimal structural shape
// so the engine stays free of store imports; store/TripRecord satisfies it structurally.

export interface LegSnapshot {
  id: string;
  departureTimeUtc: string;
  arrivalTimeUtc?: string;
  paxCount: number;
}
export interface TripSnapshot {
  tail: string;
  aircraftType: string;
  legs: LegSnapshot[];
}

export interface LegChange {
  rescheduled: boolean;
  paxDelta: number;
}
export interface TripDiff {
  aircraftChanged: boolean;
  /** Keyed by leg id, for legs present in BOTH versions. Added/removed legs are discovered by
   *  reconcile's desired-vs-existing instance comparison, not enumerated here. */
  legChanges: Record<string, LegChange>;
}

export function diffTrip(prev: TripSnapshot, next: TripSnapshot): TripDiff {
  const aircraftChanged = prev.tail !== next.tail || prev.aircraftType !== next.aircraftType;
  const prevById = new Map(prev.legs.map((l) => [l.id, l]));
  const legChanges: Record<string, LegChange> = {};
  for (const n of next.legs) {
    const p = prevById.get(n.id);
    if (!p) continue; // an added leg — keyed by id so leg REORDERING (same ids) is a no-op here
    legChanges[n.id] = {
      rescheduled: p.departureTimeUtc !== n.departureTimeUtc || p.arrivalTimeUtc !== n.arrivalTimeUtc,
      paxDelta: n.paxCount - p.paxCount,
    };
  }
  return { aircraftChanged, legChanges };
}
