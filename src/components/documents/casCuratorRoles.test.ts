import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { documentsReducer } from './DocumentsContext';
import { classFor } from './classes';
import { canAuthor } from './engine/lifecycle';
import { CAS_KNOWLEDGE_CLASS_ID } from './engine/casKnowledge';
import type { Doc, DocRevision, DocumentsState } from './types';

/**
 * D60 fix pass — WHO may curate tribal knowledge, pinned at the reducer.
 *
 * Two separate properties live here, and they are the two halves of the same gate:
 *
 *  1. **Bryan's decision:** a plain `['maintenance']` user — a line technician, `USR008` in the
 *     demo roster — may author and directly publish tribal knowledge. D60 is the authority for
 *     that: it specifies direct publish by any maintenance user. Before this pass `TK_CURATORS`
 *     omitted the plain role, and the tail page's Reference tab only *looked* right because the
 *     first `maintenance` login resolves to a persona who also holds `dom`.
 *  2. **A non-curator is refused IN THE REDUCER, not merely denied a button.** The authority bypass
 *     this pass fixed reached the store with a fabricated role array, so hiding the affordance was
 *     never the gate. `CREATE_DOC` already enforced this; `PUBLISH_DIRECT` did not (LG-112) and
 *     now does.
 */

const NOW = '2026-07-29T12:00:00.000Z';
const TODAY = '2026-07-29';

function tkDoc(over: Partial<Doc> = {}): Doc {
  return {
    id: 'TK-501',
    classId: CAS_KNOWLEDGE_CLASS_ID,
    title: 'Field note',
    category: 'Aircraft Quirks',
    roles: ['all'],
    ownerUserId: 'USR008',
    ownerName: 'Tom Parker',
    tags: [],
    isPinned: false,
    isArchived: false,
    createdDate: TODAY,
    ...over,
  };
}

function tkRev(over: Partial<DocRevision> = {}): DocRevision {
  return {
    id: 'TK-501-r1',
    docId: 'TK-501',
    revision: '1.0',
    status: 'draft',
    sections: [
      { id: 'TK-501::preamble', level: 1, number: '', title: '', blocks: [{ id: 'TK-501::preamble::b0', type: 'paragraph', md: 'What the fleet has seen.' }] },
    ],
    changeSummary: '',
    effectiveDate: TODAY,
    authorUserId: 'USR008',
    authorName: 'Tom Parker',
    requireAcknowledgment: false,
    ackLevel: 'none',
    mockChecksum: 'abc',
    ...over,
  };
}

function emptyState(over: Partial<DocumentsState> = {}): DocumentsState {
  return {
    docs: [],
    revisions: [],
    acknowledgments: [],
    comments: [],
    suggestions: [],
    suggestionReplies: [],
    reviews: [],
    signatures: [],
    ...over,
  };
}

describe('tribal-knowledge curators (D60)', () => {
  let warn: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => warn.mockRestore());

  it('a plain ["maintenance"] user is a curator — a line tech, not only a DOM-shaped persona', () => {
    // The demo's USR008 (Tom Parker) holds exactly this and nothing else.
    expect(canAuthor(classFor(CAS_KNOWLEDGE_CLASS_ID), ['maintenance'])).toBe(true);
  });

  it('…and can create and directly publish an entry, end to end through the reducer', () => {
    const roles = ['maintenance'];
    let s = documentsReducer(emptyState(), {
      type: 'CREATE_DOC',
      payload: { doc: tkDoc(), revision: tkRev(), actorRoles: roles },
    });
    expect(s.docs.map((d) => d.id)).toEqual(['TK-501']);

    s = documentsReducer(s, {
      type: 'PUBLISH_DIRECT',
      payload: { revisionId: 'TK-501-r1', atUtc: NOW, today: TODAY, actorRoles: roles },
    });
    expect(s.revisions.find((r) => r.id === 'TK-501-r1')?.status).toBe('published');
  });

  it('chief-pilot stays a curator — Bryan considered removing it and declined', () => {
    expect(canAuthor(classFor(CAS_KNOWLEDGE_CLASS_ID), ['pilot', 'chief-pilot'])).toBe(true);
  });

  // ── the other half: a non-curator is refused at the store, not just at the button ──

  it.each([['scheduling'], ['hr'], ['pilot'], ['inflight']])(
    'a %s login cannot CREATE a tribal-knowledge entry',
    (role) => {
      const s = documentsReducer(emptyState(), {
        type: 'CREATE_DOC',
        payload: { doc: tkDoc(), revision: tkRev(), actorRoles: [role] },
      });
      expect(s.docs).toHaveLength(0);
      expect(s.revisions).toHaveLength(0);
    },
  );

  it.each([['scheduling'], ['hr'], ['pilot'], ['inflight']])(
    'a %s login cannot PUBLISH_DIRECT one either (LG-112 — the gate is on the action, not on how you got here)',
    (role) => {
      // The draft already exists, so "you could not have created it" is not doing the work.
      const s = documentsReducer(emptyState({ docs: [tkDoc()], revisions: [tkRev()] }), {
        type: 'PUBLISH_DIRECT',
        payload: { revisionId: 'TK-501-r1', atUtc: NOW, today: TODAY, actorRoles: [role] },
      });
      expect(s.revisions[0].status).toBe('draft');
    },
  );

  it('an empty role set publishes nothing', () => {
    const s = documentsReducer(emptyState({ docs: [tkDoc()], revisions: [tkRev()] }), {
      type: 'PUBLISH_DIRECT',
      payload: { revisionId: 'TK-501-r1', atUtc: NOW, today: TODAY, actorRoles: [] },
    });
    expect(s.revisions[0].status).toBe('draft');
  });
});
