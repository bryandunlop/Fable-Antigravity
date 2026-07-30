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
