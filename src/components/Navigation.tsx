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
  Plane,
  Settings,
  FileText,
  LogOut,
  PanelLeft,
  Search,
  GripVertical,
  RotateCcw,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import {
  domainsForRole, entriesForRoles, matchEntry, DEFAULT_OPEN_DOMAINS,
  type NavEntry,
} from '../navigation/navConfig';


interface NavigationProps {
  userRole: string;
  additionalRoles?: string[];
  onLogout: () => void;
  children: React.ReactNode;
}

// Sidebar model: one domain per group, derived from the route manifest.
interface NavigationGroup {
  label: string;
  items: NavEntry[];      // primary — always visible when the domain is open
  moreItems: NavEntry[];  // behind the "More" expander
}

// Draggable navigation group component — one manifest domain per group.
const DraggableNavigationGroup = ({
  group,
  index,
  moveGroup,
  isCustomizing,
  location,
  activePath,
  isCollapsed,
  onToggleCollapse,
}: {
  group: NavigationGroup;
  index: number;
  moveGroup: (dragIndex: number, hoverIndex: number) => void;
  isCustomizing: boolean;
  location: { pathname: string; search: string };
  activePath: string | undefined;
  isCollapsed: boolean;
  onToggleCollapse: (label: string) => void;
}) => {
  const [moreOpen, setMoreOpen] = useState(false); // not persisted — menus start short each session

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
        <SidebarMenuButton asChild isActive={isActive} className={`relative overflow-hidden group transition-all duration-300 ${isActive ? 'bg-primary text-primary-foreground font-medium shadow-sm' : 'text-muted-foreground bg-transparent'}`}>
          <Link to={item.href ?? item.path} className="flex items-center gap-3 w-full relative">
            {!isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0 bg-muted-foreground/50 rounded-r-full transition-all duration-200 group-hover:h-3/4" />}
            <Icon className={`w-4 h-4 z-10 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'}`} />
            <span className={`z-10 transition-colors duration-300 relative ${isActive ? '' : 'group-hover:text-foreground'}`}>{item.label}</span>
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
        <SidebarGroupLabel asChild>
          <button
            type="button"
            onClick={() => onToggleCollapse(group.label)}
            className="flex w-full items-center gap-2 cursor-pointer"
            aria-expanded={!isCollapsed}
          >
            {isCustomizing && <GripVertical className="w-4 h-4 text-muted-foreground" />}
            <span className="flex-1 text-left">{group.label}</span>
            {isCollapsed
              ? <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>
        </SidebarGroupLabel>
        {!isCollapsed && (
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map(renderEntry)}
              {group.moreItems.length > 0 && (
                <>
                  {moreOpen && group.moreItems.map(renderEntry)}
                  <SidebarMenuItem key={`${group.label}:more`}>
                    <SidebarMenuButton
                      onClick={() => setMoreOpen((o) => !o)}
                      className="text-muted-foreground bg-transparent"
                    >
                      {moreOpen
                        ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                      <span>{moreOpen ? 'Less' : `More (${group.moreItems.length})`}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        )}
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

  // Collapsed domains, persisted per role; first visit opens the role's home domain(s).
  const [collapsedOverride, setCollapsedOverride] = useState<string[] | null>(() => {
    try {
      const saved = localStorage.getItem(`nav-collapsed-${userRole}`);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const navigationGroups = React.useMemo(() => {
    // One group per manifest domain, filtered to the user's roles.
    const filtered: NavigationGroup[] = domainsForRole(userRole, additionalRoles).map((d) => ({
      label: d.label,
      items: d.primary,
      moreItems: d.more,
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

  // Collapse model: no saved state → everything but the role's home domain(s) starts collapsed.
  const defaultOpen = DEFAULT_OPEN_DOMAINS[userRole] ?? ['home'];
  const collapsedLabels = collapsedOverride
    ?? domainsForRole(userRole, additionalRoles)
      .filter((d) => !defaultOpen.includes(d.domain))
      .map((d) => d.label);

  const toggleCollapse = (label: string) => {
    const next = collapsedLabels.includes(label)
      ? collapsedLabels.filter((l) => l !== label)
      : [...collapsedLabels, label];
    setCollapsedOverride(next);
    localStorage.setItem(`nav-collapsed-${userRole}`, JSON.stringify(next));
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
                activePath={activePath}
                isCollapsed={collapsedLabels.includes(group.label) && !isCustomizing}
                onToggleCollapse={toggleCollapse}
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