// Per-view browser tab titles (LG-19 / D37 Wave 1).
//
// Every route showed the same static index.html title, so browser history, open
// tabs, and bookmarks were indistinguishable — you could not tell the tech log
// from the vacation planner without switching to the tab and looking.
//
// Titles are derived from the existing nav manifest rather than a second list, so
// a page renamed in the sidebar is renamed in the tab automatically, and a route
// added without a manifest entry falls back to the product name instead of lying.
import { matchEntry, type NavEntry } from './navConfig';

export const APP_NAME = 'Global Flight Operations';

/**
 * Tab title for a pathname: "<page> · Global Flight Operations".
 * Unknown paths get the bare product name.
 */
export function titleForPath(pathname: string, entries?: readonly NavEntry[]): string {
  // Role-scoped entries first, so role-variant labels win ("Upcoming Trips" vs
  // "Flight Calendar"). But a role can reach pages its own sidebar never lists —
  // a pilot opening /work-orders from a hub card — and those must still be named,
  // so fall back to the full manifest before giving up on a title.
  const entry = matchEntry(pathname, entries) ?? (entries ? matchEntry(pathname) : undefined);
  if (!entry) return APP_NAME;
  // The dashboard is the product's front page — no redundant "Dashboard · " prefix.
  if (entry.path === '/') return APP_NAME;
  return `${entry.label} · ${APP_NAME}`;
}
