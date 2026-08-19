// The crew worklist (D85) — "3 things need you", derived from the three stores
// that can actually owe a crew member something today.
//
// This is the spine of the crew page: the list answers "what now", and the
// quiet index below it answers "where is everything". Deriving it here, pure and
// fixture-tested, is deliberate — it reads four independent stores that each
// change on their own schedule, so a store change should break a test rather
// than a screen.
//
// THREE sources, not four. The D85 plan sketched a fourth — "FRAT not started
// for an upcoming leg" — and there is no data for it: MyFRATSubmissions browses
// submissions, and nothing links a scheduled leg to a missing assessment. A row
// that cannot be computed is not rendered.

import type { Audit } from '../../contexts/AuditContext';
import type { Hazard } from '../../contexts/HazardContext';
import type { RequiredRead } from '../documents/engine/acknowledgments';

export type CrewTaskKind = 'sign' | 'reply' | 'audit';
export type DueTone = 'red' | 'amber' | 'neutral';

export interface CrewTask {
  id: string;
  kind: CrewTaskKind;
  title: string;
  sub?: string;
  /** Rendered as the trailing chip. Absent where the source carries no date. */
  due?: { label: string; tone: DueTone };
  /** Where tapping lands: a `?door=` value on the crew page. */
  door: 'reads' | 'reports' | 'audits';
  /** For the door row's own count, and for the detail sheet. */
  sourceId: string;
}

const DAY_MS = 86_400_000;

/** Whole days from `nowMs` to `iso`; negative when the date has passed.
 *  Calendar-day granularity, computed on UTC midnights, so "due today" does not
 *  flip to "overdue" partway through the day. */
export function daysUntil(iso: string | undefined, nowMs: number): number | undefined {
  if (!iso) return undefined;
  const t = new Date(iso).getTime();
  if (isNaN(t)) return undefined;
  const startOf = (ms: number) => Math.floor(ms / DAY_MS);
  return startOf(t) - startOf(nowMs);
}

function dueChip(iso: string | undefined, nowMs: number): CrewTask['due'] {
  const d = daysUntil(iso, nowMs);
  if (d === undefined) return undefined;
  if (d < 0) return { label: `${-d} day${d === -1 ? '' : 's'} overdue`, tone: 'red' };
  if (d === 0) return { label: 'Due today', tone: 'red' };
  if (d === 1) return { label: 'Due tomorrow', tone: 'red' };
  if (d <= 7) return { label: `Due in ${d} days`, tone: 'amber' };
  return { label: `Due in ${d} days`, tone: 'neutral' };
}

/** A hazard of mine whose last thread message came from the safety team — i.e.
 *  they asked and are waiting on me. A hazard with no messages, or whose last
 *  message is my own, is not waiting on me and is not a task. */
export function awaitingMyReply(h: Hazard, reporterName: string): boolean {
  if (h.isDeleted || h.isAnonymous) return false;
  if (h.reportedBy !== reporterName) return false;
  const msgs = h.messages ?? [];
  const last = msgs[msgs.length - 1];
  return !!last && last.authorRole === 'safety';
}

export interface CrewWorklistInput {
  reads: RequiredRead[];
  hazards: Hazard[];
  audits: Audit[];
  reporterName: string;
  nowMs: number;
}

/** Ordering: anything with a date comes first, soonest (most overdue) first;
 *  undated tasks follow, oldest first. Ties break on kind then id so the list
 *  is stable across renders. */
function compare(a: CrewTask & { sortDays?: number; ageDays: number }, b: CrewTask & { sortDays?: number; ageDays: number }): number {
  const ad = a.sortDays, bd = b.sortDays;
  if (ad !== undefined && bd !== undefined && ad !== bd) return ad - bd;
  if (ad !== undefined && bd === undefined) return -1;
  if (ad === undefined && bd !== undefined) return 1;
  if (a.ageDays !== b.ageDays) return b.ageDays - a.ageDays;
  if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
  return a.id.localeCompare(b.id);
}

/** At most this many rows per kind. A cap on the TOTAL would let one noisy
 *  source starve another — 13 overdue audits would push a required signature
 *  off the list, and a signature is the legally meaningful one. Capping per
 *  kind guarantees every source that owes you something is represented. */
export const PER_KIND_CAP = 3;

export interface CrewWorklist {
  tasks: CrewTask[];
  /** One entry per kind that was truncated, for the "+N more" rows. */
  more: { kind: CrewTaskKind; count: number; door: CrewTask['door'] }[];
}

export function buildCrewWorklist(input: CrewWorklistInput): CrewWorklist {
  const { reads, hazards, audits, reporterName, nowMs } = input;
  const rows: (CrewTask & { sortDays?: number; ageDays: number })[] = [];

  for (const r of reads) {
    rows.push({
      id: `read-${r.rev.id}`,
      kind: 'sign',
      title: `Read and sign — ${r.doc.title}`,
      sub: r.rev.changeSummary || undefined,
      due: dueChip(r.rev.ackDueDate, nowMs),
      door: 'reads',
      sourceId: r.rev.id,
      sortDays: daysUntil(r.rev.ackDueDate, nowMs),
      ageDays: daysUntil(r.rev.effectiveDate, nowMs) !== undefined
        ? -(daysUntil(r.rev.effectiveDate, nowMs) as number)
        : 0,
    });
  }

  for (const h of hazards) {
    if (!awaitingMyReply(h, reporterName)) continue;
    const msgs = h.messages ?? [];
    const last = msgs[msgs.length - 1];
    const askedDays = daysUntil(last?.atUtc, nowMs);
    rows.push({
      id: `reply-${h.id}`,
      kind: 'reply',
      title: 'Safety asked a question on your report',
      sub: h.title || undefined,
      door: 'reports',
      sourceId: h.id,
      ageDays: askedDays === undefined ? 0 : -askedDays,
    });
  }

  for (const a of audits) {
    if (a.status === 'Complete') continue;
    rows.push({
      id: `audit-${a.id}`,
      kind: 'audit',
      title: a.title,
      sub: a.status,
      due: dueChip(a.dueDate, nowMs),
      door: 'audits',
      sourceId: String(a.id),
      sortDays: daysUntil(a.dueDate, nowMs),
      ageDays: 0,
    });
  }

  rows.sort(compare);

  const kept: typeof rows = [];
  const seenByKind: Record<string, number> = {};
  const droppedByKind: Record<string, { count: number; door: CrewTask['door'] }> = {};
  for (const r of rows) {
    const n = (seenByKind[r.kind] ?? 0) + 1;
    seenByKind[r.kind] = n;
    if (n <= PER_KIND_CAP) kept.push(r);
    else {
      const d = droppedByKind[r.kind] ?? { count: 0, door: r.door };
      droppedByKind[r.kind] = { count: d.count + 1, door: d.door };
    }
  }

  return {
    tasks: kept.map(({ sortDays: _s, ageDays: _a, ...task }) => task),
    // Ordered by kind so the "+N more" rows are stable between renders.
    more: Object.keys(droppedByKind).sort().map((kind) => ({
      kind: kind as CrewTaskKind,
      count: droppedByKind[kind].count,
      door: droppedByKind[kind].door,
    })),
  };
}
