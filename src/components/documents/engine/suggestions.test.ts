import { describe, it, expect } from 'vitest';
import { openSuggestionsByBlock, repliesFor, canSeeSuggestion } from './suggestions';
import type { DocSuggestion, DocSuggestionReply, Doc } from '../types';

const sug = (over: Partial<DocSuggestion>): DocSuggestion => ({
  id: 's1', docId: 'D1', revisionId: 'D1-r1', docTitle: 'D', authorUserId: 'a', authorName: 'A',
  role: 'pilot', proposedChange: 'x', rationale: 'y', status: 'open', createdAtUtc: '2026-01-01T00:00:00Z', ...over,
});
const doc = (over: Partial<Doc> = {}): Doc => ({
  id: 'D1', classId: 'sop', title: 'D', category: 'c', roles: ['all'], ownerUserId: 'owner', ownerName: 'O',
  tags: [], isPinned: false, isArchived: false, createdDate: '2026-01-01', ...over,
});

describe('openSuggestionsByBlock', () => {
  it('groups only open, block-anchored suggestions by blockId, oldest-first', () => {
    const m = openSuggestionsByBlock([
      sug({ id: 's2', blockId: 'b1', createdAtUtc: '2026-01-02T00:00:00Z' }),
      sug({ id: 's1', blockId: 'b1', createdAtUtc: '2026-01-01T00:00:00Z' }),
      sug({ id: 's3', blockId: 'b2' }),
      sug({ id: 's4', blockId: 'b1', status: 'accepted' }),
      sug({ id: 's5' }), // no blockId
    ]);
    expect(m.get('b1')!.map((s) => s.id)).toEqual(['s1', 's2']);
    expect(m.get('b2')!.map((s) => s.id)).toEqual(['s3']);
    expect(m.has('undefined')).toBe(false);
  });
});

describe('repliesFor', () => {
  it('returns the suggestion’s replies chronologically', () => {
    const replies: DocSuggestionReply[] = [
      { id: 'r2', suggestionId: 's1', authorUserId: 'a', authorName: 'A', role: 'pilot', text: 'two', createdAtUtc: '2026-01-02T00:00:00Z' },
      { id: 'r1', suggestionId: 's1', authorUserId: 'a', authorName: 'A', role: 'pilot', text: 'one', createdAtUtc: '2026-01-01T00:00:00Z' },
      { id: 'r3', suggestionId: 's9', authorUserId: 'a', authorName: 'A', role: 'pilot', text: 'other', createdAtUtc: '2026-01-03T00:00:00Z' },
    ];
    expect(repliesFor(replies, 's1').map((r) => r.id)).toEqual(['r1', 'r2']);
  });
});

describe('canSeeSuggestion', () => {
  const s = sug({ authorUserId: 'author' });
  it('manager sees it', () => expect(canSeeSuggestion(s, 'someone', ['admin'], doc())).toBe(true));
  it('owner sees it', () => expect(canSeeSuggestion(s, 'owner', ['pilot'], doc())).toBe(true));
  it('author sees it', () => expect(canSeeSuggestion(s, 'author', ['pilot'], doc())).toBe(true));
  it('unrelated crew does not', () => expect(canSeeSuggestion(s, 'other', ['pilot'], doc())).toBe(false));
});
