import { describe, expect, it } from 'vitest';
import { evaluateWatches, freeByCabin, newWatch } from './watches';
import type { FleetAvailability } from '../../../availability/types';

function grid(cells: Record<string, Record<string, 'available' | 'reserved' | 'committed'>>): FleetAvailability {
  const dates = Object.keys(cells);
  const tails = ['N1PG', 'N2PG', 'N5PG', 'N6PG'];
  return {
    generatedAtUtc: '2026-09-01T00:00:00.000Z',
    days: dates.map(d => ({ dateUtc: d, dateLabel: d })),
    rows: tails.map(t => ({ tail: t, type: 'x', cells: dates.map(d => ({ tail: t, dateUtc: d, state: cells[d][t] ?? 'available' })) })),
  } as unknown as FleetAvailability;
}

describe('watches by cabin and window', () => {
  it('counts free per cabin; reserved and committed are not free', () => {
    const f = freeByCabin(grid({ '2026-10-12': { N1PG: 'reserved', N2PG: 'committed', N5PG: 'available', N6PG: 'available' } }));
    expect(f['2026-10-12']).toEqual({ big: 0, standard: 2, any: 2 });
  });
  it('a big-cabin watch does not fire for a free G500; it fires on the first day a G650 is open', () => {
    const w = newWatch({ cabin: 'big', fromDate: '2026-10-12', toDate: '2026-10-14', forName: 'A. Reyes', seats: 6, createdBy: 'Dana' }, '2026-10-01T00:00:00.000Z');
    const free = { '2026-10-12': { big: 0, standard: 2, any: 2 }, '2026-10-13': { big: 1, standard: 2, any: 3 } };
    const [r] = evaluateWatches([w], free, '2026-10-01T00:00:00.000Z');
    expect(r.status).toBe('fired');
    expect(r.firedForDate).toBe('2026-10-13');
    const [again] = evaluateWatches([r], free, '2026-10-02T00:00:00.000Z');
    expect(again).toBe(r);
  });
  it('expires once the window has passed; ignores days already gone', () => {
    const w = newWatch({ cabin: 'any', fromDate: '2026-10-12', toDate: '2026-10-14', forName: 'x', seats: 1, createdBy: 'd' }, '2026-10-01T00:00:00.000Z');
    expect(evaluateWatches([w], {}, '2026-10-15T00:00:00.000Z')[0].status).toBe('expired');
    const free = { '2026-10-12': { big: 1, standard: 1, any: 2 }, '2026-10-13': { big: 0, standard: 0, any: 0 }, '2026-10-14': { big: 0, standard: 0, any: 0 } };
    expect(evaluateWatches([w], free, '2026-10-13T00:00:00.000Z')[0].status).toBe('watching');
  });
});
