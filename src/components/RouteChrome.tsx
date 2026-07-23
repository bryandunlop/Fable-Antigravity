// The two things a router does NOT do for you, applied once for every route
// (LG-19 / D37 Wave 1). Rendered inside the authenticated shell.
//
// 1. Scroll reset. React Router keeps the window scroll position across a
//    navigation, so leaving a long page halfway down opened the NEXT page halfway
//    down — verified live: /vacation-request at 396px → /aircraft opened at ~325px.
// 2. Tab title. Every route shared one static index.html title, so history, open
//    tabs, and bookmarks were indistinguishable.
//
// Both were app-wide gaps fixed in one place rather than per page, so new routes
// inherit the behaviour instead of having to remember it.
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { titleForPath } from '../navigation/documentTitle';
import { entriesForRoles } from '../navigation/navConfig';

interface RouteChromeProps {
  userRole: string;
  additionalRoles?: string[];
}

export default function RouteChrome({ userRole, additionalRoles = [] }: RouteChromeProps) {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = titleForPath(pathname, entriesForRoles(userRole, additionalRoles));
  }, [pathname, userRole, additionalRoles]);

  useEffect(() => {
    // 'instant' — an animated scroll races the route's enter transition and can be
    // cancelled by a user's own scroll mid-flight, leaving the page part-way down.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);

  return null;
}
