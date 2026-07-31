import { describe, it, expect } from 'vitest';
import { applyOp } from './applyOp';
import type { StampedWorkCard, SyncOp } from './contract';

const card = (revision = 4): StampedWorkCard =>
  ({
    id: 'wc-1',
    cardNumber: 'WC-1012',
    aircraftId: 'ac-1',
    title: 'Chip detector inspection',
    ataChapter: '79',
    description: 'original',
    steps: [],
    status: 'IN_WORK',
    source: 'MANUAL',
    headerStatusCode: 1,
    scheduled: false,
    riiRequired: false,
    createdAtUtc: '2026-07-30T08:00:00.000Z',
    partsOrders: [],
    laborEntries: [],
    stamp: { revision, serverAtUtc: '2026-07-31T09:00:00.000Z', updatedByOid: 'USR002', updatedByName: 'Dave Kowalski' },
  }) as StampedWorkCard;

const srv = { serverAtUtc: '2026-07-31T10:00:00.000Z', updatedByName: 'Mike Chen' };

const op = <K extends SyncOp['kind']>(kind: K, payload: unknown, baseRevision: number | null): SyncOp =>
  ({ idempotencyKey: 'k1', kind, workCardId: 'wc-1', payload, baseRevision, clientAtUtc: '2026-07-31T09:59:00.000Z', actorOid: 'USR003' }) as SyncOp;

describe('applyOp — who wins', () => {
  it('applies a patch composed against the current revision', () => {
    const r = applyOp(card(4), op('workcard.patch', { description: 'edited' }, 4), srv);
    expect(r.outcome).toBe('APPLIED');
    expect(r.outcome === 'APPLIED' && r.card.description).toBe('edited');
  });

  it('rejects a patch composed against a stale revision', () => {
    expect(applyOp(card(5), op('workcard.patch', { description: 'edited' }, 4), srv).outcome).toBe('CONFLICT');
  });

  it('accepts a patch that declares no base revision — a first write from a client with no stamp', () => {
    expect(applyOp(card(4), op('workcard.patch', { description: 'x' }, null), srv).outcome).toBe('APPLIED');
  });
});

describe('applyOp — appends never conflict', () => {
  it('accepts logged hours against a stale revision', () => {
    const stale = op('workcard.labor.add', { id: 'lab-1', workCardId: 'wc-1', techOid: 'USR003', hours: 3.5, dateUtc: '2026-07-31', description: 'troubleshoot' }, 1);
    expect(applyOp(card(9), stale, srv).outcome).toBe('APPLIED');
  });

  it('accepts a parts order against a stale revision', () => {
    const stale = op('workcard.parts.add', { id: 'po-1', description: 'Chip detector', vendor: 'Gulfstream', orderedAtUtc: '2026-07-31T10:00:00.000Z' }, 1);
    const r = applyOp(card(9), stale, srv);
    expect(r.outcome).toBe('APPLIED');
    expect(r.outcome === 'APPLIED' && r.card.partsOrders).toHaveLength(1);
  });

  it('accepts a status tag against a stale revision', () => {
    const stale = op('workcard.statustag.add', { tag: { id: 't1' }, audit: { id: 'a1' } }, 1);
    const r = applyOp(card(9), stale, srv);
    expect(r.outcome).toBe('APPLIED');
    expect(r.outcome === 'APPLIED' && r.card.statusTags).toHaveLength(1);
    expect(r.outcome === 'APPLIED' && r.card.timeAudit).toHaveLength(1);
  });
});

describe('applyOp — the stamp', () => {
  it('bumps the revision on every accepted op, including labor', () => {
    const r = applyOp(card(4), op('workcard.labor.add', { id: 'lab-1' }, 4), srv);
    expect(r.outcome === 'APPLIED' && r.card.stamp.revision).toBe(5);
  });

  it('takes the time from the server, never from the client', () => {
    const r = applyOp(card(4), op('workcard.patch', { description: 'x' }, 4), srv);
    expect(r.outcome === 'APPLIED' && r.card.stamp.serverAtUtc).toBe('2026-07-31T10:00:00.000Z');
  });

  it('freezes the actor’s display name rather than leaving a live join', () => {
    const r = applyOp(card(4), op('workcard.patch', { description: 'x' }, 4), srv);
    expect(r.outcome === 'APPLIED' && r.card.stamp.updatedByName).toBe('Mike Chen');
    expect(r.outcome === 'APPLIED' && r.card.stamp.updatedByOid).toBe('USR003');
  });

  it('leaves the card body untouched on a conflict', () => {
    const before = card(5);
    applyOp(before, op('workcard.patch', { description: 'edited' }, 4), srv);
    expect(before.description).toBe('original');
  });
});

describe('applyOp — receiving a part', () => {
  it('stamps the received date on the right order and leaves the others alone', () => {
    const base = { ...card(4), partsOrders: [
      { id: 'po-1', description: 'A', vendor: 'GS', orderedAtUtc: '2026-07-30T00:00:00.000Z' },
      { id: 'po-2', description: 'B', vendor: 'GS', orderedAtUtc: '2026-07-30T00:00:00.000Z' },
    ] } as StampedWorkCard;
    const r = applyOp(base, op('workcard.parts.receive', { partsOrderId: 'po-2', receivedAtUtc: '2026-07-31T10:00:00.000Z' }, 4), srv);
    expect(r.outcome === 'APPLIED' && r.card.partsOrders![0].receivedAtUtc).toBeUndefined();
    expect(r.outcome === 'APPLIED' && r.card.partsOrders![1].receivedAtUtc).toBe('2026-07-31T10:00:00.000Z');
  });
});

describe('applyOp — replaying unsent work onto the server’s card (the rebase in useSync)', () => {
  // This is the shape `applyServerCard` relies on: an op replayed with baseRevision null is applied
  // unconditionally, so a queued edit is never erased by the arrival of the server's copy.
  const rebase = (c: StampedWorkCard, o: SyncOp) => applyOp(c, { ...o, baseRevision: null }, srv);

  it('re-applies a queued labor entry the server has not seen, so hours never vanish from screen', () => {
    const queued = op('workcard.labor.add', { id: 'lab-9', workCardId: 'wc-1', hours: 2, dateUtc: 'x', description: 'y', techOid: 'U' }, 1);
    const r = rebase(card(7), queued); // server is ahead and knows nothing of our unsent hours
    expect(r.outcome === 'APPLIED' && r.card.laborEntries.map(l => l.id)).toEqual(['lab-9']);
  });

  it('re-applies a queued deletion, so a removed line is not resurrected by the server’s copy', () => {
    const serverCard = { ...card(7), laborEntries: [{ id: 'lab-1', hours: 4 }] } as StampedWorkCard;
    const r = rebase(serverCard, op('workcard.labor.delete', { laborEntryId: 'lab-1' }, 1));
    expect(r.outcome === 'APPLIED' && r.card.laborEntries).toEqual([]);
  });

  it('re-applies a queued patch, so a half-typed field is not stomped back', () => {
    const r = rebase(card(7), op('workcard.patch', { ammReference: 'AMM 32-30-00' }, 1));
    expect(r.outcome === 'APPLIED' && r.card.ammReference).toBe('AMM 32-30-00');
  });
});

describe('applyOp — the timeline is a wholesale replace', () => {
  const tag = (atUtc: string) => ({ tag: 'IN_WORK' as const, atUtc, byOid: 'USR003' });
  const audit = (after: string) => ({ atUtc: '2026-07-31T10:00:00.000Z', byOid: 'USR003', after, afterCompletion: false });
  const payload = { statusTags: [tag('2026-07-31T08:00:00.000Z')], timeAudit: [audit('a1'), audit('a2')] };

  it('replaces the history rather than appending to it', () => {
    const base = { ...card(4), statusTags: [tag('2026-07-30T08:00:00.000Z')], timeAudit: [audit('old')] } as StampedWorkCard;
    const r = applyOp(base, op('workcard.timeline.set', payload, 4), srv);
    expect(r.outcome === 'APPLIED' && r.card.statusTags!.map(t => t.atUtc)).toEqual(['2026-07-31T08:00:00.000Z']);
    expect(r.outcome === 'APPLIED' && r.card.timeAudit!.map(a => a.after)).toEqual(['a1', 'a2']);
  });

  it('DOES conflict on a stale revision — unlike an append, a wholesale replace needs a person', () => {
    expect(applyOp(card(9), op('workcard.timeline.set', payload, 4), srv).outcome).toBe('CONFLICT');
  });
});

describe('applyOp — labor rides on the aggregate', () => {
  const entry = { id: 'lab-1', workCardId: 'wc-1', techOid: 'USR003', hours: 3.5, dateUtc: '2026-07-31', description: 'troubleshoot' };

  it('appends the hours to the card so they travel with it', () => {
    const r = applyOp(card(4), op('workcard.labor.add', entry, 4), srv);
    expect(r.outcome === 'APPLIED' && r.card.laborEntries).toHaveLength(1);
    expect(r.outcome === 'APPLIED' && r.card.laborEntries[0].hours).toBe(3.5);
  });

  it('will not double a technician’s hours if the same entry arrives twice', () => {
    const once = applyOp(card(4), op('workcard.labor.add', entry, 4), srv);
    const twice = applyOp((once as { card: StampedWorkCard }).card, op('workcard.labor.add', entry, 5), srv);
    expect(twice.outcome === 'APPLIED' && twice.card.laborEntries).toHaveLength(1);
  });

  it('removes the named entry and leaves the rest', () => {
    const base = { ...card(4), laborEntries: [entry, { ...entry, id: 'lab-2' }] } as StampedWorkCard;
    const r = applyOp(base, op('workcard.labor.delete', { laborEntryId: 'lab-1' }, 4), srv);
    expect(r.outcome === 'APPLIED' && r.card.laborEntries.map(l => l.id)).toEqual(['lab-2']);
  });
});
