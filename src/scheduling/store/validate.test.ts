import { describe, it, expect } from 'vitest';
import { parseDueRule, parseCondition, parseTemplate } from './validate';

describe('parseDueRule', () => {
  it('accepts a valid rule', () => {
    expect(parseDueRule({ kind: 'hoursBeforeEtd', hours: 24 })).toEqual({ kind: 'hoursBeforeEtd', hours: 24 });
  });
  it('throws on unknown kind', () => {
    expect(() => parseDueRule({ kind: 'bogus' })).toThrow(/dueRule/i);
  });
  it('throws on a missing required field', () => {
    expect(() => parseDueRule({ kind: 'weekday' })).toThrow(/weekday/i);
  });
});

describe('parseCondition', () => {
  it('accepts and recurses allOf', () => {
    const c = { kind: 'allOf', conditions: [{ kind: 'always' }, { kind: 'paxCountAtLeast', value: 7 }] };
    expect(parseCondition(c)).toEqual(c);
  });
  it('throws on unknown kind', () => {
    expect(() => parseCondition({ kind: 'nope' })).toThrow(/condition/i);
  });
  it('throws when a nested condition is invalid', () => {
    expect(() => parseCondition({ kind: 'not', condition: { kind: 'nope' } })).toThrow(/condition/i);
  });
  it('throws on an invalid tripType value', () => {
    expect(() => parseCondition({ kind: 'tripType', equals: 'bogus' })).toThrow(/tripType/i);
  });
});

describe('parseTemplate', () => {
  const good = {
    id: 't', name: 'Daily', triggerType: 'recurring', scope: 'daily', version: 1,
    status: 'published', effectiveFrom: '2026-01-01T00:00:00.000Z',
    taskDefinitions: [{ id: 'a', title: 'x', ownerRole: 'scheduling', category: 'ops', order: 1,
      dueRule: { kind: 'weekday', day: 'MON' }, requiresAck: false }],
  };
  it('accepts a valid recurring template', () => {
    expect(parseTemplate(good).scope).toBe('daily');
  });
  it('T3: rejects a per_trip template with a recurring scope', () => {
    expect(() => parseTemplate({ ...good, triggerType: 'per_trip', scope: 'daily' })).toThrow(/scope/i);
  });
  it('T3: rejects a recurring template with a tripType scope', () => {
    expect(() => parseTemplate({ ...good, triggerType: 'recurring', scope: 'domestic' })).toThrow(/scope/i);
  });
  it('rejects a task def whose dueRule is invalid', () => {
    expect(() => parseTemplate({ ...good, taskDefinitions: [{ ...good.taskDefinitions[0], dueRule: { kind: 'bogus' } }] })).toThrow(/dueRule/i);
  });
  it('rejects an invalid handoffTarget kind', () => {
    const bad = { ...good.taskDefinitions[0], handoffTarget: { kind: 'bogus', value: 'x' } };
    expect(() => parseTemplate({ ...good, taskDefinitions: [bad] })).toThrow(/handoffTarget/i);
  });
  it('rejects an invalid handoffTarget channel', () => {
    const bad = { ...good.taskDefinitions[0], handoffTarget: { kind: 'role', value: 'x', channel: 42 } };
    expect(() => parseTemplate({ ...good, taskDefinitions: [bad] })).toThrow(/channel/i);
  });
  it('rejects a non-boolean requiresAck', () => {
    const bad = { ...good.taskDefinitions[0], requiresAck: 'yes' };
    expect(() => parseTemplate({ ...good, taskDefinitions: [bad] })).toThrow(/requiresAck/i);
  });
});
