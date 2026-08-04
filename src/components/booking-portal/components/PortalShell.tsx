// Booking portal shell — internal nav, persona toggle, reset. This is a demo
// shell: the persona switch stands in for real auth (an EA and a scheduler
// would each see only their own side).

import { type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';
import { usePortal } from '../BookingPortalContext';
import { rankQueue } from '../engine/lifecycle';
import { EA_NAME, SCHEDULER_NAME } from '../mockData';
import { cn } from '../../ui/utils';

const TABS: { to: string; label: string; end?: boolean; scheduling?: boolean }[] = [
  { to: '/booking-portal', label: 'Home', end: true },
  { to: '/booking-portal/seats', label: 'Empty seats' },
  { to: '/booking-portal/requests', label: 'Requests' },
  { to: '/booking-portal/queue', label: 'Queue', scheduling: true },
  { to: '/booking-portal/passengers', label: 'Passengers' },
  { to: '/booking-portal/watches', label: 'Watches' },
  { to: '/booking-portal/inbox', label: 'Inbox' },
];

export function PortalShell({ title, meta, actions, children }: { title: string; meta?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  const { state, dispatch } = usePortal();
  const unread = state.inbox.filter((n) => n.actionNeeded && !n.read).length;
  const queueCount = rankQueue(state.requests).length + state.seatAsks.filter((s) => s.status === 'requested').length;

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-1 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="gfo-eyebrow mb-1 text-muted-foreground">Booking Portal · demo shell</p>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {/* The as-of line belongs under the title, not in the control row — it is
              long enough to wrap the persona toggle onto a second line otherwise. */}
          {meta && <p className="mt-0.5">{meta}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {actions}
          <div className="flex border border-border text-xs font-semibold">
            <button
              type="button"
              onClick={() => dispatch({ type: 'SET_PERSONA', persona: 'ea' })}
              className={cn('px-3 py-1.5', state.persona === 'ea' ? 'bg-[#142D7E] text-white' : 'text-muted-foreground hover:bg-muted')}
            >
              {EA_NAME} · EA
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: 'SET_PERSONA', persona: 'scheduling' })}
              className={cn('px-3 py-1.5', state.persona === 'scheduling' ? 'bg-[#142D7E] text-white' : 'text-muted-foreground hover:bg-muted')}
            >
              {SCHEDULER_NAME} · Scheduling
            </button>
          </div>
          <button
            type="button"
            onClick={() => dispatch({ type: 'RESET_DEMO' })}
            title="Re-seed the portal's fixture data (does not touch the rest of myGFO)"
            className="flex items-center gap-1.5 border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset portal data
          </button>
        </div>
      </div>

      <nav className="mb-6 flex flex-wrap gap-1 border-b border-border">
        {TABS.filter((t) => !t.scheduling || state.persona === 'scheduling').map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-1.5 px-3 py-2 text-sm font-medium',
                isActive
                  ? 'border-b-2 border-[#0096FC] text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )
            }
          >
            {tab.label}
            {tab.label === 'Inbox' && unread > 0 && (
              <span className="rounded-full bg-[#0096FC] px-1.5 text-[10px] font-semibold text-white">{unread}</span>
            )}
            {tab.label === 'Queue' && queueCount > 0 && (
              <span className="rounded-full bg-[#0096FC] px-1.5 text-[10px] font-semibold text-white">{queueCount}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {children}
    </div>
  );
}
