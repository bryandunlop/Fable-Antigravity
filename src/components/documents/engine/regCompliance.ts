// Pure regulatory-coverage math: which requirements are satisfied by which
// published blocks, and which are gaps. Read-only over the ledger (published
// revisions only). No React / no storage.
import type { Doc, DocRevision } from '../types';
import { currentRevision } from './revisions';
import { REG_CATALOG, type RegRequirement } from './regCatalog';

export interface CoverSite {
  docId: string;
  docTitle: string;
  sectionNumber: string;
  sectionTitle: string;
  blockId: string;
}

export interface CoverageRow {
  req: RegRequirement;
  by: CoverSite[];
  covered: boolean;
}

/** For each requirement, the published blocks that cite it (empty ⇒ gap). */
export function buildCoverage(
  docs: Doc[],
  revisions: DocRevision[],
  requirements: RegRequirement[] = REG_CATALOG,
): CoverageRow[] {
  const sitesByReq = new Map<string, CoverSite[]>();
  for (const doc of docs) {
    const rev = currentRevision(doc.id, revisions);
    if (!rev) continue;
    for (const sec of rev.sections) {
      for (const b of sec.blocks) {
        for (const refId of b.complianceRefs ?? []) {
          const list = sitesByReq.get(refId) ?? [];
          list.push({ docId: doc.id, docTitle: doc.title, sectionNumber: sec.number, sectionTitle: sec.title, blockId: b.id });
          sitesByReq.set(refId, list);
        }
      }
    }
  }
  return requirements.map((req) => {
    const by = sitesByReq.get(req.id) ?? [];
    return { req, by, covered: by.length > 0 };
  });
}

export function coverageSummary(rows: CoverageRow[]): { total: number; covered: number; gaps: number } {
  const covered = rows.filter((r) => r.covered).length;
  return { total: rows.length, covered, gaps: rows.length - covered };
}

/** Distinct requirement ids a doc's current published revision addresses. */
export function docComplianceRefs(doc: Doc, revisions: DocRevision[]): string[] {
  const rev = currentRevision(doc.id, revisions);
  if (!rev) return [];
  const set = new Set<string>();
  for (const s of rev.sections) for (const b of s.blocks) for (const r of b.complianceRefs ?? []) set.add(r);
  return [...set];
}
