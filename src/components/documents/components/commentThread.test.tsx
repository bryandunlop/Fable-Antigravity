import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocumentsProvider, STORAGE_KEY, VERSION_KEY, DATA_VERSION, identityFor } from '../DocumentsContext';
import { CommentThread } from './CommentThread';
import type { Doc, DocComment, DocumentsState } from '../types';

/**
 * D60 — the comment author's edit/withdraw affordance, end to end through the provider.
 *
 * The reducer tests (`commentAuthorship.test.ts`) pin the authority rules; this pins that a user can
 * actually REACH them, and that the marks are visible: "edited" after a revision, a named tombstone
 * after a withdrawal. A thread that silently rewrote history would pass the reducer tests.
 */

const DOC: Doc = {
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

// 'pilot' resolves to USR001 (SYSTEM_USERS) — so this comment is the signed-in user's own.
const MINE: DocComment = {
  id: 'cmt-mine',
  docId: 'TK-001',
  authorUserId: identityFor('pilot').userId,
  authorName: 'Captain John Smith',
  role: 'pilot',
  text: 'North gate worked at 2230L.',
  createdAtUtc: '2026-07-20T22:41:00.000Z',
};

const THEIRS: DocComment = {
  id: 'cmt-theirs',
  docId: 'TK-001',
  authorUserId: 'USR003',
  authorName: 'Mike Johnson',
  role: 'inflight',
  text: 'Catering reroutes to the north gate too.',
  createdAtUtc: '2026-07-21T13:02:00.000Z',
};

function renderThread(comments: DocComment[] = [MINE, THEIRS]) {
  const seed: Partial<DocumentsState> = { docs: [DOC], revisions: [], comments };
  localStorage.setItem(VERSION_KEY, DATA_VERSION);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  return render(
    <DocumentsProvider>
      <CommentThread doc={DOC} userRole="pilot" />
    </DocumentsProvider>,
  );
}

const rowFor = (text: string) => screen.getByText(text).closest('li') as HTMLElement;

describe('CommentThread — author controls', () => {
  it('offers Edit and Withdraw on the reader’s own comment only', () => {
    renderThread();
    expect(within(rowFor(MINE.text)).getByRole('button', { name: /edit/i })).toBeInTheDocument();
    expect(within(rowFor(MINE.text)).getByRole('button', { name: /withdraw/i })).toBeInTheDocument();
    expect(within(rowFor(THEIRS.text)).queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(within(rowFor(THEIRS.text)).queryByRole('button', { name: /withdraw/i })).not.toBeInTheDocument();
  });

  it('an edit replaces the text and marks the comment as edited', async () => {
    const user = userEvent.setup();
    renderThread();
    await user.click(within(rowFor(MINE.text)).getByRole('button', { name: /edit/i }));
    const box = screen.getByLabelText('Edit comment');
    await user.clear(box);
    await user.type(box, 'West gate readers dead after 2100L.');
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(screen.getByText('West gate readers dead after 2100L.')).toBeInTheDocument();
    expect(screen.queryByText(MINE.text)).not.toBeInTheDocument();
    expect(screen.getByText(/edited/)).toBeInTheDocument();
  });

  it('typing a trailing space in the editor is not eaten (no normalization on change)', async () => {
    const user = userEvent.setup();
    renderThread();
    await user.click(within(rowFor(MINE.text)).getByRole('button', { name: /edit/i }));
    const box = screen.getByLabelText('Edit comment') as HTMLTextAreaElement;
    await user.clear(box);
    await user.type(box, 'North gate ');
    expect(box.value).toBe('North gate ');
  });

  it('a withdrawal leaves a named tombstone, not a hole in the thread', async () => {
    const user = userEvent.setup();
    renderThread();
    await user.click(within(rowFor(MINE.text)).getByRole('button', { name: 'Withdraw' }));
    await user.click(screen.getByRole('button', { name: 'Withdraw it' }));

    expect(screen.getByText(/Comment withdrawn by Captain John Smith/)).toBeInTheDocument();
    // The other author's note is untouched.
    expect(screen.getByText(THEIRS.text)).toBeInTheDocument();
    // A tombstone offers no further controls.
    expect(screen.queryByRole('button', { name: /withdraw/i })).not.toBeInTheDocument();
  });

  /**
   * The withdrawal used to clear `text`, which is a DELETE wearing the word "tombstone": the record
   * could no longer say what was withdrawn, and the brief asked for content preserved and marked,
   * mirroring `DocSuggestionReply`'s append-only discipline. Someone may already have flown on the
   * strength of the note.
   */
  it('withdrawing PRESERVES the text on the record rather than blanking it', async () => {
    const user = userEvent.setup();
    renderThread();
    await user.click(within(rowFor(MINE.text)).getByRole('button', { name: 'Withdraw' }));
    await user.click(screen.getByRole('button', { name: 'Withdraw it' }));

    const kept = screen.getByText(MINE.text);
    expect(kept).toBeInTheDocument();
    // ...and it is rendered as withdrawn, not as a standing note.
    expect(kept.className).toContain('line-through');
  });

  it('asks before withdrawing — one misclick does not destroy a field note', async () => {
    const user = userEvent.setup();
    renderThread();
    await user.click(within(rowFor(MINE.text)).getByRole('button', { name: 'Withdraw' }));

    // Nothing has happened yet: no tombstone, and a way out.
    expect(screen.queryByText(/Comment withdrawn by/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Keep it' }));

    expect(screen.queryByText(/Comment withdrawn by/)).not.toBeInTheDocument();
    expect(within(rowFor(MINE.text)).getByRole('button', { name: 'Withdraw' })).toBeInTheDocument();
  });
});
