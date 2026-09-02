import { describe, it, expect, beforeEach } from 'vitest';
import { fileReport, refreshReport, dataUrlToBlob } from './feedbackSync';
import { FeedbackStore } from './feedbackStore';
import { MockJiraClient } from './jira/mockJiraClient';
import { DEMO_JIRA_CONFIG } from './jira/config';
import { createMemoryStorage } from '../../test/memoryStorage';
import type { FeedbackReport } from './types';
import type { NewFeedback } from './feedbackStore';
import type { FeedbackAttachment } from './types';

// A 1x1 JPEG. Small enough to inline, real enough that dataUrlToBlob has bytes.
const PIXEL =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';

const shot = (name: string): FeedbackAttachment => ({
  id: `att-${name}`,
  name,
  mimeType: 'image/jpeg',
  size: 512,
  dataUrl: PIXEL,
});

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
  attachments: [],
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
    const report = store.create({ ...input, title: '   ', attachments: [] });
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

describe('dataUrlToBlob', () => {
  it('recovers the bytes and the mime type from a stored data URL', async () => {
    const blob = dataUrlToBlob(PIXEL);
    expect(blob.type).toBe('image/jpeg');
    expect(blob.size).toBeGreaterThan(100);
  });
});

describe('screenshots', () => {
  it('uploads every attachment after the issue exists and stamps the Jira ids', async () => {
    const report = store.create({ ...input, attachments: [shot('a.jpg'), shot('b.jpg')] });
    const patch = await fileReport(report, client, DEMO_JIRA_CONFIG);

    expect(patch.sync).toBe('filed');
    expect(patch.attachmentError).toBeUndefined();
    expect(patch.attachments?.map((a) => a.jiraAttachmentId)).toHaveLength(2);
    expect(patch.attachments?.every((a) => a.jiraAttachmentId)).toBe(true);
    expect(client.attachmentsFor(patch.jira!.key).map((a) => a.filename)).toEqual(['a.jpg', 'b.jpg']);
  });

  it('does NOT unfile the issue when an upload fails, and says which one', async () => {
    // Fails only on the attachment call: createIssue succeeds first because the
    // sequence hands out a passing draw, then a failing one.
    const draws = [1, 0];
    const flaky = new MockJiraClient(DEMO_JIRA_CONFIG, {
      failureRate: 0.5,
      random: () => draws.shift() ?? 1,
      storage: createMemoryStorage(),
    });
    const report = store.create({ ...input, attachments: [shot('evidence.jpg')] });
    const patch = await fileReport(report, flaky, DEMO_JIRA_CONFIG);

    expect(patch.sync).toBe('filed');
    expect(patch.jira?.key).toBeTruthy();
    expect(patch.attachmentError).toContain('evidence.jpg');
    // The image is kept locally, so it is still visible on the board.
    expect(patch.attachments?.[0].dataUrl).toBe(PIXEL);
    expect(patch.attachments?.[0].jiraAttachmentId).toBeUndefined();
  });

  it('files a report with no screenshots without touching the attachment endpoint', async () => {
    const patch = await fileReport(store.create(input), client, DEMO_JIRA_CONFIG);
    expect(patch.attachmentError).toBeUndefined();
    expect(client.attachmentsFor(patch.jira!.key)).toEqual([]);
  });
});
