// Amendment-aware export (TL-46).
//
// The reader shows a quiet chip that expands. A file cannot expand. Once a
// document leaves myGFO as .docx or PDF it is an uncontrolled copy in somebody's
// inbox — so everything it needs must be ON the page, and the governing text must
// still be the thing that reads first.
//
// This module resolves a revision's sections into what should actually print,
// substituting each amended section's wording for the bulletin's and returning the
// front-matter facts an exported copy needs to be honest about itself.
import type { DocRevision, DocSection } from '../types';
import {
  amendmentsInForce,
  replacementSection,
  type AmendmentInForce,
  type AmendmentResolution,
} from './amendments';

export interface ExportAmendmentNote {
  sourceDocId: string;
  effectiveDate: string;
  summary: string;
  /** Display label of the section it lands at — empty for a document-wide amendment. */
  sectionLabel: string;
  /** True when the bulletin restated the wording and this export substituted it. */
  substituted: boolean;
}

export interface AmendedExport {
  /** The sections to render — amended ones already carry the governing wording. */
  sections: DocSection[];
  /** Front-matter list. Empty when nothing amends this document. */
  notes: ExportAmendmentNote[];
  /** The superseded wording, keyed by section id, for documents that want to print both. */
  supersededBySection: Record<string, DocSection>;
}

function sectionLabel(sec: DocSection | undefined): string {
  if (!sec) return '';
  return `${sec.number ? `${sec.number} ` : ''}${sec.title}`.trim();
}

/**
 * Resolve a revision for export.
 *
 * Returns the ORIGINAL sections untouched when nothing is in force, so an
 * unamended document exports exactly as it did before this existed.
 */
export function amendedExport(
  docId: string,
  rev: DocRevision,
  revisions: DocRevision[],
  resolutions: AmendmentResolution[],
): AmendedExport {
  const inForce = amendmentsInForce(docId, revisions, resolutions);
  if (inForce.length === 0) {
    return { sections: rev.sections, notes: [], supersededBySection: {} };
  }

  const bySection = new Map<string, AmendmentInForce[]>();
  for (const am of inForce) {
    if (!am.targetSectionId) continue;
    const list = bySection.get(am.targetSectionId) ?? [];
    list.push(am);
    bySection.set(am.targetSectionId, list);
  }

  const superseded: Record<string, DocSection> = {};
  const notes: ExportAmendmentNote[] = [];

  const sections = rev.sections.map((sec) => {
    const ams = bySection.get(sec.id);
    if (!ams?.length) return sec;

    // Most recently effective governs, matching the reader.
    const governing = [...ams].sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
    const replacement = replacementSection(governing, revisions);

    for (const am of ams) {
      notes.push({
        sourceDocId: am.sourceDocId,
        effectiveDate: am.effectiveDate,
        summary: am.summary,
        sectionLabel: sectionLabel(sec),
        substituted: am.id === governing.id && !!replacement,
      });
    }

    if (!replacement) return sec;
    superseded[sec.id] = sec;
    // Keep the manual's own heading, number and section id — only the body is the
    // bulletin's. An exported document that renumbered itself around an amendment
    // would not line up with the copy anyone else is holding.
    return { ...sec, blocks: replacement.blocks };
  });

  // Document-wide amendments have no section to sit at, so they only ever appear
  // in the front matter. Dropping them would silently lose them from the export.
  for (const am of inForce) {
    if (am.targetSectionId) continue;
    notes.push({
      sourceDocId: am.sourceDocId,
      effectiveDate: am.effectiveDate,
      summary: am.summary,
      sectionLabel: '',
      substituted: false,
    });
  }

  return { sections, notes, supersededBySection: superseded };
}

/**
 * One line per amendment for the export's front matter.
 *
 * Deliberately plain text: it has to survive .docx, print HTML and a plain-text
 * paste into an email without carrying markup with it.
 */
export function amendmentNoteLine(note: ExportAmendmentNote, formatDate: (iso: string) => string): string {
  const where = note.sectionLabel ? `§${note.sectionLabel}` : 'Document-wide';
  const how = note.substituted ? 'text replaced below' : 'see the bulletin';
  return `${where} — amended by ${note.sourceDocId}, effective ${formatDate(note.effectiveDate)} (${how}). ${note.summary}`;
}
