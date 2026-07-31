import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserCircle, Bell, X } from 'lucide-react';
import { DemoBanner } from './DemoBanner';
import { ResetDemoButton } from './ResetDemoButton';
import { SyncStatusChip } from './SyncStatusChip';
import { useTechLog, useCurrentUser, useDisplayZone } from '../TechLogContext';
import type { DisplayZoneMode } from '../util/displayZone';
import { deriveServiceability } from '../engine/serviceability';
import { buildWorkQueue } from '../engine/workqueue';
import { buildNotifications, type Notification } from '../engine/notifications';
import { resolveNav, type NavGroup, type SubItem } from '../engine/nav';
import { Popover, PopoverTrigger, PopoverContent } from '../../ui/popover';
import { cn } from '../../ui/utils';

export function TechLogShell({
  title,
  subtitle,
  actions,
  status,
  banner,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  status?: ReactNode;
  /**
   * D71 — a page that owns its own headline (the aircraft workspace) passes it here. The chrome row
   * then keeps only a quiet context line, and the banner spans the full width under the nav, so the
   * page states what it is once instead of a title above the nav and a status card below it.
   */
  banner?: ReactNode;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { state, dispatch } = useTechLog();
  const user = useCurrentUser();

  const now = new Date().toISOString();
  const redCount = state.aircraft.filter(a => !a.isProvisional && deriveServiceability(a.id, state, now).status === 'RED').length;
  const urgent = buildWorkQueue(state, now).counts.urgent;
  const notifications = buildNotifications(state, user, now);
  const badgeValue = (b?: 'red' | 'urgent') => (b === 'red' ? redCount : b === 'urgent' ? urgent : 0);

  const { groups, activeGroup, activeSub } = resolveNav(user.role === 'MAINTENANCE' ? 'MAINTENANCE' : 'PILOT', pathname);

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          {banner ? (
            <p className="text-sm text-muted-foreground">{title}</p>
          ) : (
            <>
              <p className="gfo-eyebrow mb-1 text-muted-foreground">Global Flight Operations</p>
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {status}
          {actions}
          <DemoBanner variant="chip" />
          <NotificationsBell
            notifications={notifications}
            onOpen={(link) => navigate(link)}
            onDismiss={(id) => dispatch({ type: 'DISMISS_NOTIFICATION', payload: id })}
          />
          <SyncStatusChip />
          <DisplayZoneToggle />
          <span
            className="hidden items-center gap-1.5 rounded-md border px-2 py-1 text-xs text-muted-foreground sm:inline-flex"
            title="Identity comes from how you logged in (role-based)"
          >
            <UserCircle className="h-3.5 w-3.5" /> {user.displayName} · {user.role === 'MAINTENANCE' ? 'Maintenance' : 'Pilot'}
          </span>
          <ResetDemoButton />
        </div>
      </div>

      {/* Primary (role-adaptive) nav */}
      <div className="mb-2 flex flex-wrap gap-1 border-b">
        {groups.map((g: NavGroup) => {
          const active = g.match(pathname);
          const badge = badgeValue(g.badge);
          return (
            <button
              key={g.key}
              onClick={() => navigate(g.to)}
              className={cn(
                'inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors',
                active ? 'border-primary font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {g.label}
              {badge > 0 && (
                <span className={cn('rounded-full px-1.5 text-xs', g.badge === 'red' ? 'bg-[var(--gfo-error,#EF3340)]/15 text-[var(--gfo-error,#EF3340)]' : 'bg-[var(--gfo-warning,#F1B434)]/20 text-[var(--gfo-warning,#F1B434)]')}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Contextual sub-nav for the active group */}
      {activeGroup.sub && (
        <div className="mb-6 flex flex-wrap gap-1">
          {activeGroup.sub.map((s: SubItem) => {
            const active = activeSub?.to === s.to;
            return (
              <button
                key={s.to}
                onClick={() => navigate(s.to)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs transition-colors',
                  active ? 'bg-accent font-medium text-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                )}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      )}
      {!activeGroup.sub && <div className="mb-6" />}

      {banner}
      {children}
    </div>
  );
}

const DOT: Record<string, string> = {
  critical: 'bg-[var(--gfo-error,#EF3340)]',
  warn: 'bg-[var(--gfo-warning,#F1B434)]',
  info: 'bg-muted-foreground',
};

// D24: lens for regulatory times (MEL repair clocks / due dates). Display only — never changes when
// an item is actually due (that is a UTC-instant comparison). Default ET = each deferral's governing zone.
const ZONE_OPTS: { mode: DisplayZoneMode; label: string; title: string }[] = [
  { mode: 'GOVERNING', label: 'ET', title: 'Show regulatory times in each deferral’s governing zone (Eastern by default)' },
  { mode: 'UTC', label: 'UTC', title: 'Show regulatory times in UTC' },
  { mode: 'LOCAL', label: 'Local', title: 'Show regulatory times in this device’s local zone' },
];
function DisplayZoneToggle() {
  const { displayZone, setDisplayZone } = useDisplayZone();
  return (
    <span
      className="hidden overflow-hidden rounded-md border text-xs sm:inline-flex"
      role="group"
      aria-label="Display timezone for regulatory times"
      title="Time zone for MEL repair-clock and due dates (display only)"
    >
      {ZONE_OPTS.map(o => (
        <button
          key={o.mode}
          type="button"
          onClick={() => setDisplayZone(o.mode)}
          title={o.title}
          aria-pressed={displayZone === o.mode}
          className={cn(
            'px-2 py-1 transition-colors',
            displayZone === o.mode ? 'bg-accent font-medium text-foreground' : 'text-muted-foreground hover:bg-accent/50',
          )}
        >
          {o.label}
        </button>
      ))}
    </span>
  );
}

function NotificationsBell({
  notifications,
  onOpen,
  onDismiss,
}: {
  notifications: Notification[];
  onOpen: (link: string) => void;
  onDismiss: (id: string) => void;
}) {
  const count = notifications.length;
  const hasCritical = notifications.some(n => n.severity === 'critical');
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative inline-flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground hover:bg-accent/50 hover:text-foreground" title="Notifications" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className={cn('absolute -right-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium text-white', hasCritical ? 'bg-[var(--gfo-error,#EF3340)]' : 'bg-[var(--gfo-warning,#F1B434)]')}>
              {count}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="border-b px-3 py-2 text-sm font-medium">Notifications {count > 0 && <span className="text-muted-foreground">· {count}</span>}</div>
        <div className="max-h-96 overflow-y-auto">
          {count === 0 && <div className="p-6 text-center text-sm text-muted-foreground">You're all caught up.</div>}
          {notifications.map(n => (
            <div key={n.id} className="flex items-start gap-2 border-b px-3 py-2 last:border-0 hover:bg-accent/40">
              <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', DOT[n.severity])} />
              <button className="min-w-0 flex-1 text-left" onClick={() => onOpen(n.link)}>
                <div className="text-sm font-medium leading-snug">{n.title}</div>
                {n.detail && <div className="truncate text-xs text-muted-foreground">{n.detail}</div>}
                {n.atUtc && <div className="text-[10px] text-muted-foreground">{new Date(n.atUtc).toLocaleString()}</div>}
              </button>
              <button className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-accent" title="Dismiss" onClick={() => onDismiss(n.id)}>
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
