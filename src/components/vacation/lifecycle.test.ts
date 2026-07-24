import { describe, it, expect } from 'vitest';
import {
  canWithdraw, canEdit, canReverseDecision, isSettled, lifecycleNote,
  RESUBMIT_STATUS, type RequestStatus,
} from './lifecycle';

const ALL: RequestStatus[] = [
  'pending_scheduling', 'denied_by_scheduling', 'tentative_scheduling',
  'pending_manager', 'denied_by_manager', 'tentative_manager',
  'approved_awaiting_confirmation', 'confirmed', 'withdrawn',
];

describe('canWithdraw — the gap Bryan reported: a submitted request you cannot take back', () => {
  it('allows withdrawing while a decision is outstanding', () => {
    expect(canWithdraw('pending_scheduling').allowed).toBe(true);
    expect(canWithdraw('pending_manager').allowed).toBe(true);
    expect(canWithdraw('tentative_scheduling').allowed).toBe(true);
  });

  it('allows withdrawing a denied request', () => {
    expect(canWithdraw('denied_by_scheduling').allowed).toBe(true);
    expect(canWithdraw('denied_by_manager').allowed).toBe(true);
  });

  it('refuses confirmed leave, and says why rather than hiding the control', () => {
    const v = canWithdraw('confirmed');
    expect(v.allowed).toBe(false);
    expect(v.reason).toMatch(/scheduling/i);
  });

  it('is idempotent-safe: an already-withdrawn request cannot be withdrawn again', () => {
    expect(canWithdraw('withdrawn').allowed).toBe(false);
  });

  it('every refusal explains itself', () => {
    for (const s of ALL) {
      const v = canWithdraw(s);
      if (!v.allowed) expect(v.reason, `${s} refused with no reason`).toBeTruthy();
    }
  });
});

describe('canEdit — "Modify & Resubmit" had no handler at all', () => {
  it('a denied request can be modified and resubmitted', () => {
    expect(canEdit('denied_by_scheduling').allowed).toBe(true);
    expect(canEdit('denied_by_manager').allowed).toBe(true);
  });

  it('an in-flight request can be corrected', () => {
    expect(canEdit('pending_scheduling').allowed).toBe(true);
    expect(canEdit('tentative_manager').allowed).toBe(true);
  });

  it('an approved-awaiting-confirmation request must be withdrawn first', () => {
    const v = canEdit('approved_awaiting_confirmation');
    expect(v.allowed).toBe(false);
    expect(v.reason).toMatch(/withdraw/i);
  });

  it('confirmed and withdrawn requests are not editable', () => {
    expect(canEdit('confirmed').allowed).toBe(false);
    expect(canEdit('withdrawn').allowed).toBe(false);
  });

  it('editing always restarts approval, so a stale tentative cannot ride along', () => {
    expect(RESUBMIT_STATUS).toBe('pending_scheduling');
  });
});

describe('canReverseDecision — approvers could not undo a mis-click', () => {
  it('a denial or a tentative can be taken back', () => {
    expect(canReverseDecision('denied_by_scheduling').allowed).toBe(true);
    expect(canReverseDecision('tentative_manager').allowed).toBe(true);
  });

  it('nothing to reverse before a decision exists', () => {
    expect(canReverseDecision('pending_scheduling').allowed).toBe(false);
  });

  it('cannot reverse past the requester: withdrawn and confirmed are closed', () => {
    expect(canReverseDecision('withdrawn').allowed).toBe(false);
    expect(canReverseDecision('confirmed').allowed).toBe(false);
  });
});

describe('isSettled', () => {
  it('only confirmed and withdrawn are settled', () => {
    expect(ALL.filter(isSettled)).toEqual(['confirmed', 'withdrawn']);
  });
});

describe('lifecycleNote — every action leaves a record, per the DOM instruction', () => {
  it('records who did what, when', () => {
    const at = new Date('2026-07-22T12:00:00Z');
    const note = lifecycleNote('withdrawn', 'John Smith', 'submitter', undefined, at);
    expect(note.author).toBe('John Smith');
    expect(note.role).toBe('submitter');
    expect(note.comment).toMatch(/withdrew/i);
    expect(note.timestamp).toEqual(at);
  });

  it('appends the caller detail when given (e.g. what changed)', () => {
    const note = lifecycleNote('edited', 'John Smith', 'submitter', 'Dates changed to 3–7 Aug.', new Date('2026-07-22T12:00:00Z'));
    expect(note.comment).toContain('Dates changed to 3–7 Aug.');
  });

  it('ids are distinct per action so notes never collide in a thread', () => {
    const at = new Date('2026-07-22T12:00:00Z');
    const a = lifecycleNote('withdrawn', 'X', 'submitter', undefined, at);
    const b = lifecycleNote('edited', 'X', 'submitter', undefined, at);
    expect(a.id).not.toBe(b.id);
  });
});
