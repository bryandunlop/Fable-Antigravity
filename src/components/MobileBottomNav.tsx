import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from './ui/sheet';
import { orderedGroupsForRole } from '../navigation/navOrder';
import { mobileNavItemsForRole, MAX_VISIBLE_TABS } from '../navigation/mobileNavItems';
import { Menu, FileText, LogOut, Search } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface MobileBottomNavProps {
  userRole: string;
  additionalRoles?: string[];
  /** Phone-only sign-out: the header's Logout is md+ since D80. */
  onLogout?: () => void;
}

export default function MobileBottomNav({ userRole, additionalRoles = [], onLogout }: MobileBottomNavProps) {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const [filter, setFilter] = useState('');

  const navItems = mobileNavItemsForRole(userRole);
  // Same ordering the expanded rail uses (D80): your own domain first, group
  // labels ALWAYS on. This drawer is now the phone's only route to the long tail
  // — the header's sidebar trigger is md+ — so a flat unlabelled run of eighteen
  // is no longer an acceptable shape for it.
  const domains = orderedGroupsForRole(userRole, additionalRoles);

  const q = filter.trim().toLowerCase();
  const matches = (label: string, keywords?: string[]) =>
    !q || label.toLowerCase().includes(q) || (keywords ?? []).some((k) => k.toLowerCase().includes(q));

  const groups = domains
    .map((d) => ({
      label: d.label,
      entries: [...d.primary, ...d.more].filter((e) => matches(e.label, e.keywords)),
    }))
    .filter((g) => g.entries.length > 0);

  // Don't show on desktop
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gfo-midnight border-t border-white/10 z-40">
      {/* MAX_VISIBLE_TABS tabs + the More cell. The cap comes from the manifest
          module so the render-side slice and the data-side budget cannot drift —
          when they did, roles silently lost their last tabs. */}
      {/* Columns follow the tabs a role actually has, +1 for More. A fixed
          MAX_VISIBLE_TABS + 1 leaves an empty cell for roles with fewer tabs
          (document-manager has three) and pushes More off-centre. */}
      <div
        className="grid gap-1 px-2 py-2"
        style={{ gridTemplateColumns: `repeat(${Math.min(navItems.length, MAX_VISIBLE_TABS) + 1}, minmax(0, 1fr))` }}
      >
        {navItems.slice(0, MAX_VISIBLE_TABS).map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;

          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg transition-colors duration-200 ${
                isActive
                  ? 'bg-white/10 text-gfo-daylight-light'
                  : 'text-white/65 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.name}</span>
              {isActive && (
                <div className="w-4 h-0.5 bg-gfo-daylight-light rounded-full" />
              )}
            </Link>
          );
        })}

        {/* Fifth slot: the full role menu, from the manifest */}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className="flex flex-col items-center gap-1 py-2 px-1 rounded-lg transition-colors duration-200 text-white/65 hover:text-white hover:bg-white/10"
        >
          <Menu className="w-5 h-5" />
          <span className="text-xs font-medium">More</span>
        </button>
      </div>

      <Sheet open={moreOpen} onOpenChange={(open: boolean) => { setMoreOpen(open); if (!open) setFilter(''); }}>
        <SheetContent side="bottom" className="flex max-h-[80dvh] flex-col gap-0 overflow-hidden pb-[env(safe-area-inset-bottom)]">
          <SheetHeader className="pb-2">
            <SheetTitle>All pages</SheetTitle>
            <SheetDescription>Everything your role can reach, your own area first.</SheetDescription>
          </SheetHeader>

          {/* Search leads. In a 78-route app, typing beats browsing for the long
              tail — and this drawer is the phone's ONLY route to it since the
              header trigger went md+ (D80). */}
          <div className="relative shrink-0 pb-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search all pages"
              aria-label="Search all pages"
              className="h-11 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
            {groups.length === 0 && (
              <p className="px-1 py-6 text-center text-sm text-muted-foreground">
                No page matches &ldquo;{filter}&rdquo;.
              </p>
            )}
            {groups.map((g) => (
              <div key={g.label}>
                <p className="px-1 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{g.label}</p>
                <div className="grid grid-cols-1 gap-0.5">
                  {g.entries.map((e) => {
                    const Icon = e.icon ?? FileText;
                    const isActive = location.pathname === (e.href ?? e.path);
                    return (
                      <Link
                        key={`${e.domain}:${e.label}`}
                        to={e.href ?? e.path}
                        onClick={() => setMoreOpen(false)}
                        aria-current={isActive ? 'page' : undefined}
                        className={`flex min-h-11 items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-accent ${isActive ? 'bg-accent font-medium text-accent-foreground' : 'text-foreground'}`}
                      >
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        {e.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Account block. Theme, search and sign-out left the phone header in
              D80 — a bare Logout icon at top-right was the only irreversible
              control up there and the classic mis-tap. */}
          <div className="mt-2 flex shrink-0 items-center justify-between gap-2 border-t border-border pt-3">
            <ThemeToggle />
            {onLogout && (
              <button
                type="button"
                onClick={() => { setMoreOpen(false); onLogout(); }}
                className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
