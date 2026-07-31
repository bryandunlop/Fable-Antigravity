import type { AircraftType, CasColor, MelItem, MelSection } from '../types';

/**
 * Section-aware reads over the MEL catalog (D70).
 *
 * The catalog now holds all three parts of the approved D195 MEL — Section One (LRU component
 * relief, keyed by ATA), Section Two (CAS Message Relief, keyed by the CAS message) and the NEF
 * Deferral List. They are one table because they are one document and a deferral cites whichever
 * item applies; the differences between them live here rather than being re-derived at each call
 * site.
 */

/** Absent `melSection` means Section One — every row that predates the field is Section One. */
export function sectionOf(item: Pick<MelItem, 'melSection'>): MelSection {
  return item.melSection ?? 'ONE';
}

/**
 * The advisory colour differs by flight deck: the G500 annunciates Cyan, the G650ER Blue. Read off
 * the two MELs (G650ER Section Two: 29 Blue, 0 Cyan; G500: 128 Cyan, 47 Amber, 1 White). The G800's
 * MEL is still provisional, so it inherits the G650ER's PlaneView-family palette until the real
 * document lands — flagged rather than assumed, see the G800 caveat in `fleet.ts`.
 */
export function casPaletteFor(type: AircraftType): CasColor[] {
  return type === 'G500'
    ? ['WHITE', 'CYAN', 'AMBER', 'RED']
    : ['WHITE', 'BLUE', 'AMBER', 'RED'];
}

/**
 * May a deferral be raised against this item **today**?
 *
 * Section One and Section Two both carry a repair category and defer identically — Section Two is
 * relief keyed by the message the crew saw rather than by the box that failed, and nothing about
 * the PL-25 clock changes.
 *
 * NEF is excluded, and the exclusion is the honest state of the build rather than a policy claim.
 * D69 rules that an NEF item is a **placarded deferral with no repair clock** — the program
 * requires an MEL placard visible to the flight crew and tracking "in the same manner as any other
 * MEL deferral", but gives no repair category, so there is no interval to start. That flow does not
 * exist yet. Letting an NEF item through the ordinary panel would either invent a category it does
 * not have or produce a deferral with no placard gate, and both are worse than not offering it: the
 * item can still be written up and tracked exactly as it is today. Remove this guard in the slice
 * that builds the NEF deferral, not before.
 */
export function isDeferrableToday(item: Pick<MelItem, 'melSection' | 'category'>): boolean {
  return sectionOf(item) !== 'NEF' && item.category !== null;
}

/** Why the picker is refusing an item, for the message shown beside it. */
export function undeferrableReason(item: Pick<MelItem, 'melSection' | 'category'>): string | null {
  if (isDeferrableToday(item)) return null;
  if (sectionOf(item) === 'NEF') {
    return 'NEF items are deferred under the operator’s NEF program, which myGFO does not yet run (D69). Track it as a defect for now.';
  }
  return 'This item carries no repair category, so no repair interval can be started.';
}
