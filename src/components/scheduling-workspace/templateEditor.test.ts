import { describe, it, expect } from 'vitest';
import {
  conditionToBuilder, builderToCondition, defaultDueRule, slugifyTaskId, bumpedTemplatePayload,
} from './templateEditor';
import { parseDueRule, parseTemplate } from '../../scheduling/store';
import type { ChecklistTemplate, Condition, DueRule } from '../../scheduling/engine';

describe('conditionToBuilder ⇄ builderToCondition', () => {
  it('undefined / always → always mode → omitted condition', () => {
    expect(conditionToBuilder(undefined)).toEqual({ mode: 'always' });
    expect(conditionToBuilder({ kind: 'always' })).toEqual({ mode: 'always' });
    expect(builderToCondition({ mode: 'always' })).toBeUndefined();
  });

  it('round-trips a single leaf (routeTouchesCountry GB)', () => {
    const cond: Condition = { kind: 'routeTouchesCountry', country: 'GB' };
    const b = conditionToBuilder(cond);
    expect(b.mode).toBe('allOf');
    expect(builderToCondition(b)).toEqual(cond);
  });

  it('round-trips the seeded 7-pax G650ER allOf', () => {
    const cond: Condition = {
      kind: 'allOf',
      conditions: [
        { kind: 'paxCountAtLeast', value: 7 },
        { kind: 'aircraftTypeEquals', value: 'G650ER' },
      ],
    };
    expect(builderToCondition(conditionToBuilder(cond))).toEqual(cond);
  });

  it('round-trips anyOf and negated leaves', () => {
    const cond: Condition = {
      kind: 'anyOf',
      conditions: [
        { kind: 'tripType', equals: 'international' },
        { kind: 'not', condition: { kind: 'isWeekendDeparture' } },
      ],
    };
    expect(builderToCondition(conditionToBuilder(cond))).toEqual(cond);
  });

  it('preserves an unrepresentable nested condition as custom, byte-identical', () => {
    const cond: Condition = {
      kind: 'allOf',
      conditions: [{ kind: 'anyOf', conditions: [{ kind: 'tailEquals', value: 'N2PG' }] }],
    };
    const b = conditionToBuilder(cond);
    expect(b.mode).toBe('custom');
    expect(builderToCondition(b)).toEqual(cond);
  });

  it('an empty leaf list collapses to always', () => {
    expect(builderToCondition({ mode: 'allOf', leaves: [] })).toBeUndefined();
  });
});

describe('defaultDueRule', () => {
  it('produces a validator-accepted rule for every kind', () => {
    const kinds: DueRule['kind'][] = [
      'dayOfTimeLocal', 'weekday', 'dayOfMonth', 'quarterWeek', 'annualDate',
      'hoursBeforeEtd', 'businessDaysBeforeEtd', 'monthsBeforeEtd',
    ];
    for (const kind of kinds) {
      expect(() => parseDueRule(defaultDueRule(kind))).not.toThrow();
      expect(defaultDueRule(kind).kind).toBe(kind);
    }
  });
});

describe('slugifyTaskId', () => {
  it('kebab-cases and de-duplicates against existing ids', () => {
    const existing = new Set(['send-crew-brief']);
    expect(slugifyTaskId('Send Crew Brief!', existing)).toBe('send-crew-brief-2');
    expect(slugifyTaskId('Confirm PIC (INTL)', existing)).toBe('confirm-pic-intl');
  });
});

describe('bumpedTemplatePayload', () => {
  const template: ChecklistTemplate = {
    id: 'domestic-per-trip', name: 'Domestic per-trip', triggerType: 'per_trip', scope: 'domestic',
    version: 3, status: 'published', effectiveFrom: '2026-01-01T00:00:00.000Z',
    taskDefinitions: [{
      id: 'a', title: 'A', ownerRole: 'scheduling', category: 'ops', order: 1,
      dueRule: { kind: 'hoursBeforeEtd', hours: 48 }, requiresAck: false,
    }],
  };

  it('bumps the version, stays published, and passes parseTemplate', () => {
    const payload = bumpedTemplatePayload(template, template.taskDefinitions);
    const parsed = parseTemplate(payload);
    expect(parsed.version).toBe(4);
    expect(parsed.status).toBe('published');
    expect(parsed.taskDefinitions).toHaveLength(1);
  });
});
