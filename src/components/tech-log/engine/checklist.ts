import type {
  ChecklistTemplate, ChecklistItemDef, ChecklistItemEntry, ChecklistInstance,
  AircraftType, ChecklistPhase, Personnel,
} from '../types';

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

export function latestPublishedTemplate(
  templates: ChecklistTemplate[],
  aircraftType: AircraftType,
  phase: ChecklistPhase,
): ChecklistTemplate | undefined {
  return templates
    .filter(t => t.aircraftType === aircraftType && t.phase === phase && t.status === 'PUBLISHED')
    .sort((a, b) => b.version - a.version)[0];
}

export function nextVersionFor(templates: ChecklistTemplate[], templateId: string): number {
  const versions = templates.filter(t => t.id === templateId).map(t => t.version);
  return versions.length ? Math.max(...versions) + 1 : 1;
}

export function publishTemplate(draft: ChecklistTemplate, nowUtc: string): ChecklistTemplate {
  return { ...draft, status: 'PUBLISHED', effectiveFrom: nowUtc };
}

export function cloneTemplateForType(args: {
  source: ChecklistTemplate;
  newTemplateId: string;
  newAircraftType: AircraftType;
  newIdPrefix: string;
  createdByOid: string;
  nowUtc: string;
}): ChecklistTemplate {
  let n = 0;
  const fresh = () => `${args.newIdPrefix}-${++n}`;
  return {
    id: args.newTemplateId,
    aircraftType: args.newAircraftType,
    phase: args.source.phase,
    aodReference: args.source.aodReference,
    version: 1,
    status: 'DRAFT',
    clonedFromTemplateId: args.source.id,
    clonedFromVersion: args.source.version,
    sections: args.source.sections.map(s => ({
      id: fresh(),
      title: s.title,
      items: s.items.map(i => ({ ...i, id: fresh(), fields: i.fields?.map(f => ({ ...f, id: fresh() })) })),
    })),
    createdByOid: args.createdByOid,
    createdAtUtc: args.nowUtc,
  };
}

export function canEditChecklistTemplates(user: Personnel): boolean {
  return user.role === 'MAINTENANCE' && !!user.isSupervisor;
}
