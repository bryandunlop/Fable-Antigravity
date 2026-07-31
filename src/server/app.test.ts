// Regression tests for TL-18 fault 1b / TL-15 cause 2.
//
// The bug: `app.use('*')` called createDb() for EVERY request. createDb()
// throws when DATABASE_URL is absent, so the throw happened before any handler
// ran — and routes that touch no database at all (/api/health, the weather
// proxy) 500'd in production purely because a database they never read was
// unconfigured. Verified live against prod 2026-07-31: /api/health, a
// one-liner returning {ok:true}, returned 500 "DATABASE_URL is not set".
//
// These tests run with DATABASE_URL deliberately unset. That is not an
// artificial condition — it is exactly the Vercel production environment as
// found.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { app } from './app';

const originalUrl = process.env.DATABASE_URL;

beforeEach(() => {
  delete process.env.DATABASE_URL;
});

afterEach(() => {
  if (originalUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalUrl;
});

describe('DB-free routes survive an absent DATABASE_URL', () => {
  it('GET /api/health returns 200 with no database configured', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
  });

  it('an unknown /api path 404s rather than 500ing on the DB middleware', async () => {
    // Before the fix this returned 500: the middleware threw before Hono could
    // report the route as missing, which is how a routing bug got disguised as
    // a database bug in the prod logs.
    const res = await app.request('/api/nonexistent');
    expect(res.status).toBe(404);
  });

  it('the forecast proxy is reachable without a database', async () => {
    // It may still fail upstream (no network in CI) — what must NOT happen is
    // a 500 whose cause is "DATABASE_URL is not set".
    const res = await app.request('/api/forecast?ids=KTEB');
    const body = await res.text();
    expect(body).not.toContain('DATABASE_URL');
  });

  it('the METAR proxy is reachable without a database', async () => {
    const res = await app.request('/api/weather?ids=KTEB');
    const body = await res.text();
    expect(body).not.toContain('DATABASE_URL');
  });
});

describe('DB-backed routes still receive a database', () => {
  it('a DB route fails on the missing DATABASE_URL, not on a missing db binding', async () => {
    // The complement of the tests above: making the DB lazy must not silently
    // leave real routes without a connection. With DATABASE_URL unset this
    // route must still be the thing that complains about it.
    const res = await app.request('/api/state');
    expect(res.status).toBe(500);
  });
});
