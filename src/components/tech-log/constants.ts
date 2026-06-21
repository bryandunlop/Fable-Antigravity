import type { MelCategory, Serviceability } from './types';

// PL-25 calendar clocks (null = per proviso / usage-based, Cat A).
export const CATEGORY_DAYS: Record<MelCategory, number | null> = {
  A: null, B: 3, C: 10, D: 120,
};

// Map derived status -> existing GFO status utility class (src/index.css).
export const SERVICEABILITY_CLASS: Record<Serviceability, string> = {
  GREEN: 'status-success',
  AMBER: 'status-warning',
  RED: 'status-error',
};

export const INTENT = {
  PILOT_DEFECT:
    'I confirm the above defect observation is accurate to the best of my knowledge.',
  DEFERRAL:
    'I have reviewed the governing MEL item, its category, provisos, (O)/(M) procedures, and placard requirements, and I authorize this deferral.',
  CRS:
    'I certify the work described was performed and the aircraft is approved for return to service per 14 CFR 91.417.',
  GATING_RELEASE:
    'I certify the required (M) procedure and/or placard installation for this deferral was accomplished.',
  RII:
    'I have independently inspected the required item and find it correctly accomplished.',
} as const;

export const ATA_CHAPTERS: { code: string; title: string }[] = [
  { code: '21', title: 'Air Conditioning' }, { code: '22', title: 'Autoflight' },
  { code: '23', title: 'Communications' }, { code: '24', title: 'Electrical Power' },
  { code: '25', title: 'Equipment / Furnishings' }, { code: '26', title: 'Fire Protection' },
  { code: '27', title: 'Flight Controls' }, { code: '28', title: 'Fuel' },
  { code: '29', title: 'Hydraulic Power' }, { code: '30', title: 'Ice and Rain Protection' },
  { code: '31', title: 'Indicating / Recording' }, { code: '32', title: 'Landing Gear' },
  { code: '33', title: 'Lights' }, { code: '34', title: 'Navigation' },
  { code: '35', title: 'Oxygen' }, { code: '36', title: 'Pneumatic' },
  { code: '49', title: 'Airborne Auxiliary Power' }, { code: '52', title: 'Doors' },
];
