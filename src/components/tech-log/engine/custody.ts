import type { TechLogState } from '../types';

export type CustodyState = 'IN_MAINTENANCE' | 'OFFERED' | 'WITH_CREW';

export interface CustodyResult {
  state: CustodyState;
  sinceUtc?: string;
  drivingBriefingId?: string;
  drivingPostflightId?: string;
  computedAtUtc: string;
}

interface CustodyEvent {
  at: string;
  state: CustodyState;
  briefingId?: string;
  postflightId?: string;
}

/**
 * Derived custody projection (design §E). Custody is NEVER a stored flag — it is computed from the
 * append-only handover ledger: a briefing RELEASE offers the aircraft, the PIC ACK takes it (crew
 * custody), and a maintenance POSTFLIGHT reclaims it. Latest event at-or-before asOfUtc wins.
 * Reads only briefings + postflights — an outstation MaintenanceRelease must NOT move custody.
 */
export function deriveCustody(
  aircraftId: string,
  state: Pick<TechLogState, 'briefings' | 'postflights'>,
  asOfUtc: string,
): CustodyResult {
  const events: CustodyEvent[] = [];

  for (const b of state.briefings.filter(b => b.aircraftId === aircraftId)) {
    if (b.releasedAtUtc) events.push({ at: b.releasedAtUtc, state: 'OFFERED', briefingId: b.id });
    if (b.acknowledgedAtUtc) events.push({ at: b.acknowledgedAtUtc, state: 'WITH_CREW', briefingId: b.id });
  }
  for (const p of state.postflights.filter(p => p.aircraftId === aircraftId)) {
    events.push({ at: p.performedAtUtc, state: 'IN_MAINTENANCE', postflightId: p.id });
  }

  const past = events.filter(e => e.at <= asOfUtc).sort((a, b) => a.at.localeCompare(b.at));
  const last = past[past.length - 1];
  if (!last) return { state: 'IN_MAINTENANCE', computedAtUtc: asOfUtc };
  return {
    state: last.state,
    sinceUtc: last.at,
    drivingBriefingId: last.briefingId,
    drivingPostflightId: last.postflightId,
    computedAtUtc: asOfUtc,
  };
}
