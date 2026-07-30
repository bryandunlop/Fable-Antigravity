// D64 — the Ship Notes shelf: what a tail page shows about THIS aircraft.
//
// Sits alongside `casKnowledge.ts` rather than inside it. That module feeds the defect form's CAS
// picker (D57/D60); churning it to add shelf grouping would put a reader concern in an intake path.
// Both read the same store and the same `appliesToFleet` rule, so there is one applicability
// definition, not two.
//
// Pure derivation — no React, no storage. The shelf is never a stored list; it is a projection of
// whatever is published right now, so a curator's publish appears with no sync step.
import type { AircraftType } from '../../tech-log/types';
import type { Doc, DocRevision, DocCmcRow } from '../types';
import { SHIP_NOTE_SECTIONS, type ShipNoteSection } from '../classes';
import { currentRevision } from './revisions';
import { appliesToFleet, CAS_KNOWLEDGE_CLASS_ID } from './casKnowledge';

export interface ShipNoteSectionGroup {
  category: ShipNoteSection;
  docs: Doc[];
  /** This reader's own section — expanded first. Never a filter: D64 keeps every section
   *  reachable, because D60 built this so a pilot COULD read what maintenance knows. */
  isMine: boolean;
}

/** Does a doc's audience include this reader? `all` is everyone's, which is why shared
 *  knowledge is never buried in a collapsed section. */
function targetsReader(doc: Doc, viewerRoles: string[]): boolean {
  return doc.roles.includes('all') || doc.roles.some((r) => viewerRoles.includes(r));
}

/** Live entries of one class for one fleet: not archived, and carrying a PUBLISHED revision that
 *  names the type. Mirrors `casKnowledge.liveFleetEntries`, widened to any class so the shelf can
 *  also surface controlled SOPs. */
function liveForFleet(
  docs: Doc[],
  revisions: DocRevision[],
  fleetType: AircraftType,
  classId: string,
): Doc[] {
  const out: Doc[] = [];
  for (const doc of docs) {
    if (doc.classId !== classId || doc.isArchived) continue;
    const rev = currentRevision(doc.id, revisions);
    if (!rev) continue;
    if (!appliesToFleet(rev, fleetType)) continue;
    out.push(doc);
  }
  return out;
}

/**
 * The shelf: one group per configured section, in configured order, with this reader's own
 * sections marked.
 *
 * Every section is returned even when empty, so the shelf's shape is stable between tails and a
 * reader learns where things live. A category outside the vocabulary (an airport note that somehow
 * carries fleetTypes) is dropped rather than given a section of its own — the headings are config,
 * and content cannot invent one.
 */
export function shipNoteSections(
  docs: Doc[],
  revisions: DocRevision[],
  fleetType: AircraftType,
  viewerRoles: string[],
): ShipNoteSectionGroup[] {
  const live = liveForFleet(docs, revisions, fleetType, CAS_KNOWLEDGE_CLASS_ID);
  return SHIP_NOTE_SECTIONS.map((category) => {
    const inSection = live.filter((d) => d.category === category);
    return {
      category,
      docs: inSection,
      isMine: inSection.some((d) => targetsReader(d, viewerRoles)),
    };
  });
}

/**
 * The controlled half of D64's split: procedures performed ON the aircraft (a chart or
 * navigation-database load) live in the `sop` class behind four-eyes, and the shelf links out to
 * them rather than restating them.
 */
export function fleetProcedures(docs: Doc[], revisions: DocRevision[], fleetType: AircraftType): Doc[] {
  return liveForFleet(docs, revisions, fleetType, 'sop');
}

export interface CmcAtaGroup {
  ataChapter: string;
  rows: DocCmcRow[];
}

/**
 * Known-nuisance CMC rows grouped by ATA chapter, filtered by a free-text query.
 *
 * ATA is the grouping because it is how a tech thinks and how the source document is organised.
 * The query matches message name OR maintenance code, case-insensitively — the realistic use is
 * someone holding a TOD report, typing what they see, wanting to know if it is already known.
 * A chapter with no surviving rows is dropped, so a search never shows empty headings.
 */
export function cmcRowsByAta(rows: DocCmcRow[], query: string): CmcAtaGroup[] {
  const q = query.trim().toLowerCase();
  const matched = q
    ? rows.filter((r) => r.messageName.toLowerCase().includes(q) || r.maintCode.toLowerCase().includes(q))
    : rows;
  const byChapter = new Map<string, DocCmcRow[]>();
  for (const r of matched) {
    const list = byChapter.get(r.ataChapter) ?? [];
    list.push(r);
    byChapter.set(r.ataChapter, list);
  }
  return [...byChapter.entries()]
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([ataChapter, list]) => ({ ataChapter, rows: list }));
}
