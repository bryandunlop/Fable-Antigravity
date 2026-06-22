import type { TechLogState } from '../types';
import { currentRows } from './supersede';

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
  // Use currentRows to fold superseded postflights — a superseded postflight must not appear
  // as a live custody event (which would double-count it alongside its replacement).
  for (const p of currentRows(state.postflights).filter(p => p.aircraftId === aircraftId)) {
    events.push({ at: p.performedAtUtc, state: 'IN_MAINTENANCE', postflightId: p.id });
  }

  // Tie-break: on equal timestamps the later-stage state wins
  // (e.g. a reclaim at the same instant as an ack resolves to IN_MAINTENANCE > WITH_CREW > OFFERED).
  const rank: Record<CustodyState, number> = { OFFERED: 1, WITH_CREW: 2, IN_MAINTENANCE: 3 };
  const past = events
    .filter(e => e.at <= asOfUtc)
    .sort((a, b) => a.at.localeCompare(b.at) || rank[a.state] - rank[b.state]);
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
