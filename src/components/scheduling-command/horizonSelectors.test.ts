import { describe, it, expect } from 'vitest';
import { buildHorizonBoard, officeTasksDueToday, HORIZON_BANDS } from './horizonSelectors';
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

describe('buildHorizonBoard', () => {
  it('splits Today out of the old this-week window', () => {
    const today = trip(10, [task({ dueAtUtc: new Date(NOW + 3600000).toISOString() })]); // due in 1h
    const week = trip(11, [task({ dueAtUtc: dueIn(3) })]);
    const m = buildHorizonBoard([today, week], NOW, 30);
    expect(m.bands.today.map(r => r.trip.id)).toEqual([today.id]);
    expect(m.bands['this-week'].map(r => r.trip.id)).toEqual([week.id]);
  });

  it('honours band boundaries at end-of-today / 7 / 14 / horizon days', () => {
    const today = trip(40, [task({ dueAtUtc: new Date(2026, 6, 3, 23, 0).toISOString() })]);
    const wk = trip(41, [task({ dueAtUtc: dueIn(7) })]);
    const next = trip(42, [task({ dueAtUtc: dueIn(8) })]);
    const later = trip(43, [task({ dueAtUtc: dueIn(30) })]);
    const beyond = trip(44, [task({ dueAtUtc: dueIn(31) })]);
    const m = buildHorizonBoard([today, wk, next, later, beyond], NOW, 60);
    expect(m.bands.today.map(r => r.trip.id)).toEqual([today.id]);
    expect(m.bands['this-week'].map(r => r.trip.id)).toEqual([wk.id]);
    expect(m.bands['next-week'].map(r => r.trip.id)).toEqual([next.id]);
    expect(m.bands.later.map(r => r.trip.id)).toEqual([later.id]);
    const all = HORIZON_BANDS.flatMap(b => m.bands[b]);
    expect(all.find(r => r.trip.id === beyond.id)).toBeUndefined();
  });

  it('demotes overdue tasks to the strip (oldest first), never into a band', () => {
    const a = trip(10, [task({ dueAtUtc: dueIn(-1) })]);
    const b = trip(12, [task({ dueAtUtc: dueIn(-4) }), task({ dueAtUtc: dueIn(-2) })]);
    const m = buildHorizonBoard([a, b], NOW, 30);
    expect(m.overdue.map(o => o.tripId)).toEqual([b.id, a.id]);
    expect(m.overdue[0].overdueCount).toBe(2);
    expect(m.overdue[0].dueLabel).toBe('Overdue 4d');
    expect(HORIZON_BANDS.flatMap(x => m.bands[x])).toHaveLength(0);
  });

  it('quiet trips band by departure (including Today) and sort after loud rows', () => {
    const loud = trip(6, [task({ dueAtUtc: dueIn(2) })]);
    const quietWeek = trip(4, [task({ status: 'done', dueAtUtc: dueIn(1) })]);
    const quietToday = trip(0.4, [] , { id: 'q-today' }); // departs tonight, no tasks
    const m = buildHorizonBoard([quietWeek, loud, quietToday], NOW, 30);
    expect(m.bands.today.map(r => r.trip.id)).toEqual(['q-today']);
    expect(m.bands.today[0].quiet).toBe(true);
    expect(m.bands['this-week'].map(r => r.trip.id)).toEqual([loud.id, quietWeek.id]);
    expect(m.bands['this-week'][1].quiet).toBe(true);
  });

  it('summarizes the later band per tail (loud and quiet together)', () => {
    const a = trip(20, [task({ dueAtUtc: dueIn(16) })], { aircraft: 'N1PG' });
    const b = trip(21, [task({ dueAtUtc: dueIn(17) })], { aircraft: 'N1PG' });
    const c = trip(22, [], { aircraft: 'N6PG' }); // quiet, departs in later window
    const m = buildHorizonBoard([a, b, c], NOW, 30);
    expect(m.laterByTail).toEqual([
      { tail: 'N1PG', count: 2 },
      { tail: 'N6PG', count: 1 },
    ]);
  });

  it('counts open actions inside the row band window (countInWindow)', () => {
    const t = trip(20, [task({ dueAtUtc: dueIn(2) }), task({ dueAtUtc: dueIn(5) }), task({ dueAtUtc: dueIn(12) })]);
    const m = buildHorizonBoard([t], NOW, 30);
    expect(m.bands['this-week']).toHaveLength(1);
    expect(m.bands['this-week'][0].countInWindow).toBe(2); // +2d and +5d, not +12d
  });

  it('excludes departed trips and settled/invalid tasks', () => {
    const departed = trip(-1, [task({ dueAtUtc: dueIn(0) })]);
    const t = trip(5, [
      task({ status: 'done', dueAtUtc: dueIn(1) }),
      task({ dueAtUtc: 'not-a-date' }),
      task({ status: 'in_progress', dueAtUtc: dueIn(2) }),
    ]);
    const m = buildHorizonBoard([departed, t], NOW, 30);
    expect(m.bands['this-week']).toHaveLength(1);
    expect(m.bands['this-week'][0].soonest?.key).toBe(t.tasks[2].id);
    expect(m.totalTrips).toBe(1);
  });

  it('band assignment is stable across time-of-day for a fixed due date', () => {
    const early = new Date(2026, 6, 3, 0, 5).getTime();
    const late = new Date(2026, 6, 3, 23, 55).getTime();
    const dueFixed = new Date(2026, 6, 10, 18, 0).toISOString();
    const bandOf = (nowMs: number) => {
      const m = buildHorizonBoard([trip(20, [task({ dueAtUtc: dueFixed })])], nowMs, 30);
      return HORIZON_BANDS.find(b => m.bands[b].length > 0);
    };
    expect(bandOf(early)).toBe('this-week');
    expect(bandOf(late)).toBe('this-week');
  });
});

describe('officeTasksDueToday', () => {
  it('returns open office tasks due today or overdue, soonest first, and drops settled ones', () => {
    const dueSoon = task({ dueAtUtc: new Date(NOW + 2 * 3600000).toISOString() });
    const overdue = task({ dueAtUtc: dueIn(-1) });
    const done = task({ status: 'done', dueAtUtc: new Date(NOW).toISOString() });
    const tomorrow = task({ dueAtUtc: dueIn(1.2) });
    const out = officeTasksDueToday([dueSoon, done, overdue, tomorrow], NOW);
    expect(out.map(t => t.id)).toEqual([overdue.id, dueSoon.id]);
  });
});
