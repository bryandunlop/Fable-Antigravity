import type { Defect, LaborEntry, WorkCard } from '../../tech-log/types';
import { buildDowntimeDebrief, type DowntimeDebrief } from '../../tech-log/engine/debrief';
import type { FirTimelineEntry, FlightIrregularityReport } from '../types';

/** The tech-log evidence the FIR reads (never writes). */
export interface TechLogEvidenceSlice {
  defects: Defect[];
  workCards: WorkCard[];
  laborEntries: LaborEntry[];
}

/** One downtime debrief per distinct defect chain among the FIR's DEFECT anchors (§6).
 * Anchors resolving into the same supersede chain dedupe to a single debrief, and the
 * FIR's event window caps attribution: evidence never accrues past eventEndUtc. */
export function defectDebriefs(
  fir: FlightIrregularityReport,
  slice: TechLogEvidenceSlice,
  asOfUtc: string,
): DowntimeDebrief[] {
  const asOf = fir.eventEndUtc && fir.eventEndUtc < asOfUtc ? fir.eventEndUtc : asOfUtc;
  const known = new Set(slice.defects.map(d => d.id));
  const out: DowntimeDebrief[] = [];
  const seenChains = new Set<string>();
  for (const anchor of fir.anchors) {
    if (anchor.kind !== 'DEFECT' || !known.has(anchor.refId)) continue;
    const dbf = buildDowntimeDebrief(anchor.refId, slice, asOf);
    if (seenChains.has(dbf.defectId)) continue; // same chain, already pulled
    seenChains.add(dbf.defectId);
    out.push(dbf);
  }
  return out;
}

/** SYSTEM timeline entries, derived at render from anchors — never stored (§5).
 * A late tech-log correction (superseding insert) is reflected automatically. */
export function deriveSystemEntries(
  fir: FlightIrregularityReport,
  slice: TechLogEvidenceSlice,
  asOfUtc: string,
): FirTimelineEntry[] {
  return defectDebriefs(fir, slice, asOfUtc).flatMap(dbf =>
    dbf.events.map(e => ({
      source: 'SYSTEM' as const,
      atUtc: e.atUtc,
      label: e.label,
      byOid: e.byOid,
      note: e.note,
      sourceRef: { kind: 'DEBRIEF_EVENT' as const, refId: dbf.defectId },
    })),
  );
}

/** Chronological merge (feed.ts merge-and-sort pattern). On a timestamp tie the
 * SYSTEM evidence renders before the MANUAL commentary made about it. */
export function mergeTimeline(system: FirTimelineEntry[], manual: FirTimelineEntry[]): FirTimelineEntry[] {
  const rank = (e: FirTimelineEntry) => (e.source === 'SYSTEM' ? 0 : 1);
  return [...system, ...manual].sort((a, b) => a.atUtc.localeCompare(b.atUtc) || rank(a) - rank(b));
}
