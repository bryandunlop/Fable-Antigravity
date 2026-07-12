import type { StorageLike } from '../../../notifications/storage';
import { STORAGE_KEY, VERSION_KEY, DATA_VERSION } from '../storageKeys';
import { getSeedState } from '../mockData';
import type { FirState, FlightIrregularityReport } from '../types';

/** Read-only snapshot of the FIR store for surfaces rendered OUTSIDE FirProvider
 * (e.g. a leadership dashboard chip). Mirrors FirContext.loadInitialState but never
 * writes — the same read-only "contributor" pattern the notifications feed uses to
 * read tech-log/inventory state without their providers in scope. */
export function readFirState(storage: StorageLike): FirState {
  if (storage.getItem(VERSION_KEY) !== DATA_VERSION) return getSeedState();
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? { ...getSeedState(), ...JSON.parse(raw) } : getSeedState();
  } catch {
    return getSeedState();
  }
}

/** "In progress" = still being assembled or in review; not yet published or closed. */
export function firsInProgress(firs: FlightIrregularityReport[]): FlightIrregularityReport[] {
  return firs.filter(f => f.status === 'OPEN' || f.status === 'IN_REVIEW');
}

/** Newest touch on a FIR — used to show "latest activity" without a mutation log. */
export function firLastActivityUtc(f: FlightIrregularityReport): string {
  const times = [
    f.openedAtUtc,
    ...f.audit.map(a => a.atUtc),
    ...f.manualTimeline.map(e => e.atUtc),
    ...f.statements.flatMap(s => [s.requestedAtUtc, s.respondedAtUtc]),
  ].filter((t): t is string => Boolean(t));
  return times.reduce((a, b) => (b > a ? b : a), f.openedAtUtc);
}

export interface FirInProgressSummary {
  count: number;
  latestAtUtc?: string;
}

export function firInProgressSummary(firs: FlightIrregularityReport[]): FirInProgressSummary {
  const inProgress = firsInProgress(firs);
  const latestAtUtc = inProgress.length
    ? inProgress.map(firLastActivityUtc).reduce((a, b) => (b > a ? b : a))
    : undefined;
  return { count: inProgress.length, latestAtUtc };
}
