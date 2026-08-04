// src/components/inventory-v2/shared/NeedsAttentionSheet.tsx
// One triage list replacing the old Par Levels and Expiring view modes.
// Grouped by storage location so a manager can walk the stockroom in one pass.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ShoppingCart, Trash2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../../ui/sheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../ui/alert-dialog';
import { useInventoryV2 } from '../InventoryV2Context';
import { formatDateShort, groupAttentionByLocation, COMMISSARY_STOCKROOM_ID } from '../commissaryUtils';
import ItemThumbnail from './ItemThumbnail';
import type { InventoryItemV2, StockBatch } from '../types';

interface NeedsAttentionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenShoppingList: () => void;
}

export default function NeedsAttentionSheet({ open, onOpenChange, onOpenShoppingList }: NeedsAttentionSheetProps) {
  const { state, dispatch } = useInventoryV2();
  const navigate = useNavigate();
  const groups = useMemo(() => groupAttentionByLocation(state), [state]);
  const [disposeTarget, setDisposeTarget] =
    useState<{ batch: StockBatch; item: InventoryItemV2 } | null>(null);

  const goToItem = (itemId: string) => {
    onOpenChange(false);
    navigate(`/inventory-v2/commissary/item/${itemId}`);
  };

  const confirmDispose = () => {
    if (!disposeTarget) return;
    dispatch({
      type: 'DISPOSE_EXPIRED_BATCH',
      payload: {
        batchId: disposeTarget.batch.id,
        itemId: disposeTarget.item.id,
        stockroomId: COMMISSARY_STOCKROOM_ID,
        qty: disposeTarget.batch.quantity,
      },
    });
    setDisposeTarget(null);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Needs attention</SheetTitle>
          <SheetDescription>Items below par and batches close to expiry.</SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-6">
          {groups.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Everything is at or above par and no batches are expiring.
            </p>
          )}
          {groups.map((group) => (
            <section key={group.locationId}>
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                {group.locationName} ({group.low.length + group.expiring.length})
              </h3>
              <div className="space-y-1">
                {group.low.map((ci) => (
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
                {group.expiring.map(({ batch, item, status }) => (
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
                      onClick={() => setDisposeTarget({ batch, item })}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          ))}
          <Button className="w-full" variant="outline" onClick={onOpenShoppingList}>
            <ShoppingCart className="mr-2 h-4 w-4" />Open shopping list
          </Button>
        </div>

        <AlertDialog open={!!disposeTarget} onOpenChange={(o: boolean) => { if (!o) setDisposeTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Dispose this batch?</AlertDialogTitle>
              <AlertDialogDescription>
                {disposeTarget?.batch.quantity} {disposeTarget?.item.uom} will be removed from stock on hand.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDispose}>Dispose</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}
