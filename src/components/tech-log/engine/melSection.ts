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
 * Does this item carry a repair interval at all?
 *
 * Section One and Section Two both do and defer identically — Section Two is relief keyed by the
 * message the crew saw rather than by the box that failed, and nothing about the PL-25 clock
 * changes. NEF items carry none by design (D69): the program repairs them "at the earliest
 * opportunity", so there is no interval to start. They are still fully deferrable — placarded,
 * tracked, and clockless — which is `engine/nef.ts`.
 *
 * This is the predicate that decides whether the PL-25 math may run, nothing more. WHO may defer a
 * given item is `canDeferDefect` (the MEL's own `Flight Crew Deferral Item` column, TL-37).
 */
export function hasRepairInterval(item: Pick<MelItem, 'melSection' | 'category'>): boolean {
  return item.category !== null && item.category !== undefined;
}
