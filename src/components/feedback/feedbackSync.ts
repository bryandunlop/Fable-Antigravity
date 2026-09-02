// Filing a report to Jira, and reading its status back.
//
// Written as pure functions over a JiraClient — they take a report and return the
// patch to apply — so the whole success/failure/retry matrix is testable in node
// without a store, a React tree or a network.

import type { FeedbackAttachment, FeedbackReport } from './types';
import type { JiraClient } from './jira/JiraClient';
import type { JiraConfig } from './jira/config';
import { feedbackToJiraRequest } from './jira/mapping';
import { JiraApiError } from './jira/types';

/**
 * A stored data URL back into bytes. Written by hand rather than with fetch()
 * because a data: fetch is async, needs a network stack the tests do not have,
 * and this is four lines.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, payload] = dataUrl.split(',');
  const mimeType = /data:([^;]+)/.exec(header)?.[1] ?? 'application/octet-stream';
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

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
  let created;
  try {
    created = await client.createIssue(feedbackToJiraRequest(report, config));
  } catch (error) {
    return { sync: 'failed', syncError: describeError(error) };
  }

  // Screenshots upload AFTER the issue exists — Jira has no way to attach a file
  // to an issue that does not exist yet. A failure here does NOT unfile the
  // issue: an issue missing an image beats no issue, and the alternative is
  // either a duplicate on retry or silently dropping the evidence.
  const { attachments, attachmentError } = await uploadAttachments(report.attachments, created.key, client);

  return {
    sync: 'filed',
    syncError: undefined,
    attachments,
    attachmentError,
    jira: {
      key: created.key,
      issueId: created.id,
      url: client.browseUrl(created.key),
      status: 'To Do',
      syncedAt: now().toISOString(),
    },
  };
}

async function uploadAttachments(
  attachments: FeedbackAttachment[],
  issueKey: string,
  client: JiraClient,
): Promise<{ attachments: FeedbackAttachment[]; attachmentError?: string }> {
  const uploaded: FeedbackAttachment[] = [];
  const failures: string[] = [];

  for (const attachment of attachments) {
    try {
      const [result] = await client.addAttachment(
        issueKey,
        dataUrlToBlob(attachment.dataUrl),
        attachment.name,
      );
      uploaded.push({ ...attachment, jiraAttachmentId: result?.id });
    } catch (error) {
      failures.push(attachment.name);
      uploaded.push(attachment);
      void error;
    }
  }

  return {
    attachments: uploaded,
    attachmentError: failures.length
      ? `${failures.join(', ')} did not upload to Jira. The issue was still created.`
      : undefined,
  };
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
