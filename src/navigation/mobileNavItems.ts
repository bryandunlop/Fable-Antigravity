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
  MessageSquare,
  Boxes,
  MapPin,
  type LucideIcon,
} from 'lucide-react';

export interface MobileNavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

const BASE_ITEMS: MobileNavItem[] = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Messages', href: '/flight-family', icon: MessageSquare },
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

    case 'safety':
      return [
        ...BASE_ITEMS,
        { name: 'Documents', href: '/documents', icon: FileText },
        { name: 'Safety', href: '/safety', icon: Shield },
        { name: 'Hazards', href: '/safety/hazards', icon: AlertTriangle },
      ];

    case 'document-manager':
      return [...BASE_ITEMS, { name: 'Documents', href: '/documents', icon: FileText }];

    case 'admin-assistant':
      return [
        ...BASE_ITEMS,
        { name: 'Documents', href: '/documents', icon: FileText },
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
