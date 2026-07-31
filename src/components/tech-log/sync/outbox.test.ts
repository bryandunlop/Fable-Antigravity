import { describe, it, expect } from 'vitest';
import {
  enqueue,
  markSent,
  markAcked,
  markConflict,
  markFailed,
  nextSendable,
  outboxSummary,
  discardConflict,
  type Outbox,
} from './outbox';
import type { SyncOp } from './contract';

/**
 * Default kind is an APPEND, not a patch, so these queue/send-loop cases test what they say they
 * test. Consecutive patches on one card coalesce by design (see the coalescing block below), which
 * would otherwise silently turn a three-op ordering assertion into a one-op one.
 */
const op = (key: string, kind: SyncOp['kind'] = 'workcard.labor.add', cardId = 'wc-1'): SyncOp =>
  ({
    idempotencyKey: key,
    kind,
    workCardId: cardId,
    payload: { id: key, hours: 1 },
    baseRevision: 1,
    clientAtUtc: '2026-07-31T10:00:00.000Z',
    actorOid: 'USR001',
  }) as SyncOp;

const empty: Outbox = { entries: [] };

describe('outbox — queueing', () => {
  it('queues an op as PENDING with no attempts', () => {
    const o = enqueue(empty, op('k1'));
    expect(o.entries).toHaveLength(1);
    expect(o.entries[0].state).toBe('PENDING');
    expect(o.entries[0].attempts).toBe(0);
  });

  it('is idempotent on the idempotency key — a re-enqueued op does not double', () => {
    const o = enqueue(enqueue(empty, op('k1')), op('k1'));
    expect(o.entries).toHaveLength(1);
  });

  it('preserves submission order', () => {
    const o = enqueue(enqueue(enqueue(empty, op('k1')), op('k2')), op('k3'));
    expect(o.entries.map(e => e.op.idempotencyKey)).toEqual(['k1', 'k2', 'k3']);
  });
});

describe('outbox — coalescing chatty edits', () => {
  const patch = (key: string, payload: object, cardId = 'wc-1'): SyncOp =>
    ({ idempotencyKey: key, kind: 'workcard.patch', workCardId: cardId, payload, baseRevision: 1, clientAtUtc: '2026-07-31T10:00:00.000Z', actorOid: 'USR001' }) as SyncOp;

  // A text input fires onChange per keystroke. Without coalescing, typing "AMM 32-30-00" queues 12
  // ops; the first ACKs and bumps the revision, and the other 11 conflict against a base that only
  // this device's own edit invalidated. That is a self-inflicted conflict storm, not concurrency.
  it('merges consecutive pending patches on one card into a single op', () => {
    let o = enqueue(empty, patch('k1', { ammReference: 'A' }));
    o = enqueue(o, patch('k2', { ammReference: 'AM' }));
    o = enqueue(o, patch('k3', { ammReference: 'AMM' }));
    expect(o.entries).toHaveLength(1);
    expect(o.entries[0].op.payload).toEqual({ ammReference: 'AMM' });
  });

  it('keeps the FIRST key, so a retry of an already-sent key is never re-used', () => {
    const o = enqueue(enqueue(empty, patch('k1', { ammReference: 'A' })), patch('k2', { ammReference: 'AM' }));
    expect(o.entries[0].op.idempotencyKey).toBe('k1');
  });

  it('merges across different fields rather than dropping one', () => {
    const o = enqueue(enqueue(empty, patch('k1', { ammReference: 'A' })), patch('k2', { cmcFaultCodes: ['X'] }));
    expect(o.entries[0].op.payload).toEqual({ ammReference: 'A', cmcFaultCodes: ['X'] });
  });

  it('does not merge into an op already in flight — its payload is on the wire', () => {
    const sent = markSent(enqueue(empty, patch('k1', { ammReference: 'A' })), 'k1');
    const o = enqueue(sent, patch('k2', { ammReference: 'AM' }));
    expect(o.entries).toHaveLength(2);
  });

  it('does not merge patches for different cards', () => {
    const o = enqueue(enqueue(empty, patch('k1', { ammReference: 'A' })), patch('k2', { ammReference: 'B' }, 'wc-9'));
    expect(o.entries).toHaveLength(2);
  });

  it('never merges an append — two labor entries are two separate facts', () => {
    const labor = (key: string): SyncOp =>
      ({ idempotencyKey: key, kind: 'workcard.labor.add', workCardId: 'wc-1', payload: { id: key, hours: 1 }, baseRevision: 1, clientAtUtc: 'x', actorOid: 'U' }) as SyncOp;
    const o = enqueue(enqueue(empty, labor('k1')), labor('k2'));
    expect(o.entries).toHaveLength(2);
  });

  it('does not merge a patch across an intervening append — order is meaning', () => {
    const labor = { idempotencyKey: 'k2', kind: 'workcard.labor.add', workCardId: 'wc-1', payload: { id: 'l1' }, baseRevision: 1, clientAtUtc: 'x', actorOid: 'U' } as SyncOp;
    let o = enqueue(empty, patch('k1', { ammReference: 'A' }));
    o = enqueue(o, labor);
    o = enqueue(o, patch('k3', { ammReference: 'AM' }));
    expect(o.entries.map(e => e.op.idempotencyKey)).toEqual(['k1', 'k2', 'k3']);
  });
});

describe('outbox — the send loop', () => {
  it('hands out the oldest PENDING op', () => {
    const o = enqueue(enqueue(empty, op('k1')), op('k2'));
    expect(nextSendable(o, 0)!.op.idempotencyKey).toBe('k1');
  });

  it('does not hand out an op already in flight', () => {
    const o = markSent(enqueue(enqueue(empty, op('k1')), op('k2')), 'k1');
    expect(nextSendable(o, 0)!.op.idempotencyKey).toBe('k2');
  });

  it('holds a failed op until its backoff expires, then releases it', () => {
    const o = markFailed(enqueue(empty, op('k1')), 'k1', 1_000);
    expect(nextSendable(o, 1_500)).toBeUndefined();
    expect(nextSendable(o, 60_000)!.op.idempotencyKey).toBe('k1');
  });

  it('backs off further on each successive failure', () => {
    const once = markFailed(enqueue(empty, op('k1')), 'k1', 0);
    const twice = markFailed(once, 'k1', 0);
    expect(twice.entries[0].attempts).toBe(2);
    expect(twice.entries[0].nextAttemptAtMs).toBeGreaterThan(once.entries[0].nextAttemptAtMs!);
  });

  it('never releases a CONFLICT op for retry — a human has to resolve it', () => {
    const o = markConflict(markSent(enqueue(empty, op('k1')), 'k1'), 'k1');
    expect(nextSendable(o, Number.MAX_SAFE_INTEGER)).toBeUndefined();
  });
});

describe('outbox — what the user is told', () => {
  it('counts a queued op as unsynced work', () => {
    const o = enqueue(empty, op('k1'));
    expect(outboxSummary(o).pending).toBe(1);
    expect(outboxSummary(o).synced).toBe(false);
  });

  it('reports synced once everything has landed', () => {
    const o = markAcked(markSent(enqueue(empty, op('k1')), 'k1'), 'k1');
    expect(outboxSummary(o).synced).toBe(true);
  });

  it('surfaces conflicts separately from pending work', () => {
    const o = markConflict(markSent(enqueue(enqueue(empty, op('k1')), op('k2')), 'k1'), 'k1');
    const s = outboxSummary(o);
    expect(s.conflicts).toBe(1);
    expect(s.pending).toBe(1);
    expect(s.synced).toBe(false);
  });

  it('names the cards with unsynced work so the UI can mark them', () => {
    const o = enqueue(enqueue(empty, op('k1', 'workcard.patch', 'wc-1')), op('k2', 'workcard.patch', 'wc-9'));
    expect([...outboxSummary(o).cardsWithPendingWork].sort()).toEqual(['wc-1', 'wc-9']);
  });
});

describe('outbox — durability rules', () => {
  it('removes a labor entry from the queue only once the server has acked it', () => {
    const queued = enqueue(empty, op('k1', 'workcard.labor.add'));
    expect(markSent(queued, 'k1').entries).toHaveLength(1); // in flight is NOT settled
    expect(markAcked(markSent(queued, 'k1'), 'k1').entries).toHaveLength(0);
  });

  it('discards a conflicted op only on an explicit human decision', () => {
    const o = markConflict(markSent(enqueue(empty, op('k1')), 'k1'), 'k1');
    expect(discardConflict(o, 'k1').entries).toHaveLength(0);
  });

  it('will not discard a PENDING op through the conflict path — that would drop unsent work', () => {
    const o = enqueue(empty, op('k1', 'workcard.labor.add'));
    expect(discardConflict(o, 'k1').entries).toHaveLength(1);
  });

  it('survives a round trip through JSON, because it lives in localStorage across a reload', () => {
    const o = markFailed(enqueue(empty, op('k1', 'workcard.labor.add')), 'k1', 0);
    const revived = JSON.parse(JSON.stringify(o)) as Outbox;
    expect(revived.entries[0].op.idempotencyKey).toBe('k1');
    expect(revived.entries[0].state).toBe('PENDING');
  });
});
