import type { CasColor } from '../types';
import { cn } from '../../ui/utils';

/**
 * A defect's CAS annunciation (D57), rendered the way the crew saw it: a flight-deck annunciator —
 * squared dark tile, uppercase monospace glyph text in the CAS color.
 *
 * WHY IT LOOKS NOTHING LIKE THE OTHER CHIPS. D33 reserves amber for **airworthiness
 * serviceability**; `ServiceabilityChip` owns that language (rounded pill, tinted `status-*`
 * utility, sentence-case label). CAS color is a different axis entirely — it says what the crew
 * saw annunciated, not whether the aircraft may dispatch — and an AMBER CAS on a defect that is
 * deferred and dispatchable is an ordinary, non-contradictory state. Rendering it as a status
 * pill would read as "AMBER = MEL / restricted". The custody axis already lost a gold dot to
 * exactly this collision (`.gfo-dot-maint` in `index.css`); this is the same mistake avoided
 * up front. `casChip.test.tsx` asserts the two share no class.
 *
 * `casMessage`+`casColor` and `casObserved` are mutually exclusive on the record (enforced in
 * `casValueFor`); if a legacy row somehow carries both, the message wins — it is the more specific
 * claim. Renders nothing when there is no CAS aspect, so call sites need no conditional.
 */

const COLOR_CLASS: Record<CasColor, string> = {
  WHITE: 'cas-white',
  CYAN: 'cas-cyan',
  AMBER: 'cas-amber',
  RED: 'cas-red',
};

const COLOR_TITLE: Record<CasColor, string> = {
  WHITE: 'White CAS message',
  CYAN: 'Cyan CAS message',
  AMBER: 'Amber CAS message',
  RED: 'Red CAS message',
};

export function CasChip({ message, color, observed, className }: {
  message?: string;
  color?: CasColor;
  observed?: boolean;
  className?: string;
}) {
  if (message) {
    // A message with no color can only come from hand-written data — `casValueFor` never emits one.
    // Fall back to WHITE rather than the form's AMBER entry default: an under-specified record
    // should not be *displayed* as a caution it was never recorded as.
    const c = color ?? 'WHITE';
    return (
      <span data-testid="cas-chip" title={COLOR_TITLE[c]} className={cn('cas-tile', COLOR_CLASS[c], className)}>
        {message}
      </span>
    );
  }
  if (observed) {
    return (
      <span
        data-testid="cas-chip"
        title="Observed with no CAS annunciation"
        className={cn('cas-observed', className)}
      >
        OBSERVED
      </span>
    );
  }
  return null;
}
