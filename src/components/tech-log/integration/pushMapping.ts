import type { IntegrateMode } from './campTaxonomy';

// How a myGFO mutation maps onto CAMP IntegrateDiscrepancies (modes INSERT/EDIT/UPDATE):
//   CREATE  → INSERT (new discrepancy, Open)
//   CORRECT → EDIT a previously-pushed discrepancy (still Open), carrying the parent CAMP ref forward
//   CLOSE   → UPDATE the discrepancy to status Closed (rectification / deferral clearance)
// If the parent was never pushed (no ref to act on), CORRECT/CLOSE fall back to INSERT so the
// record still lands in CAMP — we never emit EDIT/UPDATE without a discrepancy id.
// The CAMP ref is carried on the OFF-LEDGER correlation table only (OQ9) — never written onto the
// immutable signed Defect/Deferral row.
export type PushIntent = 'CREATE' | 'CORRECT' | 'CLOSE';

export interface PushModeDecision {
  mode: IntegrateMode;
  status: 'Open' | 'Closed';
  existingDiscrepancyId?: string;
}

export function decidePushMode(intent: PushIntent, parentRef?: string): PushModeDecision {
  if (intent === 'CREATE') return { mode: 'INSERT', status: 'Open' };
  if (intent === 'CORRECT') {
    return parentRef
      ? { mode: 'EDIT', status: 'Open', existingDiscrepancyId: parentRef }
      : { mode: 'INSERT', status: 'Open' };
  }
  // CLOSE
  return parentRef
    ? { mode: 'UPDATE', status: 'Closed', existingDiscrepancyId: parentRef }
    : { mode: 'INSERT', status: 'Closed' };
}
