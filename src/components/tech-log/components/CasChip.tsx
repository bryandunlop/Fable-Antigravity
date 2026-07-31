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
 *
 * **The tier is never carried by hue alone.** Around 8% of men have a colour-vision deficiency, and
 * on a chip whose whole job is "which tier did the crew see" that would put the payload in the one
 * channel a red-green deficient reader cannot resolve — AMBER and RED are exactly the pair at risk.
 * So every tile also names its tier in visually-hidden text (announced by assistive tech, invisible
 * on screen), and the two act-now tiers carry a leading shape as well. Both are additions *inside*
 * the tile: the annunciator geometry, fill, mono face and uppercase transform are unchanged, since
 * that distinctness from `ServiceabilityChip` is what keeps the two axes from being confused.
 */

const COLOR_CLASS: Record<CasColor, string> = {
  WHITE: 'cas-white',
  BLUE: 'cas-blue',
  CYAN: 'cas-cyan',
  AMBER: 'cas-amber',
  RED: 'cas-red',
};

/** What assistive tech announces. BLUE and CYAN name the same **Advisory** tier on two different
 *  flight decks (D70), so both say the tier outright — the colour word alone would imply a
 *  difference in urgency between the two fleets that does not exist. */
const COLOR_TITLE: Record<CasColor, string> = {
  WHITE: 'White CAS message — status',
  BLUE: 'Blue CAS message — advisory',
  CYAN: 'Cyan CAS message — advisory',
  AMBER: 'Amber CAS message — caution',
  RED: 'Red CAS message — warning',
};

/** A shape for the two tiers that mean "act now" — warning triangle, caution dot. Deliberately none
 *  for WHITE/BLUE/CYAN: a mark on every tile marks nothing, and advisory tiers carry no urgency to
 *  encode. Decorative to assistive tech; `COLOR_TITLE` is what gets announced. */
const TIER_GLYPH: Partial<Record<CasColor, string>> = {
  RED: '▲',
  AMBER: '●',
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
    const glyph = TIER_GLYPH[c];
    return (
      <span data-testid="cas-chip" title={COLOR_TITLE[c]} className={cn('cas-tile', COLOR_CLASS[c], className)}>
        {glyph && <span data-testid="cas-glyph" aria-hidden="true" className="mr-1">{glyph}</span>}
        <span className="sr-only">{COLOR_TITLE[c]}: </span>
        {message}
      </span>
    );
  }
  if (observed) {
    // "NO CAS", not "OBSERVED": in a run like `ATA 21 · DEFERRED · OBSERVED` the bare word reads as
    // a triage state — someone has looked at this — rather than a fact about the annunciation. The
    // meaning used to live only in the `title`, which never fires on the Capacitor touch build.
    return (
      <span
        data-testid="cas-chip"
        title="Observed with no CAS annunciation"
        className={cn('cas-observed', className)}
      >
        NO CAS
      </span>
    );
  }
  return null;
}
