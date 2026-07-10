import type { LaborCategory, LaborEntry } from '../types';

const round1 = (n: number) => Math.round(n * 10) / 10;

/** A single entry this long, or a card cumulatively this deep, must say WHY (QM1/QM5 — the
 * C-suite question is "why did it take that long", and the note is the only place the answer lives). */
export const WHY_NOTE_ENTRY_HOURS = 4;
export const WHY_NOTE_CARD_HOURS = 8;

export function whyNoteRequired(entryHours: number, cardCumulativeHours: number): boolean {
  return entryHours >= WHY_NOTE_ENTRY_HOURS || cardCumulativeHours >= WHY_NOTE_CARD_HOURS;
}

export interface LaborRollup {
  totalHours: number;
  byTech: { techOid: string; hours: number }[];
  byCategory: { category: LaborCategory; hours: number }[];
  whyNotes: { techOid: string; hours: number; note: string; dateUtc: string }[];
}

/** Total + per-person + per-category man-hours (QM1/QM2), plus the why-notes with attribution. */
export function laborRollup(entries: LaborEntry[]): LaborRollup {
  const byTechMap = new Map<string, number>();
  const byCatMap = new Map<LaborCategory, number>();
  const whyNotes: LaborRollup['whyNotes'] = [];
  let total = 0;
  for (const e of entries) {
    total += e.hours;
    byTechMap.set(e.techOid, (byTechMap.get(e.techOid) ?? 0) + e.hours);
    const cat = e.category ?? 'WRENCH';
    byCatMap.set(cat, (byCatMap.get(cat) ?? 0) + e.hours);
    if (e.note?.trim()) whyNotes.push({ techOid: e.techOid, hours: e.hours, note: e.note.trim(), dateUtc: e.dateUtc });
  }
  return {
    totalHours: round1(total),
    byTech: [...byTechMap.entries()].map(([techOid, hours]) => ({ techOid, hours: round1(hours) })).sort((a, b) => b.hours - a.hours),
    byCategory: [...byCatMap.entries()].map(([category, hours]) => ({ category, hours: round1(hours) })).sort((a, b) => b.hours - a.hours),
    whyNotes,
  };
}
