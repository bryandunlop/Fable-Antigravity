// Library-wide full-text search (TL-46's sibling gap).
//
// Until now the hub filtered title, id, category and tags — nothing read block
// content — so the single most common thing anyone does with a manual ("where
// does it say that?") had no answer in the product. Bryan, 2026-08-21, on how
// people find things today: "depends on the person. A mix of all." No shared
// strategy means no strategy works.
//
// Two rules do the safety work here:
//
//  1. **Only the current published revision is searched.** A superseded revision
//     must never surface — not ranked lower, not at all. Search results are read
//     in a hurry, on a ramp, and a plausible-looking hit on last year's wording is
//     worse than no hit.
//  2. **Amended sections are searched as they GOVERN.** The reader substitutes a
//     bulletin's wording into an amended section; search reads the same
//     substitution, so a hit can never show text that no longer applies.
import type { Doc, DocRevision, DocSection } from '../types';
import { currentRevision } from './revisions';
import { amendedExport } from './exportAmendments';
import { expandQuery, tokenize } from './aviationTerms';
import type { AmendmentResolution } from './amendments';

/** A run of snippet text, flagged when it matched. */
export interface SnippetRun {
  text: string;
  match: boolean;
}

export interface SearchHit {
  docId: string;
  docTitle: string;
  classId: string;
  revisionLabel: string;
  sectionId: string;
  /** "3.3 Flight Planning" — number and title as the document numbers them. */
  sectionLabel: string;
  snippet: SnippetRun[];
  score: number;
  /** Set when this section's wording comes from a bulletin rather than the document. */
  amendedBy?: string;
}

export interface SearchResult {
  hits: SearchHit[];
  /** Which typed words were widened, and into what — so the UI can say so. */
  expandedFrom: Map<string, string[]>;
  /** Distinct documents represented, for the result count line. */
  docCount: number;
}

const SNIPPET_RADIUS = 90;

function sectionLabel(sec: DocSection): string {
  return `${sec.number ? `${sec.number} ` : ''}${sec.title}`.trim();
}

function sectionText(sec: DocSection): string {
  return sec.blocks.map((b) => b.md).join('\n');
}

/**
 * Find every match position for any term, longest-first.
 *
 * Longest-first matters: with both "mel" and "minimum equipment list" active,
 * matching the short one first would leave "equipment list" unhighlighted and the
 * snippet would look like it matched the wrong thing.
 */
function matchRanges(haystack: string, terms: string[]): Array<[number, number]> {
  const lower = haystack.toLowerCase();
  const ranges: Array<[number, number]> = [];
  for (const term of [...terms].sort((a, b) => b.length - a.length)) {
    let from = 0;
    for (;;) {
      const at = lower.indexOf(term, from);
      if (at === -1) break;
      // Whole-word only. Without this "ad" matches "additional", and an
      // airworthiness-directive search returns most of the library.
      const before = at === 0 ? ' ' : lower[at - 1];
      const after = at + term.length >= lower.length ? ' ' : lower[at + term.length];
      const wordish = /[a-z0-9]/;
      if (!wordish.test(before) && !wordish.test(after)) ranges.push([at, at + term.length]);
      from = at + term.length;
    }
  }
  return ranges.sort((a, b) => a[0] - b[0]);
}

/** Merge overlaps so a doubly-matched span highlights once. */
function mergeRanges(ranges: Array<[number, number]>): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (const r of ranges) {
    const last = out[out.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else out.push([...r] as [number, number]);
  }
  return out;
}

function buildSnippet(text: string, ranges: Array<[number, number]>): SnippetRun[] {
  if (ranges.length === 0) return [{ text: text.slice(0, SNIPPET_RADIUS * 2), match: false }];
  const start = Math.max(0, ranges[0][0] - SNIPPET_RADIUS);
  const end = Math.min(text.length, ranges[ranges.length - 1][1] + SNIPPET_RADIUS);
  const runs: SnippetRun[] = [];
  let cursor = start;
  for (const [a, b] of ranges) {
    if (b <= start || a >= end) continue;
    if (a > cursor) runs.push({ text: text.slice(cursor, a), match: false });
    runs.push({ text: text.slice(Math.max(a, start), Math.min(b, end)), match: true });
    cursor = Math.min(b, end);
  }
  if (cursor < end) runs.push({ text: text.slice(cursor, end), match: false });
  if (start > 0 && runs.length) runs[0] = { ...runs[0], text: `…${runs[0].text.replace(/^\S*\s/, '')}` };
  if (end < text.length && runs.length) {
    const last = runs[runs.length - 1];
    runs[runs.length - 1] = { ...last, text: `${last.text.replace(/\s\S*$/, '')}…` };
  }
  return runs;
}

/**
 * Search every document's governing content.
 *
 * `docs` is filtered by the caller for visibility; this function additionally
 * skips archived and retired documents, because neither is the operative
 * instruction and a hit on one would send a reader to superseded guidance.
 */
export function searchDocuments(
  query: string,
  docs: Doc[],
  revisions: DocRevision[],
  resolutions: AmendmentResolution[],
): SearchResult {
  const trimmed = query.trim();
  if (trimmed.length < 2) return { hits: [], expandedFrom: new Map(), docCount: 0 };

  const { terms, expandedFrom } = expandQuery(trimmed);
  const typed = new Set(tokenize(trimmed));
  const hits: SearchHit[] = [];

  for (const doc of docs) {
    if (doc.isArchived || doc.retirement) continue;
    const rev = currentRevision(doc.id, revisions);
    if (!rev) continue;

    // Read the sections as they govern, amendments substituted in.
    const view = amendedExport(doc.id, rev, revisions, resolutions);
    const amendedIds = new Set(Object.keys(view.supersededBySection));

    for (const sec of view.sections) {
      const label = sectionLabel(sec);
      const body = sectionText(sec);
      const bodyRanges = mergeRanges(matchRanges(body, terms));
      const headingRanges = matchRanges(label, terms);
      if (bodyRanges.length === 0 && headingRanges.length === 0) continue;

      // Heading and title matches outrank body matches — someone searching
      // "fuelling" wants the section called Fuelling before a passing mention of
      // it. A term the user actually typed outranks one we widened into.
      const typedBonus = terms.some((t) => typed.has(t) && body.toLowerCase().includes(t)) ? 2 : 0;
      const score =
        headingRanges.length * 10 +
        bodyRanges.length +
        typedBonus +
        (matchRanges(doc.title, terms).length ? 5 : 0);

      const amendedBy = amendedIds.has(sec.id)
        ? view.notes.find((n) => n.sectionLabel === label && n.substituted)?.sourceDocId
        : undefined;

      hits.push({
        docId: doc.id,
        docTitle: doc.title,
        classId: doc.classId,
        revisionLabel: rev.revision,
        sectionId: sec.id,
        sectionLabel: label,
        snippet: buildSnippet(body, bodyRanges),
        score,
        amendedBy,
      });
    }
  }

  hits.sort((a, b) => b.score - a.score || a.docId.localeCompare(b.docId));
  return { hits, expandedFrom, docCount: new Set(hits.map((h) => h.docId)).size };
}
