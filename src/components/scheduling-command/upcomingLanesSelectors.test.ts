import { describe, it, expect } from 'vitest';
import { buildUpcomingBoard } from './upcomingLanesSelectors';
import type { BoardTrip, BoardTask } from './adapter';

const DAY = 86400000;
const NOW = new Date(2026, 6, 3, 12, 0, 0, 0).getTime(); // noon, fixed

let seq = 0;
function task(p: Partial<BoardTask> = {}): BoardTask {
  return {
    id: `i${seq++}`, title: 'Permit', category: 'ops', order: 1, status: 'open',
    ownerRole: 'scheduling', dueAtUtc: new Date(NOW).toISOString(),
    requiresAck: false, ackState: 'n_a', ...p,
  };
}
function trip(depDaysFromNow: number, tasks: BoardTask[], p: Partial<BoardTrip> = {}): BoardTrip {
  return {
    id: `t${seq++}`, tripNumber: `T-${seq}`, client: 'Domestic', aircraft: 'N2PG',
    aircraftType: 'G650ER', route: 'KTEB → EGGW',
    departureDate: new Date(NOW + depDaysFromNow * DAY).toISOString(), durationDays: 2,
    readinessScore: 50, isInternational: false, tripType: 'domestic',
    priority: 'standard', tripStatus: 'planning', tasks, ...p,
  };
}
const dueIn = (days: number) => new Date(NOW + days * DAY).toISOString();

describe('buildUpcomingBoard', () => {
  it('assigns a trip to the lane of its soonest upcoming due task', () => {
    const t = trip(20, [task({ dueAtUtc: dueIn(3) }), task({ dueAtUtc: dueIn(10) })]);
    const m = buildUpcomingBoard([t], NOW, 30);
    expect(m.lanes['this-week']).toHaveLength(1);
    expect(m.lanes['this-week'][0].soonest?.dueLabel).toMatch(/due/i);
    expect(m.lanes['this-week'][0].countInWindow).toBe(1); // only the +3d task is within this-week
    expect(m.lanes['next-week']).toHaveLength(0);
  });

  it('honours lane boundaries at exactly 7 / 14 / 30 days', () => {
    const wk = trip(40, [task({ dueAtUtc: dueIn(7) })]);
    const next = trip(41, [task({ dueAtUtc: dueIn(8) })]);
    const later = trip(42, [task({ dueAtUtc: dueIn(30) })]);
    const beyond = trip(43, [task({ dueAtUtc: dueIn(31) })]);
    const m = buildUpcomingBoard([wk, next, later, beyond], NOW, 60);
    expect(m.lanes['this-week'].map(u => u.trip.id)).toEqual([wk.id]);
    expect(m.lanes['next-week'].map(u => u.trip.id)).toEqual([next.id]);
    expect(m.lanes['later'].map(u => u.trip.id)).toEqual([later.id]);
    // +31d is past the 30d 'later' edge → not shown in any lane
    const all = [...m.lanes['this-week'], ...m.lanes['next-week'], ...m.lanes['later']];
    expect(all.find(u => u.trip.id === beyond.id)).toBeUndefined();
  });

  it('demotes overdue tasks to the strip (oldest first) and never into a lane', () => {
    const a = trip(10, [task({ dueAtUtc: dueIn(-1) })]);
    const b = trip(12, [task({ dueAtUtc: dueIn(-4) }), task({ dueAtUtc: dueIn(-2) })]);
    const m = buildUpcomingBoard([a, b], NOW, 30);
    expect(m.overdue.map(o => o.tripId)).toEqual([b.id, a.id]); // b is 4d overdue → first
    expect(m.overdue[0].overdueCount).toBe(2);
    expect(m.overdue[0].dueLabel).toBe('Overdue 4d');
    expect(m.lanes['this-week']).toHaveLength(0);
    expect(m.lanes['next-week']).toHaveLength(0);
  });

  it('an overdue-only trip appears in the strip but not as a quiet lane card', () => {
    const t = trip(9, [task({ dueAtUtc: dueIn(-1) })]);
    const m = buildUpcomingBoard([t], NOW, 30);
    expect(m.overdue).toHaveLength(1);
    const all = [...m.lanes['this-week'], ...m.lanes['next-week'], ...m.lanes['later']];
    expect(all).toHaveLength(0);
  });

  it('a trip with nothing pending shows as a quiet card laned by departure, after loud cards', () => {
    const loud = trip(6, [task({ dueAtUtc: dueIn(2) })]);          // this-week by work
    const quiet = trip(4, [task({ status: 'done', dueAtUtc: dueIn(1) })]); // departs in 4d, nothing due
    const m = buildUpcomingBoard([quiet, loud], NOW, 30);
    expect(m.lanes['this-week'].map(u => u.trip.id)).toEqual([loud.id, quiet.id]); // loud before quiet
    expect(m.lanes['this-week'][1].quiet).toBe(true);
    expect(m.lanes['this-week'][1].soonest).toBeUndefined();
  });

  it('excludes settled (done/n_a) and departed trips, and tasks with no due date', () => {
    const departed = trip(-1, [task({ dueAtUtc: dueIn(0) })]);
    const t = trip(5, [
      task({ status: 'done', dueAtUtc: dueIn(1) }),
      task({ status: 'n_a', dueAtUtc: dueIn(1) }),
      task({ dueAtUtc: 'not-a-date' }),
      task({ status: 'in_progress', dueAtUtc: dueIn(2) }),
    ]);
    const m = buildUpcomingBoard([departed, t], NOW, 30);
    expect(m.lanes['this-week']).toHaveLength(1);
    expect(m.lanes['this-week'][0].soonest?.key).toBe(t.tasks[3].id); // the only valid open+due task
    expect(m.totalTrips).toBe(1); // departed excluded
  });

  it('caps the far edge at the active horizon', () => {
    const t = trip(40, [task({ dueAtUtc: dueIn(20) })]);
    const m = buildUpcomingBoard([t], NOW, 14); // laterEnd = min(30,14) = 14d → +20d dropped
    const all = [...m.lanes['this-week'], ...m.lanes['next-week'], ...m.lanes['later']];
    expect(all).toHaveLength(0);
  });

  it('sorts loud cards within a lane by soonest due', () => {
    const a = trip(20, [task({ dueAtUtc: dueIn(5) })]);
    const b = trip(21, [task({ dueAtUtc: dueIn(2) })]);
    const m = buildUpcomingBoard([a, b], NOW, 30);
    expect(m.lanes['this-week'].map(u => u.trip.id)).toEqual([b.id, a.id]);
  });

  it('assigns a fixed-due-date trip to the same lane regardless of time-of-day', () => {
    const early = new Date(2026, 6, 3, 0, 5, 0, 0).getTime();   // 00:05
    const late = new Date(2026, 6, 3, 23, 55, 0, 0).getTime();  // 23:55, same calendar day
    const dueFixed = new Date(2026, 6, 10, 18, 0, 0, 0).toISOString(); // 6pm on day+7
    const laneOf = (nowMs: number) => {
      const m = buildUpcomingBoard([trip(20, [task({ dueAtUtc: dueFixed })])], nowMs, 30);
      return (['this-week', 'next-week', 'later'] as const).find(l => m.lanes[l].length > 0);
    };
    expect(laneOf(early)).toBe('this-week');
    expect(laneOf(late)).toBe('this-week');
    expect(laneOf(early)).toBe(laneOf(late));
  });

  it('a trip with both overdue and upcoming tasks appears in the strip and a lane', () => {
    const t = trip(15, [task({ dueAtUtc: dueIn(-1) }), task({ dueAtUtc: dueIn(3) })]);
    const m = buildUpcomingBoard([t], NOW, 30);
    expect(m.overdue.map(o => o.tripId)).toContain(t.id);
    expect(m.lanes['this-week'].map(u => u.trip.id)).toContain(t.id);
  });
});
