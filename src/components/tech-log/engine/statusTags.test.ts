import { describe, it, expect } from 'vitest';
import { appendStatusTag, statusDurations, writeStatusTimeline, describeTimeline } from './statusTags';
import type { StatusTagEvent, WorkCard } from '../types';

const card = (over: Partial<WorkCard> = {}): WorkCard => ({
  id: 'wc-1', cardNumber: 'WC-1001', aircraftId: 'ac-1', title: 'Replace main battery',
  ataChapter: '24', description: '', steps: [], status: 'OPEN', source: 'MANUAL',
  headerStatusCode: 1, scheduled: false, riiRequired: false, createdAtUtc: '2026-07-08T10:00:00.000Z',
  ...over,
});

const ev = (tag: StatusTagEvent['tag'], atUtc: string, over: Partial<StatusTagEvent> = {}): StatusTagEvent =>
  ({ tag, atUtc, byOid: 'm1', ...over });

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
    const noted = appendStatusTag(card(), 'WAITING_PARTS', 'm1', '2026-07-08T10:00:00.000Z', { note: 'POO — battery from GAC Savannah, ETA Fri' });
    expect(noted.ok).toBe(true);
  });

  it('WAITING_OTHER requires the free text that names it (D61 §3)', () => {
    expect(appendStatusTag(card(), 'WAITING_OTHER', 'm1', '2026-07-08T10:00:00.000Z').ok).toBe(false);
    expect(appendStatusTag(card(), 'WAITING_OTHER', 'm1', '2026-07-08T10:00:00.000Z', { note: 'Waiting on hangar power cart' }).ok).toBe(true);
  });

  it('a GAP span needs a reason — nobody was working, say why', () => {
    expect(appendStatusTag(card(), 'GAP', 'm1', '2026-07-08T18:00:00.000Z').ok).toBe(false);
    expect(appendStatusTag(card(), 'GAP', 'm1', '2026-07-08T18:00:00.000Z', { gapReason: 'END_OF_SHIFT' }).ok).toBe(true);
  });

  /**
   * D62 (ratified 2026-07-29) — this test used to assert the opposite: that a completed card
   * refuses all time entry ("its time history is closed"). That guard refused D61's primary use
   * case outright, because the technician who signs the CRS at 0200 writes up the day at 0900.
   * Rewritten, not deleted: the behaviour it pins is now "permitted, and audited".
   */
  it('D62 — a complied-with card still accepts retrospective time entry, audited, without un-completing', () => {
    const done = card({ status: 'COMPLETED', completedAtUtc: '2026-07-08T18:00:00.000Z' });
    const r = appendStatusTag(done, 'IN_WORK', 'm1', '2026-07-08T09:00:00.000Z', { byName: 'A. Tech' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.card.status).toBe('COMPLETED');              // a signed release still points at this card
    expect(r.card.completedAtUtc).toBe('2026-07-08T18:00:00.000Z');
    expect(r.card.timeAudit).toHaveLength(1);
    expect(r.card.timeAudit?.[0]).toMatchObject({ byOid: 'm1', byName: 'A. Tech', afterCompletion: true });
  });

  it('a span cannot start after the card was complied with', () => {
    const done = card({ status: 'COMPLETED', completedAtUtc: '2026-07-08T18:00:00.000Z' });
    const r = appendStatusTag(done, 'IN_WORK', 'm1', '2026-07-08T19:00:00.000Z');
    expect(r.ok).toBe(false);
  });

  it('computes per-state hours; the open segment runs to asOf', () => {
    const c = card({
      status: 'IN_WORK',
      statusTags: [
        ev('IN_WORK', '2026-07-08T10:00:00.000Z'),
        ev('WAITING_PARTS', '2026-07-08T14:00:00.000Z', { note: 'POO — battery' }),
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
        ev('IN_WORK', '2026-07-08T10:00:00.000Z'),
        ev('WAITING_INSPECTION', '2026-07-08T15:00:00.000Z'),
      ],
    });
    const d = statusDurations(c, '2026-07-09T09:00:00.000Z');
    expect(d.hours.IN_WORK).toBe(5);
    expect(d.hours.WAITING_INSPECTION).toBe(1);
    expect(d.openTag).toBeUndefined();
  });

  it('a card with no tag history reports zero everywhere', () => {
    const d = statusDurations(card(), '2026-07-09T09:00:00.000Z');
    expect(Object.values(d.hours).every(h => h === 0)).toBe(true);
    expect(d.excludedGapHours).toBe(0);
    expect(d.openTag).toBeUndefined();
  });

  it('measures an out-of-order history honestly rather than reporting a 0 h span', () => {
    // Constructed directly, NOT through the writer: this is the shape a legacy persisted card (or a
    // hand-edited fixture) can already have. Before D61 the walk was by array index, so DIAGNOSING
    // closed at an earlier timestamp, clamped to 0 h, and IN_WORK swallowed the whole window.
    const c = card({
      status: 'IN_WORK',
      statusTags: [
        ev('IN_WORK', '2026-07-08T12:00:00.000Z'),
        ev('DIAGNOSING', '2026-07-08T09:00:00.000Z'),
      ],
    });
    const d = statusDurations(c, '2026-07-08T14:00:00.000Z');
    expect(d.hours.DIAGNOSING).toBe(3);
    expect(d.hours.IN_WORK).toBe(2);
    expect(d.openTag).toBe('IN_WORK');   // chronologically last, not array-last
  });

  it('DIAGNOSING accrues like any other state', () => {
    const c = card({
      status: 'IN_WORK',
      statusTags: [ev('DIAGNOSING', '2026-07-08T08:00:00.000Z'), ev('IN_WORK', '2026-07-08T11:30:00.000Z')],
    });
    const d = statusDurations(c, '2026-07-08T13:30:00.000Z');
    expect(d.hours.DIAGNOSING).toBe(3.5);
    expect(d.hours.IN_WORK).toBe(2);
  });
});

describe('D61 §4 — overnight and away gaps are logged spans, included or excluded per gap', () => {
  /** The number the toggle exists to fix: 14 h of overnight used to land on wrench time. */
  const overnight = (include?: boolean) =>
    card({
      status: 'IN_WORK',
      statusTags: [
        ev('IN_WORK', '2026-07-08T14:00:00.000Z'),
        ev('GAP', '2026-07-08T18:00:00.000Z', { gapReason: 'END_OF_SHIFT', includeInTotals: include }),
        ev('IN_WORK', '2026-07-09T08:00:00.000Z'),
      ],
    });

  it('a logged gap no longer accrues to wrench time', () => {
    const d = statusDurations(overnight(), '2026-07-09T10:00:00.000Z');
    expect(d.hours.IN_WORK).toBe(6);   // 14:00→18:00 plus 08:00→10:00 — NOT the 14 h overnight
    expect(d.hours.GAP).toBe(14);
  });

  it('an excluded gap counts zero in the state hours and is reported separately, not destroyed', () => {
    const d = statusDurations(overnight(false), '2026-07-09T10:00:00.000Z');
    expect(d.hours.GAP).toBe(0);
    expect(d.excludedGapHours).toBe(14);
    expect(d.hours.IN_WORK).toBe(6);   // excluding a gap never moves another state's number
  });

  it('an absent include flag reads as included — a gap counts unless somebody says otherwise', () => {
    expect(statusDurations(overnight(undefined), '2026-07-09T10:00:00.000Z').hours.GAP).toBe(14);
    expect(statusDurations(overnight(true), '2026-07-09T10:00:00.000Z').hours.GAP).toBe(14);
  });

  it('the contract-mx-away case: dead time nobody owns is visible rather than absent', () => {
    const c = card({
      status: 'IN_WORK',
      statusTags: [
        ev('WAITING_CONTRACT_MX', '2026-07-10T09:00:00.000Z'),
        ev('GAP', '2026-07-10T17:00:00.000Z', { gapReason: 'CONTRACT_MX_AWAY', note: 'Shop left Friday, no replacement crew' }),
        ev('IN_WORK', '2026-07-13T08:00:00.000Z'),
      ],
    });
    const d = statusDurations(c, '2026-07-13T12:00:00.000Z');
    expect(d.hours.WAITING_CONTRACT_MX).toBe(8);
    expect(d.hours.GAP).toBe(63);      // Fri 17:00 → Mon 08:00
  });

  it('summing the hours record is always the counted total (excluded gaps sit outside it)', () => {
    const d = statusDurations(overnight(false), '2026-07-09T10:00:00.000Z');
    const counted = Object.values(d.hours).reduce((a, b) => a + b, 0);
    expect(counted).toBe(6);
    expect(counted + d.excludedGapHours).toBe(20);
  });
});

describe('D61/D62 — the retrospective timeline writer validates, re-sorts and audits', () => {
  const by = { oid: 'm1', name: 'A. Tech' };

  it('accepts a whole history entered out of order and stores it chronologically', () => {
    const r = writeStatusTimeline(card(), [
      ev('IN_WORK', '2026-07-08T12:00:00.000Z'),
      ev('DIAGNOSING', '2026-07-08T09:00:00.000Z'),
    ], by, '2026-07-08T20:00:00.000Z');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.card.statusTags?.map(t => t.tag)).toEqual(['DIAGNOSING', 'IN_WORK']);
  });

  it('an out-of-order entry is measured correctly rather than contributing 0 h', () => {
    const r = writeStatusTimeline(card(), [
      ev('IN_WORK', '2026-07-08T12:00:00.000Z'),
      ev('DIAGNOSING', '2026-07-08T09:00:00.000Z'),
    ], by, '2026-07-08T20:00:00.000Z');
    if (!r.ok) throw new Error('setup');
    const d = statusDurations(r.card, '2026-07-08T14:00:00.000Z');
    expect(d.hours.DIAGNOSING).toBe(3);
    expect(d.hours.IN_WORK).toBe(2);
  });

  it('rejects an adjacent duplicate created by an INSERT — one only visible once sorted', () => {
    // Array order here is IN_WORK, DIAGNOSING, IN_WORK — no two neighbours are the same state, and
    // the pre-D61 guard (which only ever looked at the LAST element) waved it straight through.
    // Chronologically it is IN_WORK 09:00, IN_WORK 10:00, DIAGNOSING 11:00 — a duplicate span.
    const r = writeStatusTimeline(card(), [
      ev('IN_WORK', '2026-07-08T09:00:00.000Z'),
      ev('DIAGNOSING', '2026-07-08T11:00:00.000Z'),
      ev('IN_WORK', '2026-07-08T10:00:00.000Z'),
    ], by, '2026-07-08T20:00:00.000Z');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/same state/i);
  });

  it('rejects two spans starting at the same instant even when they are not array neighbours', () => {
    const r = writeStatusTimeline(card(), [
      ev('IN_WORK', '2026-07-08T09:00:00.000Z'),
      ev('WAITING_INSPECTION', '2026-07-08T11:00:00.000Z'),
      ev('DIAGNOSING', '2026-07-08T09:00:00.000Z'),
    ], by, '2026-07-08T20:00:00.000Z');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/same time/i);
  });

  it('rejects an unreadable start time', () => {
    const r = writeStatusTimeline(card(), [ev('IN_WORK', 'not-a-date')], by, '2026-07-08T20:00:00.000Z');
    expect(r.ok).toBe(false);
  });

  it('records who / when / before → after on every edit, and flags edits made after completion', () => {
    const first = writeStatusTimeline(card(), [ev('IN_WORK', '2026-07-08T09:00:00.000Z')], by, '2026-07-08T20:00:00.000Z');
    if (!first.ok) throw new Error('setup');
    expect(first.card.timeAudit?.[0].before).toBeUndefined();          // the history was empty
    expect(first.card.timeAudit?.[0].after).toContain('IN_WORK');
    expect(first.card.timeAudit?.[0].afterCompletion).toBe(false);

    const completed = { ...first.card, status: 'COMPLETED' as const, completedAtUtc: '2026-07-08T18:00:00.000Z' };
    const second = writeStatusTimeline(completed, [
      ev('IN_WORK', '2026-07-08T08:00:00.000Z'),   // the tech corrects the start time next morning
    ], { oid: 'm2', name: 'B. Tech' }, '2026-07-09T09:00:00.000Z');
    if (!second.ok) throw new Error('setup');
    expect(second.card.timeAudit).toHaveLength(2);
    const latest = second.card.timeAudit![1];
    expect(latest.byOid).toBe('m2');
    expect(latest.afterCompletion).toBe(true);
    expect(latest.before).toContain('2026-07-08T09:00:00.000Z');       // what it said before
    expect(latest.after).toContain('2026-07-08T08:00:00.000Z');        // what it says now
  });

  it('the audit trail is append-only across edits — an earlier entry is never rewritten', () => {
    const a = writeStatusTimeline(card(), [ev('IN_WORK', '2026-07-08T09:00:00.000Z')], by, '2026-07-08T20:00:00.000Z');
    if (!a.ok) throw new Error('setup');
    const b = writeStatusTimeline(a.card, [
      ev('IN_WORK', '2026-07-08T09:00:00.000Z'),
      ev('GAP', '2026-07-08T18:00:00.000Z', { gapReason: 'END_OF_SHIFT' }),
    ], by, '2026-07-09T08:00:00.000Z');
    if (!b.ok) throw new Error('setup');
    expect(b.card.timeAudit?.[0]).toEqual(a.card.timeAudit?.[0]);
    expect(b.card.timeAudit).toHaveLength(2);
  });

  it('a rejected edit leaves the card and its audit trail untouched', () => {
    const a = writeStatusTimeline(card(), [ev('IN_WORK', '2026-07-08T09:00:00.000Z')], by, '2026-07-08T20:00:00.000Z');
    if (!a.ok) throw new Error('setup');
    const bad = writeStatusTimeline(a.card, [ev('WAITING_PARTS', '2026-07-08T10:00:00.000Z')], by, '2026-07-08T21:00:00.000Z');
    expect(bad.ok).toBe(false);
    expect(a.card.timeAudit).toHaveLength(1);
  });

  it('describeTimeline marks an excluded gap so the audit string says what changed', () => {
    const s = describeTimeline([ev('GAP', '2026-07-08T18:00:00.000Z', { gapReason: 'END_OF_SHIFT', includeInTotals: false })]);
    expect(s).toContain('excluded');
    expect(describeTimeline(undefined)).toBe('(no time history)');
  });
});
