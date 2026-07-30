import { useMemo } from 'react';
import type { AircraftType } from '../../tech-log/types';
import { useDocumentsOptional } from '../DocumentsContext';
import { casCatalog, type CasCatalogEntry } from '../engine/casKnowledge';

/**
 * D60 — the CAS messages curated for one fleet type, live from the documents store.
 *
 * Derived on read, never cached in state: publishing a tribal-knowledge entry makes it appear in the
 * defect form's picker with no sync step, and withdrawing one removes it.
 *
 * Returns `[]` when there is no fleet type yet (no aircraft chosen) or no documents provider at all.
 * The second case is deliberate: the defect form is the intake surface for a signed record and must
 * never depend on the knowledge store being mounted — free text is D57's stated fallback.
 */
export function useCasCatalog(fleetType: AircraftType | undefined): CasCatalogEntry[] {
  const ctx = useDocumentsOptional();
  const docs = ctx?.state.docs;
  const revisions = ctx?.state.revisions;
  return useMemo(
    () => (docs && revisions && fleetType ? casCatalog(docs, revisions, fleetType) : []),
    [docs, revisions, fleetType],
  );
}
