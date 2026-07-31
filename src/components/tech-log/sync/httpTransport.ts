/**
 * ███ THIS FILE IS DELIBERATELY NOT WIRED. ███
 *
 * The real transport for TL-38, written against the routes in `docs/tech-log-api/`. Nothing in the
 * app imports it, and `useSync` uses `createLocalTransport` instead. That is intentional, not an
 * oversight: the front end is ours and is finished, the back end is the dev's and does not exist yet,
 * and a front end that half-talks to a server that isn't there is worse than one that plainly doesn't.
 *
 * **TO WIRE IT** — one line, in `./useSync.ts`:
 *
 *     const transport = useMemo(() => createHttpTransport({ baseUrl: '/api/tech-log', getToken }), [getToken]);
 *
 * replacing the `createLocalTransport(...)` line above it. Nothing else in the app changes; that is
 * what the seam was for. What you also need, and what is NOT in this file:
 *
 *   1. **A token.** `getToken` should return the Entra access token MSAL already holds for the API's
 *      scope. Do not pass the id token.
 *   2. **A WebSocket endpoint.** `subscribe` is a real live-push client (see its own note). Bryan
 *      ruled on 2026-07-31 that convergence must be instant rather than on next focus, which moves
 *      real-time push into Phase 1 — `PHASE1_BUILD_SPEC.md` §2 had parked it in Phase 2, so the spec
 *      is what needs updating, not this file. The server side is `docs/tech-log-api/routes.ts`.
 *   3. **Presence needs a server-side TTL sweep.** The `PRESENCE_TTL_MS` filter is applied by the
 *      client here, which is fine for display but means the presence table grows without bound.
 *
 * On the wire: `Idempotency-Key` is a header rather than a body field, matching the convention every
 * payment API uses and letting a proxy or the framework dedupe before the handler runs. `If-Match`
 * carries the base revision as an ETag, so the 409 comes from standard HTTP machinery instead of a
 * bespoke field. Both are noted in `docs/tech-log-api/routes.ts`.
 */

import type {
  PresenceRecord,
  StampedWorkCard,
  SyncOp,
  SyncResult,
  SyncTransport,
} from './contract';
import { SYNC_PROTOCOL_VERSION } from './contract';

export interface HttpTransportOptions {
  /** e.g. `/api/tech-log`. No trailing slash. */
  baseUrl: string;
  /** Resolves the Entra access token for the API scope. Called per request — MSAL caches. */
  getToken: () => Promise<string>;
  /** Overridable for tests. */
  fetchImpl?: typeof fetch;
}

const ROUTES = {
  cards: '/work-cards',
  op: (workCardId: string) => `/work-cards/${encodeURIComponent(workCardId)}/ops`,
  heartbeat: '/presence/heartbeat',
  presence: (workCardId: string) => `/presence?workCardId=${encodeURIComponent(workCardId)}`,
  /** WebSocket upgrade. See `subscribe` and `docs/tech-log-api/routes.ts`. */
  stream: '/stream',
} as const;

export function createHttpTransport(opts: HttpTransportOptions): SyncTransport {
  const doFetch = opts.fetchImpl ?? fetch;

  const headers = async (extra: Record<string, string> = {}): Promise<HeadersInit> => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${await opts.getToken()}`,
    'X-Sync-Protocol': String(SYNC_PROTOCOL_VERSION),
    ...extra,
  });

  // Named rather than returned inline so `subscribe` can call `api.fetchCards()` for its
  // reconnect resync — see the note on that method.
  const api: SyncTransport = {
    name: 'http',

    async submit(op: SyncOp): Promise<SyncResult> {
      const res = await doFetch(`${opts.baseUrl}${ROUTES.op(op.workCardId)}`, {
        method: 'POST',
        headers: await headers({
          'Idempotency-Key': op.idempotencyKey,
          // Absent on a first write, which the server reads as "no concurrency claim".
          ...(op.baseRevision === null ? {} : { 'If-Match': `"${op.baseRevision}"` }),
        }),
        body: JSON.stringify({ kind: op.kind, payload: op.payload, clientAtUtc: op.clientAtUtc }),
      });

      // 409 carries the server's current card, so the client can show what actually changed rather
      // than a bare "try again". The body shape is the contract's `SyncConflict` minus the key.
      if (res.status === 409) {
        const body = (await res.json()) as { current: StampedWorkCard };
        return { outcome: 'CONFLICT', idempotencyKey: op.idempotencyKey, current: body.current, attemptedBaseRevision: op.baseRevision };
      }

      // 4xx that is not 409 is the client's fault and will fail identically on retry. Anything else
      // — 5xx, a network throw — is left to propagate so the outbox treats it as retryable. Getting
      // this split wrong in either direction is how a queue either spins forever or drops work.
      if (res.status >= 400 && res.status < 500) {
        const reason = await res.text().catch(() => res.statusText);
        return { outcome: 'REJECTED', idempotencyKey: op.idempotencyKey, reason };
      }
      if (!res.ok) throw new Error(`sync submit failed: ${res.status}`);

      const body = (await res.json()) as { card: StampedWorkCard; replayed?: boolean };
      return { outcome: 'ACCEPTED', idempotencyKey: op.idempotencyKey, card: body.card, replayed: Boolean(body.replayed) };
    },

    async fetchCards(): Promise<StampedWorkCard[]> {
      const res = await doFetch(`${opts.baseUrl}${ROUTES.cards}`, { headers: await headers() });
      if (!res.ok) throw new Error(`sync fetch failed: ${res.status}`);
      return (await res.json()) as StampedWorkCard[];
    },

    async heartbeat(workCardId: string | null): Promise<void> {
      await doFetch(`${opts.baseUrl}${ROUTES.heartbeat}`, {
        method: 'POST',
        headers: await headers(),
        body: JSON.stringify({ workCardId }),
      });
    },

    async presence(workCardId: string): Promise<PresenceRecord[]> {
      const res = await doFetch(`${opts.baseUrl}${ROUTES.presence(workCardId)}`, { headers: await headers() });
      if (!res.ok) return [];
      return (await res.json()) as PresenceRecord[];
    },

    /** See note 2 in the header — this is a stub until SignalR exists. */
    /**
     * Live push. Bryan chose "truly instant" over next-focus convergence (2026-07-31), because a
     * technician's usual pair of devices is their own phone and their own laptop — so the person
     * being surprised by a stale card is most often the same person who changed it, and "tap away
     * and back to see your own edit" is not a thing anyone will forgive.
     *
     * **A push channel that can silently drop a message is worse than polling**, because it looks
     * live. Two rules keep that from happening:
     *
     *   1. **Every successful connect — including every reconnect — refetches everything** and
     *      replays it through `onCard`. Anything that changed while the socket was down is caught by
     *      that sweep, so a missed frame costs a round trip, never a wrong screen. This is the whole
     *      reason `open` does work instead of just logging.
     *   2. **Reconnect backs off but never gives up**, because the failure this exists to prevent is
     *      long and quiet: a laptop that slept through a shift change. Capped at 30s so a hangar
     *      wifi blip recovers quickly.
     *
     * `useSync` still refreshes on focus and on `online`, and those stay — belt and braces. The
     * socket makes the common case instant; the fetches make the uncommon case correct.
     *
     * Deliberately the browser's own `WebSocket`, not `@microsoft/signalr`. The spec names SignalR
     * and Azure SignalR Service is the natural fit — but adding a dependency for a file nothing
     * imports is how dead code starts costing bundle size. Swapping this for a SignalR hub
     * connection is a body transplant on one function; the contract above it does not move.
     */
    subscribe(onCard: (card: StampedWorkCard) => void): () => void {
      let socket: WebSocket | null = null;
      let retry = 0;
      let timer: ReturnType<typeof setTimeout> | undefined;
      let stopped = false;

      const connect = async () => {
        if (stopped) return;
        let token: string;
        try {
          token = await opts.getToken();
        } catch {
          return schedule();
        }
        const url = new URL(`${opts.baseUrl}${ROUTES.stream}`, window.location.origin);
        url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        // A browser WebSocket cannot set an Authorization header, so the token rides the subprotocol
        // slot — the standard workaround, and it keeps the token out of the query string where it
        // would land in server access logs. The server reads it from `Sec-WebSocket-Protocol`.
        socket = new WebSocket(url.toString(), ['bearer', token]);

        socket.onopen = () => {
          retry = 0;
          // Rule 1 — resync on every connect, so a gap in the stream cannot become a stale screen.
          void api.fetchCards().then(cards => { if (!stopped) cards.forEach(onCard); }).catch(() => {});
        };
        socket.onmessage = ev => {
          try {
            const msg = JSON.parse(String(ev.data)) as { type?: string; card?: StampedWorkCard };
            if (msg.type === 'card.changed' && msg.card) onCard(msg.card);
          } catch {
            // A frame we cannot parse is a server-side bug, not a client state to model. The next
            // reconnect sweep will resync us regardless, so drop it rather than tearing down.
          }
        };
        socket.onclose = () => { socket = null; schedule(); };
        socket.onerror = () => socket?.close();
      };

      const schedule = () => {
        if (stopped) return;
        const wait = Math.min(30_000, 500 * 2 ** retry++);
        timer = setTimeout(() => void connect(), wait);
      };

      void connect();

      return () => {
        stopped = true;
        if (timer) clearTimeout(timer);
        socket?.close();
        socket = null;
      };
    },
  };

  return api;
}
