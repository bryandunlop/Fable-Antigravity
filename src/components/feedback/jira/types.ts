// Wire types for the Jira Cloud platform REST API v3.
//
// These are deliberately shaped like the REAL request/response bodies, not like
// anything convenient for this app. The demo runs against MockJiraClient, but the
// developer who wires the P&G work Jira for real should be able to delete the mock
// and keep every type in this file untouched.
//
// Evidence for the shapes below: Atlassian's own REST examples
// (https://developer.atlassian.com/server/jira/platform/jira-rest-api-examples/)
// show the create-issue body as `{ fields: { project: { key }, summary,
// description, issuetype: { name } } }` and the comment body as `{ body }`.
// Cloud v3 keeps the same envelope but takes `description` and comment `body` as
// Atlassian Document Format rather than a plain string — hence adf.ts.

/** Atlassian Document Format node. Text lives in leaves; blocks nest via `content`. */
export interface AdfNode {
  type: string;
  text?: string;
  content?: AdfNode[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  attrs?: Record<string, unknown>;
}

/** Root ADF document. `version` is always 1 for the format Jira Cloud accepts. */
export interface AdfDocument {
  type: 'doc';
  version: 1;
  content: AdfNode[];
}

/** Body of `POST /rest/api/3/issue`. */
export interface JiraIssueCreateRequest {
  fields: {
    project: { key: string };
    summary: string;
    description: AdfDocument;
    issuetype: { name: string };
    labels?: string[];
    /** Optional; omitted unless the caller has a resolved Atlassian accountId. */
    reporter?: { id: string };
  };
}

/** Response of `POST /rest/api/3/issue` — Jira returns the id/key/self only. */
export interface JiraCreatedIssue {
  id: string;
  key: string;
  self: string;
}

/** Trimmed `GET /rest/api/3/issue/{issueIdOrKey}` response — the fields we read. */
export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: {
    summary: string;
    status: { id: string; name: string };
    issuetype: { name: string };
    labels: string[];
    created: string;
    updated: string;
  };
}

/** One entry of `GET /rest/api/3/issue/{issueIdOrKey}/transitions`. */
export interface JiraTransition {
  id: string;
  name: string;
  to: { id: string; name: string };
}

/**
 * One entry of the array returned by
 * `POST /rest/api/3/issue/{issueIdOrKey}/attachments`. Jira answers an upload
 * with an array even when a single file was sent.
 */
export interface JiraAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  /** URL the file can be downloaded from. */
  content: string;
  thumbnail?: string;
}

/** Body of `POST /rest/api/3/issue/{issueIdOrKey}/comment`. */
export interface JiraCommentRequest {
  body: AdfDocument;
}

/**
 * A Jira API failure, surfaced with enough shape for the UI to decide between
 * "retry" and "this will never work". Jira returns `errorMessages` / `errors` on
 * a 400; a 401/403 is a credentials problem the user cannot fix by retrying.
 */
export class JiraApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly errorMessages: string[] = [],
  ) {
    super(message);
    this.name = 'JiraApiError';
  }

  /** 5xx and 429 are worth retrying; 4xx (bad payload, bad auth) are not. */
  get retryable(): boolean {
    return this.status >= 500 || this.status === 429;
  }
}
