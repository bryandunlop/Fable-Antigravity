// src/components/inventory-v2/pages/CommissaryItemDetail.tsx
// The item page IS the editor — absorbs EditItemDialog.
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Camera, ExternalLink, Loader2, Minus, Pencil, Plus, Trash2,
} from 'lucide-react';
import { GfoPageHeader } from '../../gfo/GfoPageHeader';
import { GfoPanel } from '../../gfo/GfoPanel';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../ui/alert-dialog';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '../../ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../ui/select';
import { useInventoryV2 } from '../InventoryV2Context';
import {
  COMMISSARY_STOCKROOM_ID, formatCurrency, formatDateShort, getBatchStatus,
} from '../commissaryUtils';
import ItemThumbnail from '../shared/ItemThumbnail';
import { usePhotoUpload } from '../usePhotoUpload';
import type { StockBatch } from '../types';

export default function CommissaryItemDetail() {
  const { itemId } = useParams<{ itemId: string }>();
  const { state, dispatch } = useInventoryV2();
  const navigate = useNavigate();

  const item = state.items.find((i) => i.id === itemId);
  const stockroom = state.stockroomItems.find(
    (si) => si.itemId === itemId && si.stockroomId === COMMISSARY_STOCKROOM_ID,
  );
  const batches = useMemo(
    () => state.stockBatches.filter(
      (b) => b.itemId === itemId && b.stockroomId === COMMISSARY_STOCKROOM_ID,
    ),
    [state.stockBatches, itemId],
  );
  const history = useMemo(
    () => state.activityLog.filter((e) =>
      e.metadata !== undefined &&
      (e.metadata.itemId === itemId || itemId! in e.metadata)
    ).slice(0, 20),
    [state.activityLog, itemId],
  );

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [editBatch, setEditBatch] = useState<StockBatch | null>(null);
  const [disposeBatchTarget, setDisposeBatchTarget] = useState<StockBatch | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // logActivity is defined as a named function below (after the early-return guard),
  // but usePhotoUpload must be called unconditionally (Rules of Hooks).
  // The callback uses a captured ref approach via a stable closure over dispatch/state.
  const { pick, uploading, input } = usePhotoUpload((url) => {
    if (!item) return;
    dispatch({ type: 'UPDATE_ITEM', payload: { ...item, thumbnailUrl: url } });
    dispatch({
      type: 'ADD_ACTIVITY_LOG',
      payload: {
        id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        userId: state.currentUser.id,
        userName: state.currentUser.name,
        action: 'stock_adjusted',
        module: 'commissary',
        description: `Updated photo for ${item.itemName}`,
        metadata: { itemId: item.id },
      },
    });
  });

  if (!item) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Item not found.</p>
        <Button variant="outline" onClick={() => navigate('/inventory-v2/commissary')}>
          <ArrowLeft className="mr-2 h-4 w-4" />Back to commissary
        </Button>
      </div>
    );
  }

  const location = state.storageLocations.find((l) => l.id === stockroom?.locationId);
  const qty = stockroom?.qtyOnHand ?? 0;
  const valueOnHand = qty * (item.costPerUnit ?? 0);

  function logActivity(description: string) {
    dispatch({
      type: 'ADD_ACTIVITY_LOG',
      payload: {
        id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        userId: state.currentUser.id,
        userName: state.currentUser.name,
        action: 'stock_adjusted',
        module: 'commissary',
        description,
        metadata: { itemId: item!.id },
      },
    });
  }

  const changeQty = (newQty: number) => {
    if (!stockroom) return;
    dispatch({ type: 'UPDATE_STOCKROOM_ITEM', payload: { ...stockroom, qtyOnHand: newQty } });
    logActivity(`${newQty > qty ? '+' : '−'}${Math.abs(newQty - qty)} ${item.itemName} (now ${newQty})`);
  };

  const startEdit = () => {
    setDraft({
      itemName: item.itemName,
      description: item.description ?? '',
      vendor: item.vendor ?? '',
      costPerUnit: item.costPerUnit?.toString() ?? '',
      reorderUrl: item.reorderUrl ?? '',
      barcode: item.barcode ?? '',
      vendorItemNumber: item.vendorItemNumber ?? '',
      internalItemNumber: item.internalItemNumber ?? '',
      thumbnailUrl: item.thumbnailUrl ?? '',
      parLevel: (stockroom?.parLevel ?? 0).toString(),
      minimumLevel: (stockroom?.minimumLevel ?? 0).toString(),
      locationId: stockroom?.locationId ?? 'none',
    });
    setEditing(true);
  };

  const saveEdit = () => {
    const parsedCost = parseFloat(draft.costPerUnit);
    dispatch({
      type: 'UPDATE_ITEM',
      payload: {
        ...item,
        itemName: draft.itemName.trim() || item.itemName,
        description: draft.description,
        vendor: draft.vendor || undefined,
        costPerUnit: Number.isFinite(parsedCost) ? parsedCost : undefined,
        reorderUrl: draft.reorderUrl || undefined,
        barcode: draft.barcode || undefined,
        vendorItemNumber: draft.vendorItemNumber || undefined,
        internalItemNumber: draft.internalItemNumber || undefined,
        thumbnailUrl: draft.thumbnailUrl || undefined,
      },
    });
    if (stockroom) {
      dispatch({
        type: 'UPDATE_STOCKROOM_ITEM',
        payload: {
          ...stockroom,
          parLevel: Math.max(0, parseInt(draft.parLevel) || 0),
          minimumLevel: Math.max(0, parseInt(draft.minimumLevel) || 0),
          locationId: draft.locationId === 'none' ? undefined : draft.locationId,
        },
      });
    }
    setEditing(false);
  };

  const saveBatch = (b: StockBatch, newQty: number, newExp: string, newLabel: string) => {
    // Direct batch edits bypass the FIFO batch-deduction used elsewhere (trip loads, bulk updates) —
    // stockroom qty is adjusted by delta here, but other batches' quantities are not rebalanced.
    const delta = newQty - b.quantity;
    dispatch({
      type: 'UPDATE_STOCK_BATCH',
      payload: { ...b, quantity: newQty, expirationDate: newExp || undefined, batchLabel: newLabel || undefined },
    });
    if (delta !== 0 && stockroom) {
      dispatch({
        type: 'UPDATE_STOCKROOM_ITEM',
        payload: { ...stockroom, qtyOnHand: Math.max(0, stockroom.qtyOnHand + delta) },
      });
      logActivity(`Batch adjusted ${delta > 0 ? '+' : ''}${delta} ${item.itemName}`);
    }
    setEditBatch(null);
  };

  const confirmDispose = () => {
    if (!disposeBatchTarget) return;
    dispatch({
      type: 'DISPOSE_EXPIRED_BATCH',
      payload: {
        batchId: disposeBatchTarget.id,
        itemId: item.id,
        stockroomId: COMMISSARY_STOCKROOM_ID,
        qty: disposeBatchTarget.quantity,
      },
    });
    setDisposeBatchTarget(null);
  };

  const confirmDeleteItem = () => {
    dispatch({ type: 'REMOVE_ITEM', payload: item.id });
    navigate('/inventory-v2/commissary');
  };

  const backTarget = location
    ? `/inventory-v2/commissary/location/${location.id}`
    : '/inventory-v2/commissary';

  const row = (label: string, value: React.ReactNode) => (
    <div className="flex items-center justify-between gap-4 border-b border-border py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right font-medium">{value || '—'}</span>
    </div>
  );

  const field = (label: string, key: string, type: 'text' | 'number' = 'text') => (
    <div className="space-y-1">
      <Label htmlFor={`f-${key}`}>{label}</Label>
      <Input
        id={`f-${key}`}
        type={type}
        value={draft[key] ?? ''}
        onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate(backTarget)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />{location ? location.name : 'Commissary'}
      </button>

      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="shrink-0">
          <ItemThumbnail name={item.itemName} url={item.thumbnailUrl} size={160} className="rounded-lg" />
          <Button className="mt-2 w-full" variant="outline" size="sm" onClick={pick} disabled={uploading}>
            {uploading
              ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              : <Camera className="mr-2 h-4 w-4" />}
            {item.thumbnailUrl ? 'Replace photo' : 'Add photo'}
          </Button>
          {input}
        </div>
        <div className="min-w-0 flex-1 space-y-4">
          <GfoPageHeader title={item.itemName} description={item.description || undefined} />
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" aria-label="Decrease quantity"
              onClick={() => changeQty(Math.max(0, qty - 1))}>
              <Minus className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <div className="text-3xl font-semibold tabular-nums">{qty}</div>
              <div className="text-xs text-muted-foreground">{item.uom} on hand</div>
            </div>
            <Button variant="outline" size="icon" aria-label="Increase quantity"
              onClick={() => changeQty(qty + 1)}>
              <Plus className="h-4 w-4" />
            </Button>
            <div className="ml-4 text-sm text-muted-foreground">
              Par {stockroom?.parLevel ?? 0} · Min {stockroom?.minimumLevel ?? 0}
              {item.costPerUnit !== undefined && (
                <div>{formatCurrency(valueOnHand)} on hand</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <GfoPanel
        title="Details"
        action={
          editing ? (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
              <Button size="sm" onClick={saveEdit}>Save</Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={startEdit}>
              <Pencil className="mr-2 h-4 w-4" />Edit
            </Button>
          )
        }
      >
        {editing ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {field('Name', 'itemName')}
            {field('Description', 'description')}
            {field('Vendor', 'vendor')}
            {field('Cost per unit ($)', 'costPerUnit', 'number')}
            {field('Reorder URL', 'reorderUrl')}
            {field('Barcode', 'barcode')}
            {field('Vendor item #', 'vendorItemNumber')}
            {field('Internal item #', 'internalItemNumber')}
            {field('Photo URL (or use the camera button)', 'thumbnailUrl')}
            {field('Par level', 'parLevel', 'number')}
            {field('Minimum', 'minimumLevel', 'number')}
            <div className="space-y-1">
              <Label>Location</Label>
              <Select
                value={draft.locationId}
                onValueChange={(v: string) => setDraft((d) => ({ ...d, locationId: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {[...state.storageLocations]
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <div>
            {row('Vendor', item.vendor)}
            {row('Cost per unit', item.costPerUnit !== undefined
              ? `$${item.costPerUnit.toFixed(2)}` : undefined)}
            {row('Value on hand', item.costPerUnit !== undefined
              ? formatCurrency(valueOnHand) : undefined)}
            {row('Reorder', item.reorderUrl ? (
              <a href={item.reorderUrl} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline">
                Open link<ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : undefined)}
            {row('Barcode', item.barcode)}
            {row('Vendor item #', item.vendorItemNumber)}
            {row('Internal item #', item.internalItemNumber)}
            {row('Category', item.supplyCategory)}
            {row('Unit', item.uom)}
            {row('Location', location?.name ?? 'Unassigned')}
          </div>
        )}
      </GfoPanel>

      <GfoPanel title={`Batches (${batches.length})`}>
        {batches.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No batches tracked. Use Receive Stock with an expiration date to start batch tracking.
          </p>
        )}
        <div className="space-y-1">
          {batches.map((b) => {
            const status = getBatchStatus(b.expirationDate);
            return (
              <div key={b.id} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted">
                <span className="min-w-0 flex-1 text-sm">
                  {b.quantity} {item.uom}
                  {b.batchLabel ? ` · ${b.batchLabel}` : ''}
                  <span className="block text-xs text-muted-foreground">
                    Received {formatDateShort(b.receivedDate)}
                  </span>
                </span>
                {b.expirationDate && (
                  <span className={`rounded px-1.5 py-0.5 text-xs ${
                    status === 'expired' ? 'status-error'
                      : status === 'expiring-soon' ? 'status-warning'
                      : 'status-success'
                  }`}>
                    {status === 'expired' ? 'Expired' : `Exp ${formatDateShort(b.expirationDate)}`}
                  </span>
                )}
                <Button variant="ghost" size="icon" aria-label="Edit batch" onClick={() => setEditBatch(b)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label="Dispose batch"
                  onClick={() => setDisposeBatchTarget(b)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            );
          })}
        </div>
      </GfoPanel>

      <GfoPanel title="History">
        {history.length === 0 && (
          <p className="text-sm text-muted-foreground">No activity recorded for this item yet.</p>
        )}
        <div className="space-y-2">
          {history.map((e) => (
            <div key={e.id} className="flex items-baseline justify-between gap-4 text-sm">
              <span className="min-w-0 flex-1">{e.description}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {e.userName} · {formatDateShort(e.timestamp)}
              </span>
            </div>
          ))}
        </div>
      </GfoPanel>

      <div className="flex justify-end">
        <Button variant="outline" className="text-destructive" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="mr-2 h-4 w-4" />Delete item
        </Button>
      </div>

      {editBatch && (
        <BatchEditDialog batch={editBatch} uom={item.uom}
          onSave={saveBatch} onClose={() => setEditBatch(null)} />
      )}

      <AlertDialog open={!!disposeBatchTarget} onOpenChange={(o: boolean) => { if (!o) setDisposeBatchTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dispose this batch?</AlertDialogTitle>
            <AlertDialogDescription>
              {disposeBatchTarget?.quantity} {item.uom} will be removed from stock on hand.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDispose}>Dispose</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={(o: boolean) => setDeleteOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{item.itemName}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Removes the item, its stockroom record, and its batches. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteItem}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface BatchEditDialogProps {
  batch: StockBatch;
  uom: string;
  onSave: (batch: StockBatch, newQty: number, newExp: string, newLabel: string) => void;
  onClose: () => void;
}

function BatchEditDialog({ batch, uom, onSave, onClose }: BatchEditDialogProps) {
  const [qty, setQty] = useState(batch.quantity);
  const [exp, setExp] = useState(batch.expirationDate?.slice(0, 10) ?? '');
  const [label, setLabel] = useState(batch.batchLabel ?? '');

  return (
    <Dialog open onOpenChange={(o: boolean) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit batch</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="b-qty">Quantity ({uom})</Label>
            <Input id="b-qty" type="number" min={0} value={qty}
              onChange={(e) => setQty(Math.max(0, parseInt(e.target.value) || 0))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="b-exp">Expiration date</Label>
            <Input id="b-exp" type="date" value={exp} onChange={(e) => setExp(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="b-label">Batch label</Label>
            <Input id="b-label" value={label} onChange={(e) => setLabel(e.target.value)}
              placeholder="Lot #2026-06-001" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(batch, qty, exp, label)}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
