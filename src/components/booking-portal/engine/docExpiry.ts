// Travel-document evaluation — the design's three states, evaluated against
// TRAVEL DATES, never "today" (portal-design.md, locked decisions):
//   expires before or during travel            → BLOCK, state the reason
//   expires within 6 months after last travel  → FLAG, still bookable
//   otherwise                                  → VALID
// Some destinations require 6 months' validity beyond entry; callers can pass
// requireSixMonths to promote the flag window into a block (open decision — the
// per-country table is scheduling's input, not modelled in the demo).

import type { DocVerdict } from '../types';

const MS_PER_DAY = 86_400_000;
const SIX_MONTHS_DAYS = 182;

export function evaluateDoc(
  expiresIso: string,
  travelStartIso: string,
  travelEndIso: string,
  opts?: { requireSixMonths?: boolean },
): DocVerdict {
  const expires = Date.parse(expiresIso);
  const travelEnd = Date.parse(travelEndIso);
  const travelStart = Date.parse(travelStartIso);
  if (Number.isNaN(expires) || Number.isNaN(travelEnd) || Number.isNaN(travelStart)) {
    // A document we cannot evaluate must not silently pass — same posture as the
    // adapter's park-don't-fabricate rule.
    return 'block';
  }
  if (expires < travelEnd || expires < travelStart) return 'block';
  const daysAfterTravel = Math.floor((expires - travelEnd) / MS_PER_DAY);
  if (daysAfterTravel < SIX_MONTHS_DAYS) {
    return opts?.requireSixMonths ? 'block' : 'flag';
  }
  return 'valid';
}
