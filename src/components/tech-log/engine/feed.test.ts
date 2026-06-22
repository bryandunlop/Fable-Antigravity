import { describe, it, expect } from 'vitest';
import { deriveFeed } from './feed';
import type { AuditEntry, RecordNote, CoordinationMessage } from '../types';

const AC = 'ac1';
const audit = (p: Partial<AuditEntry> = {}): AuditEntry => ({ id: 'a1', actorOid: 'u', action: 'BRIEFING_RELEASED', entityType: 'FlightBriefing', entityId: 'b1', atUtc: '2026-06-21T09:00:00Z', summary: 'released', ...p });
const note = (p: Partial<RecordNote> = {}): RecordNote => ({ id: 'n1', aircraftId: AC, targetType: 'DEFECT', targetId: 'd1', authorOid: 'u', authorName: 'A Tech', text: 'photo attached', atUtc: '2026-06-21T08:50:00Z', ...p });
const msg = (p: Partial<CoordinationMessage> = {}): CoordinationMessage => ({ id: 'm1', aircraftId: AC, authorOid: 'u', text: 'land 1800', atUtc: '2026-06-21T09:30:00Z', ...p });

describe('deriveFeed', () => {
  it('merges audit + notes + chat newest-first', () => {
    const ids = new Set(['b1']);
    const f = deriveFeed(AC, { audit: [audit()], recordNotes: [note()], coordinationMessages: [msg()] }, ids, '2026-06-22T00:00:00Z');
    expect(f.map(i => i.kind)).toEqual(['CHAT', 'EVENT', 'RECORD']); // 09:30, 09:00, 08:50
  });
  it('includes only audit rows for this aircraft (by id set or tail summary)', () => {
    const ids = new Set(['b1']);
    const other = audit({ id: 'a2', entityId: 'zzz', summary: 'unrelated' });
    const f = deriveFeed(AC, { audit: [audit(), other], recordNotes: [], coordinationMessages: [] }, ids, '2026-06-22T00:00:00Z');
    expect(f.map(i => i.id)).toEqual(['a1']);
  });
  it('marks an un-promoted chat message promotable; promoted is not', () => {
    const ids = new Set<string>();
    const f = deriveFeed(AC, { audit: [], recordNotes: [], coordinationMessages: [msg(), msg({ id: 'm2', promotedToNoteId: 'n9' })] }, ids, '2026-06-22T00:00:00Z');
    expect(f.find(i => i.id === 'm1')?.promotable).toBe(true);
    expect(f.find(i => i.id === 'm2')?.promotable).toBe(false);
  });
  it('excludes superseded record notes', () => {
    const ids = new Set<string>();
    const f = deriveFeed(AC, { audit: [], recordNotes: [note({ id: 'n1' }), note({ id: 'n2', supersedesId: 'n1' })], coordinationMessages: [] }, ids, '2026-06-22T00:00:00Z');
    expect(f.filter(i => i.kind === 'RECORD').map(i => i.id)).toEqual(['n2']);
  });
});
