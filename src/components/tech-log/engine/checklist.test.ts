import { describe, it, expect } from 'vitest';
import {
  buildInitialEntries, claimItem, completeItem, markNotApplicable, isReleaseGated, checklistProgress,
  latestPublishedTemplate, nextVersionFor, publishTemplate, cloneTemplateForType, canEditChecklistTemplates,
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
    const done = completeItem(claimed, 'itm-check', 'USR008', '2026-07-10T12:07:00.000Z');
    const entry = done.entries.find(e => e.itemDefId === 'itm-check')!;
    expect(entry.state).toBe('DONE');
    expect(entry.completedByOid).toBe('USR008');
    expect(entry.completedAtUtc).toBe('2026-07-10T12:07:00.000Z');
  });

  it('records captured measurement values', () => {
    const claimed = claimItem(freshInstance(), 'itm-measure', 'USR008', '2026-07-10T12:05:00.000Z');
    const done = completeItem(claimed, 'itm-measure', 'USR008', '2026-07-10T12:07:00.000Z', {
      values: { 'fld-crew': '1500', 'fld-pax': '1800' },
    });
    const entry = done.entries.find(e => e.itemDefId === 'itm-measure')!;
    expect(entry.values).toEqual({ 'fld-crew': '1500', 'fld-pax': '1800' });
  });

  it('is a no-op if the item was never claimed', () => {
    const untouched = completeItem(freshInstance(), 'itm-check', 'USR008', '2026-07-10T12:07:00.000Z');
    const entry = untouched.entries.find(e => e.itemDefId === 'itm-check')!;
    expect(entry.state).toBe('OPEN');
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
    inst = completeItem(claimItem(inst, 'itm-check', 'USR008', '2026-07-10T12:01:00.000Z'), 'itm-check', 'USR008', '2026-07-10T12:02:00.000Z');
    inst = completeItem(claimItem(inst, 'itm-measure', 'USR008', '2026-07-10T12:03:00.000Z'), 'itm-measure', 'USR008', '2026-07-10T12:04:00.000Z', { values: { 'fld-crew': '1500', 'fld-pax': '1800' } });
    const gate = isReleaseGated(inst, template);
    expect(gate.ok).toBe(true);
    expect(gate.missing).toHaveLength(0);
  });
});

describe('checklistProgress', () => {
  it('counts DONE and NA entries against the total item count', () => {
    let inst = freshInstance();
    inst = completeItem(claimItem(inst, 'itm-check', 'USR008', '2026-07-10T12:01:00.000Z'), 'itm-check', 'USR008', '2026-07-10T12:02:00.000Z');
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
