/**
 * Turning a list of commit timestamps into work sessions.
 *
 * Pure logic, kept here rather than in scripts/ so the test suite reaches it:
 * this function is what decides how many hours the assisted work is worth, and
 * an error in it is invisible — a wrong number looks exactly like a right one.
 *
 * The method:
 *   1. Sort commits ascending by author time.
 *   2. Cut a session wherever the gap to the next commit exceeds `gap`.
 *   3. Score a session as (last - first) + `ramp`, because the first commit is
 *      preceded by unrecorded work — reading, planning, and the edits that
 *      produced it.
 *   4. Floor each session at `min` so a lone commit is not scored zero.
 *
 * It is a FLOOR, not a true total. Work that produced no commit — design
 * discussion, review, device testing, debugging that never landed — leaves no
 * trace in git and is not counted. Log that by hand.
 */

import { fiscalYearOf } from './workLog';

export interface CommitPoint {
  /** ISO 8601 with the original UTC offset preserved. */
  iso: string;
  epochMs: number;
  /** The commit's LOCAL calendar day, 'YYYY-MM-DD'. */
  localDate: string;
  subject: string;
}

export interface ClusterOptions {
  /** Minutes of silence that end a session. */
  gap: number;
  /** Minutes credited before a session's first commit. */
  ramp: number;
  /** Shortest session worth recording. */
  min: number;
}

export const DEFAULT_CLUSTER_OPTIONS: ClusterOptions = { gap: 90, ramp: 25, min: 30 };

export interface DerivedSession {
  /** Deterministic across runs, so re-deriving upserts rather than duplicates. */
  id: string;
  startedAt: string;
  endedAt: string;
  minutes: number;
  commits: number;
  localDate: string;
  fy: string;
  note: string;
}

export function clusterSessions(
  commits: CommitPoint[],
  opts: ClusterOptions = DEFAULT_CLUSTER_OPTIONS,
): DerivedSession[] {
  const sorted = [...commits].sort((a, b) => a.epochMs - b.epochMs);
  const sessions: DerivedSession[] = [];
  let bucket: CommitPoint[] = [];

  const flush = () => {
    if (bucket.length === 0) return;
    const first = bucket[0];
    const last = bucket[bucket.length - 1];
    const spanMin = (last.epochMs - first.epochMs) / 60_000;
    const extra = bucket.length > 1 ? ` (+${bucket.length - 1} more)` : '';
    sessions.push({
      id: `git_${first.epochMs}`,
      startedAt: first.iso,
      endedAt: last.iso,
      minutes: Math.round(Math.max(spanMin + opts.ramp, opts.min)),
      commits: bucket.length,
      localDate: first.localDate,
      fy: fiscalYearOf(first.localDate),
      note: `${first.subject}${extra}`.slice(0, 500),
    });
    bucket = [];
  };

  for (const c of sorted) {
    const prev = bucket[bucket.length - 1];
    if (prev && (c.epochMs - prev.epochMs) / 60_000 > opts.gap) flush();
    bucket.push(c);
  }
  flush();

  return sessions;
}
