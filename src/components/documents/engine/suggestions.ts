// Pure suggestion-queue selectors (reader feedback → doc owner).
import type { Doc, DocSuggestion, DocSuggestionReply } from '../types';
import { canManageDocuments } from '../roles';

/** Open suggestions on documents the given user owns, newest first. */
export function openSuggestionsForOwner(
  suggestions: DocSuggestion[],
  docs: Doc[],
  ownerUserId: string,
): DocSuggestion[] {
  const owned = new Set(docs.filter((d) => d.ownerUserId === ownerUserId).map((d) => d.id));
  return suggestions
    .filter((s) => s.status === 'open' && owned.has(s.docId))
    .slice()
    .sort((a, b) => b.createdAtUtc.localeCompare(a.createdAtUtc));
}

export function openSuggestions(suggestions: DocSuggestion[]): DocSuggestion[] {
  return suggestions
    .filter((s) => s.status === 'open')
    .slice()
    .sort((a, b) => b.createdAtUtc.localeCompare(a.createdAtUtc));
}

export function suggestionCounts(
  suggestions: DocSuggestion[],
  docId: string,
): { open: number; resolved: number } {
  const forDoc = suggestions.filter((s) => s.docId === docId);
  return {
    open: forDoc.filter((s) => s.status === 'open').length,
    resolved: forDoc.filter((s) => s.status !== 'open').length,
  };
}

/** Open, block-anchored suggestions grouped by blockId (oldest-first within a block).
 * Drives the inline reader pins; suggestions with no blockId are excluded. */
export function openSuggestionsByBlock(suggestions: DocSuggestion[]): Map<string, DocSuggestion[]> {
  const byBlock = new Map<string, DocSuggestion[]>();
  suggestions
    .filter((s) => s.status === 'open' && s.blockId)
    .slice()
    .sort((a, b) => a.createdAtUtc.localeCompare(b.createdAtUtc))
    .forEach((s) => {
      const list = byBlock.get(s.blockId!) ?? [];
      list.push(s);
      byBlock.set(s.blockId!, list);
    });
  return byBlock;
}

/** A suggestion's inline-thread replies, chronological. */
export function repliesFor(replies: DocSuggestionReply[], suggestionId: string): DocSuggestionReply[] {
  return replies
    .filter((r) => r.suggestionId === suggestionId)
    .slice()
    .sort((a, b) => a.createdAtUtc.localeCompare(b.createdAtUtc));
}

/** Pin/thread visibility (spec S-1): owner and managers see everything on their
 * docs; an author always sees their own suggestion. */
export function canSeeSuggestion(sug: DocSuggestion, userId: string, roles: string[], doc: Doc): boolean {
  if (canManageDocuments(roles[0] ?? '', roles.slice(1))) return true;
  if (doc.ownerUserId === userId) return true;
  return sug.authorUserId === userId;
}
