// Metrics — who gets bumped, who gets told no, and why (D107, LG-324, LG-327).
//
// Every number here is a count of events already on the trip records. The reason is a CATEGORY
// chosen at decline or bump time (Bryan, 2026-09-01: no crew · aircraft in maintenance · conflict
// with a senior trip · did not fit the aircraft · other); free text may ride along but is never
// what gets counted. Pure.

import type { DenialCategory, Trip, TripEvent } from './trip';

export type { DenialCategory };

export const DENIAL_LABEL: Record<DenialCategory, string> = {
  'no-crew': 'No crew',
  maintenance: 'Aircraft in maintenance',
  'senior-conflict': 'Conflict with a senior trip',
  'not-a-fit': 'Did not fit the aircraft',
  other: 'Other',
};

export const DENIAL_CATEGORIES = Object.keys(DENIAL_LABEL) as DenialCategory[];

export interface Metrics {
  windowDays: number;
  requests: number;
  accepted: number;
  cancelled: number;
  denied: number;
  deniedByCategory: Array<{ category: DenialCategory; label: string; count: number }>;
  bumpedByLead: Array<{ lead: string; bumped: number; trips: number }>;
  bumps: number;
}

const inWindow = (e: TripEvent, sinceUtc: string) => e.at >= sinceUtc;

export function computeMetrics(trips: Trip[], nowUtc: string, windowDays = 90): Metrics {
  const since = new Date(Date.parse(nowUtc) - windowDays * 86_400_000).toISOString();
  const submitted = trips.filter(t => t.events.some(e => e.kind === 'submitted' && inWindow(e, since)));
  const accepted = submitted.filter(t => t.events.some(e => e.kind === 'assigned')).length;
  const cancelled = trips.filter(t => t.events.some(e => e.kind === 'cancelled' && inWindow(e, since))).length;
  const denials = trips.flatMap(t => t.events.filter(e => e.kind === 'declined' && inWindow(e, since)));
  const byCat = new Map<DenialCategory, number>();
  for (const e of denials) if (e.kind === 'declined') byCat.set(e.category ?? 'other', (byCat.get(e.category ?? 'other') ?? 0) + 1);
  const leads = new Map<string, { bumped: number; trips: number }>();
  for (const t of trips) {
    if (!t.events.some(e => e.kind === 'submitted' && inWindow(e, since))) continue;
    const row = leads.get(t.leadPassengerName) ?? { bumped: 0, trips: 0 };
    row.trips += 1;
    row.bumped += t.events.filter(e => e.kind === 'bumped' && inWindow(e, since)).length;
    leads.set(t.leadPassengerName, row);
  }
  return {
    windowDays,
    requests: submitted.length,
    accepted,
    cancelled,
    denied: denials.length,
    deniedByCategory: DENIAL_CATEGORIES.map(c => ({ category: c, label: DENIAL_LABEL[c], count: byCat.get(c) ?? 0 })).filter(x => x.count > 0).sort((a, b) => b.count - a.count),
    bumpedByLead: Array.from(leads.entries()).map(([lead, v]) => ({ lead, ...v })).sort((a, b) => b.bumped - a.bumped || b.trips - a.trips),
    bumps: Array.from(leads.values()).reduce((s, v) => s + v.bumped, 0),
  };
}
