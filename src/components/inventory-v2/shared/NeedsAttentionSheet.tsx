// src/components/inventory-v2/shared/NeedsAttentionSheet.tsx
// One triage list replacing the old Par Levels and Expiring view modes.
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ShoppingCart, Trash2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../ui/sheet';
import { useInventoryV2 } from '../InventoryV2Context';
import { formatDateShort, getAttentionEntries, COMMISSARY_STOCKROOM_ID } from '../commissaryUtils';
import ItemThumbnail from './ItemThumbnail';

interface NeedsAttentionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenShoppingList: () => void;
}

export default function NeedsAttentionSheet({ open, onOpenChange, onOpenShoppingList }: NeedsAttentionSheetProps) {
  const { state, dispatch } = useInventoryV2();
  const navigate = useNavigate();
  const attention = useMemo(() => getAttentionEntries(state), [state]);

  const goToItem = (itemId: string) => {
    onOpenChange(false);
    navigate(`/inventory-v2/commissary/item/${itemId}`);
  };

  const dispose = (batchId: string, itemId: string, qty: number) => {
    if (!window.confirm('Dispose this batch? Stock on hand will be reduced.')) return;
    dispatch({
      type: 'DISPOSE_EXPIRED_BATCH',
      payload: { batchId, itemId, stockroomId: COMMISSARY_STOCKROOM_ID, qty },
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Needs attention</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-6">
          <section>
            <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
              Below par ({attention.low.length})
            </h3>
            {attention.low.length === 0 && (
              <p className="text-sm text-muted-foreground">Everything is at or above par.</p>
            )}
            <div className="space-y-1">
              {attention.low.map((ci) => (
                <button
                  key={ci.id}
                  type="button"
                  onClick={() => goToItem(ci.id)}
                  className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-muted"
                >
                  <ItemThumbnail name={ci.itemName} url={ci.thumbnailUrl} size={32} />
                  <span className="min-w-0 flex-1 truncate text-sm">{ci.itemName}</span>
                  <span className="status-error rounded px-1.5 py-0.5 text-xs">
                    {ci.stockroom!.qtyOnHand} / {ci.stockroom!.parLevel}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </section>
          <section>
            <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
              Expiring ({attention.expiring.length})
            </h3>
            {attention.expiring.length === 0 && (
              <p className="text-sm text-muted-foreground">No batches expiring soon.</p>
            )}
            <div className="space-y-1">
              {attention.expiring.map(({ batch, item, status }) => (
                <div key={batch.id} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted">
                  <button
                    type="button"
                    onClick={() => goToItem(item.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <ItemThumbnail name={item.itemName} url={item.thumbnailUrl} size={32} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{item.itemName}</span>
                      <span className="block text-xs text-muted-foreground">
                        {batch.quantity} {item.uom}
                        {batch.batchLabel ? ` · ${batch.batchLabel}` : ''}
                      </span>
                    </span>
                    <span className={`${status === 'expired' ? 'status-error' : 'status-warning'} rounded px-1.5 py-0.5 text-xs`}>
                      {status === 'expired' ? 'Expired' : `Exp ${formatDateShort(batch.expirationDate!)}`}
                    </span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Dispose batch"
                    onClick={() => dispose(batch.id, item.id, batch.quantity)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </section>
          <Button className="w-full" variant="outline" onClick={onOpenShoppingList}>
            <ShoppingCart className="mr-2 h-4 w-4" />Open shopping list
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
