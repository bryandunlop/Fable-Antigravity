// Regulatory-requirement catalog for G1 compliance linking. A block cites the
// requirement ids it satisfies (DocBlock.complianceRefs); the catalog gives each
// id its authority + citation + title for badges and the coverage matrix. Distinct
// from the ack-compliance dashboard (who read/signed) — this is regulatory coverage.
import type { DocSection } from '../types';

export type RegAuthority = 'FAR' | 'MEL' | 'OpSpec';

export interface RegRequirement {
  id: string;
  authority: RegAuthority;
  ref: string;   // display citation, e.g. '14 CFR 91.175'
  title: string;
}

/** The operator's applicable-requirements set (Part 91 flight ops). Demo seed. */
export const REG_CATALOG: RegRequirement[] = [
  { id: 'far-91-175', authority: 'FAR', ref: '14 CFR 91.175', title: 'Takeoff and landing under IFR — approach minimums' },
  { id: 'far-91-403', authority: 'FAR', ref: '14 CFR 91.403', title: 'General maintenance responsibility' },
  { id: 'far-91-405', authority: 'FAR', ref: '14 CFR 91.405', title: 'Maintenance required — records' },
  { id: 'far-91-407b', authority: 'FAR', ref: '14 CFR 91.407(b)', title: 'Operational check flight before carrying passengers' },
  { id: 'far-91-409', authority: 'FAR', ref: '14 CFR 91.409', title: 'Inspections' },
  { id: 'far-91-417b', authority: 'FAR', ref: '14 CFR 91.417(b)', title: 'Maintenance records — content and retention' },
  { id: 'far-91-419', authority: 'FAR', ref: '14 CFR 91.419', title: 'Transfer of maintenance records' },
  { id: 'far-91-213', authority: 'FAR', ref: '14 CFR 91.213', title: 'Inoperative instruments and equipment (MEL use)' },
  { id: 'mel-d195-preamble', authority: 'MEL', ref: 'D195 MMEL preamble', title: 'Deferral decision authority, (M)/(O) procedures' },
  { id: 'mel-pl25', authority: 'MEL', ref: 'MMEL PL-25', title: 'Repair-interval categories (A/B/C/D)' },
  { id: 'opspec-c074', authority: 'OpSpec', ref: 'OpSpec C074', title: 'Category II/III and straight-in IFR minimums' },
  { id: 'opspec-a010', authority: 'OpSpec', ref: 'OpSpec A010', title: 'Aircraft maintenance program authorization' },
];

const BY_ID = new Map(REG_CATALOG.map((r) => [r.id, r]));
export function regById(id: string): RegRequirement | undefined {
  return BY_ID.get(id);
}

/** Seed/util: set compliance refs on the FIRST block of the named sections (by
 * title), returning a new section tree. Immutable. */
export function applyComplianceRefs(sections: DocSection[], bySectionTitle: Record<string, string[]>): DocSection[] {
  return sections.map((s) => {
    const refs = bySectionTitle[s.title];
    if (!refs || s.blocks.length === 0) return s;
    return { ...s, blocks: s.blocks.map((b, i) => (i === 0 ? { ...b, complianceRefs: refs } : b)) };
  });
}
