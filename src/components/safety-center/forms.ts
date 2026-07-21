// Seed data for the Safety Center: the SM Form-manager templates, the
// Submissions archive history supplements, and the Published reports library.
// Hazard-derived records come from HazardContext via useSafetyModel; these fill
// out the item types the app doesn't yet model as first-class data. They are
// archive/library HISTORY only — never blended into live work lists (D38).

import type { FormTemplate, PublishedReport, SafetyItem } from './types';

// ---- SM Form-manager templates (mirrors the shape in FormFieldManager) ----
export const FORM_TEMPLATES: FormTemplate[] = [
  {
    id: 'tpl-hazard', kind: 'Hazard', name: 'Hazard report', description: 'General safety hazard / unsafe condition.', scored: false,
    fields: [
      { id: 'f1', label: 'What did you see?', type: 'textarea', required: true },
      { id: 'f2', label: 'Location', type: 'text', required: true },
      { id: 'f3', label: 'Aircraft', type: 'text', required: false },
      { id: 'f4', label: 'Category', type: 'select', required: true, options: ['Flight Operations', 'Ground Operations', 'Maintenance', 'Cabin/Inflight', 'Equipment', 'Other'] },
      { id: 'f5', label: 'How risky?', type: 'radio', required: true, options: ['Low', 'Medium', 'High', 'Critical'] },
      { id: 'f6', label: 'Immediate actions taken', type: 'textarea', required: false },
    ],
  },
  {
    id: 'tpl-asap', kind: 'ASAP', name: 'ASAP report', description: 'Confidential aviation safety action report.', scored: false,
    fields: [
      { id: 'f1', label: 'Phase of flight', type: 'select', required: true, options: ['Taxi', 'Takeoff', 'Climb', 'Cruise', 'Approach', 'Landing'] },
      { id: 'f2', label: 'Airport / area', type: 'text', required: true },
      { id: 'f3', label: 'What happened', type: 'textarea', required: true },
      { id: 'f4', label: 'Contributing factors', type: 'textarea', required: false },
    ],
  },
  {
    id: 'tpl-cws', kind: 'CWS', name: 'Caught Working Safely', description: 'Positive-recognition observation.', scored: false,
    fields: [
      { id: 'f1', label: 'Who', type: 'text', required: true },
      { id: 'f2', label: 'For what', type: 'textarea', required: true },
    ],
  },
  {
    id: 'tpl-waiver', kind: 'Waiver', name: 'Waiver request', description: 'Request an exception or extension.', scored: false,
    fields: [
      { id: 'f1', label: 'What are you requesting?', type: 'textarea', required: true },
      { id: 'f2', label: 'Reason / justification', type: 'textarea', required: true },
      { id: 'f3', label: 'Trip / date', type: 'text', required: false },
    ],
  },
  {
    id: 'tpl-frat', kind: 'FRAT', name: 'Flight Risk Assessment', description: 'Scored pre-flight risk assessment (lives on the trip).', scored: true,
    fields: [
      { id: 'f1', label: 'Crew duty day', type: 'select', required: true, options: ['< 10h', '10–12h', '12–14h', '> 14h'] },
      { id: 'f2', label: 'Weather at destination', type: 'select', required: true, options: ['VMC', 'MVMC', 'IMC', 'Below mins'] },
      { id: 'f3', label: 'Terrain / airport', type: 'select', required: true, options: ['Standard', 'Elevated', 'Special-qual'] },
      { id: 'f4', label: 'Night operation', type: 'checkbox', required: false },
    ],
  },
  {
    id: 'tpl-grat', kind: 'GRAT', name: 'Ground Risk Assessment', description: 'Scored maintenance/ground task assessment.', scored: true,
    fields: [
      { id: 'f1', label: 'Task', type: 'text', required: true },
      { id: 'f2', label: 'Task complexity', type: 'select', required: true, options: ['Routine', 'Non-routine', 'Critical'] },
      { id: 'f3', label: 'Requires RII', type: 'checkbox', required: false },
    ],
  },
];

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
    id: 's-waiver-1', type: 'WAIVER', bucket: 'done', title: 'Duty-time extension', submittedBy: 'Capt. Dunlop', date: '2026-06-30', tail: 'N1PG',
    status: { label: 'Approved', tone: 'green' }, when: '2026-06-30',
    fields: [['Ref', 'W-88'], ['Request', '+1:30 duty'], ['Reviewed by', 'DOM']].map(([label, value]) => ({ label, value })),
    thread: [{ who: 'R. Vance (DOM)', role: 'team', at: '2026-06-30', text: 'Approved with a fatigue check-in at KASE.' }],
    actions: [{ label: 'View', primary: true }],
  },
  {
    id: 's-cws-1', type: 'CWS', bucket: 'done', title: 'Recognized J. Kerr — proactive FOD sweep', submittedBy: 'Capt. Dunlop', date: '2026-07-02',
    status: { label: 'Logged', tone: 'neutral' }, when: '2026-07-02',
    fields: [['Recognized', 'J. Kerr'], ['For', 'Unprompted FOD sweep before tow']].map(([label, value]) => ({ label, value })),
    thread: [{ who: 'Capt. Dunlop', role: 'you', at: '2026-07-02', text: 'Full FOD sweep before an unscheduled tow — worth noting.' }],
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
