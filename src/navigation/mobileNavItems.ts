// Pure role → tab mapping for the mobile bottom nav. This bar is phone-only
// (MobileBottomNav is md:hidden); iPad (≥768px) renders the full desktop sidebar,
// so the four-tab budget only bites for the phone-primary roles. Per Bryan
// (2026-07-24, D37 Wave-1 Q1): phone users are pilots, flight attendants
// (inflight), and maintenance — those three get hand-picked tab sets; every other
// role keeps the generic Home + Tasks + role default (their phone view is a
// fallback, they work on desktop).
// H1: every "Documents" tab targets the real /documents hub — the legacy
// /document-management surface is a dead mock whose upload forms silently discard
// files.
import {
  Home,
  Plane,
  Users,
  Shield,
  Calendar,
  FileText,
  AlertTriangle,
  BookOpen,
  Target,
  ClipboardCheck,
  ClipboardList,
  Fuel,
  Utensils,
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

// MobileBottomNav renders navItems.slice(0, MAX_VISIBLE_TABS) — the next grid cell
// is the "More" sheet. Any tab a role defines beyond the fourth is silently
// dropped, so every role's array is capped at four and ordered most-important-first;
// everything else stays reachable through More. (LG-19 / D37 Wave 1)
export const MAX_VISIBLE_TABS = 4;

// Tab labels are capped at ~7 characters. Five cells across a 375-390pt phone is
// ~75pt each, and the old set overprinted outright — "Dashboard" and "Workspace"
// literally touched. Shortening the LABEL only; every href is unchanged.
export const MAX_TAB_LABEL_CHARS = 7;

// Generic default for roles that are not phone-primary: Home + Tasks + two role
// tabs. The three phone-primary roles below override this with explicit sets.
const BASE_ITEMS: MobileNavItem[] = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Tasks', href: '/tasks-action-items', icon: Target },
];

export function mobileNavItemsForRole(userRole: string): MobileNavItem[] {
  switch (userRole) {
    // ── Phone-primary roles: explicit four tabs (Bryan, 2026-07-24, D37 Wave-1 Q1) ──
    case 'pilot':
      return [
        { name: 'Home', href: '/', icon: Home },
        { name: 'Flights', href: '/pilot-workspace', icon: ClipboardCheck },
        { name: 'Log', href: '/tech-log', icon: FileText },
        { name: 'Fuel', href: '/fuel-load-request', icon: Fuel },
      ];

    case 'inflight':
      return [
        { name: 'Home', href: '/', icon: Home },
        { name: 'Pax', href: '/passenger-database', icon: Users },
        { name: 'Trips', href: '/upcoming-flights', icon: Calendar },
        { name: 'Food', href: '/catering-tracker', icon: Utensils },
      ];

    // Maintenance drops Home/Tasks entirely — Bryan's four are all role work.
    case 'maintenance':
      return [
        { name: 'Log', href: '/tech-log', icon: FileText },
        { name: 'Turndn', href: '/turndown-form', icon: ClipboardList },
        { name: 'Fuel', href: '/fuel-farm', icon: Fuel },
        { name: 'GRAT', href: '/grat/standalone', icon: Shield },
      ];

    // ── Desktop-primary roles: generic Home + Tasks + role tabs ──
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
      return [...BASE_ITEMS, { name: 'Docs', href: '/documents', icon: FileText }];

    // Also over budget before, so Trips and Passengers never rendered; Documents
    // moves to More so the assistant's actual work surfaces are the visible ones.
    case 'admin-assistant':
      return [
        ...BASE_ITEMS,
        { name: 'Trips', href: '/booking-profile', icon: BookOpen },
        { name: 'Pax', href: '/passenger-database', icon: Users },
      ];

    case 'scheduling':
      return [
        ...BASE_ITEMS,
        { name: 'Sched', href: '/schedule', icon: Calendar },
        { name: 'Trips', href: '/trip-coordination', icon: MapPin },
      ];

    default:
      return [
        ...BASE_ITEMS,
        { name: 'Docs', href: '/documents', icon: FileText },
        { name: 'Fleet', href: '/aircraft', icon: Plane },
      ];
  }
}
