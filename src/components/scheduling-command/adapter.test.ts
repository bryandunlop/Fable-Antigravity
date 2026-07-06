import { describe, it, expect } from 'vitest';
import { routeOf, boardTripOf, clientLabelOf, toBoardTask } from './adapter';
import type { TripRecord, TripLegRecord } from '../../scheduling/store/types';
import type { TaskInstance } from '../../scheduling/engine';

const leg = (seq: number, dep: string, arr: string, depUtc: string): TripLegRecord =>
  ({ id: `l${seq}`, sequence: seq, departureIcao: dep, arrivalIcao: arr, departureTimeUtc: depUtc, paxCount: 3 });

const trip = (p: Partial<TripRecord> = {}): TripRecord => ({
  id: 'demo-trip-domestic', tripNumber: 'T-2026-0714', sourceSystem: 'manual', sourceTripRef: null,
  tail: 'N2PG', aircraftType: 'G650ER', tripType: 'domestic', priority: 'standard', status: 'planning',
  startDate: '2026-07-05T12:00:00.000Z', endDate: '2026-07-07T22:00:00.000Z',
  legs: [leg(1, 'KLUK', 'KTEB', '2026-07-05T12:00:00.000Z')],
  createdBy: 'scheduler', createdAtUtc: '2026-07-01T00:00:00.000Z', ...p,
});

const instance = (p: Partial<TaskInstance> = {}): TaskInstance => ({
  id: `i-${Math.abs(JSON.stringify(p).split('').reduce((a, c) => a + c.charCodeAt(0), 0))}-${p.title ?? 'x'}`,
  templateId: 'domestic-per-trip', templateVersion: 1, taskDefId: 'td', title: 'Task', category: 'ops',
  order: 1, tripId: 'demo-trip-domestic', runDate: null, status: 'open', ownerRole: 'scheduling',
  dueAtUtc: '2026-07-04T12:00:00.000Z', requiresAck: false, ackState: 'n_a', auditTrail: [], ...p,
});

describe('routeOf', () => {
  it('chains leg ICAOs, collapsing the shared arrival/departure airport', () => {
    const legs = [
      leg(1, 'KLUK', 'KMVY', '2026-07-05T12:00:00.000Z'),
      leg(2, 'KMVY', 'KLUK', '2026-07-06T12:00:00.000Z'),
    ];
    expect(routeOf(legs)).toBe('KLUK → KMVY → KLUK');
  });

  it('sorts by sequence and handles a single leg', () => {
    expect(routeOf([leg(1, 'KTEB', 'EGLL', '2026-07-05T12:00:00.000Z')])).toBe('KTEB → EGLL');
  });
});

describe('clientLabelOf', () => {
  it('labels by trip type until the myairops client field exists (Phase 2)', () => {
    expect(clientLabelOf(trip())).toBe('Domestic');
    expect(clientLabelOf(trip({ tripType: 'international' }))).toBe('International');
    expect(clientLabelOf(trip({ tripType: 'dca_dassp' }))).toBe('DCA / DASSP');
    expect(clientLabelOf(trip({ priority: 'vip' }))).toBe('VIP · Domestic');
  });
});

describe('boardTripOf', () => {
  it('derives readiness score and duration from real instances and dates', () => {
    const tasks = [
      instance({ status: 'done', title: 'A' }),
      instance({ status: 'done', title: 'B' }),
      instance({ status: 'open', title: 'C' }),
      instance({ status: 'n_a', title: 'D' }),
    ];
    const b = boardTripOf(trip(), tasks);
    expect(b.readinessScore).toBe(75); // 3 of 4 settled (done + n_a)
    expect(b.durationDays).toBe(3);    // Jul 5 12:00 → Jul 7 22:00 → ceil(2.42) = 3
    expect(b.criticalBlocker).toBeUndefined();
    expect(b.isInternational).toBe(false);
    expect(b.route).toBe('KLUK → KTEB');
    expect(b.departureDate).toBe('2026-07-05T12:00:00.000Z'); // earliest leg departure
    expect(b.aircraft).toBe('N2PG');
    expect(b.tripType).toBe('domestic');
  });

  it('surfaces the blocked task title (with note) as the critical blocker', () => {
    const tasks = [
      instance({ status: 'blocked', title: 'Confirm fuel release', notes: 'FBO waitlisted' }),
      instance({ status: 'open', title: 'B' }),
    ];
    const b = boardTripOf(trip(), tasks);
    expect(b.criticalBlocker).toBe('Confirm fuel release — FBO waitlisted');
  });

  it('a trip with no instances reads fully ready (engine semantics)', () => {
    const b = boardTripOf(trip(), []);
    expect(b.readinessScore).toBe(100);
    expect(b.criticalBlocker).toBeUndefined();
  });

  it('falls back to startDate when a trip has no legs and keeps duration >= 1', () => {
    const b = boardTripOf(trip({ legs: [], startDate: '2026-07-05T12:00:00.000Z', endDate: '2026-07-05T14:00:00.000Z' }), []);
    expect(b.departureDate).toBe('2026-07-05T12:00:00.000Z');
    expect(b.durationDays).toBe(1);
  });
});

describe('toBoardTask', () => {
  it('projects the instance fields the boards need', () => {
    const t = toBoardTask(instance({ status: 'in_progress', requiresAck: true, ackState: 'pending', notes: 'called FBO' }));
    expect(t).toMatchObject({ status: 'in_progress', requiresAck: true, ackState: 'pending', notes: 'called FBO' });
    expect(t.dueAtUtc).toBe('2026-07-04T12:00:00.000Z');
  });
});
