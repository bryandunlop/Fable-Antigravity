import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Badge } from './ui/badge';
import { 
  Home, 
  Plane, 
  Users, 
  Shield, 
  Menu,
  Calendar,
  Wrench,
  FileText,
  AlertTriangle,
  Utensils,
  BookOpen,
  Target,
  MessageSquare,
  Clock,
  Boxes,
  MapPin
} from 'lucide-react';

interface MobileBottomNavProps {
  userRole: string;
}

export default function MobileBottomNav({ userRole }: MobileBottomNavProps) {
  const location = useLocation();

  const getNavItems = () => {
    const baseItems = [
      { name: 'Home', href: '/', icon: Home },
      { name: 'Messages', href: '/flight-family', icon: MessageSquare },
      { name: 'Tasks', href: '/tasks-action-items', icon: Target },
    ];

    switch (userRole) {
      case 'pilot':
        return [
          ...baseItems,
          { name: 'Documents', href: '/document-management', icon: FileText },
          { name: 'Aircraft', href: '/aircraft', icon: Plane }
        ];
      
      case 'inflight':
        return [
          ...baseItems,
          { name: 'Calendar', href: '/upcoming-flights', icon: Calendar },
          { name: 'Passengers', href: '/passenger-database', icon: Users }
        ];
      
      case 'maintenance':
        return [
          ...baseItems,
          { name: 'Maintenance', href: '/maintenance', icon: Wrench },
          { name: 'Parts', href: '/parts-inventory', icon: Boxes }
        ];
      
      case 'safety':
        return [
          ...baseItems,
          { name: 'Documents', href: '/document-management', icon: FileText },
          { name: 'Safety', href: '/safety', icon: Shield },
          { name: 'Hazards', href: '/safety/hazards', icon: AlertTriangle }
        ];
      
      case 'document-manager':
        return [
          ...baseItems,
          { name: 'Documents', href: '/document-management', icon: FileText },
          { name: 'Center', href: '/documents', icon: Shield },
          { name: 'More', href: '#', icon: Menu }
        ];
      
      case 'admin-assistant':
        return [
          ...baseItems,
          { name: 'Documents', href: '/document-management', icon: FileText },
          { name: 'Trips', href: '/booking-profile', icon: BookOpen },
          { name: 'Passengers', href: '/passenger-database', icon: Users }
        ];
      
      case 'scheduling':
        return [
          ...baseItems,
          { name: 'Schedule', href: '/schedule', icon: Calendar },
          { name: 'Trip Coord', href: '/trip-coordination', icon: MapPin }
        ];
      
      default:
        return [
          ...baseItems,
          { name: 'Documents', href: '/document-management', icon: FileText },
          { name: 'Aircraft', href: '/aircraft', icon: Plane }
        ];
    }
  };

  const navItems = getNavItems();

  // Don't show on desktop
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border z-40">
      <div className="grid grid-cols-4 gap-1 px-2 py-2">
        {navItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg transition-colors ${
                isActive 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.name}</span>
              {isActive && (
                <div className="w-4 h-0.5 bg-primary rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}