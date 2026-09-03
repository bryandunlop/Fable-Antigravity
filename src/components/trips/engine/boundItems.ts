// Checklist items seen from the booking (D110 slice 2). The item store is the scheduling store; the
// booking's facts (people, legs, crew, cutoffs) are here. These helpers join the two so the People
// tab, the board mark and the Checklist tab read ONE instance rather than three descriptions of it.
// Pure.

import type { TaskInstance } from '../../../scheduling/engine';
import type { CutoffDue } from './cutoffs';
import type { DocumentGate } from './documentGates';

const isOpen = (i: TaskInstance) => i.status === 'open' || i.status === 'in_progress' || i.status === 'blocked';

/** Open items bound to this person. */
export function itemsForPerson(instances: TaskInstance[], personId: string): TaskInstance[] {
  return instances.filter(i => isOpen(i) && i.boundTo?.kind === 'person' && i.boundTo.id === personId);
}

/** Open items bound to this leg. */
export function itemsForLeg(instances: TaskInstance[], legId: string): TaskInstance[] {
  return instances.filter(i => isOpen(i) && i.boundTo?.kind === 'leg' && i.boundTo.id === legId);
}

/** Open items bound to the crew. */
export function itemsForCrew(instances: TaskInstance[]): TaskInstance[] {
  return instances.filter(i => isOpen(i) && i.boundTo?.kind === 'crew');
}

/**
 * The document gates that belong to this item: a person-bound item carries the gates raised on
 * that person. So the passport item on the Checklist tab and the gate on the People tab are the
 * same thing seen from two doors, and "blocking" on the item is the gate still unresolved.
 */
export function gatesForItem(item: TaskInstance, gates: DocumentGate[]): DocumentGate[] {
  if (item.boundTo?.kind !== 'person') return [];
  const pid = item.boundTo.id;
  return gates.filter(g => g.personId === pid);
}

export interface BoundCount { kind: 'leg' | 'person' | 'crew' | 'trip'; id: string; label: string; open: number; cleared: number; gates: number }

/** The booking's map with open counts — the right-hand column of the Checklist tab. */
export function boundCounts(
  instances: TaskInstance[],
  legs: Array<{ id: string; label: string }>,
  people: Array<{ id: string; name: string }>,
  blockingGates: DocumentGate[],
): BoundCount[] {
  const count = (pred: (i: TaskInstance) => boolean) => {
    const xs = instances.filter(i => pred(i) && i.status !== 'cancelled');
    return { open: xs.filter(isOpen).length, cleared: xs.filter(i => !isOpen(i)).length };
  };
  const out: BoundCount[] = [];
  for (const l of legs) out.push({ kind: 'leg', id: l.id, label: l.label, gates: blockingGates.filter(g => g.legId === l.id).length, ...count(i => i.boundTo?.kind === 'leg' && i.boundTo.id === l.id) });
  for (const p of people) out.push({ kind: 'person', id: p.id, label: p.name, gates: blockingGates.filter(g => g.personId === p.id).length, ...count(i => i.boundTo?.kind === 'person' && i.boundTo.id === p.id) });
  out.push({ kind: 'crew', id: 'crew', label: 'Crew', gates: 0, ...count(i => i.boundTo?.kind === 'crew') });
  out.push({ kind: 'trip', id: 'trip', label: 'Whole trip', gates: 0, ...count(i => !i.boundTo) });
  return out;
}

/** The booking's cutoffs as rail markers for `buildChecklistJourney`. */
export function cutoffMarkers(cutoffs: CutoffDue[]): Array<{ key: string; label: string; atUtc: string; note?: string }> {
  return cutoffs.map(c => ({ key: c.kind, label: c.label, atUtc: c.dueUtc, note: c.source === 'override' ? `moved by ${c.movedBy ?? 'scheduling'}` : undefined }));
}
