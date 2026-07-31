/**
 * The offline outbox (TL-38) — pure, so the rules that decide whether a technician's hours survive
 * are testable in node rather than only observable in a browser.
 *
 * A mutation is queued here BEFORE it is sent and is only removed once the server has acknowledged
 * it. That ordering is the whole point: a tablet that loses wifi mid-shift, or is closed and reopened
 * the next morning, still holds every unsent edit, and the send loop drains them in order when it
 * comes back. `CLAUDE.md` requires a signed record to reach durable storage the instant it is signed
 * and before any sync is attempted — the outbox is what makes "before any sync is attempted" mean
 * something other than "and then hope".
 */

import type { SyncOp, SyncOpKind } from './contract';

export type OutboxEntryState = 'PENDING' | 'IN_FLIGHT' | 'CONFLICT';

export interface OutboxEntry {
  op: SyncOp;
  state: OutboxEntryState;
  attempts: number;
  /** Epoch ms before which the send loop must not retry. Set by the backoff on failure. */
  nextAttemptAtMs?: number;
  lastError?: string;
}

export interface Outbox {
  entries: OutboxEntry[];
}

export const EMPTY_OUTBOX: Outbox = { entries: [] };

/**
 * Exponential backoff, capped at a minute. Capped because an aircraft on a ramp with intermittent
 * wifi should reconnect within a minute of coming back, not sit out a half-hour backoff it earned
 * while parked in a hangar.
 */
const BACKOFF_MS = [1_000, 2_000, 5_000, 15_000, 30_000, 60_000];
const backoffFor = (attempts: number) => BACKOFF_MS[Math.min(attempts, BACKOFF_MS.length - 1)];

const replace = (o: Outbox, key: string, f: (e: OutboxEntry) => OutboxEntry): Outbox => ({
  entries: o.entries.map(e => (e.op.idempotencyKey === key ? f(e) : e)),
});

/**
 * Queue a mutation. Re-enqueuing a key already present is a no-op — the idempotency key is immutable
 * across retries, so a second appearance is the same mutation, not a new one.
 *
 * COALESCING. A consecutive `workcard.patch` for the same card is MERGED into the trailing pending
 * patch rather than appended. A text input fires `onChange` per keystroke, so typing "AMM 32-30-00"
 * would otherwise queue twelve ops; the first ACKs and bumps the card's revision, and the remaining
 * eleven then conflict against a base that only *this device's own* edit invalidated. That is a
 * self-inflicted conflict storm being reported to the user as concurrency, which is worse than the
 * problem it was meant to solve — it teaches people the conflict banner is noise.
 *
 * Three limits on the merge, each load-bearing:
 *   - only into a **PENDING** entry, never one IN_FLIGHT — that payload is already on the wire;
 *   - only the **trailing** entry for that card, so a patch never jumps an intervening append
 *     (`labor.add` between two patches means the person did those things in that order);
 *   - appends are **never** merged — two labor entries are two separate facts, and merging them
 *     would delete a technician's hours.
 *
 * The merged op keeps the FIRST key. Neither op has been sent, so no key is being reused against the
 * server, and keeping the earliest preserves queue order.
 */
export function enqueue(o: Outbox, op: SyncOp): Outbox {
  if (o.entries.some(e => e.op.idempotencyKey === op.idempotencyKey)) return o;

  const last = o.entries[o.entries.length - 1];
  if (
    op.kind === 'workcard.patch' &&
    last?.state === 'PENDING' &&
    last.op.kind === 'workcard.patch' &&
    last.op.workCardId === op.workCardId
  ) {
    const merged: SyncOp = {
      ...last.op,
      payload: { ...(last.op.payload as object), ...(op.payload as object) } as SyncOp['payload'],
      clientAtUtc: op.clientAtUtc,
    };
    return { entries: [...o.entries.slice(0, -1), { ...last, op: merged }] };
  }

  return { entries: [...o.entries, { op, state: 'PENDING', attempts: 0 }] };
}

export const markSent = (o: Outbox, key: string): Outbox =>
  replace(o, key, e => ({ ...e, state: 'IN_FLIGHT', attempts: e.attempts + 1 }));

export const markAcked = (o: Outbox, key: string): Outbox => ({
  entries: o.entries.filter(e => e.op.idempotencyKey !== key),
});

/**
 * The server refused because the card moved. Terminal for the send loop on purpose: retrying a
 * conflicted edit against a card that has since changed would re-apply an edit the author composed
 * against a picture that no longer holds. It waits for a person.
 */
export const markConflict = (o: Outbox, key: string): Outbox =>
  replace(o, key, e => ({ ...e, state: 'CONFLICT' }));

/** Transport failure — offline, timeout, 5xx. Retryable, after a backoff. */
export const markFailed = (o: Outbox, key: string, nowMs: number, error?: string): Outbox =>
  replace(o, key, e => {
    const attempts = e.state === 'IN_FLIGHT' ? e.attempts : e.attempts + 1;
    return { ...e, state: 'PENDING', attempts, nextAttemptAtMs: nowMs + backoffFor(attempts), lastError: error };
  });

/** The oldest op that is due to be sent, or `undefined` if nothing is due yet. */
export const nextSendable = (o: Outbox, nowMs: number): OutboxEntry | undefined =>
  o.entries.find(e => e.state === 'PENDING' && (e.nextAttemptAtMs ?? 0) <= nowMs);

/**
 * Discard a conflicted entry once a human has resolved it. The ONLY way a CONFLICT leaves the
 * outbox — the send loop will not retry one and nothing prunes one automatically, because a
 * conflicted entry still holds the technician's un-applied edit and dropping it on a timer would
 * discard their work silently, which is the exact failure TL-38 exists to prevent.
 */
export const discardConflict = (o: Outbox, key: string): Outbox => ({
  entries: o.entries.filter(e => !(e.op.idempotencyKey === key && e.state === 'CONFLICT')),
});

export interface OutboxSummary {
  pending: number;
  inFlight: number;
  conflicts: number;
  /** Nothing queued, nothing in flight, nothing conflicted. What the chip shows as "Saved". */
  synced: boolean;
  /** Cards carrying unsent work, so a list row can be marked rather than looking identical to a saved one. */
  cardsWithPendingWork: Set<string>;
  /** Present when work has been queued long enough that the user should be told, not just hinted at. */
  oldestPendingKey?: string;
}

export function outboxSummary(o: Outbox): OutboxSummary {
  const pending = o.entries.filter(e => e.state === 'PENDING');
  const inFlight = o.entries.filter(e => e.state === 'IN_FLIGHT');
  const conflicts = o.entries.filter(e => e.state === 'CONFLICT');
  return {
    pending: pending.length,
    inFlight: inFlight.length,
    conflicts: conflicts.length,
    synced: o.entries.length === 0,
    cardsWithPendingWork: new Set(o.entries.map(e => e.op.workCardId)),
    oldestPendingKey: pending[0]?.op.idempotencyKey,
  };
}

/**
 * Human wording for an op, used in the conflict panel and the queued-work list. A technician reading
 * "3 changes queued" learns nothing; "3.5 h logged, waiting to sync" tells them whether to worry.
 */
export function describeOp(op: SyncOp): string {
  const k: Record<SyncOpKind, string> = {
    'workcard.patch': 'Card details edited',
    'workcard.labor.add': 'Hours logged',
    'workcard.labor.delete': 'Labor line removed',
    'workcard.parts.add': 'Part ordered',
    'workcard.parts.receive': 'Part received',
    'workcard.statustag.add': 'Status changed',
    'workcard.timeline.set': 'Work timeline edited',
  };
  return k[op.kind];
}
