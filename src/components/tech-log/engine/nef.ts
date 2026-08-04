import type { Deferral, MelItem } from '../types';
import { sectionOf } from './melSection';

/**
 * NEF deferrals (D69) — placarded, tracked, and deliberately clockless.
 *
 * The operator's NEF program requires an MEL placard visible to the flight crew and says NEF items
 * are "scheduled for repair and tracked in the same manner as any other MEL deferral", while giving
 * them **no repair category**: they are repaired "at the earliest opportunity". So an NEF deferral
 * goes through the same PENDING_PLACARD → ACTIVE gate as any other placarded deferral, and has no
 * due date, no usage threshold and no expiry.
 *
 * `isDeferralExpired` already returns false for a deferral with neither a due date nor a usage
 * threshold, so nothing had to be special-cased to stop an NEF deferral grounding an aircraft. That
 * is worth stating out loud: the clocklessness is a property of the DATA, not of a branch someone
 * could delete by accident.
 *
 * **Clockless is not invisible.** Bryan, 2026-07-31: no expiry and no grounding, but the deferral
 * shows how long it has been open and the oldest sort to the top, so "earliest opportunity" is
 * something a maintenance planner can actually act on rather than a phrase that lets an item sit
 * forever. That is what `openDays` and `byAgeDesc` are for.
 */

export function isNefItem(item: Pick<MelItem, 'melSection'>): boolean {
  return sectionOf(item) === 'NEF';
}

export function isNefDeferral(d: Pick<Deferral, 'nefProgram' | 'category'>): boolean {
  // `nefProgram` is snapshotted at signing. `category === null` is the corroborating shape, but the
  // flag is the claim — a deferral must still read as an NEF deferral if the MEL item is later
  // revised, which is the snapshot-into-the-signed-record rule.
  return d.nefProgram === true;
}

/** Whole days since the deferral was signed. Never negative; a same-day deferral reads 0. */
export function openDays(
  d: Pick<Deferral, 'clockStartDateUtc' | 'dayOfDiscoveryUtc'>,
  nowUtc: string,
): number {
  const from = new Date(d.dayOfDiscoveryUtc ?? d.clockStartDateUtc).getTime();
  const to = new Date(nowUtc).getTime();
  if (!Number.isFinite(from) || !Number.isFinite(to)) return 0;
  return Math.max(0, Math.floor((to - from) / 86_400_000));
}

/**
 * Oldest first. The whole answer to "earliest opportunity" for a class of deferral that will never
 * raise its hand by expiring — if nothing sorts them, the oldest NEF item is the one nobody sees.
 */
export function byAgeDesc<T extends Pick<Deferral, 'clockStartDateUtc' | 'dayOfDiscoveryUtc'>>(
  deferrals: T[],
  nowUtc: string,
): T[] {
  return [...deferrals].sort((a, b) => openDays(b, nowUtc) - openDays(a, nowUtc));
}

/** What to show where a repair category would otherwise go. */
export function repairIntervalLabel(d: Pick<Deferral, 'category' | 'nefProgram'>): string {
  if (isNefDeferral(d)) return 'NEF — no repair interval';
  return d.category ? `Cat ${d.category}` : 'no repair interval';
}
