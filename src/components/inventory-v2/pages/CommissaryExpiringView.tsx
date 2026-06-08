// ─── Commissary Expiring View — batch triage (expiring-soon + expired) ────────
import React, { useMemo } from 'react';
import { Trash2, CalendarClock } from 'lucide-react';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { toast } from 'sonner';
import { useInventoryV2 } from '../InventoryV2Context';
import ItemThumbnail from '../shared/ItemThumbnail';
import { getBatchStatus, formatDateShort } from '../commissaryUtils';

interface CommissaryExpiringViewProps {
  search: string;
}

export default function CommissaryExpiringView({ search }: CommissaryExpiringViewProps) {
  const { state, dispatch } = useInventoryV2();

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.stockBatches
      .filter(b => b.stockroomId === 'sr-1')
      .map(b => ({
        batch: b,
        item: state.items.find(i => i.id === b.itemId),
        status: getBatchStatus(b.expirationDate),
      }))
      .filter(r => r.status === 'expired' || r.status === 'expiring-soon')
      .filter(r => !q || (r.item?.itemName.toLowerCase().includes(q) ?? false))
      .sort((a, b) => {
        const at = a.batch.expirationDate ? new Date(a.batch.expirationDate).getTime() : Infinity;
        const bt = b.batch.expirationDate ? new Date(b.batch.expirationDate).getTime() : Infinity;
        return at - bt;
      });
  }, [state.stockBatches, state.items, search]);

  const dispose = (
    batchId: string,
    itemId: string,
    stockroomId: string,
    qty: number,
    name: string,
    label?: string,
  ) => {
    dispatch({ type: 'DISPOSE_EXPIRED_BATCH', payload: { batchId, itemId, stockroomId, qty } });
    toast.success(`Disposed ${qty}x ${name} (${label ?? 'batch'})`);
  };

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center py-20 text-muted-foreground gap-3">
        <CalendarClock className="w-12 h-12 opacity-30" />
        <p className="text-base font-medium">Nothing expiring</p>
        <p className="text-sm">No batches are expired or expiring within 14 days.</p>
      </div>
    );
  }

  return (
    <Card className="glass-panel overflow-hidden">
      <div className="divide-y divide-border">
        {rows.map(({ batch, item, status }) => (
          <div key={batch.id} className="flex items-center gap-3 px-4 py-3">
            <ItemThumbnail name={item?.itemName ?? 'Item'} url={item?.thumbnailUrl} size={40} />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-foreground truncate block">
                {item?.itemName ?? 'Unknown item'}
              </span>
              <span className="text-xs text-muted-foreground">
                {batch.batchLabel ?? batch.id.slice(-6)} · {batch.quantity} on hand · received{' '}
                {formatDateShort(batch.receivedDate)}
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <div className={`text-sm font-semibold ${status === 'expired' ? 'text-red-400' : 'text-amber-400'}`}>
                  {batch.expirationDate ? formatDateShort(batch.expirationDate) : '—'}
                </div>
                <Badge
                  className={`text-[10px] px-1.5 py-0 ${
                    status === 'expired'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {status === 'expired' ? 'EXPIRED' : 'EXPIRING SOON'}
                </Badge>
              </div>
              {status === 'expired' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-red-400 hover:text-red-500 hover:bg-red-500/10 gap-1"
                  onClick={() =>
                    dispose(batch.id, batch.itemId, batch.stockroomId, batch.quantity, item?.itemName ?? 'item', batch.batchLabel)
                  }
                >
                  <Trash2 className="w-3.5 h-3.5" /> Dispose
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
