// Pure periodic-review math. Review state is DERIVED from nextReviewDate — never
// stored as a flag (the platform's projection discipline).
import type { Doc } from '../types';

export type ReviewStatus = 'ok' | 'due-soon' | 'overdue' | 'none';

const DUE_SOON_DAYS = 30;

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function computeNextReviewDate(todayIso: string, cycleDays: number): string {
  return addDays(todayIso, cycleDays);
}

export function reviewStatus(doc: Pick<Doc, 'nextReviewDate'>, todayIso: string): ReviewStatus {
  if (!doc.nextReviewDate) return 'none';
  if (doc.nextReviewDate < todayIso) return 'overdue';
  if (doc.nextReviewDate <= addDays(todayIso, DUE_SOON_DAYS)) return 'due-soon';
  return 'ok';
}

/** Docs whose review is due-soon or overdue (owner + document-manager chase list). */
export function docsDueForReview(docs: Doc[], todayIso: string): Doc[] {
  return docs.filter((d) => {
    if (d.isArchived) return false;
    const s = reviewStatus(d, todayIso);
    return s === 'due-soon' || s === 'overdue';
  });
}
