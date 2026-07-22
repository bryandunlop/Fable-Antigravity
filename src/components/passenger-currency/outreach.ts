// Demo-local outreach tracking for the passenger-currency dashboard: which
// stale/expiring passengers have been sent an update-form link, and which have
// come back. localStorage-backed, myGFO-owned — this is the seed of the "last
// confirmed by passenger" signal. NOTE the actual outbound email and any CRM
// write-back are deliberately absent: both are gated on the pull-only-rule
// decision (LG-21). Buttons here only record scheduler intent.

import { useCallback, useSyncExternalStore } from 'react';

export type OutreachStatus = 'none' | 'link_sent' | 'received';

export interface OutreachEntry {
  status: OutreachStatus;
  atUtc: string;
}

const STORAGE_KEY = 'passenger-currency-outreach-v1';

type OutreachMap = Record<string, OutreachEntry>;

/** Stable key for a manifest passenger: CRM id when linked, name otherwise. */
export function outreachKey(p: { crmContactId?: number; name: string }): string {
  return p.crmContactId !== undefined ? `crm-${p.crmContactId}` : `name-${p.name}`;
}

function read(): OutreachMap {
  if (typeof localStorage === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as OutreachMap;
  } catch {
    return {};
  }
}

let cache: OutreachMap = read();
const listeners = new Set<() => void>();

function write(next: OutreachMap) {
  cache = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // demo storage full/unavailable — state stays in-memory
  }
  listeners.forEach(l => l());
}

export function useOutreach(): {
  outreach: OutreachMap;
  mark: (key: string, status: OutreachStatus) => void;
} {
  const outreach = useSyncExternalStore(
    cb => { listeners.add(cb); return () => listeners.delete(cb); },
    () => cache,
  );
  const mark = useCallback((key: string, status: OutreachStatus) => {
    write({ ...cache, [key]: { status, atUtc: new Date().toISOString() } });
  }, []);
  return { outreach, mark };
}
