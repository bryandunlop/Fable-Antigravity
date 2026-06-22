import type { TechLogState, RecordNoteTarget } from '../types';
import { currentRows } from './supersede';

export type FeedKind = 'EVENT' | 'RECORD' | 'CHAT';
export interface FeedItem {
  kind: FeedKind;
  id: string;
  atUtc: string;
  text: string;
  actorOid?: string;
  action?: string;
  targetType?: RecordNoteTarget;
  targetId?: string;
  promotable?: boolean;
}

/** Unified activity/messages feed (spec §4) — derived merge of audit events + record notes + chat, newest first. */
export function deriveFeed(
  aircraftId: string,
  state: Pick<TechLogState, 'audit' | 'recordNotes' | 'coordinationMessages'>,
  aircraftAuditIds: Set<string>,
  asOfUtc: string,
): FeedItem[] {
  const items: FeedItem[] = [];

  for (const a of state.audit) {
    if (aircraftAuditIds.has(a.entityId)) {
      items.push({ kind: 'EVENT', id: a.id, atUtc: a.atUtc, text: a.summary, actorOid: a.actorOid, action: a.action });
    }
  }
  for (const n of currentRows(state.recordNotes).filter(n => n.aircraftId === aircraftId)) {
    items.push({ kind: 'RECORD', id: n.id, atUtc: n.atUtc, text: n.text, actorOid: n.authorOid, targetType: n.targetType, targetId: n.targetId });
  }
  for (const m of state.coordinationMessages.filter(m => m.aircraftId === aircraftId)) {
    items.push({ kind: 'CHAT', id: m.id, atUtc: m.atUtc, text: m.text, actorOid: m.authorOid, promotable: !m.promotedToNoteId });
  }

  return items
    .filter(i => i.atUtc <= asOfUtc)
    .sort((a, b) => b.atUtc.localeCompare(a.atUtc) || a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id));
}
