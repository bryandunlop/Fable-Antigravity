// Pure revision math. No React / no storage — unit-tested.
import type { Doc, DocRevision } from '../types';
import type { DocumentClassConfig } from '../classes';
import { computeNextReviewDate } from './review';

/** The single currently-published revision of a doc (at most one — publish supersedes). */
export function currentRevision(docId: string, revisions: DocRevision[]): DocRevision | undefined {
  return revisions.find((r) => r.docId === docId && r.status === 'published');
}

/** All revisions of a doc, newest first (by revision id sequence). */
export function revisionsFor(docId: string, revisions: DocRevision[]): DocRevision[] {
  return revisions.filter((r) => r.docId === docId).slice().reverse();
}

/** The superseded revision immediately before the current published one — the
 * baseline the reader diffs against. Ordered by the numeric '-rN' id suffix (so
 * r10 outranks r2), newest first. Undefined when there is no prior. */
export function priorPublishedRevision(docId: string, revisions: DocRevision[]): DocRevision | undefined {
  const seq = (r: DocRevision): number => {
    const m = /-r(\d+)$/.exec(r.id);
    return m ? parseInt(m[1], 10) : 0;
  };
  return revisions
    .filter((r) => r.docId === docId && r.status === 'superseded')
    .slice()
    .sort((a, b) => seq(b) - seq(a))[0];
}

/** '1.0' → '2.0' (major) | '1.1' (minor); undefined → '1.0'. Non-numeric labels restart at '1.0'. */
export function nextRevisionLabel(prior: string | undefined, kind: 'major' | 'minor' = 'major'): string {
  if (!prior) return '1.0';
  const m = /^(\d+)\.(\d+)$/.exec(prior.trim());
  if (!m) return '1.0';
  const major = parseInt(m[1], 10);
  const minor = parseInt(m[2], 10);
  return kind === 'major' ? `${major + 1}.0` : `${major}.${minor + 1}`;
}

/** Next doc id for a class: max numeric suffix across the class + 1, zero-padded to 3. */
export function nextDocId(cfg: Pick<DocumentClassConfig, 'idPrefix'>, docs: Pick<Doc, 'id'>[]): string {
  const re = new RegExp(`^${cfg.idPrefix}-(\\d+)$`);
  const max = docs.reduce((acc, d) => {
    const m = re.exec(d.id);
    return m ? Math.max(acc, parseInt(m[1], 10)) : acc;
  }, 0);
  return `${cfg.idPrefix}-${String(max + 1).padStart(3, '0')}`;
}

/** Next revision id for a doc: monotonic '-rN' suffix over ALL existing revisions of the doc. */
export function nextRevisionId(docId: string, revisions: Pick<DocRevision, 'docId'>[]): string {
  const n = revisions.filter((r) => r.docId === docId).length + 1;
  return `${docId}-r${n}`;
}

/**
 * Publish a revision: supersede the prior published revision (single-published
 * invariant) and reset the doc's review clock. Returns new arrays (no mutation).
 */
export function applyPublish(
  state: { docs: Doc[]; revisions: DocRevision[] },
  revisionId: string,
  nowUtc: string,
  todayIso: string,
): { docs: Doc[]; revisions: DocRevision[] } {
  const target = state.revisions.find((r) => r.id === revisionId);
  if (!target) return state;
  const revisions = state.revisions.map((r) => {
    if (r.id === revisionId) return { ...r, status: 'published' as const, publishedAtUtc: nowUtc };
    if (r.docId === target.docId && r.status === 'published') return { ...r, status: 'superseded' as const };
    return r;
  });
  const docs = state.docs.map((d) => {
    if (d.id !== target.docId) return d;
    return d.reviewCycleDays
      ? { ...d, nextReviewDate: computeNextReviewDate(todayIso, d.reviewCycleDays) }
      : d;
  });
  return { docs, revisions };
}

/** Lazily promote 'approved' (scheduled) revisions whose effectiveDate has arrived. */
export function promoteScheduled(
  state: { docs: Doc[]; revisions: DocRevision[] },
  nowUtc: string,
  todayIso: string,
): { docs: Doc[]; revisions: DocRevision[] } {
  const due = state.revisions.filter((r) => r.status === 'approved' && r.effectiveDate <= todayIso);
  return due.reduce((acc, r) => applyPublish(acc, r.id, nowUtc, todayIso), state);
}
