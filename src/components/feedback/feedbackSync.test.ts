import { describe, it, expect, beforeEach } from 'vitest';
import { fileReport, refreshReport } from './feedbackSync';
import { FeedbackStore } from './feedbackStore';
import { MockJiraClient } from './jira/mockJiraClient';
import { DEMO_JIRA_CONFIG } from './jira/config';
import { createMemoryStorage } from '../../test/memoryStorage';
import type { FeedbackReport } from './types';
import type { NewFeedback } from './feedbackStore';

const input: NewFeedback = {
  kind: 'bug',
  title: 'Deferral clock counts the day of discovery',
  detail: 'The Cat C count started the same day I raised the defect.',
  impact: 'blocked',
  area: 'Tech Log',
  reporter: 'A. Reporter',
  shareContext: true,
  context: {
    route: '/tech-log/defects',
    screen: 'Tech Log',
    role: 'pilot',
    appVersion: '2026.9.1',
    viewport: '1180x820',
    userAgent: 'TestAgent/1.0',
  },
};

const at = (iso: string) => () => new Date(iso);

let store: FeedbackStore;
let client: MockJiraClient;
beforeEach(() => {
  store = new FeedbackStore(createMemoryStorage(), at('2026-09-02T09:00:00.000Z'));
  client = new MockJiraClient(DEMO_JIRA_CONFIG, { storage: createMemoryStorage() });
});

describe('FeedbackStore', () => {
  it('persists a new report locally before Jira is involved', () => {
    const report = store.create(input);
    expect(report.sync).toBe('local');
    expect(report.jira).toBeUndefined();
    expect(store.list()[0].id).toBe(report.id);
  });

  it('mints ids that do not collide with the seeded reports', () => {
    const first = store.create(input);
    const second = store.create(input);
    expect(first.id).toBe('FB-2026-004');
    expect(second.id).toBe('FB-2026-005');
  });

  it('notifies subscribers on create and update', () => {
    let calls = 0;
    const off = store.subscribe(() => { calls += 1; });
    const report = store.create(input);
    store.update(report.id, { area: 'Scheduling' });
    off();
    store.create(input);
    expect(calls).toBe(2);
  });
});

describe('fileReport', () => {
  it('creates the Jira issue and returns a filed link', async () => {
    const report = store.create(input);
    const patch = await fileReport(report, client, DEMO_JIRA_CONFIG, at('2026-09-02T09:05:00.000Z'));
    expect(patch.sync).toBe('filed');
    expect(patch.jira?.key).toMatch(/^MYGFO-\d+$/);
    expect(patch.jira?.status).toBe('To Do');
    expect(patch.jira?.url).toContain('/browse/');
    expect(patch.jira?.syncedAt).toBe('2026-09-02T09:05:00.000Z');
  });

  it('never files twice — a retry after a lost response makes no second issue', async () => {
    const report = store.create(input);
    store.update(report.id, await fileReport(report, client, DEMO_JIRA_CONFIG));
    const filed = store.list().find((r) => r.id === report.id) as FeedbackReport;

    const again = await fileReport(filed, client, DEMO_JIRA_CONFIG);
    expect(again.jira).toBeUndefined(); // no new link — the existing one stands
    expect(again.sync).toBe('filed');
    expect((await client.getIssue(filed.jira!.issueId)).key).toBe(filed.jira!.key);
  });

  it('records a retryable failure without losing the report', async () => {
    const outage = new MockJiraClient(DEMO_JIRA_CONFIG, {
      failureRate: 1,
      random: () => 0,
      storage: createMemoryStorage(),
    });
    const report = store.create(input);
    const patch = await fileReport(report, outage, DEMO_JIRA_CONFIG);
    expect(patch.sync).toBe('failed');
    expect(patch.syncError?.retryable).toBe(true);
    expect(patch.jira).toBeUndefined();
    store.update(report.id, patch);
    expect(store.list()[0].detail).toBe(input.detail);
  });

  it('marks a rejected payload as NOT retryable', async () => {
    const report = store.create({ ...input, title: '   ' });
    const patch = await fileReport(report, client, DEMO_JIRA_CONFIG);
    expect(patch.sync).toBe('failed');
    expect(patch.syncError?.retryable).toBe(false);
  });

  it('clears a previous error once the retry succeeds', async () => {
    const report = store.create(input);
    store.update(report.id, { sync: 'failed', syncError: { message: 'boom', retryable: true } });
    const failed = store.list().find((r) => r.id === report.id) as FeedbackReport;
    const patch = await fileReport(failed, client, DEMO_JIRA_CONFIG);
    expect(patch.sync).toBe('filed');
    expect(patch.syncError).toBeUndefined();
  });
});

describe('refreshReport', () => {
  it('reads the current Jira status back', async () => {
    const report = store.create(input);
    store.update(report.id, await fileReport(report, client, DEMO_JIRA_CONFIG));
    const filed = store.list().find((r) => r.id === report.id) as FeedbackReport;

    const [next] = await client.getTransitions(filed.jira!.key);
    await client.transitionIssue(filed.jira!.key, next.id);

    const patch = await refreshReport(filed, client);
    expect(patch.jira?.status).toBe('In Progress');
  });

  it('does nothing for a report that was never filed', async () => {
    expect(await refreshReport(store.create(input), client)).toEqual({});
  });

  it('keeps the Jira link when the read fails', async () => {
    const report = store.create(input);
    store.update(report.id, await fileReport(report, client, DEMO_JIRA_CONFIG));
    const filed = store.list().find((r) => r.id === report.id) as FeedbackReport;

    const outage = new MockJiraClient(DEMO_JIRA_CONFIG, {
      failureRate: 1,
      random: () => 0,
      storage: createMemoryStorage(),
    });
    const patch = await refreshReport(filed, outage);
    expect(patch.syncError?.retryable).toBe(true);
    expect(patch.sync).toBeUndefined(); // still 'filed' — the issue exists
  });
});
