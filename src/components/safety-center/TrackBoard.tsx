import { useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { StageBar, StatusPill, stageName } from './ui-bits';
import type { SafetyItem } from './types';

type Filter = 'Stalled' | 'Your move' | 'Waiting' | 'All';

export function TrackBoard({ items, onOpen }: { items: SafetyItem[]; onOpen: (i: SafetyItem) => void }) {
  const [filter, setFilter] = useState<Filter>('All');
  const stalledCount = items.filter((i) => i.stalled).length;

  let shown = items.slice();
  if (filter === 'Stalled') shown = shown.filter((i) => i.stalled);
  else if (filter === 'Your move') shown = shown.filter((i) => i.mine);
  else if (filter === 'Waiting') shown = shown.filter((i) => !i.mine);
  shown.sort((a, b) => Number(!!b.stalled) - Number(!!a.stalled));

  const chips: { key: Filter; label: string; alert?: boolean }[] = [
    { key: 'Stalled', label: `Stalled ${stalledCount}`, alert: true },
    { key: 'Your move', label: 'Your move' },
    { key: 'Waiting', label: 'Waiting on others' },
    { key: 'All', label: 'All open' },
  ];

  return (
    <div>
      <div className="flex gap-1.5 flex-wrap my-4">
        {chips.map((c) => {
          const on = filter === c.key;
          const base = 'text-xs font-medium rounded-full px-3 py-1.5 border cursor-pointer transition-colors';
          const cls = c.alert
            ? (on ? 'bg-[color:var(--gfo-error)] text-white border-[color:var(--gfo-error)]' : 'sc-red border-[color:var(--gfo-error)]')
            : (on ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:border-[color:var(--border-strong,var(--muted-foreground))]');
          return <button key={c.key} className={`${base} ${cls}`} onClick={() => setFilter(c.key)}>{c.label}</button>;
        })}
      </div>

      {shown.some((i) => i.stalled) && (
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--gfo-error)] mt-4 mb-2">
          <TriangleAlert className="w-3.5 h-3.5" /> Stalled &gt;30 days — shown first
        </div>
      )}

      {shown.length === 0 && (
        <div className="text-center text-muted-foreground text-sm py-12">
          <div className="text-[15px] text-foreground/70 font-medium mb-1">Nothing here.</div>
          Try a different filter.
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        {shown.map((i) => (
          <button key={i.id} onClick={() => onOpen(i)}
            className={`text-left bg-card rounded-[11px] px-4 py-3 border transition-shadow hover:shadow-sm ${i.stalled ? 'border-[color:var(--gfo-error)]' : 'border-border hover:border-muted-foreground/40'}`}>
            <div className="flex items-center gap-2 justify-between">
              <div className="min-w-0">
                <span className="text-[11px] text-muted-foreground font-semibold tracking-wide">{i.ref} · </span>
                <span className="text-[14.5px] font-medium text-foreground">{i.title}</span>
              </div>
              {i.status && <StatusPill tone={i.status.tone}>{i.status.label}</StatusPill>}
            </div>

            <div className="flex items-center gap-1.5 my-2 text-[11.5px] text-muted-foreground flex-wrap">
              <StageBar phaseIndex={i.phaseIndex ?? 0} stalled={i.stalled} />
              <span className="font-semibold text-foreground">{stageName(i.phaseIndex ?? 0)}</span>
              {i.ageLabel && <> · <span className={i.stalled ? 'text-[color:var(--gfo-error)] font-semibold' : ''}>{i.ageLabel}</span></>}
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap text-[12.5px] text-muted-foreground">
              <div>
                {i.mine
                  ? <span className="text-accent font-medium">Your move — {i.waitingText}</span>
                  : <>Waiting on {i.owner ? <b className="text-foreground font-medium">{i.owner}</b> : <span>mitigation</span>}{i.waitingText ? ` — ${i.waitingText}` : ''}</>}
              </div>
              <span className={`text-xs font-semibold rounded-lg px-2.5 py-1 border ${i.mine ? 'bg-accent text-accent-foreground border-accent' : 'text-accent border-accent bg-card'}`}>
                {i.nextAction ?? 'View'} →
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
