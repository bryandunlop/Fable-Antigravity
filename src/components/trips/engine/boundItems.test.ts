import { describe, expect, it } from 'vitest';
import type { TaskInstance } from '../../../scheduling/engine';
import type { DocumentGate } from './documentGates';
import { boundCounts, gatesForItem, itemsForPerson, cutoffMarkers } from './boundItems';

const inst = (id: string, boundTo: TaskInstance['boundTo'], status: TaskInstance['status'] = 'open'): TaskInstance => ({
  id, templateId: 't', templateVersion: 1, taskDefId: id, title: id, category: 'ops', order: 1, tripId: 'trip-1', runDate: null,
  status, ownerRole: 'scheduling', dueAtUtc: '2026-09-10T12:00:00.000Z', requiresAck: false, ackState: 'n_a', auditTrail: [], boundTo,
});
const gate: DocumentGate = { personId: 'P-SREYES', personName: 'S. Reyes', legId: 'leg-b', legIndex: 1, legDate: '2026-09-13', document: { id: 'd1', kind: 'passport', label: 'Passport', country: 'US', numberMasked: '••1', expiresOn: '2026-11-30' } as never, kind: 'short-validity', reason: 'x' };

describe('one item, three doors (D110 slice 2)', () => {
  const xs = [
    inst('pax:A', { kind: 'person', id: 'P-REYES', label: 'A. Reyes' }, 'done'),
    inst('pax:S', { kind: 'person', id: 'P-SREYES', label: 'S. Reyes' }),
    inst('handler', { kind: 'leg', id: 'leg-b', label: 'Leg 2 · LSGG' }),
    inst('brief', { kind: 'crew', id: 'crew', label: 'Crew' }),
    inst('insurance', undefined),
    inst('gone', { kind: 'person', id: 'P-SREYES', label: 'S. Reyes' }, 'cancelled'),
  ];
  it('the People tab reads a person\'s open items and the gate rides on the same item', () => {
    expect(itemsForPerson(xs, 'P-SREYES').map(i => i.id)).toEqual(['pax:S']);
    expect(itemsForPerson(xs, 'P-REYES')).toEqual([]);
    expect(gatesForItem(xs[1], [gate])).toEqual([gate]);
    expect(gatesForItem(xs[2], [gate])).toEqual([]);
  });
  it('the booking map counts open and cleared per fact, and a cancelled item counts nowhere', () => {
    const counts = boundCounts(xs, [{ id: 'leg-a', label: 'Leg 1' }, { id: 'leg-b', label: 'Leg 2' }], [{ id: 'P-REYES', name: 'A. Reyes' }, { id: 'P-SREYES', name: 'S. Reyes' }], [gate]);
    expect(counts.map(c => `${c.label}:${c.open}/${c.cleared}/${c.gates}`)).toEqual([
      'Leg 1:0/0/0', 'Leg 2:1/0/1', 'A. Reyes:0/1/0', 'S. Reyes:1/0/1', 'Crew:1/0/0', 'Whole trip:1/0/0',
    ]);
  });
  it('a moved cutoff says who moved it', () => {
    expect(cutoffMarkers([{ kind: 'names', label: 'Names', dueUtc: '2026-09-09T13:00:00.000Z', source: 'override', reason: 'r', movedBy: 'R. Calloway' }])[0].note).toBe('moved by R. Calloway');
  });
});
