import { describe, it, expect } from 'vitest';
import type { DocumentsState } from '../types';
import { migrateStoredState, STORED_STATE_MIGRATIONS, type StoredStateMigration } from './migrations';
import { safetyReadSeed } from '../mockData';

function emptyState(overrides: Partial<DocumentsState> = {}): DocumentsState {
  return {
    docs: [],
    revisions: [],
    acknowledgments: [],
    comments: [],
    suggestions: [],
    suggestionReplies: [],
    reviews: [],
    signatures: [],
    ...overrides,
  };
}

const tag = (label: string): StoredStateMigration => ({
  to: label,
  migrate: (s) => ({ ...s, suggestions: [...s.suggestions, { id: label } as never] }),
});

describe('migrateStoredState (C5 — transform forward, never wipe)', () => {
  it('applies only the steps newer than the stored version, in order', () => {
    const steps = [tag('2026-07-10-v1'), tag('2026-07-11-blocks-v1'), tag('2026-08-01-v2')];
    const out = migrateStoredState(emptyState(), '2026-07-10-v1', steps);
    expect(out.suggestions.map((s) => s.id)).toEqual(['2026-07-11-blocks-v1', '2026-08-01-v2']);
  });

  it('applies every step when the stored version is unknown (null)', () => {
    const steps = [tag('2026-07-10-v1'), tag('2026-07-11-blocks-v1')];
    const out = migrateStoredState(emptyState(), null, steps);
    expect(out.suggestions.map((s) => s.id)).toEqual(['2026-07-10-v1', '2026-07-11-blocks-v1']);
  });

  it('passes state through unchanged when no step applies — never wipes', () => {
    const stored = emptyState({ docs: [{ id: 'SOP-900' } as never] });
    const out = migrateStoredState(stored, '2026-07-10-v1', [tag('2026-07-01-v0')]);
    expect(out).toEqual(stored);
  });

  it('the live registry is ordered by target version', () => {
    const tos = STORED_STATE_MIGRATIONS.map((m) => m.to);
    expect([...tos].sort()).toEqual(tos);
  });
});

describe('TL-6 / D29 — safety read injected into pre-existing stores', () => {
  const OLD = '2026-07-11-blocks-v1';
  const NEW = '2026-07-14-safety-reads-v1';

  it('injects the SMS Manual doc + revision into an existing store that lacks it, preserving existing data', () => {
    const stored = emptyState({ docs: [{ id: 'SOP-900' } as never] });
    const out = migrateStoredState(stored, OLD);
    expect(out.docs.some((d) => d.id === 'GOM-SMS')).toBe(true);
    expect(out.revisions.some((r) => r.docId === 'GOM-SMS')).toBe(true);
    expect(out.docs.some((d) => d.id === 'SOP-900')).toBe(true); // existing docs kept
  });

  it('is idempotent — a store already containing the safety read is unchanged (no duplicate)', () => {
    const { doc, rev } = safetyReadSeed();
    const stored = emptyState({ docs: [doc], revisions: [rev] });
    // Scoped to the safety-read step on purpose. Running the whole registry also applies
    // every LATER step (D60's CAS knowledge seeds, and whatever comes after), so the
    // whole-state equality below would fail for a reason that has nothing to do with this
    // step's idempotency — which is what this test is about.
    const safetyStep = STORED_STATE_MIGRATIONS.filter((m) => m.to === NEW);
    expect(safetyStep).toHaveLength(1);
    const out = migrateStoredState(stored, OLD, safetyStep);
    expect(out.docs.filter((d) => d.id === 'GOM-SMS')).toHaveLength(1);
    expect(out).toEqual(stored);
  });

  it('does not inject when the store is already at the new version', () => {
    const stored = emptyState({ docs: [{ id: 'SOP-900' } as never] });
    const out = migrateStoredState(stored, NEW);
    expect(out.docs.some((d) => d.id === 'GOM-SMS')).toBe(false);
  });
});

describe('D64 — ship-note section vocabulary', () => {
  const STEP = '2026-07-30-ship-note-sections-v1';
  const base = (over: Partial<DocumentsState> = {}): DocumentsState => ({
    docs: [], revisions: [], acknowledgments: [], comments: [], suggestions: [],
    suggestionReplies: [], reviews: [], signatures: [], ...over,
  });
  const d = (id: string, category: string, classId = 'tribal-knowledge') => ({
    id, classId, title: id, category, roles: ['all'], ownerUserId: 'u', ownerName: 'O',
    tags: [], isPinned: false, isArchived: false, createdDate: '2026-07-01',
  });
  const r = (docId: string, fleetTypes?: string[]) => ({
    id: `${docId}-r1`, docId, revision: '1.0', status: 'published' as const, sections: [],
    changeSummary: '', effectiveDate: '2026-07-01', authorUserId: 'u', authorName: 'A',
    requireAcknowledgment: false, ackLevel: 'none' as const, mockChecksum: 'x',
    ...(fleetTypes ? { fleetTypes } : {}),
  });
  const run = (s: DocumentsState) =>
    migrateStoredState(s, '2026-07-30-cas-on-revision-v1', STORED_STATE_MIGRATIONS.filter((m) => m.to === STEP));

  it('remaps a fleet-scoped entry off the retired department categories', () => {
    const s = base({
      docs: [d('TK-1', 'Maintenance'), d('TK-2', 'Cabin'), d('TK-3', 'Aircraft Quirks')] as never,
      revisions: [r('TK-1', ['G650ER']), r('TK-2', ['G650ER']), r('TK-3', ['G500'])] as never,
    });
    const out = run(s);
    expect(out.docs.map((x) => x.category)).toEqual([
      'Messages & faults', 'Cabin & connectivity', 'Quirks & field notes',
    ]);
  });

  it('leaves the surviving library categories alone', () => {
    const s = base({
      docs: [d('TK-9', 'Airports & FBOs'), d('TK-7', 'Operations')] as never,
      revisions: [r('TK-9'), r('TK-7')] as never,
    });
    expect(run(s).docs.map((x) => x.category)).toEqual(['Airports & FBOs', 'Operations']);
  });

  it('retires the old names even on library content, so nothing is left on a category no picker offers', () => {
    const s = base({ docs: [d('TK-8', 'Aircraft Quirks')] as never, revisions: [r('TK-8')] as never });
    expect(run(s).docs[0].category).toBe('Quirks & field notes');
  });

  it('does not touch other document classes', () => {
    const s = base({
      docs: [d('SOP-1', 'Maintenance', 'sop')] as never,
      revisions: [r('SOP-1', ['G650ER'])] as never,
    });
    expect(run(s).docs[0].category).toBe('Maintenance');
  });

  it('is idempotent — re-running leaves an already-migrated store unchanged', () => {
    const s = base({ docs: [d('TK-1', 'Maintenance')] as never, revisions: [r('TK-1', ['G650ER'])] as never });
    const once = run(s);
    expect(run(once).docs[0].category).toBe(once.docs[0].category);
  });
});
