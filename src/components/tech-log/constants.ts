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
  ACCEPTANCE:
    'I, as PIC, accept this aircraft for the intended flight, having reviewed its airworthiness status and any active MEL deferrals/restrictions.',
  CORRECTION:
    'I certify this entry corrects and supersedes the original signed record, which is retained unaltered. The corrected entry above is accurate to the best of my knowledge.',
  RECURRING_CHECK:
    'I certify the recurring inspection/check identified above was accomplished and the aircraft meets its requirements as of this signature.',
  BRIEFING_RELEASE:
    'I release this aircraft for flight: the preflight maintenance items below are complete and the airworthiness status summarized in this briefing is accurate as of this signature.',
  BRIEFING_ACK:
    'I, as PIC, have reviewed this flight briefing — airworthiness status, active MEL deferrals and restrictions, open items, and fuel — and accept the aircraft for the intended flight.',
} as const;

// Standing maintenance preflight checklist (maintenance ticks these, then releases the briefing).
export const DEFAULT_PREFLIGHT_CHECKLIST: { text: string; mandatory?: boolean }[] = [
  { text: 'Walk-around / general external condition', mandatory: true },
  { text: 'Tires, brakes & landing gear condition', mandatory: true },
  { text: 'Engine & APU oil levels serviced', mandatory: true },
  { text: 'Hydraulic & fluid levels serviced' },
  { text: 'No new leaks or damage noted', mandatory: true },
  { text: 'Required placards in place (active MEL items)', mandatory: true },
  { text: 'Cabin & galley serviceable' },
];

// Function -> regulation traceability (mirrors docs/COMPLIANCE_TRACEABILITY.md §1) for the Audit > Compliance view.
export const CFR_MATRIX: { capability: string; reg: string }[] = [
  { capability: 'Journey/flight log (OOOI, hours, cycles)', reg: '14 CFR 91.417(b); PIC airworthiness 91.7(b)/91.403(a)' },
  { capability: 'Defect / snag capture', reg: '14 CFR 91.7 (airworthy condition); 91.403' },
  { capability: 'MEL deferral + PL-25 clock', reg: '14 CFR 91.213(a)/(d); FAA PL-25' },
  { capability: 'Provisional-MEL block (G800)', reg: '14 CFR 91.213(a) — no operation under an unapproved MEL' },
  { capability: '(M)/placard gating; two sign-offs', reg: '14 CFR 91.213(d)(3) — O/M procedures & placarding' },
  { capability: 'Maintenance release / CRS (A&P cert)', reg: '14 CFR 91.407(a); record content 91.417(a)(1)(i–iii)' },
  { capability: 'RII dual sign-off', reg: 'Operator RII program (91K/§121.369(b) discipline)' },
  { capability: 'Append-only immutability + supersede', reg: 'AC 43-9 / AC 120-78B (unalterable; original retained)' },
  { capability: 'Electronic signature service', reg: 'AC 120-78B §2.1.2 (8 key elements incl. non-repudiation)' },
  { capability: 'Records retention & transfer', reg: '14 CFR 91.417(b)(1)/(b)(2); 91.419' },
  { capability: 'Crew acceptance (PIC)', reg: '14 CFR 91.7(b) — PIC determines airworthiness before flight' },
];

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
