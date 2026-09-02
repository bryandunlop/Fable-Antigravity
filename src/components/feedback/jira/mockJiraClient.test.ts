import { describe, it, expect, beforeEach } from 'vitest';
import { MockJiraClient } from './mockJiraClient';
import { DEMO_JIRA_CONFIG } from './config';
import { adfFromText } from './adf';
import { JiraApiError } from './types';
import type { JiraIssueCreateRequest } from './types';
import { createMemoryStorage } from '../../../test/memoryStorage';

function request(over: Partial<JiraIssueCreateRequest['fields']> = {}): JiraIssueCreateRequest {
  return {
    fields: {
      project: { key: 'MYGFO' },
      summary: 'Deferral list is stale after sync',
      description: adfFromText('It showed yesterday’s deferrals.'),
      issuetype: { name: 'Bug' },
      labels: ['mygfo', 'kind-bug'],
      ...over,
    },
  };
}

// Node >= 24's bare `localStorage` global has no Storage methods, so persistence
// must be injected rather than picked up ambiently — see src/test/memoryStorage.ts.
let client: MockJiraClient;
beforeEach(() => {
  client = new MockJiraClient(DEMO_JIRA_CONFIG, { storage: createMemoryStorage() });
});

describe('MockJiraClient', () => {
  it('mints sequential keys under the requested project', async () => {
    const a = await client.createIssue(request());
    const b = await client.createIssue(request());
    expect(a.key).toMatch(/^MYGFO-\d+$/);
    expect(Number(b.key.split('-')[1])).toBe(Number(a.key.split('-')[1]) + 1);
  });

  it('opens every issue in To Do', async () => {
    const { key } = await client.createIssue(request());
    expect((await client.getIssue(key)).fields.status.name).toBe('To Do');
  });

  it('is readable by internal id as well as by key, as Jira is', async () => {
    const created = await client.createIssue(request());
    expect((await client.getIssue(created.id)).key).toBe(created.key);
  });

  it('rejects an empty summary with a 400, like Jira', async () => {
    await expect(client.createIssue(request({ summary: '   ' }))).rejects.toMatchObject({
      status: 400,
      retryable: false,
    });
  });

  it('rejects labels containing spaces with a 400, like Jira', async () => {
    await expect(client.createIssue(request({ labels: ['area-Tech Log'] }))).rejects.toBeInstanceOf(
      JiraApiError,
    );
  });

  it('404s an unknown issue', async () => {
    await expect(client.getIssue('MYGFO-99999')).rejects.toMatchObject({ status: 404 });
  });

  it('offers only transitions away from the current status', async () => {
    const { key } = await client.createIssue(request());
    const names = (await client.getTransitions(key)).map((t) => t.to.name);
    expect(names).toEqual(['In Progress', 'Done']);
  });

  it('moves status on a valid transition and refuses an invalid one', async () => {
    const { key } = await client.createIssue(request());
    const [inProgress] = await client.getTransitions(key);
    await client.transitionIssue(key, inProgress.id);
    expect((await client.getIssue(key)).fields.status.name).toBe('In Progress');
    await expect(client.transitionIssue(key, inProgress.id)).rejects.toMatchObject({ status: 400 });
  });

  it('appends comments without disturbing status', async () => {
    const { key } = await client.createIssue(request());
    await client.addComment(key, adfFromText('Triaged: reproduced on iPad.'));
    expect((await client.getIssue(key)).fields.status.name).toBe('To Do');
  });

  it('surfaces an injected outage as a retryable 503', async () => {
    const flaky = new MockJiraClient(DEMO_JIRA_CONFIG, {
      failureRate: 1,
      random: () => 0,
      storage: createMemoryStorage(),
    });
    await expect(flaky.createIssue(request())).rejects.toMatchObject({
      status: 503,
      retryable: true,
    });
  });

  it('builds a browse URL from the site base, not the API base', () => {
    expect(client.browseUrl('MYGFO-401')).toBe(`${DEMO_JIRA_CONFIG.siteBaseUrl}/browse/MYGFO-401`);
  });
});
