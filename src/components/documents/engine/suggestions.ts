// Pure suggestion-queue selectors (reader feedback → doc owner).
import type { Doc, DocRevision, DocSuggestion, DocSuggestionReply } from '../types';
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

/**
 * The reference to show for a suggestion: the anchored block (section label +
 * excerpt, resolved from the revision it was filed against) or the legacy
 * free-text ref. Shared by the reader thread, the hub queue and the workbench,
 * so all three name the same place the same way.
 */
export function anchorFor(sug: DocSuggestion, revisions: DocRevision[]): string | undefined {
  if (sug.blockId) {
    const rev = revisions.find((r) => r.id === sug.revisionId);
    for (const sec of rev?.sections ?? []) {
      const b = sec.blocks.find((bl) => bl.id === sug.blockId);
      if (b) {
        const label = `${sec.number ? `${sec.number} ` : ''}${sec.title}`.trim() || 'Preamble';
        const excerpt = b.md.replace(/[#>*`_|~-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);
        return `${label} · "${excerpt}"`;
      }
    }
  }
  return sug.sectionRef;
}

/** The block a suggestion was filed against, as it read in that revision. Shown
 * beside the proposal so a maintainer can judge it without leaving the queue. */
export function anchorBlockMd(sug: DocSuggestion, revisions: DocRevision[]): string | undefined {
  if (!sug.blockId) return undefined;
  const rev = revisions.find((r) => r.id === sug.revisionId);
  for (const sec of rev?.sections ?? []) {
    const b = sec.blocks.find((bl) => bl.id === sug.blockId);
    if (b) return b.md;
  }
  return undefined;
}

/** The credit line for one accepted suggestion. Word-for-word what the old
 * single-suggestion prefill produced, so nothing reads differently in that case. */
function creditLine(sug: Pick<DocSuggestion, 'authorName' | 'proposedChange'>): string {
  return `Incorporates feedback from ${sug.authorName}: ${sug.proposedChange}`;
}

/**
 * Append an accepted suggestion's credit to the change summary.
 *
 * IDEMPOTENT: a replayed action, or re-accepting after an undo, must not
 * duplicate the line. The first suggestion reads as a plain sentence; each
 * further one becomes a bullet, so a revision carrying five reader changes
 * credits all five.
 */
export function appendChangeSummary(
  existing: string,
  sug: Pick<DocSuggestion, 'authorName' | 'proposedChange'>,
): string {
  const line = creditLine(sug);
  const trimmed = existing.trim();
  if (!trimmed) return line;
  if (trimmed.split('\n').some((l) => l.replace(/^-\s*/, '').trim() === line)) return existing;
  return `${trimmed}\n- ${line}`;
}

/** Pin/thread visibility (spec S-1): owner and managers see everything on their
 * docs; an author always sees their own suggestion. */
export function canSeeSuggestion(sug: DocSuggestion, userId: string, roles: string[], doc: Doc): boolean {
  if (canManageDocuments(roles[0] ?? '', roles.slice(1))) return true;
  if (doc.ownerUserId === userId) return true;
  return sug.authorUserId === userId;
}
