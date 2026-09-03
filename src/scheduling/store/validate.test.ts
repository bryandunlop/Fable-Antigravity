import { describe, it, expect } from 'vitest';
import { parseDueRule, parseCondition, parseTemplate } from './validate';

describe('parseDueRule', () => {
  it('accepts a valid rule', () => {
    expect(parseDueRule({ kind: 'hoursBeforeEtd', hours: 24 })).toEqual({ kind: 'hoursBeforeEtd', hours: 24 });
  });
  it('accepts the calendar daysBeforeEtd rule', () => {
    expect(parseDueRule({ kind: 'daysBeforeEtd', days: 7 })).toEqual({ kind: 'daysBeforeEtd', days: 7 });
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
  it('accepts a routeTouchesCountry condition', () => {
    expect(parseCondition({ kind: 'routeTouchesCountry', country: 'CN' })).toEqual({ kind: 'routeTouchesCountry', country: 'CN' });
  });
  it('accepts a routeTouchesIcaoPrefix condition', () => {
    expect(parseCondition({ kind: 'routeTouchesIcaoPrefix', prefix: 'EG' })).toEqual({ kind: 'routeTouchesIcaoPrefix', prefix: 'EG' });
  });
  it('still throws on an unknown kind', () => {
    expect(() => parseCondition({ kind: 'stillBogus' })).toThrow(/condition/i);
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
  it('rejects duplicate task ids (a duplicate silently drops a checklist item downstream)', () => {
    const dupe = { ...good.taskDefinitions[0], title: 'same id, different title' };
    expect(() => parseTemplate({ ...good, taskDefinitions: [good.taskDefinitions[0], dupe] })).toThrow(/duplicate/i);
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

describe('parseTaskDef — Phase 2 appliesTo + reTriggerOn', () => {
  const good = {
    id: 't', name: 'D', triggerType: 'per_trip', scope: 'domestic', version: 1,
    status: 'published', effectiveFrom: '2026-01-01T00:00:00.000Z',
    taskDefinitions: [{ id: 'a', title: 'x', ownerRole: 'scheduling', category: 'ops', order: 1,
      dueRule: { kind: 'hoursBeforeEtd', hours: 24 }, requiresAck: false }],
  };
  const withDef = (extra: Record<string, unknown>) =>
    parseTemplate({ ...good, taskDefinitions: [{ ...good.taskDefinitions[0], ...extra }] });

  it('accepts appliesTo (prefix+except) and reTriggerOn', () => {
    const d = withDef({
      appliesTo: { endpoint: 'both', airport: { kind: 'prefix', prefix: 'K', except: ['KLUK'] } },
      reTriggerOn: ['legScheduleChange', 'aircraftChange'],
    }).taskDefinitions[0];
    expect(d.appliesTo).toEqual({ endpoint: 'both', airport: { kind: 'prefix', prefix: 'K', except: ['KLUK'] } });
    expect(d.reTriggerOn).toEqual(['legScheduleChange', 'aircraftChange']);
  });
  it('accepts an exact-airport appliesTo', () => {
    expect(withDef({ appliesTo: { endpoint: 'arrival', airport: { kind: 'exact', icao: 'KBOS' } } }).taskDefinitions[0].appliesTo)
      .toEqual({ endpoint: 'arrival', airport: { kind: 'exact', icao: 'KBOS' } });
  });
  it('rejects an invalid endpoint', () => {
    expect(() => withDef({ appliesTo: { endpoint: 'sideways', airport: { kind: 'exact', icao: 'KBOS' } } })).toThrow(/endpoint/i);
  });
  it('rejects an invalid reTriggerOn value', () => {
    expect(() => withDef({ reTriggerOn: ['legScheduleChange', 'bogus'] })).toThrow(/reTriggerOn/i);
  });
  it('still parses a task def with neither field (back-compat)', () => {
    const d = withDef({}).taskDefinitions[0];
    expect(d.appliesTo).toBeUndefined();
    expect(d.reTriggerOn).toBeUndefined();
  });
});

describe('validator hardening — silently-useless configs are rejected (audit #6)', () => {
  const perTrip = {
    id: 't', name: 'D', triggerType: 'per_trip', scope: 'domestic', version: 1,
    status: 'published', effectiveFrom: '2026-01-01T00:00:00.000Z',
    taskDefinitions: [{ id: 'a', title: 'x', ownerRole: 'scheduling', category: 'ops', order: 1,
      dueRule: { kind: 'hoursBeforeEtd', hours: 24 }, requiresAck: false }],
  };
  const withDef = (extra: Record<string, unknown>) =>
    parseTemplate({ ...perTrip, taskDefinitions: [{ ...perTrip.taskDefinitions[0], ...extra }] });

  it('rejects an empty prefix (would silently match every airport)', () => {
    expect(() => withDef({ appliesTo: { endpoint: 'both', airport: { kind: 'prefix', prefix: '' } } })).toThrow(/prefix/i);
  });
  it('rejects an empty exact icao (would silently match no airport)', () => {
    expect(() => withDef({ appliesTo: { endpoint: 'arrival', airport: { kind: 'exact', icao: '' } } })).toThrow(/icao/i);
  });
  it('rejects appliesTo on a recurring template (per-airport fan-out never runs for recurring)', () => {
    const recurring = { ...perTrip, triggerType: 'recurring', scope: 'daily',
      taskDefinitions: [{ ...perTrip.taskDefinitions[0], dueRule: { kind: 'weekday', day: 'MON' },
        appliesTo: { endpoint: 'both', airport: { kind: 'exact', icao: 'KBOS' } } }] };
    expect(() => parseTemplate(recurring)).toThrow(/recurring/i);
  });
  it('rejects reTriggerOn on a recurring template (reconcile only runs for per-trip)', () => {
    const recurring = { ...perTrip, triggerType: 'recurring', scope: 'daily',
      taskDefinitions: [{ ...perTrip.taskDefinitions[0], dueRule: { kind: 'weekday', day: 'MON' },
        reTriggerOn: ['legScheduleChange'] }] };
    expect(() => parseTemplate(recurring)).toThrow(/recurring/i);
  });
});

describe('bindTo survives validation (D110 slice 2)', () => {
  const base = { id: 'tpl', name: 'T', triggerType: 'per_trip', scope: 'international', version: 1, status: 'published', effectiveFrom: '2026-01-01T00:00:00.000Z' };
  const def = (extra: Record<string, unknown>) => ({ id: 'd', title: 'D', ownerRole: 'scheduling', category: 'crew', order: 1, dueRule: { kind: 'hoursBeforeEtd', hours: 24 }, requiresAck: false, ...extra });
  it('keeps person and crew bindings', () => {
    expect(parseTemplate({ ...base, taskDefinitions: [def({ bindTo: 'person' })] }).taskDefinitions[0].bindTo).toBe('person');
    expect(parseTemplate({ ...base, taskDefinitions: [def({ bindTo: 'crew' })] }).taskDefinitions[0].bindTo).toBe('crew');
  });
  it('refuses an unknown binding, and a binding on a per-airport task', () => {
    expect(() => parseTemplate({ ...base, taskDefinitions: [def({ bindTo: 'leg' })] })).toThrow(/bindTo/);
    expect(() => parseTemplate({ ...base, taskDefinitions: [def({ bindTo: 'person', appliesTo: { endpoint: 'both', airport: { kind: 'prefix', prefix: 'K' } } })] })).toThrow(/bindTo/);
  });
});
