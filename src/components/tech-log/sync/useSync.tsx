/**
 * The sync runtime (TL-38) — the send loop, the remote-change listener, and the presence heartbeat,
 * exposed to the UI as a context.
 *
 * WHAT THE UI GETS FROM THIS, and why each one exists:
 *
 *   - `summary` — queued / in-flight / conflicted counts, so a technician can see at a glance whether
 *     their morning's work has actually left the tablet. Today they cannot, and that is the part of
 *     TL-38 that bites: the work not being on the server is survivable; not *knowing* it isn't is not.
 *   - `stampFor(cardId)` — who last touched a card and when, per the server's clock. This is the
 *     "someone else has been on this" signal, and it is read from the server's stamp rather than any
 *     local mtime precisely so it survives being read on a different device.
 *   - `conflictsFor(cardId)` — the edits this device composed that the server refused. They are held,
 *     never dropped, until a person decides.
 *   - `presenceFor(cardId)` — who else has the card open right now. Advisory; nothing gates on it.
 *
 * TRANSPORT. `createLocalTransport` — the demo's stand-in server, which genuinely converges two tabs
 * on one machine and genuinely produces conflicts. Swapping in `createHttpTransport` is one line and
 * is the dev's call; see the header of `./httpTransport.ts`.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { PresenceRecord, StampedWorkCard, SyncOp, SyncOpKind, SyncOpPayloads, SyncTransport } from './contract';
import { PRESENCE_HEARTBEAT_MS } from './contract';
import { createLocalTransport, resetLocalServer } from './localTransport';
import { EMPTY_OUTBOX, discardConflict, enqueue, markAcked, markConflict, markFailed, markSent, nextSendable, outboxSummary, type Outbox, type OutboxEntry, type OutboxSummary } from './outbox';
import { useTechLog } from '../TechLogContext';
import { newId } from '../util/id';

const OUTBOX_KEY = 'tech-log-outbox';
/** How often the send loop wakes to look for due work. Short — a backoff is what paces retries. */
const TICK_MS = 750;

const loadOutbox = (): Outbox => {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    return raw ? (JSON.parse(raw) as Outbox) : EMPTY_OUTBOX;
  } catch {
    return EMPTY_OUTBOX;
  }
};

const saveOutbox = (o: Outbox) => {
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(o));
  } catch {
    /* quota */
  }
};

interface SyncCtx {
  summary: OutboxSummary;
  online: boolean;
  transportName: string;
  /** Server stamp for a card, or `undefined` if the server has never seen it. */
  stampFor: (workCardId: string) => StampedWorkCard['stamp'] | undefined;
  conflictsFor: (workCardId: string) => OutboxEntry[];
  presenceFor: (workCardId: string) => PresenceRecord[];
  /** Queue a mutation. Returns immediately — the send loop owns delivery. */
  submit: <K extends SyncOpKind>(kind: K, workCardId: string, payload: SyncOpPayloads[K]) => void;
  /** Tell the runtime which card this session is looking at, for presence. */
  watchCard: (workCardId: string | null) => void;
  /** Drop a conflicted edit after the user has decided to abandon it. */
  resolveConflict: (idempotencyKey: string) => void;
  /** Re-read everything from the server. Called on reconnect and focus; exposed for a manual retry. */
  refresh: () => void;
}

const Ctx = createContext<SyncCtx | undefined>(undefined);

export function SyncProvider({ children }: { children: ReactNode }) {
  const { state, dispatch } = useTechLog();
  const [outbox, setOutbox] = useState<Outbox>(loadOutbox);
  const [serverCards, setServerCards] = useState<Record<string, StampedWorkCard>>({});
  const [presence, setPresence] = useState<Record<string, PresenceRecord[]>>({});
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const watchedRef = useRef<string | null>(null);

  // Read the freshest state inside the send loop without making the loop depend on it — the loop must
  // not be torn down and rebuilt on every keystroke elsewhere in the app.
  const stateRef = useRef(state);
  stateRef.current = state;
  // Same reason: `submit` needs the freshest base revision without being rebuilt every time a stamp
  // arrives, which would re-arm every effect that depends on it.
  const serverCardsRef = useRef(serverCards);
  serverCardsRef.current = serverCards;

  const transport: SyncTransport = useMemo(
    () =>
      createLocalTransport({
        seedCards: () =>
          stateRef.current.workCards.map(c => ({
            ...c,
            laborEntries: stateRef.current.laborEntries.filter(l => l.workCardId === c.id),
            stamp: { revision: 1, serverAtUtc: c.createdAtUtc, updatedByOid: 'SEED', updatedByName: 'Seed data' },
          })),
        resolveName: oid => stateRef.current.personnel.find(p => p.oid === oid)?.displayName ?? oid,
        now: () => (stateRef.current.nowOverrideUtc ? new Date(stateRef.current.nowOverrideUtc) : new Date()),
      }),
    [],
  );

  useEffect(() => saveOutbox(outbox), [outbox]);

  /**
   * Fold a card the server sent us into local state. Both halves of the aggregate are applied — the
   * card body and its labor lines — which is what makes another technician's logged hours actually
   * appear here rather than only a "this changed" badge.
   */
  const applyServerCard = useCallback(
    (card: StampedWorkCard) => {
      setServerCards(prev => ({ ...prev, [card.id]: card }));
      const { stamp: _stamp, laborEntries, ...body } = card;
      dispatch({ type: 'EDIT_WORK_CARD', payload: body });
      dispatch({ type: 'REPLACE_CARD_LABOR', payload: { workCardId: card.id, entries: laborEntries ?? [] } });
    },
    [dispatch],
  );

  const refresh = useCallback(() => {
    transport
      .fetchCards()
      .then(cards => cards.forEach(applyServerCard))
      .catch(() => setOnline(false));
  }, [transport, applyServerCard]);

  useEffect(() => { refresh(); }, [refresh]);

  // Someone else committed, on another tab or (with the http transport) another device.
  useEffect(() => transport.subscribe(applyServerCard), [transport, applyServerCard]);

  useEffect(() => {
    const up = () => { setOnline(true); refresh(); };
    const down = () => setOnline(false);
    const onFocus = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [refresh]);

  // The send loop. One op at a time, oldest first — ordering matters because a patch and the labor
  // entry that followed it were composed in that order by a person.
  const sendingRef = useRef(false);
  useEffect(() => {
    const t = setInterval(() => {
      if (sendingRef.current || !navigator.onLine) return;
      const entry = nextSendable(outbox, Date.now());
      if (!entry) return;

      sendingRef.current = true;
      const key = entry.op.idempotencyKey;
      setOutbox(o => markSent(o, key));

      transport
        .submit(entry.op)
        .then(res => {
          if (res.outcome === 'ACCEPTED') {
            applyServerCard(res.card);
            setOutbox(o => markAcked(o, key));
          } else if (res.outcome === 'CONFLICT') {
            // Take the server's card so the user is looking at what actually exists while they
            // decide what to do with the edit that lost.
            applyServerCard(res.current);
            setOutbox(o => markConflict(o, key));
          } else {
            // REJECTED is terminal and not retryable. Held as a conflict so it reaches a human
            // rather than vanishing — a rejected edit is still an edit somebody made.
            setOutbox(o => markConflict(o, key));
          }
          setOnline(true);
        })
        .catch(() => {
          setOutbox(o => markFailed(o, key, Date.now(), 'transport'));
          setOnline(false);
        })
        .finally(() => { sendingRef.current = false; });
    }, TICK_MS);
    return () => clearInterval(t);
  }, [outbox, transport, applyServerCard]);

  // Presence heartbeat for whichever card this session is looking at.
  useEffect(() => {
    const beat = () => {
      const id = watchedRef.current;
      transport.heartbeat(id).catch(() => {});
      if (id) transport.presence(id).then(p => setPresence(prev => ({ ...prev, [id]: p }))).catch(() => {});
    };
    beat();
    const t = setInterval(beat, PRESENCE_HEARTBEAT_MS);
    return () => { clearInterval(t); transport.heartbeat(null).catch(() => {}); };
  }, [transport]);

  const submit = useCallback(
    <K extends SyncOpKind>(kind: K, workCardId: string, payload: SyncOpPayloads[K]) => {
      const op: SyncOp = {
        idempotencyKey: newId('op'),
        kind,
        workCardId,
        // The revision this edit was composed against. Null when the server has never shown us this
        // card, which the server reads as "makes no concurrency claim" rather than as revision zero.
        baseRevision: serverCardsRef.current[workCardId]?.stamp.revision ?? null,
        payload,
        clientAtUtc: new Date().toISOString(),
        actorOid: stateRef.current.currentUserOid,
      };
      // Queue it. The op is durable BEFORE any send is attempted (`CLAUDE.md`: persist the instant it
      // is recorded, before attempting sync), so a tablet that dies between here and the ACK still
      // holds the technician's edit. Callers apply their own optimistic local update; the server's
      // copy overwrites it on ACK via `applyServerCard`.
      setOutbox(o => enqueue(o, op));
    },
    [],
  );

  const value = useMemo<SyncCtx>(
    () => ({
      summary: outboxSummary(outbox),
      online,
      transportName: transport.name,
      stampFor: id => serverCards[id]?.stamp,
      conflictsFor: id => outbox.entries.filter(e => e.state === 'CONFLICT' && e.op.workCardId === id),
      presenceFor: id => presence[id] ?? [],
      submit,
      watchCard: id => { watchedRef.current = id; },
      resolveConflict: key => setOutbox(o => discardConflict(o, key)),
      refresh,
    }),
    [outbox, online, transport.name, serverCards, presence, submit, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * Sync state. Returns `null` outside a `SyncProvider` rather than throwing — several tech-log
 * surfaces (ramp mode, the pilot workspace) mount the tech-log provider without the sync runtime, and
 * a hard throw would take those pages down for a feature they do not use.
 */
export function useSync(): SyncCtx | null {
  return useContext(Ctx) ?? null;
}

export { resetLocalServer };
