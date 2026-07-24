import type { SafaCheckItem } from '../types';

// SAFA (Safety Assessment of Foreign Aircraft) ramp-check definition — the operator-curated list of
// what a ramp inspector reviews, grouped by SAFA inspection area (A flight deck · B safety/cabin ·
// C aircraft condition · D cargo · E general). Compliance-owned (Reg & Comp), edited under four-eyes.
// `code` joins each item to the read-only CAMP status overlay (integration/campClient.campSafaStatus).
export const SEED_SAFA_CHECK_ITEMS: SafaCheckItem[] = [
  { id: 'safa-a-cofa', code: 'A-COFA', area: 'A', areaLabel: 'Flight deck', title: 'Certificate of Airworthiness on board', guidance: 'Original C of A carried and valid.', active: true },
  { id: 'safa-a-reg', code: 'A-REG', area: 'A', areaLabel: 'Flight deck', title: 'Certificate of Registration on board', active: true },
  { id: 'safa-a-mel', code: 'A-MEL', area: 'A', areaLabel: 'Flight deck', title: 'MEL current and matches configuration', active: true },
  { id: 'safa-a-crew', code: 'A-CREW', area: 'A', areaLabel: 'Flight deck', title: 'Crew licenses & medicals current', active: true },
  { id: 'safa-b-elt', code: 'B-ELT', area: 'B', areaLabel: 'Safety / cabin', title: 'ELT battery in date', active: true },
  { id: 'safa-b-equip', code: 'B-EQUIP', area: 'B', areaLabel: 'Safety / cabin', title: 'Emergency equipment in date (extinguishers, life vests)', active: true },
  { id: 'safa-c-cond', code: 'C-COND', area: 'C', areaLabel: 'Aircraft condition', title: 'No obvious leaks, damage, or tire/brake wear', active: true },
  { id: 'safa-e-insurance', code: 'E-INSURANCE', area: 'E', areaLabel: 'General', title: 'Insurance certificate valid & carried', active: true },
];
