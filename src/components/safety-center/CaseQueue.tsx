// The queue shape (D85 · C4) — one thing at a time, in order.
//
// Extracted from the console's old MoveList so both Triage and Mitigate can use
// it, and so the board is a peer of something real rather than the only shape
// with a component. Behaviour is unchanged from MoveList: a clickable row that
// also carries a check-off control.

import { Check, ChevronRight } from 'lucide-react';
import { StatusPill } from './ui-bits';
import type { SafetyItem } from './types';

/** Ordering: overdue-most first where the item carries a due date, then oldest
 *  first. Stalled cases float above everything — a queue that buries the rot
 *  under fresh arrivals is the tab row we just removed, in list form. */
export function queueOrder(items: SafetyItem[]): SafetyItem[] {
  return items.slice().sort((a, b) => {
    if (!!a.stalled !== !!b.stalled) return a.stalled ? -1 : 1;
    return (b.ageDays ?? 0) - (a.ageDays ?? 0);
  });
}

interface Props {
  items: SafetyItem[];
  doneSet: Set<string>;
  onToggle: (id: string) => void;
  onOpen: (i: SafetyItem) => void;
  emptyBig?: string;
  emptySmall?: string;
}

export function CaseQueue({ items, doneSet, onToggle, onOpen, emptyBig, emptySmall }: Props) {
  if (!items.length) {
    return (
      <div className="text-center py-12">
        <div className="text-[16px] text-foreground/70 font-medium mb-1">{emptyBig ?? "You're all caught up."}</div>
        <div className="text-[14px] text-muted-foreground max-w-md mx-auto">{emptySmall ?? 'Nothing here needs you right now.'}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 mt-4">
      {queueOrder(items).map((i) => {
        const done = doneSet.has(i.id);
        return (
          // A clickable row that also contains a checkbox button, so it stays a
          // div with an explicit button role + keyboard handler (a <button>
          // cannot nest the checkbox <button>).
          <div key={i.id} role="button" tabIndex={0} onClick={() => onOpen(i)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(i); } }}
            className={`flex items-center gap-3 bg-card border border-border rounded-lg pl-2 pr-4 py-2.5 min-h-[60px] cursor-pointer transition-all hover:border-muted-foreground/40 hover:shadow-sm active:scale-[.995] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 ${done ? 'opacity-50' : ''}`}>
            {/* 44px hit area around a 24px checkbox */}
            <button onClick={(e) => { e.stopPropagation(); onToggle(i.id); }} aria-label={done ? 'Mark not done' : 'Mark done'}
              className="w-11 h-11 grid place-items-center shrink-0 rounded-lg hover:bg-muted/60 transition-colors">
              <span className={`w-6 h-6 rounded-sm border-2 grid place-items-center transition-colors ${done ? 'bg-[color:var(--gfo-success)] border-[color:var(--gfo-success)] text-white' : 'border-muted-foreground/40 text-transparent'}`}>
                <Check className="w-3.5 h-3.5" />
              </span>
            </button>

            <div className={`flex-1 min-w-0 ${done ? 'line-through text-muted-foreground' : ''}`}>
              <div className="text-[15px] text-foreground">{i.title}</div>
              <div className="text-[12.5px] text-muted-foreground mt-0.5 flex gap-2 flex-wrap items-center">
                {i.sub && <span>{i.sub}</span>}
                {i.ageDays != null && <span className={i.stalled ? 'text-[color:var(--gfo-error-ink)] font-semibold' : ''}>{i.ageDays}d</span>}
                {i.owner && <span>· {i.owner}</span>}
              </div>
            </div>

            {i.status && <StatusPill tone={i.status.tone}>{i.status.label}</StatusPill>}
            {i.due && (
              <span className={`text-[13px] font-semibold whitespace-nowrap ${
                i.due.tone === 'red' ? 'text-[color:var(--gfo-error-ink)]'
                : i.due.tone === 'amber' ? 'text-[color:var(--gfo-warning-ink)]'
                : 'text-muted-foreground'}`}>{i.due.label}</span>
            )}
            <ChevronRight className="w-5 h-5 text-muted-foreground/60 shrink-0" />
          </div>
        );
      })}
    </div>
  );
}
