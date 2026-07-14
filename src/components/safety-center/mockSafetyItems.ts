// Mock supplements for item types the app doesn't yet model as first-class data
// (FRAT/GRAT/waiver/audit/sign-off/ASAP/CWS). Real hazards come from HazardContext
// and are merged in by useSafetyModel; these fill out the rest of the picture so the
// Do/Track/Know experience is fully navigable for evaluation.

import type { SafetyItem, KnowItem } from './types';

export const MY_MOVE: SafetyItem[] = [
  {
    id: 'm-signoff-1', type: 'SIGN-OFF', bucket: 'move',
    title: 'Read & sign SMS Manual rev G', sub: 'Document sign-off',
    due: { label: 'Due 3d', tone: 'red' },
    fields: [
      { label: 'What', value: 'Acknowledge SMS Manual rev G' },
      { label: 'Assigned by', value: 'Safety Dept' },
      { label: 'Due', value: 'Fri 12 Jul' },
    ],
    thread: [{ who: 'K. Bell (Safety)', role: 'team', at: 'Mon', text: 'Two changes this rev: fatigue reporting + a new de-ice hold-over table. ~5 min read.' }],
    actions: [{ label: 'Open document', primary: true }, { label: 'Snooze' }],
  },
  {
    id: 'm-frat-1', type: 'FRAT', bucket: 'move',
    title: 'Complete FRAT — N1PG · KTEB → KASE', sub: 'Departs tomorrow 14:00Z',
    due: { label: 'Tomorrow', tone: 'amber' },
    fields: [
      { label: 'Aircraft', value: 'N1PG (G650)' },
      { label: 'Route', value: 'KTEB → KASE' },
      { label: 'ETD', value: 'Tomorrow 14:00Z' },
    ],
    thread: [{ who: 'System', role: 'system', at: 'Auto', text: 'FRAT required before this leg — it lives on your trip, surfaced here so it is not missed.' }],
    actions: [{ label: 'Start FRAT', primary: true }, { label: 'Go to trip' }],
  },
];

export const MY_WAITING: SafetyItem[] = [
  {
    id: 'w-waiver-1', type: 'WAIVER', bucket: 'waiting', who: 'RV',
    title: 'Duty-time extension — with DOM', sub: 'W-89 · pending review · 3h', nudge: 'Nudge',
    fields: [
      { label: 'Ref', value: 'W-89' },
      { label: 'Request', value: '+1:30 duty' },
      { label: 'With', value: 'R. Vance (DOM)' },
    ],
    thread: [{ who: 'You', role: 'you', at: '3h ago', text: 'Requesting a duty extension for the weather re-route.' }],
    actions: [{ label: 'View request', primary: true }],
  },
];

export const MY_DONE: SafetyItem[] = [
  { id: 'd-my-1', type: 'WAIVER', bucket: 'done', title: 'Waiver W-88 approved & filed', when: 'Tue' },
  { id: 'd-my-2', type: 'FRAT', bucket: 'done', title: 'FRAT — N6PG KTEB→KPBI submitted', when: 'Mon' },
  { id: 'd-my-3', type: 'SIGN-OFF', bucket: 'done', title: 'Signed FOB 26-04', when: 'Mon' },
  { id: 'd-my-4', type: 'CWS', bucket: 'done', title: 'Logged CWS — recognized J. Kerr', when: 'Fri' },
];

// Manager "Your move" — approvals/decisions that are not hazards (hazards get
// merged in from real data by useSafetyModel).
export const OPS_MOVE: SafetyItem[] = [
  {
    id: 'o-frat-1', type: 'FRAT', bucket: 'move',
    title: 'Approve FRAT — N1PG KTEB→KASE', sub: 'Capt. Dunlop · elevated score',
    due: { label: 'By 14:00Z', tone: 'amber' },
    fields: [
      { label: 'Crew', value: 'Dunlop / Marsh' },
      { label: 'Score', value: 'Elevated (terrain + night)' },
      { label: 'ETD', value: 'Tomorrow 14:00Z' },
    ],
    thread: [{ who: 'System', role: 'system', at: '2h ago', text: 'Score elevated: KASE terrain + night + a fatigue flag.' }],
    actions: [{ label: 'Review & approve', primary: true }, { label: 'Request mitigation' }],
  },
  {
    id: 'o-waiver-1', type: 'WAIVER', bucket: 'move',
    title: 'Approve duty-time extension — M. Cho', sub: 'Weather re-route · 3h ago',
    due: { label: 'Pending', tone: 'neutral' },
    fields: [
      { label: 'Requested by', value: 'M. Cho' },
      { label: 'Request', value: '+2:00 duty' },
      { label: 'Trip', value: 'KTEB-KMIA' },
    ],
    thread: [{ who: 'M. Cho', role: 'you', at: '3h ago', text: 'Convective delay out of KTEB.' }],
    actions: [{ label: 'Approve', primary: true }, { label: 'Deny with note' }],
  },
  {
    id: 'o-grat-1', type: 'GRAT', bucket: 'move',
    title: 'Approve GRAT — engine cowl removal, N5PG', sub: 'T. Ward · low risk',
    due: { label: 'Pending', tone: 'neutral' },
    fields: [
      { label: 'Tech', value: 'T. Ward' },
      { label: 'Task', value: 'No.2 cowl / borescope' },
      { label: 'Risk', value: 'Low' },
    ],
    thread: [{ who: 'T. Ward', role: 'you', at: '6h ago', text: 'Standard borescope, low risk.' }],
    actions: [{ label: 'Review & approve', primary: true }],
  },
];

// Manager Track — non-hazard long-lived items (audit finding). Hazards merge in
// from real data; this guarantees the board shows the "waiting on mitigation" and
// "verify effectiveness" states even before hazard seed data is present.
export const OPS_TRACK: SafetyItem[] = [
  {
    id: 't-audit-1', type: 'AUDIT', bucket: 'track', ref: '#F-2209',
    title: 'Q2 audit finding — GSE inspection tags',
    phaseIndex: 2, stalled: false, ageLabel: '8 days', owner: 'T. Ward', mine: false,
    waitingText: 'retag GSE (due in 4d)',
    nextAction: 'View',
    status: { label: 'Mitigation in work', tone: 'neutral' },
    fields: [
      { label: 'Ref', value: '#F-2209' }, { label: 'Stage', value: 'Mitigate' },
      { label: 'Owner', value: 'T. Ward' }, { label: 'Due', value: 'in 4 days' },
    ],
    thread: [{ who: 'You', role: 'team', at: '8d ago', text: 'Finding assigned to T. Ward for retag.' }],
    actions: [{ label: 'View', primary: true }, { label: 'Nudge owner' }],
  },
];

export const OPS_DONE: SafetyItem[] = [
  {
    id: 'od-1', type: 'FRAT', bucket: 'done', title: 'N6PG KTEB→KPBI approved', when: '4d ago',
    status: { label: 'Approved', tone: 'green' },
    fields: [{ label: 'Crew', value: 'Capt. Ellis' }, { label: 'Score', value: 'Nominal' }],
    thread: [{ who: 'You', role: 'team', at: '4d ago', text: 'Nominal — approved.' }],
    actions: [{ label: 'View', primary: true }],
  },
  {
    id: 'od-2', type: 'AUDIT', bucket: 'done', title: 'Q2 hangar audit — 2 findings resolved', when: 'Last month',
    status: { label: 'Closed', tone: 'neutral' },
    fields: [{ label: 'Scope', value: 'Hangar 2 GSE' }, { label: 'Findings', value: '2 (resolved)' }],
    thread: [{ who: 'Safety', role: 'team', at: '1mo ago', text: 'Both corrected & verified.' }],
    actions: [{ label: 'View report', primary: true }],
  },
];

export const KNOW: KnowItem[] = [
  { id: 'k1', icon: 'triangle-alert', tone: 'haz', text: 'J. Reyes filed a hazard — hydraulic smell, N2PG', at: '4h ago', promo: 'do', promoLabel: 'Added to Your move (triage)' },
  { id: 'k2', icon: 'file-text', tone: 'doc', text: 'FOB 26-05 published — read & initial by Friday', at: '6h ago', promo: 'do', promoLabel: 'Added to Your move (sign-off)' },
  { id: 'k3', icon: 'check', tone: 'ok', text: 'Your waiver W-88 was approved by the DOM', at: 'Tue', promo: 'track', promoLabel: 'Moved to Done' },
  { id: 'k4', icon: 'clock', tone: 'info', text: 'Hazard #H-231 effectiveness check auto-scheduled for 10 Sep', at: '1d ago', promo: 'fyi', promoLabel: 'FYI · no action' },
];
