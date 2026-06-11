import type { ReactNode } from 'react';
import { cn } from '../ui/utils';
import { GFO_STATUS_CLASS, type GfoStatus } from './status';

type GfoAccent = 'midnight' | 'daylight' | 'sunrise';

const ACCENT_CLASS: Record<GfoAccent, string> = {
  midnight: 'border-t-gfo-midnight dark:border-t-gfo-daylight',
  daylight: 'border-t-gfo-daylight',
  sunrise: 'border-t-gfo-sunrise',
};

export interface GfoTrend {
  direction: 'up' | 'down' | 'flat';
  label: string;
  tone?: GfoStatus;
}

const TREND_ARROW: Record<GfoTrend['direction'], string> = { up: '▲', down: '▼', flat: '—' };
const DEFAULT_TONE: Record<GfoTrend['direction'], GfoStatus> = { up: 'success', down: 'error', flat: 'neutral' };

interface GfoStatCardProps {
  label: string;
  value: ReactNode;
  unit?: string;
  trend?: GfoTrend;
  accent?: GfoAccent;
  onClick?: () => void;
  className?: string;
}

export function GfoStatCard({ label, value, unit, trend, accent = 'midnight', onClick, className }: GfoStatCardProps) {
  const tone = trend ? (trend.tone ?? DEFAULT_TONE[trend.direction]) : undefined;
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      className={cn(
        'rounded-lg border border-border border-t-[3px] bg-card p-4 shadow-sm',
        ACCENT_CLASS[accent],
        onClick &&
          'cursor-pointer transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        className,
      )}
    >
      {/* text-muted-foreground intentionally overrides gfo-eyebrow's primary color in this context */}
      <div className="gfo-eyebrow text-muted-foreground">{label}</div>
      <div className="gfo-numeric mt-2 text-3xl text-primary dark:text-foreground">
        {value}
        {unit && <span className="ml-1 text-sm font-normal tracking-normal text-muted-foreground">{unit}</span>}
      </div>
      {trend && tone && (
        <span className={cn('status-badge mt-3 inline-flex items-center gap-1', GFO_STATUS_CLASS[tone])}>
          <span aria-hidden="true">{TREND_ARROW[trend.direction]}</span>
          {trend.label}
        </span>
      )}
    </div>
  );
}
