// Persisted vacation-request store (LG-19 / D37).
//
// Requests previously lived in component state, so a submitted request evaporated
// the moment you navigated away — the crew member saw a success alert and then an
// empty list. Same store shape as src/utils/quickLinks.ts (useSyncExternalStore +
// localStorage + cached snapshot), so there is one house pattern rather than two.
//
// Demo-grade persistence on purpose: this is a leave request in an evaluation
// build, not a signed record. Signed regulatory records go to the server at the
// moment of signature and never rely on browser storage.
import { useSyncExternalStore } from 'react';
import type { RequestStatus, AuditComment } from './lifecycle';

export interface VacationRequestRecord {
  id: string;
  submitterId: string;
  submitterName: string;
  submitterPosition: string;
  requestType: string;
  startDate: string;
  endDate: string;
  daysRequested: number;
  status: RequestStatus;
  comments: AuditComment[];
  schedulingApproval?: 'approved' | 'tentative' | 'denied';
  managerApproval?: 'approved' | 'tentative' | 'denied';
  submittedDate: Date;
  lastModified: Date;
}

export const STORAGE_KEY = 'vacation-requests';

type Listener = () => void;
const listeners = new Set<Listener>();
let snapshot: VacationRequestRecord[] | null = null;

function storage(): Storage | null {
  return typeof localStorage === 'undefined' ? null : localStorage;
}

/** Dates survive JSON as strings; rehydrate them or every .toLocaleDateString() throws. */
function reviveDates(r: Record<string, unknown>): VacationRequestRecord {
  const rec = r as unknown as VacationRequestRecord;
  return {
    ...rec,
    submittedDate: new Date(rec.submittedDate),
    lastModified: new Date(rec.lastModified),
    comments: (rec.comments ?? []).map((c) => ({ ...c, timestamp: new Date(c.timestamp) })),
  };
}

export function loadRequests(seed: VacationRequestRecord[] = []): VacationRequestRecord[] {
  const raw = storage()?.getItem(STORAGE_KEY) ?? null;
  if (raw === null) return seed;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return seed;
    return parsed.map((r) => reviveDates(r as Record<string, unknown>));
  } catch {
    return seed;
  }
}

export function saveRequests(requests: VacationRequestRecord[]): void {
  storage()?.setItem(STORAGE_KEY, JSON.stringify(requests));
  snapshot = null;
  listeners.forEach((l) => l());
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Live view of the store. `seed` supplies the demo's starting rows only until the
 * user's first write — after that the stored set is authoritative, so a withdrawn
 * request cannot be resurrected by a reload (a bug the audit found in the hazard
 * store, where deleting a seed row silently brought it back).
 */
export function useVacationRequests(seed: VacationRequestRecord[] = []): VacationRequestRecord[] {
  return useSyncExternalStore(
    subscribe,
    () => {
      if (snapshot === null) snapshot = loadRequests(seed);
      return snapshot;
    },
    () => seed,
  );
}

/** Test/dev helper — drops persisted state so a demo can be reset. */
export function resetRequests(): void {
  storage()?.removeItem(STORAGE_KEY);
  snapshot = null;
  listeners.forEach((l) => l());
}
