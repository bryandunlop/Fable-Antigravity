import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../ui/utils';

// One nav destination, four tabs (Bryan, 2026-08-08). The four airport surfaces
// used to be four sidebar rows carrying four identical MapPin icons — an
// airport-evaluator's ENTIRE nav was four indistinguishable pins, and a pilot
// paid four of their eighteen slots for one workflow.
//
// The routes are deliberately unchanged: /airport-evaluations/{worklist,review,
// flags} keep their own paths, their own ProtectedRoute gates and their ⌘K
// entries. Only the sidebar link is withdrawn (navConfig `sidebar: false`), per
// this repo's rule that hidden means render no link — it does not mean unknown
// to the system. So every existing deep link and bookmark still resolves.
//
// Tab grammar matches TechLogShell's primary strip (underlined border-b-2)
// rather than adding a third one — UX Workflow Pass 2026-08-08 §W7 asks for one
// grammar per screen.

interface AirportTab {
  to: string;
  label: string;
  /** Officer-workflow tabs are hidden from crews who cannot open the route. */
  officerOnly?: boolean;
}

const TABS: AirportTab[] = [
  { to: '/airport-evaluations', label: 'Directory' },
  { to: '/airport-evaluations/worklist', label: 'Needs review', officerOnly: true },
  { to: '/airport-evaluations/review', label: 'Proposals', officerOnly: true },
  { to: '/airport-evaluations/flags', label: 'Rules & flags', officerOnly: true },
];

/**
 * The roles that may open the officer routes. Exported so App.tsx's
 * ProtectedRoute lists import it rather than re-declaring the same literal —
 * duplicated, the tab strip could offer a tab the route gate then refuses.
 * The gate is still the enforcement; this only keeps the two in agreement.
 */
export const OFFICER_ROLES = ['airport-evaluator', 'chief-pilot', 'admin'];

export function airportTabsForRoles(userRole: string, additionalRoles: string[] = []): AirportTab[] {
  const isOfficer = [userRole, ...additionalRoles].some((r) => OFFICER_ROLES.includes(r));
  return TABS.filter((t) => !t.officerOnly || isOfficer);
}

/**
 * Which tab owns this path — longest-prefix, so a detail route beneath a tab
 * keeps that tab lit rather than falling back to Directory (the shortest path,
 * which would otherwise claim the whole subtree).
 *
 * Resolved against ALL tabs and only then filtered to the visible set: matching
 * within the visible set alone would light Directory on an officer-only route,
 * pointing at the wrong tab for the page actually on screen.
 */
export function activeAirportTab(pathname: string, tabs: AirportTab[]): string | undefined {
  let best: AirportTab | undefined;
  for (const t of TABS) {
    if (pathname === t.to || pathname.startsWith(`${t.to}/`)) {
      if (!best || t.to.length > best.to.length) best = t;
    }
  }
  return best && tabs.some((t) => t.to === best!.to) ? best.to : undefined;
}

interface AirportsShellProps {
  userRole: string;
  additionalRoles?: string[];
  children: React.ReactNode;
}

export default function AirportsShell({ userRole, additionalRoles = [], children }: AirportsShellProps) {
  const { pathname } = useLocation();
  const tabs = airportTabsForRoles(userRole, additionalRoles);
  const active = activeAirportTab(pathname, tabs);

  // A crew member sees exactly one tab; a strip of one is noise, not wayfinding.
  const showTabs = tabs.length > 1;

  return (
    <div>
      {showTabs && (
        <div className="mb-4 flex flex-wrap gap-1 border-b" role="navigation" aria-label="Airports sections">
          {tabs.map((t) => {
            const isActive = active === t.to;
            return (
              <Link
                key={t.to}
                to={t.to}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'border-primary font-medium text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      )}
      {children}
    </div>
  );
}
