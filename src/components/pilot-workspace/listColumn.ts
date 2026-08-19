// Where the flight-list column starts, per D84.
//
// The pilot workspace is a split view: My Flights is a permanent ~320pt column beside the trip,
// because pilots hold several trips at once and scanning must not cost a route change. That column
// has to be able to get out of the way, so it collapses to a 72pt tail strip rather than vanishing
// — switching trip stays one tap either way.
//
// The width rule mirrors the global nav rail (navigation/sidebarDefault.ts) and exists for the same
// reason: on iPad PORTRAIT (834) the 64pt rail plus a 320pt list leaves 450pt for the work itself,
// which is not enough to hold the prep matrix or the day-of queue. Landscape (1194) has room.
//
// Deliberately a separate threshold from RAIL_EXPANDED_MIN_WIDTH (1280) rather than a reuse: the
// rail's line is a product decision about browsing roles, this one is arithmetic about a pane.
// Tying them together would mean a future change to one silently moved the other.

/** At or above this width the flight list starts expanded. Below it, the 72pt tail strip. */
export const LIST_EXPANDED_MIN_WIDTH = 1024;

/** localStorage key holding the pilot's explicit choice, once they have made one. */
export const LIST_STATE_KEY = 'pilot-flight-list-open';

/**
 * The column's starting state.
 *
 * An explicit choice always wins — a pilot who expanded the list on an iPad in portrait should not
 * find it collapsed again next visit. Anything other than the two known strings is treated as
 * absent, so a corrupted or hand-edited value falls back to the width default rather than throwing.
 */
export function initialListExpanded(viewportWidth: number, persisted: string | null): boolean {
  if (persisted === 'true') return true;
  if (persisted === 'false') return false;
  return viewportWidth >= LIST_EXPANDED_MIN_WIDTH;
}

/** Read the persisted choice without letting a hostile/absent storage throw into render. */
export function readPersistedListState(): string | null {
  try {
    return localStorage.getItem(LIST_STATE_KEY);
  } catch {
    return null;
  }
}

/** Record the pilot's explicit choice. Failure to persist must never break the workspace. */
export function writePersistedListState(expanded: boolean): void {
  try {
    localStorage.setItem(LIST_STATE_KEY, String(expanded));
  } catch {
    /* private mode / quota — the column still works, it just will not be remembered */
  }
}
