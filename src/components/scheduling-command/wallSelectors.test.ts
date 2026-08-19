import { describe, it, expect } from 'vitest';
import { buildWallModel } from './wallSelectors';
import type { BoardTrip, BoardTask } from './adapter';

const DAY = 86400000;
const NOW = new Date(2026, 6, 3, 12, 0, 0, 0).getTime();

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

describe('buildWallModel', () => {
  it('lists the next departures soonest-first, capped, departed excluded', () => {
    const gone = trip(-1, []);
    const a = trip(5, []);
    const b = trip(2, []);
    const c = trip(9, []);
    const d = trip(12, []);
    const e = trip(20, []);
    const m = buildWallModel([gone, a, b, c, d, e], NOW, 4);
    expect(m.departingNext.map(x => x.trip.id)).toEqual([b.id, a.id, c.id, d.id]);
    expect(m.totalTrips).toBe(5);
  });

  it('attention: blocked rows first (by departure), then overdue (worst first)', () => {
    const od = trip(8, [task({ title: 'Waiver', dueAtUtc: dueIn(-1) })]);
    const odWorse = trip(9, [task({ title: 'Customs', dueAtUtc: dueIn(-3) })]);
    const bl = trip(4, [task({ dueAtUtc: dueIn(1) })], { criticalBlocker: 'Overflight permit denied' });
    const m = buildWallModel([od, odWorse, bl], NOW);
    expect(m.attention.map(r => r.kind)).toEqual(['blocked', 'overdue', 'overdue']);
    expect(m.attention[0].title).toContain('Overflight permit denied');
    expect(m.attention[1].title).toContain('Customs · 3d overdue');
  });

  it('quietCount = future trips with nothing blocked, overdue, or due today', () => {
    const quiet = trip(6, [task({ dueAtUtc: dueIn(3) })]);
    const dueToday = trip(7, [task({ dueAtUtc: new Date(NOW + 3600000).toISOString() })]);
    const blocked = trip(8, [], { criticalBlocker: 'x' });
    const m = buildWallModel([quiet, dueToday, blocked], NOW);
    expect(m.quietCount).toBe(1);
  });
});
