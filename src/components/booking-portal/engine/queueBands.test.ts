import { describe, it, expect } from 'vitest';
import { buildQueue, overallRank } from './queueBands';
import type { SeatAsk, TripRequest } from '../types';

const NOW = Date.parse('2026-08-04T12:00:00Z');
const day = (n: number) => new Date(NOW + n * 86_400_000).toISOString().slice(0, 10);

function req(partial: Partial<TripRequest> & { id: string }): TripRequest {
  return {
    status: 'pending',
    tier: 2,
    principalId: 'P1',
    requestedBy: 'Dana (EA)',
    createdAt: '2026-07-28T09:00:00Z',
    legs: [{
      id: 'L', from: 'KCVG', to: 'KTEB', date: day(30), departLocal: '08:00',
      flexHours: 0, estMinutes: 105, estNm: 570, passengers: [],
    }],
    extras: [],
    messages: [],
    ...partial,
  };
}

const ask = (id: string, status: SeatAsk['status'] = 'requested'): SeatAsk => ({
  id, flightId: 'F-1', passengerId: 'P-X', purpose: 'business', status, createdAt: '2026-08-01T00:00:00Z',
});

describe('buildQueue — urgency bands over the policy ranking', () => {
  it('lifts a pending request departing inside the week into its own band', () => {
    const model = buildQueue(
      [req({ id: 'soon', legs: [{ ...req({ id: 'x' }).legs[0], date: day(3) }] }), req({ id: 'later' })],
      [],
      NOW,
    );
    expect(model.bands['departing-soon'].map((r) => r.id)).toEqual(['soon']);
    expect(model.bands.pending.map((r) => r.id)).toEqual(['later']);
  });

  it('keeps tier-then-time order inside a band', () => {
    const soonLeg = (id: string) => ({ ...req({ id }).legs[0], date: day(2) });
    const model = buildQueue(
      [
        req({ id: 'b', tier: 1, createdAt: '2026-07-29T15:44:00Z', legs: [soonLeg('b')] }),
        req({ id: 'c', tier: 2, createdAt: '2026-07-27T08:15:00Z', legs: [soonLeg('c')] }),
        req({ id: 'a', tier: 1, createdAt: '2026-07-28T09:02:00Z', legs: [soonLeg('a')] }),
      ],
      [],
      NOW,
    );
    expect(model.bands['departing-soon'].map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });

  it('separates approved requests awaiting placement from pending ones', () => {
    const model = buildQueue(
      [req({ id: 'p' }), req({ id: 'ok', status: 'approved' }), req({ id: 'done', status: 'confirmed' })],
      [],
      NOW,
    );
    expect(model.bands.pending.map((r) => r.id)).toEqual(['p']);
    expect(model.bands['awaiting-placement'].map((r) => r.id)).toEqual(['ok']);
    expect(model.counts.approved).toBe(1);
  });

  it('counts only open seat asks', () => {
    const model = buildQueue([], [ask('s1'), ask('s2', 'confirmed'), ask('s3')], NOW);
    expect(model.seatAsks.map((s) => s.id)).toEqual(['s1', 's3']);
    expect(model.counts.seatAsks).toBe(2);
  });

  it('totals every decision waiting on the scheduler', () => {
    const model = buildQueue(
      [req({ id: 'p1' }), req({ id: 'p2' }), req({ id: 'ok', status: 'approved' })],
      [ask('s1')],
      NOW,
    );
    expect(model.counts).toMatchObject({ pending: 2, approved: 1, seatAsks: 1, total: 4 });
  });

  it('tallies tiers across the pending queue', () => {
    const model = buildQueue(
      [req({ id: 'a', tier: 1 }), req({ id: 'b', tier: 1 }), req({ id: 'c', tier: 3 })],
      [],
      NOW,
    );
    expect(model.tiers).toEqual({ t1: 2, t2: 0, t3: 1 });
  });

  it('a request with no legs never counts as departing soon', () => {
    const model = buildQueue([req({ id: 'empty', legs: [] })], [], NOW);
    expect(model.bands['departing-soon']).toHaveLength(0);
    expect(model.bands.pending.map((r) => r.id)).toEqual(['empty']);
  });
});

describe('overallRank — one number across both pending bands', () => {
  it('ranks departing-soon ahead of the rest', () => {
    const soon = req({ id: 'soon', tier: 3, legs: [{ ...req({ id: 'x' }).legs[0], date: day(1) }] });
    const later = req({ id: 'later', tier: 1 });
    const model = buildQueue([soon, later], [], NOW);
    expect(overallRank(model, soon)).toBe(1);
    expect(overallRank(model, later)).toBe(2);
  });
});
