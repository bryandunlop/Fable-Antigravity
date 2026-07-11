// Pure grouping/filtering helpers for the Library tab. As PB/FOB/SOP/manual
// volume grows over time, the flat list becomes hard to scan — group by
// category (buckets) and let a year filter narrow "over time" accumulation.
import type { Doc, DocRevision } from '../types';
import { currentRevision } from './revisions';

function effectiveDateFor(doc: Pick<Doc, 'id'>, revisions: DocRevision[]): string | undefined {
  return currentRevision(doc.id, revisions)?.effectiveDate;
}

export interface CategoryGroup {
  category: string;
  docs: Doc[];
}

/**
 * Groups docs by category, alphabetically. Within each group: pinned first,
 * then most-recently-effective first, then id as a stable tiebreaker. Docs
 * with no published revision (no effective date) sort to the end of their
 * group — there's no "recency" to rank them by yet.
 */
export function groupDocsByCategory(docs: Doc[], revisions: DocRevision[]): CategoryGroup[] {
  const byCategory = new Map<string, Doc[]>();
  for (const doc of docs) {
    const list = byCategory.get(doc.category);
    if (list) list.push(doc);
    else byCategory.set(doc.category, [doc]);
  }

  return [...byCategory.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, list]) => ({
      category,
      docs: list.slice().sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        const ea = effectiveDateFor(a, revisions);
        const eb = effectiveDateFor(b, revisions);
        if (ea && eb && ea !== eb) return eb.localeCompare(ea);
        if (ea && !eb) return -1;
        if (!ea && eb) return 1;
        return a.id.localeCompare(b.id);
      }),
    }));
}

/** Years present among docs' current-revision effective dates, newest first. */
export function yearsFor(docs: Doc[], revisions: DocRevision[]): string[] {
  const years = new Set<string>();
  for (const doc of docs) {
    const eff = effectiveDateFor(doc, revisions);
    if (eff) years.add(eff.slice(0, 4));
  }
  return [...years].sort((a, b) => b.localeCompare(a));
}

/** 'all' always matches; otherwise a doc matches only if its published
 * revision's effective date falls in that year (undated docs never match a
 * specific year — there's nothing to filter them by yet). */
export function matchesYear(doc: Doc, revisions: DocRevision[], year: string): boolean {
  if (year === 'all') return true;
  const eff = effectiveDateFor(doc, revisions);
  return !!eff && eff.slice(0, 4) === year;
}
