/**
 * The demo's stand-in server (TL-38).
 *
 * This is **live** — it is what the app actually runs against. It is not a mock in the test sense: it
 * implements the real `SyncTransport` contract, assigns real revisions, enforces real optimistic
 * concurrency, replays real idempotency keys, and genuinely converges two browser tabs. What it does
 * not do is cross a network, so it cannot converge two *devices*. That last step is
 * `./httpTransport.ts` and belongs to the dev.
 *
 * WHY IT IS BUILT THIS WAY. The temptation was to fake the server behaviour — resolve every submit
 * with success and move on. That would have produced a front end which looks finished and is wrong in
 * the only ways that matter: no conflict path ever renders, so nobody discovers that the conflict UI
 * is unusable; no revision is ever compared, so the client's base-revision bookkeeping is never
 * exercised; no replay ever happens, so a double-submit bug survives to production. Making the stand-in
 * enforce the rules means the front end has been driven against a server that says no.
 *
 * STORAGE. One `localStorage` key, separate from `tech-log-state`, holding the server's copy of the
 * cards. It is deliberately a *different* key: the point of TL-38 is that the server's copy and this
 * browser's working copy are two different things which can disagree, and sharing a key would quietly
 * re-merge the two halves of the problem.
 *
 * NOT MODELLED, on purpose:
 *   - **Authorization.** Every session sees every card. The real server derives the actor from the
 *     bearer token and scopes by tail; here `actorOid` is client-asserted and trusted.
 *   - **Durability.** `localStorage` is not durable and this is not a ledger table. Signed records
 *     are out of scope for this transport entirely — see `./contract.ts`.
 *   - **Partial failure.** Submit either applies fully or not at all, because a `localStorage` write
 *     cannot half-commit. A real backend needs a transaction; the route notes say so.
 */

import type {
  PresenceRecord,
  StampedWorkCard,
  SyncOp,
  SyncResult,
  SyncTransport,
} from './contract';
import { PRESENCE_TTL_MS } from './contract';
import { applyOp } from './applyOp';

const SERVER_KEY = 'tech-log-server-cards';
const PRESENCE_KEY = 'tech-log-server-presence';
const IDEMPOTENCY_KEY = 'tech-log-server-idempotency';
const CHANNEL = 'tech-log-sync';

/**
 * Simulated round-trip. Non-zero on purpose: a seam that resolves synchronously lets a "saving…"
 * state be written that no one ever sees, and hides every render-order bug the real latency will
 * expose on a hangar wifi connection.
 */
const LATENCY_MS = 220;

const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const write = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota — the demo degrades to in-tab only */
  }
};

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

/** This tab's identity for presence. Regenerated per load, which is what a session id is. */
const SESSION_ID = `sess-${Math.random().toString(36).slice(2, 10)}`;

export interface LocalTransportOptions {
  /** Seeds the server's copy on first use, so a fresh browser is not looking at an empty backend. */
  seedCards: () => StampedWorkCard[];
  /** Resolves an OID to the display name the server would freeze onto the stamp. */
  resolveName: (oid: string) => string;
  /**
   * Injected so tests can run without a clock and so the demo's `nowOverrideUtc` reaches the stamp.
   * The real server would use its own clock and ignore anything the client said.
   */
  now: () => Date;
}

export function createLocalTransport(opts: LocalTransportOptions): SyncTransport {
  const channel: BroadcastChannel | null =
    typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL);

  const loadCards = (): StampedWorkCard[] => {
    const stored = read<StampedWorkCard[] | null>(SERVER_KEY, null);
    if (stored) return stored;
    const seeded = opts.seedCards();
    write(SERVER_KEY, seeded);
    return seeded;
  };

  const saveCards = (cards: StampedWorkCard[]) => write(SERVER_KEY, cards);

  return {
    name: 'local',

    async submit(op: SyncOp): Promise<SyncResult> {
      await sleep(LATENCY_MS);

      // Idempotency first, before any state is touched: a replayed key must return the ORIGINAL
      // response, not re-apply and not conflict. This is what makes the outbox safe to retry.
      const seen = read<Record<string, SyncResult>>(IDEMPOTENCY_KEY, {});
      const prior = seen[op.idempotencyKey];
      if (prior) return prior.outcome === 'ACCEPTED' ? { ...prior, replayed: true } : prior;

      const cards = loadCards();
      const idx = cards.findIndex(c => c.id === op.workCardId);
      if (idx === -1) {
        const rejected: SyncResult = { outcome: 'REJECTED', idempotencyKey: op.idempotencyKey, reason: `No work card ${op.workCardId}` };
        write(IDEMPOTENCY_KEY, { ...seen, [op.idempotencyKey]: rejected });
        return rejected;
      }

      const current = cards[idx];
      const applied = applyOp(current, op, {
        serverAtUtc: opts.now().toISOString(),
        updatedByName: opts.resolveName(op.actorOid),
      });

      if (applied.outcome === 'CONFLICT') {
        const conflict: SyncResult = {
          outcome: 'CONFLICT',
          idempotencyKey: op.idempotencyKey,
          current,
          attemptedBaseRevision: op.baseRevision,
        };
        // A conflict is NOT recorded against the idempotency key. The same key may legitimately be
        // retried after the client rebases onto the current revision, and burning the key here would
        // make that retry replay the failure forever.
        return conflict;
      }

      const next = [...cards];
      next[idx] = applied.card;
      saveCards(next);

      const accepted: SyncResult = { outcome: 'ACCEPTED', idempotencyKey: op.idempotencyKey, card: applied.card, replayed: false };
      write(IDEMPOTENCY_KEY, { ...seen, [op.idempotencyKey]: accepted });
      channel?.postMessage({ kind: 'card', card: applied.card, from: SESSION_ID });
      return accepted;
    },

    async fetchCards(): Promise<StampedWorkCard[]> {
      await sleep(LATENCY_MS);
      return loadCards();
    },

    async heartbeat(workCardId: string | null): Promise<void> {
      const nowIso = opts.now().toISOString();
      const all = read<PresenceRecord[]>(PRESENCE_KEY, []).filter(p => p.sessionId !== SESSION_ID);
      if (workCardId) {
        all.push({ sessionId: SESSION_ID, workCardId, actorOid: '', actorName: '', lastSeenAtUtc: nowIso });
      }
      write(PRESENCE_KEY, all);
      channel?.postMessage({ kind: 'presence', from: SESSION_ID });
    },

    async presence(workCardId: string): Promise<PresenceRecord[]> {
      const cutoff = opts.now().getTime() - PRESENCE_TTL_MS;
      return read<PresenceRecord[]>(PRESENCE_KEY, []).filter(
        p => p.workCardId === workCardId && p.sessionId !== SESSION_ID && Date.parse(p.lastSeenAtUtc) > cutoff,
      );
    },

    subscribe(onRemoteChange): () => void {
      if (!channel) return () => {};
      const handler = (ev: MessageEvent) => {
        const msg = ev.data as { kind?: string; card?: StampedWorkCard; from?: string };
        if (msg?.from === SESSION_ID) return;
        if (msg?.kind === 'card' && msg.card) onRemoteChange(msg.card);
      };
      channel.addEventListener('message', handler);
      return () => channel.removeEventListener('message', handler);
    },
  };
}

/** Wipes the stand-in server. Wired to the existing demo-reset so the two halves reset together. */
export function resetLocalServer(): void {
  try {
    [SERVER_KEY, PRESENCE_KEY, IDEMPOTENCY_KEY].forEach(k => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}
