import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { TypeLabel, StatusPill } from './ui-bits';
import type { SafetyItem, SafetyItemType } from './types';

const TYPES: (SafetyItemType | 'All')[] = ['All', 'HAZARD', 'ASAP', 'FRAT', 'GRAT', 'WAIVER', 'AUDIT', 'CWS'];

export function SubmissionsArchive({ items, onOpen }: { items: SafetyItem[]; onOpen: (i: SafetyItem) => void }) {
  const [q, setQ] = useState('');
  const [type, setType] = useState<SafetyItemType | 'All'>('All');

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((i) => {
      if (type !== 'All' && i.type !== type) return false;
      if (!needle) return true;
      const hay = [i.title, i.ref, i.submittedBy, i.tail, i.type, i.status?.label].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(needle);
    });
  }, [items, q, type]);

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 bg-card border border-border rounded-[10px] px-3 h-10 mb-3">
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search every submission — title, tail, reporter, ref…"
          className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground" />
        {q && <button onClick={() => setQ('')} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>}
      </div>

      <div className="flex gap-1.5 flex-wrap mb-3">
        {TYPES.map((t) => (
          <button key={t} onClick={() => setType(t)}
            className={`text-xs font-medium rounded-full px-3 py-1.5 border transition-colors ${type === t ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:border-muted-foreground/40'}`}>
            {t === 'All' ? 'All types' : t.charAt(0) + t.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between px-0.5 mb-2">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{filtered.length} record{filtered.length === 1 ? '' : 's'}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <div className="text-[15px] text-foreground/70 font-medium mb-1">No matches.</div>
          <div className="text-sm">Try a different search or type filter.</div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((i) => (
            <button key={i.id} onClick={() => onOpen(i)}
              className="text-left grid grid-cols-[70px_1fr_auto] gap-3.5 items-center bg-card border border-border rounded-[10px] px-4 py-3 hover:border-muted-foreground/40 hover:shadow-sm transition-all">
              <TypeLabel>{i.type}</TypeLabel>
              <div className="min-w-0">
                <div className="text-[14.5px] text-foreground truncate">{i.title}</div>
                <div className="text-[12px] text-muted-foreground mt-0.5 flex gap-2 flex-wrap">
                  {i.ref && <span>{i.ref}</span>}
                  {i.submittedBy && <span>· {i.submittedBy}</span>}
                  {i.tail && <span>· {i.tail}</span>}
                  {i.date && <span>· {i.date}</span>}
                </div>
              </div>
              {i.status && <StatusPill tone={i.status.tone}>{i.status.label}</StatusPill>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
