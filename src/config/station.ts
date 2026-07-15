/**
 * The operator's home station.
 *
 * Single source of truth for the base ICAO. Before this existed, 'KLUK' was
 * independently hardcoded as a fallback in four places (the weather widget's
 * prop default, the dashboard's mount, the weather proxy's query default, and
 * the tech-log bridge) — four defaults that could silently disagree.
 *
 * Import this rather than adding a fifth.
 */
export const HOME_STATION = 'KLUK';
