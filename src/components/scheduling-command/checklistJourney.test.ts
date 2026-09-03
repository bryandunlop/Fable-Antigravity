import { describe, it, expect } from 'vitest';
import { buildChecklistJourney, railEntries } from './checklistJourney';
import type { TaskInstance } from '../../scheduling/engine';
import type { TripLegRecord } from '../../scheduling/store/types';

const NOW = new Date('2026-08-19T14:00:00.000Z').getTime();
const iso = (h: number) => new Date(NOW + h * 3600000).toISOString();

let seq = 0;
function inst(p: Partial<TaskInstance> = {}): TaskInstance {
  return {
    id: `i${seq++}`, templateId: 'tpl', templateVersion: 1, taskDefId: `d${seq}`,
    title: 'Task', category: 'ops', order: 1, tripId: 't1', runDate: null,
    status: 'open', ownerRole: 'scheduling', dueAtUtc: iso(24),
    requiresAck: false, ackState: 'n_a', auditTrail: [], ...p,
  } as TaskInstance;
}
function leg(p: Partial<TripLegRecord> & { id: string; sequence: number }): TripLegRecord {
  return {
    departureIcao: 'KLUK', arrivalIcao: 'KDEN',
    departureTimeUtc: iso(48), arrivalTimeUtc: iso(52), paxCount: 2, ...p,
  } as TripLegRecord;
}

describe('buildChecklistJourney', () => {
  const legs = [leg({ id: 'L1', sequence: 1 }), leg({ id: 'L2', sequence: 2, departureIcao: 'KDEN', arrivalIcao: 'KLUK', departureTimeUtc: iso(96) })];

  it('sections: whole-trip first, then legs in sequence; empty legs are skipped', () => {
    const xs = [inst({}), inst({ legId: 'L1' })]; // nothing for L2
    const j = buildChecklistJourney(legs, xs, NOW);
    expect(j.sections.map(s => s.kind)).toEqual(['trip', 'leg']);
    expect(j.sections[1].legId).toBe('L1');
  });

  it('open items sort by due; settled split into cleared vs flagged (advisory reflag)', () => {
    const a = inst({ legId: 'L1', dueAtUtc: iso(30) });
    const b = inst({ legId: 'L1', dueAtUtc: iso(10) });
    const done = inst({ legId: 'L1', status: 'done', completedAtUtc: iso(-5) });
    const flagged = inst({ legId: 'L1', status: 'done', completedAtUtc: iso(-2), reflag: { change: 'legScheduleChange' } });
    const j = buildChecklistJourney(legs, [a, b, done, flagged], NOW);
    const s = j.sections[0];
    expect(s.open.map(x => x.id)).toEqual([b.id, a.id]);
    expect(s.cleared.map(x => x.id)).toEqual([done.id]);
    expect(s.flagged.map(x => x.id)).toEqual([flagged.id]);
  });

  it('now marker: none departed → after the trip section (index 0); no trip section → -1', () => {
    const withTrip = buildChecklistJourney(legs, [inst({}), inst({ legId: 'L1' })], NOW);
    expect(withTrip.nowAfterIndex).toBe(0);
    const legOnly = buildChecklistJourney(legs, [inst({ legId: 'L1' })], NOW);
    expect(legOnly.nowAfterIndex).toBe(-1);
  });

  it('now marker: sits after the last departed leg', () => {
    const flownLegs = [leg({ id: 'L1', sequence: 1, departureTimeUtc: iso(-20) }), leg({ id: 'L2', sequence: 2, departureTimeUtc: iso(96) })];
    const j = buildChecklistJourney(flownLegs, [inst({}), inst({ legId: 'L1' }), inst({ legId: 'L2' })], NOW);
    // sections: trip(0), L1(1), L2(2) — L1 departed → marker after index 1
    expect(j.nowAfterIndex).toBe(1);
  });

  it('unknown-leg items fall back to the trip section rather than vanishing', () => {
    const j = buildChecklistJourney(legs, [inst({ legId: 'GONE' })], NOW);
    expect(j.sections[0].kind).toBe('trip');
    expect(j.sections[0].open).toHaveLength(1);
  });
});

describe('D89 review catches', () => {
  const legs2 = [leg({ id: 'L1', sequence: 1 })];
  it('a cancelled task never lands in flagged, even if a stale reflag survived', () => {
    const zombie = inst({ legId: 'L1', status: 'cancelled', reflag: { change: 'legScheduleChange' } });
    const j = buildChecklistJourney(legs2, [zombie], NOW);
    expect(j.sections[0].flagged).toHaveLength(0);
    expect(j.sections[0].cleared.map(x => x.id)).toEqual([zombie.id]);
  });
});

describe('the booking cutoffs sit on the rail (D110 slice 2)', () => {
  it('cutoff markers land in the whole-trip section in time order among the open items, and a passed one says so', () => {
    const legs = [{ id: 'leg-a', sequence: 1, departureIcao: 'KLUK', arrivalIcao: 'EGLL', departureTimeUtc: '2026-09-12T12:00:00.000Z', paxCount: 2 }];
    const item = (id: string, dueAtUtc: string) => ({
      id, templateId: 't', templateVersion: 1, taskDefId: id, title: id, category: 'ops', order: 1, tripId: 'trip-1', runDate: null,
      status: 'open' as const, ownerRole: 'scheduling', dueAtUtc, requiresAck: false, ackState: 'n_a' as const, auditTrail: [],
    });
    const j = buildChecklistJourney(legs, [item('early', '2026-09-05T12:00:00.000Z'), item('late', '2026-09-11T12:00:00.000Z')], Date.parse('2026-09-07T00:00:00.000Z'), [
      { key: 'names', label: 'Names cutoff', atUtc: '2026-09-09T13:00:00.000Z' },
      { key: 'forms', label: 'Forms cutoff', atUtc: '2026-09-01T13:00:00.000Z' },
    ]);
    const trip = j.sections.find(s => s.kind === 'trip')!;
    expect(trip.markers.map(m => `${m.key}:${m.state}`)).toEqual(['forms:passed', 'names:ahead']);
    expect(railEntries(trip).map(e => e.kind === 'item' ? e.item.id : e.marker.key)).toEqual(['forms', 'early', 'names', 'late']);
  });
  it('cutoffs alone are enough to draw the whole-trip section', () => {
    const j = buildChecklistJourney([], [], 0, [{ key: 'freeze', label: 'Freeze', atUtc: '2026-09-09T13:00:00.000Z' }]);
    expect(j.sections).toHaveLength(1);
    expect(j.sections[0].markers).toHaveLength(1);
  });
});
