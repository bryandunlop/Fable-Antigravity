// Filing a report to Jira, and reading its status back.
//
// Written as pure functions over a JiraClient — they take a report and return the
// patch to apply — so the whole success/failure/retry matrix is testable in node
// without a store, a React tree or a network.

import type { FeedbackReport } from './types';
import type { JiraClient } from './jira/JiraClient';
import type { JiraConfig } from './jira/config';
import { feedbackToJiraRequest } from './jira/mapping';
import { JiraApiError } from './jira/types';

function describeError(error: unknown): { message: string; retryable: boolean } {
  if (error instanceof JiraApiError) {
    return {
      // Jira's own errorMessages are the useful ones ("Labels: ... is invalid");
      // the HTTP status alone tells a reporter nothing.
      message: error.errorMessages[0] ?? error.message,
      retryable: error.retryable,
    };
  }
  // A network fault is not a Jira answer — it is exactly the case worth retrying.
  return { message: error instanceof Error ? error.message : 'Unknown error', retryable: true };
}

/**
 * File a report as a Jira issue.
 *
 * Refuses a report that already carries a Jira key. Retry after a timeout is the
 * ordinary case here, and a client that retries blindly turns one lost response
 * into two issues on someone's board.
 */
export async function fileReport(
  report: FeedbackReport,
  client: JiraClient,
  config: JiraConfig,
  now: () => Date = () => new Date(),
): Promise<Partial<FeedbackReport>> {
  if (report.jira) {
    return { sync: 'filed', syncError: undefined };
  }
  try {
    const created = await client.createIssue(feedbackToJiraRequest(report, config));
    return {
      sync: 'filed',
      syncError: undefined,
      jira: {
        key: created.key,
        issueId: created.id,
        url: client.browseUrl(created.key),
        status: 'To Do',
        syncedAt: now().toISOString(),
      },
    };
  } catch (error) {
    return { sync: 'failed', syncError: describeError(error) };
  }
}

/** Re-read a filed report's Jira status. A never-filed report has nothing to read. */
export async function refreshReport(
  report: FeedbackReport,
  client: JiraClient,
  now: () => Date = () => new Date(),
): Promise<Partial<FeedbackReport>> {
  if (!report.jira) return {};
  try {
    // Read by internal id, not key: a Jira project move rewrites keys and would
    // otherwise orphan every report we filed before the move.
    const issue = await client.getIssue(report.jira.issueId);
    return {
      sync: 'filed',
      syncError: undefined,
      jira: {
        ...report.jira,
        key: issue.key,
        url: client.browseUrl(issue.key),
        status: issue.fields.status.name,
        syncedAt: now().toISOString(),
      },
    };
  } catch (error) {
    // The issue still exists as far as we know — keep the link and flag the read.
    return { syncError: describeError(error) };
  }
}
