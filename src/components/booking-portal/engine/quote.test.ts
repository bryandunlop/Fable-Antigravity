import { describe, expect, it } from 'vitest';
import { GFO_RATE_CARD, daysUntil, hm, quoteRequest, type QuoteLegInput } from './quote';

const NOW = '2026-08-23';
const leg = (over: Partial<QuoteLegInput> = {}): QuoteLegInput => ({
  estMinutes: 120,
  date: '2026-09-05',      // 13 days out — inside the early-booking window
  flexHours: 0,
  purposes: ['business'],
  ...over,
});

describe('daysUntil', () => {
  it('counts whole days forward', () => {
    expect(daysUntil('2026-08-23', '2026-09-05')).toBe(13);
  });
  it('is negative for a past date and zero for garbage', () => {
    expect(daysUntil('2026-09-05', '2026-08-23')).toBe(-13);
    expect(daysUntil('2026-08-23', 'not-a-date')).toBe(0);
  });
});

describe('quoteRequest — the base charge', () => {
  it('bills flight time and repositioning separately, because the requestor pays for both', () => {
    const q = quoteRequest([leg({ estMinutes: 120 })], NOW);
    expect(q.flightHours).toBe(2);
    expect(q.repositioningHours).toBeCloseTo(0.6);
    expect(q.billableHours).toBeCloseTo(2.6);

    const labels = q.lines.filter((l) => l.kind === 'charge').map((l) => l.label);
    expect(labels).toEqual(['Flight time', 'Repositioning']);
    expect(q.total).toBe(26_000);
  });

  it('quotes nothing for no legs, and does not divide by zero', () => {
    const q = quoteRequest([], NOW);
    expect(q.total).toBe(0);
    expect(q.effectivePerHour).toBe(0);
    expect(q.ceilingUsed).toBe(0);
  });
});

describe('quoteRequest — every modulation is a credit', () => {
  it('never emits a line that increases the charge beyond the base', () => {
    const q = quoteRequest(
      [leg({ date: '2026-11-01', flexHours: 8, sharedRepositioning: true })],
      NOW,
    );
    const base = quoteRequest([leg({ estMinutes: 120 })], NOW).subtotal;
    expect(q.total).toBeLessThan(base);
    expect(q.lines.every((l) => (l.kind === 'credit' ? l.amount < 0 : l.amount >= 0))).toBe(true);
  });

  it('earns the early-booking credit only at or beyond the threshold', () => {
    const inside = quoteRequest([leg({ date: '2026-09-05' })], NOW);   // 13 days
    const atEdge = quoteRequest([leg({ date: '2026-09-22' })], NOW);   // exactly 30 days
    expect(inside.lines.some((l) => l.label === 'Early-booking credit')).toBe(false);
    expect(atEdge.lines.some((l) => l.label === 'Early-booking credit')).toBe(true);
    expect(atEdge.total).toBeLessThan(inside.total);
  });

  it('earns the flex credit only on legs that actually give scheduling a window', () => {
    const firm = quoteRequest([leg({ flexHours: 0 }), leg({ flexHours: 2 })], NOW);
    const flexed = quoteRequest([leg({ flexHours: 0 }), leg({ flexHours: 4 })], NOW);
    expect(firm.lines.some((l) => l.label === 'Flex credit')).toBe(false);
    expect(flexed.lines.some((l) => l.label === 'Flex credit')).toBe(true);
    // pro-rata: only the flexible leg's hours earn it, not the whole request
    const credit = flexed.lines.find((l) => l.label === 'Flex credit')!.amount;
    expect(credit).toBe(-Math.round(2.6 * 10_000 * 0.1));
  });

  it('credits a shared deadhead against the repositioning portion only', () => {
    const q = quoteRequest([leg({ sharedRepositioning: true })], NOW);
    const credit = q.lines.find((l) => l.label === 'Shared repositioning')!.amount;
    expect(credit).toBe(-Math.round(0.6 * 10_000 * 0.5));
  });
});

describe('quoteRequest — 14 CFR 91.501(b)(5)', () => {
  it('never quotes above the cost ceiling, even if the rate card is misconfigured', () => {
    const absurd = { ...GFO_RATE_CARD, publishedPerHour: 99_000 };
    const q = quoteRequest([leg()], NOW, absurd);
    expect(q.total).toBe(Math.round(2.6 * 20_000));
    expect(q.ceilingUsed).toBeCloseTo(1);
    expect(q.effectivePerHour).toBeLessThanOrEqual(q.ceilingPerHour);
  });

  it('reports the real headroom at the published rate rather than implying the cap is binding', () => {
    const q = quoteRequest([leg()], NOW);
    expect(q.ceilingUsed).toBeCloseTo(0.5);
  });

  it('surfaces non-business carriage as a no-charge note, never as a bigger number', () => {
    const business = quoteRequest([leg({ purposes: ['business'] })], NOW);
    const personal = quoteRequest([leg({ purposes: ['business', 'entertainment'] })], NOW);
    expect(personal.total).toBe(business.total);
    expect(personal.nonBusinessNote).toContain('91.501(b)(5)');
    const note = personal.lines.find((l) => l.kind === 'note')!;
    expect(note.amount).toBe(0);
  });

  it('never returns a negative total, however deep the credits stack', () => {
    const generous = {
      ...GFO_RATE_CARD,
      earlyBookingCredit: 0.9,
      flexCredit: 0.9,
      sharedRepoCredit: 1,
    };
    const q = quoteRequest(
      [leg({ date: '2026-12-01', flexHours: 8, sharedRepositioning: true })],
      NOW,
      generous,
    );
    expect(q.total).toBeGreaterThanOrEqual(0);
  });
});

describe('quoteRequest — the commitment ladder', () => {
  it('costs more the closer to departure, and nothing far out', () => {
    const q = quoteRequest([leg()], NOW);
    const amounts = q.cancelSchedule.map((s) => s.amount);
    expect(amounts[0]).toBe(0);
    expect(amounts[amounts.length - 1]).toBe(q.total);
    for (let i = 1; i < amounts.length; i += 1) {
      expect(amounts[i]).toBeGreaterThanOrEqual(amounts[i - 1]);
    }
  });

  it('scales with the quote, so a credited trip is also cheaper to cancel', () => {
    const firm = quoteRequest([leg()], NOW);
    const credited = quoteRequest([leg({ date: '2026-11-01', flexHours: 8 })], NOW);
    expect(credited.cancelSchedule[3].amount).toBeLessThan(firm.cancelSchedule[3].amount);
  });
});

describe('hm — flight time reads as hours and minutes, not decimals', () => {
  it('formats the way the rest of the portal does', () => {
    expect(hm(1.75)).toBe('1 h 45 m');
    expect(hm(2)).toBe('2 h');
    expect(hm(0.6)).toBe('36 m');
    expect(hm(0)).toBe('0 m');
  });

  it('keeps the stated hours consistent with the amount charged', () => {
    // The defect this guards: "1.8 h at $10,000/h" beside $17,500 reads as an error.
    const q = quoteRequest([leg({ estMinutes: 105 })], NOW);
    const line = q.lines.find((l) => l.label === 'Flight time')!;
    expect(line.detail).toContain('1 h 45 m');
    expect(line.amount).toBe(17_500);
  });
});
