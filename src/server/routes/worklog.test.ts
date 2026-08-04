// Contract tests for the work-log route.
//
// These run without a database. The stub below is thenable at every link in the
// chain, so a drizzle call resolves wherever the route happens to await it —
// which is enough to pin the part that actually matters here: what the route
// accepts, what it rejects, and what it stores after coercion. A bad duration
// silently persisted is the failure mode worth guarding, because nothing
// downstream would ever flag it.

import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { worklogRoute } from './worklog';
import type { Db } from '../db';

type Env = { Variables: { db: Db } };

type Captured = { op: string; arg: unknown };

/** Chainable, thenable drizzle stand-in. Resolves to `rows` at any await point. */
function fakeDb(rows: unknown[] = [], log: Captured[] = []) {
  const box: Record<string, unknown> = {
    then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
      Promise.resolve(rows).then(res, rej),
  };
  for (const m of [
    'select', 'from', 'where', 'insert', 'values',
    'onConflictDoNothing', 'returning', 'update', 'set', 'delete',
  ]) {
    box[m] = (arg: unknown) => {
      log.push({ op: m, arg });
      return box;
    };
  }
  return box;
}

function mount(rows: unknown[] = [], log: Captured[] = []) {
  const app = new Hono<Env>();
  const withFakeDb = async (c: { set: (k: 'db', v: Db) => void }, next: () => Promise<void>) => {
    c.set('db', fakeDb(rows, log) as unknown as Db);
    await next();
  };
  // Both patterns, matching how app.ts mounts the real thing: Hono treats
  // '/worklog' and '/worklog/*' as distinct.
  app.use('/worklog', withFakeDb);
  app.use('/worklog/*', withFakeDb);
  app.route('/worklog', worklogRoute);
  return app;
}

const valid = {
  id: 'wl_test',
  localDate: '2026-08-04',
  minutes: 45,
  category: 'design',
  source: 'manual',
};

function post(app: Hono<Env>, body: unknown) {
  return app.request('/worklog', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /worklog — what it refuses to store', () => {
  it('accepts a well-formed entry', async () => {
    const res = await post(mount([valid]), valid);
    expect(res.status).toBe(201);
  });

  it.each([
    ['a date that is not YYYY-MM-DD', { ...valid, localDate: '04/08/2026' }],
    ['an empty date', { ...valid, localDate: '' }],
    ['zero minutes', { ...valid, minutes: 0 }],
    ['negative minutes', { ...valid, minutes: -30 }],
    ['fractional minutes', { ...valid, minutes: 12.5 }],
    ['minutes past a full day', { ...valid, minutes: 1441 }],
    ['a non-numeric duration', { ...valid, minutes: 'about an hour' }],
    ['a missing category', { ...valid, category: '   ' }],
    ['an unknown source', { ...valid, source: 'imported' }],
  ])('rejects %s with 400', async (_label, body) => {
    const res = await post(mount(), body);
    expect(res.status).toBe(400);
  });

  it('allows exactly 24 hours — the boundary is inclusive', async () => {
    const res = await post(mount([valid]), { ...valid, minutes: 1440 });
    expect(res.status).toBe(201);
  });

  it('stores the id the client generated, so a retried POST is not a second row', async () => {
    const log: Captured[] = [];
    await post(mount([valid], log), { ...valid, id: 'wl_client_generated' });
    const values = log.find((c) => c.op === 'values')?.arg as { id: string };
    expect(values.id).toBe('wl_client_generated');
  });

  it('mints an id when the client omits one rather than writing a null key', async () => {
    const log: Captured[] = [];
    await post(mount([valid], log), { ...valid, id: undefined });
    const values = log.find((c) => c.op === 'values')?.arg as { id: string };
    expect(values.id).toMatch(/^wl_/);
  });

  it('truncates a runaway note instead of rejecting the entry', async () => {
    const log: Captured[] = [];
    await post(mount([valid], log), { ...valid, note: 'x'.repeat(5000) });
    const values = log.find((c) => c.op === 'values')?.arg as { note: string };
    expect(values.note).toHaveLength(2000);
  });

  it('defaults source to manual when it is not given', async () => {
    const log: Captured[] = [];
    await post(mount([valid], log), { ...valid, source: undefined });
    const values = log.find((c) => c.op === 'values')?.arg as { source: string };
    expect(values.source).toBe('manual');
  });

  it('stamps createdAt and updatedAt identically, which is how a derived row stays refreshable', async () => {
    const log: Captured[] = [];
    await post(mount([valid], log), valid);
    const values = log.find((c) => c.op === 'values')?.arg as {
      createdAt: string;
      updatedAt: string;
    };
    expect(values.createdAt).toBe(values.updatedAt);
  });
});

describe('PATCH /worklog/:id', () => {
  const patch = (app: Hono<Env>, body: unknown) =>
    app.request('/worklog/wl_test', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  it('applies a valid correction', async () => {
    const res = await patch(mount([valid]), { minutes: 90 });
    expect(res.status).toBe(200);
  });

  it('rejects an out-of-range correction', async () => {
    expect((await patch(mount([valid]), { minutes: 0 })).status).toBe(400);
    expect((await patch(mount([valid]), { minutes: 5000 })).status).toBe(400);
  });

  it('rejects a malformed date', async () => {
    expect((await patch(mount([valid]), { localDate: 'yesterday' })).status).toBe(400);
  });

  it('404s when the row is gone rather than reporting a silent success', async () => {
    expect((await patch(mount([]), { minutes: 60 })).status).toBe(404);
  });

  it('always moves updatedAt, which is what marks a derived row as hand-edited', async () => {
    const log: Captured[] = [];
    await patch(mount([valid], log), { note: 'ran long' });
    const set = log.find((c) => c.op === 'set')?.arg as { updatedAt?: string };
    expect(set.updatedAt).toBeTruthy();
  });
});

describe('DELETE /worklog/:id', () => {
  it('reports success when a row was removed', async () => {
    const res = await mount([valid]).request('/worklog/wl_test', { method: 'DELETE' });
    expect(res.status).toBe(200);
  });

  it('404s when there was nothing to remove', async () => {
    const res = await mount([]).request('/worklog/wl_test', { method: 'DELETE' });
    expect(res.status).toBe(404);
  });
});

describe('GET /worklog', () => {
  it('returns the entries under an `entries` key', async () => {
    const res = await mount([valid]).request('/worklog');
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ entries: [valid] });
  });

  it('ignores a malformed range rather than 500ing on it', async () => {
    const res = await mount([valid]).request('/worklog?from=nonsense&to=also-nonsense');
    expect(res.status).toBe(200);
  });
});
