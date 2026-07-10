import { describe, it, expect } from 'vitest';
import { whyNoteRequired, laborRollup } from './labor';
import type { LaborEntry } from '../types';

const entry = (over: Partial<LaborEntry>): LaborEntry => ({
  id: 'lb-x', workCardId: 'wc-1', techOid: 'm1', hours: 1, dateUtc: '2026-07-08T22:00:00.000Z',
  description: 'General work', ...over,
});

describe('why-note prompting (QM1/QM5 — long work must say why)', () => {
  it('a short entry on a short card needs no note', () => {
    expect(whyNoteRequired(1.5, 3)).toBe(false);
  });
  it('a single long entry (>= 4 h) demands a why-note', () => {
    expect(whyNoteRequired(4, 4)).toBe(true);
  });
  it('an entry pushing cumulative card labor past 8 h demands a why-note', () => {
    expect(whyNoteRequired(2, 8.5)).toBe(true);
  });
});

describe('labor rollup (QM1/QM2 — total, per person, per category)', () => {
  const entries: LaborEntry[] = [
    entry({ id: 'a', techOid: 'm1', hours: 3, category: 'WRENCH' }),
    entry({ id: 'b', techOid: 'm2', hours: 2, category: 'WRENCH' }),
    entry({ id: 'c', techOid: 'm1', hours: 1.5, category: 'TROUBLESHOOTING' }),
    entry({ id: 'd', techOid: 'm2', hours: 0.5, category: 'TECH_OPS_CALL' }),
    entry({ id: 'e', techOid: 'm1', hours: 1 }), // legacy row, no category -> WRENCH
  ];

  it('totals across the crew and splits per person', () => {
    const r = laborRollup(entries);
    expect(r.totalHours).toBe(8);
    expect(r.byTech).toEqual([
      { techOid: 'm1', hours: 5.5 },
      { techOid: 'm2', hours: 2.5 },
    ]);
  });

  it('splits by category, defaulting legacy uncategorized rows to WRENCH', () => {
    const r = laborRollup(entries);
    expect(r.byCategory.find(c => c.category === 'WRENCH')?.hours).toBe(6);
    expect(r.byCategory.find(c => c.category === 'TROUBLESHOOTING')?.hours).toBe(1.5);
    expect(r.byCategory.find(c => c.category === 'TECH_OPS_CALL')?.hours).toBe(0.5);
  });

  it('collects why-notes with attribution', () => {
    const r = laborRollup([
      entry({ id: 'f', hours: 5, category: 'TROUBLESHOOTING', note: 'Intermittent fault — 3 hrs isolating harness chafe with tech ops on the line' }),
      entry({ id: 'g', hours: 1 }),
    ]);
    expect(r.whyNotes).toHaveLength(1);
    expect(r.whyNotes[0]).toMatchObject({ techOid: 'm1', hours: 5 });
  });
});
