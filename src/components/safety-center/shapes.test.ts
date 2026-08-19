import { describe, it, expect } from 'vitest';
import {
  resolveShape, canToggle, nextShape, withOverride, parseOverrides,
  type ShapeOverrides,
} from './shapes';
import { VERBS, verbDef } from './verbs';
import { groupByAge } from './CaseBoard';
import { queueOrder } from './CaseQueue';
import type { SafetyItem } from './types';

const item = (over: Partial<SafetyItem> = {}): SafetyItem =>
  ({ id: 'i', type: 'HAZARD', bucket: 'track', title: 't', ...over } as SafetyItem);

describe('resolveShape', () => {
  it('uses the verb’s own default when nothing is overridden', () => {
    for (const v of VERBS) expect(resolveShape(v.id, {})).toBe(v.defaultShape);
  });

  it('honours an override the verb actually offers', () => {
    expect(resolveShape('triage', { triage: 'queue' })).toBe('queue');
    expect(resolveShape('mitigate', { mitigate: 'board' })).toBe('board');
  });

  it('ignores an override the verb does not offer, rather than blanking the console', () => {
    // A stale value from an earlier build, or a hand-edited localStorage.
    expect(resolveShape('assure', { assure: 'board' } as ShapeOverrides)).toBe('calendar');
    expect(resolveShape('publish', { publish: 'queue' } as ShapeOverrides)).toBe('list');
  });

  it('keeps overrides per verb — one does not leak into another', () => {
    const o: ShapeOverrides = { mitigate: 'board' };
    expect(resolveShape('mitigate', o)).toBe('board');
    expect(resolveShape('triage', o)).toBe(verbDef('triage').defaultShape);
    expect(resolveShape('investigate', o)).toBe(verbDef('investigate').defaultShape);
  });
});

describe('canToggle', () => {
  it('is true only where a verb offers more than one shape', () => {
    expect(canToggle('triage')).toBe(true);
    expect(canToggle('investigate')).toBe(true);
    expect(canToggle('mitigate')).toBe(true);
    expect(canToggle('decide')).toBe(false);
    expect(canToggle('assure')).toBe(false);
    expect(canToggle('publish')).toBe(false);
    expect(canToggle('records')).toBe(false);
  });
});

describe('nextShape', () => {
  it('cycles between the two shapes a verb offers', () => {
    expect(nextShape('triage', 'board')).toBe('queue');
    expect(nextShape('triage', 'queue')).toBe('board');
  });

  it('is a no-op for a single-shape verb', () => {
    expect(nextShape('assure', 'calendar')).toBe('calendar');
  });
});

describe('withOverride', () => {
  it('adds without disturbing the others', () => {
    const before: ShapeOverrides = { triage: 'queue' };
    const after = withOverride(before, 'mitigate', 'board');
    expect(after).toEqual({ triage: 'queue', mitigate: 'board' });
    expect(before).toEqual({ triage: 'queue' });   // not mutated
  });
});

describe('parseOverrides', () => {
  it('reads a stored object', () => {
    expect(parseOverrides('{"triage":"queue"}')).toEqual({ triage: 'queue' });
  });

  it('treats absent, corrupt or wrong-typed values as no overrides', () => {
    expect(parseOverrides(null)).toEqual({});
    expect(parseOverrides('')).toEqual({});
    expect(parseOverrides('not json')).toEqual({});
    expect(parseOverrides('[1,2]')).toEqual({});
    expect(parseOverrides('null')).toEqual({});
    expect(parseOverrides('"a string"')).toEqual({});
  });
});

describe('groupByAge', () => {
  it('always returns the four columns, even when empty', () => {
    expect(groupByAge([]).map((c) => c.key)).toEqual(['today', 'week', 'month', 'older']);
  });

  it('buckets on the boundaries the labels promise', () => {
    const items = [
      item({ id: 'd0', ageDays: 0 }), item({ id: 'd1', ageDays: 1 }), item({ id: 'd7', ageDays: 7 }),
      item({ id: 'd8', ageDays: 8 }), item({ id: 'd30', ageDays: 30 }), item({ id: 'd31', ageDays: 31 }),
    ];
    const byKey = Object.fromEntries(groupByAge(items).map((c) => [c.key, c.items.map((i) => i.id)]));
    expect(byKey.today).toEqual(['d0']);
    expect(byKey.week).toEqual(['d7', 'd1']);
    expect(byKey.month).toEqual(['d30', 'd8']);
    expect(byKey.older).toEqual(['d31']);
  });

  it('puts an item with no age in Today rather than dropping it', () => {
    const cols = groupByAge([item({ id: 'x' })]);
    expect(cols[0].items.map((i) => i.id)).toEqual(['x']);
  });

  it('sorts oldest-first inside a column so the worst case is on top', () => {
    const cols = groupByAge([item({ id: 'a', ageDays: 2 }), item({ id: 'b', ageDays: 6 })]);
    expect(cols[1].items.map((i) => i.id)).toEqual(['b', 'a']);
  });

  it('loses nothing — every item lands in exactly one column', () => {
    const items = Array.from({ length: 20 }, (_, n) => item({ id: `i${n}`, ageDays: n * 3 }));
    const placed = groupByAge(items).flatMap((c) => c.items.map((i) => i.id));
    expect(placed.sort()).toEqual(items.map((i) => i.id).sort());
  });
});

describe('queueOrder', () => {
  it('floats stalled cases above everything', () => {
    const out = queueOrder([
      item({ id: 'fresh', ageDays: 90 }),
      item({ id: 'stalled', ageDays: 31, stalled: true }),
    ]);
    expect(out.map((i) => i.id)).toEqual(['stalled', 'fresh']);
  });

  it('orders the rest oldest-first', () => {
    const out = queueOrder([item({ id: 'a', ageDays: 2 }), item({ id: 'b', ageDays: 9 })]);
    expect(out.map((i) => i.id)).toEqual(['b', 'a']);
  });

  it('does not mutate its input', () => {
    const items = [item({ id: 'a', ageDays: 1 }), item({ id: 'b', ageDays: 9 })];
    queueOrder(items);
    expect(items.map((i) => i.id)).toEqual(['a', 'b']);
  });
});
