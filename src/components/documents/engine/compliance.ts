// Pure compliance-roster math for the manager dashboard + CSV export.
import type { Doc, DocRevision, DocAcknowledgment } from '../types';
import { acknowledgedFor, isOverdue, isTargetRole, type Reader } from './acknowledgments';
import { currentRevision } from './revisions';

/** Expand a doc's audience roles against the role universe ('all' ⇒ everyone).
 * Dedupes by userId — several roles can resolve to the same representative user. */
export function readersFor(doc: Pick<Doc, 'roles'>, roleUniverse: Reader[]): Reader[] {
  const targeted = roleUniverse.filter((r) => isTargetRole(doc, r.role));
  const seen = new Set<string>();
  return targeted.filter((r) => (seen.has(r.userId) ? false : (seen.add(r.userId), true)));
}

export interface RosterRow {
  reader: Reader;
  ack?: DocAcknowledgment;
}

export function rosterFor(
  rev: Pick<DocRevision, 'id'>,
  readers: Reader[],
  acks: DocAcknowledgment[],
): RosterRow[] {
  const revAcks = acknowledgedFor(rev, acks);
  return readers.map((reader) => ({
    reader,
    ack: revAcks.find((a) => a.userId === reader.userId),
  }));
}

export interface ComplianceSummary {
  total: number;
  read: number;
  outstanding: number;
  pct: number; // 0–100, rounded; 0 when there are no target readers — read `applicable` to distinguish
  applicable: boolean; // false when the doc has no target readers; a zero roster is N/A, not 100% read
  overdue: boolean;
}

export function complianceSummary(
  rev: Pick<DocRevision, 'id' | 'ackDueDate'>,
  readers: Reader[],
  acks: DocAcknowledgment[],
  todayIso: string,
): ComplianceSummary {
  const roster = rosterFor(rev, readers, acks);
  const read = roster.filter((r) => r.ack).length;
  const total = roster.length;
  return {
    total,
    read,
    outstanding: total - read,
    // No target readers ⇒ no compliance obligation. Report 0/false and let the
    // UI show "N/A" — never a misleading 100% that reads as fully compliant (C9).
    pct: total === 0 ? 0 : Math.round((read / total) * 100),
    applicable: total > 0,
    overdue: isOverdue(rev, todayIso) && read < total,
  };
}

export interface OverallCompliance {
  read: number;
  total: number;
  pct: number | null; // null when no doc has any target readers (nothing to be compliant about)
}

/** Fleet-wide compliance across current required-read revisions, weighted by roster
 * size (a 20-reader doc counts more than a 2-reader doc). Empty rosters contribute
 * nothing to either total, so they neither inflate nor deflate the number (C9). */
export function overallCompliance(
  docs: Doc[],
  revisions: DocRevision[],
  acks: DocAcknowledgment[],
  roleUniverse: Reader[],
): OverallCompliance {
  let read = 0;
  let total = 0;
  for (const doc of docs) {
    if (doc.isArchived) continue;
    const rev = currentRevision(doc.id, revisions);
    if (!rev || !rev.requireAcknowledgment || rev.ackLevel === 'none') continue;
    const roster = rosterFor(rev, readersFor(doc, roleUniverse), acks);
    total += roster.length;
    read += roster.filter((r) => r.ack).length;
  }
  return { read, total, pct: total === 0 ? null : Math.round((read / total) * 100) };
}

export interface ChaseRow {
  doc: Doc;
  rev: DocRevision;
  reader: Reader;
  ackDueDate: string;
}

/** Reader × doc rows past the ack due date — the "overdue chase" list. */
export function overdueChaseList(
  docs: Doc[],
  revisions: DocRevision[],
  acks: DocAcknowledgment[],
  roleUniverse: Reader[],
  todayIso: string,
): ChaseRow[] {
  const rows: ChaseRow[] = [];
  for (const doc of docs) {
    if (doc.isArchived) continue;
    const rev = currentRevision(doc.id, revisions);
    if (!rev || !rev.requireAcknowledgment || rev.ackLevel === 'none') continue;
    if (!rev.ackDueDate || !isOverdue(rev, todayIso)) continue;
    const readers = readersFor(doc, roleUniverse);
    for (const row of rosterFor(rev, readers, acks)) {
      if (!row.ack) rows.push({ doc, rev, reader: row.reader, ackDueDate: rev.ackDueDate });
    }
  }
  return rows;
}

/** Stable CSV shape for the auditor export (fed to inventory-v2 downloadCSV). */
export const COMPLIANCE_CSV_HEADERS = [
  'Document',
  'Title',
  'Class',
  'Revision',
  'Effective',
  'Ack due',
  'Reader',
  'Role',
  'Status',
  'Acknowledged at (UTC)',
  'Method',
];

export function complianceCsvRows(
  docs: Doc[],
  revisions: DocRevision[],
  acks: DocAcknowledgment[],
  roleUniverse: Reader[],
  classLabelFor: (classId: string) => string,
  readerNameFor: (userId: string, role: string) => string,
): string[][] {
  const rows: string[][] = [];
  for (const doc of docs) {
    if (doc.isArchived) continue;
    const rev = currentRevision(doc.id, revisions);
    if (!rev || !rev.requireAcknowledgment || rev.ackLevel === 'none') continue;
    const readers = readersFor(doc, roleUniverse);
    for (const row of rosterFor(rev, readers, acks)) {
      rows.push([
        doc.id,
        doc.title,
        classLabelFor(doc.classId),
        rev.revision,
        rev.effectiveDate,
        rev.ackDueDate ?? '',
        row.ack?.userName ?? readerNameFor(row.reader.userId, row.reader.role),
        row.reader.role,
        row.ack ? 'Acknowledged' : 'Outstanding',
        row.ack?.acknowledgedAtUtc ?? '',
        row.ack ? row.ack.level : '',
      ]);
    }
  }
  return rows;
}
