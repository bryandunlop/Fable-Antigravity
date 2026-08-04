/**
 * Work Log data layer: local-first, with an outbox for writes made offline.
 *
 * The phone is the primary client and it gets used in hangars and on ramps,
 * where there is frequently no usable signal. So a write must never be lost and
 * never block the UI: every mutation lands in local state and localStorage
 * immediately, and is queued for the server. The queue drains on load, when the
 * browser reports it is back online, and after each successful write.
 *
 * Conflict handling is deliberately absent. This is a single-user log on a
 * single phone — last write wins is not a compromise here, it is correct.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { todayLocal, type WorkLogEntry } from './workLog';

const API = '/api/worklog';
const CACHE_KEY = 'worklog.entries.v1';
const OUTBOX_KEY = 'worklog.outbox.v1';
/** The derivation, shipped as a static asset. See scripts/derive-work-sessions.ts --bundle. */
const SEED_URL = '/worklog-seed.json';
/** Set once the bundle has been applied, so deleting a derived row keeps it deleted. */
const SEEDED_KEY = 'worklog.seeded.v1';

type Op =
  | { kind: 'create'; entry: WorkLogEntry }
  | { kind: 'bulk'; entries: WorkLogEntry[] }
  | { kind: 'update'; id: string; patch: Partial<WorkLogEntry> }
  | { kind: 'delete'; id: string };

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // A full or unavailable localStorage must not take the page down. The
    // server copy is still authoritative; this is only the offline cache.
  }
}

/**
 * The derived sessions, applied once per device.
 *
 * Why the page ships with them rather than only reading them from the server:
 * it has to be useful the first time it is opened on a phone — no migration
 * run, no script run, possibly no signal. The bundle makes the full history
 * present on first paint; the outbox then pushes it to the database when one is
 * reachable. Ids are deterministic, so that push cannot duplicate what a CLI
 * seed already wrote.
 *
 * Guarded on a stored flag rather than on "is the log empty", or deleting a
 * derived row you disagreed with would resurrect it on the next load.
 *
 * The flag is claimed SYNCHRONOUSLY, before the fetch rather than after it.
 * React invokes mount effects twice in development; with the write after the
 * await, both calls passed the check before either had claimed it and the whole
 * bundle uploaded twice. Nothing was corrupted — ids are deterministic and
 * conflicts do nothing — but it was a wasted upload of every session. Claiming
 * first closes that window, and the claim is released again if the fetch fails
 * so a later load can retry.
 */
async function readSeedBundle(): Promise<WorkLogEntry[] | null> {
  if (localStorage.getItem(SEEDED_KEY)) return null;
  const stamp = new Date().toISOString();
  localStorage.setItem(SEEDED_KEY, stamp);
  try {
    const res = await fetch(SEED_URL);
    if (!res.ok) throw new Error(String(res.status));
    const body = (await res.json()) as { entries?: Omit<WorkLogEntry, 'createdAt' | 'updatedAt'>[] };
    if (!Array.isArray(body.entries) || body.entries.length === 0) return null;
    return body.entries.map((e) => ({ ...e, createdAt: stamp, updatedAt: stamp }));
  } catch {
    // No bundle is not an error — the log just starts empty. Release the claim
    // so a load with working assets can still seed later.
    localStorage.removeItem(SEEDED_KEY);
    return null;
  }
}

/**
 * Ask the browser not to evict this origin's storage under pressure.
 *
 * Matters most in the case this page is built to survive: no database
 * configured, so the local copy IS the record until one appears. Best-effort by
 * definition — Safari grants it based on its own heuristics (home-screen
 * install helps) and may refuse. A refusal is not a failure worth surfacing;
 * the outbox and the CSV export are the real answers to durability.
 */
async function requestPersistentStorage(): Promise<void> {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch {
    // Not supported, or blocked. Nothing to do and nothing worth saying.
  }
}

async function send(op: Op): Promise<void> {
  const json = { 'Content-Type': 'application/json' };
  if (op.kind === 'create') {
    const res = await fetch(API, { method: 'POST', headers: json, body: JSON.stringify(op.entry) });
    if (!res.ok) throw new Error(`POST ${res.status}`);
    return;
  }
  if (op.kind === 'bulk') {
    const res = await fetch(`${API}/bulk`, {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ entries: op.entries }),
    });
    if (!res.ok) throw new Error(`POST bulk ${res.status}`);
    return;
  }
  if (op.kind === 'update') {
    const res = await fetch(`${API}/${op.id}`, {
      method: 'PATCH',
      headers: json,
      body: JSON.stringify(op.patch),
    });
    // A 404 means the row is gone server-side; replaying it forever helps nobody.
    if (!res.ok && res.status !== 404) throw new Error(`PATCH ${res.status}`);
    return;
  }
  const res = await fetch(`${API}/${op.id}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 404) throw new Error(`DELETE ${res.status}`);
}

/**
 * Why the last load failed, when it did.
 *
 * Deliberately not a single `offline` boolean. "Offline" was shown for every
 * failure, including a server that answered perfectly well to say the table did
 * not exist — so the page claimed no signal while sitting on good wifi, and the
 * one message that would have explained it was the one it could not show.
 */
export type LoadProblem =
  | { kind: 'network' }
  | { kind: 'setup'; hint: string }
  | { kind: 'server'; status: number };

export interface UseWorkLog {
  entries: WorkLogEntry[];
  loading: boolean;
  /** Number of writes not yet acknowledged by the server. */
  pending: number;
  /** Null when the last load succeeded; otherwise why it did not. */
  problem: LoadProblem | null;
  addEntry: (input: {
    minutes: number;
    category: string;
    note?: string;
    localDate?: string;
    source?: 'manual' | 'timer';
    startedAt?: string | null;
    endedAt?: string | null;
  }) => void;
  updateEntry: (id: string, patch: Partial<WorkLogEntry>) => void;
  deleteEntry: (id: string) => void;
  refresh: () => void;
}

export function useWorkLog(): UseWorkLog {
  const [entries, setEntries] = useState<WorkLogEntry[]>(() => readJson<WorkLogEntry[]>(CACHE_KEY, []));
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<LoadProblem | null>(null);
  const [pending, setPending] = useState(() => readJson<Op[]>(OUTBOX_KEY, []).length);
  const draining = useRef<Promise<void> | null>(null);

  const persist = useCallback((next: WorkLogEntry[]) => {
    setEntries(next);
    writeJson(CACHE_KEY, next);
  }, []);

  /**
   * Flushes the outbox. Returns the in-flight promise when already running, so
   * `await drain()` genuinely waits.
   *
   * It used to return undefined in that case, which made the guard silently
   * turn `await drain()` into a no-op. That cost the seeded history: the bulk
   * upload emptied the outbox while a `load()` issued moments earlier was still
   * in flight, and that response — taken before the upload landed, so empty —
   * was persisted over all 114 sessions. Ordering is the fix; re-applying the
   * outbox on merge cannot help once the outbox is legitimately empty.
   */
  const drain = useCallback((): Promise<void> => {
    if (draining.current) return draining.current;
    const run = (async () => {
      let queue = readJson<Op[]>(OUTBOX_KEY, []);
      while (queue.length > 0) {
        try {
          await send(queue[0]);
        } catch {
          break; // still offline — keep the rest of the queue for next time
        }
        queue = queue.slice(1);
        writeJson(OUTBOX_KEY, queue);
        setPending(queue.length);
      }
    })().finally(() => {
      draining.current = null;
    });
    draining.current = run;
    return run;
  }, []);

  const enqueue = useCallback(
    (op: Op) => {
      const queue = [...readJson<Op[]>(OUTBOX_KEY, []), op];
      writeJson(OUTBOX_KEY, queue);
      setPending(queue.length);
      void drain();
    },
    [drain],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API);
      if (!res.ok) {
        // The server answered — so this is a configuration problem, not a
        // connectivity one, and saying "offline" here would be a lie.
        const body = await res.json().catch(() => null as unknown);
        const hint = (body as { hint?: string } | null)?.hint;
        setProblem(hint ? { kind: 'setup', hint } : { kind: 'server', status: res.status });
        setLoading(false);
        return;
      }
      const body = (await res.json()) as { entries: WorkLogEntry[] };
      // Anything still queued has NOT reached the server yet, so the fetched
      // list is missing it. Re-apply the queue over the response, or a pending
      // write blinks out of the UI — and, worse, a freshly created empty table
      // would wipe the 114 seeded sessions that are still waiting to upload.
      const queued = readJson<Op[]>(OUTBOX_KEY, []);
      const pendingWrites = queued.flatMap((op) =>
        op.kind === 'create' ? [op.entry] : op.kind === 'bulk' ? op.entries : [],
      );
      const pendingDeletes = new Set(queued.flatMap((op) => (op.kind === 'delete' ? [op.id] : [])));
      // Server rows win on id — they are the durable copy of the same entry.
      const byId = new Map<string, WorkLogEntry>();
      for (const e of pendingWrites) byId.set(e.id, e);
      for (const e of body.entries) byId.set(e.id, e);
      const merged = [...byId.values()].filter((e) => !pendingDeletes.has(e.id));
      persist(merged);
      setProblem(null);
    } catch {
      // fetch itself threw — genuinely unreachable. Keep the cached copy.
      setProblem({ kind: 'network' });
    } finally {
      setLoading(false);
    }
  }, [persist]);

  useEffect(() => {
    // Seed BEFORE talking to the server, so the history is on screen at first
    // paint even with no signal and nothing configured.
    void (async () => {
      void requestPersistentStorage();
      const seeded = await readSeedBundle();
      if (seeded && seeded.length) {
        const existing = readJson<WorkLogEntry[]>(CACHE_KEY, []);
        const byId = new Map(seeded.map((e) => [e.id, e]));
        for (const e of existing) byId.set(e.id, e); // anything local already wins
        persist([...byId.values()]);
        enqueue({ kind: 'bulk', entries: seeded });
      }
      // Order matters: flush first, then read back. Reading before the flush
      // lands returns a server state that predates our own writes.
      await drain();
      await load();
    })();

    const onOnline = async () => {
      await drain();
      await load();
    };
    const listener = () => void onOnline();
    window.addEventListener('online', listener);
    return () => window.removeEventListener('online', listener);
    // Mount-only: this is a one-shot bootstrap, and re-running it on every
    // callback identity change would re-issue the seed request each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addEntry: UseWorkLog['addEntry'] = useCallback(
    (input) => {
      const stamp = new Date().toISOString();
      const entry: WorkLogEntry = {
        // Generated client-side so a retry after a lost response is a no-op
        // rather than a duplicate row.
        id: `wl_${crypto.randomUUID()}`,
        localDate: input.localDate ?? todayLocal(),
        minutes: input.minutes,
        category: input.category,
        source: input.source ?? 'manual',
        note: input.note ?? '',
        startedAt: input.startedAt ?? null,
        endedAt: input.endedAt ?? null,
        commits: null,
        createdAt: stamp,
        updatedAt: stamp,
      };
      persist([...entries, entry]);
      enqueue({ kind: 'create', entry });
    },
    [entries, persist, enqueue],
  );

  const updateEntry: UseWorkLog['updateEntry'] = useCallback(
    (id, patch) => {
      persist(
        entries.map((e) =>
          e.id === id ? { ...e, ...patch, updatedAt: new Date().toISOString() } : e,
        ),
      );
      enqueue({ kind: 'update', id, patch });
    },
    [entries, persist, enqueue],
  );

  const deleteEntry: UseWorkLog['deleteEntry'] = useCallback(
    (id) => {
      persist(entries.filter((e) => e.id !== id));
      enqueue({ kind: 'delete', id });
    },
    [entries, persist, enqueue],
  );

  return { entries, loading, pending, problem, addEntry, updateEntry, deleteEntry, refresh: load };
}
