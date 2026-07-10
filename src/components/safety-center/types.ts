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
  owner?: string;      // who holds the ball
  waitingText?: string;
  nextAction?: string;
  mine?: boolean;      // your move on this tracked item

  // done
  when?: string;

  // shared
  status?: StatusChip;
  fields?: Field[];
  thread?: ThreadMsg[];
  actions?: ItemAction[];
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
  know: KnowItem[];
}

export type SafetyView = 'my' | 'ops';
