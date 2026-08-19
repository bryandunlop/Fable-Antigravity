// Seed data for the Safety Center: the Submissions archive history supplements
// and the Published reports library. (Form templates moved to formTemplates.ts —
// a persisted store the Report dialog renders from and Form setup edits.)
// Hazard-derived records come from HazardContext via useSafetyModel; these fill
// out the item types the app doesn't yet model as first-class data. They are
// archive/library HISTORY only — never blended into live work lists (D38).

import type { PublishedReport, SafetyItem } from './types';

// ---- Submissions archive — non-hazard records (hazards merge in from real data) ----
export const MOCK_SUBMISSIONS: SafetyItem[] = [
  {
    id: 's-asap-1', type: 'ASAP', bucket: 'done', title: 'Unstable approach — KTEB', submittedBy: 'Confidential', date: '2026-06-18', tail: 'N1PG',
    status: { label: 'Closed', tone: 'green' }, when: '2026-06-18',
    fields: [['Phase', 'Approach'], ['Airport', 'KTEB'], ['Outcome', 'De-identified, trend logged']].map(([label, value]) => ({ label, value })),
    thread: [{ who: 'Safety Review Board', role: 'team', at: '2026-06-20', text: 'Reviewed — added to the KTEB approach trend brief.' }],
    actions: [{ label: 'View', primary: true }],
  },
  {
    id: 's-waiver-1', type: 'WAIVER', bucket: 'done', title: 'Duty-time extension', submittedBy: 'Captain John Smith', date: '2026-06-30', tail: 'N1PG',
    status: { label: 'Approved', tone: 'green' }, when: '2026-06-30',
    fields: [['Ref', 'W-88'], ['Request', '+1:30 duty'], ['Reviewed by', 'DOM']].map(([label, value]) => ({ label, value })),
    thread: [{ who: 'R. Vance (DOM)', role: 'team', at: '2026-06-30', text: 'Approved with a fatigue check-in at KASE.' }],
    actions: [{ label: 'View', primary: true }],
  },
  {
    id: 's-cws-1', type: 'CWS', bucket: 'done', title: 'Recognized J. Kerr — proactive FOD sweep', submittedBy: 'Captain John Smith', date: '2026-07-02',
    status: { label: 'Logged', tone: 'neutral' }, when: '2026-07-02',
    fields: [['Recognized', 'J. Kerr'], ['For', 'Unprompted FOD sweep before tow']].map(([label, value]) => ({ label, value })),
    thread: [{ who: 'Captain John Smith', role: 'you', at: '2026-07-02', text: 'Full FOD sweep before an unscheduled tow — worth noting.' }],
    actions: [{ label: 'View', primary: true }],
  },
  {
    id: 's-frat-1', type: 'FRAT', bucket: 'done', title: 'N6PG · KTEB → KPBI', submittedBy: 'Capt. Ellis', date: '2026-07-06', tail: 'N6PG',
    status: { label: 'Approved', tone: 'green' }, when: '2026-07-06',
    fields: [['Score', 'Nominal'], ['Approved by', 'Safety']].map(([label, value]) => ({ label, value })),
    thread: [{ who: 'Safety', role: 'team', at: '2026-07-06', text: 'Nominal score — approved.' }],
    actions: [{ label: 'View', primary: true }],
  },
];

// ---- Published reports (de-identified lessons learned) ----
export const MOCK_PUBLISHED: PublishedReport[] = [
  {
    id: 'p-1', ref: '#H-190', title: 'Nitrogen cart over-pressure near hangar 2', category: 'Ground Operations', publishedDate: '2026-07-07',
    summary: 'A servicing cart regulator failed, over-pressurizing a strut fill line. No injury; the cart was tagged out and replaced.',
    whatHappened: 'During a routine strut service the nitrogen cart regulator crept above the set limit. The technician noticed the gauge and stopped before any component damage.',
    lessons: ['Verify regulator set-pressure before every strut fill, not just at daily checks.', 'Carts past their calibration date were still in service — calibration tracking moved to the GSE inspection tags program.', 'A second person confirming the regulator setting catches creep early.'],
  },
  {
    id: 'p-2', ref: '#H-165', title: 'Recurring high/fast circling approaches into KTEB', category: 'Flight Operations', publishedDate: '2026-06-12',
    summary: 'A cluster of ASAP reports flagged unstable circling approaches at KTEB in gusty conditions. A stabilized-approach gate and a KTEB-specific brief were added.',
    whatHappened: 'Three de-identified ASAP reports over six weeks described going high/fast on the KTEB circling approach with a late go-around. Fatigue and tailwind were common threads.',
    lessons: ['Added a 1,000 ft stabilized-approach gate for all circling approaches.', 'A KTEB-specific approach brief now ships with every trip to the field.', 'Confidential reporting worked — no single event, but the trend was actionable.'],
  },
];
