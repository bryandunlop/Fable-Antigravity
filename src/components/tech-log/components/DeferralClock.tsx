import { useEffect, useState } from 'react';
import { readDeferralClock, type ClockTone } from '../engine/deferralClock';
import type { MelCategory } from '../types';
import { cn } from '../../ui/utils';

/**
 * Re-renders on a cadence so a rendered clock reflects the passage of time instead of
 * freezing at first paint. One minute is ample — the label's finest unit is hours.
 */
function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/**
 * These ARE the RAG hues (`--gfo-warning` / `--gfo-error` — the same values behind
 * ServiceabilityChip's `status-*` classes), used here deliberately. Ratified by Bryan
 * 2026-07-14 (see D31): the ring and the chip *agree* rather than compete — an ACTIVE
 * deferral is AMBER and its clock running out is amber; an expired deferral re-grounds
 * the aircraft, so red is literally true at EXPIRED.
 *
 * What separates the two axes here is SHAPE, not hue: this is a thin ring, the
 * serviceability claim is a filled pill. Do not "fix" this into `status-*` classes —
 * that would make it a serviceability claim, which it is not. And do not read this as
 * licence to put RAG hues on other non-RAG axes: the custody axis retired gold
 * precisely for colliding with amber (index.css:521-525).
 *
 * The URGENT threshold is scaled per MEL category (URGENT_WINDOW_DAYS in the engine) —
 * Bryan, 2026-07-14. It was previously a flat 2 days, which made a Cat B (3-day)
 * deferral amber for two-thirds of its life, where the ring added nothing over the chip.
 */
const TONE: Record<ClockTone, { stroke: string; text: string }> = {
  NORMAL: { stroke: 'var(--muted-foreground)', text: 'text-muted-foreground' },
  URGENT: { stroke: 'var(--gfo-warning, #F1B434)', text: 'text-[var(--gfo-warning-ink,#8A6200)]' },
  EXPIRED: { stroke: 'var(--gfo-error, #EF3340)', text: 'text-[var(--gfo-error-ink,#C81E2B)]' },
};

const R = 7;
const CIRCUMFERENCE = 2 * Math.PI * R;

export function DeferralClock({
  clockStartUtc,
  repairDueUtc,
  category,
  className,
  showLabel = true,
  size = 'sm',
}: {
  clockStartUtc: string;
  repairDueUtc?: string;
  /** Selects the urgency threshold — a Cat B and a Cat D do not go amber at the same remaining time. */
  category: MelCategory;
  className?: string;
  showLabel?: boolean;
  /**
   * LG-155 — `lg` is for the ONE place per screen where remaining time is the headline rather than a
   * detail (today: the fleet tile). Do not reach for it on list rows: if every clock is prominent then
   * none of them is, which is precisely the failure this size exists to correct.
   */
  size?: 'sm' | 'lg';
}) {
  const now = useNow();
  const reading = readDeferralClock(clockStartUtc, repairDueUtc, now, category);

  // Usage-based or unparseable: nothing calendar-based to drain. Render nothing rather
  // than an empty ring implying a calendar interval that does not exist.
  if (!reading) return null;

  const { fractionElapsed, tone, label } = reading;
  const tokens = TONE[tone];

  return (
    <span
      className={cn('inline-flex items-center gap-1.5', className)}
      title={tone === 'EXPIRED' ? 'Repair interval elapsed' : `${label} of the repair interval`}
    >
      <svg
        viewBox="0 0 18 18"
        className={cn('shrink-0 -rotate-90', size === 'lg' ? 'h-8 w-8' : 'h-4 w-4')}
        aria-hidden="true"
      >
        <circle cx="9" cy="9" r={R} fill="none" stroke="currentColor" strokeWidth="2" className="opacity-15" />
        <circle
          cx="9"
          cy="9"
          r={R}
          fill="none"
          stroke={tokens.stroke}
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - fractionElapsed)}
          className="transition-[stroke-dashoffset] duration-500 motion-reduce:transition-none"
        />
      </svg>
      {showLabel && (
        <span
          className={cn(
            'whitespace-nowrap tabular-nums',
            size === 'lg' ? 'text-lg font-medium leading-none' : 'text-xs',
            tokens.text,
          )}
        >
          {label}
        </span>
      )}
    </span>
  );
}
