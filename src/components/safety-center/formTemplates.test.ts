import { describe, it, expect } from 'vitest';
import {
  SEED_TEMPLATES, templateForKind, missingRequired, extraFields, extraLines,
  describeWithExtras, sanitizeTemplate, KNOWN_IDS, MULTI_SEP,
} from './formTemplates';
import type { FormTemplate } from './types';

const hazardTpl = SEED_TEMPLATES.find((t) => t.id === 'tpl-hazard')!;

describe('seed templates — parity with the previous full intake forms', () => {
  it('has a template for each report kind the dialog offers', () => {
    for (const kind of ['hazard', 'asap', 'cws', 'waiver'] as const) {
      expect(templateForKind(SEED_TEMPLATES, kind), kind).toBeTruthy();
    }
  });

  it('hazard seed carries the previous full form, not the quick form', () => {
    const ids = hazardTpl.fields.map((f) => f.id);
    for (const id of ['title', 'location', 'category', 'severity', 'riskFactors', 'description', 'immediate', 'corrective', 'consequences', 'anonymous']) {
      expect(ids).toContain(id);
    }
    const risk = hazardTpl.fields.find((f) => f.id === 'riskFactors')!;
    expect(risk.type).toBe('multiselect');
    expect(risk.options).toHaveLength(12);
    const severity = hazardTpl.fields.find((f) => f.id === 'severity')!;
    expect(severity.options).toEqual(['Low', 'Medium', 'High', 'Critical']);
  });

  it('asap seed carries event types, contributing factors, and severity', () => {
    const asap = SEED_TEMPLATES.find((t) => t.id === 'tpl-asap')!;
    expect(asap.fields.find((f) => f.id === 'eventTypes')?.options).toContain('Runway Incursion');
    expect(asap.fields.find((f) => f.id === 'contributingFactors')?.options).toContain('Fatigue');
  });

  it('every well-known id actually exists on its seed template', () => {
    for (const kind of ['hazard', 'asap', 'cws', 'waiver'] as const) {
      const tpl = templateForKind(SEED_TEMPLATES, kind)!;
      const ids = tpl.fields.map((f) => f.id);
      for (const known of KNOWN_IDS[kind]) {
        expect(ids, `${kind}:${known}`).toContain(known);
      }
    }
  });
});

describe('missingRequired', () => {
  it('lists labels of empty required fields and clears as they fill', () => {
    const missing = missingRequired(hazardTpl, {});
    expect(missing).toContain('Title / summary');
    expect(missing).toContain('Describe the hazard or safety issue you observed');
    const filled = missingRequired(hazardTpl, {
      title: 'GPU cable', location: 'KLUK', category: 'Equipment', severity: 'High', description: 'Frayed near connector',
    });
    expect(filled).toEqual([]);
  });

  it('treats whitespace-only values as empty', () => {
    expect(missingRequired(hazardTpl, { title: '   ' })).toContain('Title / summary');
  });
});

describe('extras — manager-added fields are never dropped', () => {
  const tplWithExtra: FormTemplate = {
    ...hazardTpl,
    fields: [...hazardTpl.fields, { id: 'fCustom', label: 'Shift', type: 'select', required: false, options: ['Day', 'Night'] }],
  };

  it('extraFields picks only unmapped, non-empty answers, in template order', () => {
    const extras = extraFields(tplWithExtra, { title: 'x', fCustom: 'Night' }, KNOWN_IDS.hazard);
    expect(extras).toEqual([{ label: 'Shift', value: 'Night' }]);
  });

  it('describeWithExtras appends Label: value lines to the description', () => {
    const out = describeWithExtras(tplWithExtra, { fCustom: 'Night' }, 'hazard', 'Frayed cable');
    expect(out).toBe('Frayed cable\n\nShift: Night');
  });

  it('describeWithExtras is a no-op when no extras were answered', () => {
    expect(describeWithExtras(hazardTpl, { title: 'x' }, 'hazard', 'Base')).toBe('Base');
  });

  it('extraLines joins multiple extras line-per-field', () => {
    expect(extraLines([{ label: 'A', value: '1' }, { label: 'B', value: '2' }])).toBe('A: 1\nB: 2');
  });
});

describe('sanitizeTemplate — a choice field never persists with zero options', () => {
  it('restores default options on an emptied select/radio/multiselect field', () => {
    const broken: FormTemplate = {
      ...hazardTpl,
      fields: [
        { id: 'a', label: 'Choice', type: 'select', required: true, options: [] },
        { id: 'b', label: 'Multi', type: 'multiselect', required: false },
        { id: 'c', label: 'Free text', type: 'text', required: true },
      ],
    };
    const clean = sanitizeTemplate(broken);
    expect(clean.fields[0].options).toEqual(['Option 1', 'Option 2']);
    expect(clean.fields[1].options).toEqual(['Option 1', 'Option 2']);
    expect(clean.fields[2].options).toBeUndefined();
  });

  it('leaves populated options untouched', () => {
    expect(sanitizeTemplate(hazardTpl)).toEqual(hazardTpl);
  });
});

describe('multiselect separator round-trip', () => {
  it('splits back into the chosen options', () => {
    const joined = ['Fatigue', 'Stress'].join(MULTI_SEP);
    expect(joined.split(MULTI_SEP)).toEqual(['Fatigue', 'Stress']);
  });
});
