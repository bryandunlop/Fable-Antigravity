// The month strip: navigation, not a second view. One click per month, each carrying the
// average free-per-day so she can aim at a month before she arrives in it.
//
// Deliberately not a mini-calendar and not a second scale to learn — the hub has one
// view, and this is how you move it.

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../ui/utils';
import type { MonthFreeCounts } from '../hooks/useFreeCounts';
import { monthKey } from '../hooks/useFreeCounts';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function MonthStrip({
  months,
  current,
  counts,
  onPick,
}: {
  months: { year: number; month: number }[];
  current: { year: number; month: number };
  counts: Record<string, MonthFreeCounts>;
  onPick: (m: { year: number; month: number }) => void;
}) {
  const index = months.findIndex(m => m.year === current.year && m.month === current.month);
  const step = (delta: number) => {
    const next = months[index + delta];
    if (next) onPick(next);
  };

  return (
    <div className="flex items-stretch gap-1">
      <button
        type="button"
        aria-label="Previous month"
        disabled={index <= 0}
        onClick={() => step(-1)}
        className="rounded-md border px-1.5 text-muted-foreground disabled:opacity-30 hover:bg-muted/50"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="flex flex-1 gap-1 overflow-x-auto">
        {months.map(m => {
          const key = monthKey(m.year, m.month);
          const c = counts[key];
          const active = m.year === current.year && m.month === current.month;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onPick(m)}
              aria-current={active ? 'true' : undefined}
              className={cn(
                'min-w-[76px] shrink-0 rounded-md border px-2 py-1.5 text-left transition-colors',
                active
                  ? 'border-[var(--gfo-daylight,#0096FC)] bg-[color-mix(in_srgb,var(--gfo-daylight,#0096FC)_8%,transparent)]'
                  : 'hover:bg-muted/40',
              )}
            >
              <span className="block text-xs font-semibold">
                {MONTHS[m.month]} {m.year === months[0].year ? '' : `’${String(m.year).slice(2)}`}
              </span>
              <span
                className={cn(
                  'block text-[11px] tabular-nums text-muted-foreground',
                  // Far-out months rest on a roster nobody has published. Rendering them at
                  // full strength would state a fact we do not have.
                  c?.provisional && 'opacity-60',
                )}
              >
                {c ? `${c.average} free/day` : '—'}
                {c?.provisional && <span className="ml-0.5" title="Beyond the published crew roster">*</span>}
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        aria-label="Next month"
        disabled={index < 0 || index >= months.length - 1}
        onClick={() => step(1)}
        className="rounded-md border px-1.5 text-muted-foreground disabled:opacity-30 hover:bg-muted/50"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
