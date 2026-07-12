// "Open an FIR?" nudges (§8). The system proposes a report with the evidence
// pre-anchored when an irregularity crosses a threshold, so bottom-up capture
// doesn't depend on someone remembering. Thresholds are config; the DOM ratifies
// real values (§12 Q1). Retrospective only — we suggest on events already worked
// in the tech log, never mid-event coordination.
import type { Defect } from '../../tech-log/types';
import { buildDowntimeDebrief } from '../../tech-log/engine/debrief';
import type { TechLogEvidenceSlice } from './timeline';
import type { FirAnchor, FirCategory, FlightIrregularityReport } from '../types';

export interface FirSuggestionConfig {
  downtimeHours: number; // suggest once a grounding defect's downtime crosses this
  delayMinutes: number; // (trip-leg delay trigger — data-dependent, structured for later)
}

export const DEFAULT_FIR_SUGGESTION_CONFIG: FirSuggestionConfig = { downtimeHours: 24, delayMinutes: 60 };

export interface FirSuggestion {
  key: string; // stable dedupe/dismiss key
  category: FirCategory;
  title: string;
  reason: string;
  anchor: FirAnchor;
  aircraftId: string;
  defectId: string;
}

/** True if some FIR already anchors this defect (chain head) — don't re-suggest. */
export function firAnchorsDefect(firs: Pick<FlightIrregularityReport, 'anchors'>[], defectId: string): boolean {
  return firs.some(f => f.anchors.some(a => a.kind === 'DEFECT' && a.refId === defectId));
}

/** A grounding defect (airworthinessAffecting !== false; null is treated as grounding). */
const isGrounding = (d: Defect) => d.airworthinessAffecting !== false;

/** Defect suggestions: a current grounding defect that is CRITICAL, or whose downtime
 * has crossed the threshold, and isn't already covered by an FIR or dismissed. */
export function buildDefectFirSuggestions(
  slice: TechLogEvidenceSlice,
  firs: Pick<FlightIrregularityReport, 'anchors'>[],
  dismissedKeys: Iterable<string>,
  config: FirSuggestionConfig,
  nowUtc: string,
): FirSuggestion[] {
  const dismissed = new Set(dismissedKeys);
  const superseded = new Set(slice.defects.map(d => d.supersedesId).filter(Boolean) as string[]);

  const out: FirSuggestion[] = [];
  for (const d of slice.defects) {
    if (superseded.has(d.id)) continue; // not the current row in its chain
    // Only a defect actually grounding the aircraft is an AOG/irregularity. A
    // DEFERRED defect is dispatchable (under an MEL clock); a WATCHLISTED one is
    // serviceability-neutral; RECTIFIED/CLOSED are done. None are FIR triggers.
    if (d.status !== 'OPEN') continue;
    if (!isGrounding(d)) continue;

    const debrief = buildDowntimeDebrief(d.id, slice, nowUtc);
    const critical = d.severity === 'CRITICAL';
    const overDowntime = debrief.elapsedHours >= config.downtimeHours;
    if (!critical && !overDowntime) continue;

    const key = `defect:${d.id}`;
    if (dismissed.has(key) || firAnchorsDefect(firs, d.id)) continue;

    const hours = Math.round(debrief.elapsedHours);
    const reason = overDowntime
      ? `Grounded ${hours} h${debrief.ongoing ? ' and counting' : ''}`
      : 'AOG — critical defect';
    out.push({
      key,
      category: 'AOG',
      title: `AOG — ${d.description}`,
      reason,
      anchor: { kind: 'DEFECT', refId: d.id },
      aircraftId: d.aircraftId,
      defectId: d.id,
    });
  }
  return out;
}
