import { describe, it, expect } from 'vitest';
import { buildHazardMessageFeed } from './hazardMessages';
import { memoryStorage } from '../storage';
import type { Hazard, HazardMessage } from '../../contexts/HazardContext';

function msg(authorRole: 'safety' | 'submitter'): HazardMessage {
  return { id: 'm', authorId: 'u', authorRole, authorName: 'x', body: 'b', atUtc: '2026-02-01T00:00:00Z' };
}

function hazard(overrides: Partial<Hazard> = {}): Hazard {
  return {
    id: 'HZ-001', title: 'Loose tooling', severity: 'Medium', workflowStage: 'Submitted',
    location: 'Bay 2', reportedBy: 'Reporter', reportedDate: '2026-02-01', description: '',
    immediateActions: '', potentialConsequences: '', submitterId: 'user_abc', isAnonymous: false, ...overrides,
  };
}

function store(hazards: Hazard[], userId?: string) {
  const s = memoryStorage();
  s.setItem('aviation_hazards', JSON.stringify(hazards));
  if (userId) s.setItem('aviation_user_id', userId);
  return s;
}

const NOW = '2026-02-02T00:00:00Z';

describe('buildHazardMessageFeed — safety side', () => {
  it('surfaces hazards where the reporter replied last', () => {
    const s = store([hazard({ messages: [msg('safety'), msg('submitter')] })]);
    const feed = buildHazardMessageFeed('safety', NOW, s);
    expect(feed).toHaveLength(1);
    expect(feed[0].id).toBe('hazard-msg-safety:HZ-001');
    expect(feed[0].link).toBe('/safety/hazards/HZ-001');
  });

  it('does not surface when safety spoke last', () => {
    const s = store([hazard({ messages: [msg('safety')] })]);
    expect(buildHazardMessageFeed('safety', NOW, s)).toEqual([]);
  });
});

describe('buildHazardMessageFeed — reporter side', () => {
  it('surfaces a follow-up request to the matching reporter', () => {
    const s = store([hazard({ messages: [msg('safety')] })], 'user_abc');
    const feed = buildHazardMessageFeed('pilot', NOW, s);
    expect(feed).toHaveLength(1);
    expect(feed[0].severity).toBe('warn');
    expect(feed[0].id).toBe('hazard-msg-reporter:HZ-001');
  });

  it('does not surface to a different user', () => {
    const s = store([hazard({ messages: [msg('safety')] })], 'user_other');
    expect(buildHazardMessageFeed('pilot', NOW, s)).toEqual([]);
  });

  it('clears once the reporter has replied', () => {
    const s = store([hazard({ messages: [msg('safety'), msg('submitter')] })], 'user_abc');
    expect(buildHazardMessageFeed('pilot', NOW, s)).toEqual([]);
  });

  it('never surfaces anonymous reports', () => {
    const s = store([hazard({ isAnonymous: true, submitterId: undefined, messages: [msg('safety')] })], 'user_abc');
    expect(buildHazardMessageFeed('pilot', NOW, s)).toEqual([]);
  });
});
