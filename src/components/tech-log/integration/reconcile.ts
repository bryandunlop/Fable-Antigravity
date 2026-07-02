// Reconcile CAMP's discrepancy list (GetAircraftDiscrepancies) against myGFO's OFF-LEDGER
// correlation table. Pure + deterministic so it is unit-testable; the side-effectful CAMP
// read lives in useIntegration. Buckets:
//   - matched:   in CAMP and pushed from myGFO (correlation ref present in CAMP)
//   - campOnly:  in CAMP with no myGFO correlation (entered directly in CAMP — triage into myGFO)
//   - mygfoOnly: pushed/attempted from myGFO but NOT present in CAMP (failed/pending/missing — investigate)
import type { CampDiscrepancy } from './campClient';
import type { CampCorrelation } from '../types';

export interface ReconcileResult {
  matched: CampDiscrepancy[];
  campOnly: CampDiscrepancy[];
  mygfoOnly: CampCorrelation[];
}

export function reconcileDiscrepancies(
  campList: CampDiscrepancy[],
  correlations: CampCorrelation[],
): ReconcileResult {
  const pushedRefs = new Set(
    correlations
      .filter(c => c.pushState === 'PUSHED' && c.campDiscrepancyRef)
      .map(c => c.campDiscrepancyRef as string),
  );
  const campIds = new Set(campList.map(d => d.discrepancyId));
  return {
    matched: campList.filter(d => pushedRefs.has(d.discrepancyId)),
    campOnly: campList.filter(d => !pushedRefs.has(d.discrepancyId)),
    mygfoOnly: correlations.filter(c => !c.campDiscrepancyRef || !campIds.has(c.campDiscrepancyRef)),
  };
}
