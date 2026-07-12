import { describe, it, expect } from 'vitest';
import {
  IDLE_ACCEPT_FLOW,
  beginAccept,
  acceptFlowOnPersisted,
  acceptFlowOnCancelled,
  acceptPrefill,
} from './acceptFlow';

// C4: a suggestion may only be marked 'accepted' once the pre-filled draft
// actually exists. Cancelling the editor must leave the suggestion open.
describe('suggestion accept flow (C4 — resolve only on draft creation)', () => {
  it('persisting the draft resolves the pending suggestion exactly once', () => {
    const flow = beginAccept('sug-1');
    const first = acceptFlowOnPersisted(flow);
    expect(first.resolveSuggestionId).toBe('sug-1');
    const second = acceptFlowOnPersisted(first.flow);
    expect(second.resolveSuggestionId).toBeNull();
  });

  it('cancelling the editor resolves nothing — the suggestion stays open', () => {
    const flow = beginAccept('sug-1');
    const out = acceptFlowOnCancelled(flow);
    expect(out.resolveSuggestionId).toBeNull();
    expect(out.flow).toEqual(IDLE_ACCEPT_FLOW);
  });

  it('a persist with no pending accept resolves nothing (plain revise flow)', () => {
    expect(acceptFlowOnPersisted(IDLE_ACCEPT_FLOW).resolveSuggestionId).toBeNull();
  });

  it('prefill credits the reader in the change summary', () => {
    const p = acceptPrefill({ authorName: 'Captain John Smith', proposedChange: 'Add gusty crosswind note' });
    expect(p.changeSummary).toBe('Incorporates feedback from Captain John Smith: Add gusty crosswind note');
  });
});
