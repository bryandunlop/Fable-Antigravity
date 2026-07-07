// src/components/inventory-v2/shared/ItemCard.tsx
import { useState } from 'react';
import { Check, Minus, Plus } from 'lucide-react';
import ItemThumbnail from './ItemThumbnail';
import { getSoonestExpiry, type CommissaryItem } from '../commissaryUtils';
import type { StockBatch } from '../types';

interface ItemCardProps {
  item: CommissaryItem;   // includes .stockroom
  batches: StockBatch[];  // this item's batches, for the expiry badge
  onOpen: () => void;
  onQtyChange: (newQty: number) => void;
  selectable?: boolean;       // in selection mode, tapping toggles instead of opening
  selected?: boolean;         // current selection state
  onToggleSelect?: () => void;
}

export default function ItemCard({
  item, batches, onOpen, onQtyChange, selectable = false, selected = false, onToggleSelect,
}: ItemCardProps) {
  const [stepperOpen, setStepperOpen] = useState(false);
  const sr = item.stockroom;
  const qty = sr?.qtyOnHand ?? 0;
  const low = !!sr && qty < sr.parLevel;
  const expiry = getSoonestExpiry(batches);

  const cardBody = (
    <>
      <div className="flex h-24 items-center justify-center rounded-t-lg bg-muted">
        <ItemThumbnail name={item.itemName} url={item.thumbnailUrl} size={64} />
      </div>
      <div className="px-3 pt-2">
        <div className="truncate text-sm font-medium text-foreground">{item.itemName}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
          {low && <span className="status-error rounded px-1.5 py-0.5">Low</span>}
          {expiry.status === 'expiring-soon' && (
            <span className="status-warning rounded px-1.5 py-0.5">Expiring</span>
          )}
          {expiry.status === 'expired' && (
            <span className="status-error rounded px-1.5 py-0.5">Expired</span>
          )}
        </div>
      </div>
    </>
  );

  if (selectable) {
    return (
      <button
        type="button"
        onClick={onToggleSelect}
        aria-pressed={selected}
        className={`relative block w-full rounded-lg border bg-card text-left shadow-sm transition-shadow hover:shadow-md ${
          selected ? 'border-primary ring-2 ring-primary' : 'border-border'
        }`}
      >
        <span
          className={`absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border ${
            selected
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-card/80 text-transparent'
          }`}
        >
          <Check className="h-4 w-4" />
        </span>
        {cardBody}
        <div className="px-3 pb-2 pt-1 text-sm text-muted-foreground">
          <span className="font-semibold tabular-nums text-foreground">{qty}</span> {item.uom}
        </div>
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      <button type="button" onClick={onOpen} className="block w-full text-left">
        {cardBody}
      </button>
      <div className="px-3 pb-2 pt-1">
        {stepperOpen ? (
          <div className="flex items-center justify-between">
            <button
              type="button"
              aria-label="Decrease quantity"
              className="rounded-md border border-border p-1.5 hover:bg-muted"
              onClick={() => onQtyChange(Math.max(0, qty - 1))}
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="text-base font-semibold tabular-nums"
              onClick={() => setStepperOpen(false)}
            >
              {qty}
            </button>
            <button
              type="button"
              aria-label="Increase quantity"
              className="rounded-md border border-border p-1.5 hover:bg-muted"
              onClick={() => onQtyChange(qty + 1)}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-foreground"
            onClick={() => setStepperOpen(true)}
          >
            <span className="font-semibold tabular-nums text-foreground">{qty}</span> {item.uom}
          </button>
        )}
      </div>
    </div>
  );
}
