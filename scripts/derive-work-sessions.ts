/**
 * Reconstructs work sessions from this repository's git history and, with
 * --seed, writes them into the work log as source 'git'.
 *
 *   npx tsx scripts/derive-work-sessions.ts             # summary to stdout
 *   npx tsx scripts/derive-work-sessions.ts --json      # session rows as JSON
 *   npx tsx scripts/derive-work-sessions.ts --seed      # upsert into the database
 *   npx tsx scripts/derive-work-sessions.ts --gap 120 --ramp 45 --min 60
 *
 * Why this exists: assisted sessions leave a dense, timestamped trail in git,
 * so those hours can be reconstructed rather than remembered. Unassisted work
 * leaves no such trail and is logged by hand from the phone instead. Both
 * streams meet in the same `work_log_entries` table.
 *
 * The method, stated plainly because these numbers stand in for a timesheet:
 *
 *   1. Take every non-merge commit's AUTHOR timestamp — when the work happened,
 *      not when a rebase or merge rewrote it.
 *   2. Sort ascending and cut a new session wherever the gap between adjacent
 *      commits exceeds IDLE_GAP_MIN. A gap that long is a break, not thinking.
 *      This repo's gap distribution is sharply bimodal (median 8.7 min inside a
 *      session, p90 over 4 hours between them), so the cut points are not
 *      sensitive to the exact threshold.
 *   3. A session's span is (last commit - first commit) + RAMP_UP_MIN, because
 *      the first commit of a session is preceded by unrecorded work: reading,
 *      planning, and the edits that produced it.
 *   4. Floor each session at MIN_SESSION_MIN so a lone commit is not scored zero.
 *
 * What this deliberately does NOT do is invent hours. It is a floor, not a true
 * total: work that produced no commit — design discussion, review, device
 * testing, debugging that never landed — is invisible to git and absent here.
 *
 * Re-running after more commits land is safe. Rows are keyed deterministically
 * on the session's first commit, and a row you have since corrected by hand is
 * left alone (see UPSERT below).
 */

import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { eq } from 'drizzle-orm';

// The clustering itself lives in src/ so the test suite reaches it — it is what
// decides how many hours the assisted work is worth, and a wrong number there
// looks exactly like a right one. This file is the IO around it.
import {
  clusterSessions,
  dedupeCommits,
  type CommitPoint,
  type DerivedSession,
} from '../src/components/worklog/sessionClustering';

// ─── Tunables ───────────────────────────────────────────────────────────────
// Flags rather than constants so the total's sensitivity to them can be shown
// rather than asserted. Defaults are deliberately conservative.
const IDLE_GAP_MIN = num('--gap', 90);
const RAMP_UP_MIN = num('--ramp', 25);
const MIN_SESSION_MIN = num('--min', 30);

/** The category derived sessions are filed under. Matches CATEGORIES in workLog.ts. */
const DERIVED_CATEGORY = 'assisted-build';

function num(flag: string, fallback: number): number {
  const i = process.argv.indexOf(flag);
  if (i === -1) return fallback;
  const v = Number(process.argv[i + 1]);
  return Number.isFinite(v) ? v : fallback;
}

/**
 * Repository paths to read. Defaults to the current directory; pass --repo any
 * number of times, or --repos with a comma-separated list, to pool several.
 *
 * The project has lived in more than one repository — the app, its predecessor,
 * the iOS wrapper, the strategy vault — and a single afternoon often touches
 * more than one. They are pooled into ONE timeline before clustering so that
 * afternoon counts as one session rather than three.
 */
function repoPaths(): string[] {
  const paths: string[] = [];
  for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === '--repo' && process.argv[i + 1]) paths.push(process.argv[i + 1]);
  }
  const list = process.argv.indexOf('--repos');
  if (list !== -1 && process.argv[list + 1]) {
    paths.push(
      ...process.argv[list + 1]
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    );
  }
  return paths.length ? paths : ['.'];
}

function shortName(path: string): string {
  // Resolve first, so the default '.' reports as the repository's actual
  // directory name rather than a dot in the middle of the summary table.
  const parts = resolve(path).replace(/\/+$/, '').split('/');
  return parts[parts.length - 1] || path;
}

function readCommitsFrom(path: string): CommitPoint[] {
  // %aI = author date, strict ISO 8601 with the original UTC offset.
  // %ad with --date=format:%Y-%m-%d = the same instant as a LOCAL calendar day,
  // which is what the hours are bucketed by: commits span -0400 to +0200 and a
  // UTC-derived day would move a late-evening session onto the next date.
  //
  // %x1f is git's escape for a literal unit-separator byte. Spelled as an
  // escape rather than embedded raw so the format survives being edited.
  const SEP = '\x1f';
  const out = execFileSync(
    'git',
    [
      '-C',
      path,
      'log',
      '--no-merges',
      '--pretty=format:%aI%x1f%ad%x1f%s',
      '--date=format:%Y-%m-%d',
    ],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );

  const repo = shortName(path);
  return out
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [iso, localDate, ...rest] = line.split(SEP);
      return {
        iso,
        epochMs: new Date(iso).getTime(),
        localDate,
        subject: rest.join(SEP),
        repo,
      };
    })
    .filter((c) => Number.isFinite(c.epochMs));
}

function readCommits(): CommitPoint[] {
  return repoPaths()
    .flatMap(readCommitsFrom)
    .sort((a, b) => a.epochMs - b.epochMs);
}

const hours = (min: number) => (min / 60).toFixed(1);

// ─── Reporting ──────────────────────────────────────────────────────────────

function report(commits: CommitPoint[], sessions: DerivedSession[]) {
  const byFy = new Map<string, DerivedSession[]>();
  for (const s of sessions) {
    if (!byFy.has(s.fy)) byFy.set(s.fy, []);
    byFy.get(s.fy)!.push(s);
  }

  // Report the deduped figure, not the raw one: the same commit exists verbatim
  // in a repo and the repo it was forked from, and saying "950 commits" when 4
  // of them are one commit seen twice overstates the input.
  const unique = dedupeCommits(commits).length;
  const dropped = commits.length - unique;
  console.log(
    `\nDerived from ${unique} non-merge commits across ${repoPaths().length} ` +
      `${repoPaths().length === 1 ? 'repository' : 'repositories'}` +
      `${dropped > 0 ? ` (${dropped} duplicate${dropped === 1 ? '' : 's'} dropped)` : ''} ` +
      `(gap ${IDLE_GAP_MIN}m, ramp-up ${RAMP_UP_MIN}m, floor ${MIN_SESSION_MIN}m)\n`,
  );

  for (const [fy, rows] of [...byFy.entries()].sort()) {
    const min = rows.reduce((a, s) => a + s.minutes, 0);
    const days = new Set(rows.map((s) => s.localDate)).size;
    console.log(
      `${fy}  ${hours(min).padStart(7)} h   ${String(rows.length).padStart(3)} sessions   ` +
        `${String(days).padStart(3)} days   ${rows[0].localDate} → ${rows[rows.length - 1].localDate}`,
    );
  }

  const totalMin = sessions.reduce((a, s) => a + s.minutes, 0);
  console.log(`\nTOTAL ${hours(totalMin)} h across ${sessions.length} sessions\n`);

  // Per repository. A session that touched several is counted once against
  // EACH of them, so these deliberately sum to more than the total — they
  // answer "how much did this repo appear in", not "how do the hours divide".
  const repos = new Map<string, { min: number; sessions: number }>();
  for (const s of sessions) {
    for (const r of s.repos.length ? s.repos : ['(unknown)']) {
      const e = repos.get(r) ?? { min: 0, sessions: 0 };
      e.min += s.minutes;
      e.sessions += 1;
      repos.set(r, e);
    }
  }
  if (repos.size > 1) {
    console.log('BY REPOSITORY (sessions spanning repos count in each)');
    for (const [repo, e] of [...repos.entries()].sort((a, b) => b[1].min - a[1].min)) {
      console.log(
        `  ${hours(e.min).padStart(7)} h  ${String(e.sessions).padStart(3)} sessions  ${repo}`,
      );
    }
    console.log();
  }

  const byDay = new Map<string, { min: number; sessions: number; commits: number }>();
  for (const s of sessions) {
    const d = byDay.get(s.localDate) ?? { min: 0, sessions: 0, commits: 0 };
    d.min += s.minutes;
    d.sessions += 1;
    d.commits += s.commits;
    byDay.set(s.localDate, d);
  }
  console.log('DATE        HOURS  SESSIONS  COMMITS');
  for (const [date, d] of [...byDay.entries()].sort()) {
    console.log(
      `${date}  ${hours(d.min).padStart(5)}  ${String(d.sessions).padStart(8)}  ` +
        String(d.commits).padStart(7),
    );
  }
  console.log();
}

// ─── Seeding ────────────────────────────────────────────────────────────────

async function seed(sessions: DerivedSession[]) {
  // Loaded here rather than at module scope: dotenv announces itself on stdout,
  // which would corrupt `--json` for anything piping it. A report run needs no
  // environment at all.
  const { config } = await import('dotenv');
  config({ path: '.env.local', quiet: true });

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set — add it to .env.local to seed.');
    process.exitCode = 1;
    return;
  }

  const { eq: eqOp } = await import('drizzle-orm');
  const { createDb } = await import('../src/server/db/index');
  const { workLogEntries } = await import('../src/server/db/schema');

  const db = createDb();
  const stamp = new Date().toISOString();

  // --replace: clear every derived row first.
  //
  // Needed when the SET OF REPOSITORIES changes. Session ids are keyed on the
  // instant of a session's first commit, so adding a repo can merge two
  // sessions into one or shift a boundary — and the rows under the old ids are
  // then orphans that no future run will ever touch again, quietly inflating
  // the total. Hand-logged rows are never touched by this; only source='git'.
  if (process.argv.includes('--replace')) {
    const gone = await db
      .delete(workLogEntries)
      .where(eqOp(workLogEntries.source, 'git'))
      .returning({ id: workLogEntries.id });
    console.log(`\n--replace: cleared ${gone.length} derived row(s).`);
  }

  // UPSERT rule: a derived row you have since edited by hand is never
  // overwritten. An untouched row still has updatedAt === createdAt, which
  // distinguishes the two without carrying an extra column for it. Refreshing
  // moves BOTH stamps, so a refreshed row stays refreshable next run.
  const existing = await db
    .select({
      id: workLogEntries.id,
      createdAt: workLogEntries.createdAt,
      updatedAt: workLogEntries.updatedAt,
    })
    .from(workLogEntries);
  const known = new Map(existing.map((r) => [r.id, r]));

  const fresh = sessions.filter((s) => !known.has(s.id));
  const refreshable = sessions.filter((s) => {
    const k = known.get(s.id);
    return k != null && k.createdAt === k.updatedAt;
  });

  if (fresh.length) {
    await db.insert(workLogEntries).values(
      fresh.map((s) => ({
        id: s.id,
        localDate: s.localDate,
        minutes: s.minutes,
        category: DERIVED_CATEGORY,
        source: 'git',
        note: s.note,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        commits: s.commits,
        createdAt: stamp,
        updatedAt: stamp,
      })),
    ).onConflictDoNothing();
  }

  for (const s of refreshable) {
    await db
      .update(workLogEntries)
      .set({
        minutes: s.minutes,
        commits: s.commits,
        endedAt: s.endedAt,
        note: s.note,
        createdAt: stamp,
        updatedAt: stamp,
      })
      .where(eq(workLogEntries.id, s.id));
  }

  const preserved = sessions.length - fresh.length - refreshable.length;
  console.log(
    `\nSeeded: ${fresh.length} new, ${refreshable.length} refreshed, ` +
      `${preserved} left alone (edited by hand).\n`,
  );
}

// ─── Entry point ────────────────────────────────────────────────────────────

async function main() {
  const commits = readCommits();
  const sessions = clusterSessions(commits, { gap: IDLE_GAP_MIN, ramp: RAMP_UP_MIN, min: MIN_SESSION_MIN });

  if (process.argv.includes('--json')) {
    process.stdout.write(JSON.stringify(sessions, null, 2));
    return;
  }

  report(commits, sessions);

  if (process.argv.includes('--seed')) await seed(sessions);
}

if (process.argv[1]?.includes('derive-work-sessions')) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
