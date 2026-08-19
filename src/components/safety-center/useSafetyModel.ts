// Builds the safety model from real stores only. Hazards (HazardContext) are
// mapped onto the five-stage lifecycle; the move/waiting/track/done buckets are
// derived per item and drive sorting and door counts — they are not visible
// navigation language (D38). Work lists carry no mock rows, so every count on
// screen corresponds to a record a user can act on; MOCK_SUBMISSIONS /
// MOCK_PUBLISHED remain only as archive/library history seeds.

import { useMemo } from 'react';
import { differenceInCalendarDays } from 'date-fns';
import { useHazards, WORKFLOW_STAGES, type Hazard } from '../../contexts/HazardContext';
import { useAsapReports, type AsapReport } from './asapReports';
import type { PublishedReport, SafetyItem, SafetyModel, StatusChip, ThreadMsg } from './types';
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
    ageDays: age,
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

/** ASAP reports are reports, and they were reachable only from a sub-tab — a
 *  safety manager had to REMEMBER to go and look. They now ride the same Triage
 *  and Investigate surfaces as hazards.
 *
 *  ASAP is non-punitive and confidential: the store deliberately holds no
 *  reporter identity, and nothing here may invent one. The card shows the phase
 *  and airport, never a person, and opening it goes to the ASAP sheet with its
 *  de-identification step rather than the generic detail sheet. */
export function asapToItem(r: AsapReport): SafetyItem {
  const phase = r.status === 'Open' ? 0 : r.status === 'Under review' ? 1 : 4;
  const closed = phase === 4;
  const age = Math.max(0, differenceInCalendarDays(new Date(), new Date(r.submittedAt)));
  return {
    id: `asap-${r.id}`,
    type: 'ASAP',
    bucket: closed ? 'done' : phase === 0 ? 'move' : 'track',
    sourceId: r.id,
    ref: r.id,
    title: `${r.phase} · ${r.airport}`,
    sub: r.deidentified ? 'De-identified' : 'Contains raw detail',
    phaseIndex: phase,
    stalled: !closed && age > STALL_DAYS,
    ageDays: age,
    ageLabel: closed ? '' : `${age} day${age === 1 ? '' : 's'} old`,
    // Never a name. ASAP confidentiality is the whole point of the programme.
    submittedBy: 'Confidential',
    date: r.submittedAt.slice(0, 10),
    when: closed ? r.submittedAt.slice(0, 10) : undefined,
    status: { label: r.status, tone: r.status === 'Resolved' ? 'green' : r.status === 'Open' ? 'amber' : 'neutral' },
    mine: r.status === 'Open',
    nextAction: 'Review',
  };
}

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

export function buildSafetyModel(hazards: Hazard[], asap: AsapReport[] = []): SafetyModel {
  // Dedup by id defensively — the persisted hazard store can carry duplicate
  // rows after a multi-instance localStorage race (see HazardContext load/merge).
  const seen = new Set<string>();
  const live = (hazards || []).filter((h) => {
    if (h.isDeleted || seen.has(h.id)) return false;
    seen.add(h.id);
    return true;
  });
  const hz = live.map(hazardToItem);
  const asapItems = (asap || []).map(asapToItem);
  const all = [...hz, ...asapItems];
  const hzMove = all.filter((i) => i.bucket === 'move');
  const hzTrack = all.filter((i) => i.bucket === 'track');
  const hzDone = all.filter((i) => i.bucket === 'done');
  // Crew: my own open reports (visible as "with the safety team").
  const myWaiting = live
    .filter((h) => !h.isAnonymous && h.reportedBy === REPORTER && phaseIndexOf(h.workflowStage) < 4)
    .map(hazardToWaitingItem);
  const myDone = hzDone.filter((i) => i.submittedBy === REPORTER);

  // Submissions archive = every hazard (any state) + seeded non-hazard history.
  const submissions: SafetyItem[] = [...hz, ...asapItems, ...MOCK_SUBMISSIONS]
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
      // The crew's "needs you" list is crewWorklist's job now (D85 · C2) — it
      // merges three stores this model never saw. Nothing fills this any more.
      move: [],
      waiting: myWaiting,
      done: myDone,
    },
    ops: {
      move: hzMove,
      track: hzTrack,
      done: hzDone,
    },
    submissions,
    published: [...MOCK_PUBLISHED, ...derivedPublished],
  };
}

export function useSafetyModel(): SafetyModel {
  const { hazards } = useHazards();
  const { reports } = useAsapReports();
  return useMemo(() => buildSafetyModel(hazards || [], reports || []), [hazards, reports]);
}
