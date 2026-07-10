import { describe, it, expect } from 'vitest';
import { appendStatusTag, statusDurations } from './statusTags';
import type { WorkCard } from '../types';

const card = (over: Partial<WorkCard> = {}): WorkCard => ({
  id: 'wc-1', cardNumber: 'WC-1001', aircraftId: 'ac-1', title: 'Replace main battery',
  ataChapter: '24', description: '', steps: [], status: 'OPEN', source: 'MANUAL',
  headerStatusCode: 1, scheduled: false, riiRequired: false, createdAtUtc: '2026-07-08T10:00:00.000Z',
  ...over,
});

describe('work-card status tags (QM4/D27 — in work / POO / waiting inspection)', () => {
  it('appends a tag event and moves the card to IN_WORK', () => {
    const r = appendStatusTag(card(), 'IN_WORK', 'm1', '2026-07-08T10:00:00.000Z');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.card.statusTags).toHaveLength(1);
    expect(r.card.statusTags?.[0]).toMatchObject({ tag: 'IN_WORK', byOid: 'm1' });
    expect(r.card.status).toBe('IN_WORK');
  });

  it('rejects re-tagging with the current tag', () => {
    const first = appendStatusTag(card(), 'IN_WORK', 'm1', '2026-07-08T10:00:00.000Z');
    if (!first.ok) throw new Error('setup');
    const again = appendStatusTag(first.card, 'IN_WORK', 'm1', '2026-07-08T11:00:00.000Z');
    expect(again.ok).toBe(false);
  });

  it('WAITING_PARTS (POO) requires a note — what part, from whom', () => {
    const bare = appendStatusTag(card(), 'WAITING_PARTS', 'm1', '2026-07-08T10:00:00.000Z');
    expect(bare.ok).toBe(false);
    const noted = appendStatusTag(card(), 'WAITING_PARTS', 'm1', '2026-07-08T10:00:00.000Z', 'POO — battery from GAC Savannah, ETA Fri');
    expect(noted.ok).toBe(true);
  });

  it('rejects tagging a completed card', () => {
    const r = appendStatusTag(card({ status: 'COMPLETED', completedAtUtc: '2026-07-08T18:00:00.000Z' }), 'IN_WORK', 'm1', '2026-07-08T19:00:00.000Z');
    expect(r.ok).toBe(false);
  });

  it('computes per-state hours; the open segment runs to asOf', () => {
    const c = card({
      status: 'IN_WORK',
      statusTags: [
        { tag: 'IN_WORK', atUtc: '2026-07-08T10:00:00.000Z', byOid: 'm1' },
        { tag: 'WAITING_PARTS', atUtc: '2026-07-08T14:00:00.000Z', byOid: 'm1', note: 'POO — battery' },
      ],
    });
    const d = statusDurations(c, '2026-07-08T20:00:00.000Z');
    expect(d.hours.IN_WORK).toBe(4);
    expect(d.hours.WAITING_PARTS).toBe(6);
    expect(d.hours.WAITING_INSPECTION).toBe(0);
    expect(d.openTag).toBe('WAITING_PARTS');
  });

  it('a completed card closes its final segment at completedAtUtc, not asOf', () => {
    const c = card({
      status: 'COMPLETED', completedAtUtc: '2026-07-08T16:00:00.000Z',
      statusTags: [
        { tag: 'IN_WORK', atUtc: '2026-07-08T10:00:00.000Z', byOid: 'm1' },
        { tag: 'WAITING_INSPECTION', atUtc: '2026-07-08T15:00:00.000Z', byOid: 'm1' },
      ],
    });
    const d = statusDurations(c, '2026-07-09T09:00:00.000Z');
    expect(d.hours.IN_WORK).toBe(5);
    expect(d.hours.WAITING_INSPECTION).toBe(1);
    expect(d.openTag).toBeUndefined();
  });

  it('a card with no tag history reports zero everywhere', () => {
    const d = statusDurations(card(), '2026-07-09T09:00:00.000Z');
    expect(d.hours).toEqual({ IN_WORK: 0, WAITING_PARTS: 0, WAITING_INSPECTION: 0 });
    expect(d.openTag).toBeUndefined();
  });
});
