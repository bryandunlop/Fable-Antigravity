import { describe, it, expect } from 'vitest';
import { nextDuePerTail, beyondWindowWeeks } from './boardBridges';
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

describe('nextDuePerTail', () => {
  it('picks the soonest open task per tail across its trips', () => {
    const a = trip(5, [task({ title: 'Catering', dueAtUtc: dueIn(2) })]);
    const b = trip(9, [task({ title: 'Fuel', dueAtUtc: dueIn(1) })]);
    const chips = nextDuePerTail([a, b], NOW);
    expect(chips.get('N2PG')?.label).toBe('Fuel · due 24h');
    expect(chips.get('N2PG')?.tripId).toBe(b.id);
  });

  it('blocked outranks overdue outranks upcoming', () => {
    const upcoming = trip(5, [task({ dueAtUtc: dueIn(1) })]);
    const overdue = trip(6, [task({ title: 'Waiver', dueAtUtc: dueIn(-1) })]);
    const blocked = trip(7, [task({ dueAtUtc: dueIn(2) })], { criticalBlocker: 'overflight permit' });
    const chips = nextDuePerTail([upcoming, overdue, blocked], NOW);
    expect(chips.get('N2PG')?.severity).toBe('blocked');
    expect(chips.get('N2PG')?.label).toBe('Blocked · overflight permit');
    const noBlocked = nextDuePerTail([upcoming, overdue], NOW);
    expect(noBlocked.get('N2PG')?.severity).toBe('overdue');
    expect(noBlocked.get('N2PG')?.label).toBe('Waiver · overdue 1d');
  });

  it('ignores departed trips and tails with nothing open', () => {
    const departed = trip(-1, [task({ dueAtUtc: dueIn(0.1) })]);
    const settled = trip(5, [task({ status: 'done' })], { aircraft: 'N6PG' });
    const chips = nextDuePerTail([departed, settled], NOW);
    expect(chips.size).toBe(0);
  });
});

describe('beyondWindowWeeks', () => {
  const windowEnd = NOW + 7 * DAY;

  it('buckets trips departing after the window into consecutive weeks', () => {
    const onBoard = trip(3, []);
    const wk1 = trip(9, [task({ title: 'Handler', dueAtUtc: dueIn(8) })]);
    const wk2 = trip(16, [], { readinessScore: 0 });
    const far = trip(40, []);
    const m = beyondWindowWeeks([onBoard, wk1, wk2, far], windowEnd, NOW, 3);
    expect(m.weeks).toHaveLength(2);
    expect(m.weeks[0].tripCount).toBe(1);
    expect(m.weeks[0].soonest?.title).toBe('Handler');
    expect(m.weeks[1].tripCount).toBe(1);
    expect(m.weeks[1].untouchedCount).toBe(1);
    expect(m.overflowCount).toBe(1); // the +40d trip is past the 3-week shelf
  });

  it('drops empty weeks and reports none when nothing is beyond', () => {
    const m = beyondWindowWeeks([trip(2, [])], windowEnd, NOW, 3);
    expect(m.weeks).toHaveLength(0);
    expect(m.overflowCount).toBe(0);
  });

  it('week soonest ignores overdue tasks (they belong to the strip, not the shelf)', () => {
    const t = trip(10, [task({ dueAtUtc: dueIn(-2) }), task({ title: 'Slots', dueAtUtc: dueIn(9) })]);
    const m = beyondWindowWeeks([t], windowEnd, NOW, 3);
    expect(m.weeks[0].soonest?.title).toBe('Slots');
  });
});
