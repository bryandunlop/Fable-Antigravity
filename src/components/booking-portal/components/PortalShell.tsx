// Portal chrome, in the Command Center's shape: page header with a live
// subtitle, primary surfaces as Tabs, and quiet controls pushed right.

import { type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import {
  CalendarDays, ClipboardList, Inbox as InboxIcon, ListChecks, Plane, RotateCcw, Scale, Ticket, Users,
} from 'lucide-react';
import { Button } from '../../ui/button';
import { usePortal } from '../BookingPortalContext';
import { DemoTour } from './DemoTour';
import { buildQueue } from '../engine/queueBands';
import { EA_NAME, SCHEDULER_NAME } from '../mockData';
import { cn } from '../../ui/utils';

const TABS: { to: string; label: string; icon: React.ElementType; end?: boolean; schedulingOnly?: boolean; leadOnly?: boolean }[] = [
  { to: '/booking-portal', label: 'Home', icon: CalendarDays, end: true },
  { to: '/booking-portal/trips', label: 'Trips', icon: Ticket },
  { to: '/booking-portal/seats', label: 'Empty seats', icon: Plane },
  { to: '/booking-portal/requests', label: 'Requests', icon: ClipboardList },
  { to: '/booking-portal/queue', label: 'Queue', icon: ListChecks, schedulingOnly: true },
  { to: '/booking-portal/passengers', label: 'Passengers', icon: Users },
  { to: '/booking-portal/watches', label: 'Watches', icon: CalendarDays },
  { to: '/booking-portal/inbox', label: 'Inbox', icon: InboxIcon },
  { to: '/booking-portal/cost-model', label: 'Cost model', icon: Scale, leadOnly: true },
];

export function PortalShell({
  title,
  meta,
  actions,
  children,
}: {
  title: string;
  meta?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { state, dispatch, showCostModel, executiveScope } = usePortal();
  const unread = state.inbox.filter((n) => n.actionNeeded && !n.read).length;
  const queueCount = buildQueue(state.requests, state.seatAsks, Date.now()).counts.total;

  // D99 — an executive visitor sees the request form as a page, not the portal:
  // no tabs, no reset, and above all no persona switch (RequestDrawer gates its
  // approve/decline on state.persona, which is demo chrome, not auth).
  if (executiveScope) {
    return (
      <div className="space-y-4">
        <div className="min-w-0">
          <p className="gfo-eyebrow mb-1 text-muted-foreground">Booking Portal</p>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {meta && <p className="mt-0.5">{meta}</p>}
        </div>
        <div>{children}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="gfo-eyebrow mb-1 text-muted-foreground">Booking Portal · demo shell</p>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {meta && <p className="mt-0.5">{meta}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <DemoTour />
          {actions}
          <div className="flex overflow-hidden rounded-md border text-xs font-medium">
            <button
              type="button"
              onClick={() => dispatch({ type: 'SET_PERSONA', persona: 'ea' })}
              className={cn('px-3 py-1.5 transition-colors', state.persona === 'ea' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-accent')}
            >
              {EA_NAME} · EA
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: 'SET_PERSONA', persona: 'scheduling' })}
              className={cn('px-3 py-1.5 transition-colors', state.persona === 'scheduling' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-accent')}
            >
              {SCHEDULER_NAME} · Scheduling
            </button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => dispatch({ type: 'RESET_DEMO' })}
            title="Re-seed the portal's fixture data (does not touch the rest of myGFO)"
            className="text-muted-foreground"
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset portal data
          </Button>
        </div>
      </div>

      <nav className="flex flex-wrap items-center gap-1 border-b">
        {TABS.filter((t) => (!t.schedulingOnly || state.persona === 'scheduling') && (!t.leadOnly || showCostModel)).map((tab) => {
          const Icon = tab.icon;
          const badge = tab.label === 'Inbox' ? unread : tab.label === 'Queue' ? queueCount : 0;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-b-2 border-[var(--gfo-daylight,#0096FC)] text-foreground'
                    : 'border-b-2 border-transparent text-muted-foreground hover:text-foreground',
                )
              }
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {badge > 0 && (
                <span className="rounded-full bg-[var(--gfo-daylight,#0096FC)] px-1.5 text-[10px] font-semibold text-white">
                  {badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
