import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '../../ui/utils';
import type { LedgerRow as Row } from '../tripLedger';

/**
 * One row of the trip stock ledger (D86) — the single item primitive behind the
 * Compartment and Category lenses.
 *
 * The pre-D86 `ItemRow` showed "Aft Galley · 8 on board" as a subtitle, which put
 * the number a flight attendant actually cares about in the least prominent slot
 * on the row and repeated the compartment they were already looking at. The
 * columns say it instead: par, on board, used.
 */
export function LedgerRow({
  row,
  onIncrement,
  onDecrement,
  selected,
  starred,
  onToggleStar,
  showPar = true,
}: {
  row: Row;
  onIncrement: () => void;
  onDecrement: () => void;
  selected?: boolean;
  starred?: boolean;
  onToggleStar?: () => void;
  showPar?: boolean;
}) {
  const { item, par, used, onBoard, isEquipment } = row;

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-2.5 border-b border-border/60 transition-colors',
        used === 0 && 'opacity-70',
        selected && 'bg-primary/10 border-l-2 border-l-primary',
      )}
    >
      {onToggleStar && (
        <button
          onClick={onToggleStar}
          className="shrink-0 text-muted-foreground hover:text-amber-400 transition-colors"
          aria-label={starred ? 'Unpin item' : 'Pin item'}
        >
          <Star size={14} className={cn(starred && 'fill-amber-400 text-amber-400')} />
        </button>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{item.itemName}</p>
        {isEquipment && (
          <p className="text-xs text-muted-foreground">Equipment &middot; not consumed</p>
        )}
      </div>

      {showPar && (
        <span className="w-16 text-right text-xs text-muted-foreground shrink-0 tabular-nums">
          {par} {item.uom}
        </span>
      )}
      <span
        className={cn(
          'w-14 text-right text-sm font-semibold shrink-0 tabular-nums',
          onBoard <= 0 ? 'text-destructive' : onBoard < par ? 'text-amber-600 dark:text-amber-400' : '',
        )}
      >
        {onBoard}
      </span>
      <span
        className={cn(
          'w-10 text-right text-sm shrink-0 tabular-nums',
          used > 0 ? 'text-primary font-bold' : 'text-muted-foreground',
        )}
      >
        {used > 0 ? used : '—'}
      </span>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onDecrement}
          disabled={used === 0}
          className="w-9 h-9 rounded-md bg-muted border border-border flex items-center justify-center text-lg hover:bg-muted/80 disabled:opacity-30 transition-colors"
          aria-label={`One fewer ${item.itemName}`}
        >
          −
        </button>
        <button
          onClick={onIncrement}
          className="w-9 h-9 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-lg hover:bg-primary/90 transition-colors"
          aria-label={`One more ${item.itemName}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

/** Column captions. Rendered once per card, above the first section. */
export function LedgerHeader({ showPar = true }: { showPar?: boolean }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-muted/40">
      <span className="flex-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Item
      </span>
      {showPar && (
        <span className="w-16 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Par
        </span>
      )}
      <span className="w-14 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        On bd
      </span>
      <span className="w-10 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Used
      </span>
      <span className="w-[88px]" />
    </div>
  );
}

/** A stowage location inside a compartment, or a supply category. */
export function LedgerSectionHeader({ label, note }: { label: string; note?: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-1.5 bg-muted/60 border-b border-border">
      <span className="text-xs font-semibold uppercase tracking-wide text-primary">{label}</span>
      {note && <span className="text-xs text-muted-foreground">{note}</span>}
    </div>
  );
}
