import { describe, it, expect } from 'vitest';
import {
  conditionToBuilder, builderToCondition, defaultDueRule, slugifyTaskId, bumpedTemplatePayload,
  publishTaskIds, draftFromDef, defFromDraft,
} from './templateEditor';
import { parseDueRule, parseTemplate } from '../../scheduling/store';
import type { ChecklistTemplate, Condition, DueRule, TaskDefinition } from '../../scheduling/engine';

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

describe('publishTaskIds', () => {
  it('keeps stable ids and slugs new tasks from their titles', () => {
    expect(publishTaskIds([
      { id: 'confirm-crew', title: 'Confirm Crew' },
      { id: 'new-task', title: 'Order Catering' },
    ])).toEqual(['confirm-crew', 'order-catering']);
  });

  it('a new task reordered above an existing task with the same slug cannot steal its id', () => {
    const ids = publishTaskIds([
      { id: 'new-task', title: 'Confirm Crew' },      // new item, moved to the top
      { id: 'confirm-crew', title: 'Confirm Crew' },  // existing item with its stable id
    ]);
    expect(ids[1]).toBe('confirm-crew');           // the stable id is untouched
    expect(new Set(ids).size).toBe(ids.length);    // publish never emits duplicate ids
    expect(ids[0]).toBe('confirm-crew-2');         // the new item dedupes against ALL stable ids
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

describe('draftFromDef ⇄ defFromDraft — Phase 2 fields survive the editor', () => {
  it('preserves appliesTo + reTriggerOn through the draft round-trip', () => {
    const def: TaskDefinition = {
      id: 'fbo', title: 'FBO handling', ownerRole: 'scheduling', category: 'handling', order: 1,
      dueRule: { kind: 'businessDaysBeforeEtd', days: 1 }, requiresAck: false,
      appliesTo: { endpoint: 'both', airport: { kind: 'prefix', prefix: 'K', except: ['KLUK'] } },
      reTriggerOn: ['legScheduleChange', 'aircraftChange'],
    };
    const round = defFromDraft(draftFromDef(def), 1);
    expect(round.appliesTo).toEqual(def.appliesTo);
    expect(round.reTriggerOn).toEqual(def.reTriggerOn);
  });

  it('a trip-level task stays trip-level (no appliesTo, no reTriggerOn)', () => {
    const def: TaskDefinition = {
      id: 'catering', title: 'Catering', ownerRole: 'scheduling', category: 'ops', order: 1,
      dueRule: { kind: 'businessDaysBeforeEtd', days: 7 }, requiresAck: false,
    };
    const round = defFromDraft(draftFromDef(def), 1);
    expect(round.appliesTo).toBeUndefined();
    expect(round.reTriggerOn).toBeUndefined();
  });
});
