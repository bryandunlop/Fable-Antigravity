import { describe, it, expect } from 'vitest';
import { riiSteps, pendingRiiSteps, riiStepsComplete } from './rii';
import type { WorkStep } from '../types';

const step = (id: string, p: Partial<WorkStep> = {}): WorkStep => ({ id, seq: 1, text: id, done: false, ...p });

describe('per-step RII helpers', () => {
  it('a card with no RII steps is trivially complete', () => {
    const steps = [step('a'), step('b', { done: true })];
    expect(riiSteps(steps)).toHaveLength(0);
    expect(pendingRiiSteps(steps)).toHaveLength(0);
    expect(riiStepsComplete(steps)).toBe(true);
  });

  it('an unsigned RII step is pending and blocks completion', () => {
    const steps = [step('a', { riiRequired: true, done: true })];
    expect(pendingRiiSteps(steps).map(s => s.id)).toEqual(['a']);
    expect(riiStepsComplete(steps)).toBe(false);
  });

  it('a done-but-unsigned RII step still blocks (done is not enough — needs the inspector signature)', () => {
    const steps = [step('a', { riiRequired: true, done: true, riiInspectorOid: 'INS1' })];
    expect(riiStepsComplete(steps)).toBe(false); // no riiSignatureId yet
  });

  it('all RII steps signed → complete', () => {
    const steps = [
      step('a', { riiRequired: true, done: true, riiSignatureId: 'sig-1', riiInspectorOid: 'INS1' }),
      step('b', { riiRequired: true, done: true, riiSignatureId: 'sig-2', riiInspectorOid: 'INS2' }),
      step('c', { done: true }),
    ];
    expect(riiSteps(steps)).toHaveLength(2);
    expect(pendingRiiSteps(steps)).toHaveLength(0);
    expect(riiStepsComplete(steps)).toBe(true);
  });

  it('one of two RII steps unsigned → still pending', () => {
    const steps = [
      step('a', { riiRequired: true, riiSignatureId: 'sig-1' }),
      step('b', { riiRequired: true }),
    ];
    expect(pendingRiiSteps(steps).map(s => s.id)).toEqual(['b']);
    expect(riiStepsComplete(steps)).toBe(false);
  });
});
