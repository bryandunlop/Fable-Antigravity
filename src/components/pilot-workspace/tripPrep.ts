import type { TaskInstance } from '../../scheduling/engine';

export interface CompletedPrepItem {
  id: string;
  title: string;
  completedAtUtc?: string;
}

/**
 * The pilot's read-only "Trip prep" list: a trip's completed task instances whose task-def is
 * pilot-visible, ordered by checklist order. A projection over live state — no events, no ack.
 * `visible` is the current pilot-visibility set (read live from the store).
 */
export function completedVisibleItems(instances: TaskInstance[], visible: Set<string>): CompletedPrepItem[] {
  return instances
    .filter((x) => x.status === 'done' && visible.has(x.taskDefId))
    .sort((a, b) => a.order - b.order)
    .map((x) => ({ id: x.id, title: x.title, completedAtUtc: x.completedAtUtc }));
}
