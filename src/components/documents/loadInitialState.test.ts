import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Doc, DocumentsState } from './types';
import type { Bulletin } from '../bulletins/types';
import {
  loadInitialState,
  STORAGE_KEY,
  VERSION_KEY,
  DATA_VERSION,
  BULLETINS_IMPORTED_KEY,
} from './DocumentsContext';

class MemoryStorage {
  private m = new Map<string, string>();
  getItem(k: string): string | null {
    return this.m.has(k) ? (this.m.get(k) as string) : null;
  }
  setItem(k: string, v: string): void {
    this.m.set(k, String(v));
  }
  removeItem(k: string): void {
    this.m.delete(k);
  }
  clear(): void {
    this.m.clear();
  }
}

function userDoc(): Doc {
  return {
    id: 'SOP-900',
    classId: 'sop',
    title: 'User-authored SOP',
    category: 'Flight Operations',
    roles: ['pilot'],
    ownerUserId: 'USR007',
    ownerName: 'Emily Chen',
    tags: [],
    isPinned: false,
    isArchived: false,
    createdDate: '2026-06-01',
  };
}

/** A PRE-block-model revision as an old build persisted it: a `content`
 * markdown blob, no `sections`. The loader must transform it forward. */
function legacyUserRev(): Record<string, unknown> {
  return {
    id: 'SOP-900-r1',
    docId: 'SOP-900',
    revision: '1.0',
    status: 'published',
    content: '# User SOP\n\n## Purpose\nBody',
    changeSummary: '',
    effectiveDate: '2026-06-01',
    authorUserId: 'USR007',
    authorName: 'Emily Chen',
    requireAcknowledgment: true,
    ackLevel: 'initials',
    mockChecksum: 'abc',
    publishedAtUtc: '2026-06-01T12:00:00.000Z',
  };
}

function storedState(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    docs: [userDoc()],
    revisions: [legacyUserRev()],
    acknowledgments: [
      {
        docId: 'SOP-900',
        revisionId: 'SOP-900-r1',
        revision: '1.0',
        userId: 'USR001',
        userName: 'Captain John Smith',
        role: 'pilot',
        level: 'initials',
        initials: 'JS',
        acknowledgedAtUtc: '2026-06-02T12:00:00.000Z',
      },
    ],
    comments: [],
    suggestions: [],
    reviews: [],
    signatures: [],
    ...overrides,
  };
}

function legacyBulletin(title: string): Bulletin {
  return {
    id: 'PB-001',
    bulletinType: 'procedural',
    title,
    content: 'Legacy body',
    category: 'Operations',
    roles: ['all'],
    effectiveDate: '2026-05-01',
    author: 'Sarah Johnson',
    createdDate: '2026-05-01',
    version: '2.0',
    isPinned: false,
    isArchived: false,
    requireAcknowledgment: true,
    tags: [],
  };
}

beforeEach(() => {
  (globalThis as { localStorage?: unknown }).localStorage = new MemoryStorage();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  delete (globalThis as { localStorage?: unknown }).localStorage;
  vi.restoreAllMocks();
});

describe('loadInitialState (C5 — migrate, don’t wipe)', () => {
  it('a DATA_VERSION bump preserves stored docs, acks, and signatures', () => {
    localStorage.setItem(VERSION_KEY, '2020-01-01-v0');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storedState()));

    const s = loadInitialState();

    expect(s.docs.some((d) => d.id === 'SOP-900')).toBe(true);
    expect(s.acknowledgments.some((a) => a.docId === 'SOP-900' && a.initials === 'JS')).toBe(true);
  });

  it('the blocks bump transforms a pre-block-model revision to sections instead of wiping it', () => {
    localStorage.setItem(VERSION_KEY, '2026-07-10-v1'); // pre-blocks build
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storedState()));

    const s = loadInitialState();

    const rev = s.revisions.find((r) => r.id === 'SOP-900-r1');
    expect(rev).toBeDefined();
    expect(Array.isArray(rev?.sections)).toBe(true);
    expect((rev?.sections ?? []).length).toBeGreaterThan(0);
    expect((rev as unknown as { content?: string }).content).toBeUndefined();
  });

  it('a DATA_VERSION bump stamps the new version and persists the migrated (sections) state', () => {
    localStorage.setItem(VERSION_KEY, '2020-01-01-v0');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storedState()));

    loadInitialState();

    expect(localStorage.getItem(VERSION_KEY)).toBe(DATA_VERSION);
    const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY) as string) as DocumentsState;
    expect(persisted.docs.some((d) => d.id === 'SOP-900')).toBe(true);
    expect(Array.isArray(persisted.revisions.find((r) => r.id === 'SOP-900-r1')?.sections)).toBe(true);
  });

  it('a DATA_VERSION bump does not resurrect stale legacy bulletins over the stored state', () => {
    localStorage.setItem('bulletins-state', JSON.stringify({ bulletins: [legacyBulletin('STALE pre-migration title')], acknowledgments: [] }));
    localStorage.setItem(VERSION_KEY, '2020-01-01-v0');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storedState()));

    const s = loadInitialState();

    expect(s.docs.some((d) => d.title === 'STALE pre-migration title')).toBe(false);
    expect(s.docs.some((d) => d.id === 'SOP-900')).toBe(true);
  });

  it('first-ever load imports legacy bulletins once and flags the import', () => {
    localStorage.setItem('bulletins-state', JSON.stringify({ bulletins: [legacyBulletin('EDITED legacy title')], acknowledgments: [] }));

    const s = loadInitialState();

    expect(s.docs.some((d) => d.title === 'EDITED legacy title')).toBe(true);
    expect(localStorage.getItem(BULLETINS_IMPORTED_KEY)).toBeTruthy();
  });

  it('after the import flag is set, a re-seed does not re-import legacy bulletins', () => {
    localStorage.setItem('bulletins-state', JSON.stringify({ bulletins: [legacyBulletin('EDITED legacy title')], acknowledgments: [] }));
    loadInitialState(); // first load imports + flags
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(VERSION_KEY);

    const s = loadInitialState(); // simulated reset → plain seeds

    expect(s.docs.some((d) => d.title === 'EDITED legacy title')).toBe(false);
  });

  it('a matching version still loads the stored state unchanged', () => {
    localStorage.setItem(VERSION_KEY, DATA_VERSION);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storedState()));

    const s = loadInitialState();

    expect(s.docs.some((d) => d.id === 'SOP-900')).toBe(true);
  });
});
