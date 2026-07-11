// Pure suggestion-queue selectors (reader feedback → doc owner).
import type { Doc, DocSuggestion } from '../types';

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
