import { describe, it, expect } from 'vitest';
import { buildRunBoard, clusterRunTasks } from './runBoardSelectors';
import type { BoardTrip, BoardTask } from './adapter';

const DAY = 86400000;
// Fixed "now": 12:00 local on a known day
const NOW = new Date(2026, 6, 3, 12, 0, 0, 0).getTime();

let seq = 0;
function task(p: Partial<BoardTask> = {}): BoardTask {
  return {
    id: `i${seq++}`, title: 'Task', category: 'ops', order: 1, status: 'open',
    ownerRole: 'scheduling', dueAtUtc: new Date(NOW).toISOString(),
    requiresAck: false, ackState: 'n_a', ...p,
  };
}
function trip(depDaysFromNow: number, tasks: BoardTask[], p: Partial<BoardTrip> = {}): BoardTrip {
  return {
    id: `t${seq++}`, tripNumber: `T-2026-07${seq}`, client: 'Domestic', aircraft: 'N2PG',
    aircraftType: 'G650ER', route: 'KLUK → KTEB',
    departureDate: new Date(NOW + depDaysFromNow * DAY).toISOString(), durationDays: 2,
    readinessScore: 50, isInternational: false, priority: 'standard', tripStatus: 'planning',
    tasks, ...p,
  };
}
const dueIn = (days: number) => new Date(NOW + days * DAY).toISOString();

describe('buildRunBoard (production TaskInstance semantics)', () => {
  it('a blocked task surfaces in BLOCKED regardless of a far-future due date', () => {
    const t = trip(30, [task({ status: 'blocked', dueAtUtc: dueIn(28), notes: 'Slot unconfirmed' })]);
    const m = buildRunBoard([t], [], NOW, 60);
    expect(m.groups.blocked).toHaveLength(1);
    expect(m.groups.overdue).toHaveLength(0);
  });

  it('splits overdue vs due-today at midnight', () => {
    const t = trip(5, [task({ dueAtUtc: dueIn(-1) }), task({ dueAtUtc: new Date(NOW + 3600000).toISOString() })]);
    const m = buildRunBoard([t], [], NOW, 14);
    expect(m.groups.overdue).toHaveLength(1);
    expect(m.groups['due-today']).toHaveLength(1);
  });

  it('upcoming respects the horizon and sorts by due', () => {
    const t = trip(10, [task({ dueAtUtc: dueIn(4) }), task({ dueAtUtc: dueIn(2) }), task({ dueAtUtc: dueIn(9) })]);
    const m = buildRunBoard([t], [], NOW, 5);
    expect(m.groups['next-48']).toHaveLength(2);
    expect(m.groups['next-48'][0].dueMs).toBeLessThan(m.groups['next-48'][1].dueMs);
  });

  it('excludes settled tasks (done AND n_a) and departed trips entirely', () => {
    const departed = trip(-1, [task({ dueAtUtc: dueIn(0) })]);
    const active = trip(2, [
      task({ status: 'done', dueAtUtc: dueIn(1) }),
      task({ status: 'n_a', dueAtUtc: dueIn(1) }),
      task({ status: 'in_progress', dueAtUtc: new Date(NOW + 3600000).toISOString() }),
    ]);
    const m = buildRunBoard([departed, active], [], NOW, 14);
    const all = [...m.groups.blocked, ...m.groups.overdue, ...m.groups['due-today'], ...m.groups['next-48']];
    expect(all).toHaveLength(1);
    expect(all[0].task.status).toBe('in_progress');
  });

  it('folds recurring office tasks into the same groups, flagged office with no trip context', () => {
    const office = [task({ dueAtUtc: dueIn(-2), title: 'Flight log audit' }), task({ status: 'done', dueAtUtc: dueIn(0) })];
    const m = buildRunBoard([], office, NOW, 14);
    expect(m.groups.overdue).toHaveLength(1);
    expect(m.groups.overdue[0].office).toBe(true);
    expect(m.groups.overdue[0].tripNumber).toBeUndefined();
    const all = [...m.groups.blocked, ...m.groups.overdue, ...m.groups['due-today'], ...m.groups['next-48']];
    expect(all).toHaveLength(1); // settled office task excluded
  });

  it('funnel counts TRIPS in the horizon, not tasks (office tasks never count)', () => {
    const a = trip(2, [task(), task()], { criticalBlocker: 'Need pax passports', readinessScore: 40 });
    const b = trip(3, [task({ status: 'done' })], { readinessScore: 100 });
    const far = trip(40, [task()], { readinessScore: 0 });
    const m = buildRunBoard([a, b, far], [task({ dueAtUtc: dueIn(0) })], NOW, 14);
    expect(m.funnel.blocked).toBe(1);
    expect(m.funnel.ready).toBe(1);
    expect(m.funnel.total).toBe(2);
  });

  it('rows carry due labels and trip context', () => {
    const t = trip(2, [task({ dueAtUtc: new Date(NOW + 3600000).toISOString() })]);
    const m = buildRunBoard([t], [], NOW, 14);
    const row = m.groups['due-today'][0];
    expect(row.dueLabel).toMatch(/today/i);
    expect(row.tripNumber).toBe(t.tripNumber);
    expect(row.tail).toBe('N2PG');
  });
});

describe('clusterRunTasks', () => {
  it('groups tasks under their trip, most-urgent cluster first, office always last', () => {
    const a = trip(3, [task({ dueAtUtc: dueIn(2) }), task({ dueAtUtc: dueIn(1) })]);
    const b = trip(5, [task({ dueAtUtc: dueIn(0.5) })]);
    const m = buildRunBoard([a, b], [task({ dueAtUtc: dueIn(0.2), title: 'Office thing' })], NOW, 14);
    const all = [...m.groups['due-today'], ...m.groups['next-48']];
    const clusters = clusterRunTasks(all);
    expect(clusters).toHaveLength(3);
    expect(clusters[0].tripNumber).toBe(b.tripNumber); // earliest due
    expect(clusters[1].tripNumber).toBe(a.tripNumber);
    expect(clusters[2].office).toBe(true); // office last despite being urgent
    for (const c of clusters) {
      expect(c.tasks.map(x => x.dueMs)).toEqual([...c.tasks.map(x => x.dueMs)].sort((x, y) => x - y));
    }
  });
});
