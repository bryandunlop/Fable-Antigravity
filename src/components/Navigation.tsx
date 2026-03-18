import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from './ui/sidebar';
import NotificationCenter from './NotificationCenter';
import { ThemeToggle } from './ThemeToggle';
import BreadcrumbNav from './BreadcrumbNav';
import CommandPalette from './CommandPalette';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { TouchBackend } from 'react-dnd-touch-backend';
import {
  Home,
  Plane,
  ClipboardList,
  Wrench,
  Users,
  Settings,
  Calendar,
  FileText,
  BarChart3,
  LogOut,
  Building2,
  Clipboard,
  CalendarCheck,
  Fuel,
  Shield,
  AlertTriangle,
  Target,
  FileCheck,
  UserCheck,
  Utensils,
  Package,
  ClipboardCheck,
  MapPin,
  CheckSquare,
  AlertOctagon,
  Archive,
  User,
  Menu,
  PanelLeft,
  Search,
  Command,
  BookOpen,
  MessageSquare,
  Send,
  Clock,
  Boxes,
  Monitor,
  Activity,
  Sliders,
  Upload,
  Database,
  Sparkles,
  GripVertical,
  RotateCcw,
  Calculator,
  HardHat,
  ArrowRightLeft,
  HardDrive,
  Layers
} from 'lucide-react';


interface NavigationProps {
  userRole: string;
  additionalRoles?: string[];
  onLogout: () => void;
  children: React.ReactNode;
}

interface NavigationGroup {
  label: string;
  items: any[];
}

// Draggable navigation group component
const DraggableNavigationGroup = ({
  group,
  index,
  moveGroup,
  isCustomizing,
  location
}: {
  group: NavigationGroup;
  index: number;
  moveGroup: (dragIndex: number, hoverIndex: number) => void;
  isCustomizing: boolean;
  location: any;
}) => {
  const [{ isDragging }, drag, preview] = useDrag({
    type: 'navigation-group',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: isCustomizing,
  });

  const [, drop] = useDrop({
    accept: 'navigation-group',
    hover: (item: { index: number }) => {
      if (item.index !== index) {
        moveGroup(item.index, index);
        item.index = index;
      }
    },
    canDrop: () => isCustomizing,
  });

  return (
    <div
      ref={(node) => {
        if (isCustomizing) {
          drag(drop(node));
        }
      }}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      className={isCustomizing ? 'cursor-move' : ''}
    >
      <SidebarGroup>
        <SidebarGroupLabel className="flex items-center gap-2">
          {isCustomizing && <GripVertical className="w-4 h-4 text-muted-foreground" />}
          {group.label}
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;

              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive} className={`relative overflow-hidden group transition-all duration-300 ${isActive ? 'bg-primary text-primary-foreground font-medium shadow-sm' : 'text-muted-foreground bg-transparent'}`}>
                    <Link to={item.href} className="flex items-center gap-3 w-full relative">
                      {/* Hover Slide Background replaced with left edge bar per user request */}
                      {!isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0 bg-muted-foreground/50 rounded-r-full transition-all duration-200 group-hover:h-3/4" />}
                      <Icon className={`w-4 h-4 z-10 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'}`} />
                      <span className={`z-10 transition-colors duration-300 relative ${isActive ? '' : 'group-hover:text-foreground'}`}>{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </div>
  );
};

function NavigationContent({ userRole, additionalRoles = [], onLogout, children }: NavigationProps) {
  const location = useLocation();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd+K or Ctrl+K to open command palette
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setIsCommandPaletteOpen(true);
      }

      // Escape to close command palette
      if (event.key === 'Escape' && isCommandPaletteOpen) {
        setIsCommandPaletteOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen]);

  // Default navigation groups organized by category
  const defaultNavigationGroups = [
    {
      label: "Overview",
      items: [
        { name: 'Dashboard', href: '/', icon: Home, roles: ['pilot', 'inflight', 'admin', 'lead', 'safety', 'maintenance', 'scheduling', 'document-manager'] },
        { name: 'Settings', href: '/settings', icon: Settings, roles: ['pilot', 'inflight', 'admin', 'lead', 'safety', 'maintenance', 'scheduling', 'document-manager', 'admin-assistant'] },
        // { name: 'Flight Family', href: '/flight-family', icon: MessageSquare, roles: ['pilot', 'inflight', 'admin', 'lead', 'safety', 'maintenance', 'scheduling', 'document-manager', 'admin-assistant'] },
        { name: 'Procedural Bulletins', href: '/procedural-bulletins', icon: BookOpen, roles: ['pilot', 'inflight', 'admin', 'lead', 'safety', 'maintenance', 'scheduling', 'document-manager'] },
        // { name: 'Restaurant Database', href: '/restaurant-database', icon: Utensils, roles: ['pilot', 'inflight', 'maintenance', 'admin'] },
        { name: 'Tasks & Action Items', href: '/tasks-action-items', icon: Target, roles: ['pilot', 'inflight', 'admin', 'lead', 'safety', 'maintenance', 'scheduling'] },
        { name: 'AOG Management', href: '/aog-management', icon: AlertOctagon, roles: ['pilot', 'inflight', 'admin', 'lead', 'safety', 'maintenance', 'scheduling'] },
      ]
    },
    {
      label: "Flight Operations",
      items: [
        { name: 'Preflight Workflow', href: '/frat', icon: ClipboardList, roles: ['pilot', 'admin'] },
        { name: 'Standalone FRAT', href: '/frat/standalone', icon: Shield, roles: ['pilot', 'admin'] },
        { name: 'My FRAT Submissions', href: '/frat/my-submissions', icon: FileText, roles: ['pilot', 'admin'] },
        { name: 'Airport Evaluations', href: '/airport-evaluations', icon: MapPin, roles: ['pilot', 'admin'] },
        { name: 'Pilot Currency', href: '/pilot-currency', icon: UserCheck, roles: ['pilot', 'admin', 'lead'] },
        { name: 'Fuel Load Request', href: '/fuel-load-request', icon: Fuel, roles: ['pilot', 'admin'] },
      ]
    },
    {
      label: "ForeFlight Integration",
      items: [
        { name: 'ForeFlight Settings', href: '/foreflight-settings', icon: Settings, roles: ['admin'] },
        { name: 'Test Upload', href: '/foreflight-test-upload', icon: Upload, roles: ['admin'] },
        { name: 'Sync Diagnostics', href: '/foreflight-diagnostics', icon: Database, roles: ['admin'] },
      ]
    },
    {
      label: "Maintenance",
      items: [
        { name: 'Maintenance Hub', href: '/maintenance-hub', icon: Monitor, roles: ['maintenance', 'admin', 'lead'], description: 'Overview dashboard' },
        { name: 'Tech Log', href: '/tech-log', icon: FileText, roles: ['pilot', 'maintenance', 'admin'], description: 'Report squawks' },
        { name: 'Work Orders', href: '/work-orders', icon: ClipboardCheck, roles: ['maintenance', 'admin', 'lead'], description: 'Manage work orders' },
        { name: 'My Maintenance', href: '/maintenance-dashboard', icon: Clipboard, roles: ['maintenance'], description: 'Personal dashboard' },
        { name: 'Aircraft Cleaning', href: '/aircraft-cleaning', icon: Sparkles, roles: ['pilot', 'inflight', 'maintenance', 'admin', 'lead'], description: 'Track cleaning status' },
      ]
    },
    {
      label: "Maintenance Analytics",
      items: [
        { name: 'Work Analytics', href: '/tech-work-analytics', icon: BarChart3, roles: ['maintenance', 'admin', 'lead'] },
        { name: 'MTTR Dashboard', href: '/mttr-dashboard', icon: Activity, roles: ['maintenance', 'admin', 'lead'] },
      ]
    },
    {
      label: "Maintenance Compliance",
      items: [
        { name: 'MEL/CDL Management', href: '/mel-cdl', icon: AlertTriangle, roles: ['maintenance', 'admin', 'lead'] },
        { name: 'Turndown Reports', href: '/turndown-reports', icon: FileText, roles: ['maintenance', 'admin', 'lead'] },
        { name: 'Turndown Form', href: '/turndown-form', icon: ClipboardList, roles: ['maintenance'] },
      ]
    },
    {
      label: "Maintenance Resources",
      items: [
        { name: 'Parts Inventory', href: '/parts-inventory', icon: Boxes, roles: ['maintenance', 'admin', 'lead'] },
        { name: 'Car Tracking', href: '/car-tracking', icon: Package, roles: ['maintenance', 'admin', 'lead'] },
        { name: 'Airport Services', href: '/airport-services', icon: Building2, roles: ['maintenance', 'admin'] },
        { name: 'Fuel Farm Tracker', href: '/fuel-farm', icon: Fuel, roles: ['maintenance'] },
        { name: 'Maintenance Board', href: '/maintenance', icon: Wrench, roles: ['maintenance', 'admin', 'lead'] },
        { name: 'Standalone GRAT', href: '/grat/standalone', icon: Shield, roles: ['maintenance', 'admin', 'lead'] },
      ]
    },
    {
      label: "Safety",
      items: [
        { name: 'Safety Center', href: '/safety', icon: Shield, roles: ['pilot', 'inflight', 'maintenance', 'safety', 'admin', 'lead', 'scheduling', 'document-manager', 'admin-assistant'] },
        { name: 'My Safety Activity', href: '/safety?tab=my-activity', icon: UserCheck, roles: ['pilot', 'inflight', 'maintenance', 'safety', 'admin', 'lead', 'scheduling', 'document-manager', 'admin-assistant'] },
        { name: 'Report Hazard', href: '/safety?tab=hazards&action=new', icon: AlertTriangle, roles: ['pilot', 'inflight', 'maintenance', 'safety', 'admin', 'lead', 'scheduling', 'document-manager', 'admin-assistant'] },
      ]
    },
    {
      label: "Inflight Services",
      items: [
        { name: 'Upcoming Trips', href: '/upcoming-flights', icon: Calendar, roles: ['inflight', 'admin'] },
        { name: 'Flight Calendar', href: '/upcoming-flights', icon: Calendar, roles: ['pilot', 'admin'] },
        { name: 'Passenger Database', href: '/passenger-database', icon: Users, roles: ['inflight', 'admin'] },
        { name: 'Catering Tracker', href: '/catering-tracker', icon: Utensils, roles: ['inflight', 'admin'] },
        { name: 'Aircraft Inventory', href: '/aircraft-inventory', icon: Package, roles: ['inflight', 'admin'] },
        { name: 'Post-Flight Checklist', href: '/post-flight-checklist', icon: ClipboardCheck, roles: ['inflight', 'admin'] },
        { name: 'Aircraft Cleaning', href: '/aircraft-cleaning', icon: Sparkles, roles: ['inflight', 'admin'] },
      ]
    },
    {
      label: "Scheduling",
      items: [
        { name: 'Schedule Calendar', href: '/schedule', icon: Calendar, roles: ['pilot', 'admin'] },
        { name: 'Scheduling Dashboard', href: '/scheduling-dashboard', icon: Calendar, roles: ['scheduling', 'admin'] },
        { name: 'Trip Coordination', href: '/trip-coordination', icon: MapPin, roles: ['scheduling', 'admin'] },
        { name: 'Crew Management', href: '/crew-management', icon: Clock, roles: ['scheduling', 'admin', 'lead'] },
        { name: 'Crew Workload & Travel', href: '/crew-scheduling-workload', icon: BarChart3, roles: ['scheduling', 'admin', 'lead'] },
        { name: 'Trip Management', href: '/booking-profile', icon: BookOpen, roles: ['admin-assistant', 'admin', 'lead'] },
        { name: 'Itinerary Builder', href: '/itinerary-builder', icon: FileText, roles: ['admin-assistant', 'admin', 'lead'] },
        { name: 'Passenger Forms', href: '/passenger-forms', icon: FileText, roles: ['scheduling', 'admin'] },
        { name: 'Vacation Request', href: '/vacation-request', icon: CalendarCheck, roles: ['pilot', 'inflight', 'maintenance', 'admin', 'lead', 'scheduling'] },
      ]
    },
    {
      label: "Documents",
      items: [
        { name: 'Document Center', href: '/documents', icon: Archive, roles: ['pilot', 'inflight', 'admin', 'lead', 'safety', 'maintenance', 'scheduling', 'document-manager'] },
        { name: 'Document Management', href: '/document-management', icon: FileText, roles: ['document-manager'] },
        { name: 'Document Request', href: '/document-management', icon: Send, roles: ['pilot', 'inflight', 'admin', 'lead', 'safety', 'maintenance', 'scheduling'] },
        { name: 'Offline Documents', href: '/dms/offline', icon: HardDrive, roles: ['dms-manager', 'admin'] },
        { name: 'Document Library', href: '/documents', icon: Archive, roles: ['dms-manager'] },
      ]
    },
    {
      label: "AviaSync Workflow",
      items: [
        { name: 'AviaSync Dashboard', href: '/maintenance-workflow', icon: Monitor, roles: ['maintenance-workflow'] },
        { name: 'Electronic Tech Log', href: '/maintenance-workflow/tech-log', icon: ClipboardList, roles: ['maintenance-workflow'] },
        { name: 'MEL Management', href: '/maintenance-workflow/mel', icon: AlertTriangle, roles: ['maintenance-workflow'] },
        { name: 'Work Order Board', href: '/maintenance-workflow/work-orders', icon: Wrench, roles: ['maintenance-workflow'] },
        { name: 'Technician View', href: '/maintenance-workflow/technician', icon: HardHat, roles: ['maintenance-workflow'] },
        { name: 'Shift Handover', href: '/maintenance-workflow/handover', icon: ArrowRightLeft, roles: ['maintenance-workflow'] },
        { name: 'Predictive Analytics', href: '/maintenance-workflow/analytics', icon: BarChart3, roles: ['maintenance-workflow'] },
      ]
    },
    {
      label: "Tax Compliance",
      items: [
        { name: 'Tax Dashboard', href: '/tax-compliance', icon: Calculator, roles: ['tax', 'admin'] },
      ]
    },
    {
      label: "Management",
      items: [
        { name: 'Lead Dashboard', href: '/lead-dashboard', icon: BarChart3, roles: ['lead', 'admin'] },
        { name: 'Manager Insights', href: '/manager-insights', icon: Layers, roles: ['lead', 'admin'] },
        { name: 'Live Metrics', href: '/live-metrics', icon: Activity, roles: ['lead', 'admin'], description: 'Real-time operations KPIs' },
        { name: 'Critical Functions', href: '/critical-functions', icon: Shield, roles: ['lead', 'admin'] },
        { name: 'Airport Evaluation Officer', href: '/admin/airport-evaluation-officer', icon: MapPin, roles: ['airport-evaluator', 'admin'] },
        { name: 'Admin Panel', href: '/admin', icon: Settings, roles: ['admin'] },
      ]
    }
  ];

  // Load custom order from localStorage
  const loadCustomOrder = () => {
    const saved = localStorage.getItem(`nav-order-${userRole}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  // Initialize navigation groups with custom order if available
  const [navigationGroups, setNavigationGroups] = useState<NavigationGroup[]>(() => {
    const customOrder = loadCustomOrder();

    // Filter groups and items based on user role and additional roles
    const filtered = defaultNavigationGroups.map(group => ({
      ...group,
      items: group.items.filter(item => 
        item.roles.includes(userRole) || additionalRoles.some(role => item.roles.includes(role))
      )
    })).filter(group => group.items.length > 0);

    if (customOrder) {
      // Reorder based on saved order
      const orderedGroups: NavigationGroup[] = [];
      customOrder.forEach((label: string) => {
        const group = filtered.find(g => g.label === label);
        if (group) {
          orderedGroups.push(group);
        }
      });

      // Add any new groups that weren't in the saved order
      filtered.forEach(group => {
        if (!orderedGroups.find(g => g.label === group.label)) {
          orderedGroups.push(group);
        }
      });

      return orderedGroups;
    }

    return filtered;
  });

  // Save custom order to localStorage
  const saveCustomOrder = (groups: NavigationGroup[]) => {
    const order = groups.map(g => g.label);
    localStorage.setItem(`nav-order-${userRole}`, JSON.stringify(order));
  };

  // Move group in the list
  const moveGroup = (dragIndex: number, hoverIndex: number) => {
    const newGroups = [...navigationGroups];
    const [draggedGroup] = newGroups.splice(dragIndex, 1);
    newGroups.splice(hoverIndex, 0, draggedGroup);
    setNavigationGroups(newGroups);
  };

  // Save order when customization mode is turned off
  useEffect(() => {
    if (!isCustomizing) {
      saveCustomOrder(navigationGroups);
    }
  }, [isCustomizing, navigationGroups]);

  // Reset to default order
  const resetToDefault = () => {
    const filtered = defaultNavigationGroups.map(group => ({
      ...group,
      items: group.items.filter(item => 
        item.roles.includes(userRole) || additionalRoles.some(role => item.roles.includes(role))
      )
    })).filter(group => group.items.length > 0);

    setNavigationGroups(filtered);
    localStorage.removeItem(`nav-order-${userRole}`);
  };

  const getRoleDisplayName = (role: string) => {
    const roleMap: Record<string, string> = {
      'pilot': 'Pilot',
      'inflight': 'Inflight Crew',
      'maintenance': 'Maintenance',
      'scheduling': 'Scheduling',
      'safety': 'Safety',
      'document-manager': 'Document Manager',
      'admin-assistant': 'Administrative Assistant',
      'lead': 'Leadership',
      'admin': 'Administrator',
      'tax': 'Tax Analyst',
      'maintenance-workflow': 'Maintenance Workflow'
    };
    return roleMap[role] || role;
  };

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full overflow-x-hidden">
        <Sidebar className="border-r border-border/50 bg-card/90 backdrop-blur-xl">
          <SidebarHeader className="border-b border-white/5 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                  <Plane className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="font-bold text-foreground tracking-wide text-sm">P&G Flight Ops</h2>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{getRoleDisplayName(userRole)}</p>
                </div>
              </div>
              <div className="md:hidden">
                <ThemeToggle />
              </div>
            </div>

            {/* Customization controls */}
            <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
              <Button
                variant={isCustomizing ? "default" : "ghost"}
                size="sm"
                onClick={() => setIsCustomizing(!isCustomizing)}
                className="w-full text-xs justify-start text-slate-400 hover:text-white hover:bg-white/5"
              >
                <Settings className="w-3 h-3 mr-2" />
                {isCustomizing ? 'Done Customizing' : 'Customize Order'}
              </Button>

              {isCustomizing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetToDefault}
                  className="w-full text-xs justify-start text-slate-400 hover:text-white hover:bg-white/5"
                >
                  <RotateCcw className="w-3 h-3 mr-2" />
                  Reset to Default
                </Button>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="px-2 py-2">
            {isCustomizing && (
              <div className="p-3 mb-2 bg-[var(--color-pg-blue)]/20 border border-[var(--color-pg-blue)]/30 rounded-lg">
                <p className="text-xs text-[var(--color-pg-cyan)] flex items-center gap-2">
                  <GripVertical className="w-3 h-3" />
                  Drag sections to reorder
                </p>
              </div>
            )}

            {navigationGroups.map((group, index) => (
              <DraggableNavigationGroup
                key={group.label}
                group={group}
                index={index}
                moveGroup={moveGroup}
                isCustomizing={isCustomizing}
                location={location}
              />
            ))}
          </SidebarContent>
        </Sidebar>

        <div className="flex-1 flex flex-col relative min-w-0">
          {/* Enhanced top bar with notification center */}
          <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-2xl px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Large, prominent sidebar toggle */}
              <div className="flex items-center gap-3">
                <SidebarTrigger className="h-10 w-10 p-0 border border-border/50 bg-background/50 hover:bg-accent hover:text-accent-foreground text-foreground transition-all duration-200 shadow-sm rounded-lg">
                  <PanelLeft className="h-5 w-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </SidebarTrigger>
              </div>

              {/* Breadcrumbs / Page Title Placeholder */}
              <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                <span className="text-foreground font-medium">{getRoleDisplayName(userRole)} Workspace</span>
              </div>
            </div>

            {/* Right side with notifications and logout */}
            <div className="flex items-center gap-3">
              {/* Global Search Button */}
              <Button
                variant="ghost"
                onClick={() => setIsCommandPaletteOpen(true)}
                className="flex items-center gap-2 px-3 py-2 bg-background/50 border border-border/50 rounded-full text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-all w-64 justify-between group"
              >
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 group-hover:text-primary transition-colors" />
                  <span>Search system...</span>
                </div>
                <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border/50 bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </Button>

              {/* Notification Center */}
              <NotificationCenter userRole={userRole} />

              <ThemeToggle />

              {/* Logout button */}
              <Button
                variant="ghost"
                onClick={onLogout}
                className="flex items-center gap-2 px-3 py-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors rounded-full"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </header>

          {/* Main content area */}
          <main className="flex-1 overflow-auto p-6 pb-20 md:pb-6">
            <BreadcrumbNav />
            {children}
          </main>
        </div>

        {/* Command Palette */}
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          userRole={userRole}
        />
      </div>
    </SidebarProvider>
  );
}

export default function Navigation(props: NavigationProps) {
  return (
    <DndProvider backend={TouchBackend} options={{ enableMouseEvents: true }}>
      <NavigationContent {...props} />
    </DndProvider>
  );
}