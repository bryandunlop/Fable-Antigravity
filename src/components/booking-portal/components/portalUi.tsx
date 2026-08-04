// Small shared presentation pieces for the portal shell. Chip colors follow
// the design frames: Daylight for informational, Sunrise gold for "your own
// things", semantic green/amber/red for valid/flag/block.

import type { ReactNode } from 'react';
import { cn } from '../../ui/utils';

export type ChipTone = 'info' | 'gold' | 'ok' | 'flag' | 'block' | 'neutral';

const TONE_CLASSES: Record<ChipTone, string> = {
  info: 'bg-[#0096FC]/10 text-[#0077CC] dark:text-[#4FB6FD]',
  gold: 'bg-[#D1AC6B]/15 text-[#8A6A24] dark:text-[#D1AC6B]',
  ok: 'bg-[#00B140]/10 text-[#008130] dark:text-[#34C46A]',
  flag: 'bg-[#F1B434]/15 text-[#8A5B00] dark:text-[#F1B434]',
  block: 'bg-destructive/10 text-destructive',
  neutral: 'bg-muted text-muted-foreground border border-border',
};

export function Chip({ tone = 'neutral', children, className }: { tone?: ChipTone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-block whitespace-nowrap px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{children}</p>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('border border-border bg-card shadow-sm', className)}>{children}</div>;
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
          {i > 0 && <span className={cn('h-0.5 w-8', i <= activeIndex ? 'bg-[#0096FC]' : 'bg-border')} />}
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
                i < activeIndex && 'border-[#0096FC] bg-[#0096FC]',
                i === activeIndex && 'border-[#0096FC] bg-background',
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
  return <span className="text-[11.5px] text-muted-foreground/80">{children}</span>;
}

export function purposeLabel(p: string): string {
  return { business: 'Business', personal: 'Personal', entertainment: 'Entertainment', commuting: 'Commute' }[p] ?? p;
}
