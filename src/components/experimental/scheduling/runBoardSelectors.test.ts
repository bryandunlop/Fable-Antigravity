import { describe, it, expect } from 'vitest';
import { buildRunBoard } from './runBoardSelectors';
import type { MockTripData, MockChecklistItem } from '../mockData';

const DAY = 86400000;
// Fixed "now": 12:00 local on a known day
const NOW = new Date(2026, 6, 3, 12, 0, 0, 0).getTime();

let seq = 0;
function item(p: Partial<MockChecklistItem> = {}): MockChecklistItem {
  return {
    id: `i${seq++}`, title: 'Task', category: 'dispatch', status: 'requested',
    assignedTo: 'Sarah M.', dueOffsetDays: 0, ...p,
  };
}
function trip(depDaysFromNow: number, checklist: MockChecklistItem[], p: Partial<MockTripData> = {}): MockTripData {
  return {
    id: `t${seq++}`, tripNumber: `TRP-2026-${seq}`, client: 'Apex Corp', aircraft: 'N2PG',
    route: 'KTEB → KDAL', departureDate: new Date(NOW + depDaysFromNow * DAY).toISOString(),
    durationDays: 2, status: 'planning', readinessScore: 50, isInternational: false,
    checklist, ...p,
  };
}

describe('buildRunBoard', () => {
  it('a blocked item surfaces in BLOCKED regardless of a far-future due date', () => {
    const t = trip(30, [item({ status: 'blocked', dueOffsetDays: 0, lastComment: 'Slot Unconfirmed' })]);
    const m = buildRunBoard([t], NOW, 60);
    expect(m.groups.blocked).toHaveLength(1);
    expect(m.groups.overdue).toHaveLength(0);
  });

  it('splits overdue vs due-today at midnight', () => {
    // Trip departs in 2 days; offset 3 → due yesterday (overdue); offset 2 → due today
    const t = trip(2, [item({ dueOffsetDays: 3 }), item({ dueOffsetDays: 2 })]);
    const m = buildRunBoard([t], NOW, 14);
    expect(m.groups.overdue).toHaveLength(1);
    expect(m.groups['due-today']).toHaveLength(1);
  });

  it('upcoming window respects the horizon and sorts by due', () => {
    const t = trip(10, [item({ dueOffsetDays: 8 }), item({ dueOffsetDays: 6 }), item({ dueOffsetDays: 1 })]);
    // horizon 5 days: due at +2d and +4d are in; due at +9d is out
    const m = buildRunBoard([t], NOW, 5);
    expect(m.groups['next-48']).toHaveLength(2);
    expect(m.groups['next-48'][0].dueMs).toBeLessThan(m.groups['next-48'][1].dueMs);
  });

  it('excludes ready items and departed trips entirely', () => {
    const departed = trip(-1, [item({ dueOffsetDays: 0 })]);
    const active = trip(2, [item({ status: 'ready', dueOffsetDays: 5 }), item({ dueOffsetDays: 2 })]);
    const m = buildRunBoard([departed, active], NOW, 14);
    const all = [...m.groups.blocked, ...m.groups.overdue, ...m.groups['due-today'], ...m.groups['next-48']];
    expect(all).toHaveLength(1); // only the active trip's non-ready item (due today via offset 2 on dep+2)
  });

  it('funnel counts TRIPS in the horizon, not items', () => {
    const a = trip(2, [item(), item(), item()], { criticalBlocker: 'Need Pax Passports', readinessScore: 40 });
    const b = trip(3, [item()], { readinessScore: 100 });
    const far = trip(40, [item()], { readinessScore: 0 }); // outside horizon
    const m = buildRunBoard([a, b, far], NOW, 14);
    expect(m.funnel.blocked).toBe(1);
    expect(m.funnel.ready).toBe(1);
    expect(m.funnel.total).toBe(2);
  });

  it('every task row carries a due label and its trip context', () => {
    const t = trip(2, [item({ dueOffsetDays: 2 })]);
    const m = buildRunBoard([t], NOW, 14);
    const task = m.groups['due-today'][0];
    expect(task.dueLabel).toMatch(/today/i);
    expect(task.tripNumber).toBe(t.tripNumber);
    expect(task.tail).toBe('N2PG');
  });
});
