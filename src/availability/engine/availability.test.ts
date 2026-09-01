import { describe, expect, it } from 'vitest';
import type { CrewRecord } from '../../components/crew/crewRecords';
import type { TripRecord } from '../../scheduling/store/types';
import type { MaintenanceDowntimeBlock, SchedulerOverlay } from '../types';
import { allConflicts, buildFleetAvailability, firstAvailableSlot, tailDayStats, type AvailabilityInput } from './availability';

const NOW = '2026-09-01T12:00:00.000Z';
const TAILS = [{ tail: 'N1PG', type: 'G650ER' }];

function pilot(id: string, role: CrewRecord['role']): CrewRecord {
  return {
    id, name: `Pilot ${id}`, role,
    dutyHoursUsed: 0, dutyLimitHours: 14,
    flightHours30d: 10, flightHoursLimit30d: 100,
    currencyExpiresUtc: '2027-01-01T00:00:00.000Z',
    medicalExpiresUtc: '2027-01-01T00:00:00.000Z',
    trainingDueUtc: '2027-01-01T00:00:00.000Z',
  };
}

/** Enough crew that no day is crew-blocked unless a test asks for it. */
const ROSTER = [pilot('P1', 'PIC'), pilot('P2', 'PIC'), pilot('P3', 'PIC'), pilot('S1', 'SIC'), pilot('S2', 'SIC'), pilot('S3', 'SIC')];

function trip(over: Partial<TripRecord> = {}): TripRecord {
  return {
    id: 't1', tripNumber: 'TRP-001', sourceSystem: 'manual', sourceTripRef: null,
    tail: 'N1PG', aircraftType: 'G650ER', tripType: 'domestic', priority: 'standard',
    status: 'confirmed',
    startDate: '2026-09-03T00:00:00.000Z', endDate: '2026-09-04T00:00:00.000Z',
    legs: [{ id: 'l1', sequence: 1, departureIcao: 'KCVG', arrivalIcao: 'KTEB', departureTimeUtc: '2026-09-03T14:00:00.000Z', paxCount: 4 }],
    createdBy: 'test', createdAtUtc: NOW,
    ...over,
  };
}

function block(over: Partial<MaintenanceDowntimeBlock> = {}): MaintenanceDowntimeBlock {
  return {
    id: 'mx-1', tail: 'N1PG', maintenanceType: 'Scheduled inspection', category: 'Inspection',
    description: 'chip detector inspection', airportIcao: 'KLUK',
    vendorName: 'Gulfstream Savannah', woNumber: 'WO-4471',
    scheduledStartUtc: '2026-09-03T08:00:00.000Z', scheduledEndUtc: '2026-09-05T18:00:00.000Z',
    actualStartUtc: null, actualEndUtc: null, cancelled: false, released: false,
    createdBy: 'USR005', createdAtUtc: NOW, modifiedBy: null, modifiedAtUtc: null,
    source: 'local', sourceRef: null,
    ...over,
  };
}

function hold(over: Partial<SchedulerOverlay> = {}): SchedulerOverlay {
  return {
    id: 'ov-1', kind: 'hold', tail: 'N1PG',
    fromDateUtc: '2026-09-03', toDateUtc: '2026-09-04',
    reasonNote: 'Board week — CEO travel likely',
    publicLabel: 'Held by scheduling — board week',
    createdBy: 'Dana Whitfield', createdByRole: 'scheduling', createdAtUtc: '2026-09-01T09:00:00.000Z',
    ...over,
  };
}

function input(over: Partial<AvailabilityInput> = {}): AvailabilityInput {
  return {
    tails: TAILS, trips: [], downtime: [], crewRoster: ROSTER, crewCoverage: [],
    overlays: [], tailStatus: {}, tailHeadline: {}, tripAlerts: [],
    ...over,
  };
}

function cellOn(dateUtc: string, over: Partial<AvailabilityInput> = {}) {
  const fleet = buildFleetAvailability(input(over), NOW, 7);
  const cell = fleet.rows[0].cells.find(c => c.dateUtc === dateUtc);
  expect(cell, `no cell for ${dateUtc}`).toBeDefined();
  return cell!;
}

describe('the ladder, rank by rank', () => {
  it('rank 5 — nothing blocking is available', () => {
    const c = cellOn('2026-09-03');
    expect(c.state).toBe('available');
    expect(c.reason.category).toBe('none');
  });

  it('rank 0 — a downtime block is maintenance, and carries the ETR', () => {
    const c = cellOn('2026-09-03', { downtime: [block()] });
    expect(c.state).toBe('unavailable');
    expect(c.reason.category).toBe('maintenance');
    expect(c.reason.rank).toBe(0);
    expect(c.reason.untilUtc).toBe('2026-09-05T18:00:00.000Z');
  });

  it('rank 1 — RED with no block is maintenance with NO return date (LG-308)', () => {
    const c = cellOn('2026-09-03', { tailStatus: { N1PG: 'RED' }, tailHeadline: { N1PG: 'gear actuator' } });
    expect(c.state).toBe('unavailable');
    expect(c.reason.category).toBe('maintenance');
    expect(c.reason.rank).toBe(1);
    expect(c.reason.untilUtc).toBeNull();
  });

  it('rank 2 — a trip commits the tail for every day it spans', () => {
    const over = { trips: [trip()] };
    expect(cellOn('2026-09-03', over).state).toBe('committed');
    expect(cellOn('2026-09-04', over).state).toBe('committed');
    expect(cellOn('2026-09-05', over).state).toBe('available');
  });

  it('rank 3 — a hold on an otherwise free day reads held', () => {
    const c = cellOn('2026-09-03', { overlays: [hold()] });
    expect(c.state).toBe('held');
    expect(c.reason.category).toBe('held');
    expect(c.overlay?.by).toBe('Dana Whitfield');
  });

  it('rank 4 — no formable crew reads no-crew', () => {
    const c = cellOn('2026-09-03', { crewRoster: [pilot('P1', 'PIC')] });
    expect(c.state).toBe('unavailable');
    expect(c.reason.category).toBe('no-crew');
  });
});

describe('the ladder, pair by pair — first match wins', () => {
  it('block (0) beats RED-without-block (1)', () => {
    const c = cellOn('2026-09-03', { downtime: [block()], tailStatus: { N1PG: 'RED' } });
    expect(c.reason.rank).toBe(0);
    expect(c.reason.untilUtc).not.toBeNull();
    expect(c.reasons.some(r => r.rank === 1)).toBe(false);
  });

  it('block (0) beats a trip (2), and the collision becomes a conflict not a verdict', () => {
    const c = cellOn('2026-09-03', { downtime: [block()], trips: [trip()] });
    expect(c.reason.category).toBe('maintenance');
    expect(c.state).toBe('unavailable');
    expect(c.conflicts.map(x => x.kind)).toContain('trip-in-downtime');
  });

  it('RED-without-block (1) beats a trip (2)', () => {
    const c = cellOn('2026-09-03', { tailStatus: { N1PG: 'RED' }, trips: [trip()] });
    expect(c.reason.rank).toBe(1);
    expect(c.state).toBe('unavailable');
  });

  it('a trip (2) beats a hold (3) — a hold never masks a real commitment', () => {
    const c = cellOn('2026-09-03', { trips: [trip()], overlays: [hold()] });
    expect(c.state).toBe('committed');
    expect(c.conflicts.map(x => x.kind)).toContain('hold-over-confirmed-trip');
  });

  it('a trip (2) beats no-crew (4) — the flying trip already has its crew', () => {
    const c = cellOn('2026-09-03', { trips: [trip()], crewRoster: [pilot('P1', 'PIC')] });
    expect(c.state).toBe('committed');
  });

  it('a hold (3) beats no-crew (4)', () => {
    const c = cellOn('2026-09-03', { overlays: [hold()], crewRoster: [pilot('P1', 'PIC')] });
    expect(c.state).toBe('held');
  });

  it('a block (0) beats a hold (3) — a hold cannot mask maintenance', () => {
    const c = cellOn('2026-09-03', { downtime: [block()], overlays: [hold()] });
    expect(c.reason.category).toBe('maintenance');
    expect(c.state).toBe('unavailable');
  });
});

describe('the release cap — the safety line', () => {
  const release = (over: Partial<SchedulerOverlay> = {}): SchedulerOverlay => ({
    ...hold(), id: 'ov-rel', kind: 'release', reasonNote: 'Crew confirmed available',
    publicLabel: 'Released', createdAtUtc: '2026-09-01T10:00:00.000Z', ...over,
  });

  it('clears no-crew', () => {
    const c = cellOn('2026-09-03', { crewRoster: [pilot('P1', 'PIC')], overlays: [release()] });
    expect(c.state).toBe('available');
  });

  it('clears a held day', () => {
    const c = cellOn('2026-09-03', { overlays: [hold(), release({ supersedesOverlayId: 'ov-1' })] });
    expect(c.state).toBe('available');
  });

  it('can NEVER clear a downtime block', () => {
    const c = cellOn('2026-09-03', { downtime: [block()], overlays: [release()] });
    expect(c.state).toBe('unavailable');
    expect(c.reason.category).toBe('maintenance');
  });

  it('can NEVER clear a RED tail with no block', () => {
    const c = cellOn('2026-09-03', { tailStatus: { N1PG: 'RED' }, overlays: [release()] });
    expect(c.state).toBe('unavailable');
    expect(c.reason.category).toBe('maintenance');
  });

  it('drops to the next reason rather than to available', () => {
    const c = cellOn('2026-09-03', {
      trips: [trip()], crewRoster: [pilot('P1', 'PIC')], overlays: [release()],
    });
    expect(c.state).toBe('committed');
  });

  it('ignores an overlay superseded by a later one', () => {
    const c = cellOn('2026-09-03', {
      overlays: [hold(), { ...hold(), id: 'ov-2', kind: 'release', supersedesOverlayId: 'ov-1', createdAtUtc: '2026-09-01T10:00:00.000Z' }],
    });
    expect(c.state).toBe('available');
  });

  it('ignores a dismissal row entirely', () => {
    const c = cellOn('2026-09-03', { overlays: [{ ...hold(), id: 'ov-d', kind: 'dismissal' }] });
    expect(c.state).toBe('available');
  });
});

describe('conflicts are collected, never promoted to verdicts', () => {
  it('surfaces a RED_AT_ETD trip alert on the departure day', () => {
    const c = cellOn('2026-09-03', {
      trips: [trip()],
      tripAlerts: [{
        kind: 'RED_AT_ETD', severity: 'red', tripId: 't1', tripNumber: 'TRP-001', tail: 'N1PG',
        etdUtc: '2026-09-03T14:00:00.000Z', detail: 'RED at ETD — open gear defect',
      }],
    });
    expect(c.state).toBe('committed');
    expect(c.reason.category).toBe('committed');
    expect(c.conflicts.map(x => x.kind)).toContain('trip-on-red-tail');
  });

  it('never lets an alert detail become the winning reason', () => {
    const c = cellOn('2026-09-03', {
      trips: [trip()],
      tripAlerts: [{
        kind: 'RED_AT_ETD', severity: 'red', tripId: 't1', tripNumber: 'TRP-001', tail: 'N1PG',
        etdUtc: '2026-09-03T14:00:00.000Z', detail: 'SECRETDEFECTTEXT',
      }],
    });
    expect(JSON.stringify(c.reason)).not.toContain('SECRETDEFECTTEXT');
  });

  it('allConflicts flattens the whole grid', () => {
    const fleet = buildFleetAvailability(input({ downtime: [block()], trips: [trip()] }), NOW, 7);
    expect(allConflicts(fleet).length).toBeGreaterThan(0);
  });
});

describe('occupancy behaviours ported from execSelectors (regression)', () => {
  it('labels a multi-leg day first-departure → last-arrival', () => {
    const multi = trip({
      legs: [
        { id: 'l1', sequence: 1, departureIcao: 'KCVG', arrivalIcao: 'KTEB', departureTimeUtc: '2026-09-03T14:00:00.000Z', paxCount: 4 },
        { id: 'l2', sequence: 2, departureIcao: 'KTEB', arrivalIcao: 'KBOS', departureTimeUtc: '2026-09-03T19:00:00.000Z', paxCount: 4 },
      ],
    });
    expect(cellOn('2026-09-03', { trips: [multi] }).reason.detail).toContain('KCVG → KBOS');
  });

  it('shows a spanned day with no departure as away, not as a route', () => {
    expect(cellOn('2026-09-04', { trips: [trip()] }).reason.detail).toContain('away');
  });

  it('clips a trip that began before the window without losing its in-window days', () => {
    const early = trip({ startDate: '2026-08-28T00:00:00.000Z', endDate: '2026-09-02T00:00:00.000Z' });
    expect(cellOn('2026-09-01', { trips: [early] }).state).toBe('committed');
    expect(cellOn('2026-09-02', { trips: [early] }).state).toBe('committed');
    expect(cellOn('2026-09-03', { trips: [early] }).state).toBe('available');
  });

  it('keeps the earlier-starting trip when two overlap one tail-day', () => {
    const first = trip({ id: 'early', tripNumber: 'TRP-EARLY', startDate: '2026-09-02T00:00:00.000Z', endDate: '2026-09-04T00:00:00.000Z', legs: [] });
    const second = trip({ id: 'late', tripNumber: 'TRP-LATE' });
    expect(cellOn('2026-09-03', { trips: [second, first] }).reason.detail).toContain('TRP-EARLY');
  });

  it('AMBER stays available — dispatchable is dispatchable', () => {
    expect(cellOn('2026-09-03', { tailStatus: { N1PG: 'AMBER' } }).state).toBe('available');
  });

  it('NOT_ASSESSED stays available — only RED grounds a tail here', () => {
    expect(cellOn('2026-09-03', { tailStatus: { N1PG: 'NOT_ASSESSED' } }).state).toBe('available');
  });

  it('a mid-trip away day still holds its crew for the count', () => {
    const c = cellOn('2026-09-04', {
      trips: [trip()],
      crewRoster: [pilot('P1', 'PIC'), pilot('S1', 'SIC')],
    });
    expect(c.crew.crewsCommitted).toBe(1);
  });

  it('firstAvailableSlot returns null when every tail-day is blocked', () => {
    const blocked = buildFleetAvailability(input({ tailStatus: { N1PG: 'RED' } }), NOW, 7);
    expect(firstAvailableSlot(blocked)).toBeNull();
  });
});

describe('summaries', () => {
  it('counts only genuinely available tail-days', () => {
    const fleet = buildFleetAvailability(input({ downtime: [block()] }), NOW, 7);
    const stats = tailDayStats(fleet);
    expect(stats.totalTailDays).toBe(7);
    // 3rd, 4th, 5th are in the block window.
    expect(stats.openTailDays).toBe(4);
  });

  it('finds the earliest available slot, skipping blocked days', () => {
    const early = block({ scheduledStartUtc: '2026-09-01T00:00:00.000Z', scheduledEndUtc: '2026-09-02T23:00:00.000Z' });
    expect(firstAvailableSlot(buildFleetAvailability(input({ downtime: [early] }), NOW, 7)))
      .toEqual({ dateUtc: '2026-09-03', tail: 'N1PG' });
  });

  it('is deterministic for a pinned clock', () => {
    const args = input({ downtime: [block()], trips: [trip()], overlays: [hold()] });
    expect(buildFleetAvailability(args, NOW, 7)).toEqual(buildFleetAvailability(args, NOW, 7));
  });
});
