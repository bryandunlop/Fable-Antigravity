// The booking queue, banded the way the Action Center bands work: urgency
// first, so a request that departs on Friday is never buried under one that
// departs next month just because it was submitted later.
//
// Ranking WITHIN a band is still the design's policy — org tier, then request
// time. Banding does not override it; it groups the same ordered list.

import type { SeatAsk, TripRequest } from '../types';
import { rankQueue } from './lifecycle';

export type QueueBand = 'departing-soon' | 'pending' | 'awaiting-placement' | 'seat-asks';

/** A pending request whose first leg departs within this window jumps the band. */
export const DEPARTING_SOON_DAYS = 7;

export interface QueueModel {
  bands: {
    'departing-soon': TripRequest[];
    pending: TripRequest[];
    'awaiting-placement': TripRequest[];
  };
  seatAsks: SeatAsk[];
  counts: { pending: number; approved: number; seatAsks: number; total: number };
  tiers: { t1: number; t2: number; t3: number };
}

function daysUntilDeparture(request: TripRequest, nowMs: number): number {
  const first = request.legs[0];
  if (!first) return Number.POSITIVE_INFINITY;
  const depart = Date.parse(first.date);
  if (Number.isNaN(depart)) return Number.POSITIVE_INFINITY;
  return (depart - nowMs) / 86_400_000;
}

export function buildQueue(
  requests: TripRequest[],
  seatAsks: SeatAsk[],
  nowMs: number,
): QueueModel {
  const ranked = rankQueue(requests);
  const departingSoon: TripRequest[] = [];
  const pending: TripRequest[] = [];
  for (const r of ranked) {
    if (daysUntilDeparture(r, nowMs) <= DEPARTING_SOON_DAYS) departingSoon.push(r);
    else pending.push(r);
  }
  const awaiting = requests
    .filter((r) => r.status === 'approved')
    .slice()
    .sort((a, b) => a.tier - b.tier || a.createdAt.localeCompare(b.createdAt));
  const openAsks = seatAsks.filter((s) => s.status === 'requested');

  return {
    bands: { 'departing-soon': departingSoon, pending, 'awaiting-placement': awaiting },
    seatAsks: openAsks,
    counts: {
      pending: ranked.length,
      approved: awaiting.length,
      seatAsks: openAsks.length,
      total: ranked.length + awaiting.length + openAsks.length,
    },
    tiers: {
      t1: ranked.filter((r) => r.tier === 1).length,
      t2: ranked.filter((r) => r.tier === 2).length,
      t3: ranked.filter((r) => r.tier === 3).length,
    },
  };
}

/** Overall rank across both pending bands — the number the scheduler works down. */
export function overallRank(model: QueueModel, request: TripRequest): number {
  const all = [...model.bands['departing-soon'], ...model.bands.pending];
  return all.findIndex((r) => r.id === request.id) + 1;
}
