// Regression tests for the bootstrap sequence.
//
// The bug these exist for destroyed data silently, which is the worst kind:
// the seeded history uploaded fine, the outbox emptied, and then a `load()`
// response issued moments EARLIER — so taken before the upload landed, and
// therefore empty — was persisted over all 114 sessions. The page went from a
// full fiscal year to blank with no error anywhere.
//
// The cause was that `drain()` returned undefined when a drain was already in
// flight, so `await drain()` was a no-op and the flush/read ordering the
// bootstrap depends on never actually held.
//
// .tsx so it runs under jsdom and gets a real localStorage (see src/test/setup.ts).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWorkLog } from './useWorkLog';

const SEED = {
  entries: [
    { id: 'git_1', localDate: '2026-07-06', minutes: 360, category: 'assisted-build', source: 'git', note: 'a', startedAt: null, endedAt: null, commits: 12 },
    { id: 'git_2', localDate: '2026-07-07', minutes: 120, category: 'assisted-build', source: 'git', note: 'b', startedAt: null, endedAt: null, commits: 4 },
  ],
};

const realFetch = globalThis.fetch;

/**
 * A fake backend. `bulkDelayMs` lets the bulk upload land AFTER the GET that
 * raced it, which is precisely the interleaving that lost the data.
 */
function installFetch(opts: { serverRows?: unknown[]; failAll?: boolean; bulkDelayMs?: number } = {}) {
  const calls = { bulk: 0, get: 0 };
  let stored: unknown[] = opts.serverRows ? [...opts.serverRows] : [];

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

    if (url.includes('worklog-seed.json')) return json(SEED);
    if (opts.failAll) return new Response('DATABASE_URL is not set', { status: 500 });

    if (url.includes('/api/worklog/bulk')) {
      calls.bulk += 1;
      const body = JSON.parse(String(init?.body)) as { entries: unknown[] };
      if (opts.bulkDelayMs) await new Promise((r) => setTimeout(r, opts.bulkDelayMs));
      stored = body.entries;
      return json({ inserted: body.entries.length });
    }
    if (url.endsWith('/api/worklog')) {
      calls.get += 1;
      return json({ entries: stored });
    }
    return json({});
  }) as typeof fetch;

  return { calls, serverRows: () => stored };
}

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe('first run on a phone', () => {
  it('shows the derived history from the bundle', async () => {
    installFetch();
    const { result } = renderHook(() => useWorkLog());
    await waitFor(() => expect(result.current.entries).toHaveLength(2));
    expect(result.current.entries.map((e) => e.id).sort()).toEqual(['git_1', 'git_2']);
  });

  it('uploads the bundle exactly once, not once per effect invocation', async () => {
    const { calls } = installFetch();
    const { result } = renderHook(() => useWorkLog());
    await waitFor(() => expect(result.current.entries).toHaveLength(2));
    await waitFor(() => expect(result.current.pending).toBe(0));
    expect(calls.bulk).toBe(1);
  });

  it('persists the bundle to the server', async () => {
    const { serverRows } = installFetch();
    const { result } = renderHook(() => useWorkLog());
    await waitFor(() => expect(result.current.pending).toBe(0));
    expect(serverRows()).toHaveLength(2);
  });

  it('does NOT lose the history when the read races the upload', async () => {
    // THE regression. With the bulk deliberately slow, a bootstrap that read
    // before flushing would persist the server's empty list over the seed.
    installFetch({ bulkDelayMs: 60 });
    const { result } = renderHook(() => useWorkLog());
    await waitFor(() => expect(result.current.pending).toBe(0));
    await waitFor(() => expect(result.current.entries).toHaveLength(2));
    // And it stays — nothing arrives later to blank it.
    await new Promise((r) => setTimeout(r, 120));
    expect(result.current.entries).toHaveLength(2);
  });

  it('still shows the history with no backend at all, and keeps the upload queued', async () => {
    installFetch({ failAll: true });
    const { result } = renderHook(() => useWorkLog());
    await waitFor(() => expect(result.current.entries).toHaveLength(2));
    expect(result.current.pending).toBe(1);
    expect(result.current.problem).not.toBeNull();
  });
});

describe('second run on the same device', () => {
  it('does not re-seed once the bundle has been applied', async () => {
    localStorage.setItem('worklog.seeded.v1', '2026-08-04T00:00:00.000Z');
    localStorage.setItem('worklog.entries.v1', JSON.stringify([]));
    const { calls } = installFetch();
    const { result } = renderHook(() => useWorkLog());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(calls.bulk).toBe(0);
  });

  it('a derived row deleted on purpose stays deleted', async () => {
    // Guarding the seed on "is the log empty" would resurrect it here.
    localStorage.setItem('worklog.seeded.v1', '2026-08-04T00:00:00.000Z');
    installFetch();
    const { result } = renderHook(() => useWorkLog());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.entries).toHaveLength(0);
  });
});

describe('server rows win over the local copy', () => {
  it('prefers the stored row for an id present in both', async () => {
    localStorage.setItem('worklog.seeded.v1', 'done');
    installFetch({
      serverRows: [
        { id: 'git_1', localDate: '2026-07-06', minutes: 999, category: 'assisted-build', source: 'git', note: 'edited on another device', startedAt: null, endedAt: null, commits: 12, createdAt: 'x', updatedAt: 'y' },
      ],
    });
    const { result } = renderHook(() => useWorkLog());
    await waitFor(() => expect(result.current.entries).toHaveLength(1));
    expect(result.current.entries[0].minutes).toBe(999);
  });
});
