import { describe, expect, it } from 'vitest';
import { coreFleetByDay } from './monthView';
import { CORE_TAILS } from '../../fleet/registry';
import type { FleetAvailability, TailDayAvailability, AvailabilityReason } from '../types';

const DAYS = ['2026-09-10', '2026-09-11'];

function reason(category: AvailabilityReason['category'], detail: string | null = null): AvailabilityReason {
  return { category, rank: category === 'none' ? 6 : 3, detail, untilUtc: null } as AvailabilityReason;
}

function cell(tail: string, dateUtc: string, category: AvailabilityReason['category'], detail: string | null = null): TailDayAvailability {
  const r = reason(category, detail);
  return {
    tail, dateUtc,
    state: category === 'none' ? 'available' : category === 'committed' ? 'committed' : category === 'held' ? 'held' : 'unavailable',
    reason: r, reasons: [r], conflicts: [], tripId: category === 'committed' ? 'TRP-9' : null, overlay: null,
    crew: { crewsFormable: 2, crewsCommitted: 0, crewsFree: 2, rostered: true },
  } as unknown as TailDayAvailability;
}

function fleet(tails: string[]): FleetAvailability {
  return {
    generatedAtUtc: '2026-09-01T00:00:00.000Z',
    days: DAYS.map(d => ({ dateUtc: d, dateLabel: d.slice(5) })),
    rows: tails.map(t => ({
      tail: t, type: 'G650ER',
      cells: DAYS.map(d => cell(t, d, t === 'N2PG' ? 'committed' : 'none', t === 'N2PG' ? 'TRP-9 · KLUK → KTEB' : null)),
    })),
  } as unknown as FleetAvailability;
}

describe('coreFleetByDay', () => {
  it('shows only the four core tails — never the demo-only or incoming airframes', () => {
    const byDay = coreFleetByDay(fleet([...CORE_TAILS, 'N7PG', 'N3PG']), 'executive');
    for (const d of DAYS) {
      expect(byDay[d].map(c => c.tail)).toEqual(CORE_TAILS);
    }
  });

  it('a plain executive gets the category but never the route', () => {
    const byDay = coreFleetByDay(fleet(CORE_TAILS), 'executive');
    const n2 = byDay['2026-09-10'].find(c => c.tail === 'N2PG')!;
    expect(n2.category).toBe('committed');
    expect(n2.scheduleLabel).toBeUndefined();
    expect(n2.tripId).toBeUndefined();
  });

  it('the full-schedule executive sees where the aeroplane is going', () => {
    const byDay = coreFleetByDay(fleet(CORE_TAILS), 'executive-full');
    const n2 = byDay['2026-09-10'].find(c => c.tail === 'N2PG')!;
    expect(n2.scheduleLabel).toBe('TRP-9 · KLUK → KTEB');
  });

  it('a core tail missing from the grid is still a row, marked unknown — absence is not availability', () => {
    const byDay = coreFleetByDay(fleet(CORE_TAILS.slice(0, 3)), 'operator');
    const missing = byDay['2026-09-10'].find(c => c.tail === CORE_TAILS[3])!;
    expect(missing).toBeDefined();
    expect(missing.state).toBe('unavailable');
    expect(missing.category).toBe('not-in-service');
  });

  it('a day outside the grid is absent, not empty', () => {
    const byDay = coreFleetByDay(fleet(CORE_TAILS), 'executive');
    expect(byDay['2026-12-25']).toBeUndefined();
  });
});
