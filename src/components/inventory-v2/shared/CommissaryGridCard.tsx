// ─── Commissary Grid Card — photo-forward item card (Stock grid display) ──────
import React from 'react';
import { Minus, Plus, Pencil } from 'lucide-react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import ItemThumbnail from './ItemThumbnail';
import { getSoonestExpiry } from '../commissaryUtils';
import type { CommissaryItem } from '../commissaryUtils';
import type { StockBatch } from '../types';

interface CommissaryGridCardProps {
  item: CommissaryItem;
  batches: StockBatch[];
  onQty: (delta: number) => void;
  onEdit: () => void;
}

export default function CommissaryGridCard({ item, batches, onQty, onEdit }: CommissaryGridCardProps) {
  const si = item.stockroom;
  const isCritical = !!si && si.qtyOnHand <= si.minimumLevel;
  const isLow = !!si && !isCritical && si.qtyOnHand < si.parLevel;
  const expiry = getSoonestExpiry(batches);
  const qtyColor = !si
    ? 'text-muted-foreground'
    : isCritical
    ? 'text-red-400'
    : isLow
    ? 'text-amber-400'
    : 'text-emerald-400';

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-card flex flex-col">
      <div className="flex items-center justify-center bg-muted/40 p-3">
        <ItemThumbnail name={item.itemName} url={item.thumbnailUrl} size={72} />
      </div>
      <div className="p-3 flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-medium text-foreground leading-tight">{item.itemName}</span>
          <Button
            variant="ghost"
            size="sm"
            className="w-6 h-6 p-0 shrink-0"
            onClick={onEdit}
            aria-label="Edit item"
          >
            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap min-h-[18px]">
          {isCritical && (
            <Badge className="text-[10px] px-1.5 py-0 bg-red-500/20 text-red-400 border border-red-500/30">CRITICAL</Badge>
          )}
          {isLow && (
            <Badge className="text-[10px] px-1.5 py-0 bg-amber-500/20 text-amber-400 border border-amber-500/30">LOW</Badge>
          )}
          {expiry.status === 'expired' && (
            <Badge className="text-[10px] px-1.5 py-0 bg-red-500/20 text-red-400 border border-red-500/30">EXPIRED</Badge>
          )}
          {expiry.status === 'expiring-soon' && (
            <Badge className="text-[10px] px-1.5 py-0 bg-amber-500/20 text-amber-400 border border-amber-500/30">EXP SOON</Badge>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          Par {si?.parLevel ?? '—'} · <span className="uppercase">{item.uom}</span>
        </div>

        <div className="mt-auto flex items-center justify-between pt-1">
          <button
            className="w-7 h-7 flex items-center justify-center rounded-md border border-border hover:bg-accent text-muted-foreground transition-colors"
            onClick={() => onQty(-1)}
            disabled={!si}
            aria-label="Decrease quantity"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className={`text-base font-bold tabular-nums ${qtyColor}`}>{si?.qtyOnHand ?? '—'}</span>
          <button
            className="w-7 h-7 flex items-center justify-center rounded-md border border-border hover:bg-accent text-muted-foreground transition-colors"
            onClick={() => onQty(1)}
            disabled={!si}
            aria-label="Increase quantity"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
