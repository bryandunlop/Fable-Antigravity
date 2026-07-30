import type { Defect, LaborEntry, WorkCard, WorkCardStatusTag } from '../types';
import { statusDurations, excludedGapIntervals, unionHours, STATUS_TAG_LABELS, STATUS_TAG_ORDER } from './statusTags';
import { laborRollup, type LaborRollup } from './labor';

const round1 = (n: number) => Math.round(n * 10) / 10;

const zeroStateHours = (): Record<WorkCardStatusTag, number> =>
  Object.fromEntries(STATUS_TAG_ORDER.map(t => [t, 0])) as Record<WorkCardStatusTag, number>;

export type DebriefEventKind = 'REPORTED' | 'CARD_RAISED' | 'TAG' | 'CARD_COMPLETED' | 'CLEARED';

export interface DebriefEvent {
  kind: DebriefEventKind;
  atUtc: string;
  label: string;
  byOid?: string;
  note?: string;
  tag?: WorkCardStatusTag;
}

/** The C-suite answer for one grounding/AOG event (QM5/D27): when it started, every hour attributed
 * to a state (work / waiting on parts / waiting on inspection), who worked it, and the why-notes. */
export interface DowntimeDebrief {
  defectId: string;          // chain head at build time
  startUtc: string;
  endUtc: string;
  ongoing: boolean;
  /** Raw wall clock, reported → cleared. A fact about the calendar, never reduced by a choice. */
  elapsedHours: number;
  stateHours: Record<WorkCardStatusTag, number>;
  untaggedHours: number;     // elapsed time nobody attributed to a state (incl. pre-triage)
  /** Gap hours whoever entered the time chose not to count (D61 §4) — e.g. the Friday-to-Monday
   * where contract maintenance left with no replacement. Reported, never silently dropped. */
  excludedGapHours: number;
  /** `elapsedHours` less the excluded gaps — the downtime figure the operator stands behind, and
   * what the FIR offers as its default. Equals `elapsedHours` when nothing was excluded. */
  countedDowntimeHours: number;
  labor: LaborRollup;
  events: DebriefEvent[];    // chronological
}

type Slice = { defects: Defect[]; workCards: WorkCard[]; laborEntries: LaborEntry[] };

/** All row ids in the supersede chain containing `defectId` (corrections keep the event identity). */
function chainIds(defects: Defect[], defectId: string): Set<string> {
  const parentOf = new Map(defects.map(d => [d.id, d.supersedesId]));
  const childOf = new Map(defects.filter(d => d.supersedesId).map(d => [d.supersedesId!, d.id]));
  const ids = new Set<string>([defectId]);
  let up = parentOf.get(defectId);
  while (up) { ids.add(up); up = parentOf.get(up); }
  let down = childOf.get(defectId);
  while (down) { ids.add(down); down = childOf.get(down); }
  return ids;
}

export function buildDowntimeDebrief(defectId: string, state: Slice, asOfUtc: string): DowntimeDebrief {
  const ids = chainIds(state.defects, defectId);
  const chain = state.defects.filter(d => ids.has(d.id));
  const head = chain.find(d => !chain.some(o => o.supersedesId === d.id)) ?? chain[0];

  const startUtc = chain.map(d => d.reportedAtUtc).sort()[0];
  const clearedUtc = head?.clearedTsUtc;
  const endUtc = clearedUtc ?? asOfUtc;
  const ongoing = !clearedUtc;

  const cards = state.workCards.filter(w => w.linkedDefectId && ids.has(w.linkedDefectId));
  const cardIds = new Set(cards.map(c => c.id));
  const labor = laborRollup(state.laborEntries.filter(l => cardIds.has(l.workCardId)));

  const stateHours = zeroStateHours();
  for (const c of cards) {
    // Attribution stops at event end — an open tag never accrues past a cleared defect.
    const d = statusDurations(c, endUtc);
    (Object.keys(stateHours) as WorkCardStatusTag[]).forEach(k => { stateHours[k] += d.hours[k]; });
  }
  (Object.keys(stateHours) as WorkCardStatusTag[]).forEach(k => { stateHours[k] = round1(stateHours[k]); });

  /**
   * Excluded-gap hours are the UNION of the intervals, never the sum of each card's total.
   *
   * A defect can carry several work cards, and when a job spans two of them the normal way to
   * record "everybody was away over the weekend" is to log that same calendar gap on both. Summing
   * subtracted it TWICE from a single wall clock: a 63 h event with the same 60 h weekend logged on
   * two cards produced 120 h excluded, and `countedDowntimeHours` — the headline downtime figure,
   * which reaches a published FIR — collapsed to zero. Clamped to the event window so a gap logged
   * either side of it cannot subtract time the event never contained.
   */
  const excludedGapHours = unionHours(
    cards.flatMap(c => excludedGapIntervals(c, endUtc)),
    startUtc,
    endUtc,
  );

  const elapsedHours = round1(Math.max(0, (new Date(endUtc).getTime() - new Date(startUtc).getTime()) / 3600000));
  const attributed = (Object.values(stateHours) as number[]).reduce((a, b) => a + b, 0);
  // Excluded gap hours are their own bucket: neither attributed to a state nor left looking like
  // time nobody accounted for. Without this subtraction the exclusion would simply reappear as
  // "unattributed" and the toggle would move nothing.
  const untaggedHours = round1(Math.max(0, elapsedHours - attributed - excludedGapHours));
  const countedDowntimeHours = round1(Math.max(0, elapsedHours - excludedGapHours));

  const events: DebriefEvent[] = [
    { kind: 'REPORTED', atUtc: startUtc, byOid: head?.reportedByOid, label: `Defect reported — ATA ${head?.ataChapter}: ${head?.description ?? ''}` },
  ];
  for (const c of cards) {
    events.push({ kind: 'CARD_RAISED', atUtc: c.createdAtUtc, label: `${c.cardNumber} raised — ${c.title}` });
    for (const t of c.statusTags ?? []) {
      events.push({ kind: 'TAG', atUtc: t.atUtc, byOid: t.byOid, note: t.note, tag: t.tag, label: TAG_LABEL[t.tag] });
    }
    if (c.completedAtUtc) {
      events.push({ kind: 'CARD_COMPLETED', atUtc: c.completedAtUtc, label: `${c.cardNumber} complied with (RTS)` });
    }
  }
  if (clearedUtc) {
    events.push({ kind: 'CLEARED', atUtc: clearedUtc, byOid: head?.clearedByOid, label: 'Defect rectified — aircraft returned to service' });
  }
  events.sort((a, b) => a.atUtc.localeCompare(b.atUtc) || ORDER[a.kind] - ORDER[b.kind]);

  return {
    defectId: head?.id ?? defectId, startUtc, endUtc, ongoing,
    elapsedHours, stateHours, untaggedHours, excludedGapHours, countedDowntimeHours, labor, events,
  };
}

const TAG_LABEL = STATUS_TAG_LABELS;

// Same-instant ties resolve in narrative order (a card completes before the defect clears).
const ORDER: Record<DebriefEventKind, number> = { REPORTED: 0, CARD_RAISED: 1, TAG: 2, CARD_COMPLETED: 3, CLEARED: 4 };
