// D75 / LG-183 — the cabin shelf's section vocabulary, as EDITABLE STATE rather than a constant.
//
// Sections are pure vocabulary: nothing in the system keys on the strings, they are just
// `Doc.category` values. That is exactly why they can be user-owned while fleet type cannot —
// `AircraftType` is load-bearing for MEL items, serviceability and checklists, so the cabin form
// DERIVES it from the fleet (`useFleetTypes`) instead of offering an editor for it.
//
// Everything here is pure. The reducer owns persistence and the role gate; these functions own
// the rules — chiefly that a rename must carry the entries with it, and that a section holding
// entries cannot be deleted out from under them.
import type { Doc, DocumentsState } from '../types';
import { CABIN_SECTIONS } from '../classes';
import { hasAnyRole } from '../classes';

export const CABIN_KNOWLEDGE_CLASS_ID = 'cabin-knowledge';

/**
 * Who may change the vocabulary. Bryan's list (2026-08-03): lead FA, FA manager, scheduling
 * manager, admin. Deliberately NARROWER than who may write an entry — anyone in the cabin crew
 * can author, but renaming a section reshapes the shelf for everyone.
 */
export const CABIN_SECTION_MANAGER_ROLES = ['lead-fa', 'fa-manager', 'scheduling-manager', 'admin'];

export function canManageCabinSections(userRoles: string | string[]): boolean {
  return hasAnyRole(CABIN_SECTION_MANAGER_ROLES, userRoles);
}

/** The live list: what the user has set, or the shipped default when they never have.
 *  `undefined` means "never edited" and is not the same as `[]`, which would be a deliberate
 *  (and rejected — see `validateCabinSections`) empty shelf. */
export function cabinSections(state: Pick<DocumentsState, 'cabinSections'>): string[] {
  return state.cabinSections?.length ? state.cabinSections : [...CABIN_SECTIONS];
}

export function validateCabinSections(next: string[]): { ok: boolean; error?: string } {
  const trimmed = next.map((s) => s.trim());
  if (trimmed.some((s) => !s)) return { ok: false, error: 'A section needs a name.' };
  if (trimmed.length === 0) return { ok: false, error: 'Keep at least one section — entries have to live somewhere.' };
  const seen = new Set<string>();
  for (const s of trimmed) {
    const key = s.toLowerCase();
    if (seen.has(key)) return { ok: false, error: `"${s}" is listed twice.` };
    seen.add(key);
  }
  return { ok: true };
}

/** Cabin entries currently filed under a section. Drives both the delete guard and the
 *  "3 entries" count the manage dialog shows before anyone commits to a change. */
export function docsInCabinSection(docs: Doc[], section: string): Doc[] {
  return docs.filter((d) => d.classId === CABIN_KNOWLEDGE_CLASS_ID && d.category === section);
}

/**
 * Apply a new vocabulary, carrying entries across renames.
 *
 * `renames` maps old name → new name. This is the load-bearing part: a rename that did not move
 * its entries would strand them on a category the picker no longer offers, which is precisely the
 * failure D64's ship-note migration had to clean up after. Handled here rather than left to the
 * caller so the rule cannot be forgotten at one call site.
 *
 * A section that disappears WITHOUT a rename is a delete; the reducer refuses it while entries
 * remain (see `docsInCabinSection`), so nothing is ever orphaned by this function.
 */
export function applyCabinSections(
  state: DocumentsState,
  next: string[],
  renames: Record<string, string>,
): DocumentsState {
  const trimmed = next.map((s) => s.trim());
  const moved = Object.keys(renames).length
    ? state.docs.map((d) =>
        d.classId === CABIN_KNOWLEDGE_CLASS_ID && renames[d.category]
          ? { ...d, category: renames[d.category] }
          : d,
      )
    : state.docs;
  return { ...state, cabinSections: trimmed, docs: moved };
}
