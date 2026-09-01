import { describe, expect, it } from 'vitest';
import { cardsFor, datesLabel, executiveCard, headlineFor } from './executiveCard';
import { toHubTrip } from './hubMonth';
import { describeScarcity, freeCountIndex, freeCountByDay } from '../../../availability/engine/freeCount';
import { CORE_TAILS, CORE_FLEET_SIZE } from '../../../fleet/registry';
import type { AvailabilityReason, FleetAvailability, TailDayAvailability } from '../../../availability/types';
import type { RequestLeg, TripRequest } from '../types';

const reason = (over: Partial<AvailabilityReason> = {}): AvailabilityReason => ({
  category: 'none', rank: 99, detail: '', untilUtc: null, ...over,
});

const cell = (tail: string, dateUtc: string, over: Partial<TailDayAvailability> = {}): TailDayAvailability => ({
  tail, dateUtc, state: 'available', reason: reason(), reasons: [reason()], conflicts: [],
  overlay: null, tripId: null,
  crew: { crewsFormable: 2, crewsCommitted: 0, crewsFree: 2, rostered: true },
  ...over,
});

function grid(dates: string[], poke: (tail: string, date: string) => Partial<TailDayAvailability> = () => ({})): FleetAvailability {
  return {
    days: dates.map(d => ({ dateUtc: d, dateLabel: d.slice(8) })),
    rows: CORE_TAILS.map(tail => ({ tail, type: 'G650ER', cells: dates.map(d => cell(tail, d, poke(tail, d))) })),
    generatedAtUtc: '2026-09-01T12:00:00.000Z',
  };
}

const blocked = { state: 'unavailable' as const, reason: reason({ category: 'maintenance' as const, rank: 1 }), reasons: [reason({ category: 'maintenance' as const, rank: 1 })] };

const leg = (over: Partial<RequestLeg> = {}): RequestLeg => ({
  id: 'L1', from: 'KCVG', to: 'KTEB', date: '2026-09-10', departLocal: '08:00',
  flexHours: 0, estMinutes: 95, estNm: 480, passengers: [], ...over,
});

const req = (over: Partial<TripRequest> = {}): TripRequest => ({
  id: 'R-1', status: 'pending', tier: 1, principalId: 'P-REYES', requestedBy: 'Dana (EA)',
  createdAt: '2026-09-01T12:00:00.000Z', legs: [leg()], extras: [], messages: [], ...over,
});

describe('one word, not a status ladder', () => {
  it('says CONFIRMED for approved and confirmed, ASKED FOR for everything else', () => {
    expect(headlineFor(req({ status: 'approved' }))).toBe('CONFIRMED');
    expect(headlineFor(req({ status: 'confirmed' }))).toBe('CONFIRMED');
    expect(headlineFor(req({ status: 'pending' }))).toBe('ASKED FOR');
    expect(headlineFor(req({ status: 'requested' }))).toBe('ASKED FOR');
  });

  it('is the same distinction her month draws as solid vs dashed', () => {
    for (const status of ['approved', 'confirmed', 'pending', 'requested', 'declined'] as const) {
      const r = req({ status });
      const solid = toHubTrip(r).style === 'solid';
      expect(headlineFor(r) === 'CONFIRMED').toBe(solid);
    }
  });
});

describe('his line and her month come from one function', () => {
  const dates = ['2026-09-10', '2026-09-11'];

  it('never disagree about the same week', () => {
    const fleet = grid(dates, (tail, date) => (date === '2026-09-11' && tail === CORE_TAILS[0] ? blocked : {}));
    const byDate = freeCountIndex(fleet);

    // Hers: the numbers her calendar prints on those two days.
    const herCounts = freeCountByDay(fleet).filter(c => dates.includes(c.dateUtc));
    // His: the sentence on his card.
    const card = executiveCard(req({ legs: [leg({ date: dates[0] }), leg({ id: 'L2', date: dates[1] })] }), byDate);

    expect(card.scarcity.fewestFree).toBe(Math.min(...herCounts.map(c => c.free)));
    expect(card.scarcity.line).toBe(describeScarcity(herCounts).line);
  });

  it('reads the tightest day, not an average — the binding day is the one that matters', () => {
    const fleet = grid(dates, (_t, date) => (date === '2026-09-11' ? blocked : {}));
    const card = executiveCard(
      req({ legs: [leg({ date: dates[0] }), leg({ id: 'L2', date: dates[1] })] }),
      freeCountIndex(fleet),
    );
    expect(card.scarcity.fewestFree).toBe(0);
    expect(card.scarcity.line).toContain('Every aircraft is committed');
  });

  it('says a far-out answer is a plan and not a promise', () => {
    const unrostered = {
      state: 'available' as const,
      reason: reason({ category: 'not-yet-rostered' as const, rank: 6 }),
      reasons: [reason({ category: 'not-yet-rostered' as const, rank: 6 })],
      crew: { crewsFormable: 0, crewsCommitted: 0, crewsFree: 0, rostered: false },
    };
    const fleet = grid(['2027-06-10'], () => unrostered);
    const card = executiveCard(req({ legs: [leg({ date: '2027-06-10' })] }), freeCountIndex(fleet));
    expect(card.scarcity.provisional).toBe(true);
    expect(card.scarcity.line).toContain('plan rather than a promise');
  });

  it('names all four when the week is wide open', () => {
    const card = executiveCard(req({ legs: [leg({ date: dates[0] })] }), freeCountIndex(grid(dates)));
    expect(card.scarcity.line).toContain(`All ${CORE_FLEET_SIZE} aircraft are free`);
  });
});

describe('what an executive is never shown', () => {
  const fleet = grid(['2026-09-10'], (tail) => (tail === CORE_TAILS[0] ? blocked : {}));

  it('never a tail number', () => {
    const card = executiveCard(req(), freeCountIndex(fleet));
    expect(JSON.stringify(card)).not.toMatch(/N\d{1,3}[A-Z]{2}/);
  });

  it('never another executive, at any density', () => {
    const cards = cardsFor(
      [req({ id: 'R-1' }), req({ id: 'R-2', principalId: 'P-TANAKA', requestedBy: 'P. Marsh' })],
      'P-REYES',
      freeCountIndex(fleet),
    );
    expect(cards).toHaveLength(1);
    expect(JSON.stringify(cards)).not.toContain('TANAKA');
    expect(JSON.stringify(cards)).not.toContain('Marsh');
  });

  it('never why a day is tight — only that it is', () => {
    const card = executiveCard(req(), freeCountIndex(fleet));
    expect(card.scarcity.line).not.toMatch(/maintenance|defect|crew/i);
  });

  it('never a bump reason before somebody has said it aloud', () => {
    const bumped = req({ bumpedBy: { id: 'B', authorizedBy: 'M. Alvarez', reason: 'Board trip', atUtc: '2026-09-02T00:00:00Z', reasonVisibleAt: null } });
    const card = executiveCard(bumped, freeCountIndex(fleet));
    expect(card.note).toBe('Scheduling is working on this and will call.');
    expect(JSON.stringify(card)).not.toContain('Board trip');
  });
});

describe('his cards', () => {
  it('are soonest first, with undated trips at the end rather than vanishing', () => {
    const byDate = freeCountIndex(grid(['2026-09-10']));
    const cards = cardsFor([
      req({ id: 'R-1', legs: [leg({ date: '2026-11-02' })] }),
      req({ id: 'R-2', legs: [] }),
      req({ id: 'R-3', legs: [leg({ date: '2026-09-10' })] }),
    ], 'P-REYES', byDate);
    expect(cards.map(c => c.requestId)).toEqual(['R-3', 'R-1', 'R-2']);
    expect(datesLabel(req({ legs: [] }))).toBe('No dates yet');
  });

  it('leave a form she never sent out of his view', () => {
    const byDate = freeCountIndex(grid(['2026-09-10']));
    expect(cardsFor([req({ status: 'draft' })], 'P-REYES', byDate)).toHaveLength(0);
  });
});
