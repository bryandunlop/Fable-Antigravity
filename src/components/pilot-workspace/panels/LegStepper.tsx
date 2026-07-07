import { Check } from 'lucide-react';
import { groupLegsByDay } from '../legContext';
import type { TripLeg } from '../../tech-log/types';

const dayLabel = (dayKey: string) =>
  new Date(`${dayKey}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/**
 * Day-grouped, horizontally-scrollable leg strip. Completed/departed legs before the current one
 * show a check; the current leg is highlighted; a saved-but-unsubmitted FRAT draft is flagged.
 * Tapping a leg selects it (shared across the Prep and Day-of tabs).
 */
export function LegStepper({
  legs, currentIndex, selectedIndex, officeTzOffsetMinutes, onSelect,
}: {
  legs: TripLeg[];
  currentIndex: number;
  selectedIndex: number;
  officeTzOffsetMinutes: number;
  onSelect: (index: number) => void;
}) {
  if (legs.length <= 1) return null;
  const groups = groupLegsByDay(legs, officeTzOffsetMinutes);
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {groups.map((g) => (
        <div key={g.dayKey} className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] text-muted-foreground pr-0.5">{dayLabel(g.dayKey)}</span>
          {g.legs.map(({ leg, index }) => {
            const selected = index === selectedIndex;
            const past = index < currentIndex;
            const draft = leg.fratStatus === 'IN_PROGRESS';
            return (
              <button
                key={leg.id}
                onClick={() => onSelect(index)}
                className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-medium min-h-[44px] transition-colors ${
                  selected ? 'border-primary bg-accent text-foreground'
                  : past ? 'border-input bg-muted text-muted-foreground'
                  : 'border-input bg-background text-foreground hover:bg-accent'
                }`}
              >
                <span className="inline-flex items-center gap-1">
                  {past && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                  L{leg.sequence}
                  {index === currentIndex && <span className="text-[10px] text-primary">· now</span>}
                </span>
                {draft && <span className="block text-[10px] text-amber-600">draft</span>}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
