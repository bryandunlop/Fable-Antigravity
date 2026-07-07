import type { ChecklistTemplate } from './types';

export interface PilotTaskDef {
  id: string;
  title: string;
  category: string;
}

/** Per-trip checklist items (deduped by task-def id) — the ones eligible for pilot visibility. */
export function perTripTaskDefs(templates: ChecklistTemplate[]): PilotTaskDef[] {
  const byId = new Map<string, PilotTaskDef>();
  for (const t of templates) {
    if (t.triggerType !== 'per_trip') continue;
    for (const d of t.taskDefinitions) {
      if (!byId.has(d.id)) byId.set(d.id, { id: d.id, title: d.title, category: d.category });
    }
  }
  return [...byId.values()];
}

/** Default pilot-visible set: per-trip items that already hand off to the pilot role. */
export function defaultPilotVisibleDefs(templates: ChecklistTemplate[]): string[] {
  const ids = new Set<string>();
  for (const t of templates) {
    if (t.triggerType !== 'per_trip') continue;
    for (const d of t.taskDefinitions) {
      if (d.handoffTarget?.kind === 'role' && d.handoffTarget.value === 'pilot') ids.add(d.id);
    }
  }
  return [...ids];
}
