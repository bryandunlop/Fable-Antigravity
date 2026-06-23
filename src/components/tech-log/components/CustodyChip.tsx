import type { CustodyState } from '../engine/custody';

const LABEL: Record<CustodyState, string> = {
  IN_MAINTENANCE: 'In maintenance',
  OFFERED: 'Offered to crew',
  WITH_CREW: 'With crew',
};

// Custody axis (distinct from airworthiness R/A/G): gold = maintenance holds, daylight = crew holds.
const DOT: Record<CustodyState, string> = {
  IN_MAINTENANCE: 'gfo-dot-maint',
  OFFERED: 'gfo-dot-maint-offered',
  WITH_CREW: 'gfo-dot-crew',
};

export function CustodyChip({ state }: { state: CustodyState }) {
  return (
    <span className="gfo-chip">
      <span className={`gfo-chip-dot ${DOT[state]}`} />
      {LABEL[state]}
    </span>
  );
}
