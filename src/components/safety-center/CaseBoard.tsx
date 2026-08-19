// The board shape (D85 · C4). Cases as cards in columns, so a safety manager
// can see the shape of the pile rather than read it.
//
// Columns are AGE buckets, one axis only. The artboard sketched a fourth "No
// owner" column, which mixes axes — a case can be both a week old and unowned,
// so it belongs in two columns at once. Ownership is a marker on the card
// instead, and for Triage it is redundant anyway: nothing at the SUBMITTED
// stage has an owner yet.

import { TriangleAlert } from 'lucide-react';
import { StatusPill, TypeLabel } from './ui-bits';
import type { SafetyItem } from './types';

export interface BoardColumn {
  key: string;
  label: string;
  items: SafetyItem[];
}

/** Age buckets, oldest LAST — reading order matches "what arrived when", and the
 *  rot accumulates on the right where it is visible rather than scrolled past.
 *  An item with no age at all lands in Today rather than being dropped. */
export function groupByAge(items: SafetyItem[]): BoardColumn[] {
  const bucket = (i: SafetyItem): string => {
    const d = i.ageDays ?? 0;
    if (d <= 0) return 'today';
    if (d <= 7) return 'week';
    if (d <= 30) return 'month';
    return 'older';
  };
  const defs: [string, string][] = [
    ['today', 'Today'], ['week', 'This week'], ['month', 'This month'], ['older', 'Over 30 days'],
  ];
  return defs.map(([key, label]) => ({
    key,
    label,
    // Oldest first inside a column, so the worst case in each bucket is on top.
    items: items.filter((i) => bucket(i) === key).sort((a, b) => (b.ageDays ?? 0) - (a.ageDays ?? 0)),
  }));
}

/** Due-date buckets, most urgent FIRST — the reverse of the age board, because
 *  here the thing you must not miss is the overdue one, and it belongs where the
 *  eye lands first. Anything with no due date gets its own column rather than
 *  being silently sorted in among dated work. */
export function groupByDue(items: SafetyItem[]): BoardColumn[] {
  const bucket = (i: SafetyItem): string => {
    const d = i.dueDays;
    if (d === undefined) return 'undated';
    if (d < 0) return 'overdue';
    if (d <= 7) return 'week';
    if (d <= 30) return 'month';
    return 'later';
  };
  const defs: [string, string][] = [
    ['overdue', 'Overdue'], ['week', 'Due this week'], ['month', 'Due this month'],
    ['later', 'Later'], ['undated', 'No due date'],
  ];
  return defs.map(([key, label]) => ({
    key,
    label,
    // Soonest first inside a column: the most overdue sits on top of Overdue.
    items: items.filter((i) => bucket(i) === key)
      .sort((a, b) => (a.dueDays ?? Number.MAX_SAFE_INTEGER) - (b.dueDays ?? Number.MAX_SAFE_INTEGER)),
  }));
}

function CaseCard({ item, onOpen, showDue }: { item: SafetyItem; onOpen: (i: SafetyItem) => void; showDue?: boolean }) {
  return (
    <button onClick={() => onOpen(item)}
      className="w-full text-left bg-card border border-border rounded-lg p-3 flex flex-col gap-2 cursor-pointer transition-all hover:border-muted-foreground/40 hover:shadow-sm active:scale-[.995] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1">
      <div className="flex items-center gap-2">
        <TypeLabel>{item.type}</TypeLabel>
        <div className="flex-1" />
        {item.stalled && <TriangleAlert className="w-3.5 h-3.5 text-[color:var(--gfo-error-ink)] shrink-0" />}
        {showDue && item.dueDays != null ? (
          <span className={`text-[11.5px] font-semibold whitespace-nowrap ${item.dueDays < 0 ? 'text-[color:var(--gfo-error-ink)]' : item.dueDays <= 7 ? 'text-[color:var(--gfo-warning-ink)]' : 'text-muted-foreground'}`}>
            {item.dueDays < 0 ? `${-item.dueDays}d over` : item.dueDays === 0 ? 'Due today' : `${item.dueDays}d left`}
          </span>
        ) : item.ageDays != null && (
          <span className={`text-[11.5px] font-semibold tabular-nums ${item.stalled ? 'text-[color:var(--gfo-error-ink)]' : 'text-muted-foreground'}`}>
            {item.ageDays}d
          </span>
        )}
      </div>

      <div className="text-[13.5px] font-medium leading-snug line-clamp-3">{item.title}</div>
      {item.sub && <div className="text-[12px] text-muted-foreground line-clamp-1">{item.sub}</div>}

      <div className="flex items-center gap-2 flex-wrap">
        {item.status && <StatusPill tone={item.status.tone}>{item.status.label}</StatusPill>}
        <div className="flex-1" />
        {item.owner
          ? <span className="text-[11.5px] text-muted-foreground truncate max-w-[92px]">{item.owner}</span>
          : <span className="text-[11.5px] text-muted-foreground/70 italic">Unowned</span>}
      </div>
    </button>
  );
}

export function CaseBoard({ items, onOpen, grouping = 'age' }: {
  items: SafetyItem[]; onOpen: (i: SafetyItem) => void; grouping?: 'age' | 'due';
}) {
  const columns = grouping === 'due' ? groupByDue(items) : groupByAge(items);

  if (!items.length) {
    return (
      <div className="text-center py-12">
        <div className="text-[16px] text-foreground/70 font-medium mb-1">Nothing here.</div>
        <div className="text-[14px] text-muted-foreground">No cases at this stage right now.</div>
      </div>
    );
  }

  return (
    // The board scrolls horizontally rather than squeezing four columns into
    // whatever is left after two rails — a 150px column is not a card.
    <div className="mt-4 -mx-1 px-1 overflow-x-auto">
      <div className="flex gap-3 min-w-[720px]">
        {columns.map((col) => (
          <div key={col.key} className="flex-1 min-w-[168px] flex flex-col gap-2">
            <div className="flex items-baseline gap-2 px-0.5">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{col.label}</span>
              <span className="text-[12px] font-semibold text-muted-foreground tabular-nums">{col.items.length}</span>
            </div>
            <div className="bg-muted/50 rounded-lg p-2 flex flex-col gap-2 min-h-[120px]">
              {col.items.map((i) => <CaseCard key={i.id} item={i} onOpen={onOpen} showDue={grouping === 'due'} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
