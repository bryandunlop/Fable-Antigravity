import { Search } from 'lucide-react';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import type { FleetAircraft } from './fleet';
import type { TripType } from '../../scheduling/engine';

const TRIP_TYPE_OPTIONS: [TripType, string][] = [
  ['domestic', 'Domestic'],
  ['international', "Int'l"],
  ['dca_dassp', 'DASSP'],
];

export const HORIZON_PRESETS = [14, 30, 60, 90] as const;

/** Shared filter bar — one filter state applied to whichever Schedule/Action view is active. */
export function FilterBar({
  fleet,
  searchTerm,
  onSearch,
  tailFilter,
  onToggleTail,
  tripTypeFilter,
  onToggleTripType,
  actionRequiredOnly,
  onActionRequired,
  horizonDays,
  onHorizon,
}: {
  fleet: FleetAircraft[];
  searchTerm: string;
  onSearch: (s: string) => void;
  tailFilter: Set<string>;
  onToggleTail: (tail: string) => void;
  tripTypeFilter: Set<TripType>;
  onToggleTripType: (t: TripType) => void;
  actionRequiredOnly: boolean;
  onActionRequired: (v: boolean) => void;
  horizonDays: number;
  onHorizon: (d: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={e => onSearch(e.target.value)}
          placeholder="Search route, tail, trip…"
          className="pl-8 h-9 w-60"
        />
      </div>

      <div className="flex gap-1">
        {fleet.map(ac => (
          <button key={ac.tail} onClick={() => onToggleTail(ac.tail)}
            className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${tailFilter.has(ac.tail) ? 'bg-foreground text-background border-foreground' : 'bg-background text-muted-foreground border-border hover:text-foreground hover:bg-accent'}`}>
            {ac.tail}
          </button>
        ))}
      </div>

      <div className="flex gap-1">
        {TRIP_TYPE_OPTIONS.map(([value, label]) => (
          <button key={value} onClick={() => onToggleTripType(value)}
            className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${tripTypeFilter.has(value) ? 'bg-foreground text-background border-foreground' : 'bg-background text-muted-foreground border-border hover:text-foreground hover:bg-accent'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <span className="text-xs text-muted-foreground">Horizon</span>
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
        <Switch id="action-req" checked={actionRequiredOnly} onCheckedChange={onActionRequired} />
        <label htmlFor="action-req" className="text-xs font-medium text-muted-foreground cursor-pointer select-none">Action required only</label>
      </div>
    </div>
  );
}
