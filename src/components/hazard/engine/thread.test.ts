import { describe, it, expect } from 'vitest';
import { threadParticipant, lastMessage, isAwaitingReplyFrom } from './thread';
import type { Hazard, HazardMessage } from '../../../contexts/HazardContext';

function msg(authorRole: 'safety' | 'submitter', overrides: Partial<HazardMessage> = {}): HazardMessage {
  return {
    id: 'm1', authorId: 'u1', authorRole, authorName: authorRole === 'safety' ? 'Safety Team' : 'Reporter',
    body: 'hello', atUtc: '2026-02-01T00:00:00.000Z', ...overrides,
  };
}

function hazard(overrides: Partial<Hazard> = {}): Hazard {
  return {
    id: 'HZ-001', title: 'T', severity: 'Medium', workflowStage: 'Submitted', location: 'X',
    reportedBy: 'Reporter', reportedDate: '2026-02-01', description: '', immediateActions: '',
    potentialConsequences: '', submitterId: 'user_abc', isAnonymous: false, ...overrides,
  };
}

describe('threadParticipant', () => {
  it('gives safety staff the safety role', () => {
    expect(threadParticipant(hazard(), 'someone', true)).toEqual({ role: 'safety' });
  });

  it('gives the matching known submitter the submitter role', () => {
    expect(threadParticipant(hazard({ submitterId: 'user_abc' }), 'user_abc', false)).toEqual({ role: 'submitter' });
  });

  it('returns null for a non-submitter, non-safety viewer', () => {
    expect(threadParticipant(hazard({ submitterId: 'user_abc' }), 'user_zzz', false)).toBeNull();
  });

  it('returns null for anonymous reports even for safety', () => {
    expect(threadParticipant(hazard({ isAnonymous: true }), 'x', true)).toBeNull();
  });
});

describe('lastMessage', () => {
  it('returns undefined for an empty thread', () => {
    expect(lastMessage(hazard())).toBeUndefined();
  });
  it('returns the final message', () => {
    const h = hazard({ messages: [msg('safety'), msg('submitter', { id: 'm2' })] });
    expect(lastMessage(h)?.id).toBe('m2');
  });
});

describe('isAwaitingReplyFrom', () => {
  it('is false with no messages', () => {
    expect(isAwaitingReplyFrom(hazard(), 'submitter')).toBe(false);
  });
  it('awaits the submitter when safety spoke last', () => {
    const h = hazard({ messages: [msg('safety')] });
    expect(isAwaitingReplyFrom(h, 'submitter')).toBe(true);
    expect(isAwaitingReplyFrom(h, 'safety')).toBe(false);
  });
  it('awaits safety when the submitter replied last', () => {
    const h = hazard({ messages: [msg('safety'), msg('submitter', { id: 'm2' })] });
    expect(isAwaitingReplyFrom(h, 'safety')).toBe(true);
    expect(isAwaitingReplyFrom(h, 'submitter')).toBe(false);
  });
  it('never awaits on anonymous reports', () => {
    const h = hazard({ isAnonymous: true, messages: [msg('safety')] });
    expect(isAwaitingReplyFrom(h, 'submitter')).toBe(false);
  });
});
