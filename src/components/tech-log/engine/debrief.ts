import type { Defect, LaborEntry, WorkCard, WorkCardStatusTag } from '../types';
import { statusDurations } from './statusTags';
import { laborRollup, type LaborRollup } from './labor';

const round1 = (n: number) => Math.round(n * 10) / 10;

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
  elapsedHours: number;
  stateHours: Record<WorkCardStatusTag, number>;
  untaggedHours: number;     // elapsed time nobody attributed to a state (incl. pre-triage)
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

  const stateHours: Record<WorkCardStatusTag, number> = { IN_WORK: 0, WAITING_PARTS: 0, WAITING_INSPECTION: 0 };
  for (const c of cards) {
    // Attribution stops at event end — an open tag never accrues past a cleared defect.
    const d = statusDurations(c, endUtc);
    stateHours.IN_WORK += d.hours.IN_WORK;
    stateHours.WAITING_PARTS += d.hours.WAITING_PARTS;
    stateHours.WAITING_INSPECTION += d.hours.WAITING_INSPECTION;
  }
  (Object.keys(stateHours) as WorkCardStatusTag[]).forEach(k => { stateHours[k] = round1(stateHours[k]); });

  const elapsedHours = round1(Math.max(0, (new Date(endUtc).getTime() - new Date(startUtc).getTime()) / 3600000));
  const attributed = stateHours.IN_WORK + stateHours.WAITING_PARTS + stateHours.WAITING_INSPECTION;
  const untaggedHours = round1(Math.max(0, elapsedHours - attributed));

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

  return { defectId: head?.id ?? defectId, startUtc, endUtc, ongoing, elapsedHours, stateHours, untaggedHours, labor, events };
}

const TAG_LABEL: Record<WorkCardStatusTag, string> = {
  IN_WORK: 'In work',
  WAITING_PARTS: 'Waiting on parts (POO)',
  WAITING_INSPECTION: 'Waiting on inspection',
};

// Same-instant ties resolve in narrative order (a card completes before the defect clears).
const ORDER: Record<DebriefEventKind, number> = { REPORTED: 0, CARD_RAISED: 1, TAG: 2, CARD_COMPLETED: 3, CLEARED: 4 };
