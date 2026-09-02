// A fake Jira, good enough that the demo exercises the real code paths.
//
// It implements JiraClient exactly, keeps its issues in localStorage so a demo
// survives a reload, and — importantly — it can FAIL. A mock that always succeeds
// lets you ship a UI with no error state, and the first real 401 then lands in
// front of a pilot. Latency and failure are injectable so tests stay deterministic
// (latencyMs: 0, failureRate: 0) while the app runs with both turned on.

import type { JiraClient } from './JiraClient';
import type { JiraConfig } from './config';
import { adfToPlainText } from './adf';
import {
  JiraApiError,
  type AdfDocument,
  type JiraCreatedIssue,
  type JiraIssue,
  type JiraIssueCreateRequest,
  type JiraTransition,
} from './types';

const KEY = 'feedback_mock_jira_v1';

/** The board this mock pretends to be. Ids are arbitrary but stable, like Jira's. */
const WORKFLOW: JiraTransition[] = [
  { id: '11', name: 'To Do', to: { id: '10000', name: 'To Do' } },
  { id: '21', name: 'In Progress', to: { id: '10001', name: 'In Progress' } },
  { id: '31', name: 'Done', to: { id: '10002', name: 'Done' } },
];

interface MockDb {
  seq: number;
  issues: Record<string, JiraIssue>;
  comments: Record<string, string[]>;
}

export interface MockJiraOptions {
  latencyMs?: number;
  /** 0..1 chance a call fails with a retryable 503. */
  failureRate?: number;
  random?: () => number;
  now?: () => Date;
  storage?: Storage;
}

function emptyDb(): MockDb {
  return { seq: 400, issues: {}, comments: {} };
}

export class MockJiraClient implements JiraClient {
  private readonly latencyMs: number;
  private readonly failureRate: number;
  private readonly random: () => number;
  private readonly now: () => Date;
  private readonly storage?: Storage;
  /** Fallback when there is no localStorage (node tests, SSR). */
  private memory: MockDb = emptyDb();

  constructor(
    private readonly config: JiraConfig,
    options: MockJiraOptions = {},
  ) {
    this.latencyMs = options.latencyMs ?? 0;
    this.failureRate = options.failureRate ?? 0;
    this.random = options.random ?? Math.random;
    this.now = options.now ?? (() => new Date());
    this.storage =
      options.storage ?? (typeof localStorage === 'undefined' ? undefined : localStorage);
  }

  private read(): MockDb {
    if (!this.storage) return this.memory;
    try {
      const raw = this.storage.getItem(KEY);
      if (raw) return JSON.parse(raw) as MockDb;
    } catch {
      /* fall through to a fresh db */
    }
    return emptyDb();
  }

  private write(db: MockDb): void {
    if (!this.storage) {
      this.memory = db;
      return;
    }
    try {
      this.storage.setItem(KEY, JSON.stringify(db));
    } catch {
      /* a full quota must not lose the caller's report — the store keeps it */
    }
  }

  private async settle(): Promise<void> {
    if (this.latencyMs > 0) await new Promise((r) => setTimeout(r, this.latencyMs));
    if (this.failureRate > 0 && this.random() < this.failureRate) {
      throw new JiraApiError('Jira did not respond. Try again.', 503, [
        'Service temporarily unavailable',
      ]);
    }
  }

  private require(db: MockDb, issueIdOrKey: string): JiraIssue {
    const issue =
      db.issues[issueIdOrKey] ?? Object.values(db.issues).find((i) => i.id === issueIdOrKey);
    if (!issue) {
      throw new JiraApiError(`Issue ${issueIdOrKey} does not exist.`, 404, [
        'Issue does not exist or you do not have permission to see it.',
      ]);
    }
    return issue;
  }

  browseUrl(issueKey: string): string {
    return `${this.config.siteBaseUrl}/browse/${issueKey}`;
  }

  async createIssue(request: JiraIssueCreateRequest): Promise<JiraCreatedIssue> {
    await this.settle();
    // Mirror the validation Jira actually performs, so the demo surfaces the same
    // 400s a real instance would rather than silently accepting a bad payload.
    if (!request.fields.summary.trim()) {
      throw new JiraApiError('Summary is required.', 400, ['You must specify a summary of the issue.']);
    }
    if ((request.fields.labels ?? []).some((l) => /\s/.test(l))) {
      throw new JiraApiError('Labels may not contain spaces.', 400, [
        "Labels: The label 'x y' contains spaces which is invalid.",
      ]);
    }

    const db = this.read();
    const seq = db.seq + 1;
    const key = `${request.fields.project.key}-${seq}`;
    const stamp = this.now().toISOString();
    const issue: JiraIssue = {
      id: String(10000 + seq),
      key,
      self: `${this.config.apiBaseUrl}/rest/api/3/issue/${key}`,
      fields: {
        summary: request.fields.summary,
        status: { id: '10000', name: 'To Do' },
        issuetype: { name: request.fields.issuetype.name },
        labels: request.fields.labels ?? [],
        created: stamp,
        updated: stamp,
      },
    };
    db.seq = seq;
    db.issues[key] = issue;
    db.comments[key] = [adfToPlainText(request.fields.description)];
    this.write(db);
    return { id: issue.id, key: issue.key, self: issue.self };
  }

  async getIssue(issueIdOrKey: string): Promise<JiraIssue> {
    await this.settle();
    return this.require(this.read(), issueIdOrKey);
  }

  async addComment(issueIdOrKey: string, body: AdfDocument): Promise<void> {
    await this.settle();
    const db = this.read();
    const issue = this.require(db, issueIdOrKey);
    db.comments[issue.key] = [...(db.comments[issue.key] ?? []), adfToPlainText(body)];
    issue.fields.updated = this.now().toISOString();
    this.write(db);
  }

  async getTransitions(issueIdOrKey: string): Promise<JiraTransition[]> {
    await this.settle();
    const issue = this.require(this.read(), issueIdOrKey);
    // Jira only offers transitions available FROM the current status.
    return WORKFLOW.filter((t) => t.to.name !== issue.fields.status.name);
  }

  async transitionIssue(issueIdOrKey: string, transitionId: string): Promise<void> {
    await this.settle();
    const db = this.read();
    const issue = this.require(db, issueIdOrKey);
    const transition = WORKFLOW.find((t) => t.id === transitionId);
    if (!transition || transition.to.name === issue.fields.status.name) {
      throw new JiraApiError('Transition is not valid for this issue.', 400, [
        'It seems that you have tried to perform a workflow operation that is not valid for the current state of this issue.',
      ]);
    }
    issue.fields.status = transition.to;
    issue.fields.updated = this.now().toISOString();
    this.write(db);
  }

  /** Test/demo helper — not part of JiraClient, never called by app code. */
  reset(): void {
    this.write(emptyDb());
  }
}
