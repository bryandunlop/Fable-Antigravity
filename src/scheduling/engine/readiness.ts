import type { TaskInstance, TaskStatus } from './types';

export type ReadinessState = 'READY' | 'NOT_READY' | 'BLOCKED';
export interface Readiness {
  state: ReadinessState;
  blocker?: string;
  completion: number; // 0..1
}

export function deriveSchedulingReadiness(tasks: TaskInstance[]): Readiness {
  // Cancelled tasks no longer apply to the trip — exclude them from the rollup entirely so a
  // removed-leg task neither inflates completion nor holds the trip NOT_READY.
  const relevant = tasks.filter((t) => t.status !== 'cancelled');
  if (relevant.length === 0) return { state: 'READY', completion: 1 };
  const settled = (s: TaskStatus) => s === 'done' || s === 'n_a';
  const completion = relevant.filter((t) => settled(t.status)).length / relevant.length;

  const blocked = relevant.find((t) => t.status === 'blocked');
  if (blocked) return { state: 'BLOCKED', blocker: blocked.id, completion };

  const anyOpen = relevant.some((t) => !settled(t.status));
  return { state: anyOpen ? 'NOT_READY' : 'READY', completion };
}
