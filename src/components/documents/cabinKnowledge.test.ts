import { describe, it, expect } from 'vitest';
import { classFor, CABIN_SECTIONS } from './classes';
import { canAuthor, canApprove, validateDecision, validateDirectPublish } from './engine/lifecycle';
import { getSeedState } from './mockData';
import { currentRevision } from './engine/revisions';
import { stepFormFromSections } from './engine/stepForm';
import { stepNumbers } from './engine/blocks';

const cfg = classFor('cabin-knowledge');

describe('D75 — cabin knowledge class', () => {
  it('is controlled: an entry reaches the crew only through the FA manager', () => {
    expect(cfg.controlled).toBe(true);
    expect(validateDirectPublish(cfg, { status: 'draft', sections: [] }).ok).toBe(false);
  });

  it('lets a line flight attendant draft but never publish their own entry', () => {
    expect(canAuthor(cfg, ['inflight'])).toBe(true);
    // The whole reason Bryan chose four-eyes here — authoring is wide, approval is not.
    expect(canApprove(cfg, ['inflight'])).toBe(false);
    expect(canApprove(cfg, ['fa-manager'])).toBe(true);
  });

  it('blocks self-approval even for a manager who wrote the entry', () => {
    const rev = { status: 'pending-approval' as const, authorUserId: 'role:fa-manager' };
    expect(validateDecision(cfg, rev, 'role:fa-manager', ['fa-manager']).ok).toBe(false);
    expect(validateDecision(cfg, rev, 'role:lead-fa', ['lead-fa']).ok).toBe(true);
  });

  it('is fleet-scoped and step-form authored', () => {
    expect(cfg.fleetScoped).toBe(true);
    expect(cfg.stepForm).toBe(true);
  });

  it('offers only cabin sections — no maintenance vocabulary leaks in', () => {
    expect(cfg.categories).toEqual([...CABIN_SECTIONS]);
    expect(cfg.categories).not.toContain('Messages & faults');
  });
});

describe('D75 — cabin knowledge seeds', () => {
  const state = getSeedState();
  const docs = state.docs.filter((d) => d.classId === 'cabin-knowledge');

  it('seeds published entries whose approver is not their author', () => {
    expect(docs.length).toBeGreaterThan(0);
    for (const doc of docs) {
      const rev = currentRevision(doc.id, state.revisions);
      expect(rev, `${doc.id} has no published revision`).toBeTruthy();
      expect(rev!.decidedByUserId).toBeTruthy();
      expect(rev!.decidedByUserId).not.toBe(rev!.authorUserId);
    }
  });

  it('seeds content the step form can actually reopen — no entry the FA cannot edit', () => {
    for (const doc of docs) {
      const rev = currentRevision(doc.id, state.revisions)!;
      const { model, lossy } = stepFormFromSections(rev.sections);
      expect(lossy, `${doc.id} is not reopenable in the step form`).toBe(false);
      expect(model.steps.length).toBeGreaterThan(1);
    }
  });

  it('numbers every seeded entry from the shared step engine', () => {
    for (const doc of docs) {
      const rev = currentRevision(doc.id, state.revisions)!;
      const numbers = [...stepNumbers(rev.sections.flatMap((s) => s.blocks)).values()];
      expect(numbers).toEqual(numbers.map((_, i) => i + 1));
    }
  });

  it('scopes every seeded entry to at least one fleet type', () => {
    for (const doc of docs) {
      expect(currentRevision(doc.id, state.revisions)!.fleetTypes?.length).toBeGreaterThan(0);
    }
  });
});
