// Do / Track / Know model for the redesigned Safety Center.
// One unified item shape keeps the detail sheet simple; `bucket` discriminates
// which list an item renders in, and which fields are meaningful.

export type SafetyItemType =
  | 'HAZARD' | 'ASAP' | 'FRAT' | 'GRAT' | 'WAIVER' | 'AUDIT' | 'SIGN-OFF' | 'CWS';

export type Bucket = 'move' | 'waiting' | 'track' | 'done';
export type Tone = 'red' | 'amber' | 'green' | 'neutral' | 'accent';

// The five-stage lifecycle the Track board shows. The underlying HazardContext
// has 14 granular WORKFLOW_STAGES; these collapse into a legible spine.
export type Phase = 'Triage' | 'Investigate' | 'Mitigate' | 'Verify' | 'Closed';
export const PHASES: Phase[] = ['Triage', 'Investigate', 'Mitigate', 'Verify', 'Closed'];

export interface ThreadMsg {
  who: string;
  role: 'you' | 'team' | 'system';
  at: string;
  text: string;
}

export interface Field {
  label: string;
  value: string;
}

export interface ItemAction {
  label: string;
  primary?: boolean;
}

export interface StatusChip {
  label: string;
  tone: Tone;
}

export interface SafetyItem {
  id: string;
  type: SafetyItemType;
  bucket: Bucket;
  title: string;
  sub?: string;
  ref?: string;

  // move (Do)
  due?: { label: string; tone: Tone };

  // waiting
  who?: string;        // initials for the avatar
  nudge?: string;      // nudge affordance label

  // track (lifecycle)
  phaseIndex?: number; // index into PHASES
  stalled?: boolean;
  ageLabel?: string;
  /** Days in the current stage, as a NUMBER. `ageLabel` is display-only and
   *  cannot be grouped on, which is what a board needs to bucket by age. */
  ageDays?: number;
  /** Days until the corrective action is due; negative once overdue. Absent
   *  where the record carries no due date. Mitigate groups on this rather than
   *  on age — how long a fix has been open says less than when it is owed. */
  dueDays?: number;
  owner?: string;      // who holds the ball
  waitingText?: string;
  nextAction?: string;
  mine?: boolean;      // your move on this tracked item

  // done
  when?: string;

  // archive / search
  submittedBy?: string;
  date?: string;       // ISO or display date used for sort/search
  tail?: string;

  // provenance — set on hazard-derived items so actions can write back
  sourceId?: string;   // raw HazardContext id
  rawStage?: string;   // raw WORKFLOW_STAGES value (for stage advance)

  // shared
  status?: StatusChip;
  fields?: Field[];
  thread?: ThreadMsg[];
  actions?: ItemAction[];
}

// ---- Forms catalog (crew fill-out) ----
export interface FormDef {
  key: 'hazard' | 'asap' | 'cws' | 'waiver';
  name: string;
  blurb: string;
  icon: string;        // lucide icon name
  tone: 'amber' | 'red' | 'gold' | 'accent';
  time: string;        // rough time-to-fill
}

// ---- Form templates (SM management) ----
// 'checkbox' is a single yes/no toggle; 'multiselect' is a check-all-that-apply
// group (risk factors, event types, contributing factors on the intake forms).
export type FieldType = 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'multiselect' | 'number' | 'date';

export interface FormField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
}

export type FormKind = 'Hazard' | 'ASAP' | 'CWS' | 'Waiver' | 'FRAT' | 'GRAT' | 'Audit';

export interface FormTemplate {
  id: string;
  kind: FormKind;
  name: string;
  description: string;
  scored: boolean;      // risk-scored forms (FRAT/GRAT) vs plain
  fields: FormField[];
  // Ordered approver role ids (D39). A filed form with a non-empty chain
  // creates an ApprovalRequest routed through these roles in turn. Undefined /
  // empty = no approval step. Not honored for Hazard (its own workflow governs).
  approvalChain?: string[];
  /** May an approver END this request outright? Waivers only for now (Bryan,
   *  2026-08-19). The chain engine is generic, so without this a CWS
   *  recognition could be killed with the same button — which is not what
   *  anyone means by declining. Absent reads as FALSE: a form has to earn the
   *  power to be refused outright, and "send back" is always available. */
  canDecline?: boolean;
}

// ---- Published reports (everyone) ----
export interface PublishedReport {
  id: string;
  ref: string;
  title: string;
  category: string;
  publishedDate: string;
  summary: string;
  whatHappened: string;
  lessons: string[];
}

export interface KnowItem {
  id: string;
  icon: string;
  tone: 'haz' | 'ok' | 'doc' | 'info';
  text: string;
  at: string;
  promo: 'do' | 'track' | 'fyi';
  promoLabel: string;
}

export interface SafetyModel {
  my: { move: SafetyItem[]; waiting: SafetyItem[]; done: SafetyItem[] };
  ops: { move: SafetyItem[]; track: SafetyItem[]; done: SafetyItem[] };
  submissions: SafetyItem[];      // every record ever filed — the SM archive
  published: PublishedReport[];   // de-identified lessons-learned library
}

export type SafetyView = 'my' | 'ops';
