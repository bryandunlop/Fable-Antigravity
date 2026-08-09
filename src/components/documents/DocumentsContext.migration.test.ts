import { describe, it, expect } from 'vitest';
import { migrateRevisionForward, documentsStateIsUnusable, DATA_VERSION } from './DocumentsContext';
import { STORED_STATE_MIGRATIONS } from './engine/migrations';

describe('migrateRevisionForward', () => {
  it('splits a pre-block-model content blob into sections and drops content', () => {
    const legacy = {
      id: 'SOP-001-r1',
      docId: 'SOP-001',
      revision: '1.0',
      status: 'published',
      content: '# Title\n\n## Purpose\nDo the thing.',
      mockChecksum: 'stale',
    };
    const out = migrateRevisionForward(legacy) as Record<string, unknown>;
    expect(out.content).toBeUndefined();
    expect(Array.isArray(out.sections)).toBe(true);
    expect((out.sections as unknown[]).length).toBeGreaterThan(0);
    expect(typeof out.mockChecksum).toBe('string');
    expect(out.mockChecksum).not.toBe('stale'); // recomputed from the tree
    // Non-content fields are preserved verbatim — the user's record is not lost.
    expect(out.id).toBe('SOP-001-r1');
    expect(out.revision).toBe('1.0');
    expect(out.status).toBe('published');
  });

  it('passes an already-migrated revision through unchanged (idempotent)', () => {
    const current = {
      id: 'x',
      docId: 'D',
      sections: [{ id: 'D::s', level: 1, number: '', title: '', blocks: [] }],
    };
    expect(migrateRevisionForward(current)).toBe(current);
  });

  it('leaves a revision with neither content nor sections alone', () => {
    const weird = { id: 'x', docId: 'D' };
    expect(migrateRevisionForward(weird)).toBe(weird);
  });
});

describe('documentsStateIsUnusable', () => {
  it('is false for a state with a revisions array — even old-shaped (it gets migrated, not wiped)', () => {
    expect(documentsStateIsUnusable({ revisions: [{ id: 'x', content: '# old' }] })).toBe(false);
  });

  it('is true for non-object / missing-revisions payloads', () => {
    expect(documentsStateIsUnusable(null)).toBe(true);
    expect(documentsStateIsUnusable({})).toBe(true);
    expect(documentsStateIsUnusable({ revisions: 'nope' })).toBe(true);
  });
});

describe('DATA_VERSION', () => {
  // Pins the CURRENT version, so a bump is always a deliberate edit here too. The rule
  // that actually protects stored data — every live version ships a migration step — is
  // asserted in casKnowledgeSeeds.test.ts.
  it('is the version this slice bumped to (the one-working-draft invariant)', () => {
    expect(DATA_VERSION).toBe('2026-08-08-single-draft-v1');
  });

  // The rule the module's own header states: every DATA_VERSION bump ships a
  // step. Pinning it here means a bump that forgets one fails at the bump,
  // rather than silently leaving returning users on the old shape.
  it('matches the newest migration step', () => {
    const newest = [...STORED_STATE_MIGRATIONS].sort((a, b) => a.to.localeCompare(b.to)).at(-1)!;
    expect(DATA_VERSION).toBe(newest.to);
  });
});
