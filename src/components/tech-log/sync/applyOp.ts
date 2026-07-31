/**
 * The server's apply rule (TL-38) — pure, shared by the demo's stand-in server
 * (`./localTransport.ts`) and by the reference backend the dev will build
 * (`docs/tech-log-api/`). Extracted rather than written twice so the two halves cannot drift: if the
 * front end has been driven against this rule, the back end implementing the same rule behaves the
 * same way.
 *
 * TWO RULES LIVE HERE AND NOTHING ELSE DOES.
 *
 * **1. Who wins.** An edit carries the revision it was composed against. If the card has moved on,
 * the edit loses and the author is told. This is optimistic concurrency, and it is the entire reason
 * two technicians on two iPads cannot silently overwrite each other — which is the concrete harm in
 * TL-38, not merely the invisibility.
 *
 * **2. What commutes.** Appends do not conflict. A labor entry, a parts order and a status tag are
 * each additions to a list; they cannot contradict a concurrent edit to the title, so making them
 * conflict would reject a technician's logged hours because a colleague renamed the card. Given the
 * promise TL-38 is making is specifically about not losing logged hours, that would be the one
 * unacceptable outcome. Only `workcard.patch` — a field-level overwrite — is revision-gated.
 *
 * WHAT IS NOT HERE, and must be on the real server: authorization (is this actor allowed to touch
 * this tail), validation of the payload against the schema, and the transaction that makes the read
 * and the write atomic. All three are noted at the routes in `docs/tech-log-api/routes.ts`.
 */

import type { ServerStamp, StampedWorkCard, SyncOp } from './contract';
import type { LaborEntry, PartsOrder } from '../types';

export type ApplyResult =
  | { outcome: 'APPLIED'; card: StampedWorkCard }
  | { outcome: 'CONFLICT' };

/** Ops that ADD to a list and therefore commute with any concurrent edit. See rule 2 above. */
const COMMUTES: ReadonlySet<SyncOp['kind']> = new Set([
  'workcard.labor.add',
  'workcard.parts.add',
  'workcard.statustag.add',
]);

export function applyOp(
  card: StampedWorkCard,
  op: SyncOp,
  server: { serverAtUtc: string; updatedByName: string },
): ApplyResult {
  if (!COMMUTES.has(op.kind) && op.baseRevision !== null && op.baseRevision !== card.stamp.revision) {
    return { outcome: 'CONFLICT' };
  }

  const stamp: ServerStamp = {
    revision: card.stamp.revision + 1,
    serverAtUtc: server.serverAtUtc,
    updatedByOid: op.actorOid,
    updatedByName: server.updatedByName,
  };

  switch (op.kind) {
    case 'workcard.patch':
      return { outcome: 'APPLIED', card: { ...card, ...(op.payload as Partial<StampedWorkCard>), stamp } };

    case 'workcard.parts.add':
      return {
        outcome: 'APPLIED',
        card: { ...card, partsOrders: [...(card.partsOrders ?? []), op.payload as PartsOrder], stamp },
      };

    case 'workcard.parts.receive': {
      const { partsOrderId, receivedAtUtc } = op.payload as { partsOrderId: string; receivedAtUtc: string };
      return {
        outcome: 'APPLIED',
        card: {
          ...card,
          partsOrders: (card.partsOrders ?? []).map(p => (p.id === partsOrderId ? { ...p, receivedAtUtc } : p)),
          stamp,
        },
      };
    }

    case 'workcard.statustag.add': {
      const { tag, audit } = op.payload as { tag: StampedWorkCard['statusTags'] extends (infer T)[] | undefined ? T : never; audit: NonNullable<StampedWorkCard['timeAudit']>[number] };
      return {
        outcome: 'APPLIED',
        card: {
          ...card,
          statusTags: [...(card.statusTags ?? []), tag],
          timeAudit: [...(card.timeAudit ?? []), audit],
          stamp,
        },
      };
    }

    // Labor rides on the aggregate (see `contract.ts#StampedWorkCard`), so it commits in the same
    // revision bump as everything else — card and hours can never arrive half-applied. `add` is
    // guarded against a duplicate id so a replayed op cannot double a technician's hours even if the
    // idempotency layer above were bypassed.
    case 'workcard.labor.add': {
      const entry = op.payload as LaborEntry;
      const existing = card.laborEntries ?? [];
      if (existing.some(l => l.id === entry.id)) return { outcome: 'APPLIED', card: { ...card, stamp } };
      return { outcome: 'APPLIED', card: { ...card, laborEntries: [...existing, entry], stamp } };
    }

    case 'workcard.timeline.set': {
      const { statusTags, timeAudit } = op.payload as { statusTags: StampedWorkCard['statusTags']; timeAudit: StampedWorkCard['timeAudit'] };
      return { outcome: 'APPLIED', card: { ...card, statusTags, timeAudit, stamp } };
    }

    case 'workcard.labor.delete': {
      const { laborEntryId } = op.payload as { laborEntryId: string };
      return {
        outcome: 'APPLIED',
        card: { ...card, laborEntries: (card.laborEntries ?? []).filter(l => l.id !== laborEntryId), stamp },
      };
    }
  }
}
