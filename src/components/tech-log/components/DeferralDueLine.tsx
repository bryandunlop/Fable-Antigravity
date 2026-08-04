import { Clock } from 'lucide-react';
import { DeferralClock } from './DeferralClock';
import { readDeferralClock } from '../engine/deferralClock';
import type { MelCategory } from '../types';
import { cn } from '../../ui/utils';

/**
 * The one way a deferral's repair clock is stated on a list surface.
 *
 * LG-155: `DeferralClock` — the draining ring ratified in D31 — shipped rendering on a
 * single surface, the FleetStatus tile, and only for the nearest-due deferral. The
 * Deferrals list, the aircraft Deferrals tab, the maintenance work queue and Ramp mode
 * each date-diffed `repairDueDateUtc` inline into "· 3d left" instead. Time-to-ground is
 * the number this module exists to surface; it was being spelled four different ways and
 * drawn on one screen.
 *
 * Division of labour, deliberately: the RING owns remaining time (it has the tone
 * thresholds and it ticks), the TEXT owns the due date. Stating both would print the
 * remaining time twice — pinned by a test.
 *
 * `dueLabel` arrives pre-formatted rather than being computed here. Zone resolution is
 * per-surface (`displayZone` on the list pages, `'GOVERNING'` in Ramp mode) and belongs
 * with the caller that knows which zone applies; this component must not become a second
 * place that decides how a regulatory date reads.
 *
 * Nothing here is authoritative. Expiry is server-derived (see CLAUDE.md); a ring a
 * minute ahead of the server is fine because it gates nothing.
 */
export function DeferralDueLine({
  clockStartUtc,
  repairDueUtc,
  category,
  dueLabel,
  extended = false,
  className,
}: {
  clockStartUtc: string;
  /** Undefined for usage-based deferrals — there is no calendar span to drain. */
  repairDueUtc?: string;
  /**
   * Null for a clockless deferral (D69's NEF items): no repair category, so no interval to
   * drain and no ring to draw. `DeferralClock` one layer down already treats an absent
   * category this way — this signature was the only thing that had not caught up.
   */
  category: MelCategory | null;
  /** Already zone-resolved by the caller, e.g. `due 04 Aug`. */
  dueLabel: string;
  extended?: boolean;
  className?: string;
}) {
  // Ask the same engine the ring asks, so the fallback triggers exactly when the ring
  // would render nothing — rather than inferring it from `repairDueUtc` being absent and
  // silently dropping the line for an unparseable date.
  const hasRing = category !== null && readDeferralClock(clockStartUtc, repairDueUtc, Date.now(), category) !== null;

  return (
    <div className={cn('mt-1 inline-flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground', className)}>
      {hasRing ? (
        <DeferralClock clockStartUtc={clockStartUtc} repairDueUtc={repairDueUtc} category={category} />
      ) : (
        <Clock className="h-3.5 w-3.5 shrink-0" />
      )}
      {hasRing && <span aria-hidden="true">·</span>}
      <span className="whitespace-nowrap">{dueLabel}</span>
      {extended && (
        <>
          <span aria-hidden="true">·</span>
          <span className="whitespace-nowrap">extended</span>
        </>
      )}
    </div>
  );
}
