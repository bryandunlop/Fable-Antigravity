// C5 — versioned migrations for the persisted documents store. A DATA_VERSION
// bump must transform the stored state forward, never wipe it: user-authored
// docs, acknowledgment history, and signature records survive upgrades.
//
// Every DATA_VERSION bump ships a step here (an identity step is fine). If a
// stored version has no matching step the state passes through unchanged —
// graceful degradation, never data loss. New seed content for existing stores
// is also a migration step's job (a fresh install gets it from the seeds).
import type { DocumentsState } from '../types';

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
export const STORED_STATE_MIGRATIONS: StoredStateMigration[] = [];

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
