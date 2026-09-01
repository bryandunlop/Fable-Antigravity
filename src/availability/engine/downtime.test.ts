import { describe, expect, it } from 'vitest';
import type { MaintenanceDowntimeBlock } from '../types';
import { blocksCoveringDay, effectiveWindow, returnToServiceUtc } from './downtime';

function block(over: Partial<MaintenanceDowntimeBlock> = {}): MaintenanceDowntimeBlock {
  return {
    id: 'mx-1',
    tail: 'N1PG',
    maintenanceType: 'Scheduled inspection',
    category: 'Inspection',
    description: 'chip detector inspection',
    airportIcao: 'KLUK',
    vendorName: 'Gulfstream Savannah',
    woNumber: 'WO-4471',
    scheduledStartUtc: '2026-09-10T08:00:00.000Z',
    scheduledEndUtc: '2026-09-12T18:00:00.000Z',
    actualStartUtc: null,
    actualEndUtc: null,
    cancelled: false,
    released: false,
    createdBy: 'USR005',
    createdAtUtc: '2026-09-01T00:00:00.000Z',
    modifiedBy: null,
    modifiedAtUtc: null,
    source: 'local',
    sourceRef: null,
    ...over,
  };
}

describe('effectiveWindow', () => {
  it('uses the scheduled window when nothing has actually happened', () => {
    const w = effectiveWindow(block());
    expect(w).not.toBeNull();
    expect(new Date(w!.startMs).toISOString()).toBe('2026-09-10T08:00:00.000Z');
    expect(new Date(w!.endMs).toISOString()).toBe('2026-09-12T18:00:00.000Z');
  });

  it('lets an actual end that beat the schedule win — this is the early-return case', () => {
    const w = effectiveWindow(block({ actualEndUtc: '2026-09-11T09:00:00.000Z' }));
    expect(new Date(w!.endMs).toISOString()).toBe('2026-09-11T09:00:00.000Z');
  });

  it('lets an actual end that ran LONG win too — an overrun still holds the aircraft', () => {
    const w = effectiveWindow(block({ actualEndUtc: '2026-09-14T09:00:00.000Z' }));
    expect(new Date(w!.endMs).toISOString()).toBe('2026-09-14T09:00:00.000Z');
  });

  it('prefers the actual start over the scheduled one', () => {
    const w = effectiveWindow(block({ actualStartUtc: '2026-09-09T06:00:00.000Z' }));
    expect(new Date(w!.startMs).toISOString()).toBe('2026-09-09T06:00:00.000Z');
  });

  it('makes no demand when cancelled', () => {
    expect(effectiveWindow(block({ cancelled: true }))).toBeNull();
  });

  it('makes no demand when released', () => {
    expect(effectiveWindow(block({ released: true }))).toBeNull();
  });

  it('makes no demand when the dates are unparseable', () => {
    expect(effectiveWindow(block({ scheduledStartUtc: 'not-a-date' }))).toBeNull();
  });

  it('makes no demand when the window is inverted', () => {
    expect(effectiveWindow(block({ scheduledEndUtc: '2026-09-09T00:00:00.000Z' }))).toBeNull();
  });
});

describe('blocksCoveringDay', () => {
  const blocks = [block(), block({ id: 'mx-2', tail: 'N2PG' })];

  it('covers every UTC day the window touches, inclusive of both ends', () => {
    for (const d of ['2026-09-10', '2026-09-11', '2026-09-12']) {
      expect(blocksCoveringDay(blocks, 'N1PG', d).map(b => b.id)).toEqual(['mx-1']);
    }
  });

  it('does not cover the day before or after', () => {
    expect(blocksCoveringDay(blocks, 'N1PG', '2026-09-09')).toEqual([]);
    expect(blocksCoveringDay(blocks, 'N1PG', '2026-09-13')).toEqual([]);
  });

  it('is tail-scoped', () => {
    expect(blocksCoveringDay(blocks, 'N5PG', '2026-09-11')).toEqual([]);
  });

  it('covers the whole UTC day for a window ending at 23:00Z — the boundary case', () => {
    const late = [block({ scheduledEndUtc: '2026-09-12T23:00:00.000Z' })];
    expect(blocksCoveringDay(late, 'N1PG', '2026-09-12')).toHaveLength(1);
    expect(blocksCoveringDay(late, 'N1PG', '2026-09-13')).toHaveLength(0);
  });

  it('covers the whole UTC day for a window starting at 23:00Z', () => {
    const late = [block({ scheduledStartUtc: '2026-09-10T23:00:00.000Z' })];
    expect(blocksCoveringDay(late, 'N1PG', '2026-09-10')).toHaveLength(1);
  });

  it('drops a block that ends before the day it nominally started on', () => {
    const ended = [block({ actualEndUtc: '2026-09-10T10:00:00.000Z' })];
    expect(blocksCoveringDay(ended, 'N1PG', '2026-09-10')).toHaveLength(1);
    expect(blocksCoveringDay(ended, 'N1PG', '2026-09-11')).toHaveLength(0);
  });
});

describe('returnToServiceUtc', () => {
  it('is the effective end of the covering block', () => {
    expect(returnToServiceUtc([block()], 'N1PG', '2026-09-11')).toBe('2026-09-12T18:00:00.000Z');
  });

  it('takes the EARLIEST end when blocks overlap — the aircraft is back when the first frees it', () => {
    const overlapping = [
      block(),
      block({ id: 'mx-3', scheduledEndUtc: '2026-09-11T12:00:00.000Z' }),
    ];
    expect(returnToServiceUtc(overlapping, 'N1PG', '2026-09-11')).toBe('2026-09-11T12:00:00.000Z');
  });

  it('is null when no block covers the day — a RED tail with no block has no ETR (LG-308)', () => {
    expect(returnToServiceUtc([block()], 'N1PG', '2026-09-20')).toBeNull();
  });
});
