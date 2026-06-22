import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Check, UserCircle, Bell, X } from 'lucide-react';
import { DemoBanner } from './DemoBanner';
import { ResetDemoButton } from './ResetDemoButton';
import { useTechLog, useCurrentUser } from '../TechLogContext';
import { deriveServiceability } from '../engine/serviceability';
import { buildWorkQueue } from '../engine/workqueue';
import { buildNotifications, type Notification } from '../engine/notifications';
import { Popover, PopoverTrigger, PopoverContent } from '../../ui/popover';
import { cn } from '../../ui/utils';

type SubItem = { label: string; to: string; match?: (p: string) => boolean };
type Group = { key: string; label: string; to: string; match: (p: string) => boolean; sub?: SubItem[]; badge?: 'red' | 'urgent' };

const sw = (prefix: string) => (p: string) => p.startsWith(prefix);
const fleetMatch = (p: string) => p === '/tech-log' || p.startsWith('/tech-log/aircraft');
const melReadMatch = (p: string) => p.startsWith('/tech-log/mel') && !p.startsWith('/tech-log/admin');

// Role-adaptive top-level nav. The aircraft (tail) workspace lives under Fleet; the cross-fleet
// "what needs a human" lives under Work Queue. Records = read/look-up; Admin = governed config.
const GROUPS_PILOT: Group[] = [
  { key: 'fleet', label: 'Fleet', to: '/tech-log', match: fleetMatch, badge: 'red' },
  {
    key: 'journey', label: 'Journey', to: '/tech-log/journey',
    match: (p) => p.startsWith('/tech-log/journey') || p.startsWith('/tech-log/trips'),
    sub: [
      { label: 'Journey Log', to: '/tech-log/journey' },
      { label: 'Trips', to: '/tech-log/trips' },
    ],
  },
  { key: 'workqueue', label: 'Work Queue', to: '/tech-log/work-queue', match: sw('/tech-log/work-queue'), badge: 'urgent' },
];

const GROUPS_MAINT: Group[] = [
  { key: 'fleet', label: 'Fleet', to: '/tech-log', match: fleetMatch, badge: 'red' },
  { key: 'workqueue', label: 'Work Queue', to: '/tech-log/work-queue', match: (p) => p.startsWith('/tech-log/work-queue') || p.startsWith('/tech-log/work-cards'), badge: 'urgent' },
  {
    key: 'airworthiness', label: 'Airworthiness', to: '/tech-log/airworthiness/forecast',
    match: (p) => p.startsWith('/tech-log/airworthiness'),
    sub: [
      { label: 'Forecast', to: '/tech-log/airworthiness/forecast' },
      { label: 'Times', to: '/tech-log/airworthiness/times' },
      { label: 'AD / SB', to: '/tech-log/airworthiness/adsb' },
      { label: 'Work Orders', to: '/tech-log/airworthiness/workorders' },
    ],
  },
  {
    key: 'records', label: 'Records', to: '/tech-log/mel',
    match: (p) => melReadMatch(p) || ['/tech-log/releases', '/tech-log/analytics', '/tech-log/audit', '/tech-log/trips', '/tech-log/intermittent', '/tech-log/defects', '/tech-log/deferrals'].some(r => p.startsWith(r)),
    sub: [
      { label: 'MEL', to: '/tech-log/mel', match: melReadMatch },
      { label: 'Releases', to: '/tech-log/releases' },
      { label: 'Audit', to: '/tech-log/audit' },
      { label: 'Analytics', to: '/tech-log/analytics' },
      { label: 'Trips', to: '/tech-log/trips' },
      { label: 'Intermittent', to: '/tech-log/intermittent' },
    ],
  },
  {
    key: 'admin', label: 'Admin', to: '/tech-log/admin/fleet',
    match: (p) => p.startsWith('/tech-log/admin') || p.startsWith('/tech-log/integration'),
    sub: [
      { label: 'Fleet admin', to: '/tech-log/admin/fleet' },
      { label: 'Personnel', to: '/tech-log/admin/personnel' },
      { label: 'MEL admin', to: '/tech-log/admin/mel' },
      { label: 'Integration', to: '/tech-log/integration' },
    ],
  },
];

export function TechLogShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
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

  const groups = user.role === 'MAINTENANCE' ? GROUPS_MAINT : GROUPS_PILOT;
  const activeGroup = groups.find(g => g.match(pathname)) ?? groups[0];

  return (
    <div className="mx-auto max-w-7xl p-6">
      <DemoBanner />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          <NotificationsBell
            notifications={notifications}
            onOpen={(link) => navigate(link)}
            onDismiss={(id) => dispatch({ type: 'DISMISS_NOTIFICATION', payload: id })}
          />
          <span
            className="hidden items-center gap-1 rounded-full border border-[var(--gfo-success,#00B140)]/40 bg-[var(--gfo-success,#00B140)]/10 px-2 py-1 text-xs text-[var(--gfo-success,#00B140)] sm:inline-flex"
            title="All signed records confirmed by the server. In offline use this shows 'N entries not yet synced' until the server ACKs."
          >
            <Check className="h-3 w-3" /> Synced
          </span>
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
        {groups.map(g => {
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
          {activeGroup.sub.map(s => {
            const active = s.match ? s.match(pathname) : pathname.startsWith(s.to);
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

      {children}
    </div>
  );
}

const DOT: Record<string, string> = {
  critical: 'bg-[var(--gfo-error,#EF3340)]',
  warn: 'bg-[var(--gfo-warning,#F1B434)]',
  info: 'bg-muted-foreground',
};

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
