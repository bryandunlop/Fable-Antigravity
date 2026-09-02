// The one place the app decides WHICH JiraClient it is talking to.
//
// Swapping the demo for the real P&G work Jira is this file and nothing else:
// replace MockJiraClient with an HTTP client pointed at our server proxy (see the
// header of jira/JiraClient.ts). Every caller above this line is written against
// the JiraClient interface and will not notice.

import { MockJiraClient } from './jira/mockJiraClient';
import { DEMO_JIRA_CONFIG, type JiraConfig } from './jira/config';
import type { JiraClient } from './jira/JiraClient';

export const jiraConfig: JiraConfig = DEMO_JIRA_CONFIG;

// Latency and a failure rate are ON in the demo on purpose: they are what makes
// the "Sending…", "Failed — try again" and "not retryable" states reachable, and
// a UI whose error path has never run is a UI whose error path does not work.
export const jiraClient: JiraClient = new MockJiraClient(jiraConfig, {
  latencyMs: 900,
  failureRate: 0.15,
});
