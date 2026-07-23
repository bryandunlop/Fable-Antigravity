// Pure role → tab mapping for the mobile bottom nav. H1: every "Documents"
// tab targets the real /documents hub — the legacy /document-management
// surface is a dead mock whose upload forms silently discard files.
import {
  Home,
  Plane,
  Users,
  Shield,
  Calendar,
  Wrench,
  FileText,
  AlertTriangle,
  BookOpen,
  Target,
  ClipboardCheck,
  Boxes,
  MapPin,
  type LucideIcon,
} from 'lucide-react';

export interface MobileNavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

// Every role mobileNavItemsForRole switches on. Kept beside the switch so the
// route audit in mobileNavItems.test.ts covers each one — an unaudited tab is
// how the /flight-family 404 survived on every phone.
export const MOBILE_NAV_ROLES = [
  'pilot', 'inflight', 'maintenance', 'safety',
  'document-manager', 'admin-assistant', 'scheduling',
] as const;

// MobileBottomNav renders navItems.slice(0, 4) — the fifth grid cell is the "More"
// sheet. Any tab a role defines beyond the fourth is silently dropped, which is how
// the safety role's Safety and Hazards tabs became invisible while Documents and
// Tasks took their slots. Tabs are therefore capped and ordered most-specific-first;
// everything else stays reachable through More. (LG-19 / D37 Wave 1)
export const MAX_VISIBLE_TABS = 4;

// LG-19: 'Messages' pointed at /flight-family, whose route is commented out in
// App.tsx — a permanent 404 tab on every phone, and worse, it consumed one of the
// four visible slots while the role's own last tab fell off the end. Removed: there
// is no messaging surface to re-point it at. That leaves two shared tabs plus two
// role tabs — exactly the four that render.
const BASE_ITEMS: MobileNavItem[] = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Tasks', href: '/tasks-action-items', icon: Target },
];

export function mobileNavItemsForRole(userRole: string): MobileNavItem[] {
  switch (userRole) {
    case 'pilot':
      return [
        ...BASE_ITEMS,
        { name: 'Documents', href: '/documents', icon: FileText },
        { name: 'Aircraft', href: '/aircraft', icon: Plane },
      ];

    case 'inflight':
      return [
        ...BASE_ITEMS,
        { name: 'Calendar', href: '/upcoming-flights', icon: Calendar },
        { name: 'Passengers', href: '/passenger-database', icon: Users },
      ];

    case 'maintenance':
      return [
        ...BASE_ITEMS,
        { name: 'Tech Log', href: '/tech-log', icon: Wrench },
        { name: 'Parts', href: '/parts-inventory', icon: Boxes },
      ];

    // Safety previously listed six tabs; only the first four render, so its two
    // most important surfaces (Safety, Hazards) never appeared. Documents drops to
    // the More sheet — a safety officer's own board outranks the document library.
    case 'safety':
      return [
        ...BASE_ITEMS,
        { name: 'Safety', href: '/safety', icon: Shield },
        { name: 'Hazards', href: '/safety/hazards', icon: AlertTriangle },
      ];

    case 'document-manager':
      return [...BASE_ITEMS, { name: 'Documents', href: '/documents', icon: FileText }];

    // Also over budget before, so Trips and Passengers never rendered; Documents
    // moves to More so the assistant's actual work surfaces are the visible ones.
    case 'admin-assistant':
      return [
        ...BASE_ITEMS,
        { name: 'Trips', href: '/booking-profile', icon: BookOpen },
        { name: 'Passengers', href: '/passenger-database', icon: Users },
      ];

    case 'scheduling':
      return [
        ...BASE_ITEMS,
        { name: 'Schedule', href: '/schedule', icon: Calendar },
        { name: 'Trip Coord', href: '/trip-coordination', icon: MapPin },
      ];

    default:
      return [
        ...BASE_ITEMS,
        { name: 'Documents', href: '/documents', icon: FileText },
        { name: 'Aircraft', href: '/aircraft', icon: Plane },
      ];
  }
}
