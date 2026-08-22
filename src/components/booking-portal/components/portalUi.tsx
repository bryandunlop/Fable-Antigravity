// Shared presentation for the portal, on the house kit — Badge/Card from the
// UI library and the status-* accent classes, so the portal reads as the same
// product as the Command Center rather than a bolt-on with its own palette.

import type { ReactNode } from 'react';
import { Badge } from '../../ui/badge';
import { cn } from '../../ui/utils';

export { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';

export type ChipTone = 'info' | 'gold' | 'ok' | 'flag' | 'block' | 'neutral';

const TONE_CLASS: Record<ChipTone, string> = {
  info: 'status-info',
  ok: 'status-success',
  flag: 'status-warning',
  block: 'status-error',
  gold: 'border-[var(--gfo-sunrise,#D1AC6B)] bg-[color-mix(in_srgb,var(--gfo-sunrise,#D1AC6B)_16%,transparent)] text-[var(--gfo-sunrise-deep,#8A6A24)] dark:text-[var(--gfo-sunrise,#D1AC6B)]',
  neutral: '',
};

/** A status pill. Tone maps onto the app's semantic accents, never raw hex. */
export function Chip({ tone = 'neutral', children, className }: { tone?: ChipTone; children: ReactNode; className?: string }) {
  return (
    <Badge variant="outline" className={cn('text-[10px] font-semibold', TONE_CLASS[tone], className)}>
      {children}
    </Badge>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{children}</p>;
}

const STATUS_TONE: Record<string, ChipTone> = {
  draft: 'neutral',
  requested: 'info',
  pending: 'info',
  approved: 'ok',
  confirmed: 'ok',
  declined: 'block',
};

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  requested: 'Requested',
  pending: 'Pending approval',
  approved: 'Approved',
  confirmed: 'Confirmed',
  declined: 'Declined',
};

export function StatusChip({ status }: { status: string }) {
  return <Chip tone={STATUS_TONE[status] ?? 'neutral'}>{STATUS_LABEL[status] ?? status}</Chip>;
}

const LADDER = ['draft', 'requested', 'pending', 'approved', 'confirmed'] as const;

export function StatusLadder({ status }: { status: string }) {
  const activeIndex = status === 'declined' ? 2 : LADDER.indexOf(status as (typeof LADDER)[number]);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {LADDER.map((step, i) => (
        <div key={step} className="flex items-center gap-2">
          {i > 0 && <span className={cn('h-0.5 w-8', i <= activeIndex ? 'bg-[var(--gfo-daylight,#0096FC)]' : 'bg-border')} />}
          <span
            className={cn(
              'flex items-center gap-1.5 text-xs',
              i < activeIndex && 'text-muted-foreground',
              i === activeIndex && 'font-semibold text-foreground',
              i > activeIndex && 'text-muted-foreground/60',
            )}
          >
            <span
              className={cn(
                'inline-block h-2.5 w-2.5 rounded-full border-2',
                i < activeIndex && 'border-[var(--gfo-daylight,#0096FC)] bg-[var(--gfo-daylight,#0096FC)]',
                i === activeIndex && 'border-[var(--gfo-daylight,#0096FC)] bg-background',
                i > activeIndex && 'border-border bg-background',
              )}
            />
            {STATUS_LABEL[step]}
          </span>
        </div>
      ))}
      {status === 'declined' && <Chip tone="block">Declined</Chip>}
    </div>
  );
}

export function AsOf({ children }: { children: ReactNode }) {
  return <span className="text-xs text-muted-foreground">{children}</span>;
}

export function purposeLabel(p: string): string {
  return { business: 'Business', personal: 'Personal', entertainment: 'Entertainment', commuting: 'Commute' }[p] ?? p;
}
