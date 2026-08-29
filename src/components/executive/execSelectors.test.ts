import { describe, expect, it } from 'vitest';
import { buildFleetWeek, tailDayStats, firstOpenSlot } from './execSelectors';
import type { TripRecord, TripLegRecord } from '../../scheduling/store/types';

const NOW = '2026-08-19T15:00:00.000Z'; // a Wednesday, mid-day UTC
const DAY_MS = 86_400_000;

let seq = 0;

function leg(departureTimeUtc: string, overrides: Partial<TripLegRecord> = {}): TripLegRecord {
  return {
    id: `leg-${++seq}`,
    sequence: 1,
    departureIcao: 'KCVG',
    arrivalIcao: 'KTEB',
    departureTimeUtc,
    arrivalTimeUtc: new Date(Date.parse(departureTimeUtc) + 2 * 3_600_000).toISOString(),
    paxCount: 4,
    filedStatus: 'unfiled',
    ...overrides,
  };
}

function trip(legs: TripLegRecord[], overrides: Partial<TripRecord> = {}): TripRecord {
  const id = `trip-${++seq}`;
  return {
    id,
    tripNumber: `T-${seq}`,
    sourceSystem: 'manual',
    sourceTripRef: null,
    tail: 'N1PG',
    aircraftType: 'G650ER',
    tripType: 'domestic' as TripRecord['tripType'],
    priority: 'standard',
    status: 'confirmed',
    startDate: legs[0]?.departureTimeUtc ?? NOW,
    endDate: legs[legs.length - 1]?.departureTimeUtc ?? NOW,
    legs,
    createdBy: 'test',
    createdAtUtc: NOW,
    ...overrides,
  };
}

function atDay(offset: number, hour = 14): string {
  const base = Date.parse('2026-08-19T00:00:00.000Z') + offset * DAY_MS;
  return new Date(base + hour * 3_600_000).toISOString();
}

describe('buildFleetWeek', () => {
  it('marks departure days as trip cells and spanned middle days as away', () => {
    const t = trip(
      [
        leg(atDay(1), { departureIcao: 'KCVG', arrivalIcao: 'LSGG' }),
        leg(atDay(3), { departureIcao: 'LSGG', arrivalIcao: 'KCVG' }),
      ],
      { startDate: atDay(1), endDate: atDay(3) },
    );
    const week = buildFleetWeek([t], ['N1PG'], NOW);
    const cells = week.rows[0].cells;
    expect(cells[1]).toMatchObject({ kind: 'trip', label: 'KCVG → LSGG', tripId: t.id });
    expect(cells[2]).toMatchObject({ kind: 'away', label: 'away', tripId: t.id });
    expect(cells[3].kind).toBe('trip');
    expect(cells[3].label).toBe('LSGG → KCVG');
    expect(cells[0].kind).toBe('open');
  });

  it('labels a multi-leg day first-departure → last-arrival', () => {
    const t = trip(
      [
        leg(atDay(2, 12), { departureIcao: 'KCVG', arrivalIcao: 'KTEB' }),
        leg(atDay(2, 18), { departureIcao: 'KTEB', arrivalIcao: 'KPBI' }),
      ],
      { startDate: atDay(2, 12), endDate: atDay(2, 18) },
    );
    const week = buildFleetWeek([t], ['N1PG'], NOW);
    expect(week.rows[0].cells[2].label).toBe('KCVG → KPBI');
  });

  it('ignores cancelled and completed trips entirely', () => {
    const cancelled = trip([leg(atDay(1))], { status: 'cancelled', startDate: atDay(1), endDate: atDay(1) });
    const done = trip([leg(atDay(2))], { status: 'completed', startDate: atDay(2), endDate: atDay(2) });
    const week = buildFleetWeek([cancelled, done], ['N1PG'], NOW);
    expect(week.rows[0].cells.every(c => c.kind === 'open')).toBe(true);
  });

  it('clips a trip that started before the window without losing its in-window days', () => {
    const t = trip(
      [leg(atDay(-2), { departureIcao: 'KCVG', arrivalIcao: 'LSGG' })],
      { startDate: atDay(-2), endDate: atDay(1) },
    );
    const week = buildFleetWeek([t], ['N1PG'], NOW);
    expect(week.rows[0].cells[0].kind).toBe('away');
    expect(week.rows[0].cells[1].kind).toBe('away');
    expect(week.rows[0].cells[2].kind).toBe('open');
  });

  it('keeps the earlier-starting trip when two trips overlap one tail-day', () => {
    const first = trip([leg(atDay(1, 8))], { startDate: atDay(1, 8), endDate: atDay(2, 8) });
    const second = trip(
      [leg(atDay(2, 16), { departureIcao: 'KTEB', arrivalIcao: 'KPBI' })],
      { startDate: atDay(2, 16), endDate: atDay(2, 18) },
    );
    const week = buildFleetWeek([first, second], ['N1PG'], NOW);
    expect(week.rows[0].cells[2].tripId).toBe(first.id);
  });

  it('builds a 14-day window with weekday labels and separate tail rows', () => {
    const week = buildFleetWeek([], ['N1PG', 'N2PG'], NOW);
    expect(week.days).toHaveLength(14);
    expect(week.days[0]).toMatchObject({ dateUtc: '2026-08-19', dateLabel: 'Wed 19' });
    expect(week.rows.map(r => r.tail)).toEqual(['N1PG', 'N2PG']);
  });
});

describe('buildFleetWeek — down and no-crew (D99 tightening)', () => {
  it("renders a RED tail's unscheduled days as down with the grounding headline", () => {
    const week = buildFleetWeek([], ['N1PG'], NOW, 14, {
      tailStatus: { N1PG: 'RED' },
      tailHeadline: { N1PG: 'Hydraulic leak — open defect' },
    });
    expect(week.rows[0].cells.every(c => c.kind === 'down')).toBe(true);
    expect(week.rows[0].cells[0].label).toBe('Hydraulic leak — open defect');
  });

  it('a scheduled trip still shows on a RED tail — down only claims the unscheduled days', () => {
    const t = trip([leg(atDay(1))], { startDate: atDay(1), endDate: atDay(1) });
    const week = buildFleetWeek([t], ['N1PG'], NOW, 14, { tailStatus: { N1PG: 'RED' } });
    expect(week.rows[0].cells[1].kind).toBe('trip');
    expect(week.rows[0].cells[0].kind).toBe('down');
  });

  it('AMBER stays open — dispatchable is dispatchable', () => {
    const week = buildFleetWeek([], ['N1PG'], NOW, 14, { tailStatus: { N1PG: 'AMBER' } });
    expect(week.rows[0].cells.every(c => c.kind === 'open')).toBe(true);
  });

  it('marks other tails no-crew on a day whose flying commits every crew', () => {
    const t1 = trip([leg(atDay(1))], { tail: 'N1PG', startDate: atDay(1), endDate: atDay(1) });
    const t2 = trip([leg(atDay(1, 16), { departureIcao: 'KTEB', arrivalIcao: 'KPBI' })], {
      tail: 'N2PG', startDate: atDay(1, 16), endDate: atDay(1, 18),
    });
    const week = buildFleetWeek([t1, t2], ['N1PG', 'N2PG', 'N3PG'], NOW, 14, { crewCapacity: 2 });
    const n3 = week.rows[2];
    expect(n3.cells[1].kind).toBe('no-crew');
    expect(n3.cells[2].kind).toBe('open');
  });

  it('a mid-trip away day still holds its crew for the count', () => {
    const t = trip(
      [leg(atDay(1)), leg(atDay(3), { departureIcao: 'LSGG', arrivalIcao: 'KCVG' })],
      { tail: 'N1PG', startDate: atDay(1), endDate: atDay(3) },
    );
    const week = buildFleetWeek([t], ['N1PG', 'N2PG'], NOW, 14, { crewCapacity: 1 });
    expect(week.rows[1].cells[2].kind).toBe('no-crew');
    expect(week.rows[1].cells[4].kind).toBe('open');
  });

  it('firstOpenSlot skips down and no-crew days', () => {
    const t = trip([leg(atDay(0))], { tail: 'N2PG', startDate: atDay(0), endDate: atDay(0) });
    const week = buildFleetWeek([t], ['N1PG', 'N2PG'], NOW, 14, {
      tailStatus: { N1PG: 'RED' },
      crewCapacity: 1,
    });
    // Day 0: N1PG down, N2PG on a trip that exhausts the single crew.
    // Day 1: N1PG still down; N2PG unscheduled with the crew free.
    expect(firstOpenSlot(week)).toEqual({ dateUtc: '2026-08-20', tail: 'N2PG' });
  });
});

describe('tailDayStats', () => {
  it('counts open vs total tail-days', () => {
    const t = trip([leg(atDay(1))], { startDate: atDay(1), endDate: atDay(1) });
    const week = buildFleetWeek([t], ['N1PG', 'N2PG'], NOW);
    expect(tailDayStats(week)).toEqual({ openTailDays: 27, totalTailDays: 28 });
  });
});

describe('firstOpenSlot', () => {
  it('returns the earliest open day, preferring the earlier fleet row on ties', () => {
    const busyToday = trip([leg(atDay(0))], { startDate: atDay(0), endDate: atDay(0) });
    const week = buildFleetWeek([busyToday], ['N1PG', 'N2PG'], NOW);
    expect(firstOpenSlot(week)).toEqual({ dateUtc: '2026-08-19', tail: 'N2PG' });
  });

  it('returns null when every tail-day is committed', () => {
    const t = trip([leg(atDay(0))], { startDate: atDay(0), endDate: atDay(20) });
    const week = buildFleetWeek([t], ['N1PG'], NOW);
    expect(firstOpenSlot(week)).toBeNull();
  });
});
