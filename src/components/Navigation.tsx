import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from './ui/sidebar';
import NotificationCenter from './NotificationCenter';
import { ThemeToggle } from './ThemeToggle';
import { ResetDemoDataButton } from './ResetDemoDataButton';
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
import {
  initialSidebarOpen, readPersistedSidebarState, writePersistedSidebarState,
} from '../navigation/sidebarDefault';
import { orderedGroupsForRole, shouldShowGroupLabels, NAV_ORDER_KEY } from '../navigation/navOrder';

// DENSE_ROLE_ITEM_THRESHOLD (30) lived here and gated group labels. Retired by
// D80: it meant only `admin` (52 items) ever saw labels while pilot, inflight and
// maintenance sat at ~15-18 in one flat unlabelled run. See navigation/navOrder.ts
// for why that answered the wrong question.


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
        {/* On the collapsed rail this becomes a 64x52 icon-over-label tile rather
            than shadcn's 32px icon square. The size overrides must sit on THIS
            className (the tailwind-merge side) and not on the Link below: Radix
            Slot concatenates asChild classes WITHOUT merging, so a conflicting
            utility on the child never wins. */}
        <SidebarMenuButton asChild isActive={isActive} tooltip={item.label} className={`relative overflow-hidden group transition-colors duration-200 group-data-[collapsible=icon]:h-auto! group-data-[collapsible=icon]:w-16! group-data-[collapsible=icon]:py-1.5! group-data-[collapsible=icon]:px-0.5! ${isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold' : 'text-sidebar-foreground bg-transparent hover:bg-white/10 hover:text-white'}`}>
          <Link to={item.href ?? item.path} className="flex items-center gap-3 w-full relative group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-0.5 group-data-[collapsible=icon]:text-center">
            {isActive && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gfo-sunrise" />}
            {!isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0 bg-white/40 rounded-r-full transition-all duration-200 group-hover:h-3/4" />}
            <Icon className={`w-4 h-4 shrink-0 z-10 ${isActive ? 'text-sidebar-accent-foreground' : 'text-sidebar-foreground group-hover:text-white'}`} />
            {/* Two spans, one per rail state — NOT one span with a ?? fallback.
                A single span showed the short railLabel in the EXPANDED sidebar
                too, so Irregularity Reports read as "Irregularity" at full width.
                The expanded label is always the real one. */}
            <span className="z-10 relative group-data-[collapsible=icon]:hidden">{item.label}</span>
            {/* The rail label is what makes the icons readable at all, and it must
                WRAP to two lines — so whitespace-normal has to beat shadcn's cva
                base `[&>span:last-child]:truncate`, which otherwise ties on
                specificity and wins on source order (that is how these first came
                out as "Pilot Curren…"). Names too long for two 9px lines carry an
                explicit railLabel in the manifest. */}
            <span className="z-10 relative hidden group-data-[collapsible=icon]:block text-[9px] leading-[1.15] w-full max-h-[22px] overflow-hidden group-data-[collapsible=icon]:whitespace-normal!">{item.railLabel ?? item.label}</span>
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

  // D80: the rail starts expanded above 1280 and collapsed below it, unless the
  // user has made a choice — then their choice wins at every width. Computed in
  // the initialiser rather than an effect so the rail never paints expanded and
  // then snaps shut on the iPad.
  //
  // shadcn's own persistence writes a `sidebar_state` cookie that it expects a
  // SERVER to read back into `defaultOpen`. This is a static export with no
  // server, so that cookie is written and never read — the state does not
  // actually survive a reload. Hence localStorage, which is also how this
  // component already persists nav order.
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    initialSidebarOpen(
      typeof window === 'undefined' ? Number.MAX_SAFE_INTEGER : window.innerWidth,
      readPersistedSidebarState(),
    ),
  );

  const handleSidebarOpenChange = React.useCallback((open: boolean) => {
    setSidebarOpen(open);
    writePersistedSidebarState(open);
  }, []);

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
    const saved = localStorage.getItem(NAV_ORDER_KEY(userRole));
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
    const filtered: NavigationGroup[] = orderedGroupsForRole(userRole, additionalRoles).map((d) => ({
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
    localStorage.setItem(NAV_ORDER_KEY(userRole), JSON.stringify(order));
  };

  // Move group in the list
  const moveGroup = (dragIndex: number, hoverIndex: number) => {
    const newGroups = [...navigationGroups];
    const [draggedGroup] = newGroups.splice(dragIndex, 1);
    newGroups.splice(hoverIndex, 0, draggedGroup);
    setCustomOrderKeys(newGroups.map(g => g.label));
  };

  // Persist ONLY on the customizing true -> false edge, i.e. when the user
  // actually finishes reordering.
  //
  // This used to fire on mount as well (the guard was just `if (!isCustomizing)`,
  // which is true on first render), so the app wrote a frozen group order for
  // every user the first time they ever opened it — without anyone touching
  // "Customize order". The stored order then beat the manifest forever, which
  // silently defeats D80's own-domain-first ordering for every existing user.
  // Caught because Scheduling would not move to the top of a scheduler's rail.
  const wasCustomizing = React.useRef(isCustomizing);
  useEffect(() => {
    if (wasCustomizing.current && !isCustomizing) {
      saveCustomOrder(navigationGroups);
    }
    wasCustomizing.current = isCustomizing;
  }, [isCustomizing, navigationGroups]);

  // Reset to default order
  const resetToDefault = () => {
    setCustomOrderKeys(null);
    localStorage.removeItem(NAV_ORDER_KEY(userRole));
  };

  // Always on now (D80) — a group label is how a reader ranks eighteen rows, not
  // a scroll anchor for fifty. They are still quiet and non-interactive.
  const showLabels = shouldShowGroupLabels();

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
    <SidebarProvider
      open={sidebarOpen}
      onOpenChange={handleSidebarOpenChange}
      // 76px, not shadcn's 3rem: the collapsed rail carries icon + tiny label,
      // Files-app style, per UX Workflow Pass 2026-08-08 §W7 — "bare icons are a
      // memory test, the opposite of minimal training" (LG-207). It also keeps
      // the target finger-sized for a pilot on a moving aircraft.
      style={{ '--sidebar-width-icon': '4.75rem' } as React.CSSProperties}
    >
      <div className="flex min-h-screen w-full overflow-x-hidden">
        {/* collapsible="icon", not the shadcn default "offcanvas": D80 makes the
            rail PERMANENT above 768 — collapsing to icons, never to nothing. That
            single prop is what stops iPad portrait (834) rendering ~460pt of nav
            against a 834pt screen (LG-198 / UI-UX review R4). */}
        <Sidebar collapsible="icon" className="border-r border-sidebar-border">
          <SidebarHeader className="border-b border-white/5 p-4 group-data-[collapsible=icon]:p-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col gap-1.5 group-data-[collapsible=icon]:hidden">
                <h2 className="text-base font-bold tracking-tight text-white">Global Flight Operations</h2>
                <p className="text-[10px] uppercase tracking-[0.16em] text-gfo-sunrise font-bold">{getRoleDisplayName(userRole)}</p>
              </div>
              <div className="md:hidden">
                <ThemeToggle />
              </div>
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

          {/* Customize Order lives at the FOOT now (D80). It used to be the first
              thing in the nav, above every destination on every device — a
              power-user preference outranking Tech Log. Hidden on the collapsed
              rail: reordering groups you cannot read is not a thing anyone wants. */}
          <SidebarFooter className="border-t border-white/5 p-2 group-data-[collapsible=icon]:hidden">
            <Button
              variant={isCustomizing ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setIsCustomizing(!isCustomizing)}
              className="w-full justify-start text-xs text-sidebar-foreground hover:bg-white/10 hover:text-white"
            >
              <Settings className="mr-2 h-3 w-3" />
              {isCustomizing ? 'Done customizing' : 'Customize order'}
            </Button>
            {isCustomizing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetToDefault}
                className="w-full justify-start text-xs text-sidebar-foreground hover:bg-white/10 hover:text-white"
              >
                <RotateCcw className="mr-2 h-3 w-3" />
                Reset to default
              </Button>
            )}
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col relative min-w-0">
          {/* Enhanced top bar with notification center */}
          <header className="sticky top-0 z-40 border-b border-border bg-card px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Rail toggle — md and up ONLY. Below 768 this used to open the full
                  sidebar as a sheet while the bottom bar's fifth cell opened a
                  second sheet of the same eighteen items: two doors into one room,
                  and the top-left one is out of thumb reach for a technician
                  holding something in the other hand (D79/D80). The bottom bar is
                  now the only phone nav. */}
              <div className="hidden md:flex items-center gap-3">
                <SidebarTrigger className="h-10 w-10 p-0 border border-border bg-card hover:bg-accent hover:text-accent-foreground text-foreground transition-all duration-200 shadow-sm rounded-lg">
                  <PanelLeft className="h-5 w-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </SidebarTrigger>
              </div>

              {/* Below md this is the only thing naming where you are: the phone
                  header used to be a toggle, a gap and four icons, with the role
                  eyebrow hidden. */}
              <span className="md:hidden truncate text-sm font-semibold text-foreground">
                {matchEntry(location.pathname, visibleEntries)?.label ?? 'Global Flight Operations'}
              </span>
              <div className="hidden md:flex flex-col">
                <span className="gfo-eyebrow">{getRoleDisplayName(userRole)} Workspace</span>
              </div>
            </div>

            {/* Right side with notifications and logout. The cluster measured 404pt
                against a 290pt budget on a 390pt phone — the search field alone was
                256 of it — so every route in the app overflowed here regardless of
                its own layout. Below sm the field collapses to its icon. */}
            <div className="flex items-center gap-1 sm:gap-3 min-w-0">
              {/* Global Search Button */}
              <Button
                variant="ghost"
                onClick={() => setIsCommandPaletteOpen(true)}
                aria-label="Search system"
                className="flex items-center gap-2 h-10 w-10 justify-center px-0 sm:w-64 sm:px-3 sm:py-2 sm:justify-between bg-muted border border-border rounded-full text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-all group shrink-0"
              >
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 group-hover:text-primary transition-colors" />
                  <span className="hidden sm:inline">Search system...</span>
                </div>
                <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border/50 bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </Button>

              {/* Notification Center */}
              <NotificationCenter userRole={userRole} additionalRoles={additionalRoles} />

              {/* Theme, reset and sign-out are md+ only. On a phone they are in the
                  drawer's account block — a bare Logout icon at top-right is the
                  classic mis-tap, and it was the only irreversible control up there. */}
              <span className="hidden md:inline-flex"><ThemeToggle /></span>

              {/* Global "Reset demo data" — the one factory reset (D37 Wave-1 Q3) */}
              <span className="hidden md:inline-flex"><ResetDemoDataButton /></span>

              {/* Logout button */}
              <Button
                variant="ghost"
                onClick={onLogout}
                className="hidden md:flex items-center gap-2 px-3 py-2 text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors rounded-full"
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