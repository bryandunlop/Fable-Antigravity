import type { TripRecord } from '../../scheduling/store/types';
import type { Readiness } from '../../scheduling/engine/readiness';
import type { TripReadinessResult } from '../tech-log/engine/readiness';

export interface PilotReadiness {
  state: 'READY' | 'NOT_READY' | 'BLOCKED';
  blocker?: string;
  scheduling: Readiness;
  preflight: TripReadinessResult | null;
}

const ACTIVE_STATUSES: ReadonlySet<TripRecord['status']> = new Set(['planning', 'confirmed', 'in_progress']);

function firstDeparture(t: TripRecord): number {
  const times = (t.legs ?? []).map((l) => new Date(l.departureTimeUtc).getTime()).filter(Number.isFinite);
  return times.length ? Math.min(...times) : Number.MAX_SAFE_INTEGER;
}

/** Trips a pilot should see in their hub: active status, soonest departure first. Volume-seed
 *  trips are board-scale filler for the scheduler surfaces, not the pilot's flights — excluded
 *  here (stands in for crew assignment until trips carry a crew list). */
export function selectPilotFlights(trips: TripRecord[], _nowUtc: string): TripRecord[] {
  return trips
    .filter((t) => ACTIVE_STATUSES.has(t.status) && t.createdBy !== 'volume-seed')
    .sort((a, b) => firstDeparture(a) - firstDeparture(b));
}

/** One pilot verdict from the scheduling checklist + the richer tech-log preflight readiness. */
export function composePilotReadiness(
  scheduling: Readiness,
  preflight: TripReadinessResult | null,
): PilotReadiness {
  const base = { scheduling, preflight };
  if (!preflight) return { state: 'NOT_READY', blocker: 'Not released to preflight', ...base };
  if (preflight.state === 'RED') return { state: 'BLOCKED', blocker: preflight.blocker ?? 'Aircraft unserviceable', ...base };
  if (scheduling.state === 'BLOCKED') return { state: 'BLOCKED', blocker: scheduling.blocker ?? 'Coordination blocked', ...base };
  if (preflight.state === 'NOT_READY') return { state: 'NOT_READY', blocker: preflight.blocker ?? 'Preflight incomplete', ...base };
  if (scheduling.state === 'NOT_READY') return { state: 'NOT_READY', blocker: scheduling.blocker ?? 'Coordination incomplete', ...base };
  return { state: 'READY', ...base };
}
