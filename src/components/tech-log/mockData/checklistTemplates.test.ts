import { describe, it, expect } from 'vitest';
import { SEED_CHECKLIST_TEMPLATES } from './checklistTemplates';
import { interactionModeOf } from '../engine/checklist';

describe('SEED_CHECKLIST_TEMPLATES', () => {
  it('has exactly one published v1 template per G650ER/G500 preflight/postflight combination', () => {
    const keys = SEED_CHECKLIST_TEMPLATES.map(t => `${t.aircraftType}-${t.phase}`).sort();
    expect(keys).toEqual(['G500-POSTFLIGHT', 'G500-PREFLIGHT', 'G650ER-POSTFLIGHT', 'G650ER-PREFLIGHT']);
    expect(SEED_CHECKLIST_TEMPLATES.every(t => t.version === 1 && t.status === 'PUBLISHED')).toBe(true);
  });

  it('every template has at least one section, and every section at least one item', () => {
    for (const t of SEED_CHECKLIST_TEMPLATES) {
      expect(t.sections.length).toBeGreaterThan(0);
      for (const s of t.sections) expect(s.items.length).toBeGreaterThan(0);
    }
  });

  it('has no duplicate section or item ids within a template, or across templates', () => {
    const allSectionIds: string[] = [];
    const allItemIds: string[] = [];
    for (const t of SEED_CHECKLIST_TEMPLATES) {
      for (const s of t.sections) {
        allSectionIds.push(s.id);
        for (const i of s.items) allItemIds.push(i.id);
      }
    }
    expect(new Set(allSectionIds).size).toBe(allSectionIds.length);
    expect(new Set(allItemIds).size).toBe(allItemIds.length);
  });

  it('every MEASUREMENT item has at least one field, and CHECK/NOTE items have none', () => {
    for (const t of SEED_CHECKLIST_TEMPLATES) {
      for (const s of t.sections) {
        for (const i of s.items) {
          if (i.kind === 'MEASUREMENT') expect((i.fields ?? []).length).toBeGreaterThan(0);
          else expect(i.fields ?? []).toHaveLength(0);
        }
      }
    }
  });

  /**
   * D58 classification, pinned. Every seeded template is an AOD-numbered maintenance servicing
   * form run from a maintenance-gated panel, so all four keep the two-tap claim/complete model —
   * and they keep it by omitting the field entirely, which is what makes pre-D58 behavior
   * byte-identical. Reclassifying one is a product call: this test is the tripwire that makes the
   * change deliberate rather than incidental.
   */
  it('leaves every seeded template on the pre-D58 claim/complete model', () => {
    for (const t of SEED_CHECKLIST_TEMPLATES) {
      expect(t.interactionMode).toBeUndefined();
      expect(interactionModeOf(t)).toBe('CLAIM_COMPLETE');
    }
  });

  it('every seeded template is an AOD-numbered servicing form — the basis of that classification', () => {
    for (const t of SEED_CHECKLIST_TEMPLATES) expect(t.aodReference).toMatch(/^AOD-\d+$/);
  });

  it('the G650ER preflight ends with the Crew Brief & MX Release gating item', () => {
    const t = SEED_CHECKLIST_TEMPLATES.find(t => t.aircraftType === 'G650ER' && t.phase === 'PREFLIGHT')!;
    const dispatch = t.sections.find(s => s.title === 'DISPATCH')!;
    const last = dispatch.items[dispatch.items.length - 1];
    expect(last.label).toBe('Crew Brief & MX Release');
    expect(last.requiredToRelease).toBe(true);
  });
});
