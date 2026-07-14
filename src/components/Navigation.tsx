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
  Settings,
  FileText,
  LogOut,
  PanelLeft,
  Search,
  GripVertical,
  RotateCcw,
} from 'lucide-react';
import {
  domainsForRole, entriesForRoles, matchEntry,
  type NavEntry,
} from '../navigation/navConfig';

// Above this many visible items, a role's sidebar is dense enough that quiet
// (non-interactive) domain labels earn their keep as scroll anchors. Below it,
// domain grouping is pure overhead — real data: admin=53 clears this, the next
// largest role (lead=18) doesn't. See docs/superpowers/specs/2026-07-10-nav-flatten-design.md.
const DENSE_ROLE_ITEM_THRESHOLD = 30;


interface NavigationProps {
  userRole: string;
  additionalRoles?: string[];
  onLogout: () => void;
  children: React.ReactNode;
}

// Sidebar model: one domain per group, derived from the route manifest.
// Everything the role can see is always visible — no collapse, no "More".
interface NavigationGroup {
  label: string;
  items: NavEntry[];
}

// Draggable navigation group component — one manifest domain per group.
const DraggableNavigationGroup = ({
  group,
  index,
  moveGroup,
  isCustomizing,
  location,
  activePath,
  showLabel,
}: {
  group: NavigationGroup;
  index: number;
  moveGroup: (dragIndex: number, hoverIndex: number) => void;
  isCustomizing: boolean;
  location: { pathname: string; search: string };
  activePath: string | undefined;
  showLabel: boolean;
}) => {
  const [{ isDragging }, drag] = useDrag({
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

  const isActiveEntry = (e: NavEntry) => {
    if (activePath !== e.path) return false;
    // Query-link variants (e.g. My Safety Activity) are active only on their query.
    if (e.href && e.href.includes('?')) return `${location.pathname}${location.search}` === e.href;
    return true;
  };

  const renderEntry = (item: NavEntry) => {
    const Icon = item.icon ?? FileText;
    const isActive = isActiveEntry(item);
    return (
      <SidebarMenuItem key={`${item.domain}:${item.label}`}>
        <SidebarMenuButton asChild isActive={isActive} className={`relative overflow-hidden group transition-colors duration-200 ${isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold' : 'text-sidebar-foreground bg-transparent hover:bg-white/10 hover:text-white'}`}>
          <Link to={item.href ?? item.path} className="flex items-center gap-3 w-full relative">
            {isActive && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gfo-sunrise" />}
            {!isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0 bg-white/40 rounded-r-full transition-all duration-200 group-hover:h-3/4" />}
            <Icon className={`w-4 h-4 z-10 ${isActive ? 'text-sidebar-accent-foreground' : 'text-sidebar-foreground group-hover:text-white'}`} />
            <span className="z-10 relative">{item.label}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

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
        {/* Quiet, non-interactive — a scroll anchor for dense roles (or while
            customizing, so there's something to grab), never a click target.
            Narrow roles never render this at all: their items just run flat. */}
        {showLabel && (
          <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-[0.16em] text-gfo-sunrise">
            <div className="flex w-full items-center gap-2">
              {isCustomizing && <GripVertical className="w-4 h-4 text-gfo-sunrise/70" />}
              <span className="flex-1 text-left">{group.label}</span>
            </div>
          </SidebarGroupLabel>
        )}
        <SidebarGroupContent>
          <SidebarMenu>
            {group.items.map(renderEntry)}
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
  const [customOrderKeys, setCustomOrderKeys] = useState<string[] | null>(loadCustomOrder);

  // The role's visible manifest entries — drives the active trail.
  const visibleEntries = React.useMemo(
    () => entriesForRoles(userRole, additionalRoles),
    [userRole, additionalRoles],
  );
  const activePath = matchEntry(location.pathname, visibleEntries)?.path;

  const navigationGroups = React.useMemo(() => {
    // One group per manifest domain, filtered to the user's roles. Primary and
    // "More" entries are merged into one visible list — primary items lead,
    // since that ordering was already curated; nothing is ever hidden.
    const filtered: NavigationGroup[] = domainsForRole(userRole, additionalRoles).map((d) => ({
      label: d.label,
      items: [...d.primary, ...d.more],
    }));

    if (customOrderKeys) {
      // Reorder based on saved order
      const orderedGroups: NavigationGroup[] = [];
      customOrderKeys.forEach((label: string) => {
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
  }, [userRole, additionalRoles, customOrderKeys]);

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
    setCustomOrderKeys(newGroups.map(g => g.label));
  };

  // Save order when customization mode is turned off
  useEffect(() => {
    if (!isCustomizing) {
      saveCustomOrder(navigationGroups);
    }
  }, [isCustomizing, navigationGroups]);

  // Reset to default order
  const resetToDefault = () => {
    setCustomOrderKeys(null);
    localStorage.removeItem(`nav-order-${userRole}`);
  };

  // Quiet domain labels earn their keep only for dense roles, or while
  // customizing (you need something to grab). Otherwise the sidebar is one
  // flat, always-visible list — see DENSE_ROLE_ITEM_THRESHOLD above.
  const totalVisibleItems = navigationGroups.reduce((sum, g) => sum + g.items.length, 0);
  const showLabels = isCustomizing || totalVisibleItems > DENSE_ROLE_ITEM_THRESHOLD;

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
        <Sidebar className="border-r border-sidebar-border">
          <SidebarHeader className="border-b border-white/5 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col gap-1.5">
                <h2 className="text-base font-bold tracking-tight text-white">Global Flight Operations</h2>
                <p className="text-[10px] uppercase tracking-[0.16em] text-gfo-sunrise font-bold">{getRoleDisplayName(userRole)}</p>
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
                className="w-full text-xs justify-start text-sidebar-foreground hover:text-white hover:bg-white/10"
              >
                <Settings className="w-3 h-3 mr-2" />
                {isCustomizing ? 'Done Customizing' : 'Customize Order'}
              </Button>

              {isCustomizing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetToDefault}
                  className="w-full text-xs justify-start text-sidebar-foreground hover:text-white hover:bg-white/10"
                >
                  <RotateCcw className="w-3 h-3 mr-2" />
                  Reset to Default
                </Button>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="px-2 py-2">
            {isCustomizing && (
              <div className="p-3 mb-2 bg-white/10 border border-white/20 rounded-lg">
                <p className="text-xs text-gfo-daylight-light flex items-center gap-2">
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
                activePath={activePath}
                showLabel={showLabels}
              />
            ))}
          </SidebarContent>
        </Sidebar>

        <div className="flex-1 flex flex-col relative min-w-0">
          {/* Enhanced top bar with notification center */}
          <header className="sticky top-0 z-40 border-b border-border bg-card px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Large, prominent sidebar toggle */}
              <div className="flex items-center gap-3">
                <SidebarTrigger className="h-10 w-10 p-0 border border-border bg-card hover:bg-accent hover:text-accent-foreground text-foreground transition-all duration-200 shadow-sm rounded-lg">
                  <PanelLeft className="h-5 w-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </SidebarTrigger>
              </div>

              {/* Breadcrumbs / Page Title Placeholder */}
              <div className="hidden md:flex flex-col">
                <span className="gfo-eyebrow">{getRoleDisplayName(userRole)} Workspace</span>
              </div>
            </div>

            {/* Right side with notifications and logout */}
            <div className="flex items-center gap-3">
              {/* Global Search Button */}
              <Button
                variant="ghost"
                onClick={() => setIsCommandPaletteOpen(true)}
                className="flex items-center gap-2 px-3 py-2 bg-muted border border-border rounded-full text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-all w-64 justify-between group"
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
              <NotificationCenter userRole={userRole} additionalRoles={additionalRoles} />

              <ThemeToggle />

              {/* Logout button */}
              <Button
                variant="ghost"
                onClick={onLogout}
                className="flex items-center gap-2 px-3 py-2 text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors rounded-full"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </header>

          {/* Main content area */}
          <main className="flex-1 overflow-auto p-6 pb-20 md:pb-6">
            <BreadcrumbNav userRole={userRole} additionalRoles={additionalRoles} />
            {children}
          </main>
        </div>

        {/* Command Palette */}
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          userRole={userRole}
          additionalRoles={additionalRoles}
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