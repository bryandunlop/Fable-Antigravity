import { describe, it, expect } from 'vitest';
import { buildPromotion } from './promote';
import type { CoordinationMessage } from '../types';

const msg: CoordinationMessage = { id: 'm1', aircraftId: 'ac1', authorOid: 'u', text: 'gear felt notchy on taxi', atUtc: '2026-06-21T09:30:00Z', attachments: [{ id: 'att1', filename: 'p.jpg', contentType: 'image/jpeg', bytes: 10, sha256: 'abc', uri: 'data:...', capturedAtUtc: '2026-06-21T09:30:00Z' }] };

describe('buildPromotion', () => {
  it('creates a record note on the target carrying the text + attachments + source link', () => {
    const { note } = buildPromotion(msg, { type: 'DEFECT', id: 'd1' }, 'Capt R', 'n1', '2026-06-21T10:00:00Z');
    expect(note).toMatchObject({ id: 'n1', aircraftId: 'ac1', targetType: 'DEFECT', targetId: 'd1', authorName: 'Capt R', text: 'gear felt notchy on taxi', sourceMessageId: 'm1', atUtc: '2026-06-21T10:00:00Z' });
    expect(note.attachments).toHaveLength(1);
  });
  it('patches the message to mark it promoted (one-way)', () => {
    const { messagePatch } = buildPromotion(msg, { type: 'DEFECT', id: 'd1' }, 'Capt R', 'n1', '2026-06-21T10:00:00Z');
    expect(messagePatch.promotedToNoteId).toBe('n1');
    expect(messagePatch.id).toBe('m1');
  });
});
