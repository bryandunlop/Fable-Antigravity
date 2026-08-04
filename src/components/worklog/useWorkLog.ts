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

type Op =
  | { kind: 'create'; entry: WorkLogEntry }
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

async function send(op: Op): Promise<void> {
  const json = { 'Content-Type': 'application/json' };
  if (op.kind === 'create') {
    const res = await fetch(API, { method: 'POST', headers: json, body: JSON.stringify(op.entry) });
    if (!res.ok) throw new Error(`POST ${res.status}`);
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
  const draining = useRef(false);

  const persist = useCallback((next: WorkLogEntry[]) => {
    setEntries(next);
    writeJson(CACHE_KEY, next);
  }, []);

  const drain = useCallback(async () => {
    if (draining.current) return;
    draining.current = true;
    try {
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
    } finally {
      draining.current = false;
    }
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
      // Anything still queued is not on the server yet — re-apply it over the
      // fetched list so a pending write does not blink out of the UI.
      const queued = readJson<Op[]>(OUTBOX_KEY, []);
      const pendingCreates = queued.flatMap((op) => (op.kind === 'create' ? [op.entry] : []));
      const pendingDeletes = new Set(queued.flatMap((op) => (op.kind === 'delete' ? [op.id] : [])));
      const merged = [...body.entries, ...pendingCreates].filter((e) => !pendingDeletes.has(e.id));
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
    void load();
    void drain();
    const onOnline = () => {
      void drain();
      void load();
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [load, drain]);

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
