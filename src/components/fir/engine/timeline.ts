import type { Defect, LaborEntry, WorkCard, WorkCardStatusTag } from '../../tech-log/types';
import { buildDowntimeDebrief, type DowntimeDebrief } from '../../tech-log/engine/debrief';
import { STATUS_TAG_LABELS, STATUS_TAG_ORDER } from '../../tech-log/engine/statusTags';
import type { FirImpactSnapshot, FirTimelineEntry, FlightIrregularityReport } from '../types';

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

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Aggregate the FIR's debriefs into the stacked "where the hours went" bar (D61 §5). Pure, so both
 * the live draft view and the publish-time freeze read the same arithmetic.
 */
export function impactSegments(debriefs: DowntimeDebrief[]): { key: string; label: string; hours: number }[] {
  const segs: { key: string; label: string; hours: number }[] = STATUS_TAG_ORDER.map((k: WorkCardStatusTag) => ({
    key: k as string,
    label: STATUS_TAG_LABELS[k],
    hours: round1(debriefs.reduce((s, d) => s + d.stateHours[k], 0)),
  }));
  segs.push({ key: 'UNTAGGED', label: 'Unattributed', hours: round1(debriefs.reduce((s, d) => s + d.untaggedHours, 0)) });
  return segs;
}

/**
 * D63 — freeze the impact figures at publication. Called at the moment of four-eyes approval, not
 * during curation: the number a revision carries must be the number that was true when it was
 * approved.
 *
 * `downtimeHours` is passed in rather than derived here because the FIR owner may have overridden
 * it on the Impact tab; the snapshot must record what the report actually published, not what the
 * engine would have said.
 */
export function buildImpactSnapshot(
  debriefs: DowntimeDebrief[],
  downtimeHours: number | undefined,
  capturedAtUtc: string,
): FirImpactSnapshot {
  return {
    capturedAtUtc,
    downtimeHours,
    elapsedHours: round1(debriefs.reduce((s, d) => s + d.elapsedHours, 0)),
    excludedGapHours: round1(debriefs.reduce((s, d) => s + d.excludedGapHours, 0)),
    segments: impactSegments(debriefs),
  };
}

/** SYSTEM timeline entries, derived at render from anchors — never stored (§5).
 *
 * A late tech-log correction is reflected automatically. That was written assuming corrections
 * arrive as superseding inserts on the append-only defect ledger. Under D61/D62 they can also
 * arrive as a technician re-typing a start time at end of shift — which is why a **published**
 * revision no longer reads this path for its impact figures (D63, `buildImpactSnapshot` above).
 * The live derivation below still governs drafts, which is the point: a draft should track truth. */
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
