import { Search } from 'lucide-react';
import { Switch } from '../../ui/switch';
import { FLEET } from '../mockData';

export const HORIZON_PRESETS = [14, 30, 60, 90] as const;

/** Shared filter bar — one filter state applied to whichever view is active. */
export function FilterBar({
  searchTerm,
  onSearch,
  tailFilter,
  onToggleTail,
  actionRequiredOnly,
  onActionRequired,
  horizonDays,
  onHorizon,
}: {
  searchTerm: string;
  onSearch: (s: string) => void;
  tailFilter: Set<string>;
  onToggleTail: (tail: string) => void;
  actionRequiredOnly: boolean;
  onActionRequired: (v: boolean) => void;
  horizonDays: number;
  onHorizon: (d: number) => void;
}) {
  return (
    <div className="bg-white border-b border-slate-200 px-10 py-3 flex flex-wrap items-center gap-4 sticky top-0 z-30 shadow-sm">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <input
          value={searchTerm}
          onChange={e => onSearch(e.target.value)}
          placeholder="Trip, client, tail, route…"
          className="pl-9 pr-3 py-2 w-64 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
        />
      </div>

      <div className="flex gap-1.5">
        {FLEET.map(ac => (
          <button key={ac.tail} onClick={() => onToggleTail(ac.tail)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${tailFilter.has(ac.tail) ? 'bg-slate-900 text-white border-slate-900 shadow' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}>
            {ac.tail}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Horizon</span>
        <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
          {HORIZON_PRESETS.map(d => (
            <button key={d} onClick={() => onHorizon(d)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-colors ${horizonDays === d ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <Switch id="action-req" checked={actionRequiredOnly} onCheckedChange={onActionRequired} className="data-[state=checked]:bg-rose-500" />
        <label htmlFor="action-req" className="text-[10px] font-black uppercase tracking-widest text-slate-600 cursor-pointer select-none">Action Required</label>
      </div>
    </div>
  );
}
