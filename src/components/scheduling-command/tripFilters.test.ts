import { describe, it, expect } from 'vitest';
import { matchesTripTypeFilter, hasOpenWork, filterCounts } from './tripFilters';
import type { BoardTrip, BoardTask } from './adapter';

const NOW = new Date(2026, 6, 3, 12, 0).getTime();
let seq = 0;
function task(p: Partial<BoardTask> = {}): BoardTask {
  return {
    id: `i${seq++}`, title: 'Permit', category: 'ops', order: 1, status: 'open',
    ownerRole: 'scheduling', dueAtUtc: new Date(NOW).toISOString(),
    requiresAck: false, ackState: 'n_a', ...p,
  };
}
function trip(p: Partial<BoardTrip> = {}): BoardTrip {
  return {
    id: `t${seq++}`, tripNumber: `T-${seq}`, client: 'Domestic', aircraft: 'N2PG',
    aircraftType: 'G650ER', route: 'KTEB → EGGW',
    departureDate: new Date(NOW + 5 * 86400000).toISOString(), durationDays: 2,
    readinessScore: 50, isInternational: false, tripType: 'domestic',
    priority: 'standard', tripStatus: 'planning', tasks: [], ...p,
  };
}

describe('matchesTripTypeFilter', () => {
  it('empty selection shows all', () => {
    expect(matchesTripTypeFilter('domestic', new Set())).toBe(true);
  });
});

describe('hasOpenWork — the work-ahead predicate (D87 amendment)', () => {
  it('true when any task is open, regardless of due date', () => {
    const farFuture = task({ dueAtUtc: new Date(NOW + 20 * 86400000).toISOString() });
    expect(hasOpenWork(trip({ tasks: [farFuture] }))).toBe(true);
  });
  it('true when blocked even if every task is settled', () => {
    expect(hasOpenWork(trip({ tasks: [task({ status: 'done' })], criticalBlocker: 'permit' }))).toBe(true);
  });
  it('false when everything is done or n_a — the trip is cleared', () => {
    expect(hasOpenWork(trip({ tasks: [task({ status: 'done' }), task({ status: 'n_a' })] }))).toBe(false);
  });
  it('in_progress and blocked task statuses count as open', () => {
    expect(hasOpenWork(trip({ tasks: [task({ status: 'in_progress' })] }))).toBe(true);
    expect(hasOpenWork(trip({ tasks: [task({ status: 'blocked' })] }))).toBe(true);
  });
});

describe('filterCounts — informed filtering, not exploratory', () => {
  it('counts trips per tail and per type', () => {
    const trips = [
      trip({ aircraft: 'N2PG', tripType: 'domestic' }),
      trip({ aircraft: 'N2PG', tripType: 'international' }),
      trip({ aircraft: 'N6PG', tripType: 'dca_dassp' }),
    ];
    const c = filterCounts(trips);
    expect(c.byTail.get('N2PG')).toBe(2);
    expect(c.byTail.get('N6PG')).toBe(1);
    expect(c.byType.get('international')).toBe(1);
    expect(c.byType.get('dca_dassp')).toBe(1);
  });
});
