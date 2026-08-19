// The safety manager's jobs, named as VERBS (D85 — direction "Flip 3").
//
// The old console navigated by container — Inbox · Track · Reviews · Audits ·
// Manage. This navigates by the job the safety manager is actually doing, and
// each verb declares the SHAPE that job deserves: triage is spatial, so it gets
// a board; a decision is one thing at a time, so it gets a queue.
//
// The verbs are not a rename of the old tabs. Two of them cut across the old
// containers on purpose:
//   · ASAP is its own verb — its own legal regime, not another report type. It
//     never joins a shared board: the narrative is raw crew testimony until a
//     third-party service de-identifies it.
//   · Assure carries the audit programme AND the FRAT/GRAT reviews. Approving a
//     request is a decision; reviewing a risk assessment is assurance. The old
//     "Reviews" tab held both, which is the confusion this rework exists to end.

import { Inbox, CircleCheck, Search, Wrench, ClipboardCheck, Megaphone, Archive, Lock } from 'lucide-react';
import type { SafetyItem } from './types';

export type VerbId = 'triage' | 'asap' | 'decide' | 'investigate' | 'mitigate' | 'assure' | 'publish' | 'records';

/** What a verb's surface looks like. Consumed for real in C4; declared here so
 *  the decision lives with the verb rather than in a switch at a call site. */
export type Shape = 'board' | 'queue' | 'calendar' | 'list' | 'table';

export interface VerbDef {
  id: VerbId;
  label: string;
  /** The header sub-line — says what the number on the rail actually counts. */
  blurb: string;
  icon: typeof Inbox;
  defaultShape: Shape;
  /** Every shape this verb can render, `defaultShape` first. A verb with one
   *  entry shows no toggle — a control that does nothing is worse than none. */
  shapes: Shape[];
  /** `daily` verbs sit above the rule, `periodic` below it. */
  group: 'daily' | 'periodic';
}

export const VERBS: VerbDef[] = [
  { id: 'triage', label: 'Triage', group: 'daily', icon: Inbox,
    defaultShape: 'board', shapes: ['board', 'queue'],
    blurb: 'Hazards nobody has picked up yet' },
  // Decide keeps a single shape until C5 replaces ReviewsArea with the real
  // review surface. Offering a Board toggle over four stacked consoles would be
  // a control with nothing behind it.
  // ASAP is its own verb because it is its own LEGAL regime, not because it is
  // another kind of report. It never appears on a shared board: the narrative is
  // raw crew testimony until a third-party service de-identifies it.
  { id: 'asap', label: 'ASAP', group: 'daily', icon: Lock,
    defaultShape: 'list', shapes: ['list'],
    blurb: 'Confidential crew reports — de-identified before anyone else sees them' },
  { id: 'decide', label: 'Decide', group: 'daily', icon: CircleCheck,
    defaultShape: 'queue', shapes: ['queue'],
    blurb: 'Waivers and approvals waiting on your review' },
  { id: 'investigate', label: 'Investigate', group: 'daily', icon: Search,
    defaultShape: 'board', shapes: ['board', 'queue'],
    blurb: 'Open cases being worked' },
  { id: 'mitigate', label: 'Mitigate', group: 'daily', icon: Wrench,
    defaultShape: 'queue', shapes: ['queue', 'board'],
    blurb: 'Corrective actions in flight' },
  { id: 'assure', label: 'Assure', group: 'periodic', icon: ClipboardCheck,
    defaultShape: 'calendar', shapes: ['calendar'],
    blurb: 'The audit programme, and FRAT / GRAT reviews' },
  { id: 'publish', label: 'Publish', group: 'periodic', icon: Megaphone,
    defaultShape: 'list', shapes: ['list'],
    blurb: 'Lessons, newsletters and recognitions' },
  { id: 'records', label: 'Records', group: 'periodic', icon: Archive,
    defaultShape: 'table', shapes: ['table'],
    blurb: 'Every record ever filed, and the form setup behind them' },
];

export const DEFAULT_VERB: VerbId = 'triage';

/** `?verb=` is user-supplied. Anything unrecognized reads as Triage rather than
 *  rendering an empty console. */
export function parseVerb(raw: string | null | undefined): VerbId {
  return VERBS.some((v) => v.id === raw) ? (raw as VerbId) : DEFAULT_VERB;
}

export function verbDef(id: VerbId): VerbDef {
  return VERBS.find((v) => v.id === id)!;
}

// ── counts ─────────────────────────────────────────────────────────────────
// The rail carries a number only where one can be computed and means "this many
// things are waiting on you". Publish and Records are places you go, not queues
// that fill up, so they carry none — a number there would invent an obligation.

export type CountTone = 'none' | 'amber' | 'red';
export interface VerbCount { n?: number; tone: CountTone }

export interface VerbCountInput {
  /** ops.move — hazards at the SUBMITTED stage. */
  move: SafetyItem[];
  /** ops.track — hazards in flight, carrying phaseIndex and `stalled`. */
  track: SafetyItem[];
  /** Approval requests currently waiting on this user's roles. */
  pendingApprovals: number;
  /** Audits not yet Complete. */
  auditsOpen: number;
  /** ASAP reports not yet Resolved. Counted, never listed on a shared surface. */
  asapOpen: number;
}

/** Phase indices from useSafetyModel's PHASE_OF collapse. */
const PHASE_INVESTIGATE = 1;
const PHASE_MITIGATE = 2;

export function atPhase(items: SafetyItem[], phase: number): SafetyItem[] {
  return items.filter((i) => i.phaseIndex === phase);
}

export function verbCounts(input: VerbCountInput): Record<VerbId, VerbCount> {
  const investigating = atPhase(input.track, PHASE_INVESTIGATE);
  const mitigating = atPhase(input.track, PHASE_MITIGATE);
  // Stalled is not its own stat tile any more — it colours the verb that owns
  // the stalled case, so the rail says where the rot is instead of just that
  // some exists.
  const tone = (items: SafetyItem[]): CountTone => (items.some((i) => i.stalled) ? 'red' : 'none');

  return {
    triage: { n: input.move.length, tone: input.move.length > 0 ? 'amber' : 'none' },
    asap: { n: input.asapOpen, tone: input.asapOpen > 0 ? 'amber' : 'none' },
    decide: { n: input.pendingApprovals, tone: input.pendingApprovals > 0 ? 'amber' : 'none' },
    investigate: { n: investigating.length, tone: tone(investigating) },
    mitigate: { n: mitigating.length, tone: tone(mitigating) },
    assure: { n: input.auditsOpen, tone: 'none' },
    publish: { tone: 'none' },
    records: { tone: 'none' },
  };
}
