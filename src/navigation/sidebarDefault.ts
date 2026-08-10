// Where the global nav rail starts, per D80.
//
// The shell is ONE component with three presentations by width:
//   >=1280  desktop / iPad landscape — rail EXPANDED by default (labels visible)
//   768-1279 iPad portrait          — rail COLLAPSED to icons by default
//   <768    phone                   — not this code's business; the Sidebar
//                                     renders as a Sheet driven by openMobile.
//
// The 1280 line is a product decision, not an ergonomic one: per D79 desktop
// carries the MAJORITY of roles and they are the browsing roles — a scheduler
// has no four memorised destinations the way a technician does, so hiding their
// map behind a hover is a regression for the users who are currently happiest.
// Bryan, 2026-08-08: "I dont think we should have more in the way for scheduling."
//
// iPad portrait (834) is the case D80 exists to fix: it used to render the full
// desktop rail (~460 of 834pt, ~55% of the screen) because shadcn's sidebar
// collapses only below md (768). See LG-198 and the 2026-08-08 UI/UX review R4.

/** At or above this width the rail starts expanded. Below it (but >=768), icons only. */
export const RAIL_EXPANDED_MIN_WIDTH = 1280;

/** localStorage key holding the user's explicit choice, once they've made one. */
export const SIDEBAR_STATE_KEY = 'nav-sidebar-open';

/**
 * The rail's starting state.
 *
 * An explicit user choice always wins — that is the whole point of persisting it,
 * and it must survive a reload on the width where the default disagrees (an iPad
 * user who expands the rail should not find it collapsed again next visit).
 * Anything other than the two known strings is treated as absent, so a corrupted
 * or hand-edited value falls back to the width default rather than throwing.
 */
export function initialSidebarOpen(
  viewportWidth: number,
  persisted: string | null,
): boolean {
  if (persisted === 'true') return true;
  if (persisted === 'false') return false;
  return viewportWidth >= RAIL_EXPANDED_MIN_WIDTH;
}

/** Read the persisted choice without letting a hostile/absent storage throw. */
export function readPersistedSidebarState(): string | null {
  try {
    return localStorage.getItem(SIDEBAR_STATE_KEY);
  } catch {
    return null;
  }
}

/** Record the user's explicit choice. Failure to persist must never break the nav. */
export function writePersistedSidebarState(open: boolean): void {
  try {
    localStorage.setItem(SIDEBAR_STATE_KEY, String(open));
  } catch {
    /* private mode / quota — the rail still works, it just won't be remembered */
  }
}
