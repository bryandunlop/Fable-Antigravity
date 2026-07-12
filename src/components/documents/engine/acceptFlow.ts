// C4 — pure state machine for the suggestion accept→draft flow. A reader's
// feedback may only be marked 'accepted' once the pre-filled draft revision
// actually exists; cancelling the editor must leave the suggestion open.
// The panel component delegates its transitions here so the ordering is testable.
import type { DocRevision, DocSuggestion } from '../types';

export interface AcceptFlow {
  /** Suggestion awaiting a draft — resolved only when the editor persists. */
  pendingSuggestionId: string | null;
}

export const IDLE_ACCEPT_FLOW: AcceptFlow = { pendingSuggestionId: null };

export function beginAccept(suggestionId: string): AcceptFlow {
  return { pendingSuggestionId: suggestionId };
}

/** The editor persisted a draft — NOW the pending suggestion may resolve (once). */
export function acceptFlowOnPersisted(flow: AcceptFlow): { resolveSuggestionId: string | null; flow: AcceptFlow } {
  return { resolveSuggestionId: flow.pendingSuggestionId, flow: IDLE_ACCEPT_FLOW };
}

/** The editor closed without persisting — nothing resolves; the suggestion stays open. */
export function acceptFlowOnCancelled(flow: AcceptFlow): { resolveSuggestionId: null; flow: AcceptFlow } {
  void flow;
  return { resolveSuggestionId: null, flow: IDLE_ACCEPT_FLOW };
}

/** Change-summary prefill crediting the reader whose feedback drove the revision. */
export function acceptPrefill(sug: Pick<DocSuggestion, 'authorName' | 'proposedChange'>): Partial<DocRevision> {
  return { changeSummary: `Incorporates feedback from ${sug.authorName}: ${sug.proposedChange}` };
}
