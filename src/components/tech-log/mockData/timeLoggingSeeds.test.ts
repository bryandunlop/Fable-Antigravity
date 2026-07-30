import { describe, it, expect } from 'vitest';
import { getDefaultState } from './scenarios';
import { fleetMetrics, timeToDiagnose, partsLeadTimes } from '../engine/metrics';
import { statusDurations } from '../engine/statusTags';

/**
 * D61 / LG-100 seed guard.
 *
 * The rendering and engine tests use their own fixtures, so they stay green even if the seeds lose
 * these facts — and then the whole slice is invisible on a fresh load with nothing failing to say
 * so. The lesson this file is written against is sharper than that: a seed guard can be
 * mutation-checked and still pin the WRONG invariant. So the question asked here is not "is the
 * field present" but **"what property makes this demonstrable"**:
 *
 *   1. Somewhere in the seeds a gap is logged AND excluded, so the include/exclude control has
 *      something to act on the instant somebody opens a card.
 *   2. That exclusion actually MOVES a number — otherwise the control is decorative.
 *   3. The metrics page has non-trivial numbers to show: more than one tail, a completed diagnosis,
 *      a delivered vendor lead time AND an open one.
 */

const NOW = Date.parse('2026-07-30T12:00:00.000Z');
const state = getDefaultState(NOW);
const nowIso = new Date(NOW).toISOString();
const window = {
  fromUtc: new Date(NOW - 90 * 86400000).toISOString(),
  toUtc: new Date(NOW + 1).toISOString(),
  asOfUtc: nowIso,
};

describe('time-logging seeds (D61 / LG-100)', () => {
  it('seeds a logged overnight gap that the enterer EXCLUDED — the control has something to act on', () => {
    const excluded = state.workCards.flatMap(c =>
      (c.statusTags ?? []).filter(t => t.tag === 'GAP' && t.includeInTotals === false).map(t => ({ card: c, tag: t })),
    );
    expect(excluded.length).toBeGreaterThan(0);
    excluded.forEach(({ tag }) => expect(tag.gapReason).toBeTruthy());
  });

  it('the exclusion MOVES a number — a decorative toggle would pass a containment check and fail here', () => {
    const card = state.workCards.find(c => (c.statusTags ?? []).some(t => t.tag === 'GAP' && t.includeInTotals === false))!;
    const d = statusDurations(card, nowIso);
    expect(d.excludedGapHours).toBeGreaterThan(0);

    // Flip the same gap to counted and the state hours must change. If they do not, the seed's gap
    // is zero-length or sits outside the card's window, and the demo shows nothing.
    const counted = statusDurations(
      { ...card, statusTags: card.statusTags!.map(t => (t.tag === 'GAP' ? { ...t, includeInTotals: true } : t)) },
      nowIso,
    );
    expect(counted.hours.GAP).toBe(d.excludedGapHours);
    expect(counted.excludedGapHours).toBe(0);
  });

  it('seeds a card whose diagnosis actually finished, so time-to-diagnose is not null on the rollup', () => {
    const diagnosed = state.workCards.filter(c => timeToDiagnose(c) != null);
    expect(diagnosed.length).toBeGreaterThan(0);
    diagnosed.forEach(c => expect(timeToDiagnose(c)!).toBeGreaterThan(0));
  });

  it('seeds BOTH a delivered and an open parts order, so lead time and "and counting" both render', () => {
    const leads = state.workCards.flatMap(c => partsLeadTimes(c, nowIso));
    expect(leads.some(l => !l.open && l.hours > 0)).toBe(true);
    expect(leads.some(l => l.open)).toBe(true);
  });

  it('the rollup is non-trivial in a 90-day window: more than one tail, and every headline populated', () => {
    const m = fleetMetrics(state.workCards, window);
    expect(m.byAircraft.length).toBeGreaterThan(1);
    expect(m.medianDiagnoseHours).not.toBeNull();
    expect(m.totalInstallHours).toBeGreaterThan(0);
    expect(m.excludedGapHours).toBeGreaterThan(0);
    expect(m.byVendor.some(v => v.medianLeadHours != null)).toBe(true);
  });

  it('the full arc is seeded on one card: diagnose → order → receive → install → complete', () => {
    const wc4 = state.workCards.find(c => c.id === 'wc-4');
    expect(wc4).toBeDefined();
    const tags = (wc4!.statusTags ?? []).map(t => t.tag);
    expect(tags).toContain('DIAGNOSING');
    expect(tags).toContain('WAITING_PARTS');
    expect(tags).toContain('GAP');
    expect(tags).toContain('IN_WORK');
    expect(wc4!.status).toBe('COMPLETED');
    expect(wc4!.partsOrders?.[0].receivedAtUtc).toBeTruthy();
    // A signed release points at this card — which is precisely why D62's audit trail exists.
    expect(state.releases.some(r => r.linkedWorkCardId === 'wc-4')).toBe(true);
  });

  it('the free-text POO note is left alone alongside the structured order — nothing was migrated', () => {
    const wc3 = state.workCards.find(c => c.id === 'wc-3')!;
    const poo = (wc3.statusTags ?? []).find(t => t.tag === 'WAITING_PARTS')!;
    expect(poo.note).toBeTruthy();
    expect(wc3.partsOrders?.length).toBeGreaterThan(0);
  });
});
