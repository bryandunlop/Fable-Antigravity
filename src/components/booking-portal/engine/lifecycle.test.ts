import { describe, it, expect } from 'vitest';
import { canTransition, rankQueue, routeLabel } from './lifecycle';
import type { TripRequest } from '../types';

function req(partial: Partial<TripRequest>): TripRequest {
  return {
    id: 'R-1',
    status: 'pending',
    tier: 2,
    principalId: 'P1',
    requestedBy: 'Dana Whitfield (EA)',
    createdAt: '2026-07-28T09:00:00Z',
    legs: [],
    extras: [],
    messages: [],
    ...partial,
  };
}

describe('trip path transitions — Approved ≠ Confirmed', () => {
  it('follows the ladder draft → requested → pending → approved → confirmed', () => {
    expect(canTransition('draft', 'requested')).toBe(true);
    expect(canTransition('requested', 'pending')).toBe(true);
    expect(canTransition('pending', 'approved')).toBe(true);
    expect(canTransition('approved', 'confirmed')).toBe(true);
  });

  it('declining is only legal from pending, and reopens as draft (resubmit)', () => {
    expect(canTransition('pending', 'declined')).toBe(true);
    expect(canTransition('declined', 'draft')).toBe(true);
    expect(canTransition('approved', 'declined')).toBe(false);
    expect(canTransition('confirmed', 'declined')).toBe(false);
  });

  it('never skips approval or reopens a confirmed trip', () => {
    expect(canTransition('pending', 'confirmed')).toBe(false);
    expect(canTransition('draft', 'approved')).toBe(false);
    expect(canTransition('confirmed', 'draft')).toBe(false);
  });
});

describe('rankQueue — org tier, then request time (provisional default)', () => {
  it('orders by tier first, then created time within a tier, pending only', () => {
    const ranked = rankQueue([
      req({ id: 'R-3', tier: 2, createdAt: '2026-07-27T08:15:00Z' }),
      req({ id: 'R-1', tier: 1, createdAt: '2026-07-28T09:02:00Z' }),
      req({ id: 'R-4', tier: 3, createdAt: '2026-07-30T11:20:00Z' }),
      req({ id: 'R-2', tier: 1, createdAt: '2026-07-29T15:44:00Z' }),
      req({ id: 'R-5', tier: 1, createdAt: '2026-07-01T00:00:00Z', status: 'confirmed' }),
    ]);
    expect(ranked.map((r) => r.id)).toEqual(['R-1', 'R-2', 'R-3', 'R-4']);
  });
});

describe('routeLabel', () => {
  const leg = (from: string, to: string) => ({
    id: 'L', from, to, date: '2026-08-18', departLocal: '08:00',
    flexHours: 0, estMinutes: 105, estNm: 570, passengers: [],
  });

  it('labels a round trip with ⇄', () => {
    expect(routeLabel(req({ legs: [leg('KCVG', 'KTEB'), leg('KTEB', 'KCVG')] }))).toBe('KCVG ⇄ KTEB');
  });

  it('labels a one-way chain with arrows', () => {
    expect(routeLabel(req({ legs: [leg('KCVG', 'KTEB'), leg('KTEB', 'KPBI')] }))).toBe('KCVG → KTEB → KPBI');
  });
});
