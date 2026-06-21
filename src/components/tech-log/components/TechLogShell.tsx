import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { DemoBanner } from './DemoBanner';
import { PersonaSwitcher } from './PersonaSwitcher';
import { ResetDemoButton } from './ResetDemoButton';
import { useCurrentUser } from '../TechLogContext';
import { cn } from '../../ui/utils';

type Tab = { label: string; to: string; match?: (p: string) => boolean };
const TABS: Tab[] = [
  { label: 'Fleet', to: '/tech-log', match: (p: string) => p === '/tech-log' || p.startsWith('/tech-log/aircraft') },
  { label: 'Journey Log', to: '/tech-log/journey' },
  { label: 'Defects', to: '/tech-log/defects' },
  { label: 'Deferrals', to: '/tech-log/deferrals' },
  { label: 'Releases', to: '/tech-log/releases' },
  { label: 'Audit', to: '/tech-log/audit' },
];
const ADMIN_TABS: Tab[] = [
  { label: 'Fleet admin', to: '/tech-log/admin/fleet' },
  { label: 'Personnel', to: '/tech-log/admin/personnel' },
  { label: 'MEL', to: '/tech-log/admin/mel' },
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
  const user = useCurrentUser();
  const tabs = user.role === 'MAINTENANCE' ? [...TABS, ...ADMIN_TABS] : TABS;

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
          <PersonaSwitcher />
          <ResetDemoButton />
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-1 border-b">
        {tabs.map(t => {
          const active = t.match ? t.match(pathname) : pathname.startsWith(t.to);
          return (
            <button
              key={t.to}
              onClick={() => navigate(t.to)}
              className={cn(
                'border-b-2 px-3 py-2 text-sm transition-colors',
                active ? 'border-primary font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {children}
    </div>
  );
}
