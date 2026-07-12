import { describe, it, expect } from 'vitest';
import type { DocumentsState } from '../types';
import { migrateStoredState, STORED_STATE_MIGRATIONS, type StoredStateMigration } from './migrations';

function emptyState(overrides: Partial<DocumentsState> = {}): DocumentsState {
  return {
    docs: [],
    revisions: [],
    acknowledgments: [],
    comments: [],
    suggestions: [],
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
