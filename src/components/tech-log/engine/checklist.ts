import type { ChecklistTemplate, ChecklistItemDef, ChecklistItemEntry, ChecklistInstance } from '../types';

export function buildInitialEntries(template: ChecklistTemplate): ChecklistItemEntry[] {
  return template.sections.flatMap(s => s.items).map(def => ({ itemDefId: def.id, state: 'OPEN' as const }));
}

function allItems(template: ChecklistTemplate): ChecklistItemDef[] {
  return template.sections.flatMap(s => s.items);
}

export function claimItem(
  instance: ChecklistInstance,
  itemDefId: string,
  byOid: string,
  atUtc: string,
): ChecklistInstance {
  return {
    ...instance,
    entries: instance.entries.map(e => {
      if (e.itemDefId !== itemDefId || e.state !== 'OPEN') return e;
      return { ...e, state: 'IN_PROGRESS', startedByOid: byOid, startedAtUtc: atUtc };
    }),
  };
}

export function completeItem(
  instance: ChecklistInstance,
  itemDefId: string,
  byOid: string,
  atUtc: string,
  extra?: { values?: Record<string, string>; note?: string },
): ChecklistInstance {
  return {
    ...instance,
    entries: instance.entries.map(e => {
      if (e.itemDefId !== itemDefId || e.state !== 'IN_PROGRESS') return e;
      return {
        ...e, state: 'DONE', completedByOid: byOid, completedAtUtc: atUtc,
        values: extra?.values ?? e.values, note: extra?.note ?? e.note,
      };
    }),
  };
}

export function markNotApplicable(
  instance: ChecklistInstance,
  template: ChecklistTemplate,
  itemDefId: string,
  byOid: string,
  atUtc: string,
  reason: string,
): ChecklistInstance {
  const def = allItems(template).find(i => i.id === itemDefId);
  if (!def || def.requiredToRelease) return instance;
  return {
    ...instance,
    entries: instance.entries.map(e => {
      if (e.itemDefId !== itemDefId || e.state === 'DONE') return e;
      return { ...e, state: 'NA', completedByOid: byOid, completedAtUtc: atUtc, naReason: reason };
    }),
  };
}

export function isReleaseGated(
  instance: ChecklistInstance,
  template: ChecklistTemplate,
): { ok: boolean; missing: ChecklistItemDef[] } {
  const byId = new Map(instance.entries.map(e => [e.itemDefId, e]));
  const missing = allItems(template).filter(def => {
    if (!def.requiredToRelease) return false;
    const entry = byId.get(def.id);
    return !entry || (entry.state !== 'DONE' && entry.state !== 'NA');
  });
  return { ok: missing.length === 0, missing };
}

export function checklistProgress(
  instance: ChecklistInstance,
  template: ChecklistTemplate,
): { done: number; total: number } {
  const total = allItems(template).length;
  const done = instance.entries.filter(e => e.state === 'DONE' || e.state === 'NA').length;
  return { done, total };
}
