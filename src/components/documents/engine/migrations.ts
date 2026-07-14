// C5 — versioned migrations for the persisted documents store. A DATA_VERSION
// bump must transform the stored state forward, never wipe it: user-authored
// docs, acknowledgment history, and signature records survive upgrades.
//
// Every DATA_VERSION bump ships a step here (an identity step is fine). If a
// stored version has no matching step the state passes through unchanged —
// graceful degradation, never data loss. New seed content for existing stores
// is also a migration step's job (a fresh install gets it from the seeds).
import type { DocumentsState } from '../types';
import { safetyReadSeed } from '../mockData';

export interface StoredStateMigration {
  /** The DATA_VERSION this step upgrades TO. Steps run in ascending order. */
  to: string;
  migrate: (state: DocumentsState) => DocumentsState;
}

/** Ordered registry — version labels are date-prefixed so they sort lexicographically.
 * The '2026-07-11-blocks-v1' bump (content blob → sections) is handled by the
 * idempotent per-revision shape heal in the loader (`migrateRevisionForward`,
 * DocumentsContext) rather than a step here; register version-keyed steps for
 * later bumps whose transforms are not safely re-runnable, e.g.:
 *   { to: '2026-08-01-v2', migrate: (s) => ({ ...s, revisions: s.revisions.map(...) }) } */
export const STORED_STATE_MIGRATIONS: StoredStateMigration[] = [
  {
    // TL-6 / D29 — surface the safety-specific "SMS Manual — Revision G" required
    // read in stores created before it was seeded. New seed content otherwise
    // reaches only a fresh install (loadInitialState spreads persisted state over
    // the seeds). Idempotent: skips if the doc is already present; preserves all
    // existing docs/revisions/acks.
    to: '2026-07-14-safety-reads-v1',
    migrate: (s) => {
      const { doc, rev } = safetyReadSeed();
      if (s.docs.some((d) => d.id === doc.id)) return s;
      return { ...s, docs: [...s.docs, doc], revisions: [...s.revisions, rev] };
    },
  },
];

/** Apply every step newer than the stored version. `fromVersion === null`
 * (unknown provenance) applies all steps. */
export function migrateStoredState(
  stored: DocumentsState,
  fromVersion: string | null,
  steps: StoredStateMigration[] = STORED_STATE_MIGRATIONS,
): DocumentsState {
  return steps
    .filter((m) => fromVersion === null || m.to > fromVersion)
    .reduce((acc, m) => m.migrate(acc), stored);
}
