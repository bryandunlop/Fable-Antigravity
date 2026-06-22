import type { TechLogState } from '../types';
import { deriveCustody } from './custody';
import { currentRows } from './supersede';

export type LifecycleStep = 'PREFLIGHT' | 'RELEASED' | 'ACCEPTED' | 'IN_SERVICE';

/** Current lifecycle step (design spec §2), derived from custody + whether a leg has flown since acceptance. */
export function lifecycleStep(
  aircraftId: string,
  state: Pick<TechLogState, 'briefings' | 'postflights' | 'flightLogs'>,
  asOfUtc: string,
): { step: LifecycleStep; custody: ReturnType<typeof deriveCustody> } {
  const custody = deriveCustody(aircraftId, state, asOfUtc);
  if (custody.state === 'IN_MAINTENANCE') return { step: 'PREFLIGHT', custody };
  if (custody.state === 'OFFERED') return { step: 'RELEASED', custody };
  // WITH_CREW: accepted at custody.sinceUtc; IN_SERVICE once a leg flew at/after that
  const acceptedAt = custody.sinceUtc ?? '';
  const flown = currentRows(state.flightLogs).some(
    f => f.aircraftId === aircraftId && f.flightDateUtc >= acceptedAt && f.flightDateUtc <= asOfUtc,
  );
  return { step: flown ? 'IN_SERVICE' : 'ACCEPTED', custody };
}
