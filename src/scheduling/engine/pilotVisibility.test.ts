import { describe, it, expect } from 'vitest';
import { perTripTaskDefs, defaultPilotVisibleDefs } from './pilotVisibility';
import type { ChecklistTemplate, TaskDefinition } from './types';

const def = (p: Partial<TaskDefinition> & { id: string }): TaskDefinition => ({
  title: `T ${p.id}`, ownerRole: 'scheduling', category: 'ops', order: 1,
  dueRule: { kind: 'hoursBeforeEtd', hours: 24 }, requiresAck: false, ...p,
});
const tmpl = (p: Partial<ChecklistTemplate> & { id: string; taskDefinitions: TaskDefinition[] }): ChecklistTemplate => ({
  name: p.id, triggerType: 'per_trip', scope: 'domestic', version: 1, status: 'published',
  effectiveFrom: '2026-01-01T00:00:00.000Z', ...p,
});

describe('perTripTaskDefs', () => {
  it('lists per-trip task defs deduped by id, ignoring recurring templates', () => {
    const templates = [
      tmpl({ id: 'dom', taskDefinitions: [def({ id: 'a', title: 'Crew brief', category: 'crew' }), def({ id: 'b' })] }),
      tmpl({ id: 'intl', scope: 'international', taskDefinitions: [def({ id: 'a' }), def({ id: 'c' })] }), // 'a' duplicate
      tmpl({ id: 'daily', triggerType: 'recurring', scope: 'daily', taskDefinitions: [def({ id: 'z' })] }),
    ];
    const got = perTripTaskDefs(templates);
    expect(got.map(d => d.id).sort()).toEqual(['a', 'b', 'c']);
    expect(got.find(d => d.id === 'a')).toEqual({ id: 'a', title: 'Crew brief', category: 'crew' });
  });
});

describe('defaultPilotVisibleDefs', () => {
  it('seeds from per-trip defs that hand off to the pilot role', () => {
    const templates = [
      tmpl({ id: 'dom', taskDefinitions: [
        def({ id: 'pilotItem', handoffTarget: { kind: 'role', value: 'pilot' } }),
        def({ id: 'deptItem', handoffTarget: { kind: 'dept', value: 'universal-aviation' } }),
        def({ id: 'plain' }),
      ] }),
      tmpl({ id: 'daily', triggerType: 'recurring', scope: 'daily', taskDefinitions: [
        def({ id: 'recurringPilot', handoffTarget: { kind: 'role', value: 'pilot' } }), // recurring → excluded
      ] }),
    ];
    expect(defaultPilotVisibleDefs(templates)).toEqual(['pilotItem']);
  });
});
