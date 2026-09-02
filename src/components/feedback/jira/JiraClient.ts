// The Jira integration contract.
//
// ─────────────────────────────────────────────────────────────────────────────
// FOR WHOEVER BUILDS THIS FOR REAL
// ─────────────────────────────────────────────────────────────────────────────
// This interface is the whole integration surface. The demo satisfies it with
// MockJiraClient (localStorage, no network). Production satisfies it with an
// HTTP client that calls, verbatim:
//
//   create issue       POST   /rest/api/3/issue
//   read issue         GET    /rest/api/3/issue/{issueIdOrKey}
//   add comment        POST   /rest/api/3/issue/{issueIdOrKey}/comment
//   list transitions   GET    /rest/api/3/issue/{issueIdOrKey}/transitions
//   perform transition POST   /rest/api/3/issue/{issueIdOrKey}/transitions
//
// Two constraints that are NOT optional:
//
//  1. The browser must never hold the Jira credential and cannot call Jira
//     directly anyway — Atlassian does not send CORS headers for these endpoints.
//     Route it through our own server, exactly as the weather feeds already are
//     (src/server/routes/weather.ts, called via a same-origin PROXY_URL). So the
//     real client's baseUrl is OUR proxy, e.g. `/api/jira`, and the proxy holds
//     the token.
//  2. The token itself is a secret and lives in the platform secret store, never
//     in code, config files, or a commit. See JiraConfig.secretName.
//
// Everything above the interface — the store, the mapping, the UI — is written
// against JiraClient and knows nothing about transport, so swapping mock for real
// is one line in feedbackJira.ts.

import type {
  JiraCreatedIssue,
  JiraIssue,
  JiraIssueCreateRequest,
  JiraTransition,
  AdfDocument,
} from './types';

export interface JiraClient {
  /** POST /rest/api/3/issue */
  createIssue(request: JiraIssueCreateRequest): Promise<JiraCreatedIssue>;

  /** GET /rest/api/3/issue/{issueIdOrKey} */
  getIssue(issueIdOrKey: string): Promise<JiraIssue>;

  /** POST /rest/api/3/issue/{issueIdOrKey}/comment */
  addComment(issueIdOrKey: string, body: AdfDocument): Promise<void>;

  /** GET /rest/api/3/issue/{issueIdOrKey}/transitions */
  getTransitions(issueIdOrKey: string): Promise<JiraTransition[]>;

  /** POST /rest/api/3/issue/{issueIdOrKey}/transitions — body `{ transition: { id } }` */
  transitionIssue(issueIdOrKey: string, transitionId: string): Promise<void>;

  /** Browser link for a human. Not an API call; derived from the site base URL. */
  browseUrl(issueKey: string): string;
}
