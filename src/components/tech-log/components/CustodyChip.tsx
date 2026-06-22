import type { CustodyState } from '../engine/custody';

const LABEL: Record<CustodyState, string> = {
  IN_MAINTENANCE: 'In maintenance',
  OFFERED: 'Offered to crew',
  WITH_CREW: 'With crew',
};

// Amber = maintenance holds, blue = crew holds (matches design §E).
const CLASS: Record<CustodyState, string> = {
  IN_MAINTENANCE: 'border-amber-300 bg-amber-100 text-amber-900',
  OFFERED: 'border-amber-200 bg-amber-50 text-amber-800',
  WITH_CREW: 'border-blue-300 bg-blue-100 text-blue-900',
};

export function CustodyChip({ state }: { state: CustodyState }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${CLASS[state]}`}>
      {LABEL[state]}
    </span>
  );
}
