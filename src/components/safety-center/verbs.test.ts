import { describe, it, expect } from 'vitest';
import { VERBS, DEFAULT_VERB, parseVerb, verbDef, verbCounts, atPhase, type VerbCountInput } from './verbs';
import type { SafetyItem } from './types';

const item = (over: Partial<SafetyItem> = {}): SafetyItem =>
  ({ id: 'i', type: 'HAZARD', bucket: 'track', title: 't', ...over } as SafetyItem);

const input = (over: Partial<VerbCountInput> = {}): VerbCountInput =>
  ({ move: [], track: [], pendingApprovals: 0, auditsOpen: 0, asapOpen: 0, ...over });

describe('the verb catalog', () => {
  it('has a unique id per verb', () => {
    expect(new Set(VERBS.map((v) => v.id)).size).toBe(VERBS.length);
  });

  it('groups the daily verbs before the periodic ones', () => {
    const groups = VERBS.map((v) => v.group);
    expect(groups.indexOf('periodic')).toBeGreaterThan(groups.lastIndexOf('daily') - 1);
    expect(groups.slice(groups.indexOf('periodic')).every((g) => g === 'periodic')).toBe(true);
  });

  it('gives every verb a label, a blurb and a shape', () => {
    for (const v of VERBS) {
      expect(v.label.length).toBeGreaterThan(0);
      expect(v.blurb.length).toBeGreaterThan(0);
      expect(v.defaultShape).toBeTruthy();
    }
  });

  it('resolves a def for every id', () => {
    for (const v of VERBS) expect(verbDef(v.id).id).toBe(v.id);
  });
});

describe('parseVerb', () => {
  it('accepts a known verb', () => {
    expect(parseVerb('mitigate')).toBe('mitigate');
  });

  it('falls back to Triage rather than rendering an empty console', () => {
    expect(parseVerb('nonsense')).toBe(DEFAULT_VERB);
    expect(parseVerb(null)).toBe(DEFAULT_VERB);
    expect(parseVerb(undefined)).toBe(DEFAULT_VERB);
    expect(parseVerb('')).toBe(DEFAULT_VERB);
  });
});

describe('atPhase', () => {
  it('selects only the given phase', () => {
    const items = [item({ id: 'a', phaseIndex: 1 }), item({ id: 'b', phaseIndex: 2 }), item({ id: 'c', phaseIndex: 1 })];
    expect(atPhase(items, 1).map((i) => i.id)).toEqual(['a', 'c']);
  });

  it('ignores items with no phase at all', () => {
    expect(atPhase([item({ phaseIndex: undefined })], 1)).toEqual([]);
  });
});

describe('verbCounts', () => {
  it('counts triage from the move bucket', () => {
    const c = verbCounts(input({ move: [item(), item()] }));
    expect(c.triage).toEqual({ n: 2, tone: 'amber' });
  });

  it('is quiet when a queue is empty', () => {
    const c = verbCounts(input());
    expect(c.triage).toEqual({ n: 0, tone: 'none' });
    expect(c.decide).toEqual({ n: 0, tone: 'none' });
  });

  it('splits track between Investigate and Mitigate by phase', () => {
    const c = verbCounts(input({
      track: [item({ phaseIndex: 1 }), item({ phaseIndex: 2 }), item({ phaseIndex: 2 })],
    }));
    expect(c.investigate.n).toBe(1);
    expect(c.mitigate.n).toBe(2);
  });

  it('reddens the verb that owns a stalled case, not the whole console', () => {
    const c = verbCounts(input({
      track: [item({ phaseIndex: 1, stalled: true }), item({ phaseIndex: 2 })],
    }));
    expect(c.investigate.tone).toBe('red');
    expect(c.mitigate.tone).toBe('none');
  });

  it('counts open ASAP reports without listing them anywhere shared', () => {
    expect(verbCounts(input({ asapOpen: 2 })).asap).toEqual({ n: 2, tone: 'amber' });
  });

  it('carries no number on Publish or Records — they are places, not queues', () => {
    const c = verbCounts(input({ move: [item()], auditsOpen: 3 }));
    expect(c.publish.n).toBeUndefined();
    expect(c.records.n).toBeUndefined();
  });

  it('counts approvals waiting on this user for Decide', () => {
    expect(verbCounts(input({ pendingApprovals: 4 })).decide).toEqual({ n: 4, tone: 'amber' });
  });

  it('returns an entry for every verb in the catalog', () => {
    const c = verbCounts(input());
    for (const v of VERBS) expect(c[v.id]).toBeDefined();
  });
});
