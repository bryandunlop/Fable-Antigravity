import { useEffect, useState } from 'react';
import { readDeferralClock, type ClockTone } from '../engine/deferralClock';
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
 * Known wart, accepted: with an absolute URGENT window (below), a Cat B (3-day)
 * deferral reads amber for most of its life, where the ring adds little over the chip.
 * That is a symptom of the absolute-vs-proportional question, which is a DOM call.
 */
const TONE: Record<ClockTone, { stroke: string; text: string }> = {
  NORMAL: { stroke: 'var(--muted-foreground)', text: 'text-muted-foreground' },
  URGENT: { stroke: 'var(--gfo-warning, #F1B434)', text: 'text-[var(--gfo-warning,#F1B434)]' },
  EXPIRED: { stroke: 'var(--gfo-error, #EF3340)', text: 'text-[var(--gfo-error,#EF3340)]' },
};

const R = 7;
const CIRCUMFERENCE = 2 * Math.PI * R;

export function DeferralClock({
  clockStartUtc,
  repairDueUtc,
  className,
  showLabel = true,
}: {
  clockStartUtc: string;
  repairDueUtc?: string;
  className?: string;
  showLabel?: boolean;
}) {
  const now = useNow();
  const reading = readDeferralClock(clockStartUtc, repairDueUtc, now);

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
      <svg viewBox="0 0 18 18" className="h-4 w-4 shrink-0 -rotate-90" aria-hidden="true">
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
      {showLabel && <span className={cn('whitespace-nowrap text-xs tabular-nums', tokens.text)}>{label}</span>}
    </span>
  );
}
