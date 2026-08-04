import { describe, it, expect } from 'vitest';
import {
  clusterSessions,
  DEFAULT_CLUSTER_OPTIONS,
  type CommitPoint,
} from './sessionClustering';

/** Builds a commit `minutesFromStart` after 2026-07-06T09:00 local (-0400). */
function at(minutesFromStart: number, subject = 'feat: something'): CommitPoint {
  const base = Date.UTC(2026, 6, 6, 13, 0, 0); // 09:00 -0400
  const ms = base + minutesFromStart * 60_000;
  const iso = new Date(ms).toISOString();
  return { iso, epochMs: ms, localDate: iso.slice(0, 10), subject };
}

const opts = DEFAULT_CLUSTER_OPTIONS;

describe('session clustering', () => {
  it('returns nothing for no commits', () => {
    expect(clusterSessions([])).toEqual([]);
  });

  it('scores a lone commit at the floor, not zero', () => {
    const [s] = clusterSessions([at(0)]);
    expect(s.minutes).toBe(opts.min);
    expect(s.commits).toBe(1);
  });

  it('credits ramp-up time before the first commit of a session', () => {
    // Two commits 60 minutes apart is 60 minutes of visible work plus the
    // unrecorded stretch that produced the first one.
    const [s] = clusterSessions([at(0), at(60)]);
    expect(s.minutes).toBe(60 + opts.ramp);
  });

  it('keeps commits inside the gap threshold in one session', () => {
    const sessions = clusterSessions([at(0), at(30), at(60), at(89)]);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].commits).toBe(4);
  });

  it('cuts a new session once the gap is exceeded', () => {
    // 91 minutes of silence is a break, not thinking.
    const sessions = clusterSessions([at(0), at(91)]);
    expect(sessions).toHaveLength(2);
    expect(sessions.map((s) => s.commits)).toEqual([1, 1]);
  });

  it('treats a gap exactly ON the threshold as the same session', () => {
    // The boundary is "exceeds", so 90 stays together and 90.1 does not. Stated
    // as a test because an off-by-one here silently moves hours between days.
    expect(clusterSessions([at(0), at(90)])).toHaveLength(1);
    expect(clusterSessions([at(0), at(90.5)])).toHaveLength(2);
  });

  it('sorts unordered input before clustering', () => {
    const sessions = clusterSessions([at(60), at(0), at(30)]);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].minutes).toBe(60 + opts.ramp);
  });

  it('honours custom parameters', () => {
    const sessions = clusterSessions([at(0), at(100)], { gap: 120, ramp: 45, min: 60 });
    expect(sessions).toHaveLength(1);
    expect(sessions[0].minutes).toBe(145);
  });

  it('gives every session a stable id keyed on its first commit', () => {
    const once = clusterSessions([at(0), at(30)]);
    const twice = clusterSessions([at(0), at(30)]);
    expect(once[0].id).toBe(twice[0].id);
    // Re-deriving after another commit lands must not renumber the session —
    // that is what keeps a re-run an upsert instead of a duplicate.
    const extended = clusterSessions([at(0), at(30), at(45)]);
    expect(extended[0].id).toBe(once[0].id);
    expect(extended[0].minutes).toBeGreaterThan(once[0].minutes);
  });

  it('ids are distinct across sessions', () => {
    const sessions = clusterSessions([at(0), at(200), at(400)]);
    expect(new Set(sessions.map((s) => s.id)).size).toBe(3);
  });

  it('carries the first subject into the note with a count of the rest', () => {
    const [s] = clusterSessions([at(0, 'feat: MEL Section Two'), at(10), at(20)]);
    expect(s.note).toBe('feat: MEL Section Two (+2 more)');
  });

  it('does not add a count for a single-commit session', () => {
    const [s] = clusterSessions([at(0, 'fix: one thing')]);
    expect(s.note).toBe('fix: one thing');
  });

  it('caps a pathological subject line', () => {
    const [s] = clusterSessions([at(0, 'x'.repeat(900))]);
    expect(s.note.length).toBeLessThanOrEqual(500);
  });

  it('files a session under the fiscal year of its FIRST commit', () => {
    // A session that starts 30 June and runs past midnight belongs to the FY it
    // started in. Splitting it would be worse: the work was one sitting.
    const eve: CommitPoint = {
      iso: '2026-06-30T23:30:00-04:00',
      epochMs: Date.parse('2026-06-30T23:30:00-04:00'),
      localDate: '2026-06-30',
      subject: 'late one',
    };
    const after: CommitPoint = {
      iso: '2026-07-01T00:15:00-04:00',
      epochMs: Date.parse('2026-07-01T00:15:00-04:00'),
      localDate: '2026-07-01',
      subject: 'still going',
    };
    const sessions = clusterSessions([eve, after]);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].fy).toBe('FY26');
    expect(sessions[0].localDate).toBe('2026-06-30');
  });

  it('uses the commit’s own local date, so a trip abroad does not shift a day', () => {
    // Same instant, one from a -0400 laptop and one from +0200. The local date
    // differs and that is the point: the day is where the person was.
    const europe: CommitPoint = {
      iso: '2026-08-04T00:30:00+02:00',
      epochMs: Date.parse('2026-08-04T00:30:00+02:00'),
      localDate: '2026-08-04',
      subject: 'from Europe',
    };
    const [s] = clusterSessions([europe]);
    expect(s.localDate).toBe('2026-08-04');
    expect(s.fy).toBe('FY27');
  });
});
