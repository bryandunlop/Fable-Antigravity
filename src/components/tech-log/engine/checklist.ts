import type {
  ChecklistTemplate, ChecklistItemDef, ChecklistItemEntry, ChecklistItemState, ChecklistInstance,
  ChecklistInteractionMode, AircraftType, ChecklistPhase, Personnel,
} from '../types';

/** D58 — the mode a template is worked in. Absent means `CLAIM_COMPLETE`: pre-D58 templates and
 *  every instance pinned to them keep the two-tap model unchanged. */
export function interactionModeOf(template: ChecklistTemplate): ChecklistInteractionMode {
  return template.interactionMode ?? 'CLAIM_COMPLETE';
}

export function buildInitialEntries(template: ChecklistTemplate): ChecklistItemEntry[] {
  return template.sections.flatMap(s => s.items).map(def => ({ itemDefId: def.id, state: 'OPEN' as const }));
}

function allItems(template: ChecklistTemplate): ChecklistItemDef[] {
  return template.sections.flatMap(s => s.items);
}

/**
 * Freeze-at-signature. Once `signatureId` is set the instance IS the signed regulatory record, so
 * every mutator below refuses it outright rather than each one remembering to check. A correction
 * to a signed checklist is a superseding instance, never an in-place edit.
 */
function isFrozen(instance: ChecklistInstance): boolean {
  return Boolean(instance.signatureId);
}

export function claimItem(
  instance: ChecklistInstance,
  itemDefId: string,
  byOid: string,
  atUtc: string,
): ChecklistInstance {
  if (isFrozen(instance)) return instance;
  return {
    ...instance,
    entries: instance.entries.map(e => {
      if (e.itemDefId !== itemDefId || e.state !== 'OPEN') return e;
      return { ...e, state: 'IN_PROGRESS', startedByOid: byOid, startedAtUtc: atUtc };
    }),
  };
}

/**
 * D58 — which states this may complete FROM depends on the template's interaction mode.
 *
 * `CLAIM_COMPLETE` (the default, and every pre-D58 template): strictly `IN_PROGRESS → DONE`. The
 * claim is not ceremony — it is what stops two techs working the same servicing line.
 * `SINGLE_TAP`: `OPEN → DONE` as well, leaving `startedBy*` unset because no claim happened. An
 * already-claimed entry still completes, so an instance carrying claims from any other route is
 * never stranded.
 */
export function completeItem(
  instance: ChecklistInstance,
  template: ChecklistTemplate,
  itemDefId: string,
  byOid: string,
  atUtc: string,
  extra?: { values?: Record<string, string>; note?: string },
): ChecklistInstance {
  if (isFrozen(instance)) return instance;
  const completableFrom: readonly ChecklistItemState[] = interactionModeOf(template) === 'SINGLE_TAP'
    ? ['OPEN', 'IN_PROGRESS']
    : ['IN_PROGRESS'];
  return {
    ...instance,
    entries: instance.entries.map(e => {
      if (e.itemDefId !== itemDefId || !completableFrom.includes(e.state)) return e;
      return {
        ...e, state: 'DONE', completedByOid: byOid, completedAtUtc: atUtc,
        values: extra?.values ?? e.values, note: extra?.note ?? e.note,
      };
    }),
  };
}

/** The items a batch mark-off is scoped over — the whole checklist, or one section. */
function scopedItems(template: ChecklistTemplate, sectionId?: string): ChecklistItemDef[] {
  const sections = sectionId ? template.sections.filter(s => s.id === sectionId) : template.sections;
  return sections.flatMap(s => s.items);
}

/**
 * D58 — "mark all remaining". Completes every OPEN item of kind `CHECK` in scope and nothing else.
 *
 * MEASUREMENT and NOTE items are deliberately skipped: they exist to capture a reading or a written
 * observation, and a bulk tap has none to give — auto-completing them would record a value nobody
 * took. Anything already DONE, NA or IN_PROGRESS is left exactly as it stands, and nothing is ever
 * marked N/A (that needs a typed reason, per item). Only ever acts in `SINGLE_TAP` mode.
 */
export function completeAllOpenChecks(
  instance: ChecklistInstance,
  template: ChecklistTemplate,
  byOid: string,
  atUtc: string,
  opts?: { sectionId?: string },
): ChecklistInstance {
  if (isFrozen(instance) || interactionModeOf(template) !== 'SINGLE_TAP') return instance;
  const markable = new Set(
    scopedItems(template, opts?.sectionId).filter(i => i.kind === 'CHECK').map(i => i.id),
  );
  return {
    ...instance,
    entries: instance.entries.map(e => {
      if (e.state !== 'OPEN' || !markable.has(e.itemDefId)) return e;
      return { ...e, state: 'DONE', completedByOid: byOid, completedAtUtc: atUtc };
    }),
  };
}

/**
 * What `completeAllOpenChecks` would do, so the confirm step can state it before it happens:
 * `willMark` is what the tap completes, `willSkip` is every other unresolved item in scope — the
 * typed-input ones and anything already claimed. Resolved items (DONE/NA) appear in neither.
 */
export function batchMarkSummary(
  instance: ChecklistInstance,
  template: ChecklistTemplate,
  opts?: { sectionId?: string },
): { willMark: ChecklistItemDef[]; willSkip: ChecklistItemDef[] } {
  if (interactionModeOf(template) !== 'SINGLE_TAP') return { willMark: [], willSkip: [] };
  const byId = new Map(instance.entries.map(e => [e.itemDefId, e]));
  const willMark: ChecklistItemDef[] = [];
  const willSkip: ChecklistItemDef[] = [];
  for (const def of scopedItems(template, opts?.sectionId)) {
    const state = byId.get(def.id)?.state ?? 'OPEN';
    if (state === 'DONE' || state === 'NA') continue;
    if (state === 'OPEN' && def.kind === 'CHECK') willMark.push(def);
    else willSkip.push(def);
  }
  return { willMark, willSkip };
}

export function markNotApplicable(
  instance: ChecklistInstance,
  template: ChecklistTemplate,
  itemDefId: string,
  byOid: string,
  atUtc: string,
  reason: string,
): ChecklistInstance {
  if (isFrozen(instance)) return instance;
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
    // A clone is the same form for another fleet type — it inherits how its items are worked (D58).
    interactionMode: args.source.interactionMode,
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
