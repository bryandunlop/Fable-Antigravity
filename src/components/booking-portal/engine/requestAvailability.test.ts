import { describe, expect, it } from 'vitest';
import type { DisclosedCell } from '../../../availability/engine/disclosure';
import { datesForLegs, requestedTailStatus, summarizeByDay } from './requestAvailability';

function cell(tail: string, dateUtc: string, over: Partial<DisclosedCell> = {}): DisclosedCell {
  return {
    tail, dateUtc, state: 'available', category: 'none', label: null, untilUtc: null, ...over,
  };
}

describe('datesForLegs', () => {
  it('takes the distinct dates in order', () => {
    expect(datesForLegs([{ date: '2026-09-03' }, { date: '2026-09-05' }])).toEqual(['2026-09-03', '2026-09-05']);
  });

  it('drops duplicates — a same-day return asks about one day', () => {
    expect(datesForLegs([{ date: '2026-09-03' }, { date: '2026-09-03' }])).toEqual(['2026-09-03']);
  });

  it('ignores blank dates rather than querying an empty day', () => {
    expect(datesForLegs([{ date: '' }, { date: '2026-09-03' }])).toEqual(['2026-09-03']);
  });

  it('returns nothing for an empty draft', () => {
    expect(datesForLegs([])).toEqual([]);
  });
});

describe('summarizeByDay', () => {
  const cells = [
    cell('N1PG', '2026-09-03', { state: 'unavailable', category: 'maintenance', label: 'In maintenance until 5 Sep', untilUtc: '2026-09-05T18:00:00.000Z' }),
    cell('N2PG', '2026-09-03', { state: 'committed', category: 'committed', label: 'Already committed' }),
    cell('N6PG', '2026-09-03'),
  ];

  it('puts available tails first, then alphabetical', () => {
    const [day] = summarizeByDay(cells, ['2026-09-03']);
    expect(day.tails.map(t => t.tail)).toEqual(['N6PG', 'N1PG', 'N2PG']);
    expect(day.availableTails).toEqual(['N6PG']);
    expect(day.nothingFree).toBe(false);
  });

  it('flags a day where nothing in the fleet is free', () => {
    const [day] = summarizeByDay(cells.filter(c => c.tail !== 'N6PG'), ['2026-09-03']);
    expect(day.nothingFree).toBe(true);
  });

  it('does not flag a day it has no cells for — that is unknown, not full', () => {
    const [day] = summarizeByDay([], ['2026-09-09']);
    expect(day.nothingFree).toBe(false);
    expect(day.tails).toEqual([]);
  });

  it('returns one line per requested date, in the order asked', () => {
    expect(summarizeByDay(cells, ['2026-09-05', '2026-09-03']).map(l => l.dateUtc))
      .toEqual(['2026-09-05', '2026-09-03']);
  });

  it('carries only the composed label through — never a raw reason', () => {
    const [day] = summarizeByDay(cells, ['2026-09-03']);
    expect(day.tails.find(t => t.tail === 'N1PG')!.label).toBe('In maintenance until 5 Sep');
  });
});

describe('requestedTailStatus', () => {
  const lines = summarizeByDay([
    cell('N1PG', '2026-09-03', { state: 'unavailable', category: 'maintenance', label: 'In maintenance until 5 Sep' }),
    cell('N2PG', '2026-09-03'),
  ], ['2026-09-03']);

  it('finds the picked tail on the chosen day', () => {
    expect(requestedTailStatus(lines, 'N1PG', '2026-09-03')?.label).toBe('In maintenance until 5 Sep');
    expect(requestedTailStatus(lines, 'N2PG', '2026-09-03')?.available).toBe(true);
  });

  it('is null when no tail was picked, or the day or tail is unknown', () => {
    expect(requestedTailStatus(lines, null, '2026-09-03')).toBeNull();
    expect(requestedTailStatus(lines, 'N1PG', '2026-09-09')).toBeNull();
    expect(requestedTailStatus(lines, 'N9XX', '2026-09-03')).toBeNull();
  });
});
