// src/server/routes/worklog.ts
//
// Personal effort log. Two streams land in one table: sessions derived from git
// history (source 'git', written by scripts/derive-work-sessions.ts) and time
// logged by hand from the phone (source 'manual' or 'timer').
//
// The route deliberately knows nothing about fiscal years. It filters on a
// plain date range and lets the caller decide what a year means — the FY
// boundary is a presentation rule, and duplicating it here would be a second
// place for it to drift.

import { Hono } from 'hono';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { workLogEntries } from '../db/schema';
import type { Db } from '../db';

type Env = { Variables: { db: Db } };
const worklogRoute = new Hono<Env>();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
/** A single entry longer than a day is a typo, not a work session. */
const MAX_MINUTES = 24 * 60;

interface EntryInput {
  id?: unknown;
  localDate?: unknown;
  minutes?: unknown;
  category?: unknown;
  source?: unknown;
  note?: unknown;
  startedAt?: unknown;
  endedAt?: unknown;
  commits?: unknown;
}

type Validated = {
  id: string;
  localDate: string;
  minutes: number;
  category: string;
  source: string;
  note: string;
  startedAt: string | null;
  endedAt: string | null;
  commits: number | null;
};

/** Returns the row to write, or a string describing why the input is unusable. */
function validate(body: EntryInput, fallbackId: () => string): Validated | string {
  const localDate = String(body.localDate ?? '');
  if (!DATE_RE.test(localDate)) return 'localDate must be YYYY-MM-DD';

  const minutes = Number(body.minutes);
  if (!Number.isFinite(minutes) || !Number.isInteger(minutes)) return 'minutes must be an integer';
  if (minutes <= 0) return 'minutes must be positive';
  if (minutes > MAX_MINUTES) return `minutes must be at most ${MAX_MINUTES}`;

  const category = String(body.category ?? '').trim();
  if (!category) return 'category is required';

  const source = String(body.source ?? 'manual');
  if (!['git', 'manual', 'timer'].includes(source)) return 'source must be git, manual or timer';

  const commits = body.commits == null ? null : Number(body.commits);
  if (commits != null && !Number.isFinite(commits)) return 'commits must be a number';

  return {
    id: typeof body.id === 'string' && body.id ? body.id : fallbackId(),
    localDate,
    minutes,
    category,
    source,
    note: String(body.note ?? '').slice(0, 2000),
    startedAt: body.startedAt == null ? null : String(body.startedAt),
    endedAt: body.endedAt == null ? null : String(body.endedAt),
    commits,
  };
}

const now = () => new Date().toISOString();
const newId = () => `wl_${crypto.randomUUID()}`;

// ─── Read ───────────────────────────────────────────────────────────────────

/**
 * Postgres 42P01 — undefined_table.
 *
 * Worth detecting rather than letting it 500: on the client an unexplained 500
 * is indistinguishable from having no signal, and that ambiguity already sent
 * one debugging session down the wrong path — the page said "offline" while
 * sitting on good wifi, because a missing table and a missing network look
 * identical from there.
 */
function isMissingTable(err: unknown): boolean {
  const e = err as { code?: string; message?: string };
  if (e?.code === '42P01') return true;
  const m = e?.message ?? '';
  return /relation .* does not exist/i.test(m);
}

/**
 * Creates the table if it is not there. Mirrors workLogEntries in db/schema.ts.
 *
 * This exists so the log needs no migration step to start working. Every other
 * table here is product data managed by `drizzle-kit push`; this one is a
 * personal log with no foreign key in either direction, so it can safely bring
 * itself into existence the first time someone opens the page. The alternative
 * — remembering to run a schema push before the thing works at all — is a step
 * that gets forgotten precisely when you are somewhere you cannot run it.
 *
 * IF NOT EXISTS makes it idempotent, and it stays compatible with `db:push`:
 * the column list is identical, so a later push is a no-op rather than a diff.
 */
async function ensureTable(db: Db): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS work_log_entries (
      id text PRIMARY KEY,
      local_date text NOT NULL,
      minutes integer NOT NULL,
      category text NOT NULL,
      source text NOT NULL,
      note text NOT NULL DEFAULT '',
      started_at text,
      ended_at text,
      commits integer,
      created_at text NOT NULL,
      updated_at text NOT NULL
    )
  `);
}

/**
 * Runs a query, and if the only thing wrong was that the table did not exist
 * yet, creates it and runs the query once more.
 *
 * Recovery is attempted exactly once. A second 42P01 means the CREATE did not
 * take — no permission, wrong database — and retrying past that would just loop
 * on a problem a human has to look at.
 */
async function withTable<T>(db: Db, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (!isMissingTable(err)) throw err;
    await ensureTable(db);
    return await run();
  }
}

worklogRoute.get('/', async (c) => {
  const db = c.get('db');
  const from = c.req.query('from');
  const to = c.req.query('to');

  const bounds = [
    from && DATE_RE.test(from) ? gte(workLogEntries.localDate, from) : undefined,
    to && DATE_RE.test(to) ? lte(workLogEntries.localDate, to) : undefined,
  ].filter(Boolean);

  const rows = await withTable(db, () =>
    bounds.length
      ? db.select().from(workLogEntries).where(and(...bounds))
      : db.select().from(workLogEntries),
  );
  return c.json({ entries: rows });
});

// ─── Write ──────────────────────────────────────────────────────────────────

worklogRoute.post('/', async (c) => {
  const db = c.get('db');
  const parsed = validate(await c.req.json(), newId);
  if (typeof parsed === 'string') return c.json({ error: parsed }, 400);

  const stamp = now();
  // The client generates the id so a retry after a lost response is a no-op
  // rather than a second row — the phone logs time on airport wifi.
  const [row] = await withTable(db, () =>
    db
      .insert(workLogEntries)
      .values({ ...parsed, createdAt: stamp, updatedAt: stamp })
      .onConflictDoNothing()
      .returning(),
  );

  return c.json({ entry: row ?? null }, row ? 201 : 200);
});

/**
 * Bulk upsert — how the phone gets the derived sessions into the database
 * without anyone running a script.
 *
 * The page ships with the derivation baked in (public/worklog-seed.json) so it
 * shows the full history on first open, offline, with nothing configured. This
 * is how that same data reaches durable storage: one request instead of 113.
 *
 * Safe to call repeatedly. Session ids are deterministic (git_<first commit
 * instant>) and conflicts do nothing, so this never duplicates and never
 * overwrites a row corrected by hand.
 */
worklogRoute.post('/bulk', async (c) => {
  const db = c.get('db');
  const body = (await c.req.json()) as { entries?: EntryInput[] };
  const incoming = Array.isArray(body.entries) ? body.entries : [];
  if (incoming.length === 0) return c.json({ inserted: 0 });
  if (incoming.length > 2000) return c.json({ error: 'too many entries' }, 413);

  const rows: Validated[] = [];
  for (const raw of incoming) {
    const parsed = validate(raw, newId);
    if (typeof parsed === 'string') return c.json({ error: parsed }, 400);
    rows.push(parsed);
  }

  const stamp = now();
  const written = await withTable(db, () =>
    db
      .insert(workLogEntries)
      .values(rows.map((r) => ({ ...r, createdAt: stamp, updatedAt: stamp })))
      .onConflictDoNothing()
      .returning({ id: workLogEntries.id }),
  );

  return c.json({ inserted: written.length, received: rows.length });
});

worklogRoute.patch('/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const body = (await c.req.json()) as EntryInput;

  const patch: Record<string, string | number | null> = { updatedAt: now() };

  if (body.minutes !== undefined) {
    const m = Number(body.minutes);
    if (!Number.isInteger(m) || m <= 0 || m > MAX_MINUTES) {
      return c.json({ error: 'minutes out of range' }, 400);
    }
    patch.minutes = m;
  }
  if (body.localDate !== undefined) {
    const d = String(body.localDate);
    if (!DATE_RE.test(d)) return c.json({ error: 'localDate must be YYYY-MM-DD' }, 400);
    patch.localDate = d;
  }
  if (body.category !== undefined) patch.category = String(body.category);
  if (body.note !== undefined) patch.note = String(body.note).slice(0, 2000);

  const [row] = await withTable(db, () =>
    db.update(workLogEntries).set(patch).where(eq(workLogEntries.id, id)).returning(),
  );

  if (!row) return c.json({ error: 'not found' }, 404);
  return c.json({ entry: row });
});

worklogRoute.delete('/:id', async (c) => {
  const db = c.get('db');
  const [row] = await withTable(db, () =>
    db.delete(workLogEntries).where(eq(workLogEntries.id, c.req.param('id'))).returning(),
  );
  if (!row) return c.json({ error: 'not found' }, 404);
  return c.json({ ok: true });
});

// Derived git sessions are not imported over HTTP — scripts/derive-work-sessions.ts
// writes them straight to the database, so seeding needs no running server and
// the upsert rule lives with the derivation that produces it.

export { worklogRoute };
