import { describe, it, expect } from 'vitest';
import { documentsReducer } from './DocumentsContext';
import { isLiveComment, type Doc, type DocComment, type DocumentsState } from './types';

/**
 * D60's audit finding: a tribal-knowledge comment author could neither correct nor withdraw their
 * own field note. `ADD_COMMENT` was the app's ONLY comment mutation.
 *
 * What these tests pin, and why each matters:
 *  - **Author-only, in the REDUCER.** The thread UI hides the controls on other people's comments,
 *    but the authority check cannot live only there — every other gate in this reducer is enforced
 *    server-side-equivalent for exactly that reason (C12).
 *  - **The class gate is `commentsEnabled`, not `classId === 'tribal-knowledge'`.** TK is the only
 *    comment-enabled class today so this changes nothing else, but a future comment-enabled class
 *    inherits the rule for free — and a doc class that never allowed comments must not gain comment
 *    mutations through the back door.
 *  - **Nothing is silently rewritten and nothing vanishes.** An edit stamps `editedAtUtc`; a delete
 *    is a tombstone with the text cleared. `DocSuggestionReply` is append-only for the same reason:
 *    someone may already have acted on what the comment said.
 */

const TK_DOC: Doc = {
  id: 'TK-001',
  classId: 'tribal-knowledge',
  title: 'KTEB ramp construction',
  category: 'Airports & FBOs',
  roles: ['all'],
  ownerUserId: 'USR002',
  ownerName: 'Sarah Wilson',
  tags: [],
  isPinned: false,
  isArchived: false,
  createdDate: '2026-07-01',
};

const SOP_DOC: Doc = { ...TK_DOC, id: 'SOP-001', classId: 'sop', category: 'Flight Operations' };

const COMMENT: DocComment = {
  id: 'cmt-1',
  docId: 'TK-001',
  authorUserId: 'USR001',
  authorName: 'Captain John Smith',
  role: 'pilot',
  text: 'North gate worked at 2230L.',
  createdAtUtc: '2026-07-20T22:41:00.000Z',
};

const NOW = '2026-07-29T12:00:00.000Z';

function state(comments: DocComment[], docs: Doc[] = [TK_DOC]): DocumentsState {
  return {
    docs,
    revisions: [],
    acknowledgments: [],
    comments,
    suggestions: [],
    suggestionReplies: [],
    reviews: [],
    signatures: [],
  };
}

const edit = (text: string, actorUserId = 'USR001', id = 'cmt-1') =>
  ({ type: 'EDIT_COMMENT', payload: { id, text, actorUserId, atUtc: NOW } }) as const;
const withdraw = (actorUserId = 'USR001', id = 'cmt-1') =>
  ({ type: 'DELETE_COMMENT', payload: { id, actorUserId, atUtc: NOW } }) as const;

describe('EDIT_COMMENT', () => {
  it('the author may revise their own comment, and the revision is marked', () => {
    const s = documentsReducer(state([COMMENT]), edit('West gate readers still dead — north gate worked.'));
    expect(s.comments[0].text).toBe('West gate readers still dead — north gate worked.');
    expect(s.comments[0].editedAtUtc).toBe(NOW);
    expect(s.comments[0].createdAtUtc).toBe(COMMENT.createdAtUtc);
  });

  it('trims at commit', () => {
    const s = documentsReducer(state([COMMENT]), edit('  trimmed  '));
    expect(s.comments[0].text).toBe('trimmed');
  });

  it('refuses a non-author — the gate is in the reducer, not the UI', () => {
    const s = documentsReducer(state([COMMENT]), edit('Rewritten by someone else.', 'USR002'));
    expect(s.comments[0]).toEqual(COMMENT);
    expect(s.comments[0].editedAtUtc).toBeUndefined();
  });

  it('refuses an empty edit — that is a withdrawal, which is a different act', () => {
    const s = documentsReducer(state([COMMENT]), edit('   '));
    expect(s.comments[0]).toEqual(COMMENT);
  });

  it('does not stamp "edited" when the text is unchanged', () => {
    const s = documentsReducer(state([COMMENT]), edit(COMMENT.text));
    expect(s.comments[0].editedAtUtc).toBeUndefined();
  });

  it('refuses on a class where comments are not enabled', () => {
    const onSop: DocComment = { ...COMMENT, docId: 'SOP-001' };
    const s = documentsReducer(state([onSop], [SOP_DOC]), edit('Should not apply.'));
    expect(s.comments[0]).toEqual(onSop);
  });

  it('refuses when the comment does not exist', () => {
    const s = documentsReducer(state([COMMENT]), edit('x', 'USR001', 'cmt-nope'));
    expect(s.comments).toEqual([COMMENT]);
  });

  it('refuses to change a withdrawn comment', () => {
    const gone = documentsReducer(state([COMMENT]), withdraw());
    const s = documentsReducer(gone, edit('Un-withdrawing myself.'));
    expect(s.comments[0].text).toBe('');
    expect(s.comments[0].deletedAtUtc).toBe(NOW);
  });
});

describe('DELETE_COMMENT', () => {
  it('tombstones rather than dropping the row, and clears the text', () => {
    const s = documentsReducer(state([COMMENT]), withdraw());
    expect(s.comments).toHaveLength(1);
    expect(s.comments[0].deletedAtUtc).toBe(NOW);
    expect(s.comments[0].text).toBe('');
    // Authorship survives so the thread can say who withdrew it.
    expect(s.comments[0].authorName).toBe('Captain John Smith');
  });

  it('refuses a non-author', () => {
    const s = documentsReducer(state([COMMENT]), withdraw('USR002'));
    expect(s.comments[0]).toEqual(COMMENT);
  });

  it('leaves other comments untouched', () => {
    const other: DocComment = { ...COMMENT, id: 'cmt-2', authorUserId: 'USR003', text: 'Catering reroutes too.' };
    const s = documentsReducer(state([COMMENT, other]), withdraw());
    expect(s.comments[1]).toEqual(other);
  });
});

describe('isLiveComment', () => {
  it('excludes a tombstone from the count crews are shown', () => {
    const s = documentsReducer(state([COMMENT]), withdraw());
    expect(s.comments.filter(isLiveComment)).toHaveLength(0);
    expect([COMMENT].filter(isLiveComment)).toHaveLength(1);
  });
});
