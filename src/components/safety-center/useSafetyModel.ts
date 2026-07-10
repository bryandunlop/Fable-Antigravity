// Builds the Do/Track/Know model. Real hazards (HazardContext) are mapped onto the
// five-stage lifecycle and merged with mock supplements for the other item types.

import { useMemo } from 'react';
import { differenceInCalendarDays } from 'date-fns';
import { useHazards, WORKFLOW_STAGES, type Hazard } from '../../contexts/HazardContext';
import type { PublishedReport, SafetyItem, SafetyModel, StatusChip, ThreadMsg } from './types';
import {
  MY_MOVE, MY_WAITING, MY_DONE, OPS_MOVE, OPS_TRACK, OPS_DONE, KNOW,
} from './mockSafetyItems';
import { MOCK_SUBMISSIONS, MOCK_PUBLISHED } from './forms';

const STALL_DAYS = 30;

// Collapse the 14 granular workflow stages into the 5-phase lifecycle spine.
const PHASE_OF: Record<string, number> = {
  [WORKFLOW_STAGES.SUBMITTED]: 0,
  [WORKFLOW_STAGES.SM_INVESTIGATION]: 1,
  [WORKFLOW_STAGES.ASSIGN_MITIGATION]: 2,
  [WORKFLOW_STAGES.MITIGATION_DEVELOPMENT]: 2,
  [WORKFLOW_STAGES.SM_MITIGATION_REVIEW]: 2,
  [WORKFLOW_STAGES.MANAGER_APPROVAL]: 2,
  [WORKFLOW_STAGES.SM_POST_MANAGER]: 2,
  [WORKFLOW_STAGES.EXEC_APPROVAL]: 2,
  [WORKFLOW_STAGES.SM_POST_EXEC]: 2,
  [WORKFLOW_STAGES.IMPLEMENTATION]: 2,
  [WORKFLOW_STAGES.FINAL_REPORT]: 3,
  [WORKFLOW_STAGES.EFFECTIVENESS_REVIEW]: 3,
  [WORKFLOW_STAGES.PUBLISHED]: 4,
  [WORKFLOW_STAGES.CLOSED]: 4,
};

export function phaseIndexOf(stage: string): number {
  return PHASE_OF[stage] ?? 1;
}

export function ageInStage(h: Hazard): number {
  if (typeof h.daysInStage === 'number') return h.daysInStage;
  const raw = h.reportedDate;
  if (!raw) return 0;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return 0;
  return Math.max(0, differenceInCalendarDays(new Date(), d));
}

function statusFor(phase: number, stalled: boolean): StatusChip {
  if (phase === 0) return { label: 'Needs triage', tone: 'neutral' };
  if (phase === 1) return { label: 'Investigating', tone: 'neutral' };
  if (phase === 2) return { label: stalled ? 'Accepted · mitigation open' : 'Mitigation in work', tone: stalled ? 'amber' : 'neutral' };
  if (phase === 3) return { label: 'Mitigated · verifying', tone: 'green' };
  return { label: 'Closed', tone: 'green' };
}

function threadFor(h: Hazard): ThreadMsg[] {
  const msgs: ThreadMsg[] = Array.isArray((h as any).messages)
    ? (h as any).messages.map((m: any) => ({
        who: m.authorName || (m.authorRole === 'safety' ? 'Safety' : 'Reporter'),
        role: m.authorRole === 'safety' ? 'team' : 'you',
        at: m.atUtc ? String(m.atUtc).slice(0, 10) : '',
        text: m.body || '',
      }))
    : [];
  if (msgs.length) return msgs;
  return [{ who: 'System', role: 'system', at: '', text: `Reported by ${h.reportedBy || 'crew'} — ${h.description?.slice(0, 120) || 'no description'}` }];
}

export function hazardToItem(h: Hazard): SafetyItem {
  const phase = phaseIndexOf(h.workflowStage);
  const age = ageInStage(h);
  const stalled = phase < 4 && age > STALL_DAYS;
  const mine = h.workflowStage === WORKFLOW_STAGES.SUBMITTED;
  const owner = h.assignedTo || undefined;
  const closed = phase === 4;

  return {
    id: `hz-${h.id}`,
    type: 'HAZARD',
    bucket: closed ? 'done' : mine ? 'move' : 'track',
    sourceId: h.id,
    rawStage: h.workflowStage,
    ref: `#${h.id}`,
    title: h.title || 'Untitled hazard',
    sub: h.category,
    phaseIndex: phase,
    stalled,
    ageLabel: closed ? '' : `${age} day${age === 1 ? '' : 's'} in stage`,
    owner,
    mine,
    waitingText: mine
      ? 'assign an owner & risk-rate'
      : owner ? `with ${owner}` : 'awaiting mitigation',
    nextAction: mine ? 'Triage' : 'View',
    when: closed ? (h.reportedDate ? String(h.reportedDate).slice(0, 10) : 'recently') : undefined,
    submittedBy: h.isAnonymous ? 'Anonymous' : (h.reportedBy || 'Crew'),
    date: h.reportedDate ? String(h.reportedDate).slice(0, 10) : undefined,
    status: closed ? { label: 'Closed', tone: 'green' } : statusFor(phase, stalled),
    due: mine ? { label: 'Triage now', tone: 'red' } : undefined,
    fields: [
      { label: 'Ref', value: `#${h.id}` },
      { label: 'Stage', value: h.workflowStage },
      { label: 'Severity', value: h.severity || '—' },
      { label: 'Owner', value: owner || 'Unassigned' },
      { label: 'Location', value: h.location || '—' },
      { label: 'Age in stage', value: `${age} days` },
    ],
    thread: threadFor(h),
    actions: mine
      ? [{ label: 'Triage & assign', primary: true }, { label: 'Open full workflow' }]
      : [{ label: 'View workflow', primary: true }, { label: 'Nudge owner' }],
  };
}

const MY_REPLY: SafetyItem = {
  id: 'm-reply-1', type: 'HAZARD', bucket: 'move',
  title: "Reply to safety's question on #H-241", sub: 'They asked which tow lane',
  due: { label: 'Waiting on you', tone: 'amber' },
  fields: [
    { label: 'Your report', value: 'FOD near stand 3' },
    { label: 'Ref', value: '#H-241' },
    { label: 'Asked by', value: 'J. Kerr (Safety)' },
  ],
  thread: [
    { who: 'You', role: 'you', at: '2d ago', text: 'Loose panel fastener + FOD near the tow path at stand 3.' },
    { who: 'J. Kerr (Safety)', role: 'team', at: '1d ago', text: 'West or east tow lane? Placing the barrier correctly.' },
  ],
  actions: [{ label: 'Reply', primary: true }, { label: 'View report' }],
};

// Demo identity — matches the reporter stamped by SafetyCenter.handleFiled.
const REPORTER = 'Capt. Dunlop';

/** The reporter's own open hazard, shaped for their Waiting list — so "track it
 *  under Waiting" is literally true the moment they file. */
function hazardToWaitingItem(h: Hazard): SafetyItem {
  const phase = phaseIndexOf(h.workflowStage);
  return {
    id: `hzw-${h.id}`,
    type: 'HAZARD',
    bucket: 'waiting',
    sourceId: h.id,
    rawStage: h.workflowStage,
    who: 'SF',
    title: h.title || 'Your hazard report',
    sub: `#${h.id} · with the safety team · ${phase === 0 ? 'awaiting triage' : h.workflowStage}`,
    nudge: 'View',
    fields: [
      { label: 'Ref', value: `#${h.id}` },
      { label: 'Stage', value: h.workflowStage },
      { label: 'Filed', value: h.reportedDate ? String(h.reportedDate).slice(0, 10) : '—' },
      { label: 'Location', value: h.location || '—' },
    ],
    thread: threadFor(h),
    actions: [{ label: 'View report', primary: true }],
  };
}

export function useSafetyModel(extraMove: SafetyItem[] = []): SafetyModel {
  const { hazards } = useHazards();

  return useMemo(() => {
    const live = (hazards || []).filter((h) => !h.isDeleted);
    const hz = live.map(hazardToItem);
    const hzMove = hz.filter((i) => i.bucket === 'move');
    const hzTrack = hz.filter((i) => i.bucket === 'track');
    const hzDone = hz.filter((i) => i.bucket === 'done');
    // Crew view: my own open reports, visible under Waiting.
    const myWaiting = live
      .filter((h) => !h.isAnonymous && h.reportedBy === REPORTER && phaseIndexOf(h.workflowStage) < 4)
      .map(hazardToWaitingItem);

    // Submissions archive = every hazard (any state) + non-hazard records.
    const submissions: SafetyItem[] = [...hz, ...MOCK_SUBMISSIONS]
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    // Published library = de-identified final reports.
    const derivedPublished: PublishedReport[] = live
      .filter((h) => h.workflowStage === WORKFLOW_STAGES.PUBLISHED || h.isPublished)
      .map((h) => ({
        id: `pub-${h.id}`,
        ref: `#${h.id}`,
        title: h.title || 'Published safety report',
        category: h.category || 'Safety',
        publishedDate: h.finalReportPublished ? '' : (h.reportedDate ? String(h.reportedDate).slice(0, 10) : ''),
        summary: h.deidentifiedMitigationSummary || h.description?.slice(0, 200) || '',
        whatHappened: h.finalReportPublished || h.description || '',
        lessons: h.suggestedCorrectiveAction ? [h.suggestedCorrectiveAction] : [],
      }));

    return {
      my: {
        move: [...extraMove, ...MY_MOVE, MY_REPLY],
        waiting: [...myWaiting, ...MY_WAITING],
        done: MY_DONE,
      },
      ops: {
        move: [...hzMove, ...OPS_MOVE],
        track: [...hzTrack, ...OPS_TRACK],
        done: [...hzDone.slice(0, 4), ...OPS_DONE],
      },
      submissions,
      published: [...MOCK_PUBLISHED, ...derivedPublished],
      know: KNOW,
    };
  }, [hazards, extraMove]);
}
