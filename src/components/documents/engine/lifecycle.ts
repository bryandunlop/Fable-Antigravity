// Pure four-eyes lifecycle guards. Enforced by the reducer (not just hidden in
// the UI) — the platform's D23 discipline: proposer + separate approver,
// self-approval blocked.
import type { DocRevision } from '../types';
import type { DocumentClassConfig } from '../classes';
import { hasAnyRole } from '../classes';

export function canAuthor(cfg: DocumentClassConfig, userRoles: string | string[]): boolean {
  return hasAnyRole(cfg.authorRoles, userRoles);
}

export function canApprove(cfg: DocumentClassConfig, userRoles: string | string[]): boolean {
  return cfg.controlled && hasAnyRole(cfg.approverRoles, userRoles);
}

/** Defense-in-depth: an author may never decide their own submission. */
export function isSelfApproval(rev: Pick<DocRevision, 'authorUserId'>, deciderUserId: string): boolean {
  return rev.authorUserId === deciderUserId;
}

/** A draft may be submitted when complete; a re-issue must say what changed. */
export function validateSubmit(
  rev: Pick<DocRevision, 'status' | 'content' | 'changeSummary'>,
  hasPriorPublished: boolean,
): { ok: boolean; error?: string } {
  if (rev.status !== 'draft' && rev.status !== 'rejected') {
    return { ok: false, error: 'Only a draft (or rejected draft) can be submitted for approval.' };
  }
  if (!rev.content.trim()) return { ok: false, error: 'Content is required before submitting.' };
  if (hasPriorPublished && !rev.changeSummary.trim()) {
    return { ok: false, error: 'A "what changed" summary is required when re-issuing a published document.' };
  }
  return { ok: true };
}

export function validateDecision(
  cfg: DocumentClassConfig,
  rev: Pick<DocRevision, 'status' | 'authorUserId'>,
  deciderUserId: string,
  deciderRoles: string | string[],
): { ok: boolean; error?: string } {
  if (rev.status !== 'pending-approval') {
    return { ok: false, error: 'Only a pending-approval revision can be decided.' };
  }
  if (!canApprove(cfg, deciderRoles)) {
    return { ok: false, error: `Approval requires one of: ${cfg.approverRoles.join(', ')}.` };
  }
  if (isSelfApproval(rev, deciderUserId)) {
    return { ok: false, error: 'Four-eyes: you cannot approve your own submission.' };
  }
  return { ok: true };
}

/** Direct publish is only for uncontrolled classes (tribal knowledge). */
export function validateDirectPublish(
  cfg: DocumentClassConfig,
  rev: Pick<DocRevision, 'status' | 'content'>,
): { ok: boolean; error?: string } {
  if (cfg.controlled) {
    return { ok: false, error: `${cfg.label} requires draft → approval — direct publish is not permitted.` };
  }
  if (rev.status !== 'draft' && rev.status !== 'rejected') {
    return { ok: false, error: 'Only a draft can be published.' };
  }
  if (!rev.content.trim()) return { ok: false, error: 'Content is required before publishing.' };
  return { ok: true };
}
