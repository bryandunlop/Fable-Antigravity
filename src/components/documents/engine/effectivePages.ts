// Status of contents — the artefact you hand an auditor (Phase 3).
//
// Every fact needed for this already existed; nothing assembled them. It answers
// one question in one page: *is this document current, and how would you know?*
//
// It is called "status of contents", not "List of Effective Pages", on purpose.
// An LEP exists because paper cannot be asked what it says — you reconcile a
// manifest against the sheets in a binder. Ours can be asked. Pages are a
// rendering artefact that changes with paper size and font; the SECTION is the
// thing that actually carries a revision, so the report names sections and stays
// true however it is printed.
//
// Nothing in regulation requires this for a plain Part 91 operator (see the vault
// note ref-part91-document-obligations). It exists because IS-BAO §6.2 is audited
// and because one page that answers "is this library current" is worth having
// before somebody asks for it.
import type { Doc, DocRevision } from '../types';
import { amendmentsInForce, type AmendmentResolution } from './amendments';
import { currentRevision, revisionsFor } from './revisions';
import { isTargetRole } from './acknowledgments';
import type { DocAcknowledgment } from '../types';

export interface EffectiveRow {
  sectionId: string;
  /** Section number as the document numbers it, or '' when unnumbered. */
  number: string;
  title: string;
  /** The revision label this section's wording came in with. */
  revisionLabel: string;
  effectiveDate: string;
  /** Bulletin ids amending this section, newest first. Empty when current. */
  amendedBy: string[];
}

export interface EffectivePagesReport {
  docId: string;
  docTitle: string;
  classLabel: string;
  revisionLabel: string;
  effectiveDate: string;
  /** Content digest of the published revision. */
  checksum: string;
  rows: EffectiveRow[];
  sectionCount: number;
  amendedCount: number;
  /** Acknowledgement standing for this revision. */
  acknowledged: number;
  ackRequired: number;
  approvedBy?: string;
  approvedOn?: string;
  authoredBy?: string;
}

/**
 * Which revision a section's wording actually dates from.
 *
 * A manual at revision 14 does not mean every section was touched at 14 — most
 * were last changed years earlier, and saying "14" against all of them is the
 * lie an LEP exists to prevent. So we walk the published history oldest-first and
 * record the revision in which each section's content last changed.
 */
function sectionOrigins(docId: string, revisions: DocRevision[]): Map<string, { label: string; date: string }> {
  const history = revisionsFor(docId, revisions)
    .filter((r) => r.status === 'published' || r.status === 'superseded')
    .slice()
    .sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));

  const origins = new Map<string, { label: string; date: string }>();
  const lastSeen = new Map<string, string>();

  for (const rev of history) {
    for (const sec of rev.sections) {
      const body = sec.blocks.map((b) => b.md).join('\n');
      if (lastSeen.get(sec.id) === body) continue; // unchanged in this revision
      lastSeen.set(sec.id, body);
      origins.set(sec.id, { label: rev.revision, date: rev.effectiveDate });
    }
  }
  return origins;
}

export function buildEffectivePages(
  doc: Doc,
  classLabel: string,
  revisions: DocRevision[],
  resolutions: AmendmentResolution[],
  acks: DocAcknowledgment[],
  readerRoles: string[],
): EffectivePagesReport | undefined {
  const rev = currentRevision(doc.id, revisions);
  if (!rev) return undefined;

  const origins = sectionOrigins(doc.id, revisions);
  const inForce = amendmentsInForce(doc.id, revisions, resolutions);

  const rows: EffectiveRow[] = rev.sections.map((sec) => {
    const origin = origins.get(sec.id);
    const amending = inForce
      .filter((a) => a.targetSectionId === sec.id)
      .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
    return {
      sectionId: sec.id,
      number: sec.number,
      title: sec.title,
      revisionLabel: origin?.label ?? rev.revision,
      effectiveDate: origin?.date ?? rev.effectiveDate,
      amendedBy: amending.map((a) => a.sourceDocId),
    };
  });

  const required = rev.requireAcknowledgment && rev.ackLevel !== 'none'
    ? readerRoles.filter((r) => isTargetRole(doc, r)).length
    : 0;
  const acknowledged = acks.filter((a) => a.revisionId === rev.id).length;

  return {
    docId: doc.id,
    docTitle: doc.title,
    classLabel,
    revisionLabel: rev.revision,
    effectiveDate: rev.effectiveDate,
    checksum: rev.mockChecksum ?? '',
    rows,
    sectionCount: rows.length,
    amendedCount: rows.filter((r) => r.amendedBy.length > 0).length,
    acknowledged,
    ackRequired: required,
    approvedBy: rev.decidedByName,
    approvedOn: rev.decidedAtUtc?.slice(0, 10),
    authoredBy: rev.authorName,
  };
}
