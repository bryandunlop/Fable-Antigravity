import { describe, expect, it } from 'vitest';
import type { CrewDayCoverage, CrewRecord } from '../../components/crew/crewRecords';
import type { TripRecord } from '../../scheduling/store/types';
import { crewCapacityByDay } from './crewCoverage';

const NOW = '2026-09-01T12:00:00.000Z';

function pilot(id: string, role: CrewRecord['role'], over: Partial<CrewRecord> = {}): CrewRecord {
  return {
    id,
    name: `Pilot ${id}`,
    role,
    dutyHoursUsed: 2,
    dutyLimitHours: 14,
    flightHours30d: 40,
    flightHoursLimit30d: 100,
    currencyExpiresUtc: '2027-01-01T00:00:00.000Z',
    medicalExpiresUtc: '2027-01-01T00:00:00.000Z',
    trainingDueUtc: '2027-01-01T00:00:00.000Z',
    ...over,
  };
}

function trip(id: string, tail: string, startDate: string, endDate: string): TripRecord {
  return {
    id,
    tripNumber: id.toUpperCase(),
    sourceSystem: 'manual',
    sourceTripRef: null,
    tail,
    aircraftType: 'G650ER',
    tripType: 'domestic',
    priority: 'standard',
    status: 'confirmed',
    startDate,
    endDate,
    legs: [],
    createdBy: 'test',
    createdAtUtc: NOW,
  };
}

const ROSTER = [
  pilot('P1', 'PIC'), pilot('P2', 'PIC'), pilot('P3', 'PIC'),
  pilot('S1', 'SIC'), pilot('S2', 'SIC'), pilot('S3', 'SIC'),
  pilot('F1', 'FA'),
];

function capacityOn(dateUtc: string, coverage: CrewDayCoverage[] = [], trips: TripRecord[] = [], roster = ROSTER) {
  const days = crewCapacityByDay(roster, coverage, trips, NOW, 5);
  const found = days.find(d => d.dateUtc === dateUtc);
  expect(found, `no capacity row for ${dateUtc}`).toBeDefined();
  return found!;
}

describe('crewCapacityByDay', () => {
  it('forms one crew per PIC/SIC pair', () => {
    const c = capacityOn('2026-09-01');
    expect(c.picAvailable).toBe(3);
    expect(c.sicAvailable).toBe(3);
    expect(c.crewsFormable).toBe(3);
  });

  it('is limited by the scarcer seat — 3 PIC and 1 SIC forms one crew, not two', () => {
    const c = capacityOn('2026-09-01', [], [], [
      pilot('P1', 'PIC'), pilot('P2', 'PIC'), pilot('P3', 'PIC'), pilot('S1', 'SIC'),
    ]);
    expect(c.crewsFormable).toBe(1);
  });

  it('ignores flight attendants when forming crews', () => {
    const c = capacityOn('2026-09-01', [], [], [pilot('F1', 'FA'), pilot('F2', 'FA')]);
    expect(c.crewsFormable).toBe(0);
  });

  it('drops a pilot on leave for that day only', () => {
    const coverage: CrewDayCoverage[] = [{ crewId: 'P1', dateUtc: '2026-09-02', status: 'leave' }];
    expect(capacityOn('2026-09-02', coverage).picAvailable).toBe(2);
    expect(capacityOn('2026-09-03', coverage).picAvailable).toBe(3);
  });

  it('drops a pilot in training and one on rest', () => {
    const coverage: CrewDayCoverage[] = [
      { crewId: 'P1', dateUtc: '2026-09-02', status: 'training' },
      { crewId: 'P2', dateUtc: '2026-09-02', status: 'rest' },
    ];
    expect(capacityOn('2026-09-02', coverage).picAvailable).toBe(1);
  });

  it('drops a pilot whose duty is exhausted', () => {
    const roster = [pilot('P1', 'PIC', { dutyHoursUsed: 14, dutyLimitHours: 14 }), pilot('S1', 'SIC')];
    expect(capacityOn('2026-09-01', [], [], roster).picAvailable).toBe(0);
  });

  it('drops a pilot whose medical has lapsed by that date', () => {
    const roster = [pilot('P1', 'PIC', { medicalExpiresUtc: '2026-09-02T00:00:00.000Z' }), pilot('S1', 'SIC')];
    expect(capacityOn('2026-09-01', [], [], roster).picAvailable).toBe(1);
    expect(capacityOn('2026-09-03', [], [], roster).picAvailable).toBe(0);
  });

  it('drops a pilot whose currency has lapsed by that date', () => {
    const roster = [pilot('P1', 'PIC', { currencyExpiresUtc: '2026-09-02T00:00:00.000Z' }), pilot('S1', 'SIC')];
    expect(capacityOn('2026-09-03', [], [], roster).picAvailable).toBe(0);
  });

  it('treats a null medical as no constraint — FAs carry none in the demo', () => {
    const roster = [pilot('P1', 'PIC', { medicalExpiresUtc: null }), pilot('S1', 'SIC')];
    expect(capacityOn('2026-09-03', [], [], roster).picAvailable).toBe(1);
  });

  it('counts a trip as committing a crew for every day it spans', () => {
    const trips = [trip('t1', 'N1PG', '2026-09-02T00:00:00.000Z', '2026-09-04T00:00:00.000Z')];
    expect(capacityOn('2026-09-01', [], trips).crewsCommitted).toBe(0);
    for (const d of ['2026-09-02', '2026-09-03', '2026-09-04']) {
      expect(capacityOn(d, [], trips).crewsCommitted).toBe(1);
    }
    expect(capacityOn('2026-09-05', [], trips).crewsCommitted).toBe(0);
  });

  it('ignores cancelled and completed trips — they make no crew demand', () => {
    const trips = [
      { ...trip('t1', 'N1PG', '2026-09-02T00:00:00.000Z', '2026-09-02T00:00:00.000Z'), status: 'cancelled' as const },
      { ...trip('t2', 'N2PG', '2026-09-02T00:00:00.000Z', '2026-09-02T00:00:00.000Z'), status: 'completed' as const },
    ];
    expect(capacityOn('2026-09-02', [], trips).crewsCommitted).toBe(0);
  });

  it('clamps crewsFree at zero and flags over-commitment', () => {
    const roster = [pilot('P1', 'PIC'), pilot('S1', 'SIC')];
    const trips = [
      trip('t1', 'N1PG', '2026-09-02T00:00:00.000Z', '2026-09-02T00:00:00.000Z'),
      trip('t2', 'N2PG', '2026-09-02T00:00:00.000Z', '2026-09-02T00:00:00.000Z'),
      trip('t3', 'N5PG', '2026-09-02T00:00:00.000Z', '2026-09-02T00:00:00.000Z'),
    ];
    const c = capacityOn('2026-09-02', [], trips, roster);
    expect(c.crewsFormable).toBe(1);
    expect(c.crewsCommitted).toBe(3);
    expect(c.crewsFree).toBe(0);
    expect(c.overCommitted).toBe(true);
  });

  it('prefers explicit assignments over the greedy one-crew-per-trip guess', () => {
    const trips = [
      trip('t1', 'N1PG', '2026-09-02T00:00:00.000Z', '2026-09-02T00:00:00.000Z'),
      trip('t2', 'N2PG', '2026-09-02T00:00:00.000Z', '2026-09-02T00:00:00.000Z'),
    ];
    const days = crewCapacityByDay(ROSTER, [], trips, NOW, 5, [{ tripId: 't1', crewIds: ['P1', 'S1'] }]);
    const day = days.find(d => d.dateUtc === '2026-09-02')!;
    // t1 is assigned and consumes P1+S1; t2 is unassigned and still consumes a notional crew.
    expect(day.crewsCommitted).toBe(2);
    expect(day.picAvailable).toBe(2);
    expect(day.sicAvailable).toBe(2);
  });

  it('returns exactly `days` rows starting from the UTC day of nowUtc', () => {
    const days = crewCapacityByDay(ROSTER, [], [], NOW, 3);
    expect(days.map(d => d.dateUtc)).toEqual(['2026-09-01', '2026-09-02', '2026-09-03']);
  });

  it('is deterministic for a pinned clock', () => {
    expect(crewCapacityByDay(ROSTER, [], [], NOW, 5)).toEqual(crewCapacityByDay(ROSTER, [], [], NOW, 5));
  });
});
