import { ReactNode } from 'react';
import { DemoBanner } from './DemoBanner';
import { PersonaSwitcher } from './PersonaSwitcher';
import { ResetDemoButton } from './ResetDemoButton';

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
  return (
    <div className="mx-auto max-w-7xl p-6">
      <DemoBanner />
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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
      {children}
    </div>
  );
}
