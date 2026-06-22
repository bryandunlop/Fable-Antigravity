import type { CoordinationMessage, RecordNote, RecordNoteTarget } from '../types';

/** One-way promote (spec §Promote): chat message -> append-only record note on an entity. Returns the new note
 *  and the patched message (caller dispatches ADD_RECORD_NOTE + EDIT_COORDINATION_MESSAGE). */
export function buildPromotion(
  message: CoordinationMessage,
  target: { type: RecordNoteTarget; id: string },
  authorName: string,
  newNoteId: string,
  atUtc: string,
): { note: RecordNote; messagePatch: CoordinationMessage } {
  const note: RecordNote = {
    id: newNoteId,
    aircraftId: message.aircraftId,
    targetType: target.type,
    targetId: target.id,
    authorOid: message.authorOid,
    authorName,
    text: message.text,
    attachments: message.attachments,
    atUtc,
    sourceMessageId: message.id,
  };
  return { note, messagePatch: { ...message, promotedToNoteId: newNoteId } };
}
