import React from 'react';
import { ChevronRight, Home, Wrench, BarChart3, AlertTriangle, Boxes } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Badge } from './ui/badge';

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  badge?: string;
}

const routeLabels: Record<string, string> = {
  '/': 'Home',
  '/aircraft': 'Aircraft Status',
  '/frat': 'FRAT Forms',
  '/frat/review': 'FRAT Review',
  '/frat/my-submissions': 'My FRAT Submissions',
  '/maintenance': 'Maintenance Board',
  '/maintenance-hub': 'Maintenance Hub',
  '/tech-log': 'Tech Log',
  '/work-orders': 'Work Orders',
  '/maintenance-dashboard': 'My Maintenance',
  '/tech-work-analytics': 'Work Analytics',
  '/mttr-dashboard': 'MTTR Dashboard',
  '/mel-cdl': 'MEL/CDL Management',
  '/turndown-reports': 'Turndown Reports',
  '/turndown-form': 'Turndown Form',
  '/parts-inventory': 'Parts Inventory',
  '/car-tracking': 'Car Tracking',
  '/airport-services': 'Airport Services',
  '/fuel-farm': 'Fuel Farm Tracker',
  '/passenger-database': 'Passenger Database',
  '/schedule': 'Schedule',
  '/documents': 'Documents',
  '/safety': 'Safety Dashboard',
  '/safety/hazards': 'Hazard Reporting',
  '/safety/audits': 'Internal Audits',
  '/safety/compliance': 'Document Compliance',
  '/safety/waivers': 'Waiver Management',
  '/catering-tracker': 'Catering Tracker',
  '/aircraft-inventory': 'Aircraft Inventory',
  '/post-flight-checklist': 'Post-Flight Checklist',
  '/scheduling-dashboard': 'Scheduling Dashboard',
  '/pilot-currency': 'Pilot Currency',
  '/passenger-forms': 'Passenger Forms',
  '/assigned-tasks': 'Assigned Tasks',
  '/aog-management': 'AOG Management',
  '/fuel-load-request': 'Fuel Load Request',
  '/airport-evaluations': 'Airport Evaluations',
  '/lead-dashboard': 'Lead Dashboard',
  '/admin': 'User Management',
  '/user-safety': 'Safety Participation'
};

const routeIcons: Record<string, React.ReactNode> = {
  '/maintenance-hub': <Wrench className="w-3 h-3" />,
  '/tech-log': <Wrench className="w-3 h-3" />,
  '/work-orders': <Wrench className="w-3 h-3" />,
  '/tech-work-analytics': <BarChart3 className="w-3 h-3" />,
  '/mttr-dashboard': <BarChart3 className="w-3 h-3" />,
  '/mel-cdl': <AlertTriangle className="w-3 h-3" />,
  '/parts-inventory': <Boxes className="w-3 h-3" />,
};

const routeCategories: Record<string, string> = {
  '/maintenance-hub': 'Maintenance',
  '/tech-log': 'Maintenance',
  '/work-orders': 'Maintenance',
  '/maintenance-dashboard': 'Maintenance',
  '/tech-work-analytics': 'Maintenance',
  '/mttr-dashboard': 'Maintenance',
  '/mel-cdl': 'Maintenance',
  '/turndown-reports': 'Maintenance',
  '/turndown-form': 'Maintenance',
  '/parts-inventory': 'Maintenance',
  '/car-tracking': 'Maintenance',
  '/airport-services': 'Maintenance',
  '/fuel-farm': 'Maintenance',
};

export default function BreadcrumbNav() {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);
  
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Home', href: '/' }
  ];

  // Build breadcrumb path with category if in maintenance section
  let currentPath = '';
  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const label = routeLabels[currentPath] || segment.charAt(0).toUpperCase() + segment.slice(1);
    const icon = routeIcons[currentPath];
    const category = routeCategories[currentPath];
    
    breadcrumbItems.push({
      label,
      href: index === pathSegments.length - 1 ? undefined : currentPath,
      icon,
      badge: category
    });
  });

  // Don't show breadcrumbs on home page
  if (location.pathname === '/') {
    return null;
  }

  const currentCategory = routeCategories[location.pathname];

  return (
    <nav className="flex items-center flex-wrap gap-x-1 gap-y-2 text-sm text-muted-foreground mb-4">
      {breadcrumbItems.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && <ChevronRight className="w-4 h-4 flex-shrink-0" />}
          {item.href ? (
            <Link 
              to={item.href} 
              className="hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              {index === 0 && <Home className="w-4 h-4" />}
              {item.icon}
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium flex items-center gap-1.5">
              {index === 0 && <Home className="w-4 h-4" />}
              {item.icon}
              {item.label}
              {currentCategory && (
                <Badge variant="outline" className="ml-1 text-xs">
                  {currentCategory}
                </Badge>
              )}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}