import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from './ui/sheet';
import { domainsForRole } from '../navigation/navConfig';
import { mobileNavItemsForRole, MAX_VISIBLE_TABS } from '../navigation/mobileNavItems';
import { Menu, FileText } from 'lucide-react';

interface MobileBottomNavProps {
  userRole: string;
  additionalRoles?: string[];
}

export default function MobileBottomNav({ userRole, additionalRoles = [] }: MobileBottomNavProps) {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const navItems = mobileNavItemsForRole(userRole);
  const domains = domainsForRole(userRole, additionalRoles);
  // Same threshold as the desktop sidebar (Navigation.tsx) — only dense roles
  // (in practice, just admin) are worth chunking into labeled sections.
  const totalItems = domains.reduce((sum, d) => sum + d.primary.length + d.more.length, 0);
  const showDomainLabels = totalItems > 30;
  const flatEntries = domains.flatMap((d) => [...d.primary, ...d.more]);

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

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="max-h-[75dvh] overflow-y-auto pb-8">
          <SheetHeader>
            <SheetTitle>All pages</SheetTitle>
            <SheetDescription>Every page your role can reach, grouped by area.</SheetDescription>
          </SheetHeader>
          <div className="mt-2 space-y-4">
            {showDomainLabels ? (
              domains.map((d) => (
                <div key={d.domain}>
                  <p className="px-1 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{d.label}</p>
                  <div className="grid grid-cols-1 gap-0.5">
                    {[...d.primary, ...d.more].map((e) => {
                      const Icon = e.icon ?? FileText;
                      return (
                        <Link
                          key={`${e.domain}:${e.label}`}
                          to={e.href ?? e.path}
                          onClick={() => setMoreOpen(false)}
                          className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-foreground hover:bg-accent"
                        >
                          <Icon className="w-4 h-4 text-muted-foreground" />
                          {e.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="grid grid-cols-1 gap-0.5">
                {flatEntries.map((e) => {
                  const Icon = e.icon ?? FileText;
                  return (
                    <Link
                      key={`${e.domain}:${e.label}`}
                      to={e.href ?? e.path}
                      onClick={() => setMoreOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-foreground hover:bg-accent"
                    >
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      {e.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
