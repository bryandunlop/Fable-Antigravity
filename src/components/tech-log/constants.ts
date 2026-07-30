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
  PLACARD_ATTESTATION:
    'I confirm the required placard is installed per the MEL provisions for this deferral.',
  // D59 — deliberately a statement of FACT, not of authority. It records that the (O) crew action
  // was accomplished; it does not certify airworthiness and it flips no state. Maintenance's
  // gating-discharge signature is what releases the aircraft on this MEL.
  CREW_ACTION_COMPLIANCE:
    'I confirm the crew action required by this MEL deferral was accomplished as described above. This record is evidence of the action only — it does not release the aircraft; maintenance signs the gating release.',
  RII:
    'I have independently inspected the required item and find it correctly accomplished.',
  ACCEPTANCE:
    'I, as PIC, accept this aircraft for the intended flight, having reviewed its airworthiness status and any active MEL deferrals/restrictions.',
  CORRECTION:
    'I certify this entry corrects and supersedes the original signed record, which is retained unaltered. The corrected entry above is accurate to the best of my knowledge.',
  EXTENSION:
    'I authorize the one-time extension of this MEL deferral for an equal repair interval, having reviewed the governing MEL item and recorded the justification. The original deferral is retained unaltered and is superseded by this signed entry.',
  RECURRING_CHECK:
    'I certify the recurring inspection/check identified above was accomplished and the aircraft meets its requirements as of this signature.',
  BRIEFING_RELEASE:
    'I release this aircraft for flight: the preflight maintenance items below are complete and the airworthiness status summarized in this briefing is accurate as of this signature.',
  BRIEFING_ACK:
    'I, as PIC, have reviewed this flight briefing — airworthiness status, active MEL deferrals and restrictions, open items, and fuel — and accept the aircraft for the intended flight.',
  POSTFLIGHT:
    'I, as maintenance, certify the postflight check below was accomplished, the aircraft is received back into maintenance custody, and any open crew squawks have been gathered for action.',
  WATCHLIST:
    'I have assessed this defect as not affecting airworthiness (cabin/NEF item) and place it on the maintenance watch list for tracking. No MEL deferral is required and dispatch is not restricted.',
  WATCH_ESCALATION:
    'I am escalating this watch-list item: it is reassessed as airworthiness-affecting and returns to open grounding status pending deferral or rectification.',
} as const;

// Function -> regulation traceability (mirrors docs/COMPLIANCE_TRACEABILITY.md §1) for the Audit > Compliance view.
export const CFR_MATRIX: { capability: string; reg: string }[] = [
  { capability: 'Journey/flight log (OOOI, hours, cycles)', reg: '14 CFR 91.417(b); PIC airworthiness 91.7(b)/91.403(a)' },
  { capability: 'Defect / snag capture', reg: '14 CFR 91.7 (airworthy condition); 91.403' },
  { capability: 'MEL deferral + PL-25 clock', reg: '14 CFR 91.213(a); FAA MMEL PL-25 Rev 23' },
  { capability: 'Provisional-MEL block (G800)', reg: '14 CFR 91.213(a) — no operation under an unapproved MEL' },
  // NOT 91.213(d)(3). Para (d) is the no-MEL path: its own opening clause switches it off
  // for operators flying under an approved MEL, and (d)(1) lists only rotorcraft,
  // non-turbine airplanes, gliders, LTA and powered parachutes — never a turbine G650ER
  // or G500. §§ 91.405(c), 91.405(d) and 43.11(b) are dead ends for the same reason: each
  // is expressly scoped to items "permitted to be inoperative by/under § 91.213(d)(2)".
  // There is no placard requirement in the regulation text reaching an approved-MEL
  // deferral; the obligation arrives through the MEL/LOA itself. (TL-24;
  // evidence: ref-91213-inoperative-equipment-structure)
  { capability: '(M)/placard gating; two sign-offs', reg: 'AC 91-67A §5.3/§5.4 + MEL/LOA, binding via 14 CFR 91.213(a)(5)' },
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
