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
 *   2. **`subscribe` is a stub here.** It returns a no-op unsubscribe, so with this transport wired
 *      the app is poll-and-refresh, not live. The real thing is SignalR (`PHASE1_BUILD_SPEC.md` §2
 *      puts real-time push in Phase 2 explicitly). Until then the app converges on `fetchCards`,
 *      which `useSync` already calls on mount, on reconnect and on tab focus. That is a real
 *      product decision — a tech does see a colleague's edit, on their next focus rather than
 *      instantly — and it should be Bryan's call whether that is good enough for Phase 1.
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
} as const;

export function createHttpTransport(opts: HttpTransportOptions): SyncTransport {
  const doFetch = opts.fetchImpl ?? fetch;

  const headers = async (extra: Record<string, string> = {}): Promise<HeadersInit> => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${await opts.getToken()}`,
    'X-Sync-Protocol': String(SYNC_PROTOCOL_VERSION),
    ...extra,
  });

  return {
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
    subscribe(): () => void {
      return () => {};
    },
  };
}
