import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import type { FleetAircraft } from './fleet';
import type { TripType } from '../../scheduling/engine';

const TRIP_TYPE_OPTIONS: [TripType, string][] = [
  ['domestic', 'Domestic'],
  ['international', "Int'l"],
  ['dca_dassp', 'DASSP'],
];

export const HORIZON_PRESETS = [14, 30, 60, 90] as const;

/**
 * Shared filter bar, folded (D87 declutter): tails and types live in a popover with per-choice
 * trip counts; only ACTIVE selections render on the bar, as removable chips. "Hide cleared" is
 * the work-ahead switch — it hides only trips with nothing left to do, never open work that
 * merely isn't due yet (Bryan 2026-08-19: schedulers clear ahead of due dates).
 */
export function FilterBar({
  fleet,
  counts,
  searchTerm,
  onSearch,
  tailFilter,
  onToggleTail,
  tripTypeFilter,
  onToggleTripType,
  hideCleared,
  onHideCleared,
  horizonDays,
  onHorizon,
}: {
  fleet: FleetAircraft[];
  counts: { byTail: Map<string, number>; byType: Map<TripType, number> };
  searchTerm: string;
  onSearch: (s: string) => void;
  tailFilter: Set<string>;
  onToggleTail: (tail: string) => void;
  tripTypeFilter: Set<TripType>;
  onToggleTripType: (t: TripType) => void;
  hideCleared: boolean;
  onHideCleared: (v: boolean) => void;
  horizonDays: number;
  onHorizon: (d: number) => void;
}) {
  const activeCount = tailFilter.size + tripTypeFilter.size;
  const typeLabel = (t: TripType) => TRIP_TYPE_OPTIONS.find(([v]) => v === t)?.[1] ?? t;

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={e => onSearch(e.target.value)}
          placeholder="Search route, tail, trip…"
          className="pl-8 h-9 w-60"
        />
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 text-muted-foreground">
            <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
            Filter
            {activeCount > 0 && (
              <span className="ml-1.5 rounded-full bg-foreground text-background text-[10px] font-semibold px-1.5 py-px">{activeCount}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-3 space-y-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Aircraft</div>
            <div className="flex flex-wrap gap-1">
              {fleet.map(ac => (
                <button key={ac.tail} onClick={() => onToggleTail(ac.tail)}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${tailFilter.has(ac.tail) ? 'bg-foreground text-background border-foreground' : 'bg-background text-muted-foreground border-border hover:text-foreground hover:bg-accent'}`}>
                  {ac.tail}
                  <span className={tailFilter.has(ac.tail) ? 'opacity-70' : 'text-muted-foreground/70'}> · {counts.byTail.get(ac.tail) ?? 0}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Trip type</div>
            <div className="flex flex-wrap gap-1">
              {TRIP_TYPE_OPTIONS.map(([value, label]) => (
                <button key={value} onClick={() => onToggleTripType(value)}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${tripTypeFilter.has(value) ? 'bg-foreground text-background border-foreground' : 'bg-background text-muted-foreground border-border hover:text-foreground hover:bg-accent'}`}>
                  {label}
                  <span className={tripTypeFilter.has(value) ? 'opacity-70' : 'text-muted-foreground/70'}> · {counts.byType.get(value) ?? 0}</span>
                </button>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active selections only — removable in place */}
      {[...tailFilter].map(tail => (
        <button key={tail} onClick={() => onToggleTail(tail)}
          className="inline-flex items-center gap-1 rounded-full bg-foreground text-background text-xs font-medium pl-2.5 pr-1.5 py-1">
          {tail} <X className="h-3 w-3 opacity-70" />
        </button>
      ))}
      {[...tripTypeFilter].map(t => (
        <button key={t} onClick={() => onToggleTripType(t)}
          className="inline-flex items-center gap-1 rounded-full bg-foreground text-background text-xs font-medium pl-2.5 pr-1.5 py-1">
          {typeLabel(t)} <X className="h-3 w-3 opacity-70" />
        </button>
      ))}

      <div className="flex items-center gap-2 ml-auto">
        <span className="text-xs text-muted-foreground">Window</span>
        <div className="flex bg-muted rounded-lg p-0.5 gap-0.5">
          {HORIZON_PRESETS.map(d => (
            <button key={d} onClick={() => onHorizon(d)}
              className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${horizonDays === d ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch id="hide-cleared" checked={hideCleared} onCheckedChange={onHideCleared} />
        <label htmlFor="hide-cleared" className="text-xs font-medium text-muted-foreground cursor-pointer select-none">Hide cleared</label>
      </div>
    </div>
  );
}
