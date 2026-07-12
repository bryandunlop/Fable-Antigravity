import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Flag } from 'lucide-react';
import { cn } from '../../ui/utils';
import { isFirLeadership } from '../engine/access';
import { firInProgressSummary, readFirState, type FirInProgressSummary } from '../engine/select';

/** Relative "time ago" — kept local; the app has no shared formatter for this. */
function ago(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  return `${Math.round(hrs / 24)} d ago`;
}

function compute(): FirInProgressSummary {
  if (typeof localStorage === 'undefined') return { count: 0 };
  return firInProgressSummary(readFirState(localStorage).firs);
}

/** Leadership-only "FIRs in progress" strip for landing surfaces (§9). Rendered
 * OUTSIDE FirProvider, so it reads the FIR store read-only via the select helper —
 * the same contributor pattern the notifications feed uses. Renders nothing for
 * non-leadership viewers, so it is safe to drop onto any dashboard. */
export function FirLeadershipChip({ roles, className }: { roles: string[]; className?: string }) {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<FirInProgressSummary>(compute);

  useEffect(() => {
    const recompute = () => setSummary(compute());
    recompute();
    window.addEventListener('focus', recompute);
    window.addEventListener('storage', recompute);
    const t = setInterval(recompute, 30_000);
    return () => {
      window.removeEventListener('focus', recompute);
      window.removeEventListener('storage', recompute);
      clearInterval(t);
    };
  }, []);

  if (!isFirLeadership(roles) || summary.count === 0) return null;

  return (
    <button
      type="button"
      onClick={() => navigate('/fir')}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left shadow-sm transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        className,
      )}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
        <Flag className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-sm font-semibold">
          {summary.count} Flight Irregularity Report{summary.count === 1 ? '' : 's'} in progress
        </span>
        <span className="block text-xs text-muted-foreground">
          {summary.latestAtUtc ? `Latest activity ${ago(summary.latestAtUtc)}` : 'Awaiting activity'} · leadership view
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}
