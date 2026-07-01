import type { TaskInstance } from './types';

export type ReadinessState = 'READY' | 'NOT_READY' | 'BLOCKED';
export interface Readiness {
  state: ReadinessState;
  blocker?: string;
  completion: number; // 0..1
}

export function deriveSchedulingReadiness(tasks: TaskInstance[]): Readiness {
  if (tasks.length === 0) return { state: 'READY', completion: 1 };
  const settled = (s: string) => s === 'done' || s === 'n_a';
  const completion = tasks.filter((t) => settled(t.status)).length / tasks.length;

  const blocked = tasks.find((t) => t.status === 'blocked');
  if (blocked) return { state: 'BLOCKED', blocker: blocked.id, completion };

  const anyOpen = tasks.some((t) => !settled(t.status));
  return { state: anyOpen ? 'NOT_READY' : 'READY', completion };
}
