import { describe, it, expect } from 'vitest';
import {
  buildInitialEntries, claimItem, completeItem, markNotApplicable, isReleaseGated, checklistProgress,
  latestPublishedTemplate, nextVersionFor, publishTemplate, cloneTemplateForType, canEditChecklistTemplates,
  interactionModeOf, completeAllOpenChecks, batchMarkSummary,
} from './checklist';
import type { ChecklistTemplate, ChecklistInstance } from '../types';
import type { Personnel } from '../types';

const template: ChecklistTemplate = {
  id: 'cl-test', aircraftType: 'G650ER', phase: 'PREFLIGHT', version: 1, status: 'PUBLISHED',
  createdByOid: 'USR002', createdAtUtc: '2026-06-01T00:00:00.000Z',
  sections: [
    {
      id: 'sec-1', title: 'COCKPIT',
      items: [
        { id: 'itm-check', kind: 'CHECK', label: 'Main batteries >22V', requiredToRelease: true },
        {
          id: 'itm-measure', kind: 'MEASUREMENT', label: 'Oxygen service', requiredToRelease: true,
          fields: [{ id: 'fld-crew', label: 'Crew', unit: 'PSI' }, { id: 'fld-pax', label: 'Pax', unit: 'PSI' }],
        },
        { id: 'itm-optional', kind: 'CHECK', label: 'Ice', requiredToRelease: false },
      ],
    },
  ],
};

function freshInstance(): ChecklistInstance {
  return {
    id: 'inst-1', aircraftId: 'ac-1', phase: 'PREFLIGHT', templateId: template.id, templateVersion: 1,
    entries: buildInitialEntries(template), createdAtUtc: '2026-07-10T12:00:00.000Z',
  };
}

describe('buildInitialEntries', () => {
  it('creates one OPEN entry per item across all sections', () => {
    const entries = buildInitialEntries(template);
    expect(entries).toHaveLength(3);
    expect(entries.every(e => e.state === 'OPEN')).toBe(true);
    expect(entries.map(e => e.itemDefId)).toEqual(['itm-check', 'itm-measure', 'itm-optional']);
  });
});

describe('claimItem', () => {
  it('moves an OPEN item to IN_PROGRESS and stamps the claimant', () => {
    const claimed = claimItem(freshInstance(), 'itm-check', 'USR008', '2026-07-10T12:05:00.000Z');
    const entry = claimed.entries.find(e => e.itemDefId === 'itm-check')!;
    expect(entry.state).toBe('IN_PROGRESS');
    expect(entry.startedByOid).toBe('USR008');
    expect(entry.startedAtUtc).toBe('2026-07-10T12:05:00.000Z');
  });

  it('is a no-op if the item is already claimed by someone else', () => {
    const once = claimItem(freshInstance(), 'itm-check', 'USR008', '2026-07-10T12:05:00.000Z');
    const twice = claimItem(once, 'itm-check', 'USR009', '2026-07-10T12:06:00.000Z');
    const entry = twice.entries.find(e => e.itemDefId === 'itm-check')!;
    expect(entry.startedByOid).toBe('USR008');
  });
});

describe('completeItem', () => {
  it('moves an IN_PROGRESS CHECK item to DONE and stamps the completer', () => {
    const claimed = claimItem(freshInstance(), 'itm-check', 'USR008', '2026-07-10T12:05:00.000Z');
    const done = completeItem(claimed, template, 'itm-check', 'USR008', '2026-07-10T12:07:00.000Z');
    const entry = done.entries.find(e => e.itemDefId === 'itm-check')!;
    expect(entry.state).toBe('DONE');
    expect(entry.completedByOid).toBe('USR008');
    expect(entry.completedAtUtc).toBe('2026-07-10T12:07:00.000Z');
  });

  it('records captured measurement values', () => {
    const claimed = claimItem(freshInstance(), 'itm-measure', 'USR008', '2026-07-10T12:05:00.000Z');
    const done = completeItem(claimed, template, 'itm-measure', 'USR008', '2026-07-10T12:07:00.000Z', {
      values: { 'fld-crew': '1500', 'fld-pax': '1800' },
    });
    const entry = done.entries.find(e => e.itemDefId === 'itm-measure')!;
    expect(entry.values).toEqual({ 'fld-crew': '1500', 'fld-pax': '1800' });
  });

  it('is a no-op if the item was never claimed', () => {
    const untouched = completeItem(freshInstance(), template, 'itm-check', 'USR008', '2026-07-10T12:07:00.000Z');
    const entry = untouched.entries.find(e => e.itemDefId === 'itm-check')!;
    expect(entry.state).toBe('OPEN');
  });
});

// ── D58 — per-template interaction mode ───────────────────────────────────────────────────────
/**
 * A crew-shaped template: two plain CHECKs and one MEASUREMENT in one section, one CHECK, one NOTE
 * and one optional CHECK in another. The mix is the point — the batch action must be able to prove
 * it marks plain checks and *leaves the typed-input items alone* both within and across sections.
 */
const singleTapTemplate: ChecklistTemplate = {
  id: 'cl-crew-post', aircraftType: 'G650ER', phase: 'POSTFLIGHT', version: 1, status: 'PUBLISHED',
  interactionMode: 'SINGLE_TAP',
  createdByOid: 'USR002', createdAtUtc: '2026-06-01T00:00:00.000Z',
  sections: [
    {
      id: 'sec-arr', title: 'ARRIVAL',
      items: [
        { id: 'arr-check-1', kind: 'CHECK', label: 'Gear pins installed', requiredToRelease: true },
        { id: 'arr-check-2', kind: 'CHECK', label: 'Check log can', requiredToRelease: true },
        {
          id: 'arr-measure', kind: 'MEASUREMENT', label: 'Engine oil', requiredToRelease: true,
          fields: [{ id: 'arr-oil-lh', label: 'LH ENG', unit: 'US QTS' }],
        },
      ],
    },
    {
      id: 'sec-close', title: 'CLOSE UP',
      items: [
        { id: 'close-check-1', kind: 'CHECK', label: 'Set flaps to 0 degrees', requiredToRelease: true },
        { id: 'close-note', kind: 'NOTE', label: 'LAV serviced and cleaned', requiredToRelease: true },
        { id: 'close-optional', kind: 'CHECK', label: 'International return', requiredToRelease: false },
      ],
    },
  ],
};

function freshCrewInstance(): ChecklistInstance {
  return {
    id: 'inst-crew', aircraftId: 'ac-1', phase: 'POSTFLIGHT',
    templateId: singleTapTemplate.id, templateVersion: 1,
    entries: buildInitialEntries(singleTapTemplate), createdAtUtc: '2026-07-10T12:00:00.000Z',
  };
}

const stateOf = (inst: ChecklistInstance, id: string) => inst.entries.find(e => e.itemDefId === id)!;

describe('interactionModeOf (D58)', () => {
  it('defaults to CLAIM_COMPLETE when a template declares no mode', () => {
    expect(template.interactionMode).toBeUndefined();
    expect(interactionModeOf(template)).toBe('CLAIM_COMPLETE');
  });

  it('honours an explicit mode either way', () => {
    expect(interactionModeOf(singleTapTemplate)).toBe('SINGLE_TAP');
    expect(interactionModeOf({ ...template, interactionMode: 'CLAIM_COMPLETE' })).toBe('CLAIM_COMPLETE');
  });
});

describe('completeItem in SINGLE_TAP mode (D58)', () => {
  it('takes an OPEN item straight to DONE in one call and stamps the completer', () => {
    const done = completeItem(freshCrewInstance(), singleTapTemplate, 'arr-check-1', 'USR008', '2026-07-10T12:05:00.000Z');
    const entry = stateOf(done, 'arr-check-1');
    expect(entry.state).toBe('DONE');
    expect(entry.completedByOid).toBe('USR008');
    expect(entry.completedAtUtc).toBe('2026-07-10T12:05:00.000Z');
  });

  /** The claim signal is what D58 drops — attribution rides on the completion stamp instead. */
  it('leaves startedBy*/startedAt* unset — there was no claim step', () => {
    const done = completeItem(freshCrewInstance(), singleTapTemplate, 'arr-check-1', 'USR008', '2026-07-10T12:05:00.000Z');
    const entry = stateOf(done, 'arr-check-1');
    expect(entry.startedByOid).toBeUndefined();
    expect(entry.startedAtUtc).toBeUndefined();
  });

  it('still carries typed input from OPEN — a measurement records its values in the same tap', () => {
    const done = completeItem(freshCrewInstance(), singleTapTemplate, 'arr-measure', 'USR008', '2026-07-10T12:06:00.000Z', {
      values: { 'arr-oil-lh': '6' },
    });
    expect(stateOf(done, 'arr-measure').values).toEqual({ 'arr-oil-lh': '6' });
  });

  /** Defensive: an entry claimed under an older shape must still be completable, not stuck. */
  it('still completes an IN_PROGRESS entry', () => {
    const claimed = claimItem(freshCrewInstance(), 'arr-check-2', 'USR008', '2026-07-10T12:04:00.000Z');
    const done = completeItem(claimed, singleTapTemplate, 'arr-check-2', 'USR008', '2026-07-10T12:05:00.000Z');
    expect(stateOf(done, 'arr-check-2').state).toBe('DONE');
  });

  it('never re-stamps an item that is already DONE', () => {
    const once = completeItem(freshCrewInstance(), singleTapTemplate, 'arr-check-1', 'USR008', '2026-07-10T12:05:00.000Z');
    const twice = completeItem(once, singleTapTemplate, 'arr-check-1', 'USR009', '2026-07-10T12:09:00.000Z');
    expect(stateOf(twice, 'arr-check-1').completedByOid).toBe('USR008');
    expect(stateOf(twice, 'arr-check-1').completedAtUtc).toBe('2026-07-10T12:05:00.000Z');
  });

  it('never resurrects an item that was marked N/A', () => {
    const na = markNotApplicable(freshCrewInstance(), singleTapTemplate, 'close-optional', 'USR008', '2026-07-10T12:05:00.000Z', 'Domestic leg');
    const after = completeItem(na, singleTapTemplate, 'close-optional', 'USR008', '2026-07-10T12:06:00.000Z');
    expect(stateOf(after, 'close-optional').state).toBe('NA');
    expect(stateOf(after, 'close-optional').naReason).toBe('Domestic leg');
  });
});

describe('completeItem keeps the strict two-tap guard in CLAIM_COMPLETE mode (D58)', () => {
  it('refuses OPEN → DONE on a template with no declared mode', () => {
    const after = completeItem(freshInstance(), template, 'itm-check', 'USR008', '2026-07-10T12:05:00.000Z');
    expect(stateOf(after, 'itm-check').state).toBe('OPEN');
    expect(stateOf(after, 'itm-check').completedByOid).toBeUndefined();
  });

  it('refuses OPEN → DONE on a template that declares CLAIM_COMPLETE explicitly', () => {
    const claimComplete: ChecklistTemplate = { ...singleTapTemplate, interactionMode: 'CLAIM_COMPLETE' };
    const after = completeItem(freshCrewInstance(), claimComplete, 'arr-check-1', 'USR008', '2026-07-10T12:05:00.000Z');
    expect(stateOf(after, 'arr-check-1').state).toBe('OPEN');
  });

  /**
   * The mode lives on the template and instances version-pin the template, so a servicing checklist
   * mid-run cannot be flipped to single-tap by publishing a new version underneath it.
   */
  it('is decided by the template the instance is pinned to, not the latest published one', () => {
    const v2: ChecklistTemplate = { ...template, version: 2, interactionMode: 'SINGLE_TAP' };
    const pinnedToV1 = freshInstance();
    expect(pinnedToV1.templateVersion).toBe(1);
    expect(stateOf(completeItem(pinnedToV1, template, 'itm-check', 'USR008', '2026-07-10T12:05:00.000Z'), 'itm-check').state).toBe('OPEN');
    // …and the v2 template, were an instance built from it, would be single-tap
    expect(interactionModeOf(v2)).toBe('SINGLE_TAP');
  });
});

describe('completeAllOpenChecks (D58 batch mark-off)', () => {
  const AT = '2026-07-10T12:30:00.000Z';

  it('completes every OPEN plain-CHECK item across all sections', () => {
    const after = completeAllOpenChecks(freshCrewInstance(), singleTapTemplate, 'USR008', AT);
    for (const id of ['arr-check-1', 'arr-check-2', 'close-check-1', 'close-optional']) {
      expect(stateOf(after, id).state).toBe('DONE');
      expect(stateOf(after, id).completedByOid).toBe('USR008');
      expect(stateOf(after, id).completedAtUtc).toBe(AT);
    }
  });

  /** MEASUREMENT and NOTE items carry typed input a batch tap cannot supply — auto-completing them
   *  would fabricate a reading nobody took. */
  it('skips MEASUREMENT and NOTE items — they stay OPEN with nothing stamped', () => {
    const after = completeAllOpenChecks(freshCrewInstance(), singleTapTemplate, 'USR008', AT);
    for (const id of ['arr-measure', 'close-note']) {
      expect(stateOf(after, id).state).toBe('OPEN');
      expect(stateOf(after, id).completedByOid).toBeUndefined();
      expect(stateOf(after, id).completedAtUtc).toBeUndefined();
      expect(stateOf(after, id).values).toBeUndefined();
      expect(stateOf(after, id).note).toBeUndefined();
    }
  });

  it('leaves DONE, NA and IN_PROGRESS entries exactly as they were', () => {
    let inst = freshCrewInstance();
    inst = completeItem(inst, singleTapTemplate, 'arr-check-1', 'USR004', '2026-07-10T12:10:00.000Z');
    inst = markNotApplicable(inst, singleTapTemplate, 'close-optional', 'USR004', '2026-07-10T12:11:00.000Z', 'Domestic leg');
    inst = claimItem(inst, 'arr-check-2', 'USR009', '2026-07-10T12:12:00.000Z');

    const after = completeAllOpenChecks(inst, singleTapTemplate, 'USR008', AT);
    expect(stateOf(after, 'arr-check-1')).toEqual(stateOf(inst, 'arr-check-1'));
    expect(stateOf(after, 'close-optional')).toEqual(stateOf(inst, 'close-optional'));
    expect(stateOf(after, 'arr-check-2')).toEqual(stateOf(inst, 'arr-check-2'));
    // …and the one genuinely open check is the only thing it moved
    expect(stateOf(after, 'close-check-1').state).toBe('DONE');
  });

  it('is a no-op in CLAIM_COMPLETE mode — the claim signal is the whole point there', () => {
    const claimComplete: ChecklistTemplate = { ...singleTapTemplate, interactionMode: 'CLAIM_COMPLETE' };
    const after = completeAllOpenChecks(freshCrewInstance(), claimComplete, 'USR008', AT);
    expect(after.entries.every(e => e.state === 'OPEN')).toBe(true);
  });

  it('is a no-op on a template with no declared mode', () => {
    const after = completeAllOpenChecks(freshInstance(), template, 'USR008', AT);
    expect(after.entries.every(e => e.state === 'OPEN')).toBe(true);
  });

  it('scopes to one section when given a sectionId', () => {
    const after = completeAllOpenChecks(freshCrewInstance(), singleTapTemplate, 'USR008', AT, { sectionId: 'sec-arr' });
    expect(stateOf(after, 'arr-check-1').state).toBe('DONE');
    expect(stateOf(after, 'arr-check-2').state).toBe('DONE');
    expect(stateOf(after, 'close-check-1').state).toBe('OPEN');
    expect(stateOf(after, 'close-optional').state).toBe('OPEN');
  });

  it('never marks anything N/A — N/A is a typed-reason decision, not a batch outcome', () => {
    const after = completeAllOpenChecks(freshCrewInstance(), singleTapTemplate, 'USR008', AT);
    expect(after.entries.some(e => e.state === 'NA')).toBe(false);
    expect(after.entries.some(e => e.naReason !== undefined)).toBe(false);
  });
});

describe('batchMarkSummary — what the confirm step must state (D58)', () => {
  it('splits the open items into what will be marked and what will be left', () => {
    const summary = batchMarkSummary(freshCrewInstance(), singleTapTemplate);
    expect(summary.willMark.map(i => i.id)).toEqual(['arr-check-1', 'arr-check-2', 'close-check-1', 'close-optional']);
    expect(summary.willSkip.map(i => i.id)).toEqual(['arr-measure', 'close-note']);
  });

  it('drops items that are already resolved from both lists', () => {
    let inst = freshCrewInstance();
    inst = completeItem(inst, singleTapTemplate, 'arr-check-1', 'USR008', '2026-07-10T12:10:00.000Z');
    inst = markNotApplicable(inst, singleTapTemplate, 'close-optional', 'USR008', '2026-07-10T12:11:00.000Z', 'Domestic leg');
    const summary = batchMarkSummary(inst, singleTapTemplate);
    expect(summary.willMark.map(i => i.id)).toEqual(['arr-check-2', 'close-check-1']);
    expect(summary.willSkip.map(i => i.id)).toEqual(['arr-measure', 'close-note']);
  });

  /** An item somebody has claimed is somebody's — the batch reports it as left alone, not marked. */
  it('reports a claimed item as skipped, never as markable', () => {
    const inst = claimItem(freshCrewInstance(), 'arr-check-2', 'USR009', '2026-07-10T12:12:00.000Z');
    const summary = batchMarkSummary(inst, singleTapTemplate);
    expect(summary.willMark.map(i => i.id)).not.toContain('arr-check-2');
    expect(summary.willSkip.map(i => i.id)).toContain('arr-check-2');
  });

  it('scopes to one section when given a sectionId', () => {
    const summary = batchMarkSummary(freshCrewInstance(), singleTapTemplate, { sectionId: 'sec-close' });
    expect(summary.willMark.map(i => i.id)).toEqual(['close-check-1', 'close-optional']);
    expect(summary.willSkip.map(i => i.id)).toEqual(['close-note']);
  });

  it('offers nothing in CLAIM_COMPLETE mode', () => {
    const summary = batchMarkSummary(freshInstance(), template);
    expect(summary.willMark).toHaveLength(0);
    expect(summary.willSkip).toHaveLength(0);
  });
});

/**
 * D58 changes how items are *worked*. These five guarantees are what it must not touch — a prior
 * regression in this area already cost the project once (TL-16), so each is asserted directly
 * against the new single-tap and batch paths, not merely left to the old two-tap tests.
 */
describe('what SINGLE_TAP and the batch action must NOT change (D58)', () => {
  const AT = '2026-07-10T12:30:00.000Z';

  it('release gating still holds — a batch mark-off cannot open the gate on its own', () => {
    const after = completeAllOpenChecks(freshCrewInstance(), singleTapTemplate, 'USR008', AT);
    const gate = isReleaseGated(after, singleTapTemplate);
    expect(gate.ok).toBe(false);
    // exactly the two required typed-input items the batch deliberately skipped
    expect(gate.missing.map(i => i.id)).toEqual(['arr-measure', 'close-note']);
  });

  it('release opens only once every requiredToRelease item is DONE or NA', () => {
    let inst = completeAllOpenChecks(freshCrewInstance(), singleTapTemplate, 'USR008', AT);
    inst = completeItem(inst, singleTapTemplate, 'arr-measure', 'USR008', AT, { values: { 'arr-oil-lh': '6' } });
    inst = completeItem(inst, singleTapTemplate, 'close-note', 'USR008', AT, { note: 'Serviced' });
    expect(isReleaseGated(inst, singleTapTemplate)).toEqual({ ok: true, missing: [] });
  });

  it('N/A still needs a typed reason and is still refused on a required item', () => {
    const required = markNotApplicable(freshCrewInstance(), singleTapTemplate, 'arr-check-1', 'USR008', AT, 'skip it');
    expect(stateOf(required, 'arr-check-1').state).toBe('OPEN');

    const optional = markNotApplicable(freshCrewInstance(), singleTapTemplate, 'close-optional', 'USR008', AT, 'Domestic leg');
    expect(stateOf(optional, 'close-optional').state).toBe('NA');
    expect(stateOf(optional, 'close-optional').naReason).toBe('Domestic leg');
  });

  it('signing stays one signature for the whole instance — no path writes a per-item one', () => {
    const worked = completeAllOpenChecks(freshCrewInstance(), singleTapTemplate, 'USR008', AT);
    expect(worked.signatureId).toBeUndefined();
    for (const e of worked.entries) expect(Object.keys(e)).not.toContain('signatureId');
  });

  /**
   * Freeze-at-signature. Once the instance carries a signature it is a signed regulatory record:
   * every mutator refuses it, so neither a stray single tap nor the new bulk action can rewrite
   * what was signed. Corrections are superseding instances.
   */
  it('refuses every mutation once the instance is signed', () => {
    const signed: ChecklistInstance = { ...freshCrewInstance(), signatureId: 'sig-1' };
    expect(completeItem(signed, singleTapTemplate, 'arr-check-1', 'USR008', AT)).toEqual(signed);
    expect(completeAllOpenChecks(signed, singleTapTemplate, 'USR008', AT)).toEqual(signed);
    expect(claimItem(signed, 'arr-check-1', 'USR008', AT)).toEqual(signed);
    expect(markNotApplicable(signed, singleTapTemplate, 'close-optional', 'USR008', AT, 'Domestic leg')).toEqual(signed);
  });

  it('refuses to rewrite a signed CLAIM_COMPLETE instance too', () => {
    const signed: ChecklistInstance = { ...claimItem(freshInstance(), 'itm-check', 'USR008', AT), signatureId: 'sig-2' };
    expect(completeItem(signed, template, 'itm-check', 'USR008', AT)).toEqual(signed);
  });
});

describe('markNotApplicable', () => {
  it('marks a non-required OPEN item NA with a reason', () => {
    const na = markNotApplicable(freshInstance(), template, 'itm-optional', 'USR008', '2026-07-10T12:05:00.000Z', 'No ice present');
    const entry = na.entries.find(e => e.itemDefId === 'itm-optional')!;
    expect(entry.state).toBe('NA');
    expect(entry.naReason).toBe('No ice present');
  });

  it('refuses to NA a required item', () => {
    const na = markNotApplicable(freshInstance(), template, 'itm-check', 'USR008', '2026-07-10T12:05:00.000Z', 'skip it');
    const entry = na.entries.find(e => e.itemDefId === 'itm-check')!;
    expect(entry.state).toBe('OPEN');
  });
});

describe('isReleaseGated', () => {
  it('blocks release while a required item is incomplete', () => {
    const gate = isReleaseGated(freshInstance(), template);
    expect(gate.ok).toBe(false);
    expect(gate.missing.map(i => i.id)).toEqual(['itm-check', 'itm-measure']);
  });

  it('allows release once every required item is DONE or NA (optional items are ignored)', () => {
    let inst = freshInstance();
    inst = completeItem(claimItem(inst, 'itm-check', 'USR008', '2026-07-10T12:01:00.000Z'), template, 'itm-check', 'USR008', '2026-07-10T12:02:00.000Z');
    inst = completeItem(claimItem(inst, 'itm-measure', 'USR008', '2026-07-10T12:03:00.000Z'), template, 'itm-measure', 'USR008', '2026-07-10T12:04:00.000Z', { values: { 'fld-crew': '1500', 'fld-pax': '1800' } });
    const gate = isReleaseGated(inst, template);
    expect(gate.ok).toBe(true);
    expect(gate.missing).toHaveLength(0);
  });
});

describe('checklistProgress', () => {
  it('counts DONE and NA entries against the total item count', () => {
    let inst = freshInstance();
    inst = completeItem(claimItem(inst, 'itm-check', 'USR008', '2026-07-10T12:01:00.000Z'), template, 'itm-check', 'USR008', '2026-07-10T12:02:00.000Z');
    inst = markNotApplicable(inst, template, 'itm-optional', 'USR008', '2026-07-10T12:03:00.000Z', 'N/A');
    expect(checklistProgress(inst, template)).toEqual({ done: 2, total: 3 });
  });
});

const published: ChecklistTemplate = { ...template, id: 'cl-g650er-pre', version: 2, status: 'PUBLISHED', effectiveFrom: '2026-06-01T00:00:00.000Z' };
const olderPublished: ChecklistTemplate = { ...published, version: 1 };
const newerPublished: ChecklistTemplate = { ...published, version: 2 };

describe('latestPublishedTemplate', () => {
  it('returns the highest-version PUBLISHED row for the type+phase', () => {
    const found = latestPublishedTemplate([olderPublished, newerPublished], 'G650ER', 'PREFLIGHT');
    expect(found?.version).toBe(2);
  });

  it('returns undefined when nothing is published for that type+phase', () => {
    expect(latestPublishedTemplate([olderPublished], 'G800', 'PREFLIGHT')).toBeUndefined();
  });
});

describe('nextVersionFor', () => {
  it('returns 1 when no row with that id exists yet', () => {
    expect(nextVersionFor([], 'cl-g650er-pre')).toBe(1);
  });

  it('returns one more than the highest existing version for that id', () => {
    expect(nextVersionFor([olderPublished, newerPublished], 'cl-g650er-pre')).toBe(3);
  });
});

describe('publishTemplate', () => {
  it('sets status PUBLISHED and stamps effectiveFrom', () => {
    const draft: ChecklistTemplate = { ...template, status: 'DRAFT' };
    const pub = publishTemplate(draft, '2026-07-10T12:00:00.000Z');
    expect(pub.status).toBe('PUBLISHED');
    expect(pub.effectiveFrom).toBe('2026-07-10T12:00:00.000Z');
  });
});

describe('cloneTemplateForType', () => {
  it('produces a fresh DRAFT template for a new aircraft type with fresh section/item ids', () => {
    const clone = cloneTemplateForType({
      source: published, newTemplateId: 'cl-g800-pre', newAircraftType: 'G800',
      newIdPrefix: 'g800-pre', createdByOid: 'USR002', nowUtc: '2026-07-10T12:00:00.000Z',
    });
    expect(clone.id).toBe('cl-g800-pre');
    expect(clone.aircraftType).toBe('G800');
    expect(clone.version).toBe(1);
    expect(clone.status).toBe('DRAFT');
    expect(clone.clonedFromTemplateId).toBe('cl-g650er-pre');
    expect(clone.clonedFromVersion).toBe(2);
    expect(clone.sections[0].id).not.toBe(published.sections[0].id);
    expect(clone.sections[0].items[0].id).not.toBe(published.sections[0].items[0].id);
    expect(clone.sections[0].items[0].label).toBe(published.sections[0].items[0].label);
  });

  it('carries the source template\'s interaction mode to the clone (D58)', () => {
    const clone = cloneTemplateForType({
      source: { ...published, interactionMode: 'SINGLE_TAP' }, newTemplateId: 'cl-g800-pre', newAircraftType: 'G800',
      newIdPrefix: 'g800-pre', createdByOid: 'USR002', nowUtc: '2026-07-10T12:00:00.000Z',
    });
    expect(interactionModeOf(clone)).toBe('SINGLE_TAP');
    // …and an unset mode stays unset, so the clone defaults to CLAIM_COMPLETE like its source
    const plain = cloneTemplateForType({
      source: published, newTemplateId: 'cl-g800-pre2', newAircraftType: 'G800',
      newIdPrefix: 'g800-pre2', createdByOid: 'USR002', nowUtc: '2026-07-10T12:00:00.000Z',
    });
    expect(plain.interactionMode).toBeUndefined();
    expect(interactionModeOf(plain)).toBe('CLAIM_COMPLETE');
  });

  it('gives every cloned id a unique value', () => {
    const clone = cloneTemplateForType({
      source: published, newTemplateId: 'cl-g800-pre', newAircraftType: 'G800',
      newIdPrefix: 'g800-pre', createdByOid: 'USR002', nowUtc: '2026-07-10T12:00:00.000Z',
    });
    const ids = [clone.sections[0].id, ...clone.sections[0].items.map(i => i.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('canEditChecklistTemplates', () => {
  const dom: Personnel = { oid: 'USR002', displayName: 'Sarah Wilson (DOM)', role: 'MAINTENANCE', riiAuthorized: false, riiAuthorizedAta: [], isSupervisor: true, active: true };
  const tech: Personnel = { oid: 'USR008', displayName: 'Tom Parker', role: 'MAINTENANCE', riiAuthorized: false, riiAuthorizedAta: [], active: true };
  const pilot: Personnel = { oid: 'USR001', displayName: 'Capt. John Smith', role: 'PILOT', riiAuthorized: false, riiAuthorizedAta: [], isSupervisor: true, active: true };

  it('allows a maintenance supervisor (DOM / Chief Inspector)', () => {
    expect(canEditChecklistTemplates(dom)).toBe(true);
  });
  it('refuses a non-supervisor maintenance tech', () => {
    expect(canEditChecklistTemplates(tech)).toBe(false);
  });
  it('refuses a pilot supervisor', () => {
    expect(canEditChecklistTemplates(pilot)).toBe(false);
  });
});
